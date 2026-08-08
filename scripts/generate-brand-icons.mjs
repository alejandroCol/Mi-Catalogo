/**
 * Genera PNG/ICO/OG desde el SVG de marca (Playwright).
 * Uso: node scripts/generate-brand-icons.mjs
 */
import { chromium } from 'playwright'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const brandDir = path.join(root, 'public', 'brand')

const svgPath = path.join(brandDir, 'mi-catalogo-icon.svg')
const svg = await readFile(svgPath, 'utf8')

const sizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'favicon-48x48.png', size: 48 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
]

const ogHtml = `<!doctype html>
<html><head><meta charset="utf-8" />
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter+Tight:wght@500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1200px; height: 630px;
    background: linear-gradient(145deg, #faf9f7 0%, #f0ebe3 48%, #e8e0d4 100%);
    font-family: 'Inter Tight', system-ui, sans-serif;
    color: #3F3D45;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }
  body::before {
    content: '';
    position: absolute;
    inset: -20%;
    background:
      radial-gradient(ellipse 50% 40% at 15% 80%, rgba(197,163,103,0.22), transparent 55%),
      radial-gradient(ellipse 40% 35% at 90% 20%, rgba(63,61,69,0.06), transparent 50%);
  }
  .card {
    position: relative;
    width: 1080px;
    display: flex;
    align-items: center;
    gap: 56px;
  }
  .mark {
    width: 220px; height: 220px; flex-shrink: 0;
    border-radius: 48px;
    background: #faf9f7;
    box-shadow: 0 24px 60px rgba(63,61,69,0.12);
    display: grid; place-items: center;
  }
  .mark svg { width: 168px; height: 168px; }
  .copy { max-width: 720px; }
  .brand {
    font-family: 'DM Serif Display', Georgia, serif;
    font-size: 72px;
    letter-spacing: -0.02em;
    line-height: 1.05;
    margin-bottom: 20px;
  }
  .brand span { color: #C5A367; }
  .line {
    font-size: 34px;
    font-weight: 500;
    line-height: 1.35;
    color: #5a5860;
    max-width: 28ch;
  }
  .url {
    margin-top: 28px;
    font-size: 22px;
    font-weight: 600;
    color: #C5A367;
    letter-spacing: 0.02em;
  }
</style></head>
<body>
  <div class="card">
    <div class="mark">${svg.replace('viewBox="0 0 64 64"', 'viewBox="0 0 64 64" width="168" height="168"')}</div>
    <div class="copy">
      <div class="brand">mi <span>catálogo</span></div>
      <p class="line">Tu tienda online y catálogo WhatsApp. Empezá gratis, sin tarjeta.</p>
      <p class="url">micatalogo.io</p>
    </div>
  </div>
</body></html>`

async function renderSvgPng(browser, size, outPath) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  })
  const html = `<!doctype html><html><head><style>
    html,body{margin:0;width:${size}px;height:${size}px;background:transparent}
    svg{display:block;width:100%;height:100%}
  </style></head><body>${svg}</body></html>`
  await page.setContent(html, { waitUntil: 'networkidle' })
  await page.screenshot({ path: outPath, omitBackground: true })
  await page.close()
}

function pngToIco(png48) {
  // ICO con un solo PNG embebido (soportado por navegadores modernos)
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(1, 4)

  const entry = Buffer.alloc(16)
  entry[0] = 48
  entry[1] = 48
  entry[2] = 0
  entry[3] = 0
  entry.writeUInt16LE(1, 4)
  entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(png48.length, 8)
  entry.writeUInt32LE(22, 12)

  return Buffer.concat([header, entry, png48])
}

await mkdir(brandDir, { recursive: true })

const browser = await chromium.launch()
try {
  for (const { name, size } of sizes) {
    const out = path.join(brandDir, name)
    await renderSvgPng(browser, size, out)
    console.log('wrote', name)
  }

  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  })
  await page.setContent(ogHtml, { waitUntil: 'networkidle' })
  await page.screenshot({ path: path.join(brandDir, 'og-image.png') })
  await page.close()
  console.log('wrote og-image.png')
} finally {
  await browser.close()
}

const png48 = await readFile(path.join(brandDir, 'favicon-48x48.png'))
const ico = pngToIco(png48)
await writeFile(path.join(brandDir, 'favicon.ico'), ico)
await writeFile(path.join(root, 'public', 'favicon.ico'), ico)
await writeFile(
  path.join(root, 'public', 'apple-touch-icon.png'),
  await readFile(path.join(brandDir, 'apple-touch-icon.png')),
)
console.log('wrote favicon.ico (+ public root copies)')
