const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuración de Multer para manejar archivos (en memoria)
const upload = multer({ storage: multer.memoryStorage() });

// Servir archivos estáticos (HTML, CSS, JS) desde la raíz del proyecto
app.use(express.static(__dirname));

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

// Endpoint para procesar audio con OpenAI (Solo Transcripción)
app.post('/api/process-audio', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se envió ningún archivo de audio.' });
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'La API Key de OpenAI no está configurada en el servidor.' });
        }

        // Transcripción con Whisper
        const buffer = req.file.buffer;
        const filename = req.file.originalname || 'audio.webm';

        const form = new FormData();
        form.append('file', buffer, { filename: filename, contentType: req.file.mimetype });
        form.append('model', 'whisper-1');

        const whisperResponse = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${apiKey}`
            }
        });

        const transcribedText = whisperResponse.data.text;
        console.log("Transcription:", transcribedText);
        res.json({ text: transcribedText });

    } catch (error) {
        console.error('Error procesando audio:', error.response ? error.response.data : error.message);
        res.status(500).json({
            error: 'Error al procesar el audio.',
            details: error.response ? error.response.data : error.message
        });
    }
});

// Endpoint para mejorar texto con IA
app.post('/api/improve-text', async (req, res) => {
    try {
        const { text } = req.body;
        const apiKey = process.env.OPENAI_API_KEY;

        if (!text) {
            return res.status(400).json({ error: 'No se envió texto para mejorar.' });
        }

        const chatPayload = {
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "Eres un asistente experto en redacción técnica y profesional para presupuestos y facturas. \n" +
                        "TU TAREA: Reescribir el texto proporcionado para que suene profesional, técnico y conciso.\n" +
                        "REGLAS:\n" +
                        "1. Mantén el significado original pero usa vocabulario más formal.\n" +
                        "2. Corrige ortografía y gramática.\n" +
                        "3. Elimina muletillas o lenguaje coloquial.\n" +
                        "4. Devuelve SOLAMENTE el texto mejorado, sin introducciones ni explicaciones."
                },
                {
                    role: "user",
                    content: text
                }
            ]
        };

        const gptResponse = await axios.post('https://api.openai.com/v1/chat/completions', chatPayload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
        });

        const finalText = gptResponse.data.choices?.[0]?.message?.content?.trim();

        if (finalText) {
            res.json({ text: finalText });
        } else {
            res.status(500).json({ error: 'No se recibió respuesta de la IA.' });
        }

    } catch (error) {
        console.error('Error mejorando texto:', error.response ? error.response.data : error.message);
        res.status(500).json({
            error: 'Error al mejorar el texto.',
            details: error.response ? error.response.data : error.message
        });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Abra http://localhost:${PORT} para ver la aplicación.`);
});
