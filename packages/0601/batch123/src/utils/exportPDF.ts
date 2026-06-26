import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { formatDisplayDate } from './time'
import type { Session, DM, Room } from '@/types'

interface ExportOptions {
  sessions: Session[]
  rooms: Room[]
  dms: DM[]
  date: string
  onProgress?: (message: string) => void
  onComplete?: () => void
  onError?: (error: Error) => void
}

export const exportScheduleToPDF = async (options: ExportOptions) => {
  const { sessions, rooms, dms, date, onProgress, onComplete, onError } = options

  try {
    onProgress?.('正在生成排班表...')

    const sessionsByRoom = rooms.map((room) => ({
      room,
      sessions: sessions
        .filter((s) => s.roomId === room.id)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    }))

    const totalSessions = sessions.length
    const totalPlayers = sessions.reduce((sum, s) => sum + s.playerCount, 0)

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15
    const contentWidth = pageWidth - margin * 2

    const addHeader = () => {
      doc.setFillColor(26, 26, 46)
      doc.rect(0, 0, pageWidth, 35, 'F')

      doc.setTextColor(245, 158, 11)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(20)
      doc.text('剧本杀排班表', margin, 22)

      doc.setTextColor(200, 200, 200)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)
      doc.text(formatDisplayDate(date), pageWidth - margin - 50, 22, { align: 'right' })
    }

    const addStats = () => {
      const statsY = 45
      const statWidth = contentWidth / 3

      doc.setFillColor(245, 158, 11)
      doc.roundedRect(margin, statsY, statWidth - 3, 16, 2, 2, 'F')
      doc.setTextColor(26, 26, 46)
      doc.setFontSize(10)
      doc.text('今日场次', margin + 5, statsY + 6)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text(`${totalSessions} 场`, margin + 5, statsY + 13)

      doc.setFillColor(16, 185, 129)
      doc.roundedRect(margin + statWidth, statsY, statWidth - 3, 16, 2, 2, 'F')
      doc.setTextColor(26, 26, 46)
      doc.setFontSize(10)
      doc.text('预约人数', margin + statWidth + 5, statsY + 6)
      doc.setFontSize(14)
      doc.text(`${totalPlayers} 人`, margin + statWidth + 5, statsY + 13)

      doc.setFillColor(59, 130, 246)
      doc.roundedRect(margin + statWidth * 2, statsY, statWidth - 3, 16, 2, 2, 'F')
      doc.setTextColor(26, 26, 46)
      doc.setFontSize(10)
      doc.text('使用房间', margin + statWidth * 2 + 5, statsY + 6)
      doc.setFontSize(14)
      doc.text(`${sessionsByRoom.filter((r) => r.sessions.length > 0).length} 间`, margin + statWidth * 2 + 5, statsY + 13)
    }

    let currentY = 70
    const rowHeight = 28
    const maxRowsPerPage = 8

    addHeader()
    addStats()

    const colWidths = {
      time: 30,
      script: 55,
      players: 25,
      dm: 35,
      room: 35,
    }

    const addTableHeader = (y: number) => {
      doc.setFillColor(45, 45, 70)
      doc.roundedRect(margin, y, contentWidth, 8, 1, 1, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('时间', margin + 3, y + 5.5)
      doc.text('剧本', margin + colWidths.time + 3, y + 5.5)
      doc.text('人数', margin + colWidths.time + colWidths.script + 3, y + 5.5)
      doc.text('DM', margin + colWidths.time + colWidths.script + colWidths.players + 3, y + 5.5)
      doc.text('房间', margin + colWidths.time + colWidths.script + colWidths.players + colWidths.dm + 3, y + 5.5)
    }

    addTableHeader(currentY)
    currentY += 10

    let rowCount = 0
    const allSessions = [...sessions].sort((a, b) => a.startTime.localeCompare(b.startTime))

    for (let i = 0; i < allSessions.length; i++) {
      const session = allSessions[i]
      const room = rooms.find((r) => r.id === session.roomId)

      if (rowCount >= maxRowsPerPage) {
        doc.addPage()
        addHeader()
        currentY = 50
        addTableHeader(currentY)
        currentY += 10
        rowCount = 0
      }

      const isEven = rowCount % 2 === 0
      if (isEven) {
        doc.setFillColor(250, 250, 250)
        doc.rect(margin, currentY - 3, contentWidth, rowHeight, 'F')
      }

      doc.setFillColor(room?.color || '#999')
      doc.roundedRect(margin + contentWidth - colWidths.room + 2, currentY - 1, colWidths.room - 4, 6, 1, 1, 'F')

      doc.setTextColor(100, 100, 100)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')

      const endTime = (() => {
        const [h, m] = session.startTime.split(':').map(Number)
        const totalMin = h * 60 + m + session.duration
        let endH = Math.floor(totalMin / 60)
        const endM = totalMin % 60
        if (endH >= 24) endH -= 24
        return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`
      })()

      doc.text(`${session.startTime}-${endTime}`, margin + 3, currentY + 5)

      doc.setTextColor(30, 30, 30)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      const scriptDisplay = session.isPrivateBooking
        ? `${session.scriptName} [包场]`
        : session.scriptName
      doc.text(scriptDisplay, margin + colWidths.time + 3, currentY + 5)

      doc.setTextColor(16, 185, 129)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(`${session.playerCount} 人`, margin + colWidths.time + colWidths.script + 3, currentY + 5)

      doc.setTextColor(80, 80, 80)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`DM ${session.dmName}`, margin + colWidths.time + colWidths.script + colWidths.players + 3, currentY + 5)

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(room?.name || '', margin + contentWidth - colWidths.room + 5, currentY + 3.5)

      currentY += rowHeight
      rowCount++
    }

    if (sessions.length === 0) {
      doc.setTextColor(150, 150, 150)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text('今日暂无排期', pageWidth / 2, 120, { align: 'center' })
    }

    doc.setFillColor(26, 26, 46)
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F')
    doc.setTextColor(150, 150, 150)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('剧本杀门店排期系统', pageWidth / 2, pageHeight - 6, { align: 'center' })

    onProgress?.('正在导出 PDF...')

    const fileName = `排班表_${date}.pdf`
    doc.save(fileName)

    onProgress?.('导出成功！')
    onComplete?.()
  } catch (error) {
    console.error('PDF export failed:', error)
    onError?.(error instanceof Error ? error : new Error('导出失败'))
  }
}
