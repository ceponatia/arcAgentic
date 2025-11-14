import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { loadData, type LoadedData } from './data/loader.js'
import { createSession, getSession } from './sessions/store.js'
import { buildPrompt } from './llm/prompt.js'
import { chatWithOllama } from './llm/ollama.js'
import type { CharacterProfile, SettingProfile } from '@minimal-rpg/shared'

const app = new Hono()

app.get('/hello', (c) => c.json({ ok: true, message: 'hello' }))

let loaded: LoadedData | undefined = undefined

async function start() {
	try {
		loaded = await loadData()
		console.log(`Startup: loaded ${loaded.characters.length} characters and ${loaded.settings.length} settings`) 
	} catch (err) {
		console.error('Failed to load data', (err as Error).message)
		process.exit(1)
	}

	// Enable CORS for browser-based clients (Vite dev on 5173, etc.)
	app.use('*', cors({
		origin: '*',
		allowMethods: ['GET', 'POST', 'OPTIONS'],
		allowHeaders: ['Content-Type'],
	}))

	// GET /characters - return summarized character profiles
	app.get('/characters', (c) => {
		if (!loaded) return c.json({ ok: false, error: 'data not loaded' }, 500)
		const mapped = loaded.characters.map((ch: CharacterProfile) => {
			const base: { id: string; name: string; summary: string; tags?: string[] } = {
				id: ch.id,
				name: ch.name,
				summary: ch.summary,
			}
			if (ch.tags && ch.tags.length > 0) base.tags = ch.tags
			return base
		})
		return c.json(mapped, 200)
	})

	// GET /settings - return summarized setting profiles
	app.get('/settings', (c) => {
		if (!loaded) return c.json({ ok: false, error: 'data not loaded' }, 500)
		const mapped = loaded.settings.map((s: SettingProfile) => ({ id: s.id, name: s.name, tone: s.tone }))
		return c.json(mapped, 200)
	})

	// GET /sessions/:id - return full conversation
	app.get('/sessions/:id', (c) => {
		const id = c.req.param('id')
		const session = getSession(id)
		if (!session) return c.json({ ok: false, error: 'session not found' }, 404)
		// ensure chronological order by createdAt (ISO strings compare lexicographically)
		const sorted = {
			...session,
			messages: [...session.messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
		}
		return c.json(sorted, 200)
	})

	// POST /sessions/:id/messages - append a user message
	app.post('/sessions/:id/messages', async (c) => {
		if (!loaded) return c.json({ ok: false, error: 'data not loaded' }, 500)
		const id = c.req.param('id')
		const session = getSession(id)
		if (!session) {
			return c.json({ ok: false, error: 'session not found' }, 404)
		}
		const body = await c.req.json().catch(() => null)
		const content = typeof body?.content === 'string' ? body.content : ''
		if (content.length < 1 || content.length > 4000) {
			return c.json({ ok: false, error: 'content must be 1..4000 characters' }, 400)
		}
		const userMessage = { role: 'user' as const, content, createdAt: new Date().toISOString() }
		session.messages.push(userMessage)
		console.info(`Session ${session.id}: user message (${content.length} chars) at ${userMessage.createdAt}`)

		const character = loaded.characters.find((ch) => ch.id === session.characterId)
		const setting = loaded.settings.find((s) => s.id === session.settingId)
		if (!character || !setting) {
			return c.json({ ok: false, error: 'character or setting not found for session' }, 500)
		}

		const baseUrl = process.env.OLLAMA_BASE_URL
		const model = process.env.OLLAMA_MODEL
		if (!baseUrl || !model) {
			return c.json({ ok: false, error: 'Missing OLLAMA_BASE_URL or OLLAMA_MODEL env vars' }, 500)
		}

		const messages = buildPrompt({ character, setting, history: session.messages, maxHistory: 10 })
		console.info(`Session ${session.id}: calling Ollama (${model}) with ${messages.length} messages`)
		const result = await chatWithOllama({ baseUrl, model, messages })
		if (result.error) {
			console.error(`Session ${session.id}: Ollama error -> ${result.error}`)
			return c.json({ ok: false, error: result.error }, 502)
		}
		const contentReply = result.message?.content ?? ''
		if (!contentReply.trim()) {
			return c.json({ ok: false, error: 'Empty assistant response from Ollama' }, 502)
		}
		const assistantMessage = { role: 'assistant' as const, content: contentReply, createdAt: new Date().toISOString() }
		session.messages.push(assistantMessage)
		console.info(`Session ${session.id}: assistant reply (${assistantMessage.content.length} chars) at ${assistantMessage.createdAt}`)
		return c.json({ message: assistantMessage }, 200)
	})

		// POST /sessions - create a new session for characterId + settingId
		app.post('/sessions', async (c) => {
			if (!loaded) return c.json({ ok: false, error: 'data not loaded' }, 500)
			const body = await c.req.json().catch(() => null)
			const { characterId, settingId } = body ?? {}
			if (!characterId || !settingId) {
				return c.json({ ok: false, error: 'characterId and settingId are required' }, 400)
			}
			const charExists = loaded.characters.some((ch) => ch.id === characterId)
			const setExists = loaded.settings.some((s) => s.id === settingId)
			if (!charExists || !setExists) {
				return c.json({ ok: false, error: 'characterId or settingId not found' }, 400)
			}
			// generate a UUID without external dependency
			const id = typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)
			const session = createSession(id, characterId, settingId)
			const response = { id: session.id, characterId: session.characterId, settingId: session.settingId, createdAt: session.createdAt }
			return c.json(response, 201)
		})

	const port = Number(process.env.PORT ?? 3001)
	serve({ fetch: app.fetch, port })
	console.log(`API server listening on http://localhost:${port}`)
}

start()
