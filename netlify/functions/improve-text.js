const axios = require('axios');

exports.handler = async function (event, context) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { text } = JSON.parse(event.body);
        const apiKey = process.env.OPENAI_API_KEY;

        if (!text) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'No se envió texto para mejorar.' })
            };
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
            return {
                statusCode: 200,
                body: JSON.stringify({ text: finalText })
            };
        } else {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'No se recibió respuesta de la IA.' })
            };
        }

    } catch (error) {
        console.error('Error mejorando texto:', error.response ? error.response.data : error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Error al mejorar el texto.',
                details: error.response ? error.response.data : error.message
            })
        };
    }
};
