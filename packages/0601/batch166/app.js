const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const express = require('express');
const { Throttle } = require('stream-throttle');

const DOWNLOAD_DIR = path.join(__dirname, 'files');
const DEFAULT_RATE = 200 * 1024;

function parseRange(rangeHeader, fileSize) {
  if (!rangeHeader) {
    return null;
  }

  const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) {
    return { invalid: true };
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
    return { invalid: true };
  }

  start = Math.max(0, start);
  end = Math.min(fileSize - 1, end);

  return { start, end };
}

function createDownloadRouter(bytesPerSecond = DEFAULT_RATE) {
  const router = express.Router();

  router.get('/:filename', (req, res, next) => {
    const filename = req.params.filename;
    const filePath = path.join(DOWNLOAD_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const rangeHeader = req.headers.range;
    const range = parseRange(rangeHeader, fileSize);

    if (range && range.invalid) {
      res.setHeader('Content-Range', `bytes */${fileSize}`);
      return res.status(416).send('Range Not Satisfiable');
    }

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    let streamStart = 0;
    let streamEnd = fileSize - 1;

    if (range && !range.invalid) {
      streamStart = range.start;
      streamEnd = range.end;
      res.setHeader('Content-Range', `bytes ${streamStart}-${streamEnd}/${fileSize}`);
      res.setHeader('Content-Length', streamEnd - streamStart + 1);
      res.status(206);
    } else {
      res.setHeader('Content-Length', fileSize);
      res.status(200);
    }

    const fileStream = fs.createReadStream(filePath, {
      start: streamStart,
      end: streamEnd,
      highWaterMark: 64 * 1024,
    });

    const throttle = new Throttle({ rate: bytesPerSecond });

    pipeline(fileStream, throttle, res, (err) => {
      if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
        console.error('Download pipeline error:', err.message);
      }
    });

    req.on('close', () => {
      fileStream.destroy();
      throttle.destroy();
    });
  });

  return router;
}

const app = express();

app.use('/download', createDownloadRouter(DEFAULT_RATE));

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`
    <h1>File Download Rate Limiter</h1>
    <p>Downloads under /download/* are rate-limited to ${DEFAULT_RATE / 1024}KB/s</p>
    <h2>Available Files</h2>
    <ul id="files"></ul>
    <script>
      fetch('/api/files')
        .then(r => r.json())
        .then(files => {
          const ul = document.getElementById('files');
          files.forEach(f => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = '/download/' + encodeURIComponent(f);
            a.textContent = f;
            li.appendChild(a);
            ul.appendChild(li);
          });
        });
    </script>
  `);
});

app.get('/api/files', (req, res) => {
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    return res.json([]);
  }
  const files = fs.readdirSync(DOWNLOAD_DIR).filter((f) => {
    return fs.statSync(path.join(DOWNLOAD_DIR, f)).isFile();
  });
  res.json(files);
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Download rate limit: ${DEFAULT_RATE / 1024}KB/s`);
  });
}

module.exports = { app, createDownloadRouter, parseRange, DEFAULT_RATE };
