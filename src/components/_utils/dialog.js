import { h, render } from 'preact';

// 全局静态计数器：用于自动分配递增 zIndex
let dialogZIndexCounter = 9999;

class DialogInstance {
  constructor() {
    this._container = null;
    this._isVisible = false;
    this._historyPushed = false;
    this._handlePopState = this._handlePopState.bind(this);
    this.zIndex = dialogZIndexCounter++; // 实例创建时分配zIndex
  }

  _getContainer() {
    if (!this._container) {
      this._container = document.createElement('div');
      this._container.className = 'preact-global-dialog';
      Object.assign(this._container.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: '#fff',
        zIndex: this.zIndex,
        display: 'none',
        overflow: 'auto',
      });
      document.body.appendChild(this._container);
    }
    return this._container;
  }

  _handlePopState() {
    if (this._isVisible) {
      this.close(true);
    }
  }

  /**
   * @param {import('preact').VNode} content
   * @param {{backClose?: boolean}} options
   */
  show(content, options = {}) {
    if (this._isVisible) return;
    this._isVisible = true;
    const container = this._getContainer();
    const { backClose = true } = options;

    if (backClose) {
      history.pushState({ dialog: true }, '', null);
      this._historyPushed = true;
      window.addEventListener('popstate', this._handlePopState);
    }

    render(content, container);
    container.style.display = 'block';
    // 弹层打开时锁定底层页面滚动，避免页面固定条干扰视觉
    document.body.style.overflow = 'hidden';
  }

  /**
   * @param {boolean} isPopState 是否浏览器返回触发
   */
  close(isPopState = false) {
    if (!this._isVisible || !this._container) return;
    this._isVisible = false;
    const container = this._container;

    window.removeEventListener('popstate', this._handlePopState);
    render(null, container);
    container.style.display = 'none';
    // 恢复底层页面滚动
    document.body.style.overflow = '';

    if (!isPopState && this._historyPushed) {
      history.back();
    }
    this._historyPushed = false;
  }

  destroy() {
    this.close();
    if (this._container) {
      render(null, this._container);
      this._container.remove();
      this._container = null;
    }
    window.removeEventListener('popstate', this._handlePopState);
  }
}

// 工厂函数，每次调用生成一个全新弹窗实例
export function createDialog() {
  return new DialogInstance();
}

// 保留原来的全局单例，兼容旧代码
export const dialog = new DialogInstance();
export default dialog;
