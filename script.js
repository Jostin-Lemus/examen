
        // ============================================================
        //  CONFIGURACIÓN CKEDITOR
        // ============================================================
        CKEDITOR.config.versionCheck = false;
        CKEDITOR.replace('editor', {
            removePlugins: 'exportpdf,cloudservices,easyimage',
            height: 340
        });

        // ============================================================
        //  TOASTS
        // ============================================================
        function mostrarToast(mensaje, tipo = 'info', duracion = 3000) {
            const contenedor = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = `toast toast-${tipo}`;
            toast.textContent = mensaje;
            contenedor.appendChild(toast);
            setTimeout(() => toast.remove(), duracion);
        }

        // ============================================================
        //  AUTOGUARDADO
        // ============================================================
        let autoguardadoTimer = null;
        let ultimoContenidoAutoguardado = '';
        let ultimoTituloAutoguardado = '';

        function iniciarAutoguardado() {
            CKEDITOR.instances.editor.on('change', programarAutoguardado);
            document.getElementById('titulo').addEventListener('input', programarAutoguardado);
        }

        function programarAutoguardado() {
            clearTimeout(autoguardadoTimer);
            actualizarIndicador('esperando');
            autoguardadoTimer = setTimeout(ejecutarAutoguardado, 30000);
        }

        function ejecutarAutoguardado() {
            const titulo = document.getElementById('titulo').value.trim();
            const contenido = CKEDITOR.instances.editor.getData();
            if (!titulo || !contenido) return;
            if (titulo === ultimoTituloAutoguardado && contenido === ultimoContenidoAutoguardado) return;
            try {
                localStorage.setItem('nota__' + titulo, contenido);
                ultimoTituloAutoguardado = titulo;
                ultimoContenidoAutoguardado = contenido;
                actualizarIndicador('guardado');
            } catch (e) {
                actualizarIndicador('error');
            }
        }

        function actualizarIndicador(estado) {
            const indicador = document.getElementById('indicador-autoguardado');
            if (!indicador) return;
            if (estado === 'esperando') {
                indicador.textContent = '○ Cambios sin guardar';
                indicador.className = 'indicador-autoguardado';
            } else if (estado === 'guardado') {
                indicador.textContent = '✓ Guardado automáticamente';
                indicador.className = 'indicador-autoguardado ag-guardado';
            } else if (estado === 'error') {
                indicador.textContent = '✕ Error al autoguardar';
                indicador.className = 'indicador-autoguardado ag-error';
            } else {
                indicador.textContent = '';
                indicador.className = 'indicador-autoguardado';
            }
        }

        CKEDITOR.instances.editor.on('instanceReady', iniciarAutoguardado);

        // ============================================================
        //  GUARDAR
        // ============================================================
        function guardarNota() {
            const titulo = document.getElementById('titulo').value.trim();
            const contenido = CKEDITOR.instances.editor.getData();
            if (!titulo) { mostrarToast('⚠️ Escribe un título primero.', 'error'); return; }
            if (!contenido) { mostrarToast('⚠️ El editor está vacío.', 'error'); return; }
            try {
                localStorage.setItem('nota__' + titulo, contenido);
                ultimoTituloAutoguardado = titulo;
                ultimoContenidoAutoguardado = contenido;
                clearTimeout(autoguardadoTimer);
                actualizarIndicador('guardado');
                mostrarToast(`💾 "${titulo}" guardada.`, 'exito');
            } catch (e) {
                mostrarToast('❌ Error al guardar.', 'error');
            }
        }

        // ============================================================
        //  CARGAR
        // ============================================================
        function cargarNota() {
            const titulo = document.getElementById('titulo').value.trim();
            if (!titulo) { abrirModalNotas(); return; }
            const contenido = localStorage.getItem('nota__' + titulo);
            if (contenido) {
                CKEDITOR.instances.editor.setData(contenido);
                ultimoTituloAutoguardado = titulo;
                ultimoContenidoAutoguardado = contenido;
                clearTimeout(autoguardadoTimer);
                actualizarIndicador('guardado');
                mostrarToast(`📂 "${titulo}" cargada.`, 'exito');
            } else {
                mostrarToast(`❌ No existe "${titulo}".`, 'error');
            }
        }

        // ============================================================
        //  ELIMINAR
        // ============================================================
        function eliminarNota() {
            const titulo = document.getElementById('titulo').value.trim();
            if (!titulo) { mostrarToast('⚠️ Escribe un título.', 'error'); return; }
            const clave = 'nota__' + titulo;
            if (!localStorage.getItem(clave)) {
                mostrarToast(`❌ No existe "${titulo}".`, 'error');
                return;
            }
            mostrarConfirmacion(
                `¿Eliminar "${titulo}"?`,
                'Esta acción no se puede deshacer.',
                () => {
                    localStorage.removeItem(clave);
                    CKEDITOR.instances.editor.setData('');
                    ultimoContenidoAutoguardado = '';
                    ultimoTituloAutoguardado = '';
                    clearTimeout(autoguardadoTimer);
                    actualizarIndicador('inactivo');
                    mostrarToast(`🗑 "${titulo}" eliminada.`, 'info');
                }
            );
        }

        // ============================================================
        //  CONFIRMACIÓN
        // ============================================================
        function mostrarConfirmacion(titulo, subtexto, onConfirmar) {
            document.getElementById('dialogo-confirmacion')?.remove();
            const overlay = document.createElement('div');
            overlay.id = 'dialogo-confirmacion';
            overlay.className = 'dialogo-overlay';
            overlay.innerHTML = `
                <div class="dialogo-box">
                    <p class="dialogo-titulo">${titulo}</p>
                    <p class="dialogo-sub">${subtexto}</p>
                    <div class="dialogo-acciones">
                        <button class="dialogo-cancelar" id="dialogo-btn-cancelar">Cancelar</button>
                        <button class="dialogo-confirmar" id="dialogo-btn-confirmar">Eliminar</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.classList.add('visible'));
            const cerrar = () => {
                overlay.classList.remove('visible');
                overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
            };
            document.getElementById('dialogo-btn-cancelar').onclick = cerrar;
            document.getElementById('dialogo-btn-confirmar').onclick = () => { cerrar(); onConfirmar(); };
        }

        // ============================================================
        //  MODAL NOTAS
        // ============================================================
        function abrirModalNotas() {
            const contenedor = document.getElementById('lista-notas-contenido');
            contenedor.innerHTML = '';
            const claves = Object.keys(localStorage).filter(k => k.startsWith('nota__'));
            if (claves.length === 0) {
                contenedor.innerHTML = '<p class="modal-vacio">No hay notas guardadas.</p>';
            } else {
                claves.forEach(clave => {
                    const tituloReal = clave.replace('nota__', '');
                    const item = document.createElement('div');
                    item.className = 'nota-item';
                    item.innerHTML = `
                        <span onclick="cargarDesdeModal('${tituloReal}')">📄 ${tituloReal}</span>
                        <button class="nota-borrar" onclick="borrarDesdeModal('${tituloReal}', this.parentElement)">🗑</button>`;
                    contenedor.appendChild(item);
                });
            }
            document.getElementById('modal-notas').classList.add('abierto');
        }

        function cargarDesdeModal(titulo) {
            document.getElementById('titulo').value = titulo;
            const contenido = localStorage.getItem('nota__' + titulo);
            if (contenido) {
                CKEDITOR.instances.editor.setData(contenido);
                ultimoTituloAutoguardado = titulo;
                ultimoContenidoAutoguardado = contenido;
                clearTimeout(autoguardadoTimer);
                actualizarIndicador('guardado');
                mostrarToast(`📂 "${titulo}" cargada.`, 'exito');
            }
            cerrarModalNotas();
        }

        function borrarDesdeModal(titulo, elemento) {
            localStorage.removeItem('nota__' + titulo);
            elemento.remove();
            mostrarToast(`🗑 "${titulo}" eliminada.`, 'info');
            const lista = document.getElementById('lista-notas-contenido');
            if (lista.children.length === 0)
                lista.innerHTML = '<p class="modal-vacio">No hay notas guardadas.</p>';
        }

        function cerrarModalNotas() { document.getElementById('modal-notas').classList.remove('abierto'); }
        function cerrarModalSiFondo(e) { if (e.target === document.getElementById('modal-notas')) cerrarModalNotas(); }

        // ============================================================
        //  LIBRO
        // ============================================================
        let paginasLibro = [];
        let paginaActualLibro = 0;

        function generarEspiral() {
            const svg = document.getElementById('espiral-svg');
            if (!svg) return;
            svg.innerHTML = '';
            const total = 16, alturaTotal = 560, paso = alturaTotal / (total + 1);
            for (let i = 1; i <= total; i++) {
                const cy = paso * i;
                const atras = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                atras.setAttribute('d', `M 6 ${cy-7} A 7 7 0 0 0 6 ${cy+7}`);
                atras.setAttribute('fill', 'none');
                atras.setAttribute('stroke', '#888');
                atras.setAttribute('stroke-width', '2.5');
                atras.setAttribute('stroke-linecap', 'round');
                svg.appendChild(atras);
                const frente = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                frente.setAttribute('d', `M 6 ${cy-7} A 7 7 0 0 1 6 ${cy+7}`);
                frente.setAttribute('fill', 'none');
                frente.setAttribute('stroke', '#c8991a');
                frente.setAttribute('stroke-width', '2.8');
                frente.setAttribute('stroke-linecap', 'round');
                svg.appendChild(frente);
            }
        }

        function mostrarPagina(index) {
            if (!paginasLibro.length || index < 0 || index >= paginasLibro.length) return;
            paginaActualLibro = index;
            const pagina = paginasLibro[index];
            document.getElementById('pagina-titulo').textContent = pagina.titulo || 'Sin título';
            document.getElementById('pagina-cuerpo').innerHTML = pagina.contenido;
            document.getElementById('pagina-numero').textContent = `${index + 1}`;
            document.getElementById('nav-info').textContent = `Pág ${index + 1} / ${paginasLibro.length}`;
            document.getElementById('btn-prev').disabled = index === 0;
            document.getElementById('btn-next').disabled = index === paginasLibro.length - 1;
            document.querySelectorAll('.nav-dot').forEach((d, i) => d.classList.toggle('activo', i === index));
        }

        function cambiarPaginaLibro(dir) {
            const nuevo = paginaActualLibro + dir;
            if (nuevo >= 0 && nuevo < paginasLibro.length) {
                mostrarPagina(nuevo);
            }
        }

        function toggleTapa() {
            if (paginasLibro.length === 0) {
                mostrarToast('📖 No hay notas guardadas.', 'info');
                return;
            }
            const tapa = document.getElementById('cuaderno-tapa');
            const paginas = document.getElementById('cuaderno-paginas');
            const nav = document.getElementById('libro-nav');
            const btn = document.getElementById('btn-toggle-tapa');

            if (tapa.style.display !== 'none') {
                tapa.style.display = 'none';
                paginas.style.display = 'flex';
                paginas.classList.add('visible');
                nav.style.display = 'flex';
                nav.classList.add('visible');
                btn.textContent = 'Cerrar cuaderno';
                btn.classList.add('abierto');
                mostrarPagina(paginaActualLibro);
            } else {
                tapa.style.display = 'flex';
                paginas.style.display = 'none';
                paginas.classList.remove('visible');
                nav.style.display = 'none';
                nav.classList.remove('visible');
                btn.textContent = 'Abrir cuaderno';
                btn.classList.remove('abierto');
            }
        }

        function abrirLibro() {
            const claves = Object.keys(localStorage).filter(k => k.startsWith('nota__'));
            if (claves.length === 0) {
                mostrarToast('📖 No hay notas guardadas. Guarda algunas primero.', 'error');
                return;
            }
            paginasLibro = claves.map(clave => ({
                titulo: clave.replace('nota__', ''),
                contenido: localStorage.getItem(clave) || '<p>Contenido vacío</p>'
            }));
            paginaActualLibro = 0;

            const seccion = document.getElementById('seccion-libro');
            seccion.style.display = 'block';
            seccion.classList.add('visible');

            // Resetear vista
            document.getElementById('cuaderno-tapa').style.display = 'flex';
            document.getElementById('cuaderno-paginas').style.display = 'none';
            document.getElementById('cuaderno-paginas').classList.remove('visible');
            document.getElementById('libro-nav').style.display = 'none';
            document.getElementById('libro-nav').classList.remove('visible');
            document.getElementById('btn-toggle-tapa').textContent = 'Abrir cuaderno';
            document.getElementById('btn-toggle-tapa').classList.remove('abierto');

            // Generar dots
            const dots = document.getElementById('nav-dots');
            dots.innerHTML = '';
            paginasLibro.forEach((_, i) => {
                const dot = document.createElement('button');
                dot.className = 'nav-dot' + (i === 0 ? ' activo' : '');
                dot.onclick = () => mostrarPagina(i);
                dots.appendChild(dot);
            });

            generarEspiral();
            mostrarPagina(0);
            setTimeout(() => seccion.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
            mostrarToast(`📖 Libro: ${paginasLibro.length} página(s)`, 'exito');
        }

        function cerrarLibro() {
            document.getElementById('seccion-libro').style.display = 'none';
            document.getElementById('seccion-libro').classList.remove('visible');
        }

        // ============================================================
        //  EXPORTAR / IMPORTAR
        // ============================================================
        function exportarNotas() {
            const claves = Object.keys(localStorage).filter(k => k.startsWith('nota__'));
            if (claves.length === 0) { mostrarToast('⚠️ No hay notas.', 'error'); return; }
            const datos = {};
            claves.forEach(clave => { datos[clave.replace('nota__', '')] = localStorage.getItem(clave); });
            const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cuaderno-${new Date().toISOString().slice(0,10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            mostrarToast(`⬇ ${claves.length} nota(s) exportadas.`, 'exito');
        }

        function importarNotas(inputEl) {
            const archivo = inputEl.files[0];
            if (!archivo) return;
            inputEl.value = '';
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const datos = JSON.parse(e.target.result);
                    if (typeof datos !== 'object' || Array.isArray(datos)) {
                        mostrarToast('❌ Formato incorrecto.', 'error');
                        return;
                    }
                    let ok = 0, err = 0;
                    Object.entries(datos).forEach(([titulo, contenido]) => {
                        if (typeof titulo === 'string' && typeof contenido === 'string') {
                            try { localStorage.setItem('nota__' + titulo, contenido); ok++; }
                            catch (_) { err++; }
                        }
                    });
                    mostrarToast(`✅ ${ok} nota(s) importadas.${err ? ` (${err} fallaron)` : ''}`, 'exito');
                } catch (err) {
                    mostrarToast('❌ Error al leer el archivo.', 'error');
                }
            };
            reader.readAsText(archivo);
        }

        // ============================================================
        //  CARGA DE ARCHIVOS
        // ============================================================
        let _archivoHTMLPendiente = '';

        async function manejarArchivoSubido(inputEl) {
            const archivo = inputEl.files[0];
            if (!archivo) return;
            inputEl.value = '';
            const nombre = archivo.name;
            const ext = nombre.split('.').pop().toLowerCase();
            const titulo = nombre.replace(/\.[^/.]+$/, '');
            mostrarToast('⏳ Procesando...', 'info', 2000);
            try {
                let html = '';
                let icono = '📄', tipo = '';
                if (ext === 'pdf') {
                    icono = '📕';
                    tipo = 'PDF';
                    html = await leerPDF(archivo);
                } else if (ext === 'docx' || ext === 'doc') {
                    icono = '📘';
                    tipo = 'Word';
                    html = await leerDOCX(archivo);
                } else if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
                    icono = '🖼️';
                    tipo = 'Imagen';
                    html = await leerImagen(archivo);
                } else if (['txt', 'md'].includes(ext)) {
                    icono = '📝';
                    tipo = 'Texto';
                    html = await leerTexto(archivo);
                } else {
                    mostrarToast(`❌ .${ext} no soportado.`, 'error');
                    return;
                }
                _archivoHTMLPendiente = html;
                document.getElementById('modal-archivo-icono').textContent = icono;
                document.getElementById('modal-archivo-nombre').textContent = nombre;
                document.getElementById('modal-archivo-tipo').textContent = tipo;
                document.getElementById('modal-titulo-input').value = titulo;
                document.getElementById('modal-archivo-preview').innerHTML = html;
                document.getElementById('modal-archivo').classList.add('abierto');
            } catch (err) {
                console.error(err);
                mostrarToast('❌ Error al procesar.', 'error');
            }
        }

        async function leerPDF(archivo) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            const buffer = await archivo.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
            let html = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 1.5 });
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
                html += `<p style="font-size:0.75rem;color:#6b5f54;">Pág ${i}/${pdf.numPages}</p>
                         <img src="${canvas.toDataURL('image/jpeg', 0.85)}" style="width:100%;border-radius:4px;margin-bottom:12px;">`;
            }
            return html || '<p>No se pudo renderizar.</p>';
        }

        async function leerDOCX(archivo) {
            const buffer = await archivo.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
            return result.value || '<p>No se pudo extraer contenido.</p>';
        }

        function leerImagen(archivo) {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = e => resolve(`<img src="${e.target.result}" style="max-width:100%;border-radius:4px;">`);
                reader.readAsDataURL(archivo);
            });
        }

        async function leerTexto(archivo) {
            const texto = await archivo.text();
            return texto.split('\n').map(l => l.trim() ? `<p>${l}</p>` : '<br>').join('');
        }

        function cerrarModalArchivo() {
            document.getElementById('modal-archivo').classList.remove('abierto');
            _archivoHTMLPendiente = '';
        }

        function cerrarModalArchivSiFondo(e) {
            if (e.target === document.getElementById('modal-archivo')) cerrarModalArchivo();
        }

        function insertarArchivoEnEditor() {
            const titulo = document.getElementById('modal-titulo-input').value.trim();
            if (!titulo) { mostrarToast('⚠️ Escribe un título.', 'error'); return; }
            if (!_archivoHTMLPendiente) { mostrarToast('❌ Sin contenido.', 'error'); return; }
            document.getElementById('titulo').value = titulo;
            CKEDITOR.instances.editor.setData(_archivoHTMLPendiente);
            try {
                localStorage.setItem('nota__' + titulo, _archivoHTMLPendiente);
                ultimoTituloAutoguardado = titulo;
                ultimoContenidoAutoguardado = _archivoHTMLPendiente;
                clearTimeout(autoguardadoTimer);
                actualizarIndicador('guardado');
                mostrarToast(`✅ "${titulo}" importada.`, 'exito');
            } catch (e) {
                mostrarToast('⚠️ Insertado pero no guardado.', 'error');
            }
            cerrarModalArchivo();
        }

        // ============================================================
        //  GENERAR PDF (simplificado)
        // ============================================================
        function sanitizarNombreArchivo(nombre) {
            return nombre.replace(/[\/\\:*?"<>|]/g, '_').trim() || 'Sin_Titulo';
        }

        const generarPDF = async () => {
            const titulo = document.getElementById('titulo').value.trim();
            const contenido = CKEDITOR.instances.editor.getData();
            if (!titulo) { mostrarToast('⚠️ Escribe un título.', 'error'); return; }
            if (!contenido) { mostrarToast('⚠️ El editor está vacío.', 'error'); return; }

            try {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF('p', 'pt', 'a4');
                const { width, height } = doc.internal.pageSize;

                // Portada
                doc.setFillColor(42, 37, 32);
                doc.rect(0, 0, width, height, 'F');
                doc.setDrawColor(168, 124, 16);
                doc.setLineWidth(0.8);
                doc.rect(22, 22, width - 44, height - 44, 'S');
                doc.setFont('times', 'bold');
                doc.setFontSize(24);
                doc.setTextColor(200, 153, 26);
                const lineas = doc.splitTextToSize(titulo, width - 120);
                doc.text(lineas, width / 2, height / 2 - 10, { align: 'center', baseline: 'middle' });
                doc.setFont('times', 'italic');
                doc.setFontSize(11);
                doc.setTextColor(168, 124, 16);
                doc.text(new Date().toLocaleDateString('es-ES'), width / 2, height / 2 + 40, { align: 'center' });

                // Contenido
                doc.addPage();
                doc.setFillColor(255, 255, 255);
                doc.rect(0, 0, width, height, 'F');

                const el = document.createElement('div');
                el.innerHTML = `<h1 style="font-family:Georgia;font-size:18px;color:#2a2520;">${titulo}</h1>` + contenido;
                el.style.cssText = 'width:500px;padding:20px;font-family:Georgia;font-size:12px;line-height:1.7;color:#2a2520;background:white;position:absolute;left:-9999px;top:0;';
                document.body.appendChild(el);

                const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: 'white' });
                document.body.removeChild(el);

                const imgData = canvas.toDataURL('image/jpeg', 0.9);
                const imgW = width - 60;
                const imgH = (canvas.height / canvas.width) * imgW;
                doc.addImage(imgData, 'JPEG', 30, 50, imgW, Math.min(imgH, height - 100));

                doc.save(`${sanitizarNombreArchivo(titulo)}.pdf`);
                mostrarToast(`📄 PDF generado.`, 'exito');

            } catch (err) {
                console.error(err);
                mostrarToast('❌ Error al generar PDF.', 'error');
            }
        };

        // ============================================================
        //  INICIALIZAR
        // ============================================================
        console.log('📓 Cuaderno Digital INFRAMEN listo');
        generarEspiral();