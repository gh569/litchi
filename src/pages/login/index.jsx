import { useState } from 'preact/hooks'
import { supabase } from '../../lib/supabase'
import style from './index.module.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError('请输入邮箱和密码')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (authErr) {
        setError(authErr.message || '登录失败')
        setLoading(false)
        return
      }
      const params = new URLSearchParams(window.location.search)
      const from = params.get('from')
      // 整页跳转，让登录守卫重新校验 Supabase 会话
      window.location.href = from || '/'
    } catch (err) {
      setError('网络错误，请重试')
      setLoading(false)
    }
  }

  return (
    <div className={style.wrap}>
      <form className={style.card} onSubmit={submit}>
        <h1 className={style.title}>登录</h1>
        <p className={style.sub}>请输入邮箱和密码以继续</p>
        <input
          className={style.input}
          type="email"
          placeholder="邮箱"
          value={email}
          onInput={(e) => setEmail(e.target.value)}
          autoFocus
        />
        <input
          className={style.input}
          type="password"
          placeholder="密码"
          value={password}
          onInput={(e) => setPassword(e.target.value)}
        />
        {error && <p className={style.error}>{error}</p>}
        <button className={style.button} type="submit" disabled={loading}>
          {loading ? '登录中…' : '登录'}
        </button>
      </form>
    </div>
  )
}
