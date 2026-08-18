import os
import json
import asyncio
import threading
import subprocess
import logging
import time
from pathlib import Path
from typing import Optional, Dict, Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, File, UploadFile
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

from .downloader import YouTubeDownloaderEngine, clean_ansi
from .utils import (
    get_base_dir,
    get_resource_dir,
    get_ffmpeg_path,
    is_ffmpeg_available,
    download_ffmpeg,
    get_deno_path,
    is_deno_available,
    download_deno,
    get_default_download_dir,
    format_bytes,
    format_seconds,
    open_folder
)

app = FastAPI(title="YouTube Downloader API")

# Mecanismo de Auto-Shutdown via WebSocket
active_connections = 0

def schedule_shutdown():
    time.sleep(3)
    if active_connections == 0:
        logger.info("Navegador fechado. Encerrando servidor...")
        os._exit(0)

@app.websocket("/ws/heartbeat")
async def websocket_heartbeat(websocket: WebSocket):
    global active_connections
    await websocket.accept()
    active_connections += 1
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections -= 1
        if active_connections == 0:
            threading.Thread(target=schedule_shutdown, daemon=True).start()


# Diretórios estáticos e templates (usam o diretório de recursos que no PyInstaller é sys._MEIPASS)
RESOURCE_DIR = get_resource_dir()
STATIC_DIR = RESOURCE_DIR / "web" / "static"
TEMPLATES_DIR = RESOURCE_DIR / "web" / "templates"

STATIC_DIR.mkdir(parents=True, exist_ok=True)
TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

engine = YouTubeDownloaderEngine()


class InfoRequest(BaseModel):
    url: str


class FolderRequest(BaseModel):
    path: Optional[str] = None


@app.get("/", response_class=HTMLResponse)
async def serve_index():
    index_file = TEMPLATES_DIR / "index.html"
    if not index_file.exists():
        raise HTTPException(status_code=404, detail="Index template not found.")
    return HTMLResponse(content=index_file.read_text(encoding="utf-8"))


@app.get("/api/status")
async def get_system_status():
    return {
        "ffmpeg_available": is_ffmpeg_available(),
        "ffmpeg_path": get_ffmpeg_path(),
        "deno_available": is_deno_available(),
        "deno_path": get_deno_path(),
        "default_dir": get_default_download_dir()
    }


@app.post("/api/info")
async def fetch_video_info(req: InfoRequest):
    url = req.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL inválida ou vazia.")
    
    try:
        # Executa a extração em thread separada para não bloquear o loop de eventos async
        info = await asyncio.to_thread(engine.extract_info, url)
        
        # Formata dados amigáveis
        duration_sec = info.get("duration", 0)
        info["duration_formatted"] = format_seconds(duration_sec)
        
        return info
    except Exception as e:
        cleaned_err = clean_ansi(str(e))
        raise HTTPException(status_code=500, detail=cleaned_err)


@app.post("/api/upload-cookies")
async def upload_cookies(file: UploadFile = File(...)):
    """Salva o arquivo cookies.txt enviado pelo usuário na raiz do projeto."""
    try:
        content = await file.read()
        cookies_path = get_base_dir() / "cookies.txt"
        cookies_path.write_bytes(content)
        return {"success": True, "message": "Cookies atualizados com sucesso."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/cancel")
async def cancel_download():
    """Cancela o download em andamento."""
    engine.cancel()
    return {"success": True, "message": "Cancelamento solicitado."}




@app.post("/api/open-folder")
async def open_target_folder(req: FolderRequest):
    target = req.path or get_default_download_dir()
    target_path = Path(target).resolve()
    
    try:
        if not target_path.exists():
            raise HTTPException(status_code=404, detail="O diretório especificado não existe.")
            
        open_folder(target_path)
        return {"success": True, "path": str(target_path)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao abrir pasta {target}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/select-folder")
async def select_folder_dialog():
    try:
        def open_dialog():
            import tkinter as tk
            from tkinter import filedialog
            root = tk.Tk()
            root.withdraw()
            root.attributes('-topmost', True)
            folder = filedialog.askdirectory(parent=root, title="Selecione a pasta de destino")
            root.destroy()
            return folder

        selected_path = await asyncio.to_thread(open_dialog)
        
        if selected_path:
            return {"success": True, "path": selected_path}
        else:
            return {"success": False, "message": "Nenhuma pasta selecionada."}
    except Exception as e:
        logger.error(f"Erro ao abrir seletor de pasta: {e}")
        raise HTTPException(status_code=500, detail=str(e))



@app.websocket("/ws/download")
async def websocket_download_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    try:
        # Recebe os parâmetros de download do cliente
        data_raw = await websocket.receive_text()
        params = json.loads(data_raw)

        url = params.get("url")
        media_type = params.get("media_type", "video") # "video" ou "audio"
        res_height = params.get("resolution_height")    # int ou None
        output_dir = params.get("output_dir") or get_default_download_dir()

        loop = asyncio.get_running_loop()

        def progress_cb(data: Dict[str, Any]):
            status = data.get("status")
            if status == "downloading":
                pct = data.get("percent", 0.0)
                speed = format_bytes(data.get("speed")) + "/s"
                downloaded = format_bytes(data.get("downloaded_bytes"))
                total = format_bytes(data.get("total_bytes"))
                eta = format_seconds(data.get("eta"))
                
                msg = {
                    "type": "progress",
                    "status": "downloading",
                    "percent": round(pct * 100, 1),
                    "speed_str": speed,
                    "downloaded_str": downloaded,
                    "total_str": total,
                    "eta_str": eta,
                    "filename": data.get("filename", "")
                }
                asyncio.run_coroutine_threadsafe(websocket.send_text(json.dumps(msg)), loop)
                
            elif status == "processing":
                msg = {
                    "type": "processing",
                    "status": "processing",
                    "percent": 100,
                    "message": "Processando e convertendo arquivo com FFmpeg..."
                }
                asyncio.run_coroutine_threadsafe(websocket.send_text(json.dumps(msg)), loop)

        def complete_cb(filepath: str):
            msg = {
                "type": "complete",
                "status": "completed",
                "percent": 100,
                "filepath": filepath,
                "filename": os.path.basename(filepath)
            }
            asyncio.run_coroutine_threadsafe(websocket.send_text(json.dumps(msg)), loop)

        def error_cb(err_msg: str):
            msg = {
                "type": "error",
                "status": "error",
                "message": clean_ansi(err_msg)
            }
            asyncio.run_coroutine_threadsafe(websocket.send_text(json.dumps(msg)), loop)

        # Executa o download na threadpool
        await asyncio.to_thread(
            engine.download,
            url=url,
            media_type=media_type,
            resolution_height=res_height,
            output_dir=output_dir,
            progress_callback=progress_cb,
            complete_callback=complete_cb,
            error_callback=error_cb
        )

    except WebSocketDisconnect:
        logger.info("WebSocket desconectado pelo cliente.")
        engine.cancel()
    except Exception as e:
        logger.error(f"Erro inesperado no WebSocket: {e}", exc_info=True)
        err_msg = {
            "type": "error",
            "message": clean_ansi(str(e))
        }
        try:
            await websocket.send_text(json.dumps(err_msg))
        except Exception as inner_e:
            logger.warning(f"Não foi possível enviar mensagem de erro pelo ws: {inner_e}")
    finally:
        try:
            await websocket.close()
        except Exception as e:
            logger.warning(f"Aviso ao fechar websocket: {e}")
