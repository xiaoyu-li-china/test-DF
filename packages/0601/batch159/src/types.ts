/**
 * 前端数据模型与后端对齐说明
 *
 * 本文件定义的 TypeScript 接口与后端 REST API 的数据模型一一对应，
 * 前后端通过 Mock API 层（src/data/api.ts）进行数据交互。
 *
 * 对齐方式：
 * 1. 字段命名完全一致（camelCase → camelCase，后端同构）
 * 2. 枚举值与后端数据库约束保持一致
 * 3. 可选字段用 ?: 标记，与后端 nullable 字段对应
 * 4. 时间格式统一使用 ISO 日期字符串 (YYYY-MM-DD) 和 24 小时制 (HH:mm)
 *
 * | 前端类型          | 后端表/接口          | 备注                                  |
 * |-------------------|----------------------|---------------------------------------|
 * | ConsultationType  | consultation_types   | 枚举值：labor/marriage/property       |
 * | TimeSlot          | time_slots           | 时段表，id 格式：{date}-{period}{idx} |
 * | Lawyer            | lawyers              | 律师表，多对多关联咨询类型             |
 * | BookingRecord     | bookings             | 预约表，关联 slot_id 和 lawyer_id     |
 */

export type ConsultationType = 'labor' | 'marriage' | 'property'

export interface TypeInfo {
  id: ConsultationType
  label: string
  icon: string
  description: string
}

/**
 * 时段模型 - 与后端 time_slots 表对齐
 *
 * 字段对齐：
 * - id: 主键，格式为 `{YYYY-MM-DD}-{M|A}{idx}`，如 2026-06-03-M0
 *   M = Morning (上午), A = Afternoon (下午), idx 为时段序号 0-4
 * - date: 咨询日期，ISO 格式 YYYY-MM-DD，对应后端 date 字段
 * - startTime: 开始时间，24 小时制 HH:mm，对应后端 start_time
 * - endTime: 结束时间，24 小时制 HH:mm，对应后端 end_time
 * - period: 时段分组，用于 UI 上午/下午分组展示，后端有冗余字段 period
 * - available: 是否可预约，后端根据 bookings 表实时计算
 *
 * 后端刷新机制：
 * - 每次 setSelectedType / setSelectedDate 调用 fetchSlotsAvailability API
 * - API 返回 SlotWithAvailability，包含该时段可用律师列表
 * - 前端通过 mergeAvailability() 合并到本地 allSlots 状态
 */
export interface TimeSlot {
  id: string
  date: string
  startTime: string
  endTime: string
  period: 'morning' | 'afternoon'
  available: boolean
}

export interface Lawyer {
  id: string
  name: string
  types: ConsultationType[]
}

export interface BookingRequest {
  type: ConsultationType
  slotId: string
  name: string
  phone: string
  summary: string
}

export interface UploadedFile {
  id: string
  name: string
  type: string
  size: number
  previewUrl?: string
}

export interface BookingResult {
  bookingNo: string
  lawyerName: string
  date: string
  time: string
  typeName: string
  userName: string
  wantReminder: boolean
  files: UploadedFile[]
}
