import React, { useState, useEffect, useRef } from 'react'
import usePhotoQueue from '../hooks/usePhotoQueue'
import { PHOTO_STATUS, photoQueue } from '../services/photoQueue'

function PhotoCapture() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const { queue, addPhoto, stats, processQueue } = usePhotoQueue()

  useEffect(() => {
    startCamera()
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'environment'
        }
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.warn('Camera access denied:', error)
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return

    setIsCapturing(true)

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    canvas.width = 1920
    canvas.height = 1080

    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    
    addPhoto({
      dataUrl,
      checklistItemId: null
    })

    setTimeout(() => {
      setIsCapturing(false)
    }, 500)
  }

  const handleCaptureKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      capturePhoto()
    }
  }

  const handleRetry = (e, photoId) => {
    e.stopPropagation()
    processQueue()
  }

  const handleRetryKeyDown = (e, photoId) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      processQueue()
    }
  }

  const handleDelete = (e, photoId) => {
    e.stopPropagation()
    photoQueue.removePhoto(photoId)
  }

  const handleDeleteKeyDown = (e, photoId) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      photoQueue.removePhoto(photoId)
    }
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getStatusText = (status) => {
    const map = {
      [PHOTO_STATUS.PENDING]: '等待上传',
      [PHOTO_STATUS.SYNCING]: '上传中...',
      [PHOTO_STATUS.SUCCESS]: '上传成功',
      [PHOTO_STATUS.FAILED]: '上传失败'
    }
    return map[status] || status
  }

  return (
    <div className="photo-capture-container">
      <h2 className="page-title">现场拍照</h2>

      <div className="camera-preview">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
        />
        {!stream && (
          <div className="camera-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span>摄像头未启动</span>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <button
        className="capture-btn"
        onClick={capturePhoto}
        onKeyDown={handleCaptureKeyDown}
        disabled={!stream || isCapturing}
        aria-label="拍照"
        tabIndex={0}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 500 }}>照片队列</h3>
        <span style={{ fontSize: '13px', color: '#86909c' }}>
          共 {stats.total} 张 | 待上传 {stats.pending}
        </span>
      </div>

      <div className="photo-queue">
        {queue.length === 0 ? (
          <div style={{ 
            padding: '40px', 
            textAlign: 'center', 
            color: '#86909c',
            backgroundColor: '#f7f8fa',
            borderRadius: '8px'
          }}>
            暂无照片
          </div>
        ) : (
          queue.slice().reverse().map((photo, index) => (
            <div 
              key={photo.id} 
              className={`queue-item ${photo.status === PHOTO_STATUS.FAILED ? 'queue-item-failed' : ''}`}
              style={photo.status === PHOTO_STATUS.FAILED ? {
                border: '1px solid #F53F3F',
                backgroundColor: '#FFF1F0'
              } : {}}
            >
              <img 
                src={photo.dataUrl} 
                alt={`照片 ${index + 1}`} 
                className="queue-thumbnail"
              />
              <div className="queue-info">
                <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                  照片 {queue.length - index}
                </div>
                <div style={{ fontSize: '12px', color: '#86909c', marginBottom: '4px' }}>
                  {formatTime(photo.timestamp)}
                </div>
                <div className={`queue-status ${photo.status}`}>
                  {getStatusText(photo.status)}
                  {photo.status === PHOTO_STATUS.SYNCING && ' ...'}
                </div>
                {photo.status === PHOTO_STATUS.FAILED && photo.error && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#F53F3F', 
                    marginTop: '4px',
                    wordBreak: 'break-all'
                  }}>
                    错误: {photo.error}
                  </div>
                )}
              </div>
              {photo.status === PHOTO_STATUS.FAILED && (
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button
                    onClick={(e) => handleRetry(e, photo.id)}
                    onKeyDown={(e) => handleRetryKeyDown(e, photo.id)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      backgroundColor: '#165DFF',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                    tabIndex={0}
                    aria-label="重试上传"
                  >
                    重试
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, photo.id)}
                    onKeyDown={(e) => handleDeleteKeyDown(e, photo.id)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      backgroundColor: '#F53F3F',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                    tabIndex={0}
                    aria-label="删除该照片"
                  >
                    删除
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default PhotoCapture
