"""
YouTube Downloader - Web Application Entry Point
Inicia o servidor FastAPI e abre automaticamente a interface no navegador padrão.
"""
import sys
import os
import time
import threading
import webbrowser
import uvicorn

from src.server import app

# Fix for PyInstaller --windowed mode setting stdout/stderr to None
if sys.stdout is None:
    sys.stdout = open(os.devnull, 'w')
if sys.stderr is None:
    sys.stderr = open(os.devnull, 'w')

def open_browser_after_delay():
    """Abre o navegador automaticamente após a inicialização do servidor."""
    time.sleep(1.2)
    webbrowser.open("http://127.0.0.1:8000")

def main():
    # Inicia a thread que abre o navegador
    threading.Thread(target=open_browser_after_delay, daemon=True).start()
    
    # Força saída UTF-8 para suportar emojis no terminal do Windows
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
        
    print("\n" + "=" * 65)
    print("  🎬 YouTube Downloader (Web Application)")
    print("  Interface abrindo em: http://127.0.0.1:8000")
    print("  Pressione CTRL+C no terminal para encerrar o aplicativo.")
    print("=" * 65 + "\n")

    # Inicia o servidor uvicorn
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        log_level="info",
        access_log=True
    )

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nEncerrando YouTube Downloader...")
        sys.exit(0)
