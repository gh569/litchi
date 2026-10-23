import FileGrid from './file-grid'
import ImageAttachments from './image-gallery'
import style from './attachments.module.css'

// 附件分类：图片 / 非图片文件
const attachmentCategory = (attachments) => {
  if (!Array.isArray(attachments) || !attachments.length) {
    return { files: [], images: [] }
  }
  const isImage = (attach) => attach.type?.startsWith('image/')
  return {
    files: attachments.filter((attach) => !isImage(attach)),
    images: attachments.filter((attach) => isImage(attach)),
  }
}

export default function Attachments({ attachments, loading }) {
  if (!attachments?.length) return null
  const { files, images } = attachmentCategory(attachments)

  return (
    <div className={style.section}>
      {files.length > 0 && <FileGrid files={files} loading={loading} />}
      {images.length > 0 && <ImageAttachments images={images} />}
    </div>
  )
}
