import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { ProductoDescuentoEditor, parseProductoDescuentoDraft, type ProductoDescuentoDraft } from '@/components/producto/ProductoDescuentoEditor'
import { ProductoEsRopaStep } from '@/components/producto/ProductoEsRopaStep'
import { ProductoFormSection } from '@/components/producto/ProductoFormSection'
import { ProductoImagenesEditor } from '@/components/producto/ProductoImagenesEditor'
import { ProductoOpcionToggle } from '@/components/producto/ProductoOpcionToggle'
import { ProductoTallasEditor } from '@/components/producto/ProductoTallasEditor'
import { ProductoVariantesEditor } from '@/components/producto/ProductoVariantesEditor'
import { useSaveSuccess } from '@/components/McSaveSuccessModal'
import type { VarianteDraftConArchivo } from '@/lib/productoVariantes'
import { getDb, getStorageApp, firebaseStorageConfigured } from '@/lib/firebase'
import { formatIntegerEsCo } from '@/lib/formatCop'
import { mcProductosCollection } from '@/lib/mcCollections'
import { mcCreateProducto, ProductLimitError } from '@/lib/mcWrites'
import { uploadProductoImagenes, uploadVarianteImagen, type ProductoImagenDraft } from '@/lib/productoImagenes'
import {
  buildTallasFromDrafts,
  createCurvaTallasDraft,
  sumarStockTallas,
  type TallaDraft,
} from '@/lib/productoTallas'
import {
  buildVarianteFromDraft,
  parsePrecioVarianteOpcional,
  sumarStockVariantes,
  variantesConStockDefinido,
} from '@/lib/productoVariantes'
import type { McPlatformSettings, McProductoVariante, McTenant } from '@/types/mc'

export function QuickAddProductModal({
  tenantId,
  platformSettings,
  nextOrden,
  onClose,
}: {
  tenantId: string
  tenant: McTenant
  platformSettings: McPlatformSettings | null
  currentCount: number
  nextOrden: number
  onClose: () => void
}) {
  const [step, setStep] = useState<'ropa' | 'form'>('ropa')
  const [esRopa, setEsRopa] = useState(false)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [precio, setPrecio] = useState('')
  const [stock, setStock] = useState('')
  const [tallas, setTallas] = useState<TallaDraft[]>(() => createCurvaTallasDraft())
  const [imagenes, setImagenes] = useState<ProductoImagenDraft[]>([])
  const [coverId, setCoverId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [marcarNovedad, setMarcarNovedad] = useState(false)
  const [mostrarDescargaImagen, setMostrarDescargaImagen] = useState(false)
  const [descuento, setDescuento] = useState<ProductoDescuentoDraft>(() => ({
    activo: false,
    tipo: 'porcentaje',
    valor: '',
  }))
  const [variantes, setVariantes] = useState<VarianteDraftConArchivo[]>([])

  const { showSaveSuccess } = useSaveSuccess()
  const tieneVariantes = variantes.length > 0

  function onPrecioChange(raw: string) {
    const digits = raw.replace(/\D/g, '')
    if (digits === '') {
      setPrecio('')
      return
    }
    const n = Number(digits)
    if (!Number.isFinite(n)) {
      setPrecio('')
      return
    }
    setPrecio(formatIntegerEsCo(n))
  }

  function onStockChange(raw: string) {
    setStock(raw.replace(/\D/g, ''))
  }

  function buildVariantesForSave(rows: VarianteDraftConArchivo[]): McProductoVariante[] {
    const built: McProductoVariante[] = []
    for (const v of rows) {
      const item = buildVarianteFromDraft(v)
      if (!item) continue
      if (esRopa) delete item.stock
      built.push(item)
    }
    return built
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    const precioNum = Number(precio.replace(/\D/g, ''))
    const stockNum = Number(stock.replace(/\D/g, ''))
    if (!nombre.trim()) {
      setErr('Poné un nombre corto.')
      return
    }
    if (!Number.isFinite(precioNum) || precioNum < 0) {
      setErr('Precio inválido.')
      return
    }

    const descParsed = parseProductoDescuentoDraft(descuento, precioNum)
    if (!descParsed.ok) {
      setErr(descParsed.error)
      return
    }

    for (const v of variantes) {
      if (!v.nombre.trim()) continue
      if (v.precio.trim() && parsePrecioVarianteOpcional(v.precio) == null) {
        setErr(`Precio opcional inválido en variante «${v.nombre.trim()}».`)
        return
      }
    }

    const varianteRows = variantes.filter((v) => v.nombre.trim())
    const builtTallas = esRopa ? buildTallasFromDrafts(tallas) : []
    if (esRopa && sumarStockTallas(builtTallas) <= 0) {
      setErr('Indicá stock en al menos una talla.')
      return
    }

    const needsStorage =
      imagenes.length > 0 || varianteRows.some((v) => v.file)
    if (needsStorage && !firebaseStorageConfigured) {
      setErr('Firebase Storage no está configurado; no se pueden subir imágenes.')
      return
    }

    const builtVar = buildVariantesForSave(varianteRows)

    let stockFinal = Number.isFinite(stockNum) ? stockNum : 0
    if (esRopa) {
      stockFinal = sumarStockTallas(builtTallas)
    } else if (builtVar.length > 0 && variantesConStockDefinido(builtVar)) {
      stockFinal = sumarStockVariantes(builtVar)
    }

    setBusy(true)
    try {
      const { id: productId } = await mcCreateProducto(
        tenantId,
        {
          nombre: nombre.trim(),
          ...(descripcion.trim() ? { descripcion: descripcion.trim() } : {}),
          precioCop: precioNum,
          stock: stockFinal,
          activo: true,
          enCatalogo: true,
          orden: nextOrden,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          ...(esRopa ? { esRopa: true, tallas: builtTallas } : {}),
          ...(marcarNovedad ? { marcarNovedad: true } : {}),
          ...(mostrarDescargaImagen ? { mostrarDescargaImagen: true } : {}),
          ...descParsed.fields,
          ...(builtVar.length > 0 ? { variantes: builtVar } : {}),
        },
        platformSettings,
      )

      const patch: Record<string, unknown> = {}

      if (imagenes.length > 0 && firebaseStorageConfigured) {
        const storage = getStorageApp()
        const uploaded = await uploadProductoImagenes(storage, tenantId, productId, imagenes, coverId)
        if (uploaded.imageUrl) patch.imageUrl = uploaded.imageUrl
        if (uploaded.galeriaImagenes) patch.galeriaImagenes = uploaded.galeriaImagenes
      }

      const variantesConFoto = varianteRows.filter((v) => v.file)
      if (variantesConFoto.length > 0 && firebaseStorageConfigured) {
        const storage = getStorageApp()
        const nextVariantes = [...builtVar]
        for (const row of varianteRows) {
          if (!row.file) continue
          const idx = nextVariantes.findIndex((v) => v.id === row.id)
          if (idx < 0) continue
          const url = await uploadVarianteImagen(storage, tenantId, productId, row.id, row.file)
          nextVariantes[idx] = { ...nextVariantes[idx]!, imageUrl: url }
        }
        patch.variantes = nextVariantes
      }

      if (Object.keys(patch).length > 0) {
        await updateDoc(doc(getDb(), mcProductosCollection(tenantId), productId), patch)
      }

      showSaveSuccess({
        title: 'Producto agregado',
        message: 'Ya está en tu inventario y visible según la configuración del catálogo.',
      })
      onClose()
    } catch (e) {
      if (e instanceof ProductLimitError) {
        setErr(e.message)
      } else {
        setErr('No se pudo guardar. Revisá conexión y reglas de Firebase.')
      }
    } finally {
      setBusy(false)
    }
  }

  if (step === 'ropa') {
    return (
      <ProductoEsRopaStep
        onClose={onClose}
        onSelect={(ropa) => {
          setEsRopa(ropa)
          if (ropa) setTallas(createCurvaTallasDraft())
          setStep('form')
        }}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" role="dialog">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Cerrar" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-neutral-200/50 bg-neutral-50 p-5 sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="ios-headline">Agregar producto</h2>
            <p className="ios-footnote mt-1.5 text-mc-600">
              {esRopa
                ? 'Prenda de vestir: stock por talla y variantes de color o tela.'
                : 'Subí fotos, completá los datos y guardá.'}
            </p>
          </div>
          {esRopa ? (
            <span className="shrink-0 rounded-full bg-mc-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              Ropa
            </span>
          ) : null}
        </div>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <ProductoFormSection>
            <ProductoImagenesEditor
              items={imagenes}
              coverId={coverId}
              onChange={(next, nextCover) => {
                setImagenes(next)
                setCoverId(nextCover)
              }}
              disabled={busy}
              capture="environment"
            />
          </ProductoFormSection>

          <ProductoFormSection title="Información básica">
            <div className="space-y-3">
              <div>
                <label className="ios-footnote font-medium text-mc-700">Nombre</label>
                <input className="mc-input bg-white" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </div>
              <div>
                <label className="ios-footnote font-medium text-mc-700">Descripción (opcional)</label>
                <textarea
                  className="mc-input mt-1.5 min-h-[5.5rem] resize-y bg-white py-2.5 text-[15px] leading-relaxed"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Material, medidas, cuidados, variantes disponibles…"
                  rows={3}
                />
              </div>
            </div>
          </ProductoFormSection>

          <ProductoFormSection title="Precio y stock">
            {esRopa ? (
              <div className="space-y-4">
                <div>
                  <label className="ios-footnote font-medium text-mc-700">Precio base (COP)</label>
                  <input
                    className="mc-input mt-1.5 bg-white"
                    inputMode="numeric"
                    value={precio}
                    onChange={(e) => onPrecioChange(e.target.value)}
                    placeholder="25.000"
                    autoComplete="off"
                  />
                </div>
                <ProductoTallasEditor tallas={tallas} onChange={setTallas} disabled={busy} />
              </div>
            ) : (
              <div className={tieneVariantes ? 'space-y-2' : 'grid grid-cols-2 gap-3'}>
                <div>
                  <label className="ios-footnote font-medium text-mc-700">Precio base (COP)</label>
                  <input
                    className="mc-input mt-1.5 bg-white"
                    inputMode="numeric"
                    value={precio}
                    onChange={(e) => onPrecioChange(e.target.value)}
                    placeholder="25.000"
                    autoComplete="off"
                  />
                </div>
                {!tieneVariantes ? (
                  <div>
                    <label className="ios-footnote font-medium text-mc-700">Stock</label>
                    <input
                      className="mc-input mt-1.5 bg-white"
                      inputMode="numeric"
                      value={stock}
                      onChange={(e) => onStockChange(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                ) : (
                  <p className="text-[12px] leading-relaxed text-mc-600">
                    Con variantes, el stock se define en cada opción abajo.
                  </p>
                )}
              </div>
            )}
          </ProductoFormSection>

          <ProductoDescuentoEditor
            draft={descuento}
            onChange={setDescuento}
            precioBaseCop={Number(precio.replace(/\D/g, '')) || 0}
            disabled={busy}
          />

          <ProductoVariantesEditor
            variantes={variantes}
            onChange={setVariantes}
            allowImage
            esRopa={esRopa}
            disabled={busy}
          />

          <ProductoFormSection>
            <div className="space-y-2.5">
              <ProductoOpcionToggle
                checked={marcarNovedad}
                onChange={setMarcarNovedad}
                disabled={busy}
                title="Destacar como novedad siempre"
                description="Además del período automático de 3 semanas desde el alta."
              />
              <ProductoOpcionToggle
                checked={mostrarDescargaImagen}
                onChange={setMostrarDescargaImagen}
                disabled={busy}
                title="Mostrar botón «Descargar imagen»"
                description="Ideal para mayoristas que necesitan bajar la foto desde el catálogo."
              />
            </div>
          </ProductoFormSection>

          {err && <p className="ios-subhead text-red-800">{err}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" className="mc-btn-secondary flex-1" onClick={() => setStep('ropa')}>
              Atrás
            </button>
            <button type="submit" disabled={busy} className="mc-btn-primary flex-1">
              {busy ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
