// 最小渲染冒烟：加载 client.js 工厂，SSR 渲染右栏面板体，捕获渲染期抛错（TDZ/未定义等）。
import { createRequire } from 'node:module'
import vm from 'node:vm'
import fs from 'node:fs'

let profileRequire
try {
  profileRequire = createRequire(import.meta.url)
  profileRequire('react')
} catch {
  profileRequire = createRequire(new URL('../../smoke/x.js', import.meta.url))
}
const React = profileRequire('react')
const ReactDOMServer = profileRequire('react-dom/server')

const listeners = {}
const windowStub = {
  innerWidth: 1200,
  innerHeight: 800,
  addEventListener: (k, f) => { (listeners[k] = listeners[k] || []).push(f) },
  removeEventListener: () => {},
  matchMedia: () => ({ matches: false }),
  confirm: () => true,
}
const documentStub = {
  createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, remove() {}, click() {} }),
  getElementById: () => null,
  head: { appendChild() {} },
  body: { appendChild() {} },
  addEventListener: () => {},
  removeEventListener: () => {},
  contains: () => false,
}
const stateData = {
  version: '0.2.0',
  tasks: [{ id: 't1', title: '冒烟', note: '', status: 'planned', workspaceId: null, planStartAt: null, planEndAt: null, attachments: [], parentId: null, color: 'cream', x: 24, y: 24, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' }],
  config: { llmTools: true, remind: { enabled: true, leadMinutes: 60, soonMin: 30, overdueMin: 10, reRemindHours: 1, checkMin: 5 } },
  statuses: ['planned', 'active', 'done', 'cancelled'],
  pending: 1,
  trashCount: 0,
  workspaces: [],
  storage: { dataDir: 'x', tasksFile: 'x', configFile: 'x' },
}
const fetchStub = async () => ({ status: 200, json: async () => ({ ok: true, data: stateData }) })

let mod = null
const sandbox = {
  window: windowStub,
  document: documentStub,
  navigator: { clipboard: { readText: async () => '', writeText: async () => {} } },
  sessionStorage: { getItem: () => null, setItem: () => {} },
  requestAnimationFrame: (f) => 0,
  cancelAnimationFrame: () => {},
  setTimeout, clearTimeout, setInterval, clearInterval,
  console,
  fetch: fetchStub,
  URL, Blob: class {}, URLSearchParams,
  Date, Math, JSON, Number, String, Array, Object, Set, Map, RegExp, Error, Promise,
}
sandbox.window.__ModuleLoader__ = { load: ({ factory }) => { mod = factory((name) => {
  if (name === 'react') return React
  if (name === 'react-dom') return { createPortal: (n) => n }
  throw new Error('unexpected require ' + name)
}) } }
sandbox.globalThis = sandbox
vm.createContext(sandbox)
const src = fs.readFileSync('C:/Users/Wysl/Documents/local/repo/dsh-sticky-wall/client.js', 'utf8')
vm.runInContext(src, sandbox, { filename: 'client.js' })
if (!mod) { console.error('FAIL: module not loaded'); process.exit(1) }

const regs = {}
const ctx = {
  locale: null,
  get: () => undefined,
  effect: (fn) => { try { const d = fn(); return typeof d === 'function' ? d : () => {} } catch (e) { console.error('EFFECT THROW:', e && e.stack || e); return () => {} } },
  inject: (names, cb) => { cb({ effect: ctx.effect, shortcuts: null, workingDirectory: null, sidebarRight: { openTab: () => {} }, sidebarRightTabs: { register: () => () => {} } }) },
  slots: {
    inject: (name, factory) => factory(),
    register: (opts, Comp) => { regs[(opts.name || '') + '|' + (opts.key || opts.id || '')] = Comp; return () => {} },
  },
}
mod.apply(ctx)
const paneKey = Object.keys(regs).find((k) => k.startsWith('sidebar.right.pane.tab|'))
if (!paneKey) { console.error('FAIL: pane body not registered', Object.keys(regs)); process.exit(1) }
const PaneBody = regs[paneKey]
try {
  const html = ReactDOMServer.renderToString(React.createElement(PaneBody))
  console.log('RENDER_OK length=', html.length)
} catch (e) {
  console.error('RENDER THROW:', e && e.stack || e)
  process.exit(1)
}
