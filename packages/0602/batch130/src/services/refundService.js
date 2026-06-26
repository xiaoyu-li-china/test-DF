const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const Bull = require('bull');

const REFUND_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  FAILED: 'failed',
  DEAD_LETTER: 'dead_letter',
};

const REFUND_REASONS = {
  RESERVATION_CANCEL_FULL: 'reservation_cancel_full',
  RESERVATION_CANCEL_HALF: 'reservation_cancel_half',
  RESERVATION_EXPIRED: 'reservation_expired',
  STATION_OFFLINE: 'station_offline',
  OVERPAYMENT: 'overpayment',
};

let refundQueue;
let retrySchedulerInterval;

function initQueue() {
  if (refundQueue) return;
  
  const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  };

  refundQueue = new Bull('refund-processor', { redis: redisConfig });

  refundQueue.process(async (job) => {
    const { refundId } = job.data;
    console.log(`Processing refund job: ${refundId}`);
    return processRefund(refundId);
  });

  refundQueue.on('completed', (job, result) => {
    console.log(`Refund job completed: ${job.id}`, result);
  });

  refundQueue.on('failed', (job, err) => {
    console.error(`Refund job failed: ${job.id}`, err.message);
  });
}

async function createRefund(reservationId, userId, amount, reason, client = null) {
  const refundId = `REF-${dayjs().format('YYYYMMDD')}-${uuidv4().slice(0, 6).toUpperCase()}`;
  
  const query = client ? client.query.bind(client) : require('../db').query;
  
  const result = await query(
    `INSERT INTO refunds 
     (id, reservation_id, user_id, amount, reason, status, next_retry_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     RETURNING *`,
    [refundId, reservationId, userId, amount, reason, REFUND_STATUSES.PENDING]
  );

  initQueue();
  await refundQueue.add({ refundId }, { delay: 1000 });

  return result.rows[0];
}

async function callPaymentGateway(refund) {
  const successRate = parseFloat(process.env.REFUND_SUCCESS_RATE || '0.9');
  const shouldSucceed = Math.random() < successRate;
  
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
  
  if (shouldSucceed) {
    return {
      success: true,
      transactionId: `TXN-${uuidv4().slice(0, 10).toUpperCase()}`,
    };
  } else {
    const errors = [
      '支付网关超时',
      '账户余额不足',
      '银行系统维护',
      '网络异常',
      '第三方服务暂时不可用',
    ];
    throw new Error(errors[Math.floor(Math.random() * errors.length)]);
  }
}

function calculateNextRetry(retryCount) {
  const baseDelay = 60 * 1000;
  const delay = baseDelay * Math.pow(2, retryCount);
  const maxDelay = 4 * 60 * 60 * 1000;
  return Math.min(delay, maxDelay);
}

async function processRefund(refundId) {
  const db = require('../db');
  
  return db.transaction(async (client) => {
    const lockResult = await client.query(
      `SELECT * FROM refunds 
       WHERE id = $1 
         AND status IN ($2, $3)
       FOR UPDATE SKIP LOCKED`,
      [refundId, REFUND_STATUSES.PENDING, REFUND_STATUSES.FAILED]
    );

    if (lockResult.rows.length === 0) {
      return { status: 'skipped', reason: 'Refund not available for processing' };
    }

    const refund = lockResult.rows[0];

    if (refund.retry_count >= refund.max_retries) {
      await client.query(
        `UPDATE refunds 
         SET status = $1, updated_at = NOW()
         WHERE id = $2`,
        [REFUND_STATUSES.DEAD_LETTER, refundId]
      );
      
      console.error(`REFUND DEAD LETTER: ${refundId} - Max retries reached`);
      
      return {
        status: 'dead_letter',
        refundId,
        message: '已进入死信队列，请人工处理',
      };
    }

    await client.query(
      `UPDATE refunds 
       SET status = $1, 
           retry_count = retry_count + 1,
           last_attempt_at = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [REFUND_STATUSES.PROCESSING, refundId]
    );

    try {
      const paymentResult = await callPaymentGateway(refund);

      await client.query(
        `UPDATE refunds 
         SET status = $1, 
             transaction_id = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [REFUND_STATUSES.SUCCESS, paymentResult.transactionId, refundId]
      );

      await client.query(
        `UPDATE users 
         SET balance = balance + $1
         WHERE id = $2`,
        [refund.amount, refund.user_id]
      );

      console.log(`REFUND SUCCESS: ${refundId} - Amount: ${refund.amount} cents`);

      return {
        status: 'success',
        refundId,
        transactionId: paymentResult.transactionId,
        amount: refund.amount,
      };

    } catch (err) {
      const nextRetryDelay = calculateNextRetry(refund.retry_count);
      const nextRetryAt = dayjs().add(nextRetryDelay, 'millisecond').toDate();

      await client.query(
        `UPDATE refunds 
         SET status = $1, 
             error_message = $2,
             next_retry_at = $3,
             updated_at = NOW()
         WHERE id = $4`,
        [REFUND_STATUSES.FAILED, err.message, nextRetryAt, refundId]
      );

      const remainingRetries = refund.max_retries - refund.retry_count;
      
      if (remainingRetries > 0) {
        initQueue();
        await refundQueue.add(
          { refundId },
          { delay: nextRetryDelay, jobId: `retry-${refundId}-${refund.retry_count}` }
        );
      }

      console.warn(
        `REFUND FAILED: ${refundId} - Attempt ${refund.retry_count}/${refund.max_retries} - ` +
        `Next retry in ${Math.round(nextRetryDelay / 1000)}s - ${err.message}`
      );

      return {
        status: 'failed',
        refundId,
        attempt: refund.retry_count,
        remainingRetries,
        nextRetryAt,
        error: err.message,
      };
    }
  });
}

async function retryFailedRefunds() {
  const db = require('../db');
  
  const result = await db.query(
    `SELECT id FROM refunds 
     WHERE status = $1 
       AND retry_count < max_retries
       AND next_retry_at <= NOW()
     ORDER BY next_retry_at ASC
     LIMIT 100`,
    [REFUND_STATUSES.FAILED]
  );

  initQueue();

  for (const row of result.rows) {
    await refundQueue.add({ refundId: row.id });
  }

  console.log(`Scheduled ${result.rows.length} failed refunds for retry`);
  return result.rows.length;
}

function startRetryScheduler(intervalMs = 5 * 60 * 1000) {
  if (retrySchedulerInterval) {
    clearInterval(retrySchedulerInterval);
  }

  retrySchedulerInterval = setInterval(async () => {
    try {
      await retryFailedRefunds();
    } catch (err) {
      console.error('Error in refund retry scheduler', err);
    }
  }, intervalMs);

  console.log(`Refund retry scheduler started (interval: ${intervalMs}ms)`);
  
  retryFailedRefunds().catch(err => {
    console.error('Initial retry scan failed', err);
  });
}

function stopRetryScheduler() {
  if (retrySchedulerInterval) {
    clearInterval(retrySchedulerInterval);
    retrySchedulerInterval = null;
    console.log('Refund retry scheduler stopped');
  }
}

async function getDeadLetterRefunds(limit = 100) {
  const db = require('../db');
  
  const result = await db.query(
    `SELECT r.*, u.phone as user_phone, u.name as user_name
     FROM refunds r
     JOIN users u ON r.user_id = u.id
     WHERE r.status = $1
     ORDER BY r.updated_at DESC
     LIMIT $2`,
    [REFUND_STATUSES.DEAD_LETTER, limit]
  );

  return result.rows.map(row => ({
    refundId: row.id,
    reservationId: row.reservation_id,
    user: {
      id: row.user_id,
      phone: row.user_phone,
      name: row.user_name,
    },
    amount: row.amount,
    reason: row.reason,
    errorMessage: row.error_message,
    retryCount: row.retry_count,
    lastAttemptAt: row.last_attempt_at,
    createdAt: row.created_at,
  }));
}

async function manualRefundSuccess(refundId, adminNote = '') {
  const db = require('../db');
  
  return db.transaction(async (client) => {
    const result = await client.query(
      `SELECT * FROM refunds WHERE id = $1 FOR UPDATE`,
      [refundId]
    );

    if (result.rows.length === 0) {
      throw new Error('退款记录不存在');
    }

    const refund = result.rows[0];

    await client.query(
      `UPDATE refunds 
       SET status = $1, 
           transaction_id = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [REFUND_STATUSES.SUCCESS, `MANUAL-${uuidv4().slice(0, 8).toUpperCase()}`, refundId]
    );

    if (refund.status !== REFUND_STATUSES.SUCCESS) {
      await client.query(
        `UPDATE users 
         SET balance = balance + $1
         WHERE id = $2`,
        [refund.amount, refund.user_id]
      );
    }

    console.log(`MANUAL REFUND SUCCESS: ${refundId} - ${adminNote}`);

    return {
      refundId,
      status: REFUND_STATUSES.SUCCESS,
      amount: refund.amount,
    };
  });
}

async function getRefundStatus(refundId) {
  const db = require('../db');
  
  const result = await db.query(
    `SELECT * FROM refunds WHERE id = $1`,
    [refundId]
  );

  if (result.rows.length === 0) {
    throw new Error('退款记录不存在');
  }

  const refund = result.rows[0];

  return {
    refundId: refund.id,
    reservationId: refund.reservation_id,
    amount: refund.amount,
    reason: refund.reason,
    status: refund.status,
    retryCount: refund.retry_count,
    maxRetries: refund.max_retries,
    lastAttemptAt: refund.last_attempt_at,
    nextRetryAt: refund.status === REFUND_STATUSES.FAILED ? refund.next_retry_at : null,
    errorMessage: refund.error_message,
    transactionId: refund.transaction_id,
    createdAt: refund.created_at,
    estimatedCompletion: refund.status === REFUND_STATUSES.PENDING 
      ? dayjs(refund.created_at).add(30, 'minute').toDate()
      : null,
  };
}

module.exports = {
  createRefund,
  processRefund,
  retryFailedRefunds,
  startRetryScheduler,
  stopRetryScheduler,
  getDeadLetterRefunds,
  manualRefundSuccess,
  getRefundStatus,
  REFUND_STATUSES,
  REFUND_REASONS,
};
