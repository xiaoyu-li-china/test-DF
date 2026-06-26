export const isLeapYear = (year) => {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

export const getDaysInMonth = (year, month) => {
  return new Date(year, month + 1, 0).getDate()
}

export const getFirstDayOfWeek = (year, month) => {
  return new Date(year, month, 1).getDay()
}

export const formatDateKey = (date) => {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}
