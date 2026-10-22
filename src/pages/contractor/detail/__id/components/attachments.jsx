// src/pages/010-find-contractor/detail/__id/components/attachments.jsx
import ImageGallery from "@com/image-gallery";
import FileAttachments from "./file-attachments";
import style from "./attachments.module.css";

// 将附件按类型分为「文件」和「图片」
const attachmentCategory = (attachments) => {
  if (!Array.isArray(attachments) || !attachments.length) {
    return { files: [], images: [] };
  }
  const isImage = (attach) => attach.type?.startsWith("image/");
  return {
    files: attachments.filter((attach) => !isImage(attach)),
    images: attachments.filter((attach) => isImage(attach)),
  };
};

export default function Attachments({ attachments, index }) {
  if (!attachments?.length) {
    return null;
  }

  const { files, images } = attachmentCategory(attachments);

  return (
    <div className={style["attachments-section"]}>
      {files.length > 0 && <FileAttachments files={files} />}
      {images.length > 0 && (
        <ImageGallery
          images={images.map((item) => item.url || "")}
          paramKey={"preview_" + index}
        />
      )}
    </div>
  );
}
