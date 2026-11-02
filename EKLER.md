# Eklentiler (bu fork'a eklenenler)

Orijinal projenin üstüne eklenen özellikler. Hepsi isteğe bağlıdır; hiçbir şey ayarlanmazsa davranış orijinalle aynıdır.

## Yapılandırma dosyası
`~/.jarvis/config.json` (ya da `JARVIS_CONFIG`). Örnek: `jarvis.config.example.json`.

- `mcpServers` — `~/.claude.json`'a dokunmadan ek MCP sunucuları.
- `policy.allow / deny / confirm` — araç adı desenleri (`*` joker). Yerleşik `decideTool` kurallarından önce işler.
  - `confirm`: araç ilk çağrıda reddedilir, JARVIS sesli onay ister; kullanıcı evet deyince 90 sn içinde aynı araç geçer.
- `lang` — `tr` ya da `en` (`JARVIS_LANG` ile de verilir).

## Türkçe
`JARVIS_LANG=tr`: sistem istemi Türkçe cevap verir, tarayıcı konuşma tanıma `tr-TR`, tarayıcı sesi Türkçe sesler arasından seçilir. Bridge dili `/health` ile tarayıcıya bildirir. Wake word hâlâ "Hey Jarvis"tir.

## Hafıza
`memory_remember / memory_recall / memory_forget`. Kayıtlar `~/.jarvis/memory.json` içinde (`JARVIS_MEMORY`), son 40'ı her oturumun sistem istemine eklenir. "Bunu hatırla", "bunu unut" demek yeter.

## Proaktif davranış
- `set_reminder`: "10 dakika sonra beni uyar". Sayfa açıkken çalışır, JARVIS boştaysa konuşur.
- `JARVIS_BRIEFING=1`: günün ilk bağlantısında 20 sn sonra kısa sabah brifingi.

## Arayüz
`ui_preset`: `alert`, `stealth`, `gold`, `ice`, `matrix`. Geri almak için `ui_reset`.

## Başlatma
```bash
set -a; source .env.bridge.local; set +a
JARVIS_LANG=tr JARVIS_BRIEFING=1 npm start
```
