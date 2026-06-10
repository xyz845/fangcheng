// 掌上方城 · 本地服务器
// 使用方法：在终端运行 node server.js
// 然后浏览器打开 http://localhost:3000

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  filePath = path.join(__dirname, filePath);

  try {
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain; charset=utf-8' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('404 Not Found');
  }
}).listen(PORT, () => {
  console.log('========================================');
  console.log('  掌上方城 服务器已启动');
  console.log('  浏览器打开 → http://localhost:' + PORT);
  console.log('  按 Ctrl+C 停止');
  console.log('========================================');
});
