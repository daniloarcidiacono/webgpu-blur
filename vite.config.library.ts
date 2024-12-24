import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vite";
import dtsBundleGenerator from 'vite-plugin-dts-bundle-generator';

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    dtsBundleGenerator({
      fileName: 'index.d.ts',
    })
  ],
  build: {
    lib: {
      entry: [
        "./src/lib.ts"
      ],
      fileName: (format) => `index.js`,
      formats: ["es"]
    },
    outDir: "lib",
    emptyOutDir: true,
    copyPublicDir: false,
    rollupOptions: {
      external: []
    }
  },
  esbuild: {
    minifySyntax: true,
    minifyIdentifiers: true,
    minifyWhitespace: true
  },
});
