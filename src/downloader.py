import os
import re
import time
from typing import Callable, Dict, Any, List, Optional
import yt_dlp

from .utils import get_ffmpeg_path, is_ffmpeg_available, get_bin_dir, get_base_dir, get_deno_path, format_bytes



RESOLUTION_MAP = {
    4320: "8K Ultra HD (4320p)",
    2160: "4K Ultra HD (2160p)",
    1440: "2K Quad HD (1440p)",
    1080: "Full HD (1080p)",
    720: "HD (720p)",
    480: "480p (SD)",
    360: "360p (SD)",
    240: "240p",
    144: "144p"
}

def clean_ansi(text: str) -> str:
    """Remove códigos de cor ANSI de mensagens de log/erro."""
    return re.sub(r'\x1b\[[0-9;]*[a-zA-Z]', '', text)


class YouTubeDownloaderEngine:
    def __init__(self):
        self._is_cancelled = False
        # Força inicialização do dir binário (injetando node.exe no PATH)
        get_bin_dir()

    def cancel(self):
        """Sinaliza cancelamento do download."""
        self._is_cancelled = True

    def _get_base_opts(self) -> Dict[str, Any]:
        """Retorna opções do yt-dlp otimizadas para contornar bloqueios do YouTube (403 Forbidden)."""
        bin_dir = get_bin_dir()
        deno_path = get_deno_path()
        
        opts = {
            'quiet': False,
            'verbose': True,
            'no_warnings': False,
            'windowsfilenames': True,
            'restrictfilenames': False,
            'nocheckcertificate': True,
            'geo_bypass': True,
            'remote_components': ['ejs:github'],
            'retries': 10,
            'fragment_retries': 10,
            'concurrent_fragment_downloads': 4,
            # Prioriza HLS (m3u8) sobre HTTPS direto — YouTube bloqueia downloads DASH HTTP com 403
            'format_sort': ['proto:m3u8_native:m3u8', 'res', 'fps', 'codec:vp9:h264', 'size', 'br'],
            'format_sort_force': True,
            # Inclui streams HLS duplicados para ter mais opções disponíveis
            'extractor_args': {
                'youtube': ['formats=duplicate', 'player_client=ios,android']
            },
        }
        
        # Configura o runtime JS (deno) para resolver challenges de assinatura do YouTube
        if deno_path and os.path.isfile(deno_path):
            opts['js_runtimes'] = {'deno': {'path': deno_path}}
            
        cookies_path = get_base_dir() / "cookies.txt"
        if cookies_path.exists():
            opts['cookiefile'] = str(cookies_path)
            # Se temos cookies, o client web oficial logado é a melhor opção para evitar erros de token em clientes mobile
            opts['extractor_args']['youtube'] = ['formats=duplicate', 'player_client=default']
        
        return opts

    def extract_info(self, url: str) -> Dict[str, Any]:
        """
        Extrai metadados do vídeo e lista EXCLUSIVAMENTE as resoluções reais disponíveis para aquele vídeo.
        """
        ydl_opts = self._get_base_opts()
        ydl_opts.update({
            'extract_flat': False,
            'skip_download': True,
        })

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            # Se for playlist, pega o primeiro vídeo
            if 'entries' in info and info['entries']:
                info = info['entries'][0]

            title = info.get('title', 'Vídeo sem título')
            uploader = info.get('uploader') or info.get('channel', 'Canal Desconhecido')
            duration = info.get('duration', 0)
            thumbnail = info.get('thumbnail', '')
            
            # Coleta todas as resoluções de vídeo reais presentes nos formatos
            formats = info.get('formats', [])
            resolution_sizes = {}
            
            for f in formats:
                height = f.get('height')
                vcodec = f.get('vcodec')
                ext = f.get('ext', '')
                filesize = f.get('filesize') or f.get('filesize_approx') or 0
                
                # Ignora thumbnails em formato mhtml e streams somente áudio
                if ext == 'mhtml' or vcodec == 'none':
                    continue

                if height and height >= 144:
                    if height not in resolution_sizes or filesize > resolution_sizes[height]:
                        resolution_sizes[height] = filesize

            # Ordena da maior para a menor resolução disponível no vídeo
            sorted_heights = sorted(list(resolution_sizes.keys()), reverse=True)
            
            # Monta lista estritamente baseada nas qualidades do vídeo
            resolutions = []
            for h in sorted_heights:
                label = RESOLUTION_MAP.get(h, f"{h}p")
                size_bytes = resolution_sizes[h]
                size_str = format_bytes(size_bytes) if size_bytes > 0 else "N/A"
                resolutions.append({
                    "height": h,
                    "label": label,
                    "size_str": size_str
                })

            if not resolutions:
                # Fallback de segurança caso nenhum stream específico tenha sido isolado
                resolutions = [
                    {"height": 1080, "label": "Full HD (1080p)", "size_str": "N/A"},
                    {"height": 720, "label": "HD (720p)", "size_str": "N/A"},
                    {"height": 480, "label": "480p (SD)", "size_str": "N/A"},
                    {"height": 360, "label": "360p (SD)", "size_str": "N/A"}
                ]

            return {
                "id": info.get('id'),
                "url": url,
                "title": title,
                "uploader": uploader,
                "duration": duration,
                "thumbnail": thumbnail,
                "resolutions": resolutions,
                "raw_info": info
            }

    def download(
        self,
        url: str,
        media_type: str,           # 'video' ou 'audio'
        resolution_height: Optional[int],
        output_dir: str,
        progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None,
        complete_callback: Optional[Callable[[str], None]] = None,
        error_callback: Optional[Callable[[str], None]] = None
    ):
        """
        Executa o download de vídeo (MP4) na resolução exata escolhida ou áudio (MP3 320kbps).
        """
        self._is_cancelled = False
        ffmpeg_path = get_ffmpeg_path()
        last_update_time = [0.0]

        def progress_hook(d):
            if self._is_cancelled:
                raise Exception("Download cancelado pelo usuário.")

            if not progress_callback:
                return

            status = d.get('status')
            if status == 'downloading':
                now = time.time()
                total_bytes = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
                downloaded_bytes = d.get('downloaded_bytes', 0)
                
                try:
                    pct_str = d.get('_percent_str', '')
                    if pct_str:
                        pct_str = clean_ansi(pct_str).replace('%', '').strip()
                        percent = float(pct_str) / 100.0
                    else:
                        percent = (downloaded_bytes / total_bytes) if total_bytes > 0 else 0.0
                except Exception:
                    percent = 0.0

                # Throttling a cada 100ms para manter a interface fluida a 60 FPS
                if (now - last_update_time[0] < 0.10) and percent < 0.99:
                    return

                last_update_time[0] = now
                speed = d.get('speed') or 0
                eta = d.get('eta') or 0

                progress_callback({
                    "status": "downloading",
                    "percent": percent,
                    "downloaded_bytes": downloaded_bytes,
                    "total_bytes": total_bytes,
                    "speed": speed,
                    "eta": eta,
                    "filename": os.path.basename(d.get('filename', ''))
                })
            elif status == 'finished':
                progress_callback({
                    "status": "processing",
                    "percent": 1.0,
                    "message": "Processando e convertendo arquivo com FFmpeg..."
                })

        ydl_opts = self._get_base_opts()
        ydl_opts.update({
            'outtmpl': os.path.join(output_dir, '%(title)s.%(ext)s'),
            'progress_hooks': [progress_hook],
        })

        # Define caminho do FFmpeg local da pasta bin
        if ffmpeg_path:
            ydl_opts['ffmpeg_location'] = ffmpeg_path

        if media_type == 'audio':
            # Modo Áudio: MP3 de alta fidelidade (320kbps) + Metadados + Capa
            ydl_opts['format'] = 'bestaudio/best'
            
            postprocessors = [
                {
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '320',
                },
                {
                    'key': 'FFmpegMetadata',
                    'add_metadata': True,
                }
            ]
            
            if is_ffmpeg_available():
                ydl_opts['writethumbnail'] = True
                postprocessors.append({'key': 'EmbedThumbnail'})

            ydl_opts['postprocessors'] = postprocessors

        else:
            # Modo Vídeo: Usa a resolução solicitada e clients mobile para bypassar 403
            if resolution_height:
                ydl_opts['format'] = (
                    f"bestvideo[height<={resolution_height}][ext=mp4]+bestaudio[ext=m4a]/"
                    f"bestvideo[height<={resolution_height}]+bestaudio/"
                    f"best[height<={resolution_height}]/best"
                )
            else:
                ydl_opts['format'] = (
                    'bestvideo[ext=mp4]+bestaudio[ext=m4a]/'
                    'bestvideo+bestaudio/best'
                )

            ydl_opts['merge_output_format'] = 'mp4'
            ydl_opts['postprocessors'] = [
                {
                    'key': 'FFmpegMetadata',
                    'add_metadata': True,
                }
            ]

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                final_filename = ydl.prepare_filename(info)
                
                if media_type == 'audio':
                    final_filename = os.path.splitext(final_filename)[0] + ".mp3"
                elif ydl_opts.get('merge_output_format') == 'mp4':
                    final_filename = os.path.splitext(final_filename)[0] + ".mp4"

                if complete_callback:
                    complete_callback(final_filename)

        except Exception as e:
            err_text = clean_ansi(str(e))
            if error_callback:
                error_callback(err_text)
            else:
                raise e
