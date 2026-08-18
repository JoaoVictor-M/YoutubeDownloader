import os
import sys
import ctypes
import subprocess
from pathlib import Path

def show_message_box(title, text, style):
    # style: 4 = Yes/No, 36 = Yes/No + Question Icon
    return ctypes.windll.user32.MessageBoxW(0, text, title, style)

def main():
    MB_YESNO = 0x04
    MB_ICONWARNING = 0x30
    IDYES = 6

    response = ctypes.windll.user32.MessageBoxW(
        0,
        "Você tem certeza de que deseja desinstalar completamente o YoutubeDownloader e apagar todos os seus arquivos (incluindo Deno e FFmpeg)?",
        "Desinstalar YoutubeDownloader",
        MB_YESNO | MB_ICONWARNING
    )
    
    if response != IDYES: # Se não for Yes
        sys.exit(0)
        
    local_app_data = os.environ.get("LOCALAPPDATA")
    app_data = os.environ.get("APPDATA")
    user_profile = os.environ.get("USERPROFILE")
    
    install_dir = Path(local_app_data) / "YoutubeDownloader"
    start_menu_dir = Path(app_data) / "Microsoft" / "Windows" / "Start Menu" / "Programs" / "YoutubeDownloader"
    desktop_shortcut = Path(user_profile) / "Desktop" / "YoutubeDownloader.lnk"
    
    # Criar um arquivo .bat temporário para apagar a pasta depois que este executável fechar
    temp_dir = Path(os.environ.get("TEMP"))
    bat_path = temp_dir / "uninstall_yt_downloader.bat"
    
    bat_content = f"""@echo off
echo Desinstalando YoutubeDownloader...
ping 127.0.0.1 -n 3 > nul
rmdir /s /q "{install_dir}"
rmdir /s /q "{start_menu_dir}"
del /q "{desktop_shortcut}"
del "%~f0"
"""
    with open(bat_path, "w", encoding="utf-8") as f:
        f.write(bat_content)
        
    # Mensagem de sucesso
    ctypes.windll.user32.MessageBoxW(
        0,
        "O YoutubeDownloader foi removido com sucesso do seu computador.",
        "Desinstalação Concluída",
        0x00 | 0x40 # MB_OK | MB_ICONINFORMATION
    )
    
    # Executar o .bat invisivelmente e fechar o desinstalador
    subprocess.Popen(
        ["cmd.exe", "/c", str(bat_path)],
        creationflags=subprocess.CREATE_NO_WINDOW
    )
    sys.exit(0)

if __name__ == "__main__":
    main()
