document.getElementById("login-form").addEventListener("submit", async function (event) {
  event.preventDefault();

  const username = document.getElementById("username").value.toLowerCase();
  const password = document.getElementById("password").value;

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      alert("Inicio de sesión exitoso");
      window.location.href = data.redirect;
    } else {
      alert(data.error || "Usuario o contraseña incorrectos");
    }
  } catch (error) {
    console.error('Error:', error);
    alert("Error al conectar con el servidor");
  }
});

//