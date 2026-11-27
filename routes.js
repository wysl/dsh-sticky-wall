// 便签墙面板背后的同源 JSON 路由。
//
// Client 半侧无法 import Host 代码，而 `ctx.remote` 的命名空间在应用组装时固定，
// 所以插件自己的浏览器半侧经应用自带的 HTTP 载体访问 Host 半侧。
// 每条路由都声明 `auth: 'required'`：DSH 0.2.3+ 的 webServer 在 HTTP 层执行准入
// （Host/Origin 检查 + 登录 Cookie）；0.2.2-rc.5 的 WebRoute 没有该字段、会忽略它，
// 该版本下面板 API 仅由回环地址暴露，没有登录门禁。
//
// 面板与 agent 工具调用的是同一套 operations（见 index.js），不存在第二份业务逻辑。

const PREFIX = '/dsh-todo/api'
const MAX_BODY_BYTES = 256 * 1024

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

function sendJson(response, status, payload) {
  if (response.headersSent) {
    try { response.end() } catch { /* 已经结束 */ }
    return
  }
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  response.end(JSON.stringify(payload))
}

async function readJsonBody(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw httpError(413, 'The request body exceeds 256 KiB.')
    chunks.push(chunk)
  }
  const text = Buffer.concat(chunks).toString('utf8').trim()
  if (!text) return {}
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    throw httpError(400, `The request body is not valid JSON: ${String((error && error.message) || error)}`)
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw httpError(400, 'The request body must be a JSON object.')
  }
  return parsed
}

/**
 * 在 Host 的 HTTP 载体上注册便签墙 JSON 路由。
 * @param webServer - `webServer` 服务；准入由它的 `auth` 策略负责。
 * @param service - agent 工具同样调用的那套 operations。
 * @returns 撤销全部路由的 disposer。
 */
export function registerRoutes(webServer, service) {
  if (!webServer || typeof webServer.register !== 'function') throw new Error('The webServer service is unavailable.')
  const disposers = []

  function route(path, methods, handle) {
    const handler = async function (request, response) {
      const method = String(request.method || 'GET').toUpperCase()
      if (methods.indexOf(method) < 0) {
        sendJson(response, 405, { ok: false, error: `Unsupported request method: ${method}` })
        return
      }
      try {
        const body = method === 'GET' || method === 'HEAD' ? {} : await readJsonBody(request)
        const url = new URL('http://local' + (request.url || '/'))
        const data = await handle({ method, body, url })
        sendJson(response, 200, { ok: true, data })
      } catch (error) {
        // 4xx 是调用方的输入问题；其余都算本 Host 自身失败。
        const explicit = typeof error?.status === 'number' ? error.status : undefined
        const status = explicit ?? (error?.expose === true ? 400 : 500)
        sendJson(response, status, {
          ok: false,
          // message 面向模型与日志；code 是面板本地化用的稳定标识。
          error: String((error && error.message) || error),
          ...(typeof error?.code === 'string' ? { code: error.code } : {}),
        })
      }
    }
    disposers.push(webServer.register({
      kind: 'exact',
      path: PREFIX + path,
      handler,
      // 便签属于用户的私有工作数据，绝不允许匿名读写：认证与 Host/Origin 检查交由载体执行。
      auth: 'required',
    }))
  }

  try {
    // 同一路径承载读写：webServer 的注册以 path 为键，拆成两条会互相覆盖。
    route('/state', ['GET'], () => service.state())
    route('/config', ['GET', 'POST'], ({ method, body }) => (
      method === 'GET' ? service.config() : service.updateConfig(body)
    ))
    route('/tasks', ['POST'], ({ body }) => service.create(body))
    route('/tasks/update', ['POST'], ({ body }) => service.update(body))
    route('/tasks/arrange', ['POST'], ({ body }) => service.arrange(body))
    route('/tasks/delete', ['POST'], ({ body }) => service.remove(body))
    route('/open', ['POST'], ({ body }) => service.open(body))
    route('/export', ['GET'], () => service.exportWall())
    route('/import', ['POST'], ({ body }) => service.importWall(body))
    route('/tasks/restore', ['POST'], ({ body }) => service.restore(body))
    route('/trash', ['GET'], () => service.trash())
    route('/trash/empty', ['POST'], () => service.emptyTrash())
    route('/tasks/bulk', ['POST'], ({ body }) => service.bulkUpdate(body))
  } catch (error) {
    // 部分注册失败不能泄漏已经注册上的路由。
    for (const dispose of disposers.splice(0)) {
      try {
        if (typeof dispose === 'function') dispose()
      } catch { /* 撤销不能抛错 */ }
    }
    throw error
  }

  return function disposeRoutes() {
    for (const dispose of disposers.splice(0)) {
      try {
        if (typeof dispose === 'function') dispose()
      } catch { /* 撤销不能抛错 */ }
    }
  }
}
