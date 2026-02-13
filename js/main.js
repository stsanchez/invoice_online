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

function converHTMLFileToPDF() {
  const { jsPDF } = window.jspdf;
  var doc = new jsPDF('p', 'mm', [210, 297]);
  var pdfjs = document.querySelector('#formulario');

  doc.html(pdfjs, {

    callback: function (doc) {
      var nameFile = prompt("Nombre del archivo: ");
      doc.setDisplayMode('fullwidth');
      doc.save(nameFile + ".pdf");
    },
    x: 10,
    y: 10,
    width: 190,
    windowWidth: 900
  });
}

document.getElementById("boton").addEventListener("click", function (e) {
  e.preventDefault();
  this.style.display = 'none';
  converHTMLFileToPDF();
  this.style.display = 'block';
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

// Voice to Text Feature (OpenAI)
let mediaRecorder;
let audioChunks = [];

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
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = event => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      // Create a File object instead of Blob for OpenAI API compatibility
      const audioFile = new File(audioChunks, "recording.webm", { type: 'audio/webm' });
      await processAudioWithBackend(audioFile, descriptionCell, btn);

      stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorder.start();
    btn.classList.add('recording');

  } catch (err) {
    console.error("Error accessing microphone:", err);
    alert("Error accessing microphone. Please allow microphone permissions.");
  }
};

async function processAudioWithBackend(audioFile, targetCell, btn) {
  try {
    // Initial feedback
    const originalText = targetCell.innerText;
    targetCell.innerText = "Escuchando...";

    // Convert Blob/File to Base64
    const reader = new FileReader();
    reader.readAsDataURL(audioFile);

    reader.onloadend = async function () {
      const base64String = reader.result.split(',')[1];

      try {
        const response = await fetch("/api/process-audio", {
          method: "POST",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileBase64: base64String,
            filename: audioFile.name
          })
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(`Server Error: ${err.error || response.statusText}`);
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
        alert(`Error: ${error.message}`);
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

    const data = await response.json();

    if (response.ok && data.text) {
      descriptionCell.innerText = data.text;
    } else {
      alert("No se pudo mejorar el texto.");
    }
  } catch (error) {
    console.error("Error enhancing text:", error);
    alert("Error al conectar con la IA.");
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