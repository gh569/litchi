import { useEffect, useState, useCallback, useRef } from 'preact/hooks'
import ListItem from '@com/list-item'
import TableHeader from '@com/table-header'
import Loading from '@com/loading'
import { useNavigate } from '@utils/router'
import style from './index.module.css'

const pageSize = 20

export default function CaseList() {
  const [cases, setCases] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const navigate = useNavigate()
  const sentinelRef = useRef(null)

  const loadCases = async (page = 1, isLoadMore = false) => {
    if (loading || (isLoadMore && loadingMore)) return
    if (isLoadMore) setLoadingMore(true); else setLoading(true)

    try {
      const res = await fetch(`/api/case?page=${page}&pageSize=${pageSize}`)
      const data = await res.json()
      const list = data?.data || []
      if (isLoadMore) {
        setCases(prev => [...prev, ...list])
      } else {
        setCases(list)
      }
      setHasMore(!!data?.hasMore)
      if (!isLoadMore) setCurrentPage(page); else setCurrentPage(prev => prev + 1)
    } catch (e) {
      console.error('获取案例数据失败:', e)
      if (!isLoadMore) setCases([])
    } finally {
      if (isLoadMore) setLoadingMore(false); else setLoading(false)
    }
  }

  // 初始化
  useEffect(() => {
    // 从详情页返回，恢复状态与滚动位置
    const savedState = sessionStorage.getItem('caseListState')
    if (savedState) {
      try {
        const state = JSON.parse(savedState)
        sessionStorage.removeItem('caseListState')
        if (state.isFromDetail) {
          setCases(state.cases || [])
          setCurrentPage(state.page)
          setHasMore(state.hasMore)
          setTimeout(() => window.scrollTo(0, state.scrollPosition || 0), 100)
          return
        }
      } catch (e) { /* 忽略 */ }
    }
    loadCases(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 无限滚动
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadCases(currentPage + 1, true)
        }
      },
      { rootMargin: '100px', threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore, currentPage])

  const handleCaseClick = caseId => {
    sessionStorage.setItem(
      'caseListState',
      JSON.stringify({
        page: currentPage,
        cases,
        hasMore,
        scrollPosition: window.pageYOffset || document.documentElement.scrollTop,
        isFromDetail: true,
      })
    )
    navigate(`./detail/${encodeURIComponent(caseId)}`)
  }

  const handleSearchClick = () => {
    sessionStorage.removeItem('caseListState')
    navigate(`./search`)
  }

  // 悬浮按钮：打开金山文档表单
  const handleFloating = () => {
    window.open('https://www.kdocs.cn/wo/sl/v11ggdKN', '_blank')
  }

  const renderItem = item => (
    <ListItem
      key={item._id ?? item.id}
      title={item['context'] || '无内容'}
      time={item['updateTime'] ? new Date(item['updateTime']).toLocaleDateString('zh-CN') : '未知时间'}
      onClick={() => handleCaseClick(item.id)}
    />
  )

  return (
    <div className={style.root}>
      <TableHeader
        title="案例列表"
        actions={
          <button className={style['search-button']} onClick={handleSearchClick}>
            <span>搜索</span>
          </button>
        }
        showBack
        onBack={() => history.back()}
      />

      <div className={style['content-wrapper']}>
        {loading && cases.length === 0 ? (
          <Loading message="加载中..." />
        ) : (
          <div className={style['cases-list']}>
            {cases.length > 0 ? (
              cases.map(renderItem)
            ) : (
              <div className={style['no-data']}>
                <div className={style['no-data-icon']}></div>
                <p className={style['no-data-text']}>暂无数据</p>
              </div>
            )}
          </div>
        )}

        <div ref={sentinelRef} style={{ height: 1 }}></div>
        {loadingMore && <div className={style['load-more-container']}><span>加载更多...</span></div>}
      </div>

      <button className={style['floating-button']} onClick={handleFloating}>+</button>
    </div>
  )
}
