const { Transform } = require('stream');

class ThrottleStream extends Transform {
  constructor(bytesPerSecond) {
    super({ highWaterMark: bytesPerSecond });
    this.bytesPerSecond = bytesPerSecond;
    this.chunkSize = Math.max(Math.floor(bytesPerSecond / 20), 1024);
  }

  _transform(chunk, encoding, callback) {
    let offset = 0;

    const sendNext = () => {
      if (offset >= chunk.length) {
        callback();
        return;
      }

      const len = Math.min(this.chunkSize, chunk.length - offset);
      const piece = chunk.subarray(offset, offset + len);

      const canContinue = this.push(piece);
      offset += len;

      const delayMs = (len / this.bytesPerSecond) * 1000;

      if (!canContinue) {
        this.once('drain', () => {
          setTimeout(sendNext, delayMs);
        });
      } else {
        setTimeout(sendNext, delayMs);
      }
    };

    sendNext();
  }

  _flush(callback) {
    callback();
  }
}

module.exports = ThrottleStream;
