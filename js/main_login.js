document.getElementById("login-form").addEventListener("submit", function(event) {
  event.preventDefault();

  var username = document.getElementById("username").value;
  var password = document.getElementById("password").value;

  if (username === "admin" && password === "Admin1234") {
    alert("Inicio de sesión exitoso");
    window.location.href = "main.html"; // Redireccionar a la página principal
  } else if (username === "cliente" && password === "Cliente1234") {
    alert("Inicio de sesión básico exitoso");
    window.location.href = "basico.html"; // Redireccionar a la página básica
  } else {
    alert("Usuario o contraseña incorrectos");
  }
});
