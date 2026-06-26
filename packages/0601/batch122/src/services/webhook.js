const https = require('https');
const http = require('http');

const WEBHOOK_URL = process.env.WEBHOOK_URL || '';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

async function sendWebhook(event, data) {
  if (!WEBHOOK_URL) {
    console.log('[Webhook] 未配置 WEBHOOK_URL，跳过通知:', event);
    return;
  }

  const payload = {
    event,
    timestamp: new Date().toISOString(),
    secret: WEBHOOK_SECRET,
    data
  };

  const url = new URL(WEBHOOK_URL);
  const isHttps = url.protocol === 'https:';
  const lib = isHttps ? https : http;

  const body = JSON.stringify(payload);

  const options = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'X-Webhook-Secret': WEBHOOK_SECRET
    }
  };

  return new Promise((resolve, reject) => {
    const req = lib.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`[Webhook] ${event} 通知成功:`, res.statusCode);
          resolve({ success: true, statusCode: res.statusCode });
        } else {
          console.error(`[Webhook] ${event} 通知失败:`, res.statusCode, responseBody);
          resolve({ success: false, statusCode: res.statusCode });
        }
      });
    });

    req.on('error', (error) => {
      console.error(`[Webhook] ${event} 通知异常:`, error.message);
      resolve({ success: false, error: error.message });
    });

    req.write(body);
    req.end();
  });
}

async function notifyExchangeRequested(exchangeRequest) {
  return sendWebhook('exchange.requested', {
    requestId: exchangeRequest._id,
    fromUser: {
      id: exchangeRequest.fromUser._id || exchangeRequest.fromUser,
      nickname: exchangeRequest.fromUser.nickname || ''
    },
    toUser: {
      id: exchangeRequest.toUser._id || exchangeRequest.toUser,
      nickname: exchangeRequest.toUser.nickname || ''
    },
    offeredItem: {
      id: exchangeRequest.offeredItem._id || exchangeRequest.offeredItem,
      title: exchangeRequest.offeredItem.title || ''
    },
    requestedItem: {
      id: exchangeRequest.requestedItem._id || exchangeRequest.requestedItem,
      title: exchangeRequest.requestedItem.title || ''
    },
    message: exchangeRequest.message || ''
  });
}

async function notifyExchangeAccepted(exchangeRequest) {
  return sendWebhook('exchange.accepted', {
    requestId: exchangeRequest._id,
    fromUser: {
      id: exchangeRequest.fromUser._id || exchangeRequest.fromUser,
      nickname: exchangeRequest.fromUser.nickname || ''
    },
    toUser: {
      id: exchangeRequest.toUser._id || exchangeRequest.toUser,
      nickname: exchangeRequest.toUser.nickname || ''
    },
    offeredItem: {
      id: exchangeRequest.offeredItem._id || exchangeRequest.offeredItem,
      title: exchangeRequest.offeredItem.title || ''
    },
    requestedItem: {
      id: exchangeRequest.requestedItem._id || exchangeRequest.requestedItem,
      title: exchangeRequest.requestedItem.title || ''
    }
  });
}

async function notifyExchangeRejected(exchangeRequest) {
  return sendWebhook('exchange.rejected', {
    requestId: exchangeRequest._id,
    fromUser: {
      id: exchangeRequest.fromUser._id || exchangeRequest.fromUser,
      nickname: exchangeRequest.fromUser.nickname || ''
    },
    toUser: {
      id: exchangeRequest.toUser._id || exchangeRequest.toUser,
      nickname: exchangeRequest.toUser.nickname || ''
    },
    offeredItem: {
      id: exchangeRequest.offeredItem._id || exchangeRequest.offeredItem,
      title: exchangeRequest.offeredItem.title || ''
    },
    requestedItem: {
      id: exchangeRequest.requestedItem._id || exchangeRequest.requestedItem,
      title: exchangeRequest.requestedItem.title || ''
    }
  });
}

module.exports = {
  sendWebhook,
  notifyExchangeRequested,
  notifyExchangeAccepted,
  notifyExchangeRejected
};
