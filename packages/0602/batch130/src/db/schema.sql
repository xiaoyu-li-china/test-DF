CREATE TABLE IF NOT EXISTS stations (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    zone VARCHAR(5),
    floor VARCHAR(5),
    type VARCHAR(20) NOT NULL DEFAULT 'AC_SLOW',
    power_kw INT NOT NULL DEFAULT 7,
    status VARCHAR(20) NOT NULL DEFAULT 'online',
    last_heartbeat_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(30) PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(50),
    balance INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reservations (
    id VARCHAR(30) PRIMARY KEY,
    station_id VARCHAR(10) NOT NULL REFERENCES stations(id),
    user_id VARCHAR(30) NOT NULL REFERENCES users(id),
    slot_start TIMESTAMP NOT NULL,
    slot_end TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending_payment',
    deposit_amount INT NOT NULL DEFAULT 2000,
    payment_id VARCHAR(50),
    payment_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_active_reservation_slot 
ON reservations (station_id, slot_start, slot_end) 
WHERE status IN ('pending_payment', 'confirmed', 'charging');

CREATE TABLE IF NOT EXISTS charging_sessions (
    id VARCHAR(30) PRIMARY KEY,
    reservation_id VARCHAR(30) REFERENCES reservations(id),
    station_id VARCHAR(10) NOT NULL REFERENCES stations(id),
    user_id VARCHAR(30) NOT NULL REFERENCES users(id),
    started_at TIMESTAMP,
    stopped_at TIMESTAMP,
    energy_kwh DECIMAL(8,2),
    cost_cents INT,
    overtime_fee_cents INT DEFAULT 0,
    deposit_deducted_cents INT DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS price_configs (
    id VARCHAR(20) PRIMARY KEY,
    station_id VARCHAR(10) REFERENCES stations(id),
    name VARCHAR(50) NOT NULL,
    base_rate_cents_per_kwh INT NOT NULL,
    peak_rate_cents_per_kwh INT NOT NULL,
    peak_start_hour INT NOT NULL,
    peak_end_hour INT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_by VARCHAR(30) NOT NULL,
    effective_from TIMESTAMP NOT NULL,
    effective_to TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_price_configs_station ON price_configs(station_id);
CREATE INDEX IF NOT EXISTS idx_price_configs_effective ON price_configs(effective_from, effective_to);

CREATE TABLE IF NOT EXISTS peak_period_exceptions (
    id SERIAL PRIMARY KEY,
    config_id VARCHAR(20) REFERENCES price_configs(id),
    date DATE NOT NULL,
    is_peak BOOLEAN NOT NULL,
    reason VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(config_id, date)
);

CREATE TABLE IF NOT EXISTS meter_readings (
    id VARCHAR(30) PRIMARY KEY,
    station_id VARCHAR(10) NOT NULL REFERENCES stations(id),
    session_id VARCHAR(30) REFERENCES charging_sessions(id),
    reading_type VARCHAR(20) NOT NULL,
    meter_value DECIMAL(10,3) NOT NULL,
    reading_timestamp TIMESTAMP NOT NULL,
    source VARCHAR(50) NOT NULL,
    signature VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_meter_readings_station ON meter_readings(station_id);
CREATE INDEX IF NOT EXISTS idx_meter_readings_session ON meter_readings(session_id);
CREATE INDEX IF NOT EXISTS idx_meter_readings_time ON meter_readings(reading_timestamp);

CREATE TABLE IF NOT EXISTS settlements (
    id VARCHAR(30) PRIMARY KEY,
    reservation_id VARCHAR(30) REFERENCES reservations(id),
    session_id VARCHAR(30) REFERENCES charging_sessions(id),
    user_id VARCHAR(30) NOT NULL REFERENCES users(id),
    station_id VARCHAR(10) NOT NULL REFERENCES stations(id),
    energy_kwh DECIMAL(8,2) NOT NULL,
    base_cost_cents INT NOT NULL,
    peak_surcharge_cents INT DEFAULT 0,
    overtime_fee_cents INT DEFAULT 0,
    deposit_deducted_cents INT DEFAULT 0,
    deposit_refunded_cents INT DEFAULT 0,
    total_amount_cents INT NOT NULL,
    payment_status VARCHAR(20) NOT NULL,
    price_config_id VARCHAR(20) REFERENCES price_configs(id),
    start_meter_id VARCHAR(30) REFERENCES meter_readings(id),
    end_meter_id VARCHAR(30) REFERENCES meter_readings(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_settlements_user ON settlements(user_id);
CREATE INDEX IF NOT EXISTS idx_settlements_station ON settlements(station_id);
CREATE INDEX IF NOT EXISTS idx_settlements_time ON settlements(created_at);

CREATE TABLE IF NOT EXISTS overtime_rules (
    id VARCHAR(20) PRIMARY KEY,
    station_id VARCHAR(10) REFERENCES stations(id),
    grace_period_minutes INT NOT NULL DEFAULT 30,
    overtime_fee_cents_per_minute INT NOT NULL,
    max_overtime_hours INT NOT NULL DEFAULT 2,
    deposit_deduction_percent INT NOT NULL DEFAULT 50,
    auto_release_enabled BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS session_alerts (
    id VARCHAR(30) PRIMARY KEY,
    session_id VARCHAR(30) NOT NULL REFERENCES charging_sessions(id),
    alert_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP NOT NULL,
    recipient_id VARCHAR(30) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refunds (
    id VARCHAR(30) PRIMARY KEY,
    reservation_id VARCHAR(30) REFERENCES reservations(id),
    user_id VARCHAR(30) NOT NULL REFERENCES users(id),
    amount INT NOT NULL,
    reason VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(30),
    transaction_id VARCHAR(50),
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 5,
    last_attempt_at TIMESTAMP,
    next_retry_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
CREATE INDEX IF NOT EXISTS idx_refunds_next_retry ON refunds(next_retry_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_refunds_dead_letter ON refunds(updated_at) 
WHERE status = 'failed' AND retry_count >= max_retries;

INSERT INTO stations (id, name, zone, floor, type, power_kw, status) VALUES
('ST-001', 'A区1号桩', 'A', 'B1', 'DC_FAST', 60, 'online'),
('ST-002', 'A区2号桩', 'A', 'B1', 'DC_FAST', 60, 'online'),
('ST-003', 'A区3号桩', 'A', 'B1', 'AC_SLOW', 7, 'online'),
('ST-004', 'B区1号桩', 'B', 'B1', 'AC_SLOW', 7, 'online'),
('ST-005', 'B区2号桩', 'B', 'B1', 'AC_SLOW', 7, 'online'),
('ST-006', 'B区3号桩', 'B', 'B1', 'AC_SLOW', 7, 'online'),
('ST-007', 'C区1号桩', 'C', 'B1', 'DC_FAST', 60, 'online'),
('ST-008', 'C区2号桩', 'C', 'B1', 'DC_FAST', 60, 'online'),
('ST-009', 'C区3号桩', 'C', 'B1', 'AC_SLOW', 7, 'online'),
('ST-010', 'D区1号桩', 'D', 'B1', 'AC_SLOW', 7, 'online'),
('ST-011', 'D区2号桩', 'D', 'B1', 'AC_SLOW', 7, 'online'),
('ST-012', 'D区3号桩', 'D', 'B1', 'AC_SLOW', 7, 'offline')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, phone, name, balance) VALUES
('USER-001', '13800138001', '张三', 5000),
('USER-002', '13800138002', '李四', 3000),
('USER-003', '13800138003', '王五', 10000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO price_configs (id, station_id, name, base_rate_cents_per_kwh, peak_rate_cents_per_kwh,
    peak_start_hour, peak_end_hour, is_default, created_by, effective_from)
VALUES
('PRICE-DEFAULT', NULL, '默认电价', 150, 200, 18, 22, true, 'ADMIN-001', '2024-01-01 00:00:00'),
('PRICE-A-ZONE', 'ST-001', 'A区电价', 150, 250, 18, 22, false, 'ADMIN-001', '2024-01-01 00:00:00'),
('PRICE-B-ZONE', 'ST-004', 'B区电价', 140, 180, 17, 21, false, 'ADMIN-001', '2024-01-01 00:00:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO overtime_rules (id, station_id, grace_period_minutes, overtime_fee_cents_per_minute,
    max_overtime_hours, deposit_deduction_percent, auto_release_enabled, is_default)
VALUES
('OT-DEFAULT', NULL, 30, 10, 2, 50, true, true),
('OT-A-ZONE', 'ST-001', 30, 15, 2, 50, true, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO peak_period_exceptions (config_id, date, is_peak, reason) VALUES
('PRICE-DEFAULT', '2026-06-05', false, '端午节全天平峰')
ON CONFLICT (config_id, date) DO NOTHING;
