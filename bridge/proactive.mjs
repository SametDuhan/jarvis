import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

/**
 * Proaktif davranış: hatırlatıcılar ve günde bir kez sabah brifingi.
 *
 * Köprü tarayıcıya { type: 'notify', text } yollar; tarayıcı yalnızca JARVIS
 * boştayken bu metni bir tur olarak çalıştırır. Hatırlatıcılar bağlantıya
 * bağlıdır: sayfa kapanınca zamanlayıcılar iptal olur.
 */
const STAMP = join(homedir(), '.jarvis', 'last-briefing')
const MAX_MINUTES = 24 * 60

const ok = (text) => ({ content: [{ type: 'text', text }] })

export function proactiveServer(notify) {
  const timers = new Set()

  const server = createSdkMcpServer({
    name: 'jarvis_proactive',
    version: '1.0.0',
    tools: [
      tool(
        'set_reminder',
        'Schedule a spoken reminder. It fires once, while the interface is open.',
        {
          minutes: z.union([z.number(), z.string()]).describe('Minutes from now, 1 to 1440.'),
          message: z.string().min(1).max(200).describe('What to remind the user of.'),
        },
        async ({ minutes, message }) => {
          const m = Math.min(MAX_MINUTES, Math.max(1, Math.round(Number(minutes))))
          if (!Number.isFinite(m)) return ok('Unclear delay — no reminder set.')
          const timer = setTimeout(() => {
            timers.delete(timer)
            notify(`[REMINDER DUE] ${message}. Tell the user, in one short sentence.`)
          }, m * 60_000)
          timers.add(timer)
          return ok(`Reminder set for ${m} minutes.`)
        },
      ),
    ],
  })

  return { server, cancel: () => timers.forEach(clearTimeout) }
}

/** Bugün brifing verildi mi? Verilmediyse işaretler ve true döner. */
export function claimBriefing() {
  const today = new Date().toISOString().slice(0, 10)
  try {
    if (readFileSync(STAMP, 'utf8').trim() === today) return false
  } catch {}
  mkdirSync(dirname(STAMP), { recursive: true })
  writeFileSync(STAMP, today)
  return true
}

export const BRIEFING_PROMPT =
  '[MORNING BRIEFING] The user has just opened the interface for the first time today. ' +
  'Give a brief greeting with the date, and mention anything from your memory worth raising. ' +
  'Use calendar or mail tools only if they are available and read-only. Three sentences at most.'
