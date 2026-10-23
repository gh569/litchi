import style from './index.module.css'
import { Link } from '@utils/router'

export default function SyncCenter() {
  const syncPages = [
    { href: '/sync-center/case', icon: '💼', title: '案例同步', desc: '同步最新的业务案例数据及附件资源', color: '#667eea', bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { href: '/sync-center/client', icon: '👥', title: '客户数据同步', desc: '更新陪签流程中的客户核心状态与记录', color: '#f093fb', bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { href: '/sync-center/builder', icon: '🏗️', title: '施工方数据同步', desc: '同步施工方资质与核心业务数据', color: '#43e97b', bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
    { href: '/sync-center/contract', icon: '💰', title: '报价数据同步', desc: '拉取最新的项目报价与费用明细', color: '#fa709a', bg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  ]

  return (
    <div className={style['page-wrapper']}>
      <div className={style.container}>
        <div className={style.header}>
          <div className={style['header-icon']}>☁️</div>
          <h1 className={style.title}>WPS 数据同步中心</h1>
          <p className={style.subtitle}>选择需要同步的数据模块，系统将自动拉取 WPS 在线表格并更新至云端数据库</p>
        </div>

        <div className={style['nav-grid']}>
          {syncPages.map((item, index) => (
            <Link
              key={index}
              to={item.href}
              target="_self"
              className={style['nav-card']}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className={style['card-icon-box']} style={{ background: item.bg }}>
                <span className={style['card-icon']}>{item.icon}</span>
              </div>
              <div className={style['card-content']}>
                <h2 className={style['card-title']} style={{ color: item.color }}>{item.title}</h2>
                <p className={style['card-desc']}>{item.desc}</p>
              </div>
              <div className={style['card-arrow']} style={{ color: item.color }}>
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
              </div>
            </Link>
          ))}
        </div>

        <div className={style['footer-tip']}>
          <span className={style['tip-icon']}>⚠️</span> 同步操作会直接覆盖云端数据，请谨慎操作
        </div>
      </div>
    </div>
  )
}
