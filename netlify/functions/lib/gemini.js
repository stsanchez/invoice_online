const axios = require('axios');

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
// El free tier devuelve 503 de forma intermitente y la saturación rota entre
// modelos, así que probamos en cascada en vez de depender de uno solo.
const MODELS = (process.env.GEMINI_MODEL || 'gemini-3.8-flash,gemini-3.6-flash,gemini-flash-latest')
    .split(',').map(m => m.trim()).filter(Boolean);
const MODEL = MODELS[0];

// Códigos donde reintentar con el siguiente modelo tiene sentido (capacidad, no input).
const RETRYABLE = [429, 500, 502, 503, 504];

const REDACCION_RULES =
    'Eres un asistente experto en redacción técnica y profesional para presupuestos y facturas.\n' +
    'REGLAS:\n' +
    '1. Mantén el significado original pero usa vocabulario más formal.\n' +
    '2. Corrige ortografía y gramática.\n' +
    '3. Elimina muletillas o lenguaje coloquial.\n' +
    '4. Respeta los términos técnicos y los nombres de repuestos tal como aparecen.\n' +
    '5. Devuelve SOLAMENTE el texto resultante, sin introducciones ni explicaciones.';

// Formatos de audio que acepta Gemini. El navegador decide cuál graba.
const AUDIO_MIMES = ['audio/wav', 'audio/mp3', 'audio/aiff', 'audio/aac', 'audio/ogg', 'audio/flac', 'audio/webm', 'audio/m4a'];

function normalizeAudioMime(mimeType) {
    // MediaRecorder entrega cosas como "audio/webm;codecs=opus"
    const base = String(mimeType || '').split(';')[0].trim().toLowerCase();
    if (AUDIO_MIMES.includes(base)) return base;
    if (base === 'audio/mpeg') return 'audio/mp3';
    if (base === 'audio/mp4' || base === 'audio/x-m4a') return 'audio/m4a';
    return 'audio/webm';
}

// Error con el mensaje real de Gemini, para que el front pueda mostrarlo.
class GeminiError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'GeminiError';
        this.status = status || 502;
    }
}

async function generate(parts, systemInstruction) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new GeminiError('La API Key de Gemini no está configurada en el servidor.', 500);
    }

    const body = {
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: parts }],
        generationConfig: { temperature: 0.3 }
    };

    let lastError;

    for (const model of MODELS) {
        let response;
        try {
            response = await axios.post(`${API_BASE}/${model}:generateContent`, body, {
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
                // 3 modelos x 15s = 45s peor caso, por debajo del limite de 60s
                // de las funciones sincronas de Netlify.
                timeout: 15000
            });
        } catch (error) {
            const status = error.response ? error.response.status : 0;
            const apiError = error.response && error.response.data && error.response.data.error;
            lastError = new GeminiError(apiError ? apiError.message : error.message, status || 502);

            if (RETRYABLE.includes(status) || error.code === 'ECONNABORTED') {
                console.warn(`Modelo ${model} no disponible (${status || error.code}), probando el siguiente.`);
                continue;
            }
            throw lastError;
        }

        const candidate = (response.data.candidates || [])[0];

        if (!candidate) {
            const blocked = response.data.promptFeedback && response.data.promptFeedback.blockReason;
            throw new GeminiError(
                blocked ? `Gemini bloqueó el contenido (${blocked}).` : 'Gemini no devolvió ninguna respuesta.',
                502
            );
        }

        const text = (candidate.content && candidate.content.parts || [])
            .map(p => p.text || '')
            .join('')
            .trim();

        if (!text) {
            // MAX_TOKENS, RECITATION, SAFETY... el motivo importa para diagnosticar.
            throw new GeminiError(`Gemini devolvió una respuesta vacía (motivo: ${candidate.finishReason || 'desconocido'}).`, 502);
        }

        return text;
    }

    throw lastError || new GeminiError('Ningún modelo de Gemini respondió.', 502);
}

async function improveText(text) {
    return generate([{ text: text }], REDACCION_RULES);
}

// Una sola llamada: Gemini escucha el audio y redacta. Evita que un error de
// transcripción se consolide al pasar por un segundo modelo que no oyó el original.
async function audioToText(fileBase64, mimeType) {
    return generate(
        [
            { inline_data: { mime_type: normalizeAudioMime(mimeType), data: fileBase64 } },
            { text: 'Transcribe este audio y devuélvelo redactado como descripción de un ítem de presupuesto.' }
        ],
        REDACCION_RULES
    );
}

module.exports = { improveText, audioToText, GeminiError, MODEL, MODELS };
