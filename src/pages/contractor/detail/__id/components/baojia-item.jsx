import  copyTextToClipboard  from '@utils/copy-to-clipboard';
import { useSignal } from '@preact/signals';
import AttachmentsComponent from './attachments';
import style from './baojia-item.module.css';

// 格式化日期，只显示日期部分，年份只显示后两位
const formatDate = dateString => {
	if (!dateString) return '';
	const date = new Date(dateString);
	const year = date.getFullYear().toString().slice(-2); // 只取年份后两位
	const month = (date.getMonth() + 1).toString().padStart(2, '0'); // 补零
	const day = date.getDate().toString().padStart(2, '0'); // 补零
	return `${year}/${month}/${day}`;
};


// 

export default function ({ item,index }) {
	const openFlag = useSignal(false);
	const withComment=useSignal(false)
	
	
	const copy =(str) => {
		let strCpy=str
		if(!withComment.value){
			strCpy=strCpy.replace(/^\s*#.*/gm,'')
		}
		copyTextToClipboard(strCpy)
	}

	return (
		<div className={style['card-wrapper']}>
			{/* 头部区域：标题、时间、复制按钮 */}
			<div className={style['card-header']}>
				<h1 className={style['title1']}>{item.title}</h1>
				<div className={style['header-right']}>
					<span className={style['time']}>{formatDate(item.updateTime)}</span>
				</div>
			</div>

			{/* 内容区域 */}
			<div className={style['card-body']}>
				<div className={style['case-content']}>
					<div className={style['copy-button-container']}>
						<span ><input type='checkbox' value={withComment.value} onChange={(e)=>withComment.value= e.target.checked} />带注释</span>
						<button className={style['btn-copy']} onClick={()=>copy(item.context)}>
							复制文本
						</button>
					</div>

					<div className={openFlag.value ? `${style['content-text']} full-height` : `${style['content-text']} ${style['text-clamp']}`}>{item.context}</div>
					<div className={style['container-zhedie']}>
						<button className={style['zhedie-btn']} onClick={() => (openFlag.value = !openFlag.value)}>
							{openFlag.value ? '收起内容 ▲' : '展开全文 ▼'}
						</button>
					</div>
				</div>

				<div className={style['attachments-area']}>
					{item.attachments && Array.isArray(item.attachments)  && <AttachmentsComponent attachments={item.attachments} index={index} />}
				</div>
			</div>
		</div>
	);
}
