import express from 'express';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);
const PORT = Number(process.env.POS_BRIDGE_PORT ?? 9123);
const HOST = process.env.POS_BRIDGE_HOST ?? '127.0.0.1';
const VERSION = '1.0.2';
const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = join(__dirname, 'scripts');
function corsPos(req, res, next) {
    const origin = req.headers.origin;
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }
    next();
}
async function runPs1(scriptName, args) {
    const script = join(SCRIPTS_DIR, scriptName);
    if (!existsSync(script)) {
        throw new Error(`Script ${scriptName} no encontrado. Reinstala el puente POS v${VERSION}.`);
    }
    const { stdout, stderr } = await execFileAsync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, ...args], { timeout: 25000, encoding: 'utf8' });
    return { stdout: String(stdout), stderr: String(stderr) };
}
async function listWindowsPrinters() {
    const { stdout } = await runPs1('list-printers.ps1', []);
    return stdout
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
}
function parseWindowsPrintError(err, requested) {
    const msg = err instanceof Error
        ? err.message
        : typeof err === 'object' && err && 'stderr' in err
            ? String(err.stderr ?? '')
            : String(err);
    const notFound = msg.match(/MORNING_PRINTER_NOT_FOUND\|([^|]+)\|(.+)/);
    if (notFound) {
        const [, req, list] = notFound;
        return `Impresora «${req}» no encontrada en Windows. Nombres detectados: ${list}. Copia el nombre exacto en Admin → Sedes → Hardware POS.`;
    }
    const failed = msg.match(/MORNING_PRINT_FAILED\|([^|]+)\|(.+)/);
    if (failed) {
        const [, name, list] = failed;
        return `Windows no pudo imprimir en «${name}». Verifica que esté encendida y en línea. Otras impresoras: ${list}`;
    }
    if (msg.includes('Command failed')) {
        return `Error al imprimir en «${requested}». Abre http://127.0.0.1:${PORT}/printers para ver el nombre exacto en Windows.`;
    }
    return msg.slice(0, 400);
}
async function printRawWindows(printerName, data) {
    const dir = mkdtempSync(join(tmpdir(), 'morning-pos-'));
    const file = join(dir, 'ticket.bin');
    writeFileSync(file, data);
    try {
        const { stdout } = await runPs1('print-raw.ps1', ['-PrinterName', printerName, '-FilePath', file]);
        const line = stdout.trim().split('\n').pop() ?? '';
        const m = line.match(/^OK\|(.+)$/);
        return m?.[1]?.trim() ?? printerName;
    }
    catch (e) {
        const execErr = e;
        const combined = [execErr.stderr, execErr.stdout, execErr.message].filter(Boolean).join('\n');
        throw new Error(parseWindowsPrintError(combined, printerName));
    }
}
async function printRawUnix(printerName, data) {
    const dir = mkdtempSync(join(tmpdir(), 'morning-pos-'));
    const file = join(dir, 'ticket.bin');
    writeFileSync(file, data);
    await execFileAsync('lp', ['-d', printerName, '-o', 'raw', file], { timeout: 20000 });
    return printerName;
}
async function printRaw(printerName, data) {
    const name = printerName.trim();
    if (!name) {
        throw new Error('Indica printerName (nombre exacto de la impresora en Windows)');
    }
    if (process.platform === 'win32') {
        return printRawWindows(name, data);
    }
    return printRawUnix(name, data);
}
const app = express();
app.use(corsPos);
app.use(express.json({ limit: '2mb' }));
app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'morning-pos-bridge', port: PORT, version: VERSION });
});
app.get('/printers', async (_req, res) => {
    try {
        if (process.platform !== 'win32') {
            res.json({ ok: true, printers: [] });
            return;
        }
        const printers = await listWindowsPrinters();
        res.json({ ok: true, printers, hint: 'Usa el nombre exacto en Admin → Sedes → Hardware POS' });
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : 'No se pudieron listar impresoras';
        res.status(500).json({ ok: false, error: msg });
    }
});
app.post('/print', async (req, res) => {
    const body = req.body;
    if (!body.rawBase64?.trim()) {
        res.status(400).json({ ok: false, error: 'rawBase64 requerido' });
        return;
    }
    try {
        const data = Buffer.from(body.rawBase64, 'base64');
        const usedPrinter = await printRaw(body.printerName ?? '', data);
        res.json({ ok: true, bytes: data.length, printer: usedPrinter });
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : 'Error al imprimir';
        console.error('[pos-bridge]', msg);
        res.status(500).json({ ok: false, error: msg });
    }
});
app.listen(PORT, HOST, () => {
    console.log(`Morning POS bridge v${VERSION} → http://${HOST}:${PORT}`);
    console.log('GET /printers — listar impresoras Windows');
});
