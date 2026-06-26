const pool = require('./config');

async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS courts (
        id SERIAL PRIMARY KEY,
        court_number VARCHAR(10) UNIQUE NOT NULL,
        name VARCHAR(50),
        is_active BOOLEAN DEFAULT true
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        court_id INTEGER REFERENCES courts(id) NOT NULL,
        booking_date DATE NOT NULL,
        start_hour INTEGER NOT NULL CHECK (start_hour >= 0 AND start_hour <= 23),
        member_phone VARCHAR(20) NOT NULL,
        payment_status VARCHAR(20) DEFAULT 'unpaid',
        group_booking_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(court_id, booking_date, start_hour)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS waitlist (
        id SERIAL PRIMARY KEY,
        court_id INTEGER REFERENCES courts(id) NOT NULL,
        booking_date DATE NOT NULL,
        start_hour INTEGER NOT NULL CHECK (start_hour >= 0 AND start_hour <= 23),
        member_phone VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'waiting',
        notified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS group_bookings (
        id SERIAL PRIMARY KEY,
        member_phone VARCHAR(20) NOT NULL,
        booking_date DATE NOT NULL,
        start_hour INTEGER NOT NULL,
        court_count INTEGER NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER REFERENCES bookings(id),
        group_booking_id INTEGER REFERENCES group_bookings(id),
        out_trade_no VARCHAR(64) UNIQUE NOT NULL,
        transaction_id VARCHAR(64),
        total_fee INTEGER NOT NULL,
        pay_method VARCHAR(20) DEFAULT 'wechat',
        status VARCHAR(20) DEFAULT 'pending',
        paid_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
      CREATE INDEX IF NOT EXISTS idx_bookings_group_booking_id ON bookings(group_booking_id);
      CREATE INDEX IF NOT EXISTS idx_waitlist_court_date_hour ON waitlist(court_id, booking_date, start_hour, status);
      CREATE INDEX IF NOT EXISTS idx_payments_out_trade_no ON payments(out_trade_no);
      CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
    `);

    const courtResult = await pool.query('SELECT COUNT(*) FROM courts');
    if (parseInt(courtResult.rows[0].count) === 0) {
      const courtNumbers = ['1号', '2号', '3号', '4号', '5号', '6号'];
      for (const num of courtNumbers) {
        await pool.query(
          'INSERT INTO courts (court_number, name) VALUES ($1, $2)',
          [num, `${num}场地`]
        );
      }
      console.log('已初始化 6 个场地');
    }

    console.log('数据库初始化完成');
  } catch (error) {
    console.error('数据库初始化失败:', error);
  } finally {
    await pool.end();
  }
}

initDatabase();
