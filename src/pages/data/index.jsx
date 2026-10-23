import BigDataStream from '../../components/big-data'
import style from './index.module.css'

// 大数据流式加载页
export default function DataPage() {
  return (
    <div className={style.page}>
      <BigDataStream />
    </div>
  )
}
