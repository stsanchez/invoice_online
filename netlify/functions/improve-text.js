const { improveText, GeminiError } = require('./lib/gemini');

exports.handler = async function (event) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { text } = JSON.parse(event.body);

        if (!text || !text.trim()) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'No se envió texto para mejorar.' })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ text: await improveText(text) })
        };

    } catch (error) {
        console.error('Error mejorando texto:', error.message);
        return {
            statusCode: error instanceof GeminiError ? error.status : 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
