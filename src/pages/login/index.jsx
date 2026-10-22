import { useState } from 'preact/hooks'
import style from './index.module.css'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!username || !password) {
      setError('请输入账号和密码')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '登录失败')
        setLoading(false)
        return
      }
      localStorage.setItem('litchi_token', data.token)
      const params = new URLSearchParams(window.location.search)
      const from = params.get('from')
      // 整页跳转，让登录守卫重新校验 token
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
        <p className={style.sub}>请输入账号和密码以继续</p>
        <input
          className={style.input}
          type="text"
          placeholder="账号"
          value={username}
          onInput={(e) => setUsername(e.target.value)}
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
