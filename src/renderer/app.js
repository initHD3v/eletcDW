// ============================================================
// app.js — Logika Antarmuka Pengguna (Renderer Process)
// ============================================================
// File ini mengatur seluruh interaksi pengguna di jendela ElectDW.
// Menggunakan pola class-based dengan state management sederhana
// untuk mengelola data dan tampilan secara terpusat.
// ============================================================

// Pintasan untuk memilih elemen DOM
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ============================================================
// ElectDW — Kelas Utama Aplikasi
// ============================================================
class ElectDW {
  constructor() {
    // State aplikasi — menyimpan semua data yang diperlukan
    this.state = {
      currentUrl: '',           // URL yang sedang diproses
      platform: null,           // Platform terdeteksi (youtube, tiktok, dll)
      videoData: null,          // Metadata video dari yt-dlp
      selectedFormat: null,     // Format/resolusi yang dipilih
      downloadPath: '~/Downloads/ElectDW',  // Folder tujuan download
      downloadId: null,          // ID download aktif
      history: [],              // Riwayat download
      settings: {               // Pengaturan aplikasi
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

  // ----------------------------------------------------------
  // init — Inisialisasi awal aplikasi
  // ----------------------------------------------------------
  async init() {
    this.cacheDom();         // Simpan referensi elemen DOM
    this.bindEvents();       // Daftarkan event listener
    await this.loadSettings(); // Muat pengaturan tersimpan
    await this.loadHistory();  // Muat riwayat download
  }

  // ----------------------------------------------------------
  // cacheDom — Menyimpan referensi semua elemen DOM
  // ----------------------------------------------------------
  // Mempermudah akses ke elemen tanpa querySelector berulang.
  // ----------------------------------------------------------
  cacheDom() {
    // --- Bagian Input URL ---
    this.pasteInput = $('#pasteInput');
    this.pasteWrapper = $('#pasteWrapper');
    this.pasteIcon = $('#pasteIcon');
    this.clearBtn = $('#clearBtn');
    this.pasteBtn = $('#pasteBtn');
    this.clipboardHint = $('#clipboardHint');
    this.errorMsg = $('#errorMsg');
    this.pasteSection = $('#pasteSection');

    // --- Bagian Info Video ---
    this.videoSection = $('#videoSection');
    this.videoCard = $('#videoCard');
    this.loadingSkeleton = $('#loadingSkeleton');
    this.videoThumbnail = $('#videoThumbnail');
    this.videoTitle = $('#videoTitle');
    this.platformBadge = $('#platformBadge');
    this.videoDuration = $('#videoDuration');
    this.videoUploader = $('#videoUploader');
    this.resolutionPills = $('#resolutionPills');
    this.resolutionInfo = $('#resolutionInfo');
    this.downloadBtn = $('#downloadBtn');
    this.folderPath = $('#folderPath');

    // --- Bagian Progres Download ---
    this.progressSection = $('#progressSection');
    this.progressStatus = $('#progressStatus');
    this.progressPercent = $('#progressPercent');
    this.progressFill = $('#progressFill');
    this.progressSpeed = $('#progressSpeed');
    this.progressETA = $('#progressETA');
    this.cancelBtn = $('#cancelBtn');
    this.openFolderBtn = $('#openFolderBtn');

    // --- Notifikasi ---
    this.notification = $('#notification');

    // --- Tombol Navigasi ---
    this.settingsBtn = $('#settingsBtn');
    this.historyBtn = $('#historyBtn');
    this.footerGithub = $('#footerGithub');

    // --- Modal Riwayat ---
    this.historyModal = $('#historyModal');
    this.historyModalClose = $('#historyModalClose');
    this.historyModalCloseBtn = $('#historyModalCloseBtn');
    this.historyModalClear = $('#historyModalClear');
    this.historyModalList = $('#historyModalList');
    this.historyModalEmpty = $('#historyModalEmpty');
    this.historyCount = $('#historyCount');

    // --- Modal Pengaturan ---
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

  // ----------------------------------------------------------
  // bindEvents — Mendaftarkan semua event listener
  // ----------------------------------------------------------
  bindEvents() {
    // --- Input URL ---
    this.pasteInput.addEventListener('input', () => this.onInputChange());
    this.pasteInput.addEventListener('paste', () => setTimeout(() => this.onInputChange(), 10));
    this.pasteInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        // Validasi format URL terlebih dahulu sebelum diproses
        if (this.validateUrlFormat(this.pasteInput.value.trim())) {
          this.onInputChange();
        }
      }
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

    // --- Modal Riwayat ---
    this.historyBtn.addEventListener('click', () => this.openHistoryModal());
    this.historyModalClose.addEventListener('click', () => this.closeHistoryModal());
    this.historyModalCloseBtn.addEventListener('click', () => this.closeHistoryModal());
    this.historyModal.addEventListener('click', (e) => {
      if (e.target === this.historyModal) this.closeHistoryModal();
    });
    this.historyModalClear.addEventListener('click', () => this.clearHistoryFromModal());

    // --- Modal Pengaturan ---
    this.settingsBtn.addEventListener('click', () => this.openSettings());
    this.settingsClose.addEventListener('click', () => this.closeSettings());
    this.settingsCancel.addEventListener('click', () => this.closeSettings());
    this.settingsSave.addEventListener('click', () => this.saveSettings());
    this.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.settingsModal) this.closeSettings();
    });
    this.settingsFolderBtn.addEventListener('click', () => this.pickSettingsFolder());

    // --- Tombol Escape untuk menutup modal ---
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!this.historyModal.classList.contains('hidden')) this.closeHistoryModal();
        else if (!this.settingsModal.classList.contains('hidden')) this.closeSettings();
      }
    });

    // --- Pemilih Tema ---
    this.settingsTheme.addEventListener('click', (e) => {
      const btn = e.target.closest('.theme-option');
      if (!btn) return;
      $$('.theme-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });

    // --- Link Eksternal ---
    this.aboutGithub.addEventListener('click', (e) => { e.preventDefault(); this.openGithub(); });
    this.aboutReport.addEventListener('click', (e) => { e.preventDefault(); this.openGithub(); });
    this.footerGithub.addEventListener('click', (e) => { e.preventDefault(); this.openGithub(); });

    // --- Pintasan Keyboard: Cmd+D untuk download ---
    document.addEventListener('keydown', (e) => {
      if (e.metaKey && e.key === 'd' && this.state.videoData) {
        e.preventDefault();
        this.startDownload();
      }
    });

    // --- Listener Event dari Proses Utama (IPC) ---
    window.electronAPI.onDownloadProgress((data) => this.onProgress(data));
    window.electronAPI.onDownloadComplete((data) => this.onDownloadComplete(data));
    window.electronAPI.onDownloadError((data) => this.onDownloadError(data));
  }

  // ----------------------------------------------------------
  // validateUrlFormat — Validasi format URL
  // ----------------------------------------------------------
  // Memeriksa apakah URL memiliki format yang benar sebelum
  // dikirim ke proses utama untuk deteksi platform.
  // ----------------------------------------------------------
  validateUrlFormat(url) {
    if (!url || url.length < 10) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // ----------------------------------------------------------
  // onInputChange — Menangani perubahan input URL
  // ----------------------------------------------------------
  // Dipicu setiap kali pengguna mengetik atau menempel URL.
  // Melakukan validasi format, deteksi platform, dan mengambil
  // informasi video jika URL valid.
  // ----------------------------------------------------------
  async onInputChange() {
    const url = this.pasteInput.value.trim();
    this.errorMsg.classList.add('hidden');
    this.pasteWrapper.classList.remove('error');

    if (!url) {
      this.clearInput();
      return;
    }

    this.setState({ currentUrl: url });

    this.pasteWrapper.classList.add('has-content');
    this.clearBtn.classList.remove('hidden');

    // Validasi format URL dasar sebelum lanjut
    if (!this.validateUrlFormat(url)) {
      this.pasteWrapper.classList.add('error');
      this.pasteIcon.innerHTML = '<svg width="18" height="18" style="color:var(--status-error)"><use href="#icon-x"/></svg>';
      this.showError('Format URL tidak valid. Gunakan link yang dimulai dengan http:// atau https://');
      this.videoSection.classList.add('hidden');
      this.progressSection.classList.add('hidden');
      return;
    }

    // Kirim ke proses utama untuk deteksi platform
    const result = await window.electronAPI.detectLink(url);

    if (!result.valid) {
      this.pasteWrapper.classList.add('error');
      this.pasteIcon.innerHTML = '<svg width="18" height="18" style="color:var(--status-error)"><use href="#icon-x"/></svg>';
      this.showError('Link tidak didukung. Tempel URL video dari YouTube, Facebook, Instagram, X, TikTok, dll.');
      this.videoSection.classList.add('hidden');
      this.progressSection.classList.add('hidden');
      return;
    }

    // URL valid — tampilkan inisial platform
    this.pasteWrapper.classList.remove('error');
    this.setState({ platform: result.platform });
    const initial = this.getPlatformInitial(result.platform);
    this.pasteIcon.innerHTML = `<span style="font-size:13px;font-weight:700">${initial}</span>`;
    this.pasteIcon.classList.add('detected');

    // Ambil informasi video (judul, thumbnail, format)
    await this.fetchVideoInfo(url);
  }

  // ----------------------------------------------------------
  // clearInput — Membersihkan input URL dan mereset tampilan
  // ----------------------------------------------------------
  clearInput() {
    this.pasteInput.value = '';
    this.pasteWrapper.classList.remove('has-content', 'error');
    this.pasteIcon.innerHTML = '<svg width="18" height="18"><use href="#icon-link"/></svg>';
    this.pasteIcon.classList.remove('detected');
    this.clearBtn.classList.add('hidden');
    this.errorMsg.classList.add('hidden');
    this.videoSection.classList.add('hidden');
    this.progressSection.classList.add('hidden');
    this.setState({ currentUrl: '', platform: null, videoData: null });
    this.pasteInput.focus();
  }

  // ----------------------------------------------------------
  // pasteFromClipboard — Menempel URL dari clipboard
  // ----------------------------------------------------------
  async pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        this.pasteInput.value = text;
        this.onInputChange();
      }
    } catch {
      this.showNotification('Tidak dapat mengakses clipboard', 'error');
    }
  }

  // ----------------------------------------------------------
  // fetchVideoInfo — Mengambil metadata video dari yt-dlp
  // ----------------------------------------------------------
  // Menampilkan skeleton loading selama proses pengambilan data,
  // lalu merender informasi video setelah data diterima.
  // ----------------------------------------------------------
  async fetchVideoInfo(url) {
    this.videoCard.classList.add('hidden');
    this.videoSection.classList.remove('hidden');
    this.loadingSkeleton.classList.remove('hidden');
    this.downloadBtn.disabled = true;

    try {
      const data = await window.electronAPI.fetchFormats(url);
      this.setState({ videoData: data });
      this.renderVideoInfo(data);
      this.loadingSkeleton.classList.add('hidden');
      this.videoCard.classList.remove('hidden');
      this.downloadBtn.disabled = false;
      this.downloadBtn.innerHTML = '<svg width="16" height="16" style="vertical-align:-2px;margin-right:6px"><use href="#icon-download"/></svg> Download';
      this.downloadBtn.classList.remove('downloading', 'completed');
    } catch (err) {
      this.loadingSkeleton.classList.add('hidden');
      this.videoCard.classList.add('hidden');
      this.videoSection.classList.add('hidden');
      this.showError(`Gagal mengambil info video: ${err.message}`);
      this.downloadBtn.disabled = false;
      this.downloadBtn.innerHTML = '<svg width="16" height="16" style="vertical-align:-2px;margin-right:6px"><use href="#icon-download"/></svg> Coba Lagi';
    }
  }

  // ----------------------------------------------------------
  // renderVideoInfo — Menampilkan informasi video di kartu
  // ----------------------------------------------------------
  renderVideoInfo(data) {
    this.videoTitle.textContent = data.title;
    this.videoThumbnail.src = data.thumbnail || '';
    this.videoThumbnail.alt = data.title;

    this.platformBadge.className = `platform-badge ${this.state.platform}`;
    this.platformBadge.textContent = this.capitalize(this.state.platform);

    // Format durasi (detik → menit:detik)
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

  // ----------------------------------------------------------
  // renderResolutions — Menampilkan pilihan resolusi
  // ----------------------------------------------------------
  // Membuat tombol-tombol resolusi (pill-style). Resolusi
  // tertinggi otomatis terpilih dan ditandai sebagai "best".
  // ----------------------------------------------------------
  renderResolutions(formats) {
    this.resolutionPills.innerHTML = '';

    // Urutkan dari resolusi tertinggi ke terendah
    const sorted = [...formats].sort((a, b) => {
      const aRes = parseInt(a.resolution) || 0;
      const bRes = parseInt(b.resolution) || 0;
      return bRes - aRes;
    });

    if (sorted.length === 0) {
      this.resolutionPills.innerHTML = '<div class="resolution-info">Tidak ada format tersedia</div>';
      return;
    }

    // Tampilkan maksimal 8 resolusi, sisanya bisa dilihat via "▼ More"
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

    // Tombol untuk melihat semua resolusi
    if (sorted.length > 8) {
      const more = document.createElement('button');
      more.className = 'resolution-pill';
      more.textContent = '▼ More';
      more.addEventListener('click', () => this.showAllResolutions(sorted));
      this.resolutionPills.appendChild(more);
    }
  }

  // ----------------------------------------------------------
  // selectFormat — Memilih format/resolusi tertentu
  // ----------------------------------------------------------
  selectFormat(format) {
    this.state.selectedFormat = format;
    const sizeLabel = format.filesize ? this.formatSize(format.filesize) : 'Unknown size';
    const resLabel = format.resolution;
    this.resolutionInfo.textContent = `${resLabel} • ${(format.ext || 'mp4').toUpperCase()} • ${sizeLabel}`;
    this.downloadBtn.innerHTML = `<svg width="16" height="16" style="vertical-align:-2px;margin-right:6px"><use href="#icon-download"/></svg> Download ${resLabel} (${sizeLabel})`;
  }

  // ----------------------------------------------------------
  // showAllResolutions — Menampilkan semua resolusi yang tersedia
  // ----------------------------------------------------------
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

  // ----------------------------------------------------------
  // startDownload — Memulai proses download
  // ----------------------------------------------------------
  async startDownload() {
    if (!this.state.videoData || !this.state.selectedFormat) return;

    this.downloadBtn.disabled = true;
    this.downloadBtn.innerHTML = '<svg width="16" height="16" style="vertical-align:-2px;margin-right:6px"><use href="#icon-download"/></svg> Menyiapkan...';
    this.progressSection.classList.remove('hidden');
    this.progressStatus.textContent = 'Mengunduh...';
    this.progressPercent.textContent = '0%';
    this.progressFill.style.width = '0%';
    this.progressFill.className = 'progress-bar-fill';
    this.progressSpeed.textContent = '0 MB/s';
    this.progressETA.textContent = 'ETA: --:--';
    this.cancelBtn.classList.remove('hidden');
    this.openFolderBtn.classList.add('hidden');

    const resolution = this.state.selectedFormat.resolution;

    try {
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
    } catch (err) {
      this.onDownloadError(err);
    }
  }

  // ----------------------------------------------------------
  // onProgress — Memperbarui tampilan progres download
  // ----------------------------------------------------------
  onProgress(data) {
    this.downloadBtn.innerHTML = `<svg width="16" height="16" style="vertical-align:-2px;margin-right:6px"><use href="#icon-download"/></svg> ${data.percent}%`;
    this.progressPercent.textContent = `${data.percent}%`;
    this.progressFill.style.width = `${data.percent}%`;

    if (data.speed && data.speed > 0) {
      this.progressSpeed.textContent = `${this.formatSize(data.speed)}/s`;
    }
    if (data.eta && data.eta > 0) {
      const mins = Math.floor(data.eta / 60);
      const secs = Math.floor(data.eta % 60);
      this.progressETA.textContent = `Sisa: ${mins}:${secs.toString().padStart(2, '0')}`;
    } else if (data.eta === 0) {
      this.progressETA.textContent = 'Menyelesaikan...';
    }
  }

  // ----------------------------------------------------------
  // onDownloadComplete — Menangani selesainya download
  // ----------------------------------------------------------
  onDownloadComplete(data) {
    this.progressFill.classList.add('complete');
    this.progressFill.style.width = '100%';
    this.progressPercent.textContent = '100%';
    this.progressStatus.innerHTML = '<svg width="14" height="14" style="vertical-align:-2px;color:var(--status-success)"><use href="#icon-check"/></svg> Download Selesai!';
    this.progressSpeed.textContent = '';
    this.progressETA.textContent = '';

    this.cancelBtn.classList.add('hidden');
    this.openFolderBtn.classList.remove('hidden');

    this.downloadBtn.innerHTML = '<svg width="16" height="16" style="vertical-align:-2px;margin-right:6px"><use href="#icon-check"/></svg> Selesai';
    this.downloadBtn.classList.add('completed');
    this.downloadBtn.disabled = false;

    this.showNotification('Download selesai!', 'success');
    this.state.downloadId = null;
    this.loadHistory();
  }

  // ----------------------------------------------------------
  // onDownloadError — Menangani error download
  // ----------------------------------------------------------
  onDownloadError(data) {
    const errMsg = typeof data === 'string' ? data : (data.error || 'Kesalahan tidak diketahui');

    this.progressStatus.innerHTML = '<svg width="14" height="14" style="vertical-align:-2px;color:var(--status-error)"><use href="#icon-x"/></svg> Download Gagal';
    this.progressFill.classList.add('complete');
    this.progressFill.style.width = '0%';

    this.downloadBtn.innerHTML = '<svg width="16" height="16" style="vertical-align:-2px;margin-right:6px"><use href="#icon-download"/></svg> Coba Lagi';
    this.downloadBtn.disabled = false;
    this.cancelBtn.classList.add('hidden');

    this.showNotification(`Download gagal: ${errMsg}`, 'error');
    this.state.downloadId = null;
    this.loadHistory();
  }

  // ----------------------------------------------------------
  // cancelDownload — Membatalkan download yang sedang berjalan
  // ----------------------------------------------------------
  async cancelDownload() {
    if (this.state.downloadId) {
      await window.electronAPI.cancelDownload(this.state.downloadId);
      this.progressStatus.innerHTML = '<svg width="14" height="14" style="vertical-align:-2px;color:var(--text-muted)"><use href="#icon-x"/></svg> Dibatalkan';
      this.downloadBtn.innerHTML = '<svg width="16" height="16" style="vertical-align:-2px;margin-right:6px"><use href="#icon-download"/></svg> Download';
      this.downloadBtn.disabled = false;
      this.cancelBtn.classList.add('hidden');

      // Simpan ke riwayat sebagai dibatalkan
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

  // ----------------------------------------------------------
  // openDownloadFolder — Membuka folder hasil download
  // ----------------------------------------------------------
  async openDownloadFolder() {
    const path = this.state.downloadPath === '~/Downloads/ElectDW'
      ? null
      : this.state.downloadPath;
    if (path) {
      await window.electronAPI.openFolder(path);
    }
  }

  // ----------------------------------------------------------
  // pickFolder — Memilih folder download kustom
  // ----------------------------------------------------------
  async pickFolder() {
    const result = await window.electronAPI.selectFolder();
    if (result.folderPath) {
      this.state.downloadPath = result.folderPath;
      this.folderPath.textContent = result.folderPath;
    }
  }

  // ----------------------------------------------------------
  // loadSettings — Memuat pengaturan dari penyimpanan
  // ----------------------------------------------------------
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
      console.error('Gagal memuat pengaturan:', err);
    }
  }

  // ----------------------------------------------------------
  // loadHistory — Memuat riwayat download
  // ----------------------------------------------------------
  async loadHistory() {
    try {
      const history = await window.electronAPI.getHistory();
      this.state.history = history;
    } catch (err) {
      console.error('Gagal memuat riwayat:', err);
    }
  }

  // ----------------------------------------------------------
  // clearHistory — Menghapus semua riwayat download
  // ----------------------------------------------------------
  async clearHistory() {
    await window.electronAPI.clearHistory();
    this.state.history = [];
    this.renderHistoryModalList();
  }

  // ----------------------------------------------------------
  // openHistoryModal — Membuka modal riwayat download
  // ----------------------------------------------------------
  async openHistoryModal() {
    await this.loadHistory();
    this.renderHistoryModalList();
    this.historyModal.classList.remove('hidden');
  }

  closeHistoryModal() {
    this.historyModal.classList.add('hidden');
  }

  // ----------------------------------------------------------
  // clearHistoryFromModal — Menghapus riwayat dari modal
  // ----------------------------------------------------------
  async clearHistoryFromModal() {
    await window.electronAPI.clearHistory();
    this.state.history = [];
    this.renderHistoryModalList();
    this.showNotification('Riwayat dihapus', 'success');
  }

  // ----------------------------------------------------------
  // renderHistoryModalList — Merender daftar riwayat di modal
  // ----------------------------------------------------------
  renderHistoryModalList() {
    const list = this.historyModalList;
    const empty = this.historyModalEmpty;
    const count = this.historyCount;
    const items = this.state.history || [];

    list.innerHTML = '';
    count.textContent = `${items.length} download${items.length !== 1 ? 's' : ''}`;

    if (items.length === 0) {
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');

    items.forEach((item) => {
      const div = document.createElement('div');
      div.className = 'history-modal-item';

      // Ikon status berdasarkan status download
      const platform = item.platform || 'unknown';
      const statusIcon = item.status === 'completed'
        ? '<svg width="16" height="16" style="color:var(--status-success)" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4,10 8,14 16,6"/></svg>'
        : item.status === 'failed'
        ? '<svg width="16" height="16" style="color:var(--status-error)" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="5" x2="15" y2="15"/><line x1="15" y1="5" x2="5" y2="15"/></svg>'
        : '<svg width="16" height="16" style="color:var(--text-muted)" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="4" width="12" height="12" rx="2"/></svg>';

      const platformInitial = this.getPlatformInitial(platform);
      const date = new Date(item.timestamp);
      const dateStr = date.toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

      div.innerHTML = `
        <div class="history-modal-icon platform-${platform}">${platformInitial}</div>
        <div class="history-modal-info">
          <div class="history-modal-title">${this.escapeHtml(item.title || 'Unknown')}</div>
          <div class="history-modal-meta">
            <span>${this.capitalize(platform)}</span>
            <span>•</span>
            <span>${item.resolution || '—'}</span>
            <span>•</span>
            <span>${item.status}</span>
          </div>
        </div>
        <div class="history-modal-date">${dateStr}</div>
        <div class="history-modal-status">${statusIcon}</div>
      `;

      // Klik item untuk membuka folder download
      div.addEventListener('click', () => {
        if (item.filePath) {
          window.electronAPI.openFolder(item.filePath);
        }
      });

      list.appendChild(div);
    });
  }

  // ----------------------------------------------------------
  // getPlatformInitial — Mendapatkan inisial platform
  // ----------------------------------------------------------
  getPlatformInitial(platform) {
    const map = {
      youtube: 'YT', facebook: 'FB', instagram: 'IG', twitter: 'TW',
      tiktok: 'TK', vimeo: 'VM', dailymotion: 'DM', twitch: 'TW',
      linkedin: 'LI', reddit: 'RD', pinterest: 'PT'
    };
    return map[platform] || (platform ? platform.charAt(0).toUpperCase() : '?');
  }

  // ----------------------------------------------------------
  // showError — Menampilkan pesan error
  // ----------------------------------------------------------
  showError(msg) {
    this.errorMsg.textContent = msg;
    this.errorMsg.classList.remove('hidden');
    // Hapus efek error setelah 3 detik
    setTimeout(() => {
      this.pasteWrapper.classList.remove('error');
      this.pasteIcon.innerHTML = '<svg width="18" height="18"><use href="#icon-link"/></svg>';
      this.pasteIcon.classList.remove('detected');
    }, 3000);
  }

  // ----------------------------------------------------------
  // showNotification — Menampilkan notifikasi sementara
  // ----------------------------------------------------------
  showNotification(msg, type = 'info') {
    this.notification.textContent = msg;
    this.notification.className = `notification ${type}`;
    this.notification.classList.remove('hidden');
    setTimeout(() => this.notification.classList.add('hidden'), 4000);
  }

  // ----------------------------------------------------------
  // openSettings — Membuka modal pengaturan
  // ----------------------------------------------------------
  async openSettings() {
    const s = this.state.settings;
    this.settingsFolderPath.textContent = s.downloadPath || '~/Downloads/ElectDW';
    this.settingsAutoOpen.checked = s.autoOpenFolder;
    this.settingsDefaultRes.value = s.defaultResolution;
    this.settingsNotify.checked = s.notifyOnComplete;
    this.settingsProxy.value = s.proxyUrl || '';

    // Set tema aktif
    $$('.theme-option').forEach(b => {
      b.classList.toggle('active', b.dataset.theme === s.theme);
    });

    document.querySelectorAll('.theme-option');
    this.settingsTheme.querySelector(`[data-theme="${s.theme}"]`)?.classList.add('active');

    this.settingsModal.classList.remove('hidden');

    // Ambil versi yt-dlp untuk ditampilkan
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

  // ----------------------------------------------------------
  // saveSettings — Menyimpan perubahan pengaturan
  // ----------------------------------------------------------
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
      this.showNotification('Pengaturan disimpan', 'success');
    } catch (err) {
      this.showNotification('Gagal menyimpan pengaturan', 'error');
    }
  }

  // ----------------------------------------------------------
  // pickSettingsFolder — Memilih folder dari modal pengaturan
  // ----------------------------------------------------------
  async pickSettingsFolder() {
    const result = await window.electronAPI.selectFolder();
    if (result && result.folderPath) {
      this.state.settings.downloadPath = result.folderPath;
      this.settingsFolderPath.textContent = result.folderPath;
    }
  }

  // ----------------------------------------------------------
  // openGithub — Membuka repositori GitHub di browser
  // ----------------------------------------------------------
  openGithub() {
    window.electronAPI.openExternal('https://github.com/initHD3v/eletcDW');
  }

  // ----------------------------------------------------------
  // Utility Functions
  // ----------------------------------------------------------

  // Memperbarui state secara parsial
  setState(partial) {
    Object.assign(this.state, partial);
  }

  // Mengubah huruf pertama menjadi kapital
  capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  }

  // Memformat ukuran file (bytes → B/KB/MB/GB/TB)
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

  // Mengamankan string dari XSS (escape HTML entities)
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// ----------------------------------------------------------
// Inisialisasi aplikasi saat DOM siap
// ----------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  new ElectDW();
});
