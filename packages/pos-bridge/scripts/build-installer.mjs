#!/usr/bin/env node
/**
 * Genera public/downloads/micatalogo-pos-bridge-win.zip (instalador Windows).
 */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgRoot = resolve(__dirname, '..')
const repoRoot = resolve(pkgRoot, '../..')
const staging = join(pkgRoot, '.installer-staging')
const bridgeStaging = join(staging, 'bridge')
const outDir = join(repoRoot, 'public/downloads')
const outZip = join(outDir, 'micatalogo-pos-bridge-win.zip')

function run(cmd, cwd) {
  execSync(cmd, { cwd, stdio: 'inherit' })
}

console.log('Compilando pos-bridge…')
run('npm run build', pkgRoot)

rmSync(staging, { recursive: true, force: true })
mkdirSync(bridgeStaging, { recursive: true })

cpSync(join(pkgRoot, 'dist'), join(bridgeStaging, 'dist'), { recursive: true })

const pkgJson = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf8'))
const prodPkg = {
  name: pkgJson.name,
  version: pkgJson.version,
  type: pkgJson.type,
  private: true,
  dependencies: pkgJson.dependencies,
}
writeFileSync(join(bridgeStaging, 'package.json'), JSON.stringify(prodPkg, null, 2))

cpSync(join(pkgRoot, 'installer/INSTALAR.bat'), join(staging, 'INSTALAR.bat'))
cpSync(join(pkgRoot, 'installer/INICIAR-PUENTE.bat'), join(staging, 'INICIAR-PUENTE.bat'))
cpSync(join(pkgRoot, 'installer/register-startup.ps1'), join(staging, 'register-startup.ps1'))
cpSync(join(pkgRoot, 'installer/LISTAR-IMPRESORAS.bat'), join(staging, 'LISTAR-IMPRESORAS.bat'))

mkdirSync(outDir, { recursive: true })
rmSync(outZip, { force: true })

try {
  run(`zip -r "${outZip}" .`, staging)
} catch {
  console.error('Se requiere el comando zip (macOS/Linux). En Windows usa WSL o 7-Zip.')
  process.exit(1)
}

rmSync(staging, { recursive: true, force: true })
console.log(`\nInstalador generado: ${outZip}`)
