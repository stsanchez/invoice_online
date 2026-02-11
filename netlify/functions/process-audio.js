const axios = require('axios');
const FormData = require('form-data');

exports.handler = async function (event, context) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { fileBase64, filename } = JSON.parse(event.body);

        if (!fileBase64) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'No se envió base64 del archivo.' })
            };
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'La API Key de OpenAI no está configurada.' })
            };
        }

        // Convert Base64 to Buffer
        const buffer = Buffer.from(fileBase64, 'base64');

        const form = new FormData();
        form.append('file', buffer, { filename: filename || 'audio.webm', contentType: 'audio/webm' });
        form.append('model', 'whisper-1');

        const whisperResponse = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${apiKey}`
            }
        });

        const transcribedText = whisperResponse.data.text;

        return {
            statusCode: 200,
            body: JSON.stringify({ text: transcribedText })
        };

    } catch (error) {
        console.error('Error procesando audio:', error.response ? error.response.data : error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Error al procesar el audio.',
                details: error.response ? error.response.data : error.message
            })
        };
    }
};
