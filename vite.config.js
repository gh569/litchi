import {
	defineConfig,
	loadEnv
} from "vite";
import preact from "@preact/preset-vite";
import {
	fileURLToPath,
	URL
} from 'node:url'



// 公共别名，抽离出来，所有分支共用，避免每个分支重复写、漏写
const sharedAlias = {
	'@utils': fileURLToPath(new URL('./src/components/_utils', import.meta.url)),
	'@com': fileURLToPath(new URL('./src/components', import.meta.url)),
	// '@supa': fileURLToPath(new URL('./src/components/_supabase', import.meta.url)),
}

// ✅ 修复入参！{command, mode}
export default defineConfig(({
	command,
	mode
}) => {
	const env = loadEnv(mode, process.cwd(), "VITE_");

	// 开发模式：前端 vite dev(5173) + 后端 wrangler functions(8787)
	// 通过 proxy 把 /api 转发到 wrangler，改源码即时热更新，不构建产物
	const proxyTarget = 'http://localhost:8787';

	return {
		base: "/",
		server: {
			proxy: {
				'/api': {
					target: proxyTarget,
					changeOrigin: true,
				}
			}
		},
		plugins: [

			preact(),
		],
		build: {
			outDir: "./dist",
		},
		resolve: {
			alias: sharedAlias,
		},
	};
});