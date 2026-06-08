const fs = require('fs')
const path = require('path')

const libDir = path.join(__dirname, '..', 'functions', 'lib')
fs.mkdirSync(libDir, { recursive: true })

const indexJs = path.join(libDir, 'index.js')
if (!fs.existsSync(indexJs)) {
  console.error(
    'functions/lib/index.js no existe. Ejecutá: npm --prefix functions run build',
  )
  process.exit(1)
}

const jsFiles = fs.readdirSync(libDir, { recursive: true }).filter((f) => {
  if (typeof f !== 'string') return false
  return f.endsWith('.js')
})

if (jsFiles.length < 1) {
  console.error('functions/lib está vacío después del build.')
  process.exit(1)
}
