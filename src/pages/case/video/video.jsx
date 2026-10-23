import { useEffect, useRef } from 'preact/hooks'
import style from './video.module.css'

export default function VideoPage() {
  const video = useRef(null)
  const url = new URL(window.location.href)
  const path = decodeURIComponent(url.searchParams.get('path') || '')

  const handleUnmute = () => {
    if (video.current) {
      video.current.muted = false
      video.current.play()
    }
  }

  const play = () => {
    if (video.current) video.current.play().catch((error) => console.log('自动播放失败:', error))
  }

  useEffect(() => {
    if (video.current) {
      const handleLoadedMetadata = () => play()
      video.current.addEventListener('loadedmetadata', handleLoadedMetadata)
      return () => video.current?.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [path])

  return (
    <div className={style['video-container']}>
      <video
        ref={video}
        src={path}
        className={style['full-screen-video']}
        controls
        muted
        webkit-playsinline="true"
      />
      <button onClick={handleUnmute} className={style['unmute-btn']}>点击开启声音</button>
    </div>
  )
}
