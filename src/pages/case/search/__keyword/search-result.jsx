import { useEffect, useState } from 'preact/hooks'
import { useParams } from 'wouter-preact'
import TableHeader from '@com/table-header'
import Loading from '@com/loading'
import ListItem from '@com/list-item'
import { useNavigate } from '@utils/router'
import style from './search-result.module.css'

export default function SearchResultPage() {
  const { keyword } = useParams()
  const navigate = useNavigate()
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  const displayKeyword = keyword ? decodeURIComponent(keyword) : ''

  useEffect(() => {
    if (!displayKeyword) {
      setResults([])
      return
    }

    // 从详情返回，恢复缓存
    const cacheKey = `searchResult_${displayKeyword}`
    const savedState = sessionStorage.getItem(cacheKey)
    if (savedState) {
      try {
        const state = JSON.parse(savedState)
        sessionStorage.removeItem(cacheKey)
        setResults(state.results || [])
        setLoading(false)
        setTimeout(() => window.scrollTo(0, state.scrollPosition || 0), 0)
        return
      } catch (e) { console.warn('解析搜索缓存失败，重新加载', e) }
    }

    let isMounted = true
    setLoading(true)
    ;(async () => {
      try {
        const res = await fetch(`/api/case?q=${encodeURIComponent(displayKeyword)}`)
        const data = await res.json()
        if (isMounted) setResults(Array.isArray(data) ? data : [])
      } catch (e) {
        console.error('搜索失败:', e)
        if (isMounted) setResults([])
      } finally {
        if (isMounted) setLoading(false)
      }
    })()
    return () => { isMounted = false }
  }, [displayKeyword])

  const handleItemClick = (id) => {
    const cacheKey = `searchResult_${displayKeyword}`
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify({
        results,
        scrollPosition: window.pageYOffset || document.documentElement.scrollTop,
      }))
    } catch (e) { console.warn('保存搜索状态失败', e) }
    navigate(`/case/detail/${encodeURIComponent(id)}`)
  }

  return (
    <div className={style.page}>
      <TableHeader title="搜索结果" showBack onBack={() => history.back()} />

      <div className={style.container}>
        <div className={style['info-card']}>
          <p className={style['info-p']}>关键词: <strong className={style['info-strong']}>"{displayKeyword}"</strong></p>
          {!loading && <p className={`${style['info-p']} ${style.count}`}>找到 {results.length} 个结果</p>}
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
            <h3>未找到相关案例</h3>
            <p>没有找到包含 "{displayKeyword}" 的案例</p>
            <button className={style.btn} onClick={() => history.back()}>返回</button>
          </div>
        )}
      </div>
    </div>
  )
}
