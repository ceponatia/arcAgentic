export async function safeText(res) {
    try {
        return await res.text();
    }
    catch {
        return '<no body>';
    }
}
export async function safeJson(res) {
    try {
        return (await res.json());
    }
    catch {
        return null;
    }
}
