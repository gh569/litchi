import style from './recycle-bin-item.module.css'

const RecycleBinItem = ({ item, onViewDetail, onRestore, onDeletePermanently }) => {
  const handleRestore = (e) => {
    e.stopPropagation()
    onRestore(item.id)
  }

  const handleDeletePermanently = (e) => {
    e.stopPropagation()
    onDeletePermanently(item.id, item)
  }

  return (
    <div className={style['recycle-bin-item']}>
      <div className={style['item-content']} onClick={() => onViewDetail(item.id)}>
        <div className={style['item-title']}>
          <span className={style['item-title-span']} title={item.context || '无标题'}>
            {item.context || '无标题'}
          </span>
        </div>
        <div className={style['item-time']}>
          最后更新时间: {item['updateTime'] ? new Date(item['updateTime']).toLocaleString() : '未知时间'}
        </div>
      </div>
      <div className={style['item-actions']}>
        <button className={style['restore-btn']} onClick={handleRestore}>恢复</button>
        <button className={style['delete-permanent-btn']} onClick={handleDeletePermanently}>彻底删除</button>
      </div>
    </div>
  )
}

export default RecycleBinItem
