// 离线自检：不启动宿主，用桩 ctx 验证 Host 半侧的存储、路由、工具注册开关与工具行为。
// 运行：node test/selftest.mjs

import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = fileURLToPath(new URL('..', import.meta.url))
const HOME = join(HERE, '.selftest-home')
process.env.DSH_HOME = HOME

rmSync(HOME, { recursive: true, force: true })
mkdirSync(join(HOME, 'dsh-todo'), { recursive: true })

const logs = []
const routes = []
let registered = []

const webCtx = {
  webServer: {
    register(route) {
      routes.push(route)
      return () => {
        const index = routes.indexOf(route)
        if (index >= 0) routes.splice(index, 1)
      }
    },
  },
  effect(fn) {
    const disposer = fn()
    return () => { if (typeof disposer === 'function') disposer() }
  },
}

function makeContext() {
  return {
    logger: { info: (message) => logs.push(message), warn: (message) => logs.push(`warn: ${message}`) },
    tools: {
      register(definition) {
        registered.push(definition)
        return () => {
          const index = registered.indexOf(definition)
          if (index >= 0) registered.splice(index, 1)
        }
      },
    },
    effect(fn) {
      const disposer = fn()
      return () => { if (typeof disposer === 'function') disposer() }
    },
    on() {
      return () => {}
    },
    inject(names, callback) {
      if (names.indexOf('webServer') >= 0) return callback(webCtx)
      const scope = {
        effect(fn) {
          const disposer = fn()
          return () => { if (typeof disposer === 'function') disposer() }
        },
      }
      if (names.indexOf('workingDirectory') >= 0) scope.workingDirectory = { ensure: async () => 'E:\\dsh' }
      callback(scope)
    },
    get(name) {
      if (name === 'workspaceRegistry') {
        return { list: () => [{ id: 'ws-research', title: '研发', path: 'E:\\dsh' }] }
      }
      return undefined
    },
  }
}

async function callRoute(path, method, body) {
  const route = routes.find((entry) => entry.path === `/dsh-todo/api${path}`)
  if (!route) throw new Error(`no route ${path}`)
  const chunks = body === undefined ? [] : [Buffer.from(JSON.stringify(body), 'utf8')]
  const request = {
    method,
    url: `${route.path}`,
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk
    },
  }
  let status = 0
  let text = ''
  const response = {
    headersSent: false,
    writeHead(nextStatus) { status = nextStatus; this.headersSent = true },
    end(payload) { if (payload !== undefined) text = String(payload) },
  }
  await route.handler(request, response)
  let parsed = null
  try { parsed = JSON.parse(text) } catch { parsed = null }
  return { status, body: parsed, route }
}

const results = []
function check(label, condition, detail) {
  results.push({ label, ok: condition === true, detail })
  if (condition !== true) console.error(`FAIL  ${label}${detail ? ` — ${detail}` : ''}`)
  else console.log(`ok    ${label}`)
}

// ---------------------------------------------------------------- 默认关闭

writeFileSync(join(HOME, 'dsh-todo', 'config.json'), JSON.stringify({ llmTools: false }))
const { apply } = await import('../index.js')
apply(makeContext(), {})
check('默认配置下不注册任何工具', registered.length === 0, `registered=${registered.length}`)
check('默认设置落盘为 llmTools=false', JSON.parse(readFileSync(join(HOME, 'dsh-todo', 'config.json'), 'utf8')).llmTools === false)
check('路由已注册且要求登录', routes.length === 14 && routes.every((route) => route.auth === 'required'), `routes=${routes.length}`)

// ---------------------------------------------------------------- 普通便签

const created = await callRoute('/tasks', 'POST', { title: '写周报' })
check('只给正文即可创建', created.status === 200 && created.body?.ok === true, JSON.stringify(created.body))
const plain = created.body?.data?.task
check('全部可选字段留空 = 普通便签',
  plain.workspaceId === null && plain.planStartAt === null && plain.planEndAt === null && plain.attachments.length === 0,
  JSON.stringify(plain))

const state = await callRoute('/state', 'GET')
check('state 返回任务与设置',
  state.body?.data?.tasks?.length === 1 && state.body?.data?.config?.llmTools === false,
  JSON.stringify(state.body?.data?.config))
check('state 带工作区清单供关联',
  Array.isArray(state.body?.data?.workspaces) && state.body.data.workspaces[0].id === 'ws-research')

// ---------------------------------------------------------------- 可选字段

const full = await callRoute('/tasks', 'POST', {
  title: '评审设计稿',
  note: '带附件和时间',
  status: 'active',
  workspaceId: 'ws-research',
  planStartAt: '2026-11-25T09:00',
  planEndAt: '2026-11-25T18:00',
  attachments: [{ name: '设计稿', path: 'E:\\docs\\design.md' }],
})
const rich = full.body?.data?.task
check('可选字段可以一起填', rich?.workspaceId === 'ws-research' && rich?.status === 'active' && rich?.attachments?.length === 1,
  JSON.stringify(rich))
check('时间按 ISO 归一化', typeof rich?.planStartAt === 'string' && rich.planStartAt.includes('T'), rich?.planStartAt)

const badStatus = await callRoute('/tasks', 'POST', { title: '非法状态', status: 'blocked' })
check('拒绝第五种状态', badStatus.status === 400 && /status must be one of/.test(badStatus.body?.error || ''), String(badStatus.body?.error))
check('状态错误带稳定错误码', badStatus.body?.code === 'STATUS_INVALID', String(badStatus.body?.code))

const missingUpdate = await callRoute('/tasks/update', 'POST', { id: 'todo_nope', patch: { status: 'done' } })
check('改不存在的便签返回 404 与 NOT_FOUND',
  missingUpdate.status === 404 && missingUpdate.body?.code === 'NOT_FOUND',
  JSON.stringify(missingUpdate.body))

const openMissing = await callRoute('/open', 'POST', { path: join(HOME, 'definitely-not-here.md') })
check('打开不存在的附件返回 404 而不启动进程',
  openMissing.status === 404 && openMissing.body?.code === 'NOT_FOUND',
  JSON.stringify(openMissing.body))

const inverted = await callRoute('/tasks/update', 'POST', {
  id: rich.id,
  patch: { planStartAt: '2026-11-26T09:00', planEndAt: '2026-11-25T09:00' },
})
check('起止时间倒置只提示不拦截',
  inverted.body?.ok === true && typeof inverted.body?.data?.warning === 'string',
  JSON.stringify(inverted.body?.data?.warning))

const cleared = await callRoute('/tasks/update', 'POST', {
  id: rich.id,
  patch: { clear: ['workspaceId', 'planStartAt', 'planEndAt', 'attachments'] },
})
const clearedTask = cleared.body?.data?.task
check('清空可选字段回到普通便签',
  clearedTask?.workspaceId === null && clearedTask?.planStartAt === null && clearedTask?.attachments.length === 0,
  JSON.stringify(clearedTask))

// ---------------------------------------------------------------- 开关与工具

const enabled = await callRoute('/config', 'POST', { llmTools: true })
check('设置开启写入文件', enabled.body?.data?.llmTools === true
  && JSON.parse(readFileSync(join(HOME, 'dsh-todo', 'config.json'), 'utf8')).llmTools === true)
check('开启后只注册按需加载入口',
  registered.length === 1 && registered[0].name === 'todo_load_tools',
  registered.map((tool) => tool.name).join(','))

// 模拟调用该入口的 agent：作用域内注册的工具单独收集。
const agentRegistered = []
const fakeAgent = {
  id: 'agent-selftest',
  ctx: {
    tools: {
      register(definition) {
        agentRegistered.push(definition)
        return () => {
          const index = agentRegistered.indexOf(definition)
          if (index >= 0) agentRegistered.splice(index, 1)
        }
      },
    },
  },
}
const loader = registered[0]
const loadedText = (await loader.execute({}, { agent: fakeAgent })).text
check('加载入口调用后出现八个工具',
  agentRegistered.length === 8
  && agentRegistered.map((tool) => tool.name).sort().join(',') === 'todo_arrange,todo_bulk_update,todo_create,todo_delete,todo_list,todo_restore,todo_split,todo_update',
  `${agentRegistered.map((tool) => tool.name).join(',')} :: ${loadedText}`)

const againText = (await loader.execute({}, { agent: fakeAgent })).text
check('重复调用不会重复注册', agentRegistered.length === 8 && /already loaded/.test(againText), againText)
const noAgentText = (await loader.execute({}, {})).text
check('没有 agent 上下文时不加载', agentRegistered.length === 8 && /No agent context/.test(noAgentText), noAgentText)

const listTool = agentRegistered.find((tool) => tool.name === 'todo_list')
const createTool = agentRegistered.find((tool) => tool.name === 'todo_create')
const updateTool = agentRegistered.find((tool) => tool.name === 'todo_update')
const splitTool = agentRegistered.find((tool) => tool.name === 'todo_split')
const deleteTool = agentRegistered.find((tool) => tool.name === 'todo_delete')

// 只留一张待完成便签，验证默认只列 pending。
await callRoute('/tasks/update', 'POST', { id: rich.id, patch: { status: 'done' } })
const listText = (await listTool.execute({}, {})).text
check('todo_list 默认只列待完成', listText.includes('写周报'), listText)
check('todo_list 不列已完成', listText.includes('评审设计稿') === false, listText)
check('普通便签在列表里有标记', /plain note/.test(listText), listText)

const createdPlain = await callRoute('/tasks', 'POST', { title: '整理素材' })
const plainId = createdPlain.body?.data?.task?.id
const updatedText = (await updateTool.execute({
  id: plainId,
  status: 'active',
  workspaceId: 'ws-research',
  planStartAt: '2026-11-27T10:00',
}, {})).text
check('todo_update 改状态与工作区', /Updated/.test(updatedText) && /active/.test(updatedText), updatedText)

const splitText = (await splitTool.execute({ id: plainId, subtasks: ['收集图片', '写图注'] }, {})).text
check('todo_split 生成两张子便签', /into 2 note/.test(splitText), splitText)
const afterSplit = await callRoute('/state', 'GET')
const children = afterSplit.body.data.tasks.filter((task) => task.parentId === plainId)
check('子便签带 parentId 且为规划中', children.length === 2 && children.every((task) => task.status === 'planned'),
  JSON.stringify(children.map((task) => [task.title, task.status])))

const createdViaTool = await createTool.execute({ title: '工具新建的便签', note: '由 todo_create 创建' }, {})
check('todo_create 直接新建便签', /Created \[todo_/.test(createdViaTool.text), createdViaTool.text)
const afterCreate = await callRoute('/state', 'GET')
const toolNote = afterCreate.body.data.tasks.find((task) => task.title === '工具新建的便签')
check('todo_create 只给标题 = 普通便签且已落盘',
  toolNote && toolNote.status === 'planned' && toolNote.workspaceId === null
  && toolNote.planStartAt === null && toolNote.attachments.length === 0
  && typeof toolNote.x === 'number' && typeof toolNote.y === 'number',
  JSON.stringify(toolNote))
const createNoTitle = await createTool.execute({ note: '没有标题' }, {}).then(() => null, (error) => error)
check('todo_create 缺标题被拒绝', createNoTitle && /title is required/.test(createNoTitle.message), String(createNoTitle))

const autoWs = await createTool.execute({ title: '自动关联工作区' }, { agent: { id: 'agent-selftest' } })
check('todo_create 省略 workspaceId 自动关联当前会话工作区', /workspace 研发/.test(autoWs.text), autoWs.text)
const autoWsState = await callRoute('/state', 'GET')
const autoWsTask = autoWsState.body.data.tasks.find((task) => task.title === '自动关联工作区')
check('自动关联落盘为 ws-research', autoWsTask && autoWsTask.workspaceId === 'ws-research', JSON.stringify(autoWsTask && autoWsTask.workspaceId))

const verboseText = (await listTool.execute({ status: 'all', includeBody: true }, {})).text
check('todo_list includeBody 输出正文与附件明细', /body:/.test(verboseText) && verboseText.includes('带附件和时间'), verboseText.slice(0, 200))
const pagedText = (await listTool.execute({ status: 'all', limit: 1, offset: 1 }, {})).text
check('todo_list offset 翻页回显 matched/offset', /1 shown of \d+ matched/.test(pagedText) && /offset 1/.test(pagedText), pagedText.slice(0, 120))
const deletedText = (await deleteTool.execute({ id: autoWsTask.id }, {})).text
check('todo_delete 删除便签', /Deleted \[/.test(deletedText), deletedText)
const afterDeleteWs = await callRoute('/state', 'GET')
check('删除后墙上不再有该便签', !afterDeleteWs.body.data.tasks.some((task) => task.id === autoWsTask.id), deletedText)

const restoreTool = agentRegistered.find((tool) => tool.name === 'todo_restore')
const bulkTool = agentRegistered.find((tool) => tool.name === 'todo_bulk_update')
const arrangeTool = agentRegistered.find((tool) => tool.name === 'todo_arrange')
const restoredText = (await restoreTool.execute({ id: autoWsTask.id }, {})).text
check('todo_restore 从回收站恢复', /Restored \[/.test(restoredText), restoredText)
const exportRes = await callRoute('/export', 'GET')
check('导出含当前便签', exportRes.body?.ok === true && exportRes.body.data.tasks.some((task) => task.id === autoWsTask.id), JSON.stringify(exportRes.body?.data?.tasks?.length))
const importMerge = await callRoute('/import', 'POST', { mode: 'merge', tasks: [{ id: 'todo_imp1', title: '导入合并' }, { id: autoWsTask.id, title: '重复应跳过' }] })
check('导入 merge 补新跳重', importMerge.body?.data?.added === 1 && importMerge.body?.data?.skipped === 1, JSON.stringify(importMerge.body?.data))
const bulkText = (await bulkTool.execute({ ids: ['todo_imp1', autoWsTask.id], status: 'done' }, {})).text
check('todo_bulk_update 批量改状态', /Bulk updated 2/.test(bulkText), bulkText)
const arrangeText = (await arrangeTool.execute({ columns: 2 }, {})).text
check('todo_arrange 整理成网格', /Arranged \d+ note/.test(arrangeText), arrangeText)
const trashRes = await callRoute('/trash', 'GET')
check('回收站列表可读', trashRes.body?.ok === true && Array.isArray(trashRes.body.data.items), JSON.stringify(trashRes.body?.data))
const emptyRes = await callRoute('/trash/empty', 'POST')
check('清空回收站', emptyRes.body?.ok === true, JSON.stringify(emptyRes.body))

const disabled = await callRoute('/config', 'POST', { llmTools: false })
check('关闭后入口与已加载工具都撤销',
  disabled.body?.data?.llmTools === false && registered.length === 0 && agentRegistered.length === 0,
  `registered=${registered.length} agent=${agentRegistered.length}`)

// ---------------------------------------------------------------- 摆放、纸色与整理

const posA = (await callRoute('/tasks', 'POST', { title: '摆放 A', x: 40, y: 60, color: 'mint' })).body.data.task
check('创建时写入位置与纸色', posA.x === 40 && posA.y === 60 && posA.color === 'mint', JSON.stringify(posA))

const posB = (await callRoute('/tasks', 'POST', { title: '摆放 B' })).body.data.task
check('没有位置时自动补网格与默认纸色',
  typeof posB.x === 'number' && typeof posB.y === 'number' && posB.color === 'cream',
  JSON.stringify(posB))

const badColor = await callRoute('/tasks', 'POST', { title: '坏纸色', color: 'rainbow' })
check('拒绝预选色之外的纸色',
  badColor.status === 400 && badColor.body?.code === 'COLOR_INVALID',
  JSON.stringify(badColor.body))

const badPos = await callRoute('/tasks/update', 'POST', { id: posA.id, patch: { x: -5 } })
check('拒绝负数坐标',
  badPos.status === 400 && badPos.body?.code === 'POSITION_INVALID',
  JSON.stringify(badPos.body))

const arranged = await callRoute('/tasks/arrange', 'POST', {
  positions: [{ id: posA.id, x: 100, y: 120 }, { id: posB.id, x: 364, y: 120 }],
})
check('arrange 批量保存位置',
  arranged.body?.ok === true && arranged.body?.data?.count === 2,
  JSON.stringify(arranged.body))

const afterArrange = await callRoute('/state', 'GET')
const arrangedTasks = afterArrange.body.data.tasks.filter((task) => [posA.id, posB.id].includes(task.id))
check('位置持久化', arrangedTasks.every((task) => task.x >= 100)
  && arrangedTasks.find((task) => task.id === posB.id)?.x === 364,
  JSON.stringify(arrangedTasks.map((task) => [task.title, task.x, task.y])))

const badArrange = await callRoute('/tasks/arrange', 'POST', { positions: [{ id: 'todo_nope', x: 1, y: 2 }] })
check('arrange 拒绝不存在的便签',
  badArrange.status === 404 && badArrange.body?.code === 'NOT_FOUND',
  JSON.stringify(badArrange.body))

// ---------------------------------------------------------------- 外部直写热重载

const beforeExternal = await callRoute('/state', 'GET')
const externalTasks = beforeExternal.body.data.tasks.map((task) => ({ ...task }))
externalTasks.push({
  id: 'todo_external1',
  title: '外部写入的便签',
  status: 'planned',
  createdAt: '2026-11-25T00:00:00.000Z',
  updatedAt: '2026-11-25T00:00:00.000Z',
})
writeFileSync(join(HOME, 'dsh-todo', 'tasks.json'), JSON.stringify({ version: 1, tasks: externalTasks }))
const externalList = (await listTool.execute({ status: 'all', limit: 50 }, {})).text
check('外部直写 tasks.json 后无需重启即可看到', externalList.includes('外部写入的便签'), externalList)
const externalUpdated = await updateTool.execute({ id: 'todo_external1', status: 'active' }, {})
check('外部写入的便签可以直接修改', /Updated \[todo_external1\]/.test(externalUpdated.text), externalUpdated.text)
const afterExternal = JSON.parse(readFileSync(join(HOME, 'dsh-todo', 'tasks.json'), 'utf8'))
check('回写不丢外部便签也不丢原有便签',
  afterExternal.tasks.some((task) => task.id === 'todo_external1' && task.status === 'active')
  && afterExternal.tasks.length === externalTasks.length,
  JSON.stringify(afterExternal.tasks.map((task) => task.id)))

// ---------------------------------------------------------------- 删除与留档

const removed = await callRoute('/tasks/delete', 'POST', { id: plainId })
const afterDelete = await callRoute('/state', 'GET')
check('删除父便签不连带删除子便签',
  removed.body?.ok === true
  && afterDelete.body.data.tasks.filter((task) => task.title === '收集图片').every((task) => task.parentId === null),
  JSON.stringify(removed.body?.data))

// ---------------------------------------------------------------- 旧数据迁移

writeFileSync(join(HOME, 'dsh-todo', 'tasks.json'), JSON.stringify({
  version: 1,
  tasks: [
    { id: 'todo_legacy1', title: '旧便签一', status: 'planned', planStartAt: null, updatedAt: '2026-11-20T00:00:00.000Z', createdAt: '2026-11-20T00:00:00.000Z' },
    { id: 'todo_legacy2', title: '旧便签二', status: 'planned', planStartAt: null, updatedAt: '2026-11-21T00:00:00.000Z', createdAt: '2026-11-21T00:00:00.000Z' },
  ],
}))
apply(makeContext(), {})
const migratedTasks = JSON.parse(readFileSync(join(HOME, 'dsh-todo', 'tasks.json'), 'utf8')).tasks
check('旧数据自动补位置与纸色',
  migratedTasks.every((task) => typeof task.x === 'number' && typeof task.y === 'number')
  && migratedTasks.every((task) => task.color === 'cream')
  && migratedTasks[0].x === 24 && migratedTasks[1].x === 248,
  JSON.stringify(migratedTasks.map((task) => [task.title, task.x, task.y, task.color])))

// ---------------------------------------------------------------- 坏文件留档

writeFileSync(join(HOME, 'dsh-todo', 'tasks.json'), '{ broken json')
apply(makeContext(), {})
const moved = readFileSync(join(HOME, 'dsh-todo', 'tasks.json'), 'utf8')
check('坏掉的任务文件被重置为空清单', moved.includes('"tasks": []'))
const corruptBackups = readdirSync(join(HOME, 'dsh-todo')).filter((name) => name.startsWith('tasks.json.corrupt-'))
check('非法 JSON 改名留档而不是静默覆盖',
  corruptBackups.length === 1
  && readFileSync(join(HOME, 'dsh-todo', corruptBackups[0]), 'utf8').includes('{ broken json'),
  corruptBackups.join(','))

writeFileSync(join(HOME, 'dsh-todo', 'tasks.json'), JSON.stringify({ version: 1, nope: true }))
apply(makeContext(), {})
const shapeBackups = readdirSync(join(HOME, 'dsh-todo')).filter((name) => name.startsWith('tasks.json.corrupt-')).sort()
check('合法 JSON 但结构不对也留档',
  shapeBackups.length >= 1
  && readFileSync(join(HOME, 'dsh-todo', shapeBackups[shapeBackups.length - 1]), 'utf8').includes('"nope"')
  && readFileSync(join(HOME, 'dsh-todo', 'tasks.json'), 'utf8').includes('"tasks": []'),
  shapeBackups.join(','))

writeFileSync(join(HOME, 'dsh-todo', 'config.json'), '{ broken config')
apply(makeContext(), {})
check('坏掉的设置文件回落默认值',
  JSON.parse(readFileSync(join(HOME, 'dsh-todo', 'config.json'), 'utf8')).llmTools === false)

rmSync(HOME, { recursive: true, force: true })

const failed = results.filter((result) => !result.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
if (failed.length > 0) process.exitCode = 1
