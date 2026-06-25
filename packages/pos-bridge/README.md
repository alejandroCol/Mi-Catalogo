# Morning POS Bridge

Servidor HTTP local que recibe bytes **ESC/POS** desde la app web Morning y los envía en modo RAW a la impresora térmica conectada por USB.

Compatible con:

- **Impresora:** Jaltech POS 58 mm (comandos Epson ESC/POS, 32 caracteres por línea)
- **Cajón:** SAT 119X conectado al puerto RJ11/RJ12 de la impresora

## Requisitos

1. Instalar el driver Jaltech en Windows (nombre típico: `JAL 58M`).
2. Conectar el cajón SAT 119X al puerto de cajón de la impresora con cable RJ11.
3. Poner la llave del cajón en **apertura eléctrica** (no manual ni cierre).
4. Compartir / registrar la impresora en Windows con el nombre exacto configurado en Admin → Sedes.

## Uso

Desde la raíz del monorepo:

```bash
npm install
npm run pos-bridge
```

El bridge escucha en `http://127.0.0.1:9123`.

### Endpoints

- `GET /health` — estado del servicio
- `POST /print` — cuerpo JSON `{ "printerName": "JAL 58M", "rawBase64": "..." }`

## Configuración en Morning

En **Admin → Sedes → Hardware POS** define:

- Nombre de impresora en Windows
- URL del bridge (default `http://127.0.0.1:9123`)
- Pin del cajón (pin 2 estándar Epson/Jaltech)

Al confirmar una venta en el panel de vendedora, la app imprime el ticket y abre el cajón si hay pago en efectivo.

## Solución de problemas

| Síntoma | Acción |
|--------|--------|
| «Impresora offline» en la app | Verifica que `npm run pos-bridge` esté corriendo |
| Imprime pero no abre cajón | Llave en posición eléctrica; prueba pin 5 en config |
| Caracteres raros | Normal en tildes; la app sanitiza a CP437 |
| Permiso denegado | Ejecuta terminal como administrador la primera vez |
