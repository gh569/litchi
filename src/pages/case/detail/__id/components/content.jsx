import Attachments from './attachments'
import { useState } from 'preact/hooks'
import { parseLinks } from '@utils/parse-links'
import { copyToClipboard } from '@utils/copy-to-clipboard'
import style from './content.module.css'

export default function Content({ caseData, loading }) {
  const attachments = caseData['attachments']
  const [includeTags, setIncludeTags] = useState(false)

  // 过滤以 # 开头的段落（不带标签复制时）
  const filterText = (text) => {
    if (!text) return ''
    return text
      .split('\n')
      .filter((line) => !line.trim().startsWith('#'))
      .join('\n')
  }

  const handleCopy = () => {
    let textToCopy = caseData['context'] || '无内容'
    if (!includeTags) textToCopy = filterText(textToCopy)
    copyToClipboard(textToCopy)
  }

  return (
    <div className={style.content}>
      <div className={style.header}>
        <h1 className={style.title}>案例详情</h1>
        <div className={style.meta}>
          <span className={style.metaLabel}>创建时间:</span>
          <span className={style.metaValue}>
            {caseData['createTime']
              ? new Date(caseData['createTime']).toLocaleString('zh-CN')
              : '未知时间'}
          </span>
        </div>

        <div className={style.copySection}>
          <label className={style.checkboxLabel}>
            <input
              type="checkbox"
              className={style.checkboxInput}
              checked={includeTags}
              onChange={(e) => setIncludeTags(e.target.checked)}
            />
            带标签复制
          </label>
          <button className={style.copyButton} onClick={handleCopy}>复制</button>
        </div>
      </div>

      <div className={style.body}>
        <div className={style.text}>
          {parseLinks(caseData['context'] || '无内容')}
        </div>
      </div>

      {attachments && Array.isArray(attachments) && attachments.length > 0 && (
        <Attachments attachments={attachments} loading={loading} />
      )}
    </div>
  )
}
