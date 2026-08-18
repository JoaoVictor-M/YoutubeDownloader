/**
 * YouTube Downloader Pro - Client Application Logic
 */

// --- ESTADO GLOBAL DA APLICAÇÃO ---
const state = {
  currentVideo: null,
  selectedFormat: 'video', // 'video' ou 'audio'
  selectedResolution: null,
  outputDirectory: '',
  ffmpegAvailable: false,
  denoAvailable: false,
  lastDownloadedPath: '',
  isDownloading: false,
  socket: null,
  history: []
};

// --- ELEMENTOS DO DOM ---
const DOM = {
  themeToggle: document.getElementById('theme-toggle'),
  cookiesBtn: document.getElementById('cookies-btn'),
  cookiesInput: document.getElementById('cookies-input'),
  
  urlInput: document.getElementById('url-input'),
  pasteBtn: document.getElementById('paste-btn'),
  analyzeBtn: document.getElementById('analyze-btn'),
  clearBtn: document.getElementById('clear-btn'),
  
  skeletonCard: document.getElementById('skeleton-card'),
  previewCard: document.getElementById('preview-card'),
  
  videoThumb: document.getElementById('video-thumb'),
  videoDuration: document.getElementById('video-duration'),
  videoTitle: document.getElementById('video-title'),
  videoChannel: document.getElementById('video-channel'),
  
  formatBtns: document.querySelectorAll('.format-btn'),
  resolutionsContainer: document.getElementById('resolutions-container'),
  resolutionChips: document.getElementById('resolution-chips'),
  
  destInput: document.getElementById('dest-input'),
  openDestBtn: document.getElementById('open-dest-btn'),
  startDownloadBtn: document.getElementById('start-download-btn'),
  cancelDownloadBtn: document.getElementById('cancel-download-btn'),
  
  progressCard: document.getElementById('progress-card'),
  progressStatusText: document.getElementById('progress-status-text'),
  progressPercent: document.getElementById('progress-percent'),
  progressBarFill: document.getElementById('progress-bar-fill'),
  metricSpeed: document.getElementById('metric-speed'),
  metricDownloaded: document.getElementById('metric-downloaded'),
  metricEta: document.getElementById('metric-eta'),
  
  successCard: document.getElementById('success-card'),
  successFilename: document.getElementById('success-filename'),
  successOpenBtn: document.getElementById('success-open-btn'),
  successResetBtn: document.getElementById('success-reset-btn'),
  
  historyCard: document.getElementById('history-card'),
  historyList: document.getElementById('history-list'),
  clearHistoryBtn: document.getElementById('clear-history-btn'),

  toastContainer: document.getElementById('toast-container')
};

// ==========================================================================
// 1. INICIALIZAÇÃO & TEMA (DARK / LIGHT MODE)
// ==========================================================================

function initTheme() {
  const savedTheme = localStorage.getItem('yt_downloader_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  DOM.themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('yt_downloader_theme', newTheme);
    showToast(`Tema ${newTheme === 'dark' ? 'Escuro' : 'Claro'} ativado`, 'info');
  });
}

async function checkSystemStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    
    state.ffmpegAvailable = data.ffmpeg_available;
    state.denoAvailable = data.deno_available;
    state.outputDirectory = data.default_dir;
    DOM.destInput.value = data.default_dir;
  } catch (err) {
    console.error('Erro ao verificar status do sistema:', err);
  }
}

// ==========================================================================
// 4. COOKIES UPLOAD
// ==========================================================================

DOM.cookiesBtn.addEventListener('click', () => {
  DOM.cookiesInput.click();
});

DOM.cookiesInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  showToast('Enviando arquivo cookies.txt...', 'info');

  try {
    const res = await fetch('/api/upload-cookies', {
      method: 'POST',
      body: formData
    });
    
    if (res.ok) {
      showToast('Cookies importados com sucesso! Bloqueios resolvidos.', 'success');
      DOM.cookiesBtn.style.color = '#22c55e'; // Highlight that cookies are active
    } else {
      const err = await res.json();
      showToast(`Erro ao salvar cookies: ${err.detail || 'Desconhecido'}`, 'error');
    }
  } catch (err) {
    showToast('Falha na conexão ao enviar cookies.', 'error');
  } finally {
    DOM.cookiesInput.value = '';
  }
});

// ==========================================================================
// 3. CLIPBOARD & URL FETCHING
// ==========================================================================

DOM.pasteBtn.addEventListener('click', async () => {
  try {
    if (!navigator.clipboard) {
      showToast('API de área de transferência não suportada ou contexto inseguro.', 'error');
      return;
    }
    const text = await navigator.clipboard.readText();
    if (text && text.trim().startsWith('http')) {
      DOM.urlInput.value = text.trim();
      fetchVideoInfo();
    } else {
      showToast('Nenhum link válido encontrado na área de transferência.', 'error');
    }
  } catch (err) {
    showToast('Permissão para área de transferência negada pelo navegador.', 'error');
  }
});

async function fetchVideoInfo() {
  const url = DOM.urlInput.value.trim();
  if (!url) {
    showToast('Por favor, insira o link do vídeo.', 'error');
    return;
  }

  // UI Loading State
  setAnalyzeLoading(true);
  DOM.skeletonCard.classList.remove('hidden');
  DOM.previewCard.classList.add('hidden');
  DOM.progressCard.classList.add('hidden');
  DOM.successCard.classList.add('hidden');

  try {
    const res = await fetch('/api/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || 'Erro ao carregar informações do vídeo.');
    }

    const data = await res.json();
    state.currentVideo = data;
    renderVideoPreview(data);
  } catch (err) {
    showToast(`Erro: ${err.message}`, 'error');
  } finally {
    setAnalyzeLoading(false);
    DOM.skeletonCard.classList.add('hidden');
  }
}

function setAnalyzeLoading(isLoading) {
  const btnText = DOM.analyzeBtn.querySelector('.btn-text');
  const btnLoader = DOM.analyzeBtn.querySelector('.btn-loader');
  
  DOM.analyzeBtn.disabled = isLoading;
  if (isLoading) {
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');
  } else {
    btnText.classList.remove('hidden');
    btnLoader.classList.add('hidden');
  }
}

// ==========================================================================
// 4. RENDER PREVIEW & QUALITIES
// ==========================================================================

function renderVideoPreview(video) {
  DOM.videoThumb.src = video.thumbnail || '';
  DOM.videoDuration.textContent = video.duration_formatted || '--:--';
  DOM.videoTitle.textContent = video.title || 'Vídeo sem título';
  DOM.videoChannel.textContent = video.uploader || 'Canal Desconhecido';

  // Renderiza Resoluções
  DOM.resolutionChips.innerHTML = '';
  const resolutions = video.resolutions || [];

  resolutions.forEach((res, index) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `chip ${index === 0 ? 'active' : ''}`;
    
    let badgeHtml = '';
    if (res.height >= 2160) badgeHtml = '<span class="chip-badge">4K</span>';
    else if (res.height >= 1440) badgeHtml = '<span class="chip-badge">2K</span>';
    else if (res.height >= 1080) badgeHtml = '<span class="chip-badge">Full HD</span>';
    else if (res.height >= 720) badgeHtml = '<span class="chip-badge">HD</span>';

    const sizeText = res.size_str && res.size_str !== "N/A" ? ` <span style="opacity:0.7; font-size:0.9em;">- ${res.size_str}</span>` : "";
    chip.innerHTML = `${res.label}${sizeText} ${badgeHtml}`;
    
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.selectedResolution = res.height;
    });

    DOM.resolutionChips.appendChild(chip);
  });

  // Define a resolução padrão como a primeira (Melhor Qualidade ou mais alta)
  state.selectedResolution = resolutions.length > 0 ? resolutions[0].height : null;

  // Mostra o card de preview
  DOM.previewCard.classList.remove('hidden');
  DOM.previewCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Alternador de Formato (Vídeo vs Áudio)
DOM.formatBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    DOM.formatBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    state.selectedFormat = btn.dataset.format;
    if (state.selectedFormat === 'audio') {
      DOM.resolutionsContainer.classList.add('hidden');
    } else {
      DOM.resolutionsContainer.classList.remove('hidden');
    }
  });
});

// ==========================================================================
// 5. DOWNLOAD MANAGER VIA WEBSOCKET
// ==========================================================================

DOM.startDownloadBtn.addEventListener('click', startDownload);

function startDownload() {
  if (!state.currentVideo) {
    showToast('Analise um vídeo antes de iniciar o download.', 'error');
    return;
  }

  if (state.isDownloading) return;

  const url = state.currentVideo.url;
  const media_type = state.selectedFormat;
  const resolution_height = media_type === 'video' ? (state.selectedResolution ? parseInt(state.selectedResolution) : null) : null;
  const output_dir = DOM.destInput.value.trim() || state.outputDirectory;

  // UI Setup para Download
  state.isDownloading = true;
  DOM.startDownloadBtn.disabled = true;
  DOM.startDownloadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> BAIXANDO...';
  
  DOM.progressCard.classList.remove('hidden');
  DOM.successCard.classList.add('hidden');
  resetProgressUI();
  DOM.progressCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Cria conexão WebSocket
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${location.host}/ws/download`;

  state.socket = new WebSocket(wsUrl);

  state.socket.onopen = () => {
    const payload = {
      url,
      media_type,
      resolution_height,
      output_dir
    };
    state.socket.send(JSON.stringify(payload));
  };

  state.socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleSocketMessage(data);
  };

  state.socket.onerror = () => {
    showToast('Erro de comunicação com o servidor.', 'error');
    finishDownloadUI(false);
  };

  state.socket.onclose = () => {
    if (state.isDownloading) {
      finishDownloadUI(false);
    }
  };
}

function handleSocketMessage(data) {
  if (data.type === 'progress') {
    DOM.progressStatusText.textContent = `Baixando arquivo...`;
    DOM.progressPercent.textContent = `${data.percent}%`;
    DOM.progressBarFill.style.width = `${data.percent}%`;
    
    DOM.metricSpeed.textContent = data.speed_str || '-- MB/s';
    DOM.metricDownloaded.textContent = `${data.downloaded_str} / ${data.total_str}`;
    DOM.metricEta.textContent = data.eta_str || '--:--';

  } else if (data.type === 'processing') {
    DOM.progressStatusText.textContent = data.message || 'Processando com FFmpeg...';
    DOM.progressPercent.textContent = '100%';
    DOM.progressBarFill.style.width = '100%';
    DOM.metricEta.textContent = 'Finalizando...';

  } else if (data.type === 'complete') {
    state.lastDownloadedPath = data.filepath;
    
    DOM.progressCard.classList.add('hidden');
    DOM.successCard.classList.remove('hidden');
    DOM.successCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    addToHistory({
        title: state.currentVideo.title,
        format: state.selectedFormat,
        resolution: state.selectedResolution,
        filepath: data.filepath,
        date: new Date()
    });

    showToast('Download concluído com sucesso!', 'success');
    finishDownloadUI(true);

  } else if (data.type === 'error') {
    showToast(`Erro no download: ${data.message}`, 'error');
    finishDownloadUI(false);
  }
}

function resetProgressUI() {
  DOM.progressStatusText.textContent = 'Conectando e iniciando download...';
  DOM.progressPercent.textContent = '0%';
  DOM.progressBarFill.style.width = '0%';
  DOM.metricSpeed.textContent = '-- MB/s';
  DOM.metricDownloaded.textContent = '0 MB / 0 MB';
  DOM.metricEta.textContent = '--:--';
  DOM.cancelDownloadBtn.disabled = false;
  DOM.cancelDownloadBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> Cancelar';
}

DOM.cancelDownloadBtn.addEventListener('click', async () => {
  if (!state.isDownloading) return;
  DOM.cancelDownloadBtn.disabled = true;
  DOM.cancelDownloadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Cancelando...';
  try {
    await fetch('/api/cancel', { method: 'POST' });
  } catch (err) {
    console.error('Erro ao cancelar:', err);
  }
});

function finishDownloadUI(isSuccess) {
  state.isDownloading = false;
  DOM.startDownloadBtn.disabled = false;
  DOM.startDownloadBtn.innerHTML = '<span class="btn-icon"><i class="fa-solid fa-cloud-arrow-down"></i></span><span class="btn-text">INICIAR DOWNLOAD</span>';
  
  if (state.socket) {
    try { state.socket.close(); } catch(e) {}
    state.socket = null;
  }
}

// ==========================================================================
// 6. AÇÕES AUXILIARES (ABRIR PASTA / NOVO DOWNLOAD)
// ==========================================================================

async function openFolder(path) {
  try {
    await fetch('/api/open-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: path || state.lastDownloadedPath || DOM.destInput.value })
    });
    showToast('Pasta aberta no Windows Explorer!', 'info');
  } catch (err) {
    showToast('Erro ao abrir pasta.', 'error');
  }
}

DOM.openDestBtn.addEventListener('click', async () => {
  try {
    const res = await fetch('/api/select-folder');
    const data = await res.json();
    if (data.success && data.path) {
      DOM.destInput.value = data.path;
      state.outputDirectory = data.path;
    } else if (data.message && data.message !== "Nenhuma pasta selecionada.") {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Erro ao abrir o seletor de pastas.', 'error');
  }
});

DOM.successOpenBtn.addEventListener('click', () => openFolder(state.lastDownloadedPath));

DOM.successResetBtn.addEventListener('click', clearScreen);

DOM.clearBtn.addEventListener('click', clearScreen);

function clearScreen() {
  DOM.successCard.classList.add('hidden');
  DOM.previewCard.classList.add('hidden');
  DOM.progressCard.classList.add('hidden');
  DOM.urlInput.value = '';
  DOM.urlInput.focus();
  state.currentVideo = null;
  state.isDownloading = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function addToHistory(item) {
  state.history.unshift(item);
  renderHistory();
}

function renderHistory() {
  if (state.history.length > 0) {
    DOM.historyCard.classList.remove('hidden');
  } else {
    DOM.historyCard.classList.add('hidden');
  }

  DOM.historyList.innerHTML = '';
  
  state.history.forEach((item, index) => {
    const el = document.createElement('div');
    el.style.display = 'flex';
    el.style.justifyContent = 'space-between';
    el.style.alignItems = 'center';
    el.style.background = 'var(--surface-color)';
    el.style.padding = '10px 15px';
    el.style.borderRadius = '8px';
    el.style.border = '1px solid var(--border-color)';
    
    const timeStr = item.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    let formatStr = item.format === 'video' ? `Vídeo ${item.resolution}p` : 'Áudio MP3';

    el.innerHTML = `
      <div style="display: flex; flex-direction: column; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; max-width: 70%;">
        <strong style="font-size: 0.95rem; overflow: hidden; text-overflow: ellipsis;">${item.title}</strong>
        <span style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">
          ${timeStr} &bull; ${formatStr}
        </span>
      </div>
      <div>
        <button type="button" class="btn-outline" style="padding: 6px 12px; font-size: 0.85rem;" onclick="openFolder('${item.filepath.replace(/\\/g, '\\\\')}')">
          <i class="fa-solid fa-folder-open"></i> Abrir
        </button>
      </div>
    `;
    
    DOM.historyList.appendChild(el);
  });
}

DOM.clearHistoryBtn.addEventListener('click', () => {
  state.history = [];
  renderHistory();
  showToast('Histórico limpo.', 'info');
});

// ==========================================================================
// 7. TOAST NOTIFICATIONS HELPER
// ==========================================================================

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'fa-circle-info';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'error') icon = 'fa-triangle-exclamation';

  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// --- BOOTSTRAP ---
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  checkSystemStatus();
  
  // Heartbeat mechanism to keep server alive
  setInterval(() => {
    fetch('/api/heartbeat').catch(() => {});
  }, 2000);
});
