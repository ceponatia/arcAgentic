type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export type OllamaChatResponse = {
  message?: { role: 'assistant'; content: string }
  error?: string
}

export async function chatWithOllama(opts: {
  baseUrl: string
  model: string
  messages: ChatMessage[]
  timeoutMs?: number
}): Promise<OllamaChatResponse> {
  const { baseUrl, model, messages } = opts
  const timeoutMs = opts.timeoutMs ?? 60_000

  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await (globalThis as any).fetch(`${baseUrl.replace(/\/$/, '')}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: false }),
      signal: controller.signal,
    })
    if (!res.ok) {
      const text = await safeText(res)
      return { error: `Ollama error ${res.status}: ${text}` }
    }
    const data = await res.json().catch(() => ({})) as any
    // Non-streaming response shape from Ollama should include a final message
    if (data && data.message && typeof data.message.content === 'string') {
      return { message: { role: 'assistant', content: data.message.content } }
    }
    // Some versions may return { response: string }
    if (typeof data?.response === 'string') {
      return { message: { role: 'assistant', content: data.response } }
    }
    return { error: 'Invalid Ollama response' }
  } catch (err) {
    const msg = (err as Error).message || String(err)
    return { error: `Ollama request failed: ${msg}` }
  } finally {
    clearTimeout(t)
  }
}

async function safeText(res: Response) {
  try { return await res.text() } catch { return '<no body>' }
}
