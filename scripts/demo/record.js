/* eslint-disable import-x/no-nodejs-modules */
// Records the looped animation of the app in a phone frame for the README, with no dependencies:
// builds the app, serves the build along with the demo page, drives Google Chrome via the
// DevTools protocol, a drawn hand taps the buttons, and ffmpeg encodes the screencast to WebP.
// Needs Chrome and ffmpeg built with libwebp. Run with `npm run demo`, see the options below.

import { Buffer } from 'node:buffer'
import { spawn, spawnSync } from 'node:child_process'
import { createReadStream, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, extname, join, resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import process from 'node:process'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

const { values: options } = parseArgs({
  options: {
    out: { type: 'string', default: 'assets/demo.webp' },
    chrome: { type: 'string', default: process.env.CHROME || 'google-chrome' },
    // Slows down (> 1) or speeds up (< 1) all the pauses and movements
    pace: { type: 'string', default: '1' },
    // WebP quality from 0 to 100, check the frames for traces of the moving hand when lowering it
    quality: { type: 'string', default: '75' },
    // Lossless WebP, several times larger
    lossless: { type: 'boolean', default: false },
    // Shows the browser window, for debugging of the scenario
    show: { type: 'boolean', default: false },
    // Only serves the build with the demo page at /demo, for working on the page
    serve: { type: 'boolean', default: false },
    // Keeps the lossless screencast in this file, or encodes this one instead of recording,
    // for trying the WebP options
    screencast: { type: 'string' },
    'from-screencast': { type: 'boolean', default: false },
    fps: { type: 'string', default: '12' },
    // Width of the animation in pixels, as wide as the page in CSS pixels by default
    width: { type: 'string', default: '568' }
  }
})

const WIDTH = 568
// Ends right below the language label, with no empty margin for the README heading lines to run into
const HEIGHT = 792
// Recorded at a constant rate and scale, both are reduced when encoding to WebP
const SCALE = 1.5
const FPS = 30
const PACE = Number(options.pace)

// Languages shown one after another, each for a few questions, and whether they were known
const SCENES = [
  { languages: ['en-US'], name: 'English', answers: [true, false, true] },
  { languages: ['ru-RU'], name: 'Русский', answers: [false, true, true] },
  { languages: ['es-ES'], name: 'Español', answers: [true, true, false] },
  { languages: ['zh-CN'], name: '中文', answers: [true, false, true] }
]

// Runs in the app frame before its scripts: preferred languages come from the demo page,
// and questions are picked by a seeded random, so every recording is the same
const FRAME_SCRIPT = `
  if (window !== window.top) {
    let seed = 7
    Math.random = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296
    const languages = () => window.top.languages || ['en-US']
    Object.defineProperty(Navigator.prototype, 'languages', { get: languages })
    Object.defineProperty(Navigator.prototype, 'language', { get: () => languages()[0] })
  }
`

function build(dir) {
  console.log('Building the app...')
  const result = spawnSync(
    join(ROOT, 'node_modules/.bin/vite'),
    ['build', '--outDir', dir, '--emptyOutDir'],
    { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] }
  )
  if (result.status !== 0) throw new Error('Unable to build the app')
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2'
}

async function serve(dir) {
  const page = readFileSync(fileURLToPath(new URL('page.html', import.meta.url)))
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    if (path === '/demo') {
      res.writeHead(200, { 'Content-Type': MIME_TYPES['.html'] })
      return res.end(page)
    }
    let file = resolve(join(dir, path))
    if (!file.startsWith(dir) || !existsSync(file) || path.endsWith('/')) {
      file = join(dir, 'index.html')
    }
    res.writeHead(200, { 'Content-Type': MIME_TYPES[extname(file)] || 'application/octet-stream' })
    createReadStream(file).pipe(res)
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  return server
}

async function launchChrome(profileDir) {
  const args = [
    `--user-data-dir=${profileDir}`,
    '--remote-debugging-port=0',
    `--window-size=${WIDTH},${HEIGHT}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--hide-scrollbars',
    '--mute-audio',
    '--force-color-profile=srgb',
    'about:blank'
  ]
  if (!options.show) args.unshift('--headless=new')
  const chrome = spawn(options.chrome, args, { stdio: ['ignore', 'ignore', 'pipe'] })
  const browserUrl = await new Promise((resolve, reject) => {
    let output = ''
    chrome.on('error', reject)
    chrome.on('exit', () => reject(new Error(`Chrome exited unexpectedly:\n${output}`)))
    chrome.stderr.on('data', (chunk) => {
      output += chunk
      const matched = output.match(/DevTools listening on (ws:\/\/\S+)/)
      if (matched) resolve(matched[1])
    })
  })
  const { host } = new URL(browserUrl)
  const targets = await (await fetch(`http://${host}/json/list`)).json()
  const target = targets.find(({ type }) => type === 'page')
  return { chrome, pageUrl: target.webSocketDebuggerUrl }
}

class Connection {
  #ws
  #nextId = 1
  #pending = new Map()
  #listeners = new Map()

  static async open(url) {
    const connection = new Connection()
    connection.#ws = new WebSocket(url)
    connection.#ws.addEventListener('message', (event) => connection.#receive(event.data))
    await new Promise((resolve, reject) => {
      connection.#ws.addEventListener('open', resolve, { once: true })
      connection.#ws.addEventListener('error', reject, { once: true })
    })
    return connection
  }

  #receive(raw) {
    const message = JSON.parse(raw)
    if (message.id) {
      const { resolve, reject } = this.#pending.get(message.id)
      this.#pending.delete(message.id)
      if (message.error) reject(new Error(`${message.error.message} ${message.error.data || ''}`))
      else resolve(message.result)
    } else {
      this.#listeners.get(message.method)?.(message.params)
    }
  }

  send(method, params = {}) {
    const id = this.#nextId++
    this.#ws.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => this.#pending.set(id, { resolve, reject }))
  }

  on(method, listener) {
    this.#listeners.set(method, listener)
  }

  close() {
    this.#ws.close()
  }
}

// Saves the screencast as a lossless video, keeping its transparency
class Recorder {
  #cdp
  #ffmpeg
  #closed
  #start
  #frame
  #written = 0

  constructor(cdp, file) {
    this.#cdp = cdp
    this.#ffmpeg = spawn(
      'ffmpeg',
      [
        ['-y', '-loglevel', 'error'],
        ['-f', 'image2pipe', '-c:v', 'png', '-framerate', FPS, '-i', 'pipe:0'],
        ['-vf', `scale=${WIDTH * SCALE}:${HEIGHT * SCALE}`, '-c:v', 'ffv1', '-pix_fmt', 'bgra'],
        file
      ]
        .flat()
        .map(String),
      { stdio: ['pipe', 'inherit', 'inherit'] }
    )
    this.#closed = new Promise((resolve) => this.#ffmpeg.on('close', resolve))
  }

  time() {
    return (performance.now() - this.#start) / 1000
  }

  async start() {
    this.#cdp.on('Page.screencastFrame', ({ data, sessionId }) => {
      this.#cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
      this.#flush()
      this.#frame = Buffer.from(data, 'base64')
    })
    this.#start = performance.now()
    await this.#cdp.send('Page.startScreencast', {
      format: 'png',
      maxWidth: WIDTH * SCALE,
      maxHeight: HEIGHT * SCALE
    })
  }

  // Chrome sends frames only when the page changes, so the last frame is
  // repeated until the next one to keep the frame rate constant
  #flush() {
    if (!this.#frame) return
    const due = Math.round(this.time() * FPS)
    for (; this.#written < due; this.#written++) this.#ffmpeg.stdin.write(this.#frame)
  }

  async stop() {
    await this.#cdp.send('Page.stopScreencast')
    this.#flush()
    this.#ffmpeg.stdin.end()
    await this.#closed
  }
}

// Scenario

let cdp

async function evaluate(expression) {
  const { result, exceptionDetails } = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  })
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description || expression)
  return result.value
}

async function waitFor(expression, timeout = 10000) {
  const start = performance.now()
  while (!(await evaluate(expression))) {
    if (performance.now() - start > timeout) throw new Error(`Timed out waiting for ${expression}`)
    await sleep(50)
  }
}

const pause = (ms) => sleep(ms * PACE)

async function mouse(type, { x, y }) {
  await cdp.send('Input.dispatchMouseEvent', {
    type,
    x,
    y,
    button: 'left',
    buttons: type === 'mouseReleased' ? 0 : 1,
    clickCount: 1
  })
}

// Moves the hand to an element of the app and taps it, or holds it for a while
async function tap(selector, { hold = 0 } = {}) {
  const point = await evaluate(`demo.point(${JSON.stringify(selector)})`)
  await evaluate(`demo.move(${point.x}, ${point.y}, ${550 * PACE})`)
  await pause(80)
  await evaluate(`demo.press()`)
  await mouse('mousePressed', point)
  if (hold) {
    await evaluate(`demo.hold(${hold})`)
    await pause(100)
  }
  await mouse('mouseReleased', point)
  // Keeps the mouse off the buttons, so they show no hover
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 0, y: 0 })
  await evaluate(`demo.release()`)
  if (hold) await evaluate(`demo.unhold()`)
}

// Pulls the hand aside to the corner, so the answer is seen, or out of the video
async function retreat({ away = false } = {}) {
  const { x, y } = await evaluate(`demo.rest(${away})`)
  await evaluate(`demo.move(${x}, ${y}, ${500 * PACE})`)
}

async function question(known) {
  await pause(400)
  await tap('.text-button > div')
  await retreat()
  await waitFor('demo.revealed()')
  await pause(900)
  // The buttons are "I didn't know" and then "I knew"
  await tap(`.text-button > div:nth-child(${known ? 2 : 1})`)
  await retreat()
}

async function scenario() {
  for (const [index, { languages, name, answers }] of SCENES.entries()) {
    if (index > 0) {
      await retreat({ away: true })
      await evaluate(`demo.language(${JSON.stringify(languages)}, ${JSON.stringify(name)})`)
      await pause(1100)
    }
    for (const known of answers) await question(known)
  }
  // Resets the progress by a long press on the score, so the animation loops seamlessly
  await pause(600)
  await tap('.q-badge', { hold: 1100 })
  await retreat({ away: true })
  await pause(900)
  await evaluate(`demo.language(${JSON.stringify(SCENES[0].languages)}, '${SCENES[0].name}')`)
  await pause(1100)
}

// Encodes the screencast to a looped animated WebP
function encode(screencast, file) {
  const width = Number(options.width)
  const height = Math.round((width * HEIGHT) / WIDTH)
  const result = spawnSync(
    'ffmpeg',
    [
      ['-y', '-loglevel', 'error', '-i', screencast],
      ['-vf', `fps=${options.fps},scale=${width}:${height}:flags=lanczos,format=yuva420p`],
      ['-c:v', 'libwebp_anim', '-loop', '0', '-compression_level', '6'],
      options.lossless ? ['-lossless', '1'] : ['-quality', options.quality],
      file
    ]
      .flat()
      .map(String),
    { stdio: 'inherit' }
  )
  if (result.status !== 0) throw new Error('Unable to encode the animation')
  console.log(`Done, ${(readFileSync(file).length / 1024).toFixed(0)} KiB`)
}

async function main() {
  const out = resolve(ROOT, options.out)
  mkdirSync(dirname(out), { recursive: true })
  if (options['from-screencast']) return encode(resolve(options.screencast), out)

  const work = mkdtempSync(join(tmpdir(), 'mult-demo-'))
  const screencast = options.screencast ? resolve(options.screencast) : join(work, 'demo.mkv')
  let server, chrome
  try {
    build(join(work, 'dist'))
    server = await serve(join(work, 'dist'))
    const appUrl = `http://127.0.0.1:${server.address().port}`
    if (options.serve) {
      console.log(`Serving the demo page at ${appUrl}/demo, stop with Ctrl+C`)
      await new Promise(() => {})
    }
    const launched = await launchChrome(join(work, 'profile'))
    chrome = launched.chrome
    cdp = await Connection.open(launched.pageUrl)

    await cdp.send('Page.enable')
    await cdp.send('Runtime.enable')
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: WIDTH,
      height: HEIGHT,
      deviceScaleFactor: SCALE,
      mobile: false
    })
    await cdp.send('Emulation.setDefaultBackgroundColorOverride', {
      color: { r: 0, g: 0, b: 0, a: 0 }
    })
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: FRAME_SCRIPT })
    await cdp.send('Page.navigate', { url: `${appUrl}/demo` })
    await waitFor('window.demo && demo.ready()')
    await evaluate(`window.languages = ${JSON.stringify(SCENES[0].languages)}`)
    await evaluate(`document.querySelector('.language span').textContent = '${SCENES[0].name}'`)
    // Lets the app finish fading in
    await sleep(800)

    console.log('Recording...')
    const recorder = new Recorder(cdp, screencast)
    await recorder.start()
    await scenario()
    await recorder.stop()
    console.log(`Encoding to ${options.out}...`)
    encode(screencast, out)
  } finally {
    cdp?.close()
    chrome?.kill()
    server?.close()
    rmSync(work, { recursive: true, force: true })
  }
}

await main()
