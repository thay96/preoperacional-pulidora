import { createClient } from '@supabase/supabase-js'
import { generarPDFPreoperacional, nombreArchivoPDF } from './pdf.js'

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
)

// ===== Modal profesional =====
const modalOverlay = document.getElementById('modalOverlay')
const modalIcon = document.getElementById('modalIcon')
const modalTitle = document.getElementById('modalTitle')
const modalMessage = document.getElementById('modalMessage')
const modalBtn = document.getElementById('modalBtn')

// ===== Manejo de foto =====
let fotoSeleccionada = null

const photoInput = document.getElementById('photoInput')
const photoBtn = document.getElementById('photoBtn')
const photoPreview = document.getElementById('photoPreview')
const photoImg = document.getElementById('photoImg')
const photoRemove = document.getElementById('photoRemove')

photoBtn.addEventListener('click', () => photoInput.click())

photoInput.addEventListener('change', (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
        showModal('Archivo inválido', 'Solo se permiten imágenes.', 'error')
        return
    }
    if (file.size > 8 * 1024 * 1024) {
        showModal('Imagen muy grande', 'La foto no debe superar 8 MB.', 'error')
        return
    }

    fotoSeleccionada = file
    photoImg.src = URL.createObjectURL(file)
    photoPreview.classList.remove('hidden')
    photoBtn.textContent = '🔄 Cambiar Foto'
})

photoRemove.addEventListener('click', (e) => {
    e.stopPropagation()
    fotoSeleccionada = null
    photoInput.value = ''
    photoPreview.classList.add('hidden')
    photoBtn.textContent = '📷 Tomar / Elegir Foto'
})

function showModal(titulo, mensaje, tipo = 'exito') {
    modalTitle.textContent = titulo
    modalMessage.textContent = mensaje
    if (tipo === 'error') {
        modalIcon.textContent = '✕'
        modalIcon.classList.add('error')
    } else {
        modalIcon.textContent = '✓'
        modalIcon.classList.remove('error')
    }
    modalOverlay.classList.remove('hidden')
    modalBtn.focus()
}

modalBtn.addEventListener('click', () => {
    modalOverlay.classList.add('hidden')
})

const ITEMS = [
    { key: 'tornilleria', label: 'Revisión de Tornillería' },
    { key: 'pines', label: 'Revisión Pines' },
    { key: 'pasadores', label: 'Revisión Pasadores' },
    { key: 'bujes', label: 'Revisión Bujes' },
    { key: 'carcaza', label: 'Revisión Carcaza' },
    { key: 'swiche', label: 'Revisión Swiche Encendido y accionamiento' },
    { key: 'guarda', label: 'Revisión Guarda' },
    { key: 'tuerca_contratuerca', label: 'Revisión Tuerca, Contratuerca' },
    { key: 'limpieza', label: 'Revisión Limpieza' },
    { key: 'lubricacion', label: 'Revisión Lubricación' },
    { key: 'cable_enchufe', label: 'Revisión Cable y Enchufe' },
    { key: 'mango', label: 'Revisión Mango' }
]

// --- Generar los ítems en el HTML ---
const itemsList = document.getElementById('itemsList')
ITEMS.forEach(item => {
    const row = document.createElement('div')
    row.className = 'item-row'
    row.innerHTML = `
    <div class="item-label">${item.label}</div>
    <div class="item-options">
      <label><input type="radio" name="${item.key}" value="B" required> B</label>
      <label><input type="radio" name="${item.key}" value="M"> M</label>
      <label><input type="radio" name="${item.key}" value="N/A"> N/A</label>
    </div>`
    itemsList.appendChild(row)
})



// --- Envío del formulario ---
document.getElementById('preopForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    const form = e.target
    const btn = document.getElementById('btnSubmit')

    // ===== 1. VALIDACIÓN DE CAMPOS OBLIGATORIOS =====
    const camposObligatorios = [
        { campo: 'obra', nombre: 'Obra' },
        { campo: 'ubicacion', nombre: 'Ubicación' },
        { campo: 'fecha_desde', nombre: 'Fecha desde' },
        { campo: 'fecha_hasta', nombre: 'Fecha hasta' }
    ]

    for (const { campo, nombre } of camposObligatorios) {
        const valor = form[campo].value.trim()
        if (!valor) {
            showModal('Campo obligatorio', `Debes completar: ${nombre}`, 'error')
            form[campo].focus()
            return
        }
    }

    // Validar fechas
    if (form.fecha_hasta.value < form.fecha_desde.value) {
        showModal('Fechas inválidas', '"Fecha hasta" no puede ser anterior a "Fecha desde".', 'error')
        form.fecha_hasta.focus()
        return
    }

    // ===== 2. VALIDACIÓN DE CÉDULA =====
    const cedula = form.cedula.value.trim()
    if (!/^[0-9]{6,15}$/.test(cedula)) {
        showModal('Cédula inválida', 'La cédula debe tener entre 6 y 15 números, sin letras ni símbolos.', 'error')
        form.cedula.focus()
        return
    }

    // ===== 3. VALIDACIÓN DE FIRMA =====
    const firma = form.firma.value.trim()
    if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{3,80}$/.test(firma)) {
        showModal('Firma inválida', 'La firma solo debe tener letras y espacios (mínimo 3 caracteres).', 'error')
        form.firma.focus()
        return
    }

    // ===== 4. VALIDACIÓN DE ÍTEMS =====
    let cumple = true
    for (const item of ITEMS) {
        const checked = form.querySelector(`input[name="${item.key}"]:checked`)
        if (!checked) {
            showModal('Falta un ítem', `Debes marcar: ${item.label}`, 'error')
            return
        }
    }

    // ===== 5. VALIDACIÓN DE FOTO =====
    if (!fotoSeleccionada) {
        showModal('Falta la foto', 'Debes adjuntar una foto antes de enviar.', 'error')
        return
    }

    // ===== 6. ENVIAR =====
    btn.disabled = true
    btn.textContent = 'Subiendo foto...'

    const data = {
        obra: form.obra.value.trim(),
        ubicacion: form.ubicacion.value.trim(),
        fecha_desde: form.fecha_desde.value,
        fecha_hasta: form.fecha_hasta.value,
        cedula: cedula,
        observaciones: form.observaciones.value.trim() || null,
        firma: firma
    }

    for (const item of ITEMS) {
        const checked = form.querySelector(`input[name="${item.key}"]:checked`)
        data[`item_${item.key}`] = checked.value
        if (checked.value === 'M') cumple = false
    }
    data.cumple = cumple

    // ===== 7. SUBIR FOTO =====
    const ext = fotoSeleccionada.name.split('.').pop().toLowerCase()
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const { error: uploadError } = await supabase
        .storage
        .from('fotos-preoperacional')
        .upload(path, fotoSeleccionada, {
            cacheControl: '3600',
            upsert: false,
            contentType: fotoSeleccionada.type
        })

    if (uploadError) {
        console.error(uploadError)
        showModal('Error al subir foto', uploadError.message, 'error')
        btn.disabled = false
        btn.textContent = 'Enviar Registro'
        return
    }

    const { data: urlData } = supabase
        .storage
        .from('fotos-preoperacional')
        .getPublicUrl(path)

    data.foto_url = urlData.publicUrl

    // ===== 8. INSERTAR REGISTRO =====
    btn.textContent = 'Guardando registro...'

    const { error } = await supabase
        .from('preoperacional_pulidora')
        .insert(data)

    if (error) {
        console.error(error)
        showModal('Error al enviar', error.message, 'error')
        btn.disabled = false
        btn.textContent = 'Enviar Registro'
        return
    }

    // ===== 9. GENERAR PDF Y ENVIAR A DRIVE =====
    try {
        data.created_at = new Date().toLocaleString('es-CO')
        const doc = await generarPDFPreoperacional(data, ITEMS, data.foto_url || null)
        const nombre = nombreArchivoPDF(data)



        // Convertir el PDF a Blob
        const pdfBlob = doc.output('blob')

        // Subir el PDF a Supabase Storage
        btn.textContent = 'Subiendo PDF...'
        const pathPdf = `pdfs/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`

        const { error: pdfUploadError } = await supabase
            .storage
            .from('fotos-preoperacional')
            .upload(pathPdf, pdfBlob, {
                cacheControl: '3600',
                upsert: false,
                contentType: 'application/pdf'
            })

        if (pdfUploadError) {
            console.error('Error subiendo PDF a Storage:', pdfUploadError)
        } else {
            // Obtener la URL pública del PDF
            const { data: pdfUrlData } = supabase
                .storage
                .from('fotos-preoperacional')
                .getPublicUrl(pathPdf)

            const pdfUrl = pdfUrlData.publicUrl

            // Enviar SOLO la URL al script de Google

            await new Promise((resolve) => {
                const formDrive = document.createElement('form')
                formDrive.method = 'POST'
                formDrive.action = 'https://script.google.com/macros/s/AKfycbwwhUbx4q9D0SZ-z51CiCiIlUydjuy3NgeX6_KK3RAIk2Nevc51YUa8Y3Ufkw5uBzA/exec'
                formDrive.target = 'iframeOculto'
                formDrive.style.display = 'none'

                const input = document.createElement('input')
                input.type = 'hidden'
                input.name = 'datos'
                input.value = JSON.stringify({ nombre, pdfUrl })  // ← URL, no base64
                formDrive.appendChild(input)

                document.body.appendChild(formDrive)
                formDrive.submit()

                setTimeout(() => {
                    document.body.removeChild(formDrive)
                    resolve()
                }, 3000)
            })

            console.log('PDF subido a Supabase y enviado a Drive:', nombre)
        }

    } catch (pdfError) {
        console.error('Error al generar/enviar PDF:', pdfError)
    }

    // ===== 10. LIMPIAR FORMULARIO =====
    form.reset()
    fotoSeleccionada = null
    photoInput.value = ''
    photoPreview.classList.add('hidden')
    photoBtn.textContent = '📷 Tomar / Elegir Foto'

    showModal('¡Registro enviado!', 'Tu preoperacional fue guardado correctamente y enviado a SST.')

    btn.disabled = false
    btn.textContent = 'Enviar Registro'
})