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

agregarFilaButton.addEventListener('click', function () {
  var newRow = document.createElement('tr');
  newRow.innerHTML = '<td data-html2canvas-ignore="true" class="mic-cell">' +
    '<button class="mic-btn" onclick="handleVoiceRecord(this)">' +
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>' +
    '</button>' +
    '</td>' +
    '<td width="60%" contenteditable></td>' +
    '<td class="amount" contenteditable></td>' +
    '<td class="rate" contenteditable></td>' +
    '<td class="sum"></td>';

  tabla.appendChild(newRow);
});

// Voice to Text Feature (OpenAI)
let mediaRecorder;
let audioChunks = [];

window.handleVoiceRecord = async function (btn) {
  const row = btn.closest('tr');
  const descriptionCell = row.cells[1];

  if (btn.classList.contains('recording')) {
    mediaRecorder.stop();
    btn.classList.remove('recording');
    btn.classList.add('processing');
    return;
  }

  // Check for API Key
  let apiKey = AC_CONFIG.OPENAI_API_KEY;
  if (!apiKey) {
    apiKey = localStorage.getItem('openai_api_key');
  }

  if (!apiKey) {
    apiKey = prompt("Please enter your OpenAI API Key:");
    if (apiKey) {
      localStorage.setItem('openai_api_key', apiKey);
    } else {
      return;
    }
  }

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
      await processAudioWithOpenAI(audioFile, descriptionCell, apiKey, btn);

      stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorder.start();
    btn.classList.add('recording');

  } catch (err) {
    console.error("Error accessing microphone:", err);
    alert("Error accessing microphone. Please allow microphone permissions.");
  }
};

async function processAudioWithOpenAI(audioFile, targetCell, apiKey, btn) {
  try {
    // Step 1: Transcribe with Whisper
    const formData = new FormData();
    formData.append("file", audioFile);
    formData.append("model", "whisper-1");

    const whisperResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!whisperResponse.ok) {
      const err = await whisperResponse.json();
      throw new Error(`Whisper API Error: ${err.error?.message || whisperResponse.statusText}`);
    }

    const whisperData = await whisperResponse.json();
    const transcribedText = whisperData.text;

    console.log("Transcription:", transcribedText);

    // IMMEDIATE FEEDBACK: Show raw transcription while refining
    targetCell.innerText = transcribedText + " (Mejorando redacción...)";

    // Step 2: Refine with GPT-4o
    const chatPayload = {
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Eres una herramienta de formateo de texto para facturas. Tu ÚNICO objetivo es tomar el texto hablado y reescribirlo de manera formal y concisa para un presupuesto. \n" +
            "REGLAS:\n" +
            "1. Elimina saludos, muletillas y ruido.\n" +
            "2. NO charles ni expliques nada.\n" +
            "3. Si el texto es 'hola' o algo irrelevante, simplemente déjalo limpio y formal o ignóralo si no sirve.\n" +
            "4. Devuelve SOLAMENTE el texto final."
        },
        {
          role: "user",
          content: transcribedText
        }
      ]
    };

    const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(chatPayload)
    });

    if (!gptResponse.ok) {
      const err = await gptResponse.json();
      throw new Error(`GPT API Error: ${err.error?.message || gptResponse.statusText}`);
    }

    const gptData = await gptResponse.json();
    const finalText = gptData.choices?.[0]?.message?.content?.trim();

    if (finalText) {
      targetCell.innerText = finalText;
    } else {
      throw new Error("No content received from GPT");
    }

  } catch (error) {
    console.error("OpenAI Error:", error);
    alert(`Error: ${error.message}`);
  } finally {
    btn.classList.remove('processing');
  }
}


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