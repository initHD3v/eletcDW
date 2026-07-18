const Store = require('electron-store');

const schema = {
  settings: {
    type: 'object',
    properties: {
      downloadPath: { type: 'string', default: '' },
      autoOpenFolder: { type: 'boolean', default: true },
      defaultResolution: { type: 'string', default: 'best' },
      theme: { type: 'string', enum: ['dark', 'light'], default: 'dark' },
      concurrentDownloads: { type: 'number', default: 1 },
      notifyOnComplete: { type: 'boolean', default: true },
      proxyUrl: { type: 'string', default: '' },
      filenameTemplate: { type: 'string', default: '%(title)s.%(ext)s' }
    },
    default: {}
  },
  history: {
    type: 'array',
    default: [],
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        url: { type: 'string' },
        title: { type: 'string' },
        platform: { type: 'string' },
        resolution: { type: 'string' },
        filePath: { type: 'string' },
        fileSize: { type: 'number' },
        status: { type: 'string', enum: ['completed', 'failed', 'cancelled'] },
        timestamp: { type: 'string' }
      }
    }
  }
};

const store = new Store({ schema });

module.exports = store;
