// 轻量 DOM Toast（内部函数，仅本文件使用，外部不导出）
function showToast(message, duration = 1500) {
  // 样式管理 (单例模式)
  if (!document.querySelector('style[data-toast-css]')) {
    const style = document.createElement('style');
    style.setAttribute('data-toast-css', '');
    style.textContent = `
      [data-toast] {
        position: fixed;
        z-index: 9999;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        padding: 20px 20px;
        background: rgba(0, 0, 0, 0.85);
        color: white;
        border-radius: 8px;
        text-align: center;
        min-width: 80px;
        max-width: 80vw;
        opacity: 0;
        pointer-events: none;
        font-family: system-ui, sans-serif;
        will-change: opacity;
      }
    `;
    document.head.appendChild(style);
  }

  // 清理已有 toast
  const existing = document.querySelector('[data-toast]');
  if (existing) existing.remove();

  // 创建容器
  const toast = document.createElement('div');
  toast.setAttribute('data-toast', '');
  toast.textContent = message;
  document.body.appendChild(toast);

  // 动画控制器
  let currentAnimations = [];

  // 淡入动画
  const fadeIn = toast.animate(
    [{ opacity: 0 }, { opacity: 0.9 }],
    { duration: 300, easing: 'ease-in-out', fill: 'forwards' }
  );
  currentAnimations.push(fadeIn);

  // 自动关闭逻辑
  fadeIn.finished
    .then(() => {
      // 等待 duration
      const delay = toast.animate([], { duration });
      currentAnimations.push(delay);
      return delay.finished;
    })
    .then(() => {
      // 淡出动画
      const fadeOut = toast.animate(
        [{ opacity: 0.9 }, { opacity: 0 }],
        { duration: 300, easing: 'ease-in-out', fill: 'forwards' }
      );
      currentAnimations.push(fadeOut);
      return fadeOut.finished;
    })
    .then(() => toast.remove())
    .catch(() => {}); // 防止取消动画报错

  // 返回手动关闭方法
  return () => {
    currentAnimations.forEach(anim => anim.cancel());
    toast.remove();
  };
}

async function _copy(content) {
	try {
		// 优先使用现代Clipboard API
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(content);
		} else {
			// 兼容旧版浏览器
			const textarea = document.createElement('textarea');
			textarea.value = content;
			textarea.style.cssText = `
        position: fixed;
        left: -9999px;
        top: 0;
        opacity: 0;
      `;
			document.body.appendChild(textarea);
			textarea.select();

			if (!document.execCommand('copy')) {
				throw new Error('Clipboard copy failed');
			}
			document.body.removeChild(textarea);
		}

		showToast('复制成功');
		return true;
	} catch (error) {
		console.error('复制失败:', error);
		showToast('复制失败，请手动复制');
		return false;
	}
}

function copyToClipboard(text) {
	if (typeof uni !== 'undefined') {
		uni.setClipboardData({
			data: text,
			success: () => {uni.showToast({
				title:'复制成功'
			})},
			fail: (error) => console.error('复制失败:', error)
		});
	} else {
		_copy(text);
	}
}


export {
	copyToClipboard,
	copyToClipboard as copy,
	copyToClipboard as
	default
};
