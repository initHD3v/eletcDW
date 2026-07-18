const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

class ElectDW {
  constructor() {
    this.state = {
      currentUrl: '',
      platform: null,
      videoData: null,
      selectedFormat: null,
      downloadPath: '~/Downloads/ElectDW',
      downloadId: null,
      history: [],
      settings: {
        downloadPath: '',
        autoOpenFolder: true,
        defaultResolution: 'best',
        theme: 'dark',
        concurrentDownloads: 1,
        notifyOnComplete: true,
        proxyUrl: '',
        filenameTemplate: '%(title)s.%(ext)s'
      }
    };

    this.cache = {};
    this.init();
  }

  async init() {
    this.cacheDom();
    this.bindEvents();
    await this.loadSettings();
    await this.loadHistory();
  }

  cacheDom() {
    this.pasteInput = $('#pasteInput');
    this.pasteWrapper = $('#pasteWrapper');
    this.pasteIcon = $('#pasteIcon');
    this.clearBtn = $('#clearBtn');
    this.pasteBtn = $('#pasteBtn');
    this.clipboardHint = $('#clipboardHint');
    this.errorMsg = $('#errorMsg');
    this.pasteSection = $('#pasteSection');

    this.videoSection = $('#videoSection');
    this.videoThumbnail = $('#videoThumbnail');
    this.videoTitle = $('#videoTitle');
    this.platformBadge = $('#platformBadge');
    this.videoDuration = $('#videoDuration');
    this.videoUploader = $('#videoUploader');
    this.resolutionPills = $('#resolutionPills');
    this.resolutionInfo = $('#resolutionInfo');
    this.downloadBtn = $('#downloadBtn');
    this.folderPath = $('#folderPath');

    this.progressSection = $('#progressSection');
    this.progressStatus = $('#progressStatus');
    this.progressPercent = $('#progressPercent');
    this.progressFill = $('#progressFill');
    this.progressSpeed = $('#progressSpeed');
    this.progressETA = $('#progressETA');
    this.cancelBtn = $('#cancelBtn');
    this.openFolderBtn = $('#openFolderBtn');

    this.historyList = $('#historyList');
    this.clearHistoryBtn = $('#clearHistoryBtn');
    this.historySection = $('#historySection');

    this.notification = $('#notification');

    this.settingsBtn = $('#settingsBtn');
    this.githubBtn = $('#githubBtn');
    this.footerGithub = $('#footerGithub');

    this.settingsModal = $('#settingsModal');
    this.settingsClose = $('#settingsClose');
    this.settingsCancel = $('#settingsCancel');
    this.settingsSave = $('#settingsSave');
    this.settingsFolderPath = $('#settingsFolderPath');
    this.settingsFolderBtn = $('#settingsFolderBtn');
    this.settingsAutoOpen = $('#settingsAutoOpen');
    this.settingsDefaultRes = $('#settingsDefaultRes');
    this.settingsNotify = $('#settingsNotify');
    this.settingsTheme = $('#settingsTheme');
    this.settingsProxy = $('#settingsProxy');
    this.aboutVersion = $('#aboutVersion');
    this.aboutYtdlp = $('#aboutYtdlp');
    this.aboutGithub = $('#aboutGithub');
    this.aboutReport = $('#aboutReport');
  }

  bindEvents() {
    this.pasteInput.addEventListener('input', () => this.onInputChange());
    this.pasteInput.addEventListener('paste', () => setTimeout(() => this.onInputChange(), 10));
    this.pasteInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.onInputChange();
      if (e.key === 'Escape') this.clearInput();
      if (e.metaKey && e.key === 'v') setTimeout(() => this.onInputChange(), 50);
    });

    this.clearBtn.addEventListener('click', () => this.clearInput());
    this.pasteBtn.addEventListener('click', () => this.pasteFromClipboard());
    this.clipboardHint.addEventListener('click', () => this.pasteFromClipboard());
    this.downloadBtn.addEventListener('click', () => this.startDownload());
    this.cancelBtn.addEventListener('click', () => this.cancelDownload());
    this.openFolderBtn.addEventListener('click', () => this.openDownloadFolder());
    this.folderPath.addEventListener('click', () => this.pickFolder());
    this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());

    this.settingsBtn.addEventListener('click', () => this.openSettings());
    this.settingsClose.addEventListener('click', () => this.closeSettings());
    this.settingsCancel.addEventListener('click', () => this.closeSettings());
    this.settingsSave.addEventListener('click', () => this.saveSettings());
    this.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.settingsModal) this.closeSettings();
    });
    this.settingsFolderBtn.addEventListener('click', () => this.pickSettingsFolder());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.settingsModal.classList.contains('hidden')) {
        this.closeSettings();
      }
    });

    this.settingsTheme.addEventListener('click', (e) => {
      const btn = e.target.closest('.theme-option');
      if (!btn) return;
      $$('.theme-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });

    this.aboutGithub.addEventListener('click', (e) => { e.preventDefault(); this.openGithub(); });
    this.aboutReport.addEventListener('click', (e) => { e.preventDefault(); this.openGithub(); });

    this.githubBtn.addEventListener('click', () => this.openGithub());
    this.footerGithub.addEventListener('click', (e) => { e.preventDefault(); this.openGithub(); });

    document.addEventListener('keydown', (e) => {
      if (e.metaKey && e.key === 'd' && this.state.videoData) {
        e.preventDefault();
        this.startDownload();
      }
    });

    window.electronAPI.onDownloadProgress((data) => this.onProgress(data));
    window.electronAPI.onDownloadComplete((data) => this.onDownloadComplete(data));
    window.electronAPI.onDownloadError((data) => this.onDownloadError(data));
  }

  async onInputChange() {
    const url = this.pasteInput.value.trim();
    this.errorMsg.classList.add('hidden');

    if (!url) {
      this.clearInput();
      return;
    }

    this.setState({ currentUrl: url });

    this.pasteWrapper.classList.add('has-content');
    this.clearBtn.classList.remove('hidden');

    const result = await window.electronAPI.detectLink(url);

    if (!result.valid) {
      this.pasteWrapper.classList.add('error');
      this.pasteIcon.textContent = '❌';
      this.showError('Link not supported. Please paste a video URL from YouTube, Facebook, Instagram, X, TikTok, etc.');
      this.videoSection.classList.add('hidden');
      this.progressSection.classList.add('hidden');
      return;
    }

    this.pasteWrapper.classList.remove('error');
    this.setState({ platform: result.platform });
    this.pasteIcon.textContent = this.getPlatformEmoji(result.platform);
    this.pasteIcon.classList.add('detected');

    await this.fetchVideoInfo(url);
  }

  clearInput() {
    this.pasteInput.value = '';
    this.pasteWrapper.classList.remove('has-content', 'error');
    this.pasteIcon.textContent = '🔗';
    this.pasteIcon.classList.remove('detected');
    this.clearBtn.classList.add('hidden');
    this.errorMsg.classList.add('hidden');
    this.videoSection.classList.add('hidden');
    this.progressSection.classList.add('hidden');
    this.setState({ currentUrl: '', platform: null, videoData: null });
    this.pasteInput.focus();
  }

  async pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        this.pasteInput.value = text;
        this.onInputChange();
      }
    } catch {
      this.showNotification('Unable to access clipboard', 'error');
    }
  }

  async fetchVideoInfo(url) {
    this.videoSection.classList.add('hidden');
    this.downloadBtn.disabled = true;
    this.downloadBtn.textContent = '⏳ Fetching...';

    try {
      const data = await window.electronAPI.fetchFormats(url);
      this.setState({ videoData: data });
      this.renderVideoInfo(data);
      this.videoSection.classList.remove('hidden');
      this.downloadBtn.disabled = false;
      this.downloadBtn.textContent = '⬇ Download';
      this.downloadBtn.classList.remove('downloading', 'completed');
    } catch (err) {
      this.showError(`Failed to fetch video info: ${err.message}`);
      this.downloadBtn.disabled = false;
      this.downloadBtn.textContent = '⬇ Retry';
    }
  }

  renderVideoInfo(data) {
    this.videoTitle.textContent = data.title;
    this.videoThumbnail.src = data.thumbnail || '';
    this.videoThumbnail.alt = data.title;

    this.platformBadge.className = `platform-badge ${this.state.platform}`;
    this.platformBadge.textContent = `${this.getPlatformEmoji(this.state.platform)} ${this.capitalize(this.state.platform)}`;

    if (data.duration) {
      const mins = Math.floor(data.duration / 60);
      const secs = data.duration % 60;
      this.videoDuration.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    } else {
      this.videoDuration.textContent = '';
    }

    this.videoUploader.textContent = data.uploader || '';

    this.renderResolutions(data.formats);
  }

  renderResolutions(formats) {
    this.resolutionPills.innerHTML = '';

    const sorted = [...formats].sort((a, b) => {
      const aRes = parseInt(a.resolution) || 0;
      const bRes = parseInt(b.resolution) || 0;
      return bRes - aRes;
    });

    if (sorted.length === 0) {
      this.resolutionPills.innerHTML = '<div class="resolution-info">No formats available</div>';
      return;
    }

    const displayFormats = sorted.slice(0, 8);

    displayFormats.forEach((f, i) => {
      const pill = document.createElement('button');
      pill.className = 'resolution-pill';
      if (i === 0) {
        pill.classList.add('best-quality', 'selected');
        this.selectFormat(f);
      }
      const sizeLabel = f.filesize ? this.formatSize(f.filesize) : '';
      const label = `${f.resolution}${sizeLabel ? ' • ' + sizeLabel : ''}`;
      pill.textContent = label;
      pill.dataset.resolution = f.resolution;
      pill.addEventListener('click', () => {
        $$('.resolution-pill').forEach(p => p.classList.remove('selected'));
        pill.classList.add('selected');
        this.selectFormat(f);
      });
      this.resolutionPills.appendChild(pill);
    });

    if (sorted.length > 8) {
      const more = document.createElement('button');
      more.className = 'resolution-pill';
      more.textContent = '▼ More';
      more.addEventListener('click', () => this.showAllResolutions(sorted));
      this.resolutionPills.appendChild(more);
    }
  }

  selectFormat(format) {
    this.state.selectedFormat = format;
    const sizeLabel = format.filesize ? this.formatSize(format.filesize) : 'Unknown size';
    const resLabel = format.resolution;
    this.resolutionInfo.textContent = `${resLabel} • ${(format.ext || 'mp4').toUpperCase()} • ${sizeLabel}`;
    this.downloadBtn.textContent = `⬇ Download ${resLabel} (${sizeLabel})`;
  }

  showAllResolutions(formats) {
    const container = this.resolutionPills;
    container.innerHTML = '';
    formats.forEach((f) => {
      const pill = document.createElement('button');
      pill.className = 'resolution-pill';
      const sizeLabel = f.filesize ? this.formatSize(f.filesize) : '';
      pill.textContent = `${f.resolution} ${sizeLabel}`;
      pill.dataset.resolution = f.resolution;
      pill.addEventListener('click', () => {
        $$('.resolution-pill').forEach(p => p.classList.remove('selected'));
        pill.classList.add('selected');
        this.selectFormat(f);
      });
      container.appendChild(pill);
    });
  }

  async startDownload() {
    if (!this.state.videoData || !this.state.selectedFormat) return;

    this.downloadBtn.disabled = true;
    this.downloadBtn.textContent = '⏳ Preparing...';
    this.progressSection.classList.remove('hidden');
    this.progressStatus.textContent = 'Downloading...';
    this.progressPercent.textContent = '0%';
    this.progressFill.style.width = '0%';
    this.progressFill.className = 'progress-bar-fill';
    this.progressSpeed.textContent = '0 MB/s';
    this.progressETA.textContent = 'ETA: --:--';
    this.cancelBtn.classList.remove('hidden');
    this.openFolderBtn.classList.add('hidden');

    const resolution = this.state.selectedFormat.resolution;

    const result = await window.electronAPI.startDownload({
      url: this.state.currentUrl,
      resolution,
      outputPath: this.state.downloadPath === '~/Downloads/ElectDW'
        ? null
        : this.state.downloadPath
    });

    if (result && result.downloadId) {
      this.state.downloadId = result.downloadId;
      this.cancelBtn.dataset.downloadId = result.downloadId;
    }
  }

  onProgress(data) {
    this.downloadBtn.textContent = `⬇ ${data.percent}%`;
    this.progressPercent.textContent = `${data.percent}%`;
    this.progressFill.style.width = `${data.percent}%`;

    if (data.speed && data.speed > 0) {
      this.progressSpeed.textContent = `${this.formatSize(data.speed)}/s`;
    }
    if (data.eta && data.eta > 0) {
      const mins = Math.floor(data.eta / 60);
      const secs = Math.floor(data.eta % 60);
      this.progressETA.textContent = `ETA: ${mins}:${secs.toString().padStart(2, '0')}`;
    } else if (data.eta === 0) {
      this.progressETA.textContent = 'Finalizing...';
    }
  }

  onDownloadComplete(data) {
    this.progressFill.classList.add('complete');
    this.progressFill.style.width = '100%';
    this.progressPercent.textContent = '100%';
    this.progressStatus.textContent = '✅ Download Complete!';
    this.progressSpeed.textContent = '';
    this.progressETA.textContent = '';

    this.cancelBtn.classList.add('hidden');
    this.openFolderBtn.classList.remove('hidden');

    this.downloadBtn.textContent = '✅ Downloaded';
    this.downloadBtn.classList.add('completed');
    this.downloadBtn.disabled = false;

    this.showNotification('Download completed!', 'success');
    this.state.downloadId = null;
    this.loadHistory();
  }

  onDownloadError(data) {
    const errMsg = typeof data === 'string' ? data : (data.error || 'Unknown error');

    this.progressStatus.textContent = '❌ Download Failed';
    this.progressFill.classList.add('complete');
    this.progressFill.style.width = '0%';

    this.downloadBtn.textContent = '🔄 Retry';
    this.downloadBtn.disabled = false;
    this.cancelBtn.classList.add('hidden');

    this.showNotification(`Download failed: ${errMsg}`, 'error');
    this.state.downloadId = null;
    this.loadHistory();
  }

  async cancelDownload() {
    if (this.state.downloadId) {
      await window.electronAPI.cancelDownload(this.state.downloadId);
      this.progressStatus.textContent = '⏹ Cancelled';
      this.downloadBtn.textContent = '⬇ Download';
      this.downloadBtn.disabled = false;
      this.cancelBtn.classList.add('hidden');

      const entry = {
        url: this.state.currentUrl,
        title: this.state.videoData?.title || 'Unknown',
        platform: this.state.platform,
        resolution: this.state.selectedFormat?.resolution || 'Unknown',
        filePath: '',
        status: 'cancelled'
      };

      window.electronAPI.addHistory(entry).then(() => this.loadHistory());
      this.state.downloadId = null;
    }
  }

  async openDownloadFolder() {
    const path = this.state.downloadPath === '~/Downloads/ElectDW'
      ? null
      : this.state.downloadPath;
    if (path) {
      await window.electronAPI.openFolder(path);
    }
  }

  async pickFolder() {
    const result = await window.electronAPI.selectFolder();
    if (result.folderPath) {
      this.state.downloadPath = result.folderPath;
      this.folderPath.textContent = result.folderPath;
    }
  }

  async loadSettings() {
    try {
      const settings = await window.electronAPI.getSettings();
      if (settings && Object.keys(settings).length > 0) {
        this.state.settings = { ...this.state.settings, ...settings };
        if (settings.downloadPath) {
          this.state.downloadPath = settings.downloadPath;
          this.folderPath.textContent = settings.downloadPath;
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }

  async loadHistory() {
    try {
      const history = await window.electronAPI.getHistory();
      this.state.history = history;
      this.renderHistory();
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  }

  renderHistory() {
    this.historyList.innerHTML = '';

    if (!this.state.history || this.state.history.length === 0) {
      this.historyList.innerHTML = '<div class="history-empty">No downloads yet. Paste a link to start!</div>';
      this.clearHistoryBtn.classList.add('hidden');
      return;
    }

    this.clearHistoryBtn.classList.remove('hidden');

    const recent = this.state.history.slice(0, 10);
    recent.forEach((item) => {
      const div = document.createElement('div');
      div.className = 'history-item';

      const statusEmoji = item.status === 'completed' ? '✅' : item.status === 'failed' ? '❌' : '⏹';
      const date = new Date(item.timestamp);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

      div.innerHTML = `
        <div class="history-item-info">
          <div class="history-item-title">${this.escapeHtml(item.title)}</div>
          <div class="history-item-meta">${this.getPlatformEmoji(item.platform)} ${this.capitalize(item.platform)} • ${item.resolution} • ${dateStr}</div>
        </div>
        <div class="history-item-status">${statusEmoji}</div>
      `;

      div.addEventListener('click', () => {
        if (item.filePath) {
          window.electronAPI.openFolder(item.filePath);
        }
      });

      this.historyList.appendChild(div);
    });
  }

  async clearHistory() {
    await window.electronAPI.clearHistory();
    this.state.history = [];
    this.renderHistory();
  }

  showError(msg) {
    this.errorMsg.textContent = msg;
    this.errorMsg.classList.remove('hidden');
    setTimeout(() => {
      this.pasteWrapper.classList.remove('error');
      this.pasteIcon.textContent = '🔗';
    }, 3000);
  }

  showNotification(msg, type = 'info') {
    this.notification.textContent = msg;
    this.notification.className = `notification ${type}`;
    this.notification.classList.remove('hidden');
    setTimeout(() => this.notification.classList.add('hidden'), 4000);
  }

  async openSettings() {
    const s = this.state.settings;
    this.settingsFolderPath.textContent = s.downloadPath || '~/Downloads/ElectDW';
    this.settingsAutoOpen.checked = s.autoOpenFolder;
    this.settingsDefaultRes.value = s.defaultResolution;
    this.settingsNotify.checked = s.notifyOnComplete;
    this.settingsProxy.value = s.proxyUrl || '';

    $$('.theme-option').forEach(b => {
      b.classList.toggle('active', b.dataset.theme === s.theme);
    });

    document.querySelectorAll('.theme-option');
    this.settingsTheme.querySelector(`[data-theme="${s.theme}"]`)?.classList.add('active');

    this.settingsModal.classList.remove('hidden');

    try {
      const ytver = await window.electronAPI.getYtdlpVersion();
      this.aboutYtdlp.textContent = ytver;
    } catch {
      this.aboutYtdlp.textContent = '—';
    }

    setTimeout(() => {
      this.settingsClose.focus();
    }, 100);
  }

  closeSettings() {
    this.settingsModal.classList.add('hidden');
  }

  async saveSettings() {
    const themeBtn = this.settingsTheme.querySelector('.theme-option.active');
    const newSettings = {
      downloadPath: this.state.settings.downloadPath,
      autoOpenFolder: this.settingsAutoOpen.checked,
      defaultResolution: this.settingsDefaultRes.value,
      theme: themeBtn ? themeBtn.dataset.theme : 'dark',
      notifyOnComplete: this.settingsNotify.checked,
      proxyUrl: this.settingsProxy.value.trim(),
      concurrentDownloads: 1,
      filenameTemplate: '%(title)s.%(ext)s'
    };

    this.state.settings = newSettings;
    this.state.downloadPath = newSettings.downloadPath || '~/Downloads/ElectDW';
    this.folderPath.textContent = this.state.downloadPath;

    try {
      await window.electronAPI.saveSettings(newSettings);
      this.closeSettings();
      this.showNotification('Settings saved', 'success');
    } catch (err) {
      this.showNotification('Failed to save settings', 'error');
    }
  }

  async pickSettingsFolder() {
    const result = await window.electronAPI.selectFolder();
    if (result && result.folderPath) {
      this.state.settings.downloadPath = result.folderPath;
      this.settingsFolderPath.textContent = result.folderPath;
    }
  }

  openGithub() {
    window.electronAPI.openExternal('https://github.com/initHD3v/eletcDW');
  }

  setState(partial) {
    Object.assign(this.state, partial);
  }

  getPlatformEmoji(platform) {
    const map = {
      youtube: '📺',
      facebook: '👍',
      instagram: '📸',
      twitter: '🐦',
      tiktok: '🎵',
      vimeo: '🎥',
      dailymotion: '▶️',
      twitch: '🎮',
      linkedin: '💼',
      reddit: '👽',
      pinterest: '📌'
    };
    return map[platform] || '🔗';
  }

  capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  }

  formatSize(bytes) {
    if (!bytes || bytes === 0) return 'Unknown';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) {
      size /= 1024;
      i++;
    }
    return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ElectDW();
});
