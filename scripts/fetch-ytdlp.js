const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ARCH = process.arch; // arm64 or x64
const PLATFORM = process.platform;

const YT_DLP_VERSION = 'latest';
const BASE_URL = 'https://github.com/yt-dlp/yt-dlp/releases/download';

function getDownloadUrl() {
  if (PLATFORM === 'darwin') {
    return `${BASE_URL}/${YT_DLP_VERSION}/yt-dlp_macos`;
  }
  return `${BASE_URL}/${YT_DLP_VERSION}/yt-dlp`;
}

const destDir = path.join(__dirname, '..', 'src', 'resources');
const destPath = path.join(destDir, 'yt-dlp');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

console.log(`Downloading yt-dlp for ${PLATFORM}-${ARCH}...`);

const url = getDownloadUrl();
const file = fs.createWriteStream(destPath);

https.get(url, (response) => {
  if (response.statusCode === 302 || response.statusCode === 301) {
    const redirectUrl = response.headers.location;
    console.log(`Redirecting to ${redirectUrl}`);
    https.get(redirectUrl, (res) => {
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        fs.chmodSync(destPath, 0o755);
        console.log('yt-dlp downloaded successfully!');
        const version = execSync(`${destPath} --version`).toString().trim();
        console.log(`yt-dlp version: ${version}`);
      });
    });
    return;
  }

  response.pipe(file);
  file.on('finish', () => {
    file.close();
    fs.chmodSync(destPath, 0o755);
    console.log('yt-dlp downloaded successfully!');
    try {
      const version = execSync(`${destPath} --version`).toString().trim();
      console.log(`yt-dlp version: ${version}`);
    } catch (e) {
      console.log('Could not verify version');
    }
  });
}).on('error', (err) => {
  fs.unlinkSync(destPath);
  console.error('Download failed:', err.message);
  process.exit(1);
});
