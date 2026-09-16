const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Mismo núcleo que usan las Netlify Functions, para que local y producción
// no puedan divergir.
const { improveText, audioToText, GeminiError } = require('./netlify/functions/lib/gemini');

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
// El audio viaja en base64 dentro del JSON, así que el límite por defecto (100kb) no alcanza.
app.use(express.json({ limit: '25mb' }));

// Servir archivos estáticos (HTML, CSS, JS) desde la raíz del proyecto
app.use(express.static(__dirname));

function fail(res, error, contexto) {
    console.error(`${contexto}:`, error.message);
    res.status(error instanceof GeminiError ? error.status : 500).json({ error: error.message });
}

// Endpoint para login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    const adminUser = process.env.ADMIN_USER;
    const adminPass = process.env.ADMIN_PASS;
    const clientUser = process.env.CLIENT_USER;
    const clientPass = process.env.CLIENT_PASS;

    if (username === adminUser && password === adminPass) {
        res.json({ success: true, redirect: 'main.html' });
    } else if (username === clientUser && password === clientPass) {
        res.json({ success: true, redirect: 'basico.html' });
    } else {
        res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
});

// Audio -> texto redactado (una sola llamada a Gemini)
app.post('/api/process-audio', async (req, res) => {
    try {
        const { fileBase64, mimeType } = req.body;
        if (!fileBase64) {
            return res.status(400).json({ error: 'No se envió base64 del archivo.' });
        }
        res.json({ text: await audioToText(fileBase64, mimeType) });
    } catch (error) {
        fail(res, error, 'Error procesando audio');
    }
});

// Endpoint para mejorar texto con IA
app.post('/api/improve-text', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text || !text.trim()) {
            return res.status(400).json({ error: 'No se envió texto para mejorar.' });
        }
        res.json({ text: await improveText(text) });
    } catch (error) {
        fail(res, error, 'Error mejorando texto');
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Abra http://localhost:${PORT} para ver la aplicación.`);
});
