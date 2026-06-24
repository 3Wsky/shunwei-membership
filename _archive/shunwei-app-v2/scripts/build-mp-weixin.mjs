import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.env.UNI_INPUT_DIR = root

const result = spawnSync('uni', ['build', '-p', 'mp-weixin'], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
  cwd: root,
})

process.exit(result.status ?? 1)
