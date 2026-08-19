<div align="center">
  <img src="web/static/img/favicon.png" width="128" alt="YoutubeDownloader Logo" />
  <h1>YoutubeDownloader v2.0</h1>
  <p>Uma aplicação desktop moderna, rápida e elegante para baixar vídeos em 4K, músicas e playlists inteiras no YouTube.</p>

  <a href="https://github.com/JoaoVictor-M/YoutubeDownloader/releases/download/v2.0.0/YoutubeDownloader.exe">
    <img src="https://img.shields.io/badge/Download-Setup_v2.0.0-blue?style=for-the-badge&logo=windows" alt="Download Windows Installer">
  </a>
</div>

---

## ✨ Principais Recursos

- 🎨 **Interface Moderna e Elegante**: Design limpo com temas Escuro (Dark) e Claro (Light), focado na melhor experiência do usuário.
- ⚡ **Qualidade Máxima**: Baixe vídeos em MP4 (até **4K / 2160p**) ou extraia apenas o áudio em MP3 (**320 kbps**) com capas e metadados automáticos.
- 🚀 **Novo: Fila de Downloads Paralela**: Adicione dezenas de vídeos na fila! O sistema gerencia tudo de forma inteligente, baixando **até 3 vídeos simultaneamente** e organizando os próximos (estilo uTorrent).
- 📑 **Novo: Suporte a Playlists**: Cole o link de uma playlist, selecione quais vídeos deseja e mande todos para a fila com um único clique.
- 📡 **Monitoramento em Tempo Real**: Barra de progresso ao vivo em colunas exibindo velocidade de download (`MB/s`), tamanho baixado e tempo estimado restante (`ETA`).
- 🤖 **Gestão Autônoma**: O programa baixa e configura automaticamente as dependências necessárias (`FFmpeg` e `Deno`) no primeiro uso.
- 📂 **Organização Fácil**: Seleção visual do diretório de saída (com diálogos nativos do Windows) e um botão dedicado para abrir o arquivo logo após a conclusão.
- 🧹 **Gestão e Histórico**: Controle total sobre a sua fila. Cancele downloads de forma independente e limpe seu histórico e downloads concluídos rapidamente.

---

## 🚀 Como Usar (Para Usuários)

Você não precisa de conhecimentos técnicos ou instalar pacotes de desenvolvimento!

1. Clique no botão de **Download** no topo desta página.
2. Execute o instalador `YoutubeDownloader.exe`.
3. Pronto! O atalho será criado na sua Área de Trabalho. Basta abrir, colar o link do vídeo ou playlist, escolher a qualidade e baixar!

---

## 🍪 Como Baixar Vídeos Restritos (Cookies)

Se o vídeo exigir login no YouTube (ex: vídeos privados ou com restrição de idade), você pode usar os seus "cookies" de sessão para permitir que o YoutubeDownloader faça o download:

1. Clique no botão de **Cookies** na interface da aplicação (canto superior direito).
2. Siga as instruções em tela para baixar seus cookies usando a extensão **Get cookies.txt LOCALLY** ([Chrome](https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc) / [Edge](https://microsoftedge.microsoft.com/addons/detail/get-cookiestxt-locally/fdocfofdgofkledjhhmilnkginajbnof)).
3. Cole os cookies diretamente na janela do aplicativo e salve.
4. Pronto! O motor de download usará as suas credenciais de forma segura.

---

## 🛠️ Tecnologias Utilizadas

- **Backend**: Python 3, FastAPI, WebSockets
- **Frontend**: HTML5, CSS3, Vanilla JS
- **Motor de Download**: yt-dlp (o mais robusto extrator do mercado)
- **Processamento de Mídia**: FFmpeg (conversão e junção de áudio e vídeo de alta resolução)
- **Compilação**: PyInstaller e Inno Setup
