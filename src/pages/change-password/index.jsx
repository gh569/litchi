import { useState, useEffect } from 'preact/hooks'
import TableHeader from '@com/table-header'
import { supabase } from '../../lib/supabase'
import style from './index.module.css'

export default function ChangePassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  // 消费找回密码令牌（来自邮件链接，main.jsx 抢收存 sessionStorage）
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let payload = null
      try { payload = JSON.parse(sessionStorage.getItem('supabase_recovery') || 'null') } catch (e) { payload = null }
      if (payload && payload.access_token) {
        try {
          await supabase.auth.setSession({
            access_token: payload.access_token,
            refresh_token: payload.refresh_token || '',
          })
        } catch (e) { console.error('[change-password] setSession failed', e) }
        try { sessionStorage.removeItem('supabase_recovery') } catch (e) {}
      }
      if (!cancelled) setReady(true)
    })()
    return () => { cancelled = true }
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!password) { setError('请输入新密码'); return }
    if (password.length < 6) { setError('密码长度至少6位'); return }
    if (password !== confirm) { setError('两次输入的密码不一致'); return }
    setLoading(true)
    try {
      const { error: apiError } = await supabase.auth.updateUser({ password })
      if (apiError) {
        setError(apiError.message || '密码修改失败')
        setLoading(false)
        return
      }
      setDone(true)
    } catch (err) {
      setError('网络错误，请稍后重试')
      setLoading(false)
    }
  }

  if (!ready) return null

  return (
    <div>
      <TableHeader title="修改密码" showBack onBack={() => history.back()} />
      <div className={style.wrap}>
        {done ? (
          <div className={style['status-card']}>
            <div className={style['status-icon']}>✓</div>
            <h3 className={style['status-title']}>密码修改成功</h3>
            <p className={style['status-text']}>您的密码已成功更新，请返回首页并重新登录。</p>
            <a className={style['goto-home']} href="/">返回首页</a>
          </div>
        ) : (
          <form className={style.card} onSubmit={submit}>
            <p className={style.sub}>输入新密码（至少6位）</p>
            <input
              className={style.input}
              type="password"
              placeholder="新密码"
              value={password}
              onInput={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <input
              className={style.input}
              type="password"
              placeholder="确认新密码"
              value={confirm}
              onInput={(e) => setConfirm(e.target.value)}
            />
            {error && <p className={style.error}>{error}</p>}
            <button className={style.button} type="submit" disabled={loading}>
              {loading ? '提交中…' : '修改密码'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
