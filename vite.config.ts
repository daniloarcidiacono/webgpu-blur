import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vite";

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true, // also necessary
  },
	plugins: [tsconfigPaths()]
});
