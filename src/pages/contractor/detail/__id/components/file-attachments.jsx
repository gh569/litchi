// src/pages/010-find-contractor/detail/__id/components/file-attachments.jsx
import { useLocation } from 'wouter-preact';
import { useNavigate } from '@utils/router';
import style from './file-attachments.module.css';

export default function ({ files }) {
	const navigate = useNavigate();

	const download = attachment => {
		const queryParams = `?url=${encodeURIComponent(attachment.url)}&fileName=${encodeURIComponent(attachment.fileName)}`;

		navigate('../../doc-viewer' + queryParams, { openInNewTab: true });
	};

	// 提取文件后缀名用于展示
	const getFileExt = fileName => {
		if (!fileName) return 'FILE';
		const parts = fileName.split('.');
		return parts.length > 1 ? parts.pop().toUpperCase() : 'FILE';
	};

	return (
		<div className={style['attachment-grid-wrapper']}>
			{files.map((attachment, index) => (
				<div key={index} className={style['attachment-item']} onClick={() => download(attachment)}>
					{/* 图标区 */}
					<div className={style['attachment-icon']}>
						<span className={style['file-ext-text']}>{getFileExt(attachment.fileName)}</span>
					</div>

					{/* 信息区 */}
					<div className={style['attachment-info']}>
						<div className={style['attachment-name']}>{attachment.fileName}</div>
						<div className={style['attachment-size']}>{attachment.size ? `${(attachment.size / 1024 / 1024).toFixed(2)} MB` : ''}</div>
					</div>
				</div>
			))}
		</div>
	);
}
