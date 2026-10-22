import style from './table-header.module.css';

// 1. 提取内部结构为独立组件，消除重复
const HeaderInner = ({ showBack, onBack, title, subtitle, actions }) => (
  <div className={style['header-inner']}>
    {showBack && (
      <button className={style['back-button']} onClick={onBack}>
        ← 返回
      </button>
    )}
    <div className={style['header-content']}>
      <h1 className={style['header-title']}>{title}</h1>
      {subtitle && <p className={style['header-subtitle']}>{subtitle}</p>}
    </div>
    {actions && <div className={style['header-actions']}>{actions}</div>}
  </div>
);

const TableHeader = ({ title, subtitle, actions, showBack = false }) => {
  const handleBack = () => {
    window.history.back();
  };

  return (
    <>
      {/* 2. 占位元素：不传事件，渲染静态结构撑开高度 */}
      <div className={style['header-placeholder']}>
        <HeaderInner 
          showBack={showBack} 
          title={title} 
          subtitle={subtitle} 
          actions={actions} 
        />
      </div>

      {/* 3. 实际固定元素：传入点击事件 */}
      <div className={style['table-header']}>
        <HeaderInner 
          showBack={showBack} 
          onBack={handleBack} 
          title={title} 
          subtitle={subtitle} 
          actions={actions} 
        />
      </div>
    </>
  );
};

export default TableHeader;
