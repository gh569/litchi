// src/pages/case/search/page.jsx
import { useState, useEffect, useRef } from 'preact/hooks';
import TableHeader from '@com/table-header';
import { useNavigate } from '@utils/router';
import styles from './find-contractor.module.css';

export default function SearchPage() {
	const [keyword, setKeyword] = useState('');
	const [recentSearches, setRecentSearches] = useState([]); // 结构改为 [{name, id}]
	const [showRecentSearches, setShowRecentSearches] = useState(true);
	const [options, setOptions] = useState([]);
	const [showDropdown, setShowDropdown] = useState(false);
	const [loading, setLoading] = useState(false);
	
	const dropdownRef = useRef(null);
	const fetchTimerRef = useRef(null); // 优化：使用 useRef 存储定时器，避免闭包陷阱
	const isComposingRef = useRef(false); // 优化：使用 ref 记录输入法组合状态，避免不必要的渲染
	
	const navigate=useNavigate()

	useEffect(() => {
		const savedSearches = localStorage.getItem('recentSearchesPQ');
		if (savedSearches) setRecentSearches(JSON.parse(savedSearches));
	}, []);

	useEffect(() => {
		const handleClickOutside = (e) => {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
				setShowDropdown(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	// 修改：同时保存名称和 id
	const saveSearch = (name, id) => {
		// 过滤掉同名的历史记录，将最新的放在最前面
		const filtered = recentSearches.filter(item => item.name !== name);
		const updatedSearches = [{ name, id }, ...filtered].slice(0, 20);
		setRecentSearches(updatedSearches);
		localStorage.setItem('recentSearchesPQ', JSON.stringify(updatedSearches));
	};

	const navigateToDetail = (id) => {
		navigate(`./detail/${encodeURIComponent(id)}`);
	};

	const fetchConstructor = async (keyword) => {
		const response = await fetch('/api/contractor?q=' + encodeURIComponent(keyword));
		
		return await response.json();
	};

	const handleSelect = (item) => {
		setKeyword(item.builder);
		setShowDropdown(false);
		saveSearch(item.builder, item.id); // 保存名称和 id
		navigateToDetail(item.id);
	};

	const fetchData = async (searchText) => {
		if (!searchText.trim()) {
			setOptions([]);
			setShowDropdown(false);
			return;
		}
		
		setLoading(true);
		try {
			const data = await fetchConstructor(searchText);
			setOptions(data);
			setShowDropdown(data.length > 0);
		} catch (error) {
			console.error('拉取施工方数据失败:', error);
			setOptions([]);
			setShowDropdown(false);
		} finally {
			setLoading(false);
		}
	};

	const handleInput = (e) => {
		const value = e.target.value;
		setKeyword(value);
		setShowRecentSearches(false);

		// 优化：如果正在使用输入法输入（如拼音状态），则不触发查询
		if (isComposingRef.current) return;

		// 优化：使用 ref 清除定时器，确保能正确清除上一次的定时器
		if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
		fetchTimerRef.current = setTimeout(() => fetchData(value), 300);
	};

	// 优化：输入法开始组合输入时触发
	const handleCompositionStart = () => {
		isComposingRef.current = true;
	};

	// 优化：输入法组合完成确认文字时触发
	const handleCompositionEnd = (e) => {
		isComposingRef.current = false;
		// 组合结束后，手动触发一次查询
		handleInput(e);
	};

	const handleFocus = () => {
		if (keyword.trim()) {
			fetchData(keyword);
		} else {
			setShowRecentSearches(true);
		}
	};

	// 优化：点击历史记录直接使用本地存储的 id 跳转，零延迟
	const handleRecentSearchClick = (searchItem) => {
		setKeyword(searchItem.name);
		saveSearch(searchItem.name, searchItem.id); // 保存名称和 id
		navigateToDetail(searchItem.id);
	};

	const clearRecentSearches = () => {
		setRecentSearches([]);
		localStorage.removeItem('recentSearchesPQ');
	};

	return (
		<div>
			<TableHeader
				title="搜索装修公司"
				showBack={true}
				onBack={() => history.back()}
				actions={
					<button className={styles['recycle-bin-btn']} onClick={() => alert('暂不支持')}>
						回收站
					</button>
				}
			/>

			<div className={styles['search-container']}>
				<div className={styles['search-box-wrapper']} ref={dropdownRef}>
					<div className={styles['search-box']}>
						<input
							type="text"
							value={keyword}
							onInput={handleInput}
							onFocus={handleFocus}
							onCompositionStart={handleCompositionStart}
							onCompositionEnd={handleCompositionEnd}
							placeholder="请输入施工方名称搜索..."
							className={styles['search-input']}
						/>
						{loading && <span className={styles['loading-icon']}>⏳</span>}
					</div>

					{showDropdown && (
						<div className={styles['dropdown-list']}>
							{options.map((item, index) => (
								<div 
									key={item._id || index} 
									className={styles['dropdown-item']}
									onMouseDown={(e) => e.preventDefault()}
									onClick={() => handleSelect(item)}
								>
									{item.builder}
								</div>
							))}
						</div>
					)}
				</div>

				{recentSearches.length > 0 && (
					<div className={`${styles['recent-searches']} ${styles.card}`}>
						<div className={styles['section-header']}>
							<h3 className={styles['section-header-title']}><span className={styles.icon}></span> 最近搜索</h3>
							<button className={styles['clear-btn']} onClick={clearRecentSearches}>清除记录</button>
						</div>
						<div className={styles['tags-container']}>
							{/* 遍历时使用 searchItem.name 和 searchItem.id */}
							{recentSearches.map((searchItem, index) => (
								<button key={index} className={`${styles['tag-item']} ${styles.outline}`} onClick={() => handleRecentSearchClick(searchItem)}>
									{searchItem.name}
								</button>
							))}
						</div>
					</div>
				)}

				<div className={`${styles['search-tips']} ${styles.card}`}>
					<div className={styles['section-header']}>
						<h3 className={styles['section-header-title']}><span className={styles.icon}></span> 搜索提示</h3>
					</div>
					<ul className={styles['tips-list']}>
						<li className={styles['tip-item']}>输入施工方名称，自动从数据库拉取匹配项</li>
						<li className={styles['tip-item']}>点击下拉列表中的项，直接跳转至对应页面</li>
						<li className={styles['tip-item']}>支持模糊搜索，快速定位目标施工方</li>
					</ul>
				</div>
			</div>
		</div>
	);
}
