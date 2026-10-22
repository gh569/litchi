// 引入 CSS Module
import styles from "./error.module.css";

// 加载失败组件
const Error = ({ message = "加载失败", onRetry }) => (
  <div className={styles["error-container"]}>
    <div className={styles["error-icon"]}>⚠️</div>
    <p>{message}</p>
    {onRetry && (
      <button onClick={onRetry} className={styles["retry-button"]}>
        重新加载
      </button>
    )}
  </div>
);

export default Error;
