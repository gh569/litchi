import style from './list-item.module.css'

const ListItem = ({ title, time, icon, description, onClick, children}) => {
  return (
    <div className={style['list-item']} onClick={onClick}>
      {icon && <div className={style['item-icon']}>{icon}</div>}
      <div className={style['item-content']}>
        {title && <div className={style['item-title']}>{title}</div>}
        {description && <div className={style['item-description']}>{description}</div>}
        {time && <div className={style['item-time']}>{time}</div>}
        {children}
      </div>
    </div>
  );
};

export default ListItem;
