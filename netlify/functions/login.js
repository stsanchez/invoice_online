exports.handler = async function (event, context) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { username, password } = JSON.parse(event.body);

        const adminUser = process.env.ADMIN_USER;
        const adminPass = process.env.ADMIN_PASS;
        const clientUser = process.env.CLIENT_USER;
        const clientPass = process.env.CLIENT_PASS;

        if (username === adminUser && password === adminPass) {
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, redirect: 'main.html' })
            };
        } else if (username === clientUser && password === clientPass) {
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, redirect: 'basico.html' })
            };
        } else {
            return {
                statusCode: 401,
                body: JSON.stringify({ error: 'Usuario o contraseña incorrectos' })
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error procesando solicitud' })
        };
    }
};
