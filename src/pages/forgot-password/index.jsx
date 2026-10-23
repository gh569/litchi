import { useState } from 'preact/hooks'
import TableHeader from '@com/table-header'
import { supabase } from '../../lib/supabase'
import style from './index.module.css'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!email) { setMessage('请输入邮箱地址'); return }
    setLoading(true)
    setMessage('')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/',
      })
      setMessage(error ? error.message : '密码重置邮件已发送，请检查您的邮箱')
    } catch (err) {
      setMessage('网络错误，请稍后重试')
    }
    setLoading(false)
  }

  return (
    <div>
      <TableHeader title="重置密码" showBack onBack={() => history.back()} />
      <div className={style.wrap}>
        <form className={style.card} onSubmit={submit}>
          <p className={style.sub}>输入注册邮箱，系统会发送一封重置密码邮件</p>
          <input
            className={style.input}
            type="email"
            placeholder="邮箱"
            value={email}
            onInput={(e) => setEmail(e.target.value)}
            autoFocus
          />
          {message && (
            <p className={message.includes('已发送') ? style.success : style.error}>{message}</p>
          )}
          <button className={style.button} type="submit" disabled={loading}>
            {loading ? '发送中…' : '发送重置邮件'}
          </button>
        </form>
      </div>
    </div>
  )
}
