// Local preview server: node serve.js, then open http://localhost:8080
// (GitHub Pages serves the same files in production.)
const http = require('http'), fs = require('fs'), path = require('path');
const PUBLIC = { '/': 'index.html', '/index.html': 'index.html', '/data.js': 'data.js' };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript' };

http.createServer((req, res) => {
  const file = PUBLIC[new URL(req.url, 'http://localhost').pathname];
  if (!file) return res.writeHead(404).end('Not found');
  fs.readFile(path.join(__dirname, file), (err, data) => {
    if (err) return res.writeHead(404).end('Not found');
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] + '; charset=utf-8' }).end(data);
  });
}).listen(8080, () => console.log('http://localhost:8080'));
