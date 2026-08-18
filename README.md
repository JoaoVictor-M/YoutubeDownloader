# 🎬 YouTube Downloader PRO (Web Application)

Uma aplicação web moderna, ultrarrápida e responsiva para baixar vídeos em alta resolução (**MP4 em 4K, 1080p, 720p**) e extrair músicas em qualidade máxima (**MP3 a 320 kbps**) do YouTube, com suporte a **FFmpeg local**, **WebSockets em tempo real** e alternância entre **Modo Escuro (Dark) e Claro (Light)**.

---

## ✨ Principais Recursos

- 🎨 **Design Premium & Glassmorphism**: Interface futurista, com sombras suaves, fontes do Google Fonts (*Outfit* e *Inter*) e efeitos visuais refinados.
- 🌓 **Modo Escuro & Claro (Dark/Light)**: Alterne com 1 clique entre o tema Dark e Light com animações suaves e persistência da preferência.
- ⚡ **Performance Imbatível**: Renderização acelerada por hardware via navegador (GPU), eliminando qualquer lentidão.
- 📡 **Métricas em Tempo Real (WebSockets)**: Barra de progresso neon brilhante com velocidade em `MB/s`, tamanho baixado e tempo estimado restante (`ETA`) atualizados instantaneamente a 60 FPS.
- 🎥 **Vídeos em MP4**: Seleção visual por chips com todas as resoluções reais do vídeo (**4K / 2160p**, **2K / 1440p**, **Full HD / 1080p**, **HD / 720p**, etc.).
- 🎵 **Áudio em MP3**: Extração direta em **320 kbps** com metadados e Capa (Thumbnail) embutidas no arquivo.
- 🛠️ **FFmpeg 1-Clique**: Reconhece o executável na pasta `bin/` ou baixa e configura o build oficial do Windows automaticamente com 1 clique na interface.
- 📂 **Integração com Windows**: Escolha de pasta e botão para abrir o arquivo baixado diretamente no Windows Explorer.

---

## 🚀 Como Executar

### 1. Instalar as Dependências
Abra o terminal (PowerShell / Prompt de Comando) na pasta do projeto e execute:
```bash
pip install -r requirements.txt
```

### 2. Iniciar o Aplicativo
```bash
python main.py
```
> O servidor iniciará e o seu navegador padrão abrirá automaticamente em `http://127.0.0.1:8000`!

---

## 📱 Acessando pelo Celular (Na mesma rede Wi-Fi)

Se você quiser baixar vídeos ou músicas direto pelo smartphone usando a engine do seu PC:
1. Descubra o IP local do seu computador (no PowerShell: `ipconfig`, ex: `192.168.1.15`).
2. Execute no PC:
   ```bash
   uvicorn src.server:app --host 0.0.0.0 --port 8000
   ```
3. No celular, acesse `http://192.168.1.15:8000` no navegador. A interface se adaptará perfeitamente à tela do celular!

---

## 🛠️ Tecnologias Utilizadas

* **Python 3.10+ & FastAPI**: Backend assíncrono de altíssima velocidade.
* **WebSockets**: Comunicação bidirecional contínua para feedback de download em tempo real.
* **yt-dlp**: Motor de extração de vídeos mais robusto e atualizado do mundo.
* **FFmpeg**: Conversão de áudio para MP3 (320kbps) e junção de vídeo/áudio em alta definição.
* **HTML5 / CSS3 Moderno / Vanilla JS**: Design System exclusivo com Glassmorphism, temas Dark/Light e responsividade completa.
