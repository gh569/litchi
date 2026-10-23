import { useState, useEffect } from 'preact/hooks'
import TableHeader from '@com/table-header'
import Loading from '@com/loading'
import RecycleBinItem from './recycle-bin-item'
import ErrorDisplay from '@com/error'
import { useNavigate } from '@utils/router'
import style from './recycle-bin.module.css'

export default function RecycleBinPage() {
  const [deletedCases, setDeletedCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const fetchDeletedCases = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/case?trash=1')
      const data = await res.json()
      setDeletedCases(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('获取回收站数据失败:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDeletedCases()
  }, [])

  // 恢复 / 彻底删除：沿用 uni-preact 行为——不支持
  const notSupported = () => window.alert('不支持此操作！')

  const restoreCase = () => notSupported()
  const deletePermanently = () => notSupported()

  const viewCaseDetail = (caseId) => navigate(`/case/detail/${encodeURIComponent(caseId)}`)

  if (error) {
    return (
      <>
        <TableHeader title="回收站" showBack onBack={() => history.back()} />
        <ErrorDisplay message={error} onRetry={() => window.location.reload()} />
      </>
    )
  }

  return (
    <div>
      <TableHeader title="回收站" showBack onBack={() => history.back()} />

      <div className={style['content-container']}>
        {loading ? (
          <div className={style['loading-container']}><Loading /></div>
        ) : (
          <>
            <div className={style['info-section']}>
              <p className={style['info-section-text']}>共 {deletedCases.length} 个已删除的案例</p>
            </div>

            {deletedCases.length > 0 ? (
              <div className={style['cases-list']}>
                {deletedCases.map((item) => (
                  <RecycleBinItem
                    key={item._id ?? item.id}
                    item={item}
                    onViewDetail={viewCaseDetail}
                    onRestore={restoreCase}
                    onDeletePermanently={deletePermanently}
                  />
                ))}
              </div>
            ) : (
              <div className={style['empty-container']}>
                <div className={style['empty-icon']}></div>
                <h3 className={style['empty-title']}>回收站为空</h3>
                <p className={style['empty-text']}>没有已删除的案例</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
