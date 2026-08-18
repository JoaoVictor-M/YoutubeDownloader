import os
import sys
import shutil
import zipfile
import urllib.request
from pathlib import Path


def get_resource_dir() -> Path:
    """Retorna o diretório onde os recursos empacotados (web/) estão."""
    if getattr(sys, 'frozen', False):
        return Path(sys._MEIPASS)
    return Path(__file__).resolve().parent.parent


def get_base_dir() -> Path:
    """Retorna o diretório onde o .exe está rodando."""
    if getattr(sys, 'frozen', False):
        return Path(sys.executable).parent
    return Path(__file__).resolve().parent.parent


def get_bin_dir() -> Path:
    """Retorna o diretório 'bin' do projeto."""
    bin_dir = get_base_dir() / "bin"
    bin_dir.mkdir(parents=True, exist_ok=True)
    
    # Adiciona a pasta bin ao PATH temporariamente para o yt-dlp detectar executáveis locais (ex: node.exe)
    bin_path_str = str(bin_dir)
    if bin_path_str not in os.environ.get("PATH", ""):
        os.environ["PATH"] = f"{bin_path_str}{os.pathsep}{os.environ.get('PATH', '')}"
        
    return bin_dir


def get_default_download_dir() -> str:
    """Retorna o diretório padrão de downloads do usuário no Windows."""
    return str(Path.home() / "Downloads")


def get_ffmpeg_path() -> str | None:
    """
    Verifica se o FFmpeg está presente na pasta bin local ou no PATH do sistema.
    Retorna o caminho do executável ou diretório para o yt-dlp.
    """
    bin_dir = get_bin_dir()
    local_ffmpeg = bin_dir / "ffmpeg.exe"
    
    # 1. Verifica na pasta bin/ local
    if local_ffmpeg.exists():
        return str(local_ffmpeg)
    
    # 2. Verifica na raiz do projeto
    root_ffmpeg = get_base_dir() / "ffmpeg.exe"
    if root_ffmpeg.exists():
        return str(root_ffmpeg)
    
    # 3. Verifica no PATH do sistema Windows
    system_ffmpeg = shutil.which("ffmpeg")
    if system_ffmpeg:
        return system_ffmpeg

    return None


def is_ffmpeg_available() -> bool:
    """Verifica se o FFmpeg está instalado e disponível."""
    return get_ffmpeg_path() is not None


def download_ffmpeg(progress_callback=None) -> bool:
    """
    Baixa e extrai automaticamente o FFmpeg oficial para Windows na pasta 'bin/'.
    Usa a release portátil do yt-dlp/FFmpeg-Builds.
    """
    bin_dir = get_bin_dir()
    zip_url = "https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
    zip_path = bin_dir / "ffmpeg_temp.zip"

    try:
        if progress_callback:
            progress_callback("Baixando FFmpeg oficial para Windows (aguarde)...", 0.1)

        # Download do arquivo zip
        def reporthook(block_num, block_size, total_size):
            if total_size > 0 and progress_callback:
                percent = min(0.9, (block_num * block_size) / total_size)
                progress_callback(f"Baixando FFmpeg... {int(percent*100)}%", percent)

        urllib.request.urlretrieve(zip_url, str(zip_path), reporthook)

        if progress_callback:
            progress_callback("Extraindo executáveis...", 0.95)

        # Extrai somente ffmpeg.exe e ffprobe.exe
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            for member in zip_ref.namelist():
                filename = os.path.basename(member)
                if filename.lower() in ("ffmpeg.exe", "ffprobe.exe"):
                    source = zip_ref.open(member)
                    target = open(bin_dir / filename, "wb")
                    with source, target:
                        shutil.copyfileobj(source, target)

        # Remove o zip temporário
        if zip_path.exists():
            zip_path.unlink()

        if progress_callback:
            progress_callback("FFmpeg configurado com sucesso!", 1.0)

        return is_ffmpeg_available()
    except Exception as e:
        if zip_path.exists():
            try:
                zip_path.unlink()
            except Exception:
                pass
        if progress_callback:
            progress_callback(f"Erro ao baixar FFmpeg: {str(e)}", 0.0)
        return False


def get_deno_path() -> str | None:
    """Verifica se o Deno está presente na pasta bin local."""
    local_deno = get_bin_dir() / "deno.exe"
    if local_deno.exists():
        return str(local_deno)
    
    system_deno = shutil.which("deno")
    if system_deno:
        return system_deno

    return None


def is_deno_available() -> bool:
    """Verifica se o Deno está instalado e disponível."""
    return get_deno_path() is not None


def download_deno(progress_callback=None) -> bool:
    """
    Baixa e extrai automaticamente o Deno na pasta 'bin/'.
    """
    bin_dir = get_bin_dir()
    zip_url = "https://github.com/denoland/deno/releases/latest/download/deno-x86_64-pc-windows-msvc.zip"
    zip_path = bin_dir / "deno_temp.zip"

    try:
        if progress_callback:
            progress_callback("Baixando Deno oficial para Windows (aguarde)...", 0.1)

        def reporthook(block_num, block_size, total_size):
            if total_size > 0 and progress_callback:
                percent = min(0.9, (block_num * block_size) / total_size)
                progress_callback(f"Baixando Deno... {int(percent*100)}%", percent)

        urllib.request.urlretrieve(zip_url, str(zip_path), reporthook)

        if progress_callback:
            progress_callback("Extraindo Deno...", 0.95)

        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            for member in zip_ref.namelist():
                filename = os.path.basename(member)
                if filename.lower() == "deno.exe":
                    source = zip_ref.open(member)
                    target = open(bin_dir / filename, "wb")
                    with source, target:
                        shutil.copyfileobj(source, target)

        if zip_path.exists():
            zip_path.unlink()

        if progress_callback:
            progress_callback("Deno configurado com sucesso!", 1.0)

        return is_deno_available()
    except Exception as e:
        if zip_path.exists():
            try:
                zip_path.unlink()
            except Exception:
                pass
        if progress_callback:
            progress_callback(f"Erro ao baixar Deno: {str(e)}", 0.0)
        return False



def format_bytes(size: int | float | None) -> str:
    """Formata bytes em formato legível (KB, MB, GB)."""
    if size is None or size <= 0:
        return "0 MB"
    
    power = 1024
    n = 0
    units = {0: 'B', 1: 'KB', 2: 'MB', 3: 'GB', 4: 'TB'}
    while size >= power and n < len(units) - 1:
        size /= power
        n += 1
    return f"{size:.2f} {units[n]}"


def format_seconds(seconds: int | float | None) -> str:
    """Formata segundos em HH:MM:SS ou MM:SS."""
    if seconds is None or seconds < 0:
        return "--:--"
    
    seconds = int(seconds)
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"


def open_folder(path: str | Path):
    """Abre a pasta no Windows Explorer e seleciona o arquivo."""
    folder_path = Path(path).resolve()
    
    if sys.platform == "win32":
        import subprocess
        if folder_path.is_file():
            # Abre a pasta em primeiro plano com o arquivo selecionado
            subprocess.Popen(['explorer', '/select,', str(folder_path)])
        else:
            if not folder_path.exists():
                folder_path.mkdir(parents=True, exist_ok=True)
            subprocess.Popen(['explorer', str(folder_path)])
    else:
        import subprocess
        if folder_path.is_file():
            folder_path = folder_path.parent
        subprocess.run(["xdg-open", str(folder_path)])
