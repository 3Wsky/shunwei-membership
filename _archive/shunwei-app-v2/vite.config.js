import path from 'node:path'
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

// 本项目 manifest/pages 在根目录而非 src/，需显式指定输入目录
process.env.UNI_INPUT_DIR = path.resolve(__dirname)

export default defineConfig({
  plugins: [uni()],
})
