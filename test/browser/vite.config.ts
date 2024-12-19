import { defineConfig } from 'vite';
import path from "path";

export default defineConfig({
	resolve: {
		alias: {
			'@': path.resolve(__dirname, '../../src'),
			'@test': path.resolve(__dirname, '../'),
			'@resources': path.resolve(__dirname, '../resources')
		}
	},
	root: './test/browser',
	server: {
		port: 4000,
		open: false
	},
	build: {
		outDir: 'dist/tests',
		emptyOutDir: true
	}
});
