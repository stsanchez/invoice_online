document.getElementById("login-form").addEventListener("submit", function(event) {
    event.preventDefault();
  
    var username = document.getElementById("username").value;
    var password = document.getElementById("password").value;
  
    if (username === "admin" && password === "admin") {
      alert("Inicio de sesión exitoso");
      window.location.href = "main.html"; // Redireccionar a la página principal
    } else {
      alert("Usuario o contraseña incorrectos");
    }
  });