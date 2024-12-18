import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
    plugins: [vue()],
    build: {
        lib: {
            entry: "./src/index.js",          // 指定入口文件
            name: "VueAVCall",           // 库的全局名称
            fileName: (format) => `vue-av-call.${format}.js`,
            cssFileName: (format) => `vue-av-call.${format}.css`
        },
        rollupOptions: {
            external: ["vue"],               // Vue 不打包
            output: {
                globals: {
                    vue: "Vue",
                },
            },
        }
    }
});
