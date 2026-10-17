import { useState } from 'preact/hooks'

export default function App() {
  const [user, setUser] = useState(null)

  const fetchUser = async () => {
    const res = await fetch('/api/user')
    const data = await res.json()
    setUser(data.data)
  }

  return (
    <div>
      <h1>Preact + Cloudflare</h1>
      <button onClick={fetchUser}>获取用户</button>
      {user && <pre>{JSON.stringify(user, null, 2)}</pre>}
    </div>
  )
}