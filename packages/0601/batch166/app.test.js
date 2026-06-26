const fs = require('fs');
const path = require('path');
const express = require('express');
const request = require('supertest');
const { createDownloadRouter, parseRange, DEFAULT_RATE } = require('./app');

const FIXTURES_DIR = path.join(__dirname, 'files');
const TEST_FILENAME = 'test-50kb.bin';
const TEST_FILE_SIZE = 50 * 1024;
const TEST_FILE_PATH = path.join(FIXTURES_DIR, TEST_FILENAME);

function buildApp(rate) {
  const app = express();
  app.use('/download', createDownloadRouter(rate));
  return app;
}

function ensureFixtureFile() {
  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  }
  if (!fs.existsSync(TEST_FILE_PATH) || fs.statSync(TEST_FILE_PATH).size !== TEST_FILE_SIZE) {
    const buf = Buffer.alloc(TEST_FILE_SIZE);
    for (let i = 0; i < TEST_FILE_SIZE; i++) {
      buf[i] = i % 256;
    }
    fs.writeFileSync(TEST_FILE_PATH, buf);
  }
}

function removeFixtureFile() {
  if (fs.existsSync(TEST_FILE_PATH)) {
    fs.unlinkSync(TEST_FILE_PATH);
  }
}

beforeAll(() => {
  ensureFixtureFile();
});

afterAll(() => {
  removeFixtureFile();
});

describe('parseRange', () => {
  const fileSize = 1000;

  test('returns null when no range header', () => {
    expect(parseRange(null, fileSize)).toBeNull();
  });

  test('parses start-end range', () => {
    expect(parseRange('bytes=100-199', fileSize)).toEqual({ start: 100, end: 199 });
  });

  test('parses open-ended range (start-)', () => {
    expect(parseRange('bytes=500-', fileSize)).toEqual({ start: 500, end: 999 });
  });

  test('parses suffix range (-500)', () => {
    expect(parseRange('bytes=-500', fileSize)).toEqual({ start: 500, end: 999 });
  });

  test('clamps end to file size for out-of-bounds range', () => {
    expect(parseRange('bytes=900-1200', fileSize)).toEqual({ start: 900, end: 999 });
  });

  test('returns invalid for malformed range', () => {
    expect(parseRange('bytes=abc-def', fileSize)).toEqual({ invalid: true });
  });

  test('returns invalid for inverted range', () => {
    expect(parseRange('bytes=500-100', fileSize)).toEqual({ invalid: true });
  });

  test('returns invalid when start equals fileSize', () => {
    expect(parseRange('bytes=1000-', fileSize)).toEqual({ invalid: true });
  });
});

describe('Rate-limited download', () => {
  const testRate = 20 * 1024;
  const app = buildApp(testRate);

  test('download speed respects rate limit', async () => {
    const start = process.hrtime.bigint();

    const res = await request(app)
      .get(`/download/${TEST_FILENAME}`)
      .responseType('arraybuffer');

    const end = process.hrtime.bigint();
    const elapsedMs = Number(end - start) / 1e6;
    const expectedMinMs = (TEST_FILE_SIZE / testRate) * 1000 * 0.7;

    expect(res.status).toBe(200);
    expect(Buffer.from(res.body).length).toBe(TEST_FILE_SIZE);
    expect(elapsedMs).toBeGreaterThanOrEqual(expectedMinMs);
  });

  test('full download returns 200 and correct Content-Length', async () => {
    const res = await request(app)
      .get(`/download/${TEST_FILENAME}`)
      .responseType('arraybuffer');
    expect(res.status).toBe(200);
    expect(res.headers['content-length']).toBe(String(TEST_FILE_SIZE));
    expect(res.headers['accept-ranges']).toBe('bytes');
  });
});

describe('Range request (partial content)', () => {
  const testRate = 50 * 1024;
  const app = buildApp(testRate);

  test('returns 206 and correct Content-Range for bytes=0-99', async () => {
    const res = await request(app)
      .get(`/download/${TEST_FILENAME}`)
      .set('Range', 'bytes=0-99')
      .responseType('arraybuffer');

    expect(res.status).toBe(206);
    expect(res.headers['content-range']).toBe(`bytes 0-99/${TEST_FILE_SIZE}`);
    expect(res.headers['content-length']).toBe('100');
    expect(Buffer.from(res.body).length).toBe(100);
  });

  test('returns correct data for middle range bytes=100-199', async () => {
    const res = await request(app)
      .get(`/download/${TEST_FILENAME}`)
      .set('Range', 'bytes=100-199')
      .responseType('arraybuffer');

    expect(res.status).toBe(206);
    expect(res.headers['content-range']).toBe(`bytes 100-199/${TEST_FILE_SIZE}`);
    const body = Buffer.from(res.body);
    expect(body.length).toBe(100);

    for (let i = 0; i < 100; i++) {
      expect(body[i]).toBe((100 + i) % 256);
    }
  });

  test('returns correct data for open-ended range bytes=200-', async () => {
    const res = await request(app)
      .get(`/download/${TEST_FILENAME}`)
      .set('Range', 'bytes=200-')
      .responseType('arraybuffer');

    expect(res.status).toBe(206);
    expect(res.headers['content-range']).toBe(`bytes 200-${TEST_FILE_SIZE - 1}/${TEST_FILE_SIZE}`);
    expect(res.headers['content-length']).toBe(String(TEST_FILE_SIZE - 200));
  });

  test('returns correct data for suffix range bytes=-500', async () => {
    const res = await request(app)
      .get(`/download/${TEST_FILENAME}`)
      .set('Range', 'bytes=-500')
      .responseType('arraybuffer');

    expect(res.status).toBe(206);
    expect(res.headers['content-range']).toBe(`bytes ${TEST_FILE_SIZE - 500}-${TEST_FILE_SIZE - 1}/${TEST_FILE_SIZE}`);
    expect(Buffer.from(res.body).length).toBe(500);
  });

  test('returns 416 for out-of-bounds range', async () => {
    const res = await request(app)
      .get(`/download/${TEST_FILENAME}`)
      .set('Range', 'bytes=999999-999999');

    expect(res.status).toBe(416);
    expect(res.headers['content-range']).toBe(`bytes */${TEST_FILE_SIZE}`);
  });
});

describe('Concurrent downloads', () => {
  const testRate = 20 * 1024;
  const app = buildApp(testRate);

  test('concurrent downloads complete independently', async () => {
    const start = process.hrtime.bigint();

    const [res1, res2] = await Promise.all([
      request(app).get(`/download/${TEST_FILENAME}`).responseType('arraybuffer'),
      request(app).get(`/download/${TEST_FILENAME}`).responseType('arraybuffer'),
    ]);

    const end = process.hrtime.bigint();
    const elapsedMs = Number(end - start) / 1e6;

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(Buffer.from(res1.body).length).toBe(TEST_FILE_SIZE);
    expect(Buffer.from(res2.body).length).toBe(TEST_FILE_SIZE);

    const singleFileMinMs = (TEST_FILE_SIZE / testRate) * 1000 * 0.7;
    expect(elapsedMs).toBeGreaterThanOrEqual(singleFileMinMs);
  });

  test('concurrent Range downloads return correct data independently', async () => {
    const [res1, res2] = await Promise.all([
      request(app).get(`/download/${TEST_FILENAME}`).set('Range', 'bytes=0-49').responseType('arraybuffer'),
      request(app).get(`/download/${TEST_FILENAME}`).set('Range', 'bytes=100-149').responseType('arraybuffer'),
    ]);

    expect(res1.status).toBe(206);
    expect(res2.status).toBe(206);

    const body1 = Buffer.from(res1.body);
    const body2 = Buffer.from(res2.body);
    expect(body1.length).toBe(50);
    expect(body2.length).toBe(50);

    for (let i = 0; i < 50; i++) {
      expect(body1[i]).toBe(i % 256);
      expect(body2[i]).toBe((100 + i) % 256);
    }
  });
});
