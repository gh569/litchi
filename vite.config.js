import { defineConfig, loadEnv } from "vite";
import preact from "@preact/preset-vite";
import { fileURLToPath, URL } from 'node:url'
import { cloudflare } from '@cloudflare/vite-plugin'



// 公共别名，抽离出来，所有分支共用，避免每个分支重复写、漏写
const sharedAlias = {
  '@utils': fileURLToPath(new URL('./src/components/_utils', import.meta.url)),
  '@com': fileURLToPath(new URL('./src/components', import.meta.url)),
  // '@supa': fileURLToPath(new URL('./src/components/_supabase', import.meta.url)),
}

// ✅ 修复入参！{command, mode}
export default defineConfig(({ command, mode }) => {
	const env = loadEnv(mode, process.cwd(), "VITE_");

	

	return {
		base: "./",
		
		plugins: [
			
			preact(),
			 cloudflare(),
		],
		build: {
			outDir: "./dist",
		},
		resolve: {
			alias: sharedAlias,
		},
	};

	

});
