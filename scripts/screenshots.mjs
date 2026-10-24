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
import { encodeRecording, glide, startRecording, waitUntil } from './recording.mjs'

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
 *  glide <css> <px> <ms> scroll it smoothly, for a recording
 *  code <text>           replace the editor's text, typed in a character at a time
 *  review                press Review (the recording runs the wait for the model's first word fast)
 *  until <js> <ms>       wait until the expression is true in the page
 */
/** A solution typed in by the recordings, and how they know the model's review has started and finished. */
const SOLUTION = `export function maxProfit(prices: number[]): number {
  let lowest = Infinity;
  let best = 0;
  for (const price of prices) {
    lowest = Math.min(lowest, price);
    best = Math.max(best, price - lowest);
  }
  return best;
}
`
const WRITING = `!!document.querySelector('.review-body')`
const REVIEWED = `!document.querySelector('.review-status') && !!document.querySelector('.review .score')`
/**
 * Type into CodeMirror through its own view (what EditorView.findFromDOM finds), so the
 * text goes in exactly as written: typing keys would set off its bracket
 * closing and auto-indent on top of the indentation already in the text.
 */
const typeCode = (text) => `new Promise((resolve) => {
  const content = document.querySelector('.editor .cm-content')
  const view = content?.cmTile?.root?.view ?? content?.cmView?.view
  if (!view) return resolve('missing editor')
  view.focus()
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: '' } })
  const text = ${JSON.stringify(text)}
  let i = 0
  const next = () => {
    if (i >= text.length) return resolve('typed')
    // A run of indentation goes in at once, as the editor would put it.
    let j = i + 1
    if (text[i] === '\\n') while (text[j] === ' ') j++
    const at = view.state.doc.length
    view.dispatch({ changes: { from: at, insert: text.slice(i, j) }, selection: { anchor: at + j - i }, scrollIntoView: true })
    const ch = text[i]
    i = j
    setTimeout(next, ch === '\\n' ? 160 : ch === ' ' ? 55 : 28 + Math.random() * 22)
  }
  next()
})`
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
  // A solution typed in, its tests run, and the model's review of it, written as it streams.
  { name: 'demo-phone', view: PHONE, record: true, speed: 1.3, maxGap: 1.8, steps: [['wait', 900], ['click', 'Best Time to Buy and Sell Stock'], ['wait', 1500], ['tab', 'Code'], ['wait', 1600], ['code', SOLUTION], ['wait', 500], ['run'], ['wait', 2600], ['review'], ['wait', 300], ['tab', 'Review'], ['until', WRITING, 120000], ['until', REVIEWED, 180000], ['wait', 600], ['glide', '.pane-review', 99999, 1800], ['wait', 1600]] },
  { name: 'demo-desktop', view: DESKTOP, record: true, speed: 1.3, maxGap: 1.8, steps: [['wait', 900], ['click', 'Best Time to Buy and Sell Stock'], ['wait', 1700], ['code', SOLUTION], ['wait', 500], ['run'], ['wait', 2600], ['review'], ['until', WRITING, 120000], ['until', REVIEWED, 180000], ['wait', 600], ['glide', '.pane-work', 99999, 1800], ['wait', 1600]] },
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
    // The wait between pressing Review and the model's first word is run fast in the recording.
    const fast = { from: 0, to: 0, factor: 12 }
    for (const [op, a, b, c] of scenario.steps) {
      let result = ''
      if (op === 'click') result = await evaluate(clickText(a))
      else if (op === 'glide') result = await glide(evaluate, a, b, c)
      else if (op === 'code') result = (await evaluate(typeCode(a))) ?? 'missing editor (the typing script failed)'
      else if (op === 'review') { result = await evaluate(`(() => { const btn = [...document.querySelectorAll('.workbar button')].find((x) => x.textContent.trim() === 'Review'); if (!btn) return 'missing Review'; btn.click(); return 'clicked' })()`); fast.from = Date.now() / 1000 }
      else if (op === 'until') { result = await waitUntil(evaluate, a, b); if (result === 'timeout') throw new Error(`${scenario.name}: gave up waiting for ${a}`); if (fast.from && !fast.to) fast.to = Date.now() / 1000 }
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
      const made = encodeRecording(frames, { out: OUT, name: scenario.name, wide: !scenario.view.mobile, speed: scenario.speed ?? 1, maxGap: scenario.maxGap ?? 0.9, fast: fast.to ? fast : null })
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
