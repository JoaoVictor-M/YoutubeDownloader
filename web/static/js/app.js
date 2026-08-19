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
  history: [],
  
  // Fila de Downloads
  queue: [],
  activeDownloads: 0,
  maxConcurrent: 3,
  
  // Playlist State
  isPlaylistMode: false
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
  
  playlistPreviewCard: document.getElementById('playlist-preview-card'),
  playlistTitle: document.getElementById('playlist-title'),
  playlistVideosContainer: document.getElementById('playlist-videos-container'),
  toggleAllBtn: document.getElementById('toggle-all-btn'),
  playlistFormatBtns: document.querySelectorAll('.playlist-format-btn'),
  playlistResolutionsContainer: document.getElementById('playlist-resolutions-container'),
  playlistResolutionChips: document.getElementById('playlist-resolution-chips'),
  playlistDestInput: document.getElementById('playlist-dest-input'),
  playlistOpenDestBtn: document.getElementById('playlist-open-dest-btn'),
  playlistStartDownloadBtn: document.getElementById('playlist-start-download-btn'),
  playlistSelectedCount: document.getElementById('playlist-selected-count'),
  
  queueCard: document.getElementById('queue-card'),
  queueList: document.getElementById('queue-list'),
  clearQueueBtn: document.getElementById('clear-queue-btn'),
  
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
  DOM.playlistPreviewCard.classList.add('hidden');
  
  

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
    
    if (data.type === 'playlist') {
      state.isPlaylistMode = true;
      renderPlaylistPreview(data);
    } else {
      state.isPlaylistMode = false;
      renderVideoPreview(data);
    }
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

  DOM.previewCard.classList.remove('hidden');
  DOM.playlistPreviewCard.classList.add('hidden');
  DOM.previewCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderPlaylistPreview(playlist) {
  DOM.playlistTitle.textContent = playlist.title || 'Playlist sem título';
  DOM.playlistVideosContainer.innerHTML = '';
  
  playlist.videos.forEach((vid, index) => {
    const el = document.createElement('label');
    el.className = 'playlist-video-item';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.gap = '10px';
    el.style.padding = '8px';
    el.style.background = 'var(--surface-color)';
    el.style.borderRadius = '6px';
    el.style.cursor = 'pointer';
    
    el.innerHTML = `
      <input type="checkbox" class="playlist-checkbox" value="${index}" checked>
      <img src="${vid.thumbnail || '/static/favicon.svg'}" style="width: 60px; height: 40px; object-fit: cover; border-radius: 4px;">
      <div style="display: flex; flex-direction: column; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
        <span style="font-size: 0.9rem; font-weight: 500; overflow: hidden; text-overflow: ellipsis;">${vid.title}</span>
      </div>
    `;
    
    el.querySelector('input').addEventListener('change', updatePlaylistSelectedCount);
    DOM.playlistVideosContainer.appendChild(el);
  });
  
  // Renderiza Resoluções da Playlist
  DOM.playlistResolutionChips.innerHTML = '';
  const resolutions = playlist.resolutions || [];

  resolutions.forEach((res, index) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `chip ${index === 0 ? 'active' : ''}`;
    
    let badgeHtml = '';
    if (res.height >= 2160) badgeHtml = '<span class="chip-badge">4K</span>';
    else if (res.height >= 1440) badgeHtml = '<span class="chip-badge">2K</span>';
    else if (res.height >= 1080) badgeHtml = '<span class="chip-badge">Full HD</span>';
    else if (res.height >= 720) badgeHtml = '<span class="chip-badge">HD</span>';

    chip.innerHTML = `${res.label} ${badgeHtml}`;
    
    chip.addEventListener('click', () => {
      document.querySelectorAll('#playlist-resolution-chips .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.selectedResolution = res.height;
      updatePlaylistSelectedCount();
    });

    DOM.playlistResolutionChips.appendChild(chip);
  });

  state.selectedResolution = resolutions.length > 0 ? resolutions[0].height : null;
  state.selectedFormat = 'video';
  document.querySelectorAll('.playlist-format-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.playlist-format-btn[data-format="video"]').classList.add('active');
  DOM.playlistResolutionsContainer.classList.remove('hidden');

  updatePlaylistSelectedCount();

  DOM.playlistDestInput.value = DOM.destInput.value;
  DOM.playlistPreviewCard.classList.remove('hidden');
  DOM.previewCard.classList.add('hidden');
  DOM.playlistPreviewCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function updatePlaylistSelectedCount() {
  const checkboxes = document.querySelectorAll('.playlist-checkbox:checked');
  
  const countEl = document.getElementById('playlist-selected-count');
  const sizeEl = document.getElementById('playlist-estimated-size');
  
  if (countEl) countEl.textContent = checkboxes.length;
  
  if (!sizeEl || !state.currentVideo || !state.currentVideo.videos) return;

  let totalSeconds = 0;
  checkboxes.forEach(cb => {
    const idx = parseInt(cb.value);
    const vid = state.currentVideo.videos[idx];
    if (vid && vid.duration) {
      totalSeconds += vid.duration;
    }
  });

  let mbPerSecond = 0.5; // default 1080p
  if (state.selectedFormat === 'audio') {
     mbPerSecond = 0.016; // ~1MB/min (128kbps)
  } else {
     const res = state.selectedResolution;
     if (res >= 2160) mbPerSecond = 1.6; // ~100MB/min
     else if (res >= 1440) mbPerSecond = 0.8; // ~50MB/min
     else if (res >= 1080) mbPerSecond = 0.5; // ~30MB/min
     else if (res >= 720) mbPerSecond = 0.25; // ~15MB/min
     else if (res >= 480) mbPerSecond = 0.15; // ~9MB/min
     else mbPerSecond = 0.08; // 360p ~5MB/min
  }

  const totalMB = totalSeconds * mbPerSecond;

  if (totalMB > 1024) {
    sizeEl.textContent = `~${(totalMB / 1024).toFixed(2)} GB`;
  } else {
    sizeEl.textContent = `~${totalMB.toFixed(1)} MB`;
  }
}

DOM.toggleAllBtn.addEventListener('click', () => {
  const checkboxes = document.querySelectorAll('.playlist-checkbox');
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);
  checkboxes.forEach(cb => cb.checked = !allChecked);
  DOM.toggleAllBtn.textContent = allChecked ? "Selecionar Todos" : "Desmarcar Todos";
  updatePlaylistSelectedCount();
});

// Alternador de Formato (Vídeo vs Áudio) - Single
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

// Alternador de Formato (Vídeo vs Áudio) - Playlist
DOM.playlistFormatBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    DOM.playlistFormatBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    state.selectedFormat = btn.dataset.format;
    if (state.selectedFormat === 'audio') {
      DOM.playlistResolutionsContainer.classList.add('hidden');
    } else {
      DOM.playlistResolutionsContainer.classList.remove('hidden');
    }
    updatePlaylistSelectedCount();
  });
});

// ==========================================================================
// 5. QUEUE MANAGER VIA WEBSOCKET
// ==========================================================================

DOM.startDownloadBtn.addEventListener('click', () => {
  if (!state.currentVideo) {
    showToast('Analise um vídeo antes de iniciar o download.', 'error');
    return;
  }
  enqueueDownload(state.currentVideo.url, state.currentVideo.title, DOM.destInput.value.trim());
});

DOM.playlistStartDownloadBtn.addEventListener('click', () => {
  const checkboxes = document.querySelectorAll('.playlist-checkbox:checked');
  if (checkboxes.length === 0) {
    showToast('Selecione pelo menos um vídeo para baixar.', 'error');
    return;
  }

  checkboxes.forEach(cb => {
    const idx = cb.value;
    const vid = state.currentVideo.videos[idx];
    enqueueDownload(vid.url, vid.title, DOM.playlistDestInput.value.trim());
  });
  showToast('Vídeos da playlist adicionados à fila.', 'info');
});

function generateTaskId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function enqueueDownload(targetUrl, targetTitle, targetOutputDir) {
  const taskId = generateTaskId();
  const queueItem = {
    id: taskId,
    url: targetUrl,
    title: targetTitle,
    outputDir: targetOutputDir || state.outputDirectory,
    format: state.selectedFormat,
    resolution: state.selectedFormat === 'video' ? (state.selectedResolution ? parseInt(state.selectedResolution) : null) : null,
    status: 'queued', // queued, downloading, processing, finished, error, cancelled
    percent: 0,
    speedStr: '-- MB/s',
    downloadedStr: '0 MB',
    totalStr: '0 MB',
    etaStr: '--:--',
    filepath: '',
    socket: null
  };

  state.queue.push(queueItem);
  DOM.queueCard.classList.remove('hidden');
  renderQueue();
  processQueue();
}

function renderQueue() {
  if (state.queue.length === 0) {
    DOM.queueCard.classList.add('hidden');
    return;
  } else {
    DOM.queueCard.classList.remove('hidden');
  }

  DOM.queueList.innerHTML = '';
  state.queue.forEach(item => {
    const el = document.createElement('div');
    el.className = 'queue-item';

    let statusText = 'Aguardando';
    if (item.status === 'downloading') statusText = 'Baixando...';
    if (item.status === 'processing') statusText = 'Processando...';
    if (item.status === 'finished') statusText = 'Concluído';
    if (item.status === 'error') statusText = 'Erro';
    if (item.status === 'cancelled') statusText = 'Cancelado';

    el.innerHTML = `
      <div class="queue-item-header">
        <span class="queue-item-title" title="${item.title}">${item.title}</span>
        <button class="queue-item-cancel" onclick="cancelQueueItem('${item.id}')" title="Cancelar">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="queue-item-progress-track">
        <div class="queue-item-progress-fill status-${item.status}" style="width: ${item.percent}%"></div>
      </div>
      <div class="queue-item-metrics">
        <div><strong>${item.percent.toFixed(1)}%</strong> &bull; ${statusText}</div>
        <div>
          <span><i class="fa-solid fa-bolt"></i> ${item.speedStr}</span>
          <span style="margin-left: 10px;"><i class="fa-solid fa-hard-drive"></i> ${item.downloadedStr} / ${item.totalStr}</span>
        </div>
      </div>
    `;
    DOM.queueList.appendChild(el);
  });
}

window.cancelQueueItem = function(id) {
  const item = state.queue.find(i => i.id === id);
  if (!item) return;

  if (item.status === 'downloading' || item.status === 'processing') {
    // Cancela no backend
    fetch('/api/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: id })
    }).catch(() => {});
    
    if (item.socket) {
      item.socket.close();
    }
    state.activeDownloads--;
  }

  item.status = 'cancelled';
  renderQueue();
  processQueue();
};

DOM.clearQueueBtn.addEventListener('click', () => {
  // Mantem apenas queued, downloading e processing
  state.queue = state.queue.filter(item => 
    item.status === 'queued' || item.status === 'downloading' || item.status === 'processing'
  );
  renderQueue();
});

function processQueue() {
  // Verifica quantos downloads ativos existem
  const activeItems = state.queue.filter(i => i.status === 'downloading' || i.status === 'processing');
  state.activeDownloads = activeItems.length;

  if (state.activeDownloads >= state.maxConcurrent) {
    return; // Limite atingido
  }

  // Encontra itens aguardando
  const queuedItems = state.queue.filter(i => i.status === 'queued');
  
  // Inicia downloads até atingir o limite
  for (let i = 0; i < queuedItems.length; i++) {
    if (state.activeDownloads >= state.maxConcurrent) break;
    startQueueDownload(queuedItems[i]);
    state.activeDownloads++;
  }
}

function startQueueDownload(item) {
  item.status = 'downloading';
  renderQueue();

  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${location.host}/ws/download`;

  item.socket = new WebSocket(wsUrl);

  item.socket.onopen = () => {
    const payload = {
      task_id: item.id,
      url: item.url,
      media_type: item.format,
      resolution_height: item.resolution,
      output_dir: item.outputDir
    };
    item.socket.send(JSON.stringify(payload));
  };

  item.socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'progress') {
      item.status = 'downloading';
      item.percent = data.percent;
      item.speedStr = data.speed_str;
      item.downloadedStr = data.downloaded_str;
      item.totalStr = data.total_str;
      item.etaStr = data.eta_str;
      renderQueue();

    } else if (data.type === 'processing') {
      item.status = 'processing';
      item.percent = 100;
      item.etaStr = 'Finalizando...';
      renderQueue();

    } else if (data.type === 'complete') {
      item.status = 'finished';
      item.percent = 100;
      item.filepath = data.filepath;
      state.lastDownloadedPath = data.filepath;
      
      addToHistory({
          title: item.title,
          format: item.format,
          resolution: item.resolution,
          filepath: data.filepath,
          date: new Date()
      });

      if (item.socket) item.socket.close();
      item.socket = null;
      state.activeDownloads--;
      renderQueue();
      processQueue();

    } else if (data.type === 'error') {
      const isCancel = data.message.toLowerCase().includes('cancelado');
      if (isCancel) {
        item.status = 'cancelled';
      } else {
        item.status = 'error';
        showToast(`Erro no download: ${data.message}`, 'error');
      }
      if (item.socket) item.socket.close();
      item.socket = null;
      state.activeDownloads--;
      renderQueue();
      processQueue();
    }
  };

  item.socket.onerror = () => {
    item.status = 'error';
    if (item.socket) item.socket.close();
    item.socket = null;
    state.activeDownloads--;
    renderQueue();
    processQueue();
  };

  item.socket.onclose = () => {
    if (item.status === 'downloading' || item.status === 'processing') {
       item.status = 'error';
       state.activeDownloads--;
       renderQueue();
       processQueue();
    }
  };
}

// ==========================================================================
// 6. AÇÕES AUXILIARES (ABRIR PASTA / NOVO DOWNLOAD) (ABRIR PASTA / NOVO DOWNLOAD)
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


DOM.clearBtn.addEventListener('click', clearScreen);

function clearScreen() {
  
  DOM.previewCard.classList.add('hidden');
  DOM.playlistPreviewCard.classList.add('hidden');
  
  DOM.urlInput.value = '';
  DOM.urlInput.focus();
  state.currentVideo = null;
  
  state.isPlaylistMode = false;
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
  
  // Heartbeat mechanism to keep server alive ONLY while tab is open
  function connectHeartbeat() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${location.host}/ws/heartbeat`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      // Send a ping every 30 seconds to keep connection alive at proxy level if any
      setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping');
        }
      }, 30000);
    };
    
    ws.onclose = () => {
      // Tenta reconectar se a aba ainda estiver aberta e o server caiu ou restartou
      setTimeout(connectHeartbeat, 2000);
    };
  }
  
  connectHeartbeat();
});
