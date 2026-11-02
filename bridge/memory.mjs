import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

/**
 * Konuşmalar arası kalıcı hafıza. ~/.jarvis/memory.json içinde düz JSON.
 * Kayıtlar sistem istemine eklenir, böylece JARVIS her açılışta bilir;
 * araçlar yalnızca ekleme, arama ve silme içindir.
 */
const FILE = process.env.JARVIS_MEMORY ?? join(homedir(), '.jarvis', 'memory.json')
const MAX_ITEMS = 200
const MAX_PROMPT_ITEMS = 40

function read() {
  try {
    const data = JSON.parse(readFileSync(FILE, 'utf8'))
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function write(items) {
  mkdirSync(dirname(FILE), { recursive: true })
  const tmp = `${FILE}.tmp`
  writeFileSync(tmp, JSON.stringify(items, null, 2), { mode: 0o600 })
  renameSync(tmp, FILE)
}

const ok = (text) => ({ content: [{ type: 'text', text }] })

/** Sistem istemine eklenecek blok; hafıza boşsa boş string. */
export function memoryPrompt() {
  const items = read().slice(-MAX_PROMPT_ITEMS)
  if (!items.length) return ''
  const lines = items.map((m) => `- [${m.id}] ${m.text}`).join('\n')
  return `\n\nMEMORY. Facts the user asked you to keep. Use them silently; never recite them unprompted.\n${lines}\n`
}

export function memoryServer() {
  return createSdkMcpServer({
    name: 'jarvis_memory',
    version: '1.0.0',
    tools: [
      tool(
        'memory_remember',
        'Store one durable fact about the user or their preferences, when they ask you to remember something. One short sentence.',
        { text: z.string().min(1).max(300).describe('The fact, one short sentence.') },
        async ({ text }) => {
          const items = read()
          const clean = text.trim()
          if (items.some((m) => m.text.toLowerCase() === clean.toLowerCase())) {
            return ok('Already stored.')
          }
          const id = Math.max(0, ...items.map((m) => m.id)) + 1
          items.push({ id, text: clean, at: new Date().toISOString() })
          write(items.slice(-MAX_ITEMS))
          return ok(`Stored as ${id}.`)
        },
      ),
      tool(
        'memory_recall',
        'Search stored facts. Empty query lists everything.',
        { query: z.string().optional().describe('Words to look for.') },
        async ({ query }) => {
          const q = (query ?? '').toLowerCase().trim()
          const hits = read().filter((m) => !q || m.text.toLowerCase().includes(q))
          return ok(hits.length ? hits.map((m) => `[${m.id}] ${m.text}`).join('\n') : 'Nothing stored.')
        },
      ),
      tool(
        'memory_forget',
        'Delete one stored fact by id, when the user asks you to forget it.',
        { id: z.union([z.number(), z.string()]).describe('The id from memory_recall.') },
        async ({ id }) => {
          const n = Number(id)
          const items = read()
          const rest = items.filter((m) => m.id !== n)
          if (rest.length === items.length) return ok('No such record.')
          write(rest)
          return ok('Forgotten.')
        },
      ),
    ],
  })
}
