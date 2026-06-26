/**
 * 电影院选座系统数据模型
 * 
 * 与后端 seat-map API 对齐说明：
 * 
 * 1. 多影城支持：
 *    - 建议新增 cinemaId 字段，用于区分不同影城
 *    - 后端API路径建议: GET /api/cinemas/:cinemaId/movies
 *    - 座位布局可按影城配置不同的行列数和座位类型
 * 
 * 2. 后端 seat-map API 约定：
 *    - GET /api/sessions/:sessionId/seat-map
 *    - 返回当前场次的实时座位布局
 *    - 包含座位状态、类型、锁定信息
 * 
 * 3. WebSocket实时同步（推荐）：
 *    - 连接: ws://api/cinemas/:cinemaId/sessions/:sessionId/seats
 *    - 事件: seat_status_change, seat_locked, seat_unlocked
 *    - 用于多端实时同步座位状态
 */

export interface Cinema {
  id: string;
  name: string;
  address: string;
  halls: Hall[];
}

export interface Hall {
  id: string;
  name: string;
  rows: number;
  cols: number;
  seatLayout: SeatType[][];
}

export interface Movie {
  id: string;
  title: string;
  poster: string;
  duration: number;
  genre: string;
  description: string;
  rating: number;
  cinemaIds?: string[];
}

export interface Session {
  id: string;
  movieId: string;
  cinemaId?: string;
  hallId?: string;
  date: string;
  time: string;
  language: string;
  hall: string;
  price: number;
}

/**
 * 座位状态枚举
 * 
 * 后端对齐说明：
 * - available: 可售，前端可点击选择
 * - sold: 已售，置灰不可点击
 * - selected: 已选（仅当前用户会话），前端本地状态
 * - locked: 已锁定（15分钟内），由后端返回或WebSocket推送
 * 
 * 状态流转：
 *   available → selected → locked → sold
 *                   ↓（超时）
 *                available
 */
export type SeatStatus = 'available' | 'sold' | 'selected' | 'locked';

/**
 * 座位类型枚举
 * 
 * 后端对齐说明：
 * - normal: 普通座位，默认类型
 * - couple: 情侣座，通常成对出现，需一起选择
 * - wheelchair: 残疾人座，通常在过道两侧，位置宽敞
 * 
 * 扩展建议（多影城差异化配置）：
 * - vip: VIP厅豪华座椅
 * - sofa: 沙发厅
 * - love_seat: 豪华情侣座（更宽间距）
 */
export type SeatType = 'normal' | 'couple' | 'wheelchair' | 'vip' | 'sofa';

/**
 * 座位数据结构
 * 
 * 后端对齐说明：
 * 
 * 1. row / col (座位行列):
 *    - row: 排号，从1开始，建议字符串支持A-Z前缀（如"A1", "1"）
 *    - col: 座号，从1开始
 *    - 后端应保证唯一性: `${row}-${col}`
 * 
 *    注意：当前实现使用number类型，如需字母排号建议扩展为string
 *    例：rowLabel: "A", rowIndex: 1, col: 5
 * 
 * 2. id (座位唯一标识):
 *    - 建议格式: `seat-${cinemaId}-${hallId}-${sessionId}-${row}-${col}`
 *    - 确保跨影城、跨场次不冲突
 * 
 * 3. type (座位类型):
 *    - 与Hall.seatLayout配置对应
 *    - 后端在场次初始化时生成
 *    - 支持按影城/影厅自定义配置
 * 
 * 4. 锁座字段 (lockedAt, lockedBy):
 *    - lockedAt: 锁定时间戳（毫秒）
 *    - lockedBy: 锁定用户标识（userId or deviceId）
 *    - expireAt: 过期时间戳，= lockedAt + 15分钟
 * 
 *    后端锁座流程：
 *    1. 前端请求 POST /api/seats/lock
 *    2. 后端校验座位状态，设置Redis过期key（15分钟）
 *    3. 返回 expireAt 给前端
 *    4. WebSocket广播 seat_locked 事件
 * 
 * 5. 后端seat-map响应示例：
 *    {
 *      "sessionId": "session-001",
 *      "rows": 10,
 *      "cols": 14,
 *      "seats": [
 *        {
 *          "id": "seat-cinema1-hall1-session001-1-1",
 *          "row": 1,
 *          "col": 1,
 *          "status": "available",
 *          "type": "normal",
 *          "lockedAt": null,
 *          "lockedBy": null,
 *          "expireAt": null
 *        }
 *      ],
 *      "coupleSeatPairs": [
 *        ["seat-8-5", "seat-8-6"],
 *        ["seat-8-7", "seat-8-8"]
 *      ]
 *    }
 */
export interface Seat {
  /**
   * 座位唯一ID
   * 建议格式: seat-${cinemaId}-${hallId}-${sessionId}-${row}-${col}
   */
  id: string;

  /**
   * 排号
   * 从1开始，如需字母排号（如A排）建议扩展rowLabel字段
   */
  row: number;

  /**
   * 座号
   * 从1开始
   */
  col: number;

  /** 座位状态 */
  status: SeatStatus;

  /** 座位类型 */
  type: SeatType;

  /** 锁定时间戳（毫秒），null表示未锁定 */
  lockedAt?: number | null;

  /** 锁定者标识（用户ID或设备ID） */
  lockedBy?: string | null;

  /** 
   * 锁座过期时间戳
   * = lockedAt + 15 * 60 * 1000
   * 前端倒计时依据
   */
  expireAt?: number | null;
}

/**
 * 座位布局数据
 * 
 * 后端对齐说明：
 * - 每个场次一份座位布局
 * - coupleSeatPairs: 情侣座配对信息，用于校验连选
 * - 建议后端缓存热点场次的座位布局
 * 
 * 多影城支持：
 * - 按cinemaId分缓存
 * - 不同影城可配置不同的座位类型位置
 */
export interface SeatLayout {
  sessionId: string;
  cinemaId?: string;
  hallId?: string;
  rows: number;
  cols: number;
  seats: Seat[];
  coupleSeatPairs: [string, string][];
}

/**
 * 锁座请求
 * 
 * 后端对齐说明：
 * POST /api/seats/lock
 * Body: {
 *   "sessionId": "session-001",
 *   "seatIds": ["seat-1-1", "seat-1-2"],
 *   "userId": "user-001",
 *   "deviceId": "device-001"
 * }
 * 
 * 幂等性：同一用户重复请求相同座位应返回成功
 * 并发生效：Redis分布式锁 + Lua脚本保证原子性
 */
export interface LockSeatsRequest {
  sessionId: string;
  seatIds: string[];
  userId?: string;
  deviceId?: string;
}

/**
 * 锁座响应
 * 
 * 后端对齐说明：
 * {
 *   "success": true,
 *   "orderId": "ORD-XXX",
 *   "expireAt": 1717300000000,
 *   "message": "锁座成功"
 * }
 * 
 * 失败情况：
 * - 座位已被锁定: 409 Conflict
 * - 座位已售出: 410 Gone
 * - 锁座超时: 408 Request Timeout
 */
export interface LockSeatsResponse {
  success: boolean;
  orderId?: string;
  expireAt?: number;
  message?: string;
  conflictSeats?: string[];
}

/**
 * 退票政策
 * 
 * 后端对齐说明：
 * - 可按影城配置不同退票规则
 * - 支持动态配置（开场前X小时可退Y%）
 * - 建议在场次信息中返回refundPolicy
 * 
 * 扩展建议：
 * - refundFee: 手续费金额
 * - minRefundTime: 最短退票时间（如开场前24小时）
 * - maxRefundCount: 每月最大退票次数
 */
export interface RefundPolicy {
  canRefund: boolean;
  refundRate: number;
  reason?: string;
  refundFee?: number;
}

/**
 * 已锁定订单
 * 
 * 后端对齐说明：
 * - 前端本地缓存，用于"我的订单"展示
 * - 后端真实数据以GET /api/orders为准
 * - 建议定时轮询或WebSocket同步订单状态
 */
export interface LockedOrder {
  orderId: string;
  sessionId: string;
  movieId: string;
  cinemaId?: string;
  seatIds: string[];
  lockedAt: number;
  expireAt: number;
  totalPrice: number;
  status?: 'locked' | 'paid' | 'refunded' | 'expired';
}

export interface SeatSelectionState {
  selectedSeats: Seat[];
  ticketCount: number;
  session: Session | null;
  movie: Movie | null;
  lockExpireAt: number | null;
  isLocked: boolean;
  lockedOrders: LockedOrder[];
  currentCinema?: Cinema | null;
}

/**
 * WebSocket消息类型
 * 
 * 后端对齐建议：
 * 1. SEAT_STATUS_CHANGED: 座位状态变更
 * 2. ORDER_EXPIRED: 订单过期
 * 3. REFUND_COMPLETED: 退票完成
 * 
 * 消息格式：
 * {
 *   "type": "SEAT_STATUS_CHANGED",
 *   "payload": {
 *     "seatId": "seat-1-1",
 *     "status": "locked",
 *     "timestamp": 1717300000000
 *   }
 * }
 */
export type WSMessageType = 'SEAT_STATUS_CHANGED' | 'ORDER_EXPIRED' | 'REFUND_COMPLETED';

export interface WSMessage<T = any> {
  type: WSMessageType;
  payload: T;
  timestamp: number;
}
