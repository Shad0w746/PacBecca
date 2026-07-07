import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist-squarespace",
    emptyOutDir: true,
    rollupOptions: {
      external: ["phaser"],
      output: {
        paths: {
          phaser: "https://esm.sh/phaser@3.90.0"
        }
      }
    }
  }
});
