import { readFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

/**
 * Kullanıcı yapılandırması: ~/.jarvis/config.json (JARVIS_CONFIG ile değişir).
 *
 * {
 *   "lang": "tr",
 *   "mcpServers": { "ad": { "command": "...", "args": [] } },
 *   "policy": {
 *     "allow":   ["mcp__sunucu__arac"],   // her zaman serbest
 *     "deny":    ["mcp__sunucu__arac"],   // her zaman yasak
 *     "confirm": ["mcp__sunucu__arac"]    // sesli onay iste
 *   }
 * }
 *
 * Desenlerde `*` joker olarak çalışır: "mcp__gmail__send*".
 * Dosya yoksa ya da bozuksa hiçbir şey değişmez.
 */
/**
 * Depo kökündeki .env.bridge.local dosyasını ortama yükler (zaten tanımlı
 * değişkenlere dokunmaz). Her başlatmada `source` etmek gerekmesin; yoksa
 * ElevenLabs anahtarı ve ses kimliği sessizce eksik kalıp varsayılan İngiliz
 * sesine düşüyordu.
 */
try {
  const envFile = new URL('../.env.bridge.local', import.meta.url)
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
} catch {}

const CONFIG_PATH = process.env.JARVIS_CONFIG ?? join(homedir(), '.jarvis', 'config.json')

function load() {
  try {
    if (!existsSync(CONFIG_PATH)) return {}
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'))
  } catch (err) {
    console.warn(`[jarvis] ${CONFIG_PATH} okunamadı: ${err.message}`)
    return {}
  }
}

const cfg = load()

export const LANG = (process.env.JARVIS_LANG ?? cfg.lang ?? 'en').toLowerCase()
export const EXTRA_MCP = cfg.mcpServers ?? {}

const toRegex = (pattern) =>
  new RegExp(
    '^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$',
    'i',
  )

const compile = (list) => (Array.isArray(list) ? list : []).map(toRegex)
const rules = {
  allow: compile(cfg.policy?.allow),
  deny: compile(cfg.policy?.deny),
  confirm: compile(cfg.policy?.confirm),
}

const matches = (list, name) => list.some((re) => re.test(name))

/** Sesli onay penceresi: reddedilen "confirm" aracı, bu süre içinde tekrar denenirse geçer. */
const CONFIRM_WINDOW_MS = 90_000
const pending = new Map()

/**
 * Yapılandırılmış politika kararı.
 * Dönüş: null (karar yok, normal kurallar işlesin) ya da
 * { allow: boolean, reason?: string }.
 */
export function policyFor(name) {
  if (matches(rules.deny, name)) {
    return { allow: false, reason: 'Bu araç yapılandırmada yasaklı.' }
  }
  if (matches(rules.confirm, name)) {
    const at = pending.get(name)
    if (at && Date.now() - at < CONFIRM_WINDOW_MS) {
      pending.delete(name)
      return { allow: true }
    }
    pending.set(name, Date.now())
    return {
      allow: false,
      reason:
        'Bu işlem sesli onay gerektiriyor. Kullanıcıya ne yapacağını tek cümleyle söyle ' +
        've açıkça evet demesini bekle. Evet derse aynı aracı tekrar çağır.',
    }
  }
  if (matches(rules.allow, name)) return { allow: true }
  return null
}
