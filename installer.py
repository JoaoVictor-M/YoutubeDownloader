import os
import sys
import shutil
import urllib.request
import zipfile
import subprocess
from pathlib import Path

def print_banner():
    print("=" * 60)
    print("   🎬 Instalador - YoutubeDownloader")
    print("=" * 60 + "\n")

def get_meipass() -> Path:
    if getattr(sys, 'frozen', False):
        return Path(sys._MEIPASS)
    return Path(__file__).resolve().parent

def download_and_extract(url, zip_path, extract_dir, target_files, desc):
    print(f"Baixando {desc}...")
    try:
        def reporthook(block_num, block_size, total_size):
            if total_size > 0:
                percent = min(100, int((block_num * block_size * 100) / total_size))
                print(f"\rProgresso: {percent}% concluído", end="", flush=True)
                
        urllib.request.urlretrieve(url, str(zip_path), reporthook)
        print(f"\nExtraindo {desc}...")
        
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            for member in zip_ref.namelist():
                filename = os.path.basename(member)
                if filename.lower() in target_files:
                    source = zip_ref.open(member)
                    target = open(extract_dir / filename, "wb")
                    with source, target:
                        shutil.copyfileobj(source, target)
        if zip_path.exists():
            zip_path.unlink()
        print(f"✅ {desc} instalado com sucesso!\n")
    except Exception as e:
        print(f"\n❌ Erro ao baixar/instalar {desc}: {e}\n")

def create_shortcuts(target_exe, folder_path):
    print("Criando atalhos...")
    try:
        # Start Menu Folder
        start_menu_dir = Path(os.environ["APPDATA"]) / "Microsoft" / "Windows" / "Start Menu" / "Programs" / "YoutubeDownloader"
        start_menu_dir.mkdir(parents=True, exist_ok=True)
        start_menu_shortcut = start_menu_dir / "YoutubeDownloader.lnk"
        uninstaller_shortcut = start_menu_dir / "Desinstalar YoutubeDownloader.lnk"
        
        # Desktop Shortcut
        desktop_dir = Path(os.environ["USERPROFILE"]) / "Desktop"
        desktop_shortcut = desktop_dir / "YoutubeDownloader.lnk"
        
        ps_script = f"""
        $WshShell = New-Object -comObject WScript.Shell
        
        $Shortcut1 = $WshShell.CreateShortcut('{str(start_menu_shortcut)}')
        $Shortcut1.TargetPath = '{str(target_exe)}'
        $Shortcut1.WorkingDirectory = '{str(folder_path)}'
        $Shortcut1.Description = 'YoutubeDownloader'
        $Shortcut1.IconLocation = '{str(folder_path / "icon.ico")}'
        $Shortcut1.Save()
        
        $ShortcutUninstall = $WshShell.CreateShortcut('{str(uninstaller_shortcut)}')
        $ShortcutUninstall.TargetPath = '{str(folder_path / "Uninstall.exe")}'
        $ShortcutUninstall.WorkingDirectory = '{str(folder_path)}'
        $ShortcutUninstall.Description = 'Desinstalar YoutubeDownloader'
        $ShortcutUninstall.IconLocation = '{str(folder_path / "Uninstall.exe")},0'
        $ShortcutUninstall.Save()

        $Shortcut2 = $WshShell.CreateShortcut('{str(desktop_shortcut)}')
        $Shortcut2.TargetPath = '{str(target_exe)}'
        $Shortcut2.WorkingDirectory = '{str(folder_path)}'
        $Shortcut2.Description = 'YoutubeDownloader'
        $Shortcut2.IconLocation = '{str(folder_path / "icon.ico")}'
        $Shortcut2.Save()
        """
        subprocess.run(["powershell", "-NoProfile", "-Command", ps_script], capture_output=True)
        print("✅ Atalhos criados no Menu Iniciar e na Área de Trabalho!\n")
    except Exception as e:
        print(f"⚠️ Não foi possível criar atalhos automaticamente: {e}\n")

def main():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
        
    print_banner()
    
    install_dir = Path(os.environ["LOCALAPPDATA"]) / "YoutubeDownloader"
    bin_dir = install_dir / "bin"
    
    print(f"Diretório de instalação: {install_dir}\n")
    
    # Criar pastas
    install_dir.mkdir(parents=True, exist_ok=True)
    bin_dir.mkdir(parents=True, exist_ok=True)
    
    # 1. Extrair o aplicativo principal
    print("Instalando aplicativo principal...")
    bundled_zip = get_meipass() / "app_dist.zip"
    target_exe = install_dir / "YoutubeDownloader.exe"
    
    if bundled_zip.exists():
        import zipfile
        with zipfile.ZipFile(bundled_zip, 'r') as zip_ref:
            zip_ref.extractall(install_dir)
        print("✅ Aplicativo instalado (arquitetura ultrarrápida)!\n")
    else:
        print("❌ Erro fatal: O pacote do aplicativo não foi encontrado no instalador.")
        input("Pressione ENTER para sair...")
        return
        
    # 1.5 Copiar o Desinstalador
    bundled_uninstaller = get_meipass() / "Uninstall.exe"
    target_uninstaller = install_dir / "Uninstall.exe"
    if bundled_uninstaller.exists():
        shutil.copy2(bundled_uninstaller, target_uninstaller)

    # 2. Baixar FFmpeg
    ffmpeg_url = "https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
    download_and_extract(ffmpeg_url, bin_dir / "ffmpeg_temp.zip", bin_dir, ["ffmpeg.exe", "ffprobe.exe"], "FFmpeg")
    
    # 3. Baixar Deno
    deno_url = "https://github.com/denoland/deno/releases/latest/download/deno-x86_64-pc-windows-msvc.zip"
    download_and_extract(deno_url, bin_dir / "deno_temp.zip", bin_dir, ["deno.exe"], "Deno")
    
    # 4. Criar Atalhos
    create_shortcuts(target_exe, install_dir)
    
    print("=" * 60)
    print("🎉 Instalação concluída com sucesso!")
    print("Você já pode abrir o 'YoutubeDownloader' pelo atalho na Área de Trabalho.")
    print("=" * 60)
    
    input("\nPressione ENTER para fechar o instalador...")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
    except Exception as e:
        print(f"\nOcorreu um erro inesperado: {e}")
        input("Pressione ENTER para fechar...")
