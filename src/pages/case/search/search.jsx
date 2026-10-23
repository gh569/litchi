import { useState, useEffect } from 'preact/hooks'
import TableHeader from '@com/table-header'
import { useNavigate } from '@utils/router'
import style from './search.module.css'

const tags = ['#装小蜜', '#案例', '#视频', '#居众', '#乐蜂', '#佳美域']

export default function SearchPage() {
  const [keyword, setKeyword] = useState('')
  const [recentSearches, setRecentSearches] = useState([])
  const [showRecentSearches, setShowRecentSearches] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const saved = localStorage.getItem('recentSearches')
    if (saved) setRecentSearches(JSON.parse(saved))
  }, [])

  const saveSearch = (term) => {
    const updated = [term, ...recentSearches.filter((t) => t !== term)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem('recentSearches', JSON.stringify(updated))
  }

  const go = (text) => {
    setKeyword(text)
    saveSearch(text)
    navigate(`/case/search/${encodeURIComponent(text)}`)
  }

  const handleSearch = () => {
    if (!keyword.trim()) return
    go(keyword)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSearch()
  }

  const goToRecycleBin = () => navigate('/case/recycle-bin')

  return (
    <div>
      <TableHeader
        title="搜索案例"
        showBack
        onBack={() => history.back()}
        actions={
          <button className={style['recycle-bin-btn']} onClick={goToRecycleBin}>回收站</button>
        }
      />

      <div className={style['search-container']}>
        <div className={style['search-box']}>
          <input
            type="text"
            value={keyword}
            onInput={(e) => setKeyword(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => setShowRecentSearches(true)}
            onBlur={() => setTimeout(() => setShowRecentSearches(false), 200)}
            placeholder="请输入关键词搜索案例..."
            className={style['search-input']}
          />
          <button onClick={handleSearch} className={style['search-btn']}>搜索</button>
        </div>

        {recentSearches.length > 0 && showRecentSearches && (
          <div className={style['recent-searches']}>
            <div className={style['recent-searches-header']}>
              <h3 className={style['recent-title']}>最近搜索</h3>
              <button className={style['clear-btn']} onClick={() => { setRecentSearches([]); localStorage.removeItem('recentSearches') }}>清除</button>
            </div>
            <div className={style['recent-searches-list']}>
              {recentSearches.map((term, index) => (
                <button key={index} className={style['recent-search-item']} onClick={() => go(term)}>{term}</button>
              ))}
            </div>
          </div>
        )}

        <div className={style['tags-section']}>
          <h3 className={style['section-title']}>热门标签</h3>
          <div className={style['tags-container']}>
            {tags.map((tag, index) => (
              <button key={index} className={style['tag-item']} onClick={() => go(tag)}>{tag}</button>
            ))}
          </div>
        </div>

        <div className={style['search-tips']}>
          <h3 className={style['tips-title']}>搜索提示</h3>
          <ul className={style['tips-list']}>
            <li className={style['tip-item']}>支持模糊搜索</li>
            <li className={style['tip-item']}>可按创建时间排序</li>
            <li className={style['tip-item']}>搜索结果将显示匹配的案例</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
