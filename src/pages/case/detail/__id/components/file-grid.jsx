import style from './file-grid.module.css'

// 用附件元数据换 WPS 签名链接
async function resolveUrl(attachment) {
  const res = await fetch('/api/contractor/attachments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attachs: [attachment] }),
  })
  const list = await res.json()
  const realUrl = Array.isArray(list) ? list[0]?.url : null
  if (!realUrl) throw new Error('未获取到文件链接')
  return realUrl
}

export default function FileGrid({ files, loading }) {
  const download = async (attachment) => {
    if (loading) return
    try {
      const realUrl = await resolveUrl(attachment)
      const isTxt = attachment.type === 'txt' || /\.txt$/i.test(attachment.fileName || '')
      if (isTxt) {
        window.open(`/case/video?path=${encodeURIComponent(realUrl)}`, '_blank', 'noopener,noreferrer')
      } else {
        const q = `?url=${encodeURIComponent(realUrl)}&fileName=${encodeURIComponent(attachment.fileName || '')}`
        window.open(`/contractor/doc-viewer${q}`, '_blank', 'noopener,noreferrer')
      }
    } catch (e) {
      console.error('获取附件链接失败:', e)
    }
  }

  const getFileExt = (fileName) => {
    if (!fileName) return 'FILE'
    const parts = fileName.split('.')
    return parts.length > 1 ? parts.pop().toUpperCase() : 'FILE'
  }

  return (
    <div className={style.wrapper}>
      {files.map((attachment, index) => (
        <div key={index} className={style.item} onClick={() => download(attachment)}>
          <div className={style.icon}>
            <span className={style.fileExt}>{getFileExt(attachment.fileName)}</span>
          </div>
          <div className={style.info}>
            <div className={style.name}>{attachment.fileName}</div>
            <div className={style.size}>
              {attachment.size ? `${(attachment.size / 1024 / 1024).toFixed(2)} MB` : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
