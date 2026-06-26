const fs = require('fs');
const path = require('path');
const express = require('express');
const { pipeline } = require('stream');
const { Throttle } = require('stream-throttle');

const app = express();
const FIXTURES_DIR = path.join(__dirname, 'files');
const TEST_FILE = path.join(FIXTURES_DIR, 'test-50kb.bin');

if (!fs.existsSync(FIXTURES_DIR)) fs.mkdirSync(FIXTURES_DIR, { recursive: true });
if (!fs.existsSync(TEST_FILE)) {
  const buf = Buffer.alloc(50 * 1024);
  for (let i = 0; i < buf.length; i++) buf[i] = i % 256;
  fs.writeFileSync(TEST_FILE, buf);
}

app.get('/download/:filename', (req, res, next) => {
  const filePath = path.join(FIXTURES_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Not found');
  }
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const rangeHeader = req.headers.range;

  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', 'application/octet-stream');

  if (rangeHeader) {
    const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
    if (!match) {
      res.setHeader('Content-Range', `bytes */${fileSize}`);
      return res.status(416).send('Range Not Satisfiable');
    }
    const [, startStr, endStr] = match;
    let start = startStr === '' ? null : parseInt(startStr, 10);
    let end = endStr === '' ? null : parseInt(endStr, 10);

    if (startStr === '' && endStr !== '') {
      start = Math.max(0, fileSize - end);
      end = fileSize - 1;
    } else if (startStr !== '' && endStr === '') {
      end = fileSize - 1;
    }

    if (isNaN(start) || isNaN(end) || start > end || start >= fileSize || end < 0) {
      res.setHeader('Content-Range', `bytes */${fileSize}`);
      return res.status(416).send('Range Not Satisfiable');
    }

    start = Math.max(0, start);
    end = Math.min(fileSize - 1, end);

    res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    res.setHeader('Content-Length', end - start + 1);
    res.status(206);
  } else {
    res.setHeader('Content-Length', fileSize);
    res.status(200);
  }

  const fileStream = fs.createReadStream(filePath, {
    start: rangeHeader ? parseInt(rangeHeader.match(/^bytes=(\d*)/)[1] || '0', 10) : 0,
    end: rangeHeader ? parseInt((rangeHeader.match(/^bytes=\d*-(\d*)$/) || [])[1] || String(fileSize - 1), 10) : fileSize - 1,
    highWaterMark: 64 * 1024,
  });

  const throttle = new Throttle({ rate: 50 * 1024 });
  pipeline(fileStream, throttle, res, (err) => {
    if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
      console.error('Pipeline error:', err.message);
    }
  });
});

const server = app.listen(3001, () => {
  const http = require('http');
  const tests = [
    { desc: 'Full download', headers: {} },
    { desc: 'Range 0-99', headers: { Range: 'bytes=0-99' } },
    { desc: 'Range 100-', headers: { Range: 'bytes=100-' } },
  ];

  let idx = 0;
  function runNext() {
    if (idx >= tests.length) { server.close(); return; }
    const t = tests[idx++];
    const opts = { hostname: 'localhost', port: 3001, path: '/download/test-50kb.bin', headers: t.headers };
    http.get(opts, (res) => {
      console.log(`${t.desc}: status=${res.statusCode}, content-length=${res.headers['content-length']}, content-range=${res.headers['content-range'] || 'N/A'}`);
      let size = 0;
      let data = [];
      res.on('data', (c) => { size += c.length; data.push(c); });
      res.on('end', () => {
        const buf = Buffer.concat(data);
        console.log(`  Received ${size} bytes, first byte=${buf[0]}, last byte=${buf[buf.length - 1]}`);
        runNext();
      });
    });
  }
  runNext();
});
