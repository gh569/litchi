import style from './loading.module.css';

const Loading = ({ message = "加载中..." }) => {
  return (
    <div className={style['loading-container']}>
      <div className={style.spinner}></div>
      <p>{message}</p>
    </div>
  );
};

export default Loading;
