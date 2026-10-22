// Screenshots of the app for the README, taken with headless Chrome over its
// DevTools protocol (a raw WebSocket; no npm dependency). Run the dev server
// on the demo database first:
//
//   npm run seed:demo && npm run dev        (in one terminal)
//   node scripts/screenshots.mjs             (in another; writes docs/screenshots/*.png)
//
// Needs Google Chrome at the usual macOS path, or CHROME=/path/to/chrome.
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { encodeRecording, glide, startRecording } from './recording.mjs'

const URL = process.env.WHETSTONE_URL ?? 'http://127.0.0.1:8300'
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const OUT = 'docs/screenshots'
const PORT = 9333

const PHONE = { width: 430, height: 932, scale: 2, mobile: true }
const DESKTOP = { width: 1280, height: 840, scale: 2, mobile: false }

/**
 * Each scenario is a list of steps against a fresh browser profile:
 *  click <text>          the innermost element whose text contains it, or its enclosing button
 *  sel <css>             click the first element matching the selector
 *  tab / track / lang    a problem tab, a track tab, or the language toggle, by label
 *  wait <ms>             pause (animations, the editor and visualiser load lazily)
 *  next <n>              press the visualiser's Next button n times
 *  scroll <css> <px>     scroll an element
 */
const scenarios = [
  { name: 'list-phone', view: PHONE, steps: [] },
  { name: 'problem-phone', view: PHONE, steps: [['click', 'Sliding Window Maximum']] },
  { name: 'code-phone', view: PHONE, steps: [['click', 'Sliding Window Maximum'], ['tab', 'Code'], ['wait', 1500], ['run'], ['wait', 4000]] },
  { name: 'review-phone', view: PHONE, steps: [['click', 'Sliding Window Maximum'], ['tab', 'Review'], ['wait', 800]] },
  { name: 'guide-phone', view: PHONE, steps: [['click', 'Sliding Window Maximum'], ['tab', 'Guide'], ['wait', 800]] },
  { name: 'technique-phone', view: PHONE, steps: [['click', 'Sliding Window Maximum'], ['sel', 'button.technique-chip'], ['wait', 1500], ['next', 9], ['wait', 300]] },
  { name: 'primer-phone', view: PHONE, steps: [['track', 'Coding'], ['sel', '.plist-group:nth-of-type(3) .primer-btn'], ['wait', 800]] },
  { name: 'knowledge-phone', view: PHONE, steps: [['track', 'Knowledge'], ['click', 'HTTP caching'], ['wait', 600]] },
  { name: 'java-phone', view: PHONE, steps: [['lang', 'Java'], ['wait', 600], ['click', 'Two Sum'], ['tab', 'Code'], ['wait', 2500]] },
  { name: 'desktop', view: DESKTOP, steps: [['click', 'Sliding Window Maximum'], ['wait', 1500]] },
  { name: 'desktop-ruby', view: DESKTOP, steps: [['lang', 'Ruby'], ['wait', 600], ['click', 'Sliding Window Maximum'], ['wait', 1500], ['run'], ['wait', 3000]] },
  // Walkthroughs, recorded (see recording.mjs): the phone's and the desktop's.
  { name: 'demo-phone', view: PHONE, record: true, steps: [['wait', 1000], ['click', 'Sliding Window Maximum'], ['wait', 1600], ['glide', '.pane-problem', 500, 1600], ['wait', 700], ['tab', 'Code'], ['wait', 1600], ['run'], ['wait', 4500], ['tab', 'Review'], ['wait', 1600], ['glide', '.pane-review', 500, 1600], ['wait', 800], ['tab', 'Guide'], ['wait', 2000]] },
  { name: 'demo-desktop', view: DESKTOP, record: true, steps: [['wait', 1000], ['click', 'Sliding Window Maximum'], ['wait', 1900], ['glide', '.pane-problem', 400, 1600], ['wait', 800], ['run'], ['wait', 4500], ['glide', '.work-review', 260, 1600], ['wait', 1800]] },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function withChrome(view, fn) {
  // A fresh profile per scenario, so nothing (the remembered problem, the track) carries over.
  const profile = mkdtempSync(join(tmpdir(), 'whetstone-shots-'))
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--no-first-run', '--no-default-browser-check', `--window-size=${view.width},${view.height}`, '--hide-scrollbars', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
  const exited = new Promise((r) => chrome.on('exit', r))
  try {
    let targets = []
    for (let i = 0; i < 40 && targets.length === 0; i++) {
      await sleep(250)
      try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json() } catch { /* not up yet */ }
    }
    const page = targets.find((t) => t.type === 'page')
    if (!page) throw new Error('Chrome did not expose a page target')
    const ws = new WebSocket(page.webSocketDebuggerUrl)
    await new Promise((r) => (ws.onopen = r))
    let id = 0
    const pending = new Map()
    const listeners = new Map()
    const on = (method, fn) => listeners.set(method, fn)
    ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) } else if (m.method && listeners.has(m.method)) listeners.get(m.method)(m.params) }
    const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
    const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value
    await send('Page.enable')
    await send('Emulation.setDeviceMetricsOverride', { width: view.width, height: view.height, deviceScaleFactor: view.scale, mobile: view.mobile })
    await fn({ send, evaluate, on })
    ws.close()
  } finally {
    chrome.kill()
    await exited
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  }
}

const clickText = (text, sel = 'button, div, span, h4, b, strong, em, p, li, a') =>
  `(() => { const t = ${JSON.stringify(text)}; const all = [...document.querySelectorAll(${JSON.stringify(sel)})].filter((e) => e.textContent.includes(t)); const el = all.find((e) => !all.some((o) => o !== e && e.contains(o))); if (!el) return 'missing ' + t; (el.closest('button') ?? el).click(); return 'clicked' })()`

async function run(scenario) {
  await withChrome(scenario.view, async ({ send, evaluate, on }) => {
    await send('Page.navigate', { url: URL })
    await sleep(2500)
    const recording = scenario.record ? startRecording({ send, on }) : null
    for (const [op, a, b, c] of scenario.steps) {
      let result = ''
      if (op === 'click') result = await evaluate(clickText(a))
      else if (op === 'glide') result = await glide(evaluate, a, b, c)
      else if (op === 'sel') result = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(a)}); if (!el) return 'missing ' + ${JSON.stringify(a)}; el.click(); return 'clicked' })()`)
      else if (op === 'tab') result = await evaluate(clickText(a, '[role=tab]'))
      else if (op === 'track') result = await evaluate(clickText(a, '.tracks button'))
      else if (op === 'lang') result = await evaluate(clickText(a, '.lang-toggle button'))
      else if (op === 'wait') { await sleep(a); continue }
      else if (op === 'run') result = await evaluate(`(() => { const btn = [...document.querySelectorAll('.workbar button')].find((x) => x.textContent.trim() === 'Run'); if (!btn) return 'missing Run'; btn.click(); return 'clicked' })()`)
      else if (op === 'next') { for (let i = 0; i < a; i++) { await evaluate(`document.querySelector('[aria-label="Next step"]')?.click()`); await sleep(50) } continue }
      else if (op === 'scroll') result = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(a)}); if (!el) return 'missing'; el.scrollTop = ${b}; return 'scrolled' })()`)
      if (String(result).startsWith('missing')) throw new Error(`${scenario.name}: ${result}`)
      await sleep(700)
    }
    if (recording) {
      const frames = await recording.stop()
      const made = encodeRecording(frames, { out: OUT, name: scenario.name, wide: !scenario.view.mobile })
      console.log(`wrote ${made.gif} and ${made.mp4} (${made.seconds} s, ${made.frames} frames)`)
      return
    }
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(`${OUT}/${scenario.name}.png`, Buffer.from(shot.result.data, 'base64'))
    console.log(`wrote ${OUT}/${scenario.name}.png`)
  })
}

mkdirSync(OUT, { recursive: true })
const only = process.argv[2]
for (const s of scenarios) {
  if (only && s.name !== only) continue
  await run(s)
}
