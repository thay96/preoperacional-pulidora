import { jsPDF } from 'jspdf'

// ===== Utilidad: carga una imagen desde URL o ruta → base64 =====
async function cargarImagenComoBase64(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/jpeg', 0.9))
    }
    img.onerror = reject
    img.src = src
  })
}

// ===== Generar el PDF del preoperacional =====
export async function generarPDFPreoperacional(datos, items, fotoUrl) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const anchoPag = 210
  const margen   = 15
  const alturaPag = 297
  let y = 15

  const verdeOscuro = [46, 125, 50]
  const verdeClaro  = [95, 175, 60]
  const gris        = [120, 120, 120]
  const negro       = [30, 30, 30]

  // ===== 1. HEADER con logo =====
  try {
    const logoBase64 = await cargarImagenComoBase64('/imag/conequipos.png')
    doc.addImage(logoBase64, 'PNG', margen, y, 32, 32)
  } catch (e) {
    console.warn('No se pudo cargar el logo:', e)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...verdeOscuro)
  doc.text('PREOPERACIONAL PULIDORA', anchoPag / 2, y + 12, { align: 'center' })

  doc.setFontSize(8)
  doc.setTextColor(...gris)
  doc.setFont('helvetica', 'normal')
  doc.text('CÓDIGO: SG-SST-F-99', anchoPag - margen, y + 6,  { align: 'right' })
  doc.text('VERSIÓN: 1',          anchoPag - margen, y + 11, { align: 'right' })
  doc.text('FECHA: 04/07/2023',   anchoPag - margen, y + 16, { align: 'right' })

  y += 38
  doc.setDrawColor(...verdeClaro)
  doc.setLineWidth(0.8)
  doc.line(margen, y, anchoPag - margen, y)
  y += 8

  // ===== 2. DATOS GENERALES =====
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...verdeOscuro)
  doc.text('1. DATOS GENERALES', margen, y)
  y += 7

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...negro)

  const colIzq = margen
  const colDer = anchoPag / 2 + 5

  doc.text(`Obra: ${datos.obra}`,               colIzq, y)
  doc.text(`Fecha desde: ${datos.fecha_desde}`, colDer, y); y += 6
  doc.text(`Ubicación: ${datos.ubicacion}`,     colIzq, y)
  doc.text(`Fecha hasta: ${datos.fecha_hasta}`, colDer, y); y += 6
  doc.text(`Registrado: ${datos.created_at || new Date().toLocaleString('es-CO')}`, colIzq, y)
  y += 10

  // ===== 3. VERIFICACIÓN DEL EQUIPO =====
  doc.setDrawColor(...verdeClaro)
  doc.line(margen, y, anchoPag - margen, y); y += 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...verdeOscuro)
  doc.text('2. VERIFICACIÓN DEL EQUIPO', margen, y)
  y += 7

  let totalB = 0, totalM = 0, totalNA = 0

  items.forEach(item => {
    const valor = datos[`item_${item.key}`]
    let etiqueta = valor
    let color = negro

    if (valor === 'B')   { etiqueta = 'B (Bueno)';       color = [46, 125, 50];  totalB++ }
    if (valor === 'M')   { etiqueta = 'M (Malo)';        color = [200, 40, 40];  totalM++ }
    if (valor === 'N/A') { etiqueta = 'N/A (No aplica)'; color = [120, 120, 120]; totalNA++ }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...negro)
    doc.text(item.label, margen, y)

    doc.setTextColor(...color)
    doc.text(etiqueta, anchoPag - margen, y, { align: 'right' })

    y += 6
  })

  // ===== 3.5. RESUMEN =====
  y += 2
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.2)
  doc.line(margen, y, anchoPag - margen, y)
  y += 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...negro)
  doc.text('RESUMEN:', margen, y)

  doc.setTextColor(46, 125, 50)
  doc.text(`Buenos: ${totalB}`, margen + 30, y)

  doc.setTextColor(200, 40, 40)
  doc.text(`Malos: ${totalM}`, margen + 65, y)

  doc.setTextColor(120, 120, 120)
  doc.text(`No aplica: ${totalNA}`, margen + 100, y)
  y += 10

  // ===== 4. OBSERVACIONES =====
  doc.setDrawColor(...verdeClaro)
  doc.setLineWidth(0.8)
  doc.line(margen, y, anchoPag - margen, y); y += 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...verdeOscuro)
  doc.text('3. OBSERVACIONES', margen, y)
  y += 7

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...negro)
  const obs = datos.observaciones || '(Sin observaciones)'
  const obsLineas = doc.splitTextToSize(obs, anchoPag - margen * 2)
  doc.text(obsLineas, margen, y)
  y += obsLineas.length * 5 + 8

  // ===== 5. FIRMA DEL TRABAJADOR (ANTES de la foto) =====
  doc.setDrawColor(...verdeClaro)
  doc.line(margen, y, anchoPag - margen, y); y += 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...verdeOscuro)
  doc.text('4. FIRMA DEL TRABAJADOR', margen, y)
  y += 8

  // Cédula
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...negro)
  doc.text(`Cédula: ${datos.cedula}`, margen, y)
  y += 8

  // Nombre en negrita arriba de la línea
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...negro)
  doc.text(datos.firma, margen, y)
  y += 3

  // Línea de firma
  doc.setDrawColor(80, 80, 80)
  doc.setLineWidth(0.4)
  doc.line(margen, y, margen + 90, y)
  y += 5

  // Etiqueta
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...gris)
  doc.text('Firma del trabajador', margen, y)
  y += 8

  // ===== 6. FOTO (con salto de página automático si no cabe) =====
  if (fotoUrl) {
    try {
      // Si no queda espacio suficiente en la página, saltar a una nueva
      if (y > 200) {
        doc.addPage()
        y = 20
      }

      doc.setDrawColor(...verdeClaro)
      doc.setLineWidth(0.8)
      doc.line(margen, y, anchoPag - margen, y); y += 6

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(...verdeOscuro)
      doc.text('5. EVIDENCIA FOTOGRÁFICA', margen, y)
      y += 7

      const fotoBase64 = await cargarImagenComoBase64(fotoUrl)
      const fotoAnchoMax = 100
      const fotoAltoMax  = 90

      const img = new Image()
      img.src = fotoBase64
      await new Promise(r => img.onload = r)
      const ratio = img.naturalHeight / img.naturalWidth

      let fotoAncho = fotoAnchoMax
      let fotoAlto  = fotoAncho * ratio

      // Si la altura excede el máximo, reajustar manteniendo proporción
      if (fotoAlto > fotoAltoMax) {
        fotoAlto  = fotoAltoMax
        fotoAncho = fotoAlto / ratio
      }

      doc.addImage(fotoBase64, 'JPEG', margen, y, fotoAncho, fotoAlto)
      y += fotoAlto + 8
    } catch (e) {
      console.warn('No se pudo cargar la foto:', e)
    }
  }

  // ===== 7. PIE DE PÁGINA (en la última página, sin sobreponerse) =====
  const paginas = doc.getNumberOfPages()
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(...gris)
    doc.setFont('helvetica', 'normal')
    doc.text(
      'Documento generado automáticamente · SG-SST-F-99',
      anchoPag / 2, alturaPag - 8, { align: 'center' }
    )
  }

  return doc
}

// ===== Nombre del archivo =====
export function nombreArchivoPDF(datos) {
  const fecha = datos.fecha_desde || new Date().toISOString().slice(0, 10)
  const firma = (datos.firma || 'Trabajador').replace(/\s+/g, '')
  return `Preoperacional_Pulidora_${fecha}_${firma}.pdf`
}