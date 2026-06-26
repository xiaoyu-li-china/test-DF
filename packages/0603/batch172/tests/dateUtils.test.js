import { describe, it, expect } from 'vitest'
import { isLeapYear, getDaysInMonth, getFirstDayOfWeek, formatDateKey } from '../src/utils/dateUtils.js'

describe('isLeapYear', () => {
  it('2024 年是闰年', () => {
    expect(isLeapYear(2024)).toBe(true)
  })

  it('2000 年是闰年（能被 400 整除）', () => {
    expect(isLeapYear(2000)).toBe(true)
  })

  it('1900 年不是闰年（能被 100 整除但不能被 400 整除）', () => {
    expect(isLeapYear(1900)).toBe(false)
  })

  it('2023 年不是闰年', () => {
    expect(isLeapYear(2023)).toBe(false)
  })

  it('2100 年不是闰年', () => {
    expect(isLeapYear(2100)).toBe(false)
  })
})

describe('getDaysInMonth', () => {
  it('2024 年 2 月有 29 天（闰年）', () => {
    expect(getDaysInMonth(2024, 1)).toBe(29)
  })

  it('2023 年 2 月有 28 天（平年）', () => {
    expect(getDaysInMonth(2023, 1)).toBe(28)
  })

  it('2024 年 1 月有 31 天', () => {
    expect(getDaysInMonth(2024, 0)).toBe(31)
  })

  it('2024 年 4 月有 30 天', () => {
    expect(getDaysInMonth(2024, 3)).toBe(30)
  })

  it('2024 年 12 月有 31 天', () => {
    expect(getDaysInMonth(2024, 11)).toBe(31)
  })
})

describe('getFirstDayOfWeek', () => {
  it('2024 年 2 月 1 日是周四（返回 4）', () => {
    expect(getFirstDayOfWeek(2024, 1)).toBe(4)
  })

  it('2024 年 1 月 1 日是周一（返回 1）', () => {
    expect(getFirstDayOfWeek(2024, 0)).toBe(1)
  })

  it('2024 年 3 月 1 日是周五（返回 5）', () => {
    expect(getFirstDayOfWeek(2024, 2)).toBe(5)
  })

  it('2023 年 1 月 1 日是周日（返回 0）', () => {
    expect(getFirstDayOfWeek(2023, 0)).toBe(0)
  })

  it('2024 年 9 月 1 日是周日（返回 0）', () => {
    expect(getFirstDayOfWeek(2024, 8)).toBe(0)
  })
})

describe('formatDateKey', () => {
  it('格式化 2024 年 2 月 15 日', () => {
    const date = new Date(2024, 1, 15)
    expect(formatDateKey(date)).toBe('2024-1-15')
  })

  it('格式化 2023 年 12 月 1 日', () => {
    const date = new Date(2023, 11, 1)
    expect(formatDateKey(date)).toBe('2023-11-1')
  })
})
