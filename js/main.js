function mostrarFechaActual() {
  var fecha = new Date();
  var dia = fecha.getDate();
  var mes = fecha.getMonth() + 1;
  var anio = fecha.getFullYear();

  dia = dia < 10 ? '0' + dia : dia;
  mes = mes < 10 ? '0' + mes : mes;

  var fechaFormateada = dia + '/' + mes + '/' + anio;
  document.getElementById("fechaActual").textContent = fechaFormateada;
}



mostrarFechaActual();

// --- Generación del PDF ---------------------------------------------------
// jsPDF.html() rebana el render en alturas fijas sin mirar el contenido, así
// que partía filas e imágenes al medio. Acá renderizamos una sola vez y
// elegimos los cortes: nunca dentro de un bloque que deba quedar entero.

const PDF = { pageW: 210, pageH: 297, margin: 10 };
const PDF_SCALE = 2;

// Bloques que no se parten. Si uno no entra en lo que queda de página, se baja
// entero a la siguiente.
const BLOQUES_ATOMICOS = [
  'header',
  '#form',
  '.tablaCliente thead',
  '.tablaCliente tbody tr',
  '#image-appendix h3',
  '.appendix-item'
];

function medirBloques(source, scale) {
  const base = source.getBoundingClientRect().top;
  const rangos = [];

  source.querySelectorAll(BLOQUES_ATOMICOS.join(',')).forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.height <= 0) return;
    rangos.push({ top: (r.top - base) * scale, bottom: (r.bottom - base) * scale });
  });

  // El anexo arranca en página propia, como pedía el CSS original
  // (page-break-before, que html2canvas no interpreta).
  const cortesForzados = [];
  const anexo = source.querySelector('#image-appendix.has-images');
  if (anexo) {
    const r = anexo.getBoundingClientRect();
    cortesForzados.push((r.top - base) * scale);
  }

  return { rangos, cortesForzados };
}

// Dónde terminar una página que empieza en `desde` y no puede pasar de `limite`.
function buscarCorte(desde, limite, alturaTotal, rangos, cortesForzados) {
  if (limite >= alturaTotal) return alturaTotal;

  const forzado = cortesForzados.find(c => c > desde + 1 && c <= limite);
  if (forzado) return forzado;

  // ¿Hay un bloque justo encima de la línea de corte?
  const partido = rangos.find(r => r.top < limite && r.bottom > limite);
  if (!partido) return limite;

  // Si el bloque entero cabe en una página, lo bajamos completo a la siguiente.
  // Si es más alto que una página no hay nada que hacer: se parte igual.
  return partido.top > desde + 1 ? partido.top : limite;
}

async function converHTMLFileToPDF() {
  const { jsPDF } = window.jspdf;
  const source = document.querySelector('#formulario');

  const anchoUtil = PDF.pageW - PDF.margin * 2;
  const altoUtil = PDF.pageH - PDF.margin * 2;

  const canvas = await html2canvas(source, {
    scale: PDF_SCALE,
    useCORS: true,
    backgroundColor: '#ffffff'
  });

  const pxPorMm = canvas.width / anchoUtil;
  const altoPaginaPx = altoUtil * pxPorMm;

  const { rangos, cortesForzados } = medirBloques(source, PDF_SCALE);

  // Repartir el alto total en páginas, cortando solo en lugares seguros.
  const paginas = [];
  let y = 0;
  while (y < canvas.height - 1) {
    const fin = buscarCorte(y, y + altoPaginaPx, canvas.height, rangos, cortesForzados);
    paginas.push([y, fin]);
    y = fin;
  }

  const doc = new jsPDF('p', 'mm', [PDF.pageW, PDF.pageH]);
  const recorte = document.createElement('canvas');
  const ctx = recorte.getContext('2d');

  paginas.forEach(([desde, hasta], i) => {
    const alto = hasta - desde;
    recorte.width = canvas.width;
    recorte.height = alto;

    // Fondo blanco: sin esto las zonas transparentes salen negras en el JPEG.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, recorte.width, recorte.height);
    ctx.drawImage(canvas, 0, desde, canvas.width, alto, 0, 0, canvas.width, alto);

    if (i > 0) doc.addPage();
    doc.addImage(
      recorte.toDataURL('image/jpeg', 0.92),
      'JPEG',
      PDF.margin, PDF.margin,
      anchoUtil, alto / pxPorMm
    );
  });

  return doc;
}

document.getElementById("boton").addEventListener("click", async function (e) {
  e.preventDefault();

  const nombre = prompt("Nombre del archivo: ");
  if (nombre === null) return;          // cancelado: antes generaba "null.pdf"
  const limpio = nombre.trim() || 'presupuesto';

  const textoOriginal = this.textContent;
  this.disabled = true;
  this.textContent = 'Generando...';

  try {
    const doc = await converHTMLFileToPDF();
    doc.setDisplayMode('fullwidth');
    doc.save(limpio + ".pdf");
  } catch (error) {
    console.error('Error generando el PDF:', error);
    alert(`No se pudo generar el PDF.\n\n${error.message}`);
  } finally {
    this.disabled = false;
    this.textContent = textoOriginal;
  }
});

var tabla = document.getElementById('miTabla');
var agregarFilaButton = document.getElementById('agregarFila');
var totalElement = document.getElementById('total_price');

tabla.addEventListener('input', function (event) {
  if (event.target.classList.contains('amount') || event.target.classList.contains('rate')) {
    var row = event.target.parentNode;
    calculateRowTotal(row);
    calculateTotal();
  }
});

function agregarNuevaFila() {
  var newRow = document.createElement('tr');
  newRow.innerHTML = '<td data-html2canvas-ignore="true" class="mic-cell">' +
    '<div class="cell-actions">' +
    '<button class="mic-btn" onclick="handleVoiceRecord(this)" title="Grabar audio">' +
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>' +
    '</button>' +
    '<button class="magic-btn" onclick="handleMagicText(this)" title="Mejorar texto con IA">' +
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M7.5 5.6L10 0l2.5 5.6L18 8l-5.5 2.4L10 16 7.5 10.4 2 8l5.5-2.4z"/><path d="M20 16l-2.5-5.6L15 16l-5.5 2.4L15 20.8 17.5 26.4 20 20.8l5.5-2.4-5.5-2.4z"/></svg>' +
    '</button>' +
    '<button class="clip-btn" onclick="handleImageAttach(this)" title="Adjuntar imagen">' +
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">' +
    '<path d="M16 6v12c0 2.21-1.79 4-4 4s-4-1.79-4-4V6c0-1.1.9-2 2-2s2 .9 2 2v10c0 .55-.45 1-1 1s-1-.45-1-1V6H8v10c0 1.66 1.34 3 3 3s3-1.34 3-3V6c0-2.76-2.24-5-5-5S4 3.24 4 6v12c0 3.87 3.13 7 7 7s7-3.13 7-7V6h-2z" />' +
    '</svg>' +
    '</button>' +
    '<input type="file" accept="image/*" style="display:none" onchange="processImage(this)">' +
    '</div>' +
    '</td>' +
    '<td width="60%" contenteditable class="description-cell"></td>' +
    '<td class="amount" contenteditable></td>' +
    '<td class="rate" contenteditable></td>' +
    '<td class="sum"></td>';

  tabla.appendChild(newRow);
}

// Image Attachment Logic
window.handleImageAttach = function (btn) {
  // Find the hidden input sibling
  const input = btn.parentNode.querySelector('input[type="file"]');
  input.click();
};

window.processImage = function (input) {
  if (input.files && input.files[0]) {
    const file = input.files[0];
    const reader = new FileReader();
    const row = input.closest('tr');

    // Determine row index (1-based for humans)
    const rowIndex = Array.from(tabla.children).indexOf(row) + 1;

    // Get description as title
    const descriptionCell = row.querySelector('.description-cell') || row.cells[1];
    let desc = descriptionCell.innerText.trim();
    if (!desc) desc = `Ítem #${rowIndex}`;

    reader.onload = function (e) {
      const appendix = document.getElementById('image-appendix');
      const container = document.getElementById('appendix-container');

      appendix.classList.add('has-images');
      appendix.style.display = 'flex'; // Ensure visible

      const itemDiv = document.createElement('div');
      itemDiv.className = 'appendix-item';

      const img = document.createElement('img');
      img.src = e.target.result;

      const p = document.createElement('p');
      const shortDesc = desc.length > 30 ? desc.substring(0, 30) + '...' : desc;
      p.innerText = `Referencia: Línea ${rowIndex}${shortDesc ? ' - ' + shortDesc : ''}`;

      itemDiv.appendChild(img);
      itemDiv.appendChild(p);
      container.appendChild(itemDiv);

      // Visual feedback on button
      const btn = input.parentNode.querySelector('.clip-btn');
      btn.style.color = '#3b82f6'; // Blue to indicate attached
    };

    reader.readAsDataURL(file);
  }
};

agregarFilaButton.addEventListener('click', function () {
  agregarNuevaFila();
});

// Voice to Text Feature (Gemini)
let mediaRecorder;
let audioChunks = [];

// Chrome graba webm/opus, Safari mp4. Elegimos el primero que soporte el
// navegador de esta lista, todos formatos que Gemini acepta.
function pickAudioMimeType() {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4'
  ];
  for (const type of candidates) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

window.handleVoiceRecord = async function (btn) {
  const row = btn.closest('tr');
  const descriptionCell = row.querySelector('.description-cell') || row.cells[1];

  if (btn.classList.contains('recording')) {
    mediaRecorder.stop();
    btn.classList.remove('recording');
    btn.classList.add('processing');
    return;
  }

  // API Key check removed - handled by backend

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = pickAudioMimeType();
    mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    audioChunks = [];

    mediaRecorder.ondataavailable = event => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const recordedType = mediaRecorder.mimeType || mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunks, { type: recordedType });
      await processAudioWithBackend(audioBlob, recordedType, descriptionCell, btn);

      stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorder.start();
    btn.classList.add('recording');

  } catch (err) {
    console.error("Error accessing microphone:", err);
    alert("Error accessing microphone. Please allow microphone permissions.");
  }
};

async function processAudioWithBackend(audioBlob, mimeType, targetCell, btn) {
  try {
    // Initial feedback
    const originalText = targetCell.innerText;
    targetCell.innerText = "Escuchando...";

    // Convert Blob to Base64
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);

    reader.onloadend = async function () {
      const base64String = reader.result.split(',')[1];

      try {
        const response = await fetch("/api/process-audio", {
          method: "POST",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileBase64: base64String,
            mimeType: mimeType
          })
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || response.statusText);
        }

        const data = await response.json();

        if (data.text) {
          targetCell.innerText = data.text;
        } else {
          targetCell.innerText = originalText;
          throw new Error("No text received from server");
        }
      } catch (error) {
        console.error("Backend Error:", error);
        alert(`No se pudo procesar el audio.\n\n${error.message}`);
        targetCell.innerText = originalText;
      } finally {
        btn.classList.remove('processing');
      }
    };

  } catch (error) {
    console.error("Setup Error:", error);
    alert(`Error: ${error.message}`);
    btn.classList.remove('processing');
  }
}

window.handleMagicText = async function (btn) {
  const row = btn.closest('tr');
  const descriptionCell = row.querySelector('.description-cell') || row.cells[1];
  const textToImprove = descriptionCell.innerText.trim();

  if (!textToImprove) {
    alert("Por favor, escribe algo primero.");
    return;
  }

  btn.classList.add('processing');

  try {
    const response = await fetch('/api/improve-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: textToImprove })
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok && data.text) {
      descriptionCell.innerText = data.text;
    } else {
      throw new Error(data.error || response.statusText);
    }
  } catch (error) {
    console.error("Error enhancing text:", error);
    alert(`No se pudo mejorar el texto.\n\n${error.message}`);
  } finally {
    btn.classList.remove('processing');
  }
};


function calculateRowTotal(row) {
  var amountCell = row.querySelector('.amount');
  var rateCell = row.querySelector('.rate');
  var sumCell = row.querySelector('.sum');

  var amount = parseFloat(amountCell.innerText);
  var rate = parseFloat(rateCell.innerText);

  if (!isNaN(amount) && !isNaN(rate)) {
    var total = amount * rate;
    sumCell.innerText = total.toFixed(2);
  } else {
    sumCell.innerText = '';
  }
}

function calculateTotal() {
  var sumCells = tabla.getElementsByClassName('sum');
  var total = 0;

  for (var i = 0; i < sumCells.length; i++) {
    var sum = parseFloat(sumCells[i].innerText);
    if (!isNaN(sum)) {
      total += sum;
    }
  }

  totalElement.innerText = '$ ' + total.toFixed(2);
}

var inputs = document.querySelectorAll('input[type="text"]');

inputs.forEach(function (input) {
  input.addEventListener('input', function () {
    input.classList.toggle('has-value', input.value !== '');
  });
});

window.logout = function () {
  if (confirm("¿Estás seguro que deseas cerrar sesión?")) {
    window.location.href = "index.html";
  }
};