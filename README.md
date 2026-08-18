<div align="center">
  <img src="web/static/img/favicon.png" width="128" alt="YoutubeDownloader Logo" />
  <h1>YoutubeDownloader</h1>
  <p>Uma aplicação desktop moderna, rápida e elegante para baixar vídeos em 4K e músicas no YouTube.</p>

  <a href="https://github.com/JoaoVictor-M/YoutubeDownloader/releases/download/v1.0.0/Setup%20-%20YoutubeDownloader.exe">
    <img src="https://img.shields.io/badge/Download-Setup_v1.0.0-blue?style=for-the-badge&logo=windows" alt="Download Windows Installer">
  </a>
</div>

---

## ✨ Principais Recursos

- 🎨 **Interface Moderna**: Design limpo com temas Escuro (Dark) e Claro (Light), focado na melhor experiência do usuário.
- ⚡ **Qualidade Máxima**: Baixe vídeos em MP4 (até **4K / 2160p**) ou extraia apenas o áudio em MP3 (**320 kbps**) com capas e metadados automáticos.
- 📡 **Monitoramento em Tempo Real**: Barra de progresso ao vivo exibindo velocidade de download (`MB/s`), tamanho baixado e tempo estimado restante (`ETA`).
- 🤖 **Gestão Autônoma**: O programa baixa e configura automaticamente as dependências necessárias (`FFmpeg` e `Deno`) no primeiro uso.
- 📂 **Organização Fácil**: Seleção visual do diretório de saída (com diálogos nativos do Windows) e um botão dedicado para abrir o arquivo logo após a conclusão.
- 🧹 **Histórico Integrado**: Acompanhe o que já foi baixado na sessão e limpe seu histórico com um único clique.

---

## 🚀 Como Usar (Para Usuários)

Você não precisa de conhecimentos técnicos ou instalar pacotes de desenvolvimento!

1. Clique no botão de **Download** no topo desta página.
2. Execute o instalador `Setup - YoutubeDownloader.exe`.
3. Pronto! O atalho será criado na sua Área de Trabalho. Basta abrir, colar o link do vídeo, escolher a qualidade e baixar!

---

## 💻 Para Desenvolvedores (Build Local)

Se você quiser rodar o código-fonte ou modificar o programa localmente, precisará ter o Python instalado.

### 1. Preparar o ambiente
Abra o terminal na pasta do projeto e instale as dependências:
```bash
pip install -r requirements.txt
```

### 2. Rodar o servidor e a interface
```bash
python main.py
```
> O servidor será iniciado e a interface será aberta no seu navegador padrão (`http://127.0.0.1:8000`). O processo é finalizado de forma inteligente ao fechar a aba!

### 3. Compilar um novo Instalador (`.exe`)
Para gerar um novo `Setup - YoutubeDownloader.exe`, basta rodar nosso script de build (você precisará do `Inno Setup` instalado no seu Windows caso também queira compilar o instalador).
```bash
python build.py
```

---

## 🛠️ Tecnologias Utilizadas

- **Backend**: Python 3, FastAPI, WebSockets
- **Frontend**: HTML5, CSS3, Vanilla JS
- **Motor de Download**: yt-dlp (o mais robusto extrator do mercado)
- **Processamento de Mídia**: FFmpeg (conversão e junção de áudio e vídeo de alta resolução)
- **Compilação**: PyInstaller e Inno Setup
