import { useEffect, useState } from 'preact/hooks'
import TableHeader from '@com/table-header'
import Loading from '@com/loading'
import ListItem from '@com/list-item'
import { useNavigate } from '@utils/router'
import style from './materials.module.css'

const FIXED_KEYWORD = '#装小蜜'

export default function MaterialsPage() {
  const navigate = useNavigate()
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    ;(async () => {
      try {
        const res = await fetch(`/api/case?q=${encodeURIComponent(FIXED_KEYWORD)}`)
        const data = await res.json()
        if (isMounted) setResults(Array.isArray(data) ? data : [])
      } catch (e) {
        console.error('加载资料失败:', e)
        if (isMounted) setResults([])
      } finally {
        if (isMounted) setLoading(false)
      }
    })()
    return () => { isMounted = false }
  }, [])

  const handleItemClick = (id) => navigate(`/case/detail/${encodeURIComponent(id)}`)

  return (
    <div className={style.page}>
      <TableHeader title="我的资料" showBack onBack={() => history.back()} />

      <div className={style.container}>
        <div className={style['info-card']}>
          <p className={style['info-p']}>关键词: <strong className={style['info-strong']}>"{FIXED_KEYWORD}"</strong></p>
          {!loading && <p className={`${style['info-p']} ${style.count}`}>找到 {results.length} 条资料</p>}
        </div>

        {loading ? (
          <Loading />
        ) : results.length > 0 ? (
          <div className={style.list}>
            {results.map((item) => (
              <ListItem
                key={item.id ?? item._id}
                title={item['context'] || '无内容'}
                time={item['updateTime'] ? new Date(item['updateTime']).toLocaleDateString() : '未知'}
                onClick={() => handleItemClick(item.id)}
              />
            ))}
          </div>
        ) : (
          <div className={style.empty}>
            <div className={style.icon}></div>
            <h3>暂无相关资料</h3>
            <p>没有包含 "{FIXED_KEYWORD}" 的资料</p>
          </div>
        )}
      </div>
    </div>
  )
}
