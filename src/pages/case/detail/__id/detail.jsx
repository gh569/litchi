import { useEffect, useState } from 'preact/hooks'
import LoadingComponent from '@com/loading'
import ErrorComponent from '@com/error'
import TableHeader from '@com/table-header'
import { useParams } from 'wouter-preact'
import Content from './components/content'
import style from './detail.module.css'

export default function Detail() {
  const [caseData, setCaseData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { id: caseId } = useParams()

  useEffect(() => {
    const loadCaseDetail = async () => {
      if (!caseId || caseId === ':id' || caseId === ':caseId') {
        setError('无效的案例ID')
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        const res = await fetch(`/api/case?id=${encodeURIComponent(caseId)}`)
        const data = await res.json()
        if (data && !data.error) {
          setCaseData(data)
        } else {
          setError('未找到该案例')
        }
      } catch (err) {
        console.error('获取案例详情失败:', err)
        setError('获取案例详情失败')
      } finally {
        setLoading(false)
      }
    }
    loadCaseDetail()
  }, [caseId])

  const handleRetry = () => window.location.reload()

  return (
    <div>
      <TableHeader title="案例详情" showBack />
      <div className={style.contentContainer}>
        {loading && <LoadingComponent />}
        {!loading && error && <ErrorComponent message={error} onRetry={handleRetry} />}
        {!loading && !error && caseData && <Content caseData={caseData} loading={loading} />}
      </div>
    </div>
  )
}
