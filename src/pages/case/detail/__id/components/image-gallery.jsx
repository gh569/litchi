import { useEffect, useState } from 'preact/hooks'
import ImageGallery from '@com/image-gallery'

// 图片附件：先换签名链接再展示
export default function ImageAttachments({ images }) {
  const [urls, setUrls] = useState([])

  useEffect(() => {
    if (!images?.length) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/contractor/attachments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attachs: images }),
        })
        const list = await res.json()
        if (!cancelled && Array.isArray(list)) {
          setUrls(list.map((i) => i.url || '').filter(Boolean))
        }
      } catch (e) {
        console.error('获取图片链接失败:', e)
      }
    })()
    return () => { cancelled = true }
  }, [images])

  return <ImageGallery images={urls} />
}
