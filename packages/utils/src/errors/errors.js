export function getErrorMessage(err, fallback = 'Unknown error') {
    if (err instanceof Error && typeof err.message === 'string' && err.message.trim()) {
        return err.message;
    }
    if (typeof err === 'string' && err.trim()) {
        return err.trim();
    }
    if (err && typeof err === 'object' && 'message' in err) {
        const msg = err.message;
        if (typeof msg === 'string' && msg.trim()) {
            return msg;
        }
    }
    return fallback;
}
export function isAbortError(err) {
    if (!err)
        return false;
    if (typeof DOMException !== 'undefined' && err instanceof DOMException) {
        return err.name === 'AbortError';
    }
    return err instanceof Error && err.name === 'AbortError';
}
