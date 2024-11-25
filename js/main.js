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
    
    callback: function(doc) {
      var nameFile = prompt ("Nombre del archivo: ");
      doc.setDisplayMode('fullwidth');
      doc.save(nameFile + ".pdf");
    },
    x: 10,
    y: 10,
    width: 190,
    windowWidth: 900
  });
}

document.getElementById("boton").addEventListener("click", function(e) {
  e.preventDefault();
  this.style.display = 'none';
  converHTMLFileToPDF();
  this.style.display = 'block';
});

var tabla = document.getElementById('miTabla');
var agregarFilaButton = document.getElementById('agregarFila');
var totalElement = document.getElementById('total_price');

tabla.addEventListener('input', function(event) {
  if (event.target.classList.contains('amount') || event.target.classList.contains('rate')) {
    var row = event.target.parentNode;
    calculateRowTotal(row);
    calculateTotal();
  }
});

agregarFilaButton.addEventListener('click', function() {
  var newRow = document.createElement('tr');
  newRow.innerHTML = '<td width="60%" contenteditable></td>' +
                     '<td class="amount" contenteditable></td>' +
                     '<td class="rate" contenteditable></td>' +
                     '<td class="sum"></td>';

  tabla.appendChild(newRow);
});

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
  
  totalElement.innerText ='$ ' + total.toFixed(2);
}

var inputs = document.querySelectorAll('input[type="text"]');

inputs.forEach(function(input) {
  input.addEventListener('input', function() {
    input.classList.toggle('has-value', input.value !== '');
  });
});