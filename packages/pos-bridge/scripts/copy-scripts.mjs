import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const distScripts = join(root, 'dist', 'scripts')

mkdirSync(distScripts, { recursive: true })
for (const f of ['print-raw.ps1', 'list-printers.ps1']) {
  copyFileSync(join(root, 'scripts', f), join(distScripts, f))
}
console.log('Scripts PS copiados a dist/scripts/')
