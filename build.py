import PyInstaller.__main__
import os

if __name__ == '__main__':
    print("=" * 50)
    print(" Passo 1: Compilando o Aplicativo Principal")
    print("=" * 50)
    
    app_args = [
        'main.py',
        '--name=YouTubeDownloader',
        '--onedir',
        '--windowed',
        '--add-data=web;web',
        '--icon=icon.ico',
        '--clean',
        '-y',
    ]
    PyInstaller.__main__.run(app_args)

    print("\nZipando a estrutura do aplicativo (--onedir)...")
    import shutil
    import time
    time.sleep(1) # Garantir que o PyInstaller solte os arquivos
    
    # Copiar o ícone diretamente para a pasta do app para usarmos nos atalhos
    shutil.copy2('icon.ico', 'dist/YouTubeDownloader/icon.ico')
    
    shutil.make_archive('app_dist', 'zip', 'dist/YouTubeDownloader')


    # ==========================================================
    # 2. Compilar o Desinstalador
    # ==========================================================
    print("\n" + "="*50)
    print(" Passo 2: Compilando o Desinstalador")
    print("="*50)
    
    uninstaller_args = [
        'uninstaller.py',
        '--name=Uninstall',
        '--onefile',
        '--windowed',
        '--icon=icon.ico',
        '--clean',
        '-y',
    ]
    PyInstaller.__main__.run(uninstaller_args)

    # ==========================================================
    # 3. Compilar o Instalador (Setup)
    # ==========================================================
    print("\n" + "="*50)
    print(" Passo 3: Compilando o Instalador (Setup)")
    print("="*50)

    installer_args = [
        'installer.py',
        '--name=Setup - YoutubeDownloader',
        '--onefile',
        '--add-data=app_dist.zip;.',
        '--add-data=dist/Uninstall.exe;.',
        '--icon=icon.ico',
        '--clean',
        '-y',
    ]
    PyInstaller.__main__.run(installer_args)

    print("\n Tudo pronto!")
    print(f"O instalador final esta em: {os.path.join(os.getcwd(), 'dist', 'Setup - YoutubeDownloader.exe')}")

    print("\n Limpando arquivos temporarios...")
    # Remover .spec intermediários
    import shutil
    try:
        shutil.rmtree('build', ignore_errors=True)
        for f in ['YouTubeDownloader.spec', 'Setup - YoutubeDownloader.spec', 'Uninstall.spec']:
            if os.path.exists(f):
                os.remove(f)
                
        # Remover arquivos intermediários da pasta dist e zip
        for f in ['dist/Uninstall.exe', 'app_dist.zip']:
            if os.path.exists(f):
                os.remove(f)
        
        # Removemos o diretório onedir
        app_dir = os.path.join(os.getcwd(), 'dist', 'YouTubeDownloader')
        if os.path.exists(app_dir):
            shutil.rmtree(app_dir, ignore_errors=True)
        print("Limpeza concluída!")
    except Exception as e:
        print(f"Erro durante a limpeza: {e}")
