import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const rootArg = process.argv[2] || '.';
const port = Number(process.argv[3] || 4173);
const root = path.resolve(process.cwd(), rootArg);

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

if (!fs.existsSync(root)) {
  console.error(`Cartella non trovata: ${root}`);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  try {
    const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    let pathname = decodeURIComponent(requestUrl.pathname);
    if (pathname === '/') pathname = '/index.html';
    const requested = path.resolve(root, `.${pathname}`);
    if (!requested.startsWith(root)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    let filePath = requested;
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html');
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('File non trovato');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': mime[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }).end(String(error));
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Stories in sWadya aperto su http://localhost:${port}`);
  console.log('Premi Ctrl+C per chiudere.');
});
