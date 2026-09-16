const { audioToText, GeminiError } = require('./lib/gemini');

exports.handler = async function (event) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { fileBase64, mimeType } = JSON.parse(event.body);

        if (!fileBase64) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'No se envió base64 del archivo.' })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ text: await audioToText(fileBase64, mimeType) })
        };

    } catch (error) {
        console.error('Error procesando audio:', error.message);
        return {
            statusCode: error instanceof GeminiError ? error.status : 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
