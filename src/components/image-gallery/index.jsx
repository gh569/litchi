import { useEffect, useCallback, useRef, useState } from 'preact/hooks';
import { ImageViewer } from 'antd-mobile'; // 移除 Image 引入
import { useSearchParams } from 'wouter-preact';
import Loading from '@com/loading';

export default function ImageGallery({ images, paramKey = 'preview' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const previewIndexStr = searchParams.get(paramKey);
  const urlIndex = previewIndexStr !== null ? Number(previewIndexStr) : -1;
  const previewVisible = urlIndex >= 0 && urlIndex < images.length;
  
  const handlerRef = useRef(null);
  const isAutoClosingRef = useRef(false);

  // 用于记录每张图片的加载状态
  const [loadedImages, setLoadedImages] = useState({});

  const openPreview = useCallback((idx) => {
    setSearchParams((prev) => {
      prev.set(paramKey, String(idx));
      return prev;
    });
  }, [setSearchParams, paramKey]);

  const closePreview = useCallback(() => {
    window.history.back();
  }, []);

  const handleImageChange = useCallback((current) => {
    setSearchParams((prev) => {
      prev.set(paramKey, String(current));
      return prev;
    }, { replace: true });
  }, [setSearchParams, paramKey]);

  const handleCloseRef = useRef(null);
  handleCloseRef.current = () => {
    if (!isAutoClosingRef.current) {
      closePreview();
    }
  };
  
  const handleChangeRef = useRef(null);
  handleChangeRef.current = handleImageChange;

  useEffect(() => {
    if (previewVisible) {
      isAutoClosingRef.current = false;
      
      handlerRef.current = ImageViewer.Multi.show({
        images,
        defaultIndex: urlIndex,
        onIndexChange: (current) => handleChangeRef.current?.(current),
        onClose: () => handleCloseRef.current?.(),
      });
    } 
    
    return () => {
      if (handlerRef.current) {
        isAutoClosingRef.current = true;
        try {
          handlerRef.current.close?.();
        } catch (e) {
          console.warn('ImageViewer close failed', e);
        }
        handlerRef.current = null;
      }
    };
  }, [previewVisible, images, closePreview]);

  // 图片加载完成的回调
  const handleImageLoad = (idx) => {
    setLoadedImages(prev => ({ ...prev, [idx]: true }));
  };

  const gap = 8; 

  return (
    <div style={{ 
      display: 'flex', 
      gap: gap, 
      flexWrap: 'wrap',
      width: '100%'
    }}>
      {images.map((src, idx) => (
        <div 
          key={idx}
          style={{
            // 强制计算宽度，确保容器无论图片是否加载都占位
            width: `calc((100% - ${gap * 2}px) / 3)`,
            aspectRatio: '1 / 1',
            borderRadius: 8,
            overflow: 'hidden',
            position: 'relative',
            cursor: 'pointer',
            backgroundColor: '#f5f5f5' // 给一个浅灰底色，即使 Loading 没出来也不至于纯白
          }}
          onClick={() => openPreview(idx)}
        >
          {/* 只有未加载时才显示 Loading */}
          {!loadedImages[idx] && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <Loading message='' />
            </div>
          )}
          
          {/* 使用原生 img 标签，手机端兼容性最好 */}
          <img 
            src={src}
            alt=""
            onLoad={() => handleImageLoad(idx)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover', // 等同于 antd-mobile 的 fit="cover"
              display: 'block',
              // 图片未加载完成时透明，加载完成后瞬间显示，避免原生渲染的半截闪烁
              opacity: loadedImages[idx] ? 1 : 0,
              transition: 'opacity 0.2s ease-in' // 加一个极短的渐显动画，让“突然出现”变得柔和
            }}
          />
        </div>
      ))}
    </div>
  );
}
