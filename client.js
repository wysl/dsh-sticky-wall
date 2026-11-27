// TODO 便签墙 —— Client 半侧（Web GUI）。
//
// 四处贡献，共用同一个数据源：
//   1. conversation.session.header.utilities：会话标题栏右上图标排里的入口按钮。
//   2. sidebarRightTabs 的 guide：右栏「开始」引导列表里的一张便签墙卡片。
//      两者都点开右侧栏的便签墙标签（sidebar.right.pane.tab），不占用主对话区。
//   3. sidebar.right.pane.tab（key = todo-wall）：右栏里的便签墙面板。
//   4. settings.general.item：设置 → 通用里的「允许 LLM 读取和改写任务」开关。
//
// 数据经同源 HTTP 路由 /dsh-todo/api 读写 Host 半侧（见 routes.js）。
// 界面壳层只用宿主 --dsw-alias-* / 结构变量；便签纸是刻意的纸张色板与纸面墨色
// （--todo-paper-* / --todo-ink-*），用于在深色主题下也保持暖色便签观感。

window.__ModuleLoader__.load({
  id: '@wysl/dsh-sticky-wall',
  factory(require) {
    const React = require('react')
    let ReactDOM = null
    try { ReactDOM = require('react-dom') } catch { ReactDOM = null }
    const h = React.createElement

    const API = '/dsh-todo/api'
    const NS = 'wysl.dsh-sticky-wall'
    const PANEL_ID = 'todo-wall'
    const STATUSES = ['planned', 'active', 'done', 'cancelled']
    const PAPER = {
      cream: '#fdf6d9',
      lemon: '#fbf0b5',
      mint: '#dcefe1',
      sky: '#dcebf5',
      rose: '#f7dfe3',
      lilac: '#e9e2f4',
    }
    const PAPER_ORDER = ['cream', 'lemon', 'mint', 'sky', 'rose', 'lilac']
    const NOTE_W = 240
    const NOTE_H = 200
    const GAP = 20
    const POLL_MS = 5000
    const ERROR_POLL_MS = 30000
    const LOADING_POLL_MS = 1500

    const DICT = {
      zh: {
        nav: '便签墙',
        guideDesc: '自由摆放的暖色便签 TODO 墙，点开在右栏查看与编辑。',
        dblEdit: '双击编辑',
        emptyBodyHint: '双击添加正文…',
        openAttachment: '用系统默认程序打开',
        trash: '回收站',
        trashTitle: '回收站',
        trashEmpty: '回收站是空的。',
        restore: '恢复',
        emptyTrash: '清空回收站',
        undo: '撤销',
        backupTitle: '备份与恢复',
        backupDesc: '导出整面墙为 JSON 备份；导入时合并只补新 id，替换会覆盖整墙（需确认）。',
        exportWall: '导出 JSON',
        importWall: '导入 JSON',
        importMode: '导入方式',
        importMerge: '合并（只补新 id）',
        importReplace: '替换整墙',
        importConfirm: '替换会覆盖当前整面墙，确定继续？',
        importBadFile: '文件不是有效的备份 JSON。',
        exported: '已导出备份文件。',
        imported: '导入完成：新增 {added}，跳过 {skipped}。',
        ctxOpen: '展开编辑',
        ctxEditTitle: '编辑标题',
        ctxEditBody: '编辑正文',
        ctxStatus: '状态',
        ctxColor: '纸色',
        ctxWorkspace: '关联工作区',
        ctxUnlink: '不关联',
        ctxCopyTitle: '复制标题',
        ctxCopyBody: '复制正文',
        ctxDelete: '删除',
        ctxCollapse: '收起',
        bubblePending: '{n} 个待完成',
        bubbleView: '查看',
        dueSoon: '{n} 个便签 1 小时内到期',
        dueOverdue: '{n} 个便签已到期',
        dueBoth: '{o} 个已到期 · {s} 个 1 小时内到期',
        viewWall: '墙',
        viewList: '列表',
        viewToggle: '视图切换',
        template: '模板',
        tplPlain: '默认',
        tplMeeting: '会议',
        tplBug: 'Bug',
        tplIdea: '想法',
        tplMeetingTitle: '会议：',
        tplMeetingBody: '时间：\n参与：\n议题：\n结论：\n行动项：',
        tplBugTitle: 'Bug：',
        tplBugBody: '现象：\n复现：\n期望：\n实际：\n环境：',
        tplIdeaTitle: '想法：',
        tplIdeaBody: '背景：\n想法：\n下一步：',
        archive: '归档',
        archiveShow: '显示归档',
        archiveHide: '隐藏归档',
        selectAll: '全选',
        selectedN: '已选 {n}',
        bulkStatus: '批量状态',
        bulkColor: '批量纸色',
        bulkWorkspace: '批量工作区',
        bulkDelete: '删除所选',
        bulkDone: '批量更新 {n} 张',
        bulkDeleted: '已删除 {n} 张',
        clearSelect: '清除选择',
        listTitle: '标题',
        listStatus: '状态',
        listWorkspace: '工作区',
        listEnd: '结束',
        listActions: '操作',
        searchHint: '搜索（支持 status: / workspace:）',
        remindTitle: '到期提醒',
        remindDesc: '对设了预计结束且仍待完成的便签，在临近 / 到期时弹悬浮提醒。',
        remindEnabled: '启用提醒',
        remindLead: '提前量',
        remindSoon: '临近气泡时长(分)',
        remindOverdue: '到期气泡时长(分)',
        remindRe: '重复提醒间隔(时)',
        remindCheck: '复检间隔(分)',
        exportMd: '导出 MD',
        exportCsv: '导出 CSV',
        exportedMd: '已导出 Markdown。',
        exportedCsv: '已导出 CSV。',
        preview: '预览',
        previewTitle: '附件预览',
        previewLoad: '加载中…',
        previewFail: '无法加载附件。',
        dropStatus: '已移到 {status}',
        kbdHint: '快捷键：/ 搜索 · n 新建 · e 编辑 · Delete 删除',
        collapse: '收起',
        quickHint: '双击标题/正文编辑 · 点空白收起',
        title: '便签墙',
        subtitle: '一张一张贴上去。状态只是便签里的一个字段。',
        newNote: '新便签',
        arrange: '整理',
        filterAll: '全部',
        search: '搜索标题或正文',
        allWorkspaces: '全部工作区',
        unlinked: '不关联工作区',
        removedWorkspace: '工作区已移除',
        wallHint: '拖动便签摆放 · 点击便签原地编辑 · Esc 取消',
        wallEmpty: '墙上还没有便签',
        wallEmptyHint: '点右上角「新便签」贴一张',
        noMatch: '没有匹配的便签',
        noMatchHint: '换个关键词或状态看看',
        statusPlanned: '规划中',
        statusActive: '进行中',
        statusDone: '已完成',
        statusCancelled: '已撤销',
        titleField: '标题',
        titlePlaceholder: '标题',
        noteField: '正文',
        bodyPlaceholder: '写点什么…',
        statusField: '状态',
        paperColor: '纸色',
        planStartField: '开始',
        planEndField: '结束',
        workspaceField: '关联工作区',
        attachmentsField: '文档附件',
        attachmentPlaceholder: '文档路径或链接',
        addAttachment: '添加附件',
        attachmentHint: '可留空；路径不存在也能先记下。',
        missingFile: '文件不存在',
        moreFields: '更多字段（工作区、附件）',
        startsAt: '开始',
        endsAt: '截止',
        timeInvalidShort: '时间异常',
        noStatus: '未设置',
        plainNote: '普通便签',
        edit: '编辑',
        save: '保存',
        saving: '保存中…',
        cancel: '取消',
        close: '关闭',
        remove: '移除',
        delete: '删除',
        deleteAgain: '再点一次确认删除',
        deleting: '删除中…',
        titleRequired: '标题或正文不能都为空',
        timeWarning: '预计结束早于计划开始',
        timeOptionalHint: '只填开始也可以，结束留空表示还没定',
        addEnd: '+ 添加结束时间',
        clearTime: '清除',
        colorCream: '米黄',
        colorLemon: '柠檬',
        colorMint: '薄荷',
        colorSky: '天空',
        colorRose: '樱花',
        colorLilac: '丁香',
        settings: '设置',
        settingsTitle: '便签墙设置',
        llmTitle: '允许 LLM 读取和改写任务',
        llmOn: '已开启',
        llmOff: '已关闭（默认）',
        llmHelp: '开启后，模型先只看到 todo_load_tools；它调用一次，当前会话才会加载 todo_list、todo_create、todo_update、todo_split（查看待完成、新建、修改、拆解）。关闭时连加载入口也不注册，模型无法调用。',
        llmToolsLabel: '按需加载：先入口，再四个工具',
        toolLoader: 'todo_load_tools（按需加载入口）',
        dataFile: '任务数据',
        configFile: '设置文件',
        llmBadgeOn: 'LLM 工具已开启',
        llmBadgeOff: 'LLM 工具默认关闭',
        errorTitle: '便签墙数据接口不可用',
        errorHint: '面板经 Web GUI 的 HTTP 接口读写便签。请确认在 Web GUI 中打开且已登录，然后重试。',
        authError: '登录状态已失效，请重新登录后再试。',
        retry: '重试',
        requestFailed: '请求失败，请稍后重试。',
        errNotFound: '这张便签已经被删除，刷新后再试。',
        errStatus: '状态只能是规划中、进行中、已完成、已撤销。',
        errTime: '时间格式不正确，请重新选择。',
        errAttachments: '每张便签最多 20 个附件。',
        errAttachmentInvalid: '附件路径或链接无效。',
        errWallFull: '便签数量已达上限。',
        errConfig: '设置值无效。',
        errInvalid: '输入不合法，请检查正文与各字段。',
        created: '已贴上一张便签',
        saved: '已保存',
        removed: '已删除',
        configSaved: '设置已更新',
        discardAsk: '还有未保存的修改，确定放弃？',
        discardDiscard: '放弃修改',
        discardKeep: '继续编辑',
        attachmentCount: '{n} 个附件',
        pendingCount: '{n} 张待完成',
        loading: '正在载入便签…',
      },
      en: {
        nav: 'Sticky wall',
        guideDesc: 'A warm sticky-note TODO wall you can arrange freely; opens in the right sidebar.',
        dblEdit: 'Double-click to edit',
        emptyBodyHint: 'Double-click to add body…',
        openAttachment: 'Open with system default',
        trash: 'Trash',
        trashTitle: 'Trash',
        trashEmpty: 'Trash is empty.',
        restore: 'Restore',
        emptyTrash: 'Empty trash',
        undo: 'Undo',
        backupTitle: 'Backup & restore',
        backupDesc: 'Export the whole wall as a JSON backup; import merges only new ids, replace overwrites the wall (confirmed).',
        exportWall: 'Export JSON',
        importWall: 'Import JSON',
        importMode: 'Import mode',
        importMerge: 'Merge (new ids only)',
        importReplace: 'Replace wall',
        importConfirm: 'Replace overwrites the entire wall. Continue?',
        importBadFile: 'File is not a valid backup JSON.',
        exported: 'Backup file exported.',
        imported: 'Import done: added {added}, skipped {skipped}.',
        ctxOpen: 'Open editor',
        ctxEditTitle: 'Edit title',
        ctxEditBody: 'Edit body',
        ctxStatus: 'Status',
        ctxColor: 'Paper color',
        ctxWorkspace: 'Link workspace',
        ctxUnlink: 'Unlink',
        ctxCopyTitle: 'Copy title',
        ctxCopyBody: 'Copy body',
        ctxDelete: 'Delete',
        ctxCollapse: 'Collapse',
        bubblePending: '{n} pending',
        bubbleView: 'View',
        dueSoon: '{n} note(s) due within 1h',
        dueOverdue: '{n} note(s) overdue',
        dueBoth: '{o} overdue · {s} due within 1h',
        viewWall: 'Wall',
        viewList: 'List',
        viewToggle: 'Switch view',
        template: 'Template',
        tplPlain: 'Plain',
        tplMeeting: 'Meeting',
        tplBug: 'Bug',
        tplIdea: 'Idea',
        tplMeetingTitle: 'Meeting: ',
        tplMeetingBody: 'When:\nWho:\nAgenda:\nDecisions:\nActions:',
        tplBugTitle: 'Bug: ',
        tplBugBody: 'Symptom:\nRepro:\nExpected:\nActual:\nEnv:',
        tplIdeaTitle: 'Idea: ',
        tplIdeaBody: 'Context:\nIdea:\nNext:',
        archive: 'Archive',
        archiveShow: 'Show archived',
        archiveHide: 'Hide archived',
        selectAll: 'Select all',
        selectedN: '{n} selected',
        bulkStatus: 'Bulk status',
        bulkColor: 'Bulk color',
        bulkWorkspace: 'Bulk workspace',
        bulkDelete: 'Delete selected',
        bulkDone: 'Bulk updated {n}',
        bulkDeleted: 'Deleted {n}',
        clearSelect: 'Clear selection',
        listTitle: 'Title',
        listStatus: 'Status',
        listWorkspace: 'Workspace',
        listEnd: 'Due',
        listActions: 'Actions',
        searchHint: 'Search (status: / workspace: supported)',
        remindTitle: 'Due reminders',
        remindDesc: 'Floating reminders for pending notes with an expected end, when near / past due.',
        remindEnabled: 'Enable reminders',
        remindLead: 'Lead time',
        remindSoon: 'Near-due bubble (min)',
        remindOverdue: 'Overdue bubble (min)',
        remindRe: 'Re-remind every (h)',
        remindCheck: 'Check every (min)',
        exportMd: 'Export MD',
        exportCsv: 'Export CSV',
        exportedMd: 'Markdown exported.',
        exportedCsv: 'CSV exported.',
        preview: 'Preview',
        previewTitle: 'Attachment preview',
        previewLoad: 'Loading…',
        previewFail: 'Cannot load attachment.',
        dropStatus: 'Moved to {status}',
        kbdHint: 'Keys: / search · n new · e edit · Delete delete',
        collapse: 'Collapse',
        quickHint: 'Double-click title/body to edit · click blank to collapse',
        title: 'Sticky wall',
        subtitle: 'Pinned one by one. Status is just a field on the note.',
        newNote: 'New note',
        arrange: 'Tidy up',
        filterAll: 'All',
        search: 'Search title or body',
        allWorkspaces: 'All workspaces',
        unlinked: 'No workspace',
        removedWorkspace: 'Workspace removed',
        wallHint: 'Drag notes to place them · click a note to edit in place · Esc to cancel',
        wallEmpty: 'The wall is empty',
        wallEmptyHint: 'Use “New note” to pin one',
        noMatch: 'No notes match',
        noMatchHint: 'Try another keyword or status',
        statusPlanned: 'Planned',
        statusActive: 'In progress',
        statusDone: 'Done',
        statusCancelled: 'Cancelled',
        titleField: 'Title',
        titlePlaceholder: 'Title',
        noteField: 'Body',
        bodyPlaceholder: 'Write something…',
        statusField: 'Status',
        paperColor: 'Paper',
        planStartField: 'Starts',
        planEndField: 'Ends',
        workspaceField: 'Linked workspace',
        attachmentsField: 'Document attachments',
        attachmentPlaceholder: 'Document path or link',
        addAttachment: 'Add',
        attachmentHint: 'Optional. A path that does not exist yet is still kept.',
        missingFile: 'File not found',
        moreFields: 'More fields (workspace, attachments)',
        startsAt: 'Starts',
        endsAt: 'Ends',
        timeInvalidShort: 'Invalid time',
        noStatus: 'Not set',
        plainNote: 'Plain note',
        edit: 'Edit',
        save: 'Save',
        saving: 'Saving…',
        cancel: 'Cancel',
        close: 'Close',
        remove: 'Remove',
        delete: 'Delete',
        deleteAgain: 'Click again to delete',
        deleting: 'Deleting…',
        titleRequired: 'A note needs a title or body',
        timeWarning: 'End is earlier than start',
        timeOptionalHint: 'A start time alone is fine; leave the end empty when it is not decided',
        addEnd: '+ Add end time',
        clearTime: 'Clear',
        colorCream: 'Cream',
        colorLemon: 'Lemon',
        colorMint: 'Mint',
        colorSky: 'Sky',
        colorRose: 'Rose',
        colorLilac: 'Lilac',
        settings: 'Settings',
        settingsTitle: 'Sticky wall settings',
        llmTitle: 'Allow the LLM to read and change tasks',
        llmOn: 'On',
        llmOff: 'Off (default)',
        llmHelp: 'When on, the model first sees only todo_load_tools. One call loads todo_list, todo_create, todo_update and todo_split for the current session (list pending notes, create a note, change a note, split one note). When off, even the loader is not registered and nothing can be called.',
        llmToolsLabel: 'Loaded on demand: one loader, then four tools',
        toolLoader: 'todo_load_tools (on-demand loader)',
        dataFile: 'Task data',
        configFile: 'Settings file',
        llmBadgeOn: 'LLM tools on',
        llmBadgeOff: 'LLM tools off by default',
        errorTitle: 'The sticky wall data endpoint is unavailable',
        errorHint: 'The panel reads and writes notes over the Web GUI HTTP endpoint. Open it in the Web GUI while signed in, then retry.',
        authError: 'Your sign-in expired. Sign in again and retry.',
        retry: 'Retry',
        requestFailed: 'The request failed. Try again.',
        errNotFound: 'That note was already deleted. Refresh and try again.',
        errStatus: 'Status must be planned, in progress, done or cancelled.',
        errTime: 'That date and time is not valid.',
        errAttachments: 'A note can keep at most 20 attachments.',
        errAttachmentInvalid: 'That attachment path or link is not valid.',
        errWallFull: 'The wall reached its note limit.',
        errConfig: 'That setting value is not valid.',
        errInvalid: 'Some input is not valid. Check the note text and fields.',
        created: 'Note pinned',
        saved: 'Saved',
        removed: 'Deleted',
        configSaved: 'Settings updated',
        discardAsk: 'Discard the unsaved changes?',
        discardDiscard: 'Discard',
        discardKeep: 'Keep editing',
        attachmentCount: '{n} attachment(s)',
        pendingCount: '{n} pending',
        loading: 'Loading notes…',
      },
    }

    const CSS = `
      .todo-root{
        /* 纸张色板与纸面墨色：便签是刻意的“纸”，不跟随宿主深浅色 */
        --todo-paper-cream:#fdf6d9;
        --todo-paper-lemon:#fbf0b5;
        --todo-paper-mint:#dcefe1;
        --todo-paper-sky:#dcebf5;
        --todo-paper-rose:#f7dfe3;
        --todo-paper-lilac:#e9e2f4;
        --todo-ink:#2b271f;
        --todo-ink-soft:#5d5648;
        --todo-ink-faint:#6f6858;
        --todo-danger:#a4443c;
        --todo-paper-line:rgba(120,100,60,.2);
        --todo-paper-line-strong:rgba(120,100,60,.32);
        box-sizing:border-box;display:flex;flex-direction:column;width:100%;height:100%;min-height:0;
        overflow:hidden;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);
        font-size:14px;line-height:1.6;container-type:inline-size;
      }
      .todo-topbar{
        position:relative;z-index:30;flex:none;display:flex;flex-wrap:wrap;align-items:center;
        gap:8px 12px;padding:12px 20px;border-bottom:1px solid var(--dsw-alias-border-l1);
        background:var(--dsw-alias-bg-base);
      }
      .todo-brand{display:flex;align-items:center;gap:8px;margin-right:auto;min-width:0}
      .todo-brand h1{margin:0;font-size:18px;line-height:26px;font-weight:600;color:var(--dsw-alias-label-primary);white-space:nowrap}
      .todo-brand .sub{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .todo-tools{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
      .todo-search{box-sizing:border-box;display:flex;align-items:center;gap:8px;width:200px;height:32px;padding:0 9px;border:0.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-md);color:var(--dsw-alias-label-tertiary);transition:border-color .15s}
      .todo-search:focus-within{border-color:var(--dsw-alias-state-business-primary)}
      .todo-search svg{flex:none;width:14px;height:14px}
      .todo-search input{flex:1;min-width:0;height:100%;padding:0;border:0;outline:none;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px}
      .todo-search input::placeholder{color:var(--dsw-alias-label-tertiary)}
      .todo-chips{display:flex;align-items:center;gap:2px;padding:2px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1)}
      .todo-chip{display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 8px;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:12px;cursor:pointer;white-space:nowrap}
      .todo-chip:hover{background:var(--dsw-alias-interactive-bg-hover)}
      .todo-chip[aria-pressed="true"]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font-weight:600}
      .todo-chip .dot{width:6px;height:6px;border-radius:50%;flex:none;background:var(--dsw-alias-state-idle-primary)}      .todo-chip[data-status="active"] .dot{background:var(--dsw-alias-state-business-primary)}
      .todo-chip[data-status="done"] .dot{background:var(--dsw-alias-state-done-primary)}
      .todo-chip[data-status="cancelled"] .dot{background:var(--dsw-alias-label-tertiary)}
      .todo-chip .n{color:var(--dsw-alias-label-tertiary);font-weight:400;font-variant-numeric:tabular-nums}
      .todo-btn{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:4px;height:32px;padding:0 12px;border:1px solid transparent;border-radius:var(--dsw-radius-md);background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:20px;cursor:pointer;transition:background-color .12s}
      .todo-btn:disabled{cursor:not-allowed;opacity:.4}
      .todo-btn.ghost:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
      .todo-btn.primary{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground);font-weight:600}
      .todo-btn.icon{width:30px;padding:0;border-radius:var(--dsw-radius-sm)}
      .todo-btn.outline{box-shadow:inset 0 0 0 .5px var(--dsw-alias-border-l3)}
      .todo-btn.danger{color:var(--dsw-alias-state-error-primary);box-shadow:inset 0 0 0 .5px var(--dsw-alias-state-error-primary)}
      .todo-btn.small{height:28px;padding:0 10px;font-size:12px;border-radius:var(--dsw-radius-sm)}
      @media (hover:hover){
        .todo-btn.primary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}
        .todo-btn.ghost:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
        .todo-btn.icon:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
        .todo-btn.danger:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger)}
      }
      .todo-scroll{position:relative;flex:1;min-height:0;overflow:auto;scrollbar-gutter:stable;background-image:radial-gradient(var(--dsw-alias-border-l1) 1px, transparent 1px);background-size:22px 22px;background-position:-1px -1px}
      .todo-canvas{position:relative;min-width:100%;min-height:100%}
      .todo-notice{margin:8px 20px 0;font-size:12px;line-height:18px;color:var(--dsw-alias-state-success-primary)}
      .todo-error{margin:8px 20px 0;font-size:12px;line-height:18px;color:var(--dsw-alias-state-error-primary)}
      .todo-wallhint{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);text-align:center;color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.9;pointer-events:none}
      .todo-wallhint strong{display:block;color:var(--dsw-alias-label-secondary);font-size:15px;font-weight:500;margin-bottom:2px}
      .todo-statusbar{flex:none;display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:8px 20px;border-top:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-tertiary);font-size:12px;background:var(--dsw-alias-bg-base)}
      .todo-statusbar .sep{width:1px;height:12px;background:var(--dsw-alias-border-l1)}
      .todo-statusbar .spacer{flex:1}
      .todo-statusbar .state{font-variant-numeric:tabular-nums;white-space:nowrap}
      .todo-btn.todo-toggle{height:24px;font-size:12px;padding:0 8px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}
      .todo-toggle .dot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-idle-primary)}
      .todo-toggle[data-on="true"] .dot{background:var(--dsw-alias-state-success-primary)}

      /* ---------------- 便签 ---------------- */
      .todo-note{position:absolute;box-sizing:border-box;display:flex;flex-direction:column;width:${NOTE_W}px;height:${NOTE_H}px;padding:14px 15px 11px;border-radius:12px;background:var(--todo-paper, var(--todo-paper-cream));border:1px solid color-mix(in srgb, var(--todo-paper, var(--todo-paper-cream)) 72%, #7a621f);box-shadow:var(--dsw-elevation-panel);color:var(--todo-ink);cursor:pointer;user-select:none;touch-action:none;transition:box-shadow .16s,opacity .2s,filter .2s,background-color .25s,translate .16s,scale .16s;animation:todo-note-in .18s cubic-bezier(.2,.8,.2,1)}
      .todo-note.dragging{cursor:grabbing;z-index:9998;box-shadow:var(--dsw-elevation-prominent)}
      .todo-note.selected{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
      .todo-note:hover{translate:0 -2px;box-shadow:var(--dsw-elevation-prominent)}
      .todo-note.removing{animation:todo-note-out .16s ease forwards;pointer-events:none}
      .todo-note.pulse .todo-tag .dot{animation:todo-dot-pulse .35s ease}
      .todo-note.quiet{filter:saturate(.55);border-color:color-mix(in srgb, var(--todo-paper, var(--todo-paper-cream)) 45%, #7a621f);box-shadow:none}
      .todo-note.quiet:hover,.todo-note.quiet:focus-visible{filter:saturate(.85);box-shadow:var(--dsw-elevation-panel)}
      .todo-note.arranging{transition:left .38s cubic-bezier(.2,.8,.2,1),top .38s cubic-bezier(.2,.8,.2,1),box-shadow .16s,opacity .2s}
      .todo-tape{position:absolute;top:-6px;left:50%;width:62px;height:16px;transform:translateX(-50%) rotate(-2.2deg);background:linear-gradient(90deg, rgba(255,255,255,.28), rgba(255,255,255,.6) 40%, rgba(255,255,255,.38));border:1px solid rgba(120,100,60,.2);border-radius:2px;pointer-events:none}
      .todo-note-top{display:flex;align-items:center;gap:6px;flex:none;margin-bottom:7px;min-height:20px}
      .todo-tag{display:inline-flex;align-items:center;gap:5px;height:20px;padding:0 7px;border-radius:999px;background:rgba(255,255,255,.7);border:1px solid rgba(120,100,60,.16);color:var(--todo-ink-soft);font-size:11.5px;line-height:1;white-space:nowrap}
      .todo-tag .dot{width:6px;height:6px;border-radius:50%;background:#8b8476}
      .todo-tag[data-status="active"] .dot{background:#3d7e9c}
      .todo-tag[data-status="done"] .dot{background:#578a5d}
      .todo-tag[data-status="cancelled"] .dot{background:#a7a196}
      .todo-tag[data-status="cancelled"]{text-decoration:line-through}
      .todo-note-title{flex:none;margin:0 0 5px;font-size:15px;line-height:1.35;font-weight:650;letter-spacing:.1px;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;overflow-wrap:anywhere;color:var(--todo-ink)}
      .todo-note-body{flex:1;min-height:0;margin:0;padding-right:2px;font-size:13px;line-height:1.6;color:var(--todo-ink-soft);overflow-y:auto;overflow-x:hidden;overflow-wrap:anywhere;white-space:pre-wrap;scrollbar-width:thin;scrollbar-color:rgba(120,100,60,.28) transparent}
      .todo-note-body::-webkit-scrollbar{width:5px}
      .todo-note-body::-webkit-scrollbar-thumb{background:rgba(120,100,60,.22);border-radius:3px}
      .todo-note-body::-webkit-scrollbar-thumb:hover{background:rgba(120,100,60,.4)}
      .todo-note-body::-webkit-scrollbar-track{background:transparent}
      .todo-note-body.can-scroll{mask-image:linear-gradient(180deg,#000 calc(100% - 16px),transparent)}
      .todo-note-when{flex:none;margin-top:5px;padding-top:4px;border-top:1px dashed rgba(120,100,60,.18);color:var(--todo-ink-faint);font-size:11.5px;line-height:16px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .todo-note-when.warn{color:var(--todo-danger)}

      /* ---------------- 原地编辑 ---------------- */
      .todo-editor{position:absolute;z-index:9997;box-sizing:border-box;display:flex;flex-direction:column;gap:0;width:min(340px, calc(100% - 16px));padding:13px 14px 11px;border-radius:12px;background:var(--todo-paper, var(--todo-paper-cream));border:1px solid color-mix(in srgb, var(--todo-paper, var(--todo-paper-cream)) 62%, #7a621f);box-shadow:var(--dsw-elevation-prominent);color:var(--todo-ink);cursor:pointer;user-select:none;touch-action:none}
      .todo-editor-body{display:flex;flex-direction:column;gap:10px;flex:1;min-height:0;overflow:auto;scrollbar-width:thin}
      .todo-editor.dragging{cursor:grabbing;z-index:9998}
      .todo-editor.closing{pointer-events:none}
      .todo-collapse{position:absolute;top:8px;right:8px;z-index:2;display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;padding:0;border:none;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--todo-ink-faint);cursor:pointer}
      .todo-collapse:hover{background:rgba(120,100,60,.12);color:var(--todo-ink)}
      .todo-editor input,.todo-editor textarea,.todo-editor select{user-select:text}
      .todo-editor .title,.todo-editor textarea,.todo-textview{animation:todo-fade .15s ease}
      .todo-editor input.title{width:100%;border:0;border-bottom:1px dashed rgba(120,100,60,.3);background:transparent;padding:2px 30px 5px 0;font:inherit;font-size:17px;font-weight:650;color:var(--todo-ink);outline:none}
      .todo-editor input.title:focus{border-bottom-color:var(--todo-ink-soft);box-shadow:0 1px 0 0 var(--todo-ink-soft)}
      .todo-editor input.title::placeholder,.todo-editor textarea::placeholder{color:var(--todo-ink-faint);font-weight:400}
      .todo-editor textarea{width:100%;min-height:64px;max-height:240px;resize:none;border:0;background:transparent;padding:2px 0;font:inherit;font-size:13px;line-height:1.6;color:var(--todo-ink-soft);outline:none;overflow-y:auto}
      .todo-editor textarea:focus{box-shadow:0 0 0 2px rgba(93,86,72,.16);border-radius:6px}
      .todo-editor-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
      .todo-editor-row .label{font-size:11px;color:var(--todo-ink-faint);white-space:nowrap}
      .todo-palette{display:flex;align-items:center;gap:6px}
      .todo-swatch{width:22px;height:22px;padding:0;border-radius:50%;border:1px solid rgba(90,75,40,.4);cursor:pointer;background:var(--swatch)}
      .todo-swatch:focus-visible{outline:2px solid var(--todo-ink-soft);outline-offset:2px}
      .todo-swatch[aria-pressed="true"]{box-shadow:0 0 0 2px rgba(255,255,255,.9),0 0 0 3px var(--todo-ink-soft)}
      .todo-time-row{display:flex;flex-direction:column;gap:8px}
      .todo-field{display:flex;flex-direction:column;gap:3px;min-width:0}
      .todo-field > span{font-size:11px;color:var(--todo-ink-faint)}
      .todo-field input,.todo-field select{box-sizing:border-box;width:100%;height:30px;padding:0 7px;border:1px solid rgba(120,100,60,.3);border-radius:7px;background:rgba(120,100,60,.07);color:var(--todo-ink);font:inherit;font-size:12px;outline:none;min-width:0;color-scheme:light}
      .todo-field input:focus,.todo-field select:focus{border-color:var(--todo-ink-soft);box-shadow:0 0 0 2px rgba(93,86,72,.16)}
      .todo-field input::-webkit-calendar-picker-indicator{opacity:.8;cursor:pointer}
      .todo-field-head{display:flex;align-items:center;justify-content:space-between;gap:6px}
      .todo-field-head > span{font-size:11px;color:var(--todo-ink-faint)}
      .todo-time-clear{padding:4px 6px;min-height:24px;border:0;background:none;font-size:11px;line-height:16px;color:var(--todo-ink-faint);cursor:pointer}
      .todo-time-clear:hover{color:var(--todo-danger)}
      .todo-add-end{align-self:flex-start;height:26px;padding:0 9px;border:1px dashed rgba(120,100,60,.35);border-radius:7px;background:rgba(255,255,255,.35);color:var(--todo-ink-soft);font:inherit;font-size:11px;cursor:pointer}
      .todo-add-end:hover{background:rgba(255,255,255,.6);color:var(--todo-ink)}
      .todo-time-hint{margin:0;font-size:11px;line-height:16px;color:var(--todo-ink-faint)}
      .todo-invalid{margin:0;font-size:11px;line-height:16px;color:var(--todo-danger)}
      .todo-status-row{display:flex;flex-wrap:wrap;gap:4px;padding-top:7px;border-top:1px solid rgba(120,100,60,.16)}
      .todo-status-btn{display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 8px;border:1px solid transparent;border-radius:7px;background:transparent;color:var(--todo-ink-soft);font:inherit;font-size:12px;cursor:pointer}
      .todo-status-btn:hover{background:rgba(80,70,40,.07)}
      .todo-status-btn[aria-pressed="true"]{background:rgba(255,255,255,.85);border-color:rgba(120,100,60,.24);color:var(--todo-ink);font-weight:600}
      .todo-status-btn .dot{width:6px;height:6px;border-radius:50%;background:#8b8476}
      .todo-status-btn[data-status="active"] .dot{background:#3d7e9c}
      .todo-status-btn[data-status="done"] .dot{background:#578a5d}
      .todo-status-btn[data-status="cancelled"] .dot{background:#a7a196}
      .todo-status-btn[data-status="cancelled"]{text-decoration:line-through}
      .todo-details{border-top:1px solid rgba(120,100,60,.16);padding-top:7px}
      .todo-details summary{cursor:pointer;font-size:11px;color:var(--todo-ink-faint);list-style:none}
      .todo-details summary::-webkit-details-marker{display:none}
      .todo-details[open] summary{margin-bottom:7px}
      .todo-attach-list{display:flex;flex-direction:column;gap:4px;margin:0 0 6px;padding:0;list-style:none}
      .todo-attach{display:flex;align-items:center;gap:7px;min-width:0;padding:5px 7px;border:1px solid rgba(120,100,60,.2);border-radius:7px;background:rgba(255,255,255,.45);font-size:11.5px;line-height:16px}
      .todo-attach.openable{cursor:pointer}
      .todo-attach.openable:hover{background:rgba(120,100,60,.12)}
      .todo-attach.openable:focus-visible{outline:2px solid var(--todo-ink-soft);outline-offset:1px}
      .todo-trash-list{display:flex;flex-direction:column;margin:0;padding:0;list-style:none}
      .todo-trash-row{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px dashed var(--dsw-alias-border-l1)}
      .todo-trash-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
      .todo-trash-when{flex:none;color:var(--dsw-alias-label-tertiary);font-size:11px}
      .todo-ctx-overlay{position:fixed;inset:0;z-index:10000}
      .todo-ctx{position:fixed;z-index:10001;min-width:180px;max-width:260px;padding:4px;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-2);box-shadow:var(--dsw-elevation-prominent)}
      .todo-ctx-item{position:relative;display:flex;align-items:center;gap:8px;width:100%;padding:6px 8px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;cursor:pointer;text-align:left}
      .todo-ctx-item:hover,.todo-ctx-item:focus-visible{background:var(--dsw-alias-interactive-bg-hover)}
      .todo-ctx-item .arrow{margin-left:auto;color:var(--dsw-alias-label-tertiary)}
      .todo-ctx-item .dot{width:6px;height:6px;border-radius:50%;flex:none;background:#8b8476}
      .todo-ctx-item .dot[data-status="active"]{background:#3d7e9c}
      .todo-ctx-item .dot[data-status="done"]{background:#578a5d}
      .todo-ctx-item .dot[data-status="cancelled"]{background:#a7a196}
      .todo-ctx-item .swatch{width:12px;height:12px;border-radius:50%;flex:none;background:var(--swatch);border:1px solid rgba(90,75,40,.3)}
      .todo-ctx-sep{height:1px;margin:4px 6px;background:var(--dsw-alias-border-l1)}
      .todo-ctx-sub{position:absolute;left:100%;top:-4px;z-index:10002;min-width:150px;max-width:220px;max-height:240px;overflow:auto;padding:4px;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-2);box-shadow:var(--dsw-elevation-prominent);display:flex;flex-direction:column}
      .todo-attach-name{flex:none;max-width:42%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
      .todo-attach-path{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--todo-ink-faint)}
      .todo-attach-warn{flex:none;color:var(--todo-danger)}
      .todo-attach-remove{flex:none;border:0;border-radius:4px;background:transparent;color:var(--todo-ink-faint);font:inherit;font-size:11.5px;padding:1px 4px;cursor:pointer}
      .todo-attach-remove:hover{background:rgba(80,70,40,.08);color:var(--todo-danger)}
      .todo-editor-foot{display:flex;align-items:center;gap:6px;margin-top:1px}
      .todo-textview{cursor:pointer}
      .todo-view-title{margin:0 0 6px;padding-right:30px;font-size:16px;line-height:24px;font-weight:600;color:var(--todo-ink);word-break:break-word}
      .todo-view-body{margin:0 0 10px;min-height:40px;max-height:160px;overflow:auto;font-size:13px;line-height:20px;color:var(--todo-ink-soft);white-space:pre-wrap;word-break:break-word;scrollbar-width:thin;scrollbar-color:rgba(120,100,60,.28) transparent}
      .todo-view-body.can-scroll{mask-image:linear-gradient(180deg,#000 calc(100% - 16px),transparent)}
      .todo-empty-hint{color:var(--todo-ink-faint)}
      .todo-md-code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.92em;background:rgba(120,100,60,.12);border-radius:4px;padding:0 4px}
      .todo-md-pre{margin:4px 0;padding:8px 10px;background:rgba(120,100,60,.1);border:1px solid rgba(120,100,60,.18);border-radius:7px;overflow:auto;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.5;white-space:pre}
      .todo-md-link{color:#2f5d4a;text-decoration:underline;text-underline-offset:2px;cursor:pointer}
      .todo-md-link:hover{color:#26503f}
      .todo-hl{background:rgba(255,205,66,.5);color:inherit;border-radius:2px;padding:0 1px}
      .todo-quick-hint{font-size:11px;line-height:16px;color:var(--todo-ink-faint)}
      .todo-editor-foot .spacer{flex:1}
      .todo-mini{height:28px;padding:0 10px;border:1px solid transparent;border-radius:7px;background:transparent;color:var(--todo-ink-soft);font:inherit;font-size:12px;cursor:pointer}
      .todo-mini:hover{background:rgba(80,70,40,.08)}
      .todo-mini.danger{color:var(--todo-danger)}
      .todo-mini.danger:hover{background:rgba(164,68,60,.1)}

      /* ---------------- 设置弹层 ---------------- */
      .todo-overlay{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:max(24px,var(--dsh-frame-overlay-top,24px)) 24px}
      .todo-mask{position:absolute;inset:var(--dsh-frame-chrome-top,0px) 0 0;background:var(--dsw-alias-bg-mask-1);backdrop-filter:var(--dsw-mask-blur);animation:todo-fade var(--ds-transition-duration) var(--ds-ease-in-out)}
      .todo-dialog{position:relative;z-index:1;box-sizing:border-box;display:flex;flex-direction:column;width:min(440px,100%);max-height:100%;padding:0 0 24px;overflow:hidden;border:0;border-radius:var(--dsw-radius-panel);background:var(--dsw-alias-bg-layer-2);box-shadow:var(--dsw-elevation-prominent);animation:todo-fade var(--ds-transition-duration) var(--ds-ease-in-out)}
      .todo-dialog-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:22px 14px 12px 24px}
      .todo-dialog-title{margin:0;font-size:16px;line-height:24px;font-weight:500;color:var(--dsw-alias-label-primary)}
      .todo-dialog-close{display:inline-flex;flex:none;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
      .todo-dialog-close:hover{background:var(--dsw-alias-interactive-bg-hover)}
      .todo-dialog-body{display:flex;flex-direction:column;gap:16px;min-height:0;padding:0 24px;overflow:auto;overscroll-behavior:contain}
      .todo-dialog-foot{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:20px 24px 0}
      .todo-setting{display:flex;align-items:flex-start;justify-content:space-between;gap:24px}
      .todo-setting-copy{display:flex;flex-direction:column;gap:4px;min-width:0}
      .todo-setting-title{font-size:14px;line-height:20px;color:var(--dsw-alias-label-primary)}
      .todo-setting-desc{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}
      .todo-tool-list{margin:0;padding-left:16px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
      .todo-label{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}
      .todo-path{margin:0;font-family:var(--ds-font-family-code);font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere}
      .todo-dialog .todo-error,.todo-dialog .todo-notice{margin:0}
      .todo-dialog .todo-field > span{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
      .todo-dialog .todo-field select{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l4)}
      .todo-switch{position:relative;box-sizing:border-box;flex:0 0 auto;width:36px;height:20px;padding:2px;border:0;border-radius:999px;background:var(--dsw-alias-border-l3);cursor:pointer;transition:background-color 120ms ease}
      .todo-switch[aria-checked="true"]{background:var(--dsw-alias-brand-primary)}
      .todo-switch:disabled{cursor:not-allowed;opacity:.5}
      .todo-switch .knob{display:block;width:16px;height:16px;border-radius:50%;background:var(--dsw-alias-switch-thumb);transition:transform 120ms ease}
      .todo-switch[aria-checked="true"] .knob{background:var(--dsw-alias-label-primary-foreground);transform:translateX(16px)}

      /* ---------------- 设置 → 通用行 ---------------- */
      .todo-general-row{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:16px 0;border-bottom:0.5px solid var(--dsw-alias-border-l2)}
      .todo-general-copy{min-width:0}
      .todo-general-title{font-size:14px;line-height:20px;color:var(--dsw-alias-label-primary)}
      .todo-general-desc{margin-top:4px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
      .todo-general-status{margin-top:4px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
      .todo-general-error{margin-top:4px;color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}
      .todo-general-control{display:flex;flex:none;align-items:center;gap:4px}

      /* ---------------- 侧栏图标 / 计数 ---------------- */
      .todo-pending{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;font-variant-numeric:tabular-nums;padding:0 2px}
      .todo-pending-dot{display:block;width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-business-primary)}
      /* 右上入口按钮：贴合宿主图标排的尺寸与配色 */
      .todo-headbtn{position:relative;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:none;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;flex:none}
      .todo-headbtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
      .todo-headbtn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}
      .todo-headbtn .todo-pending-dot{position:absolute;top:3px;right:3px}
      /* 启动待办悬浮框：锚按钮下方、标签条右侧空白带，单行紧凑不遮对话；宿主 token 随外观适配 */
      .todo-bubble{position:fixed;z-index:10002;transform:translateX(-100%);display:inline-flex;align-items:center;gap:8px;padding:5px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);box-shadow:var(--dsw-elevation-prominent);font-size:12px;line-height:18px;white-space:nowrap;animation:todo-fade .18s ease}
      .todo-bubble-arrow{position:absolute;top:-5px;right:12px;width:8px;height:8px;transform:rotate(45deg);background:var(--dsw-alias-bg-layer-2);border-left:1px solid var(--dsw-alias-border-l2);border-top:1px solid var(--dsw-alias-border-l2)}
      .todo-bubble-view{border:0;background:none;padding:0;color:var(--dsw-alias-state-business-primary);font:inherit;font-size:12px;line-height:18px;cursor:pointer;text-decoration:underline;text-underline-offset:2px}
      .todo-bubble.overdue{border-color:var(--dsw-alias-state-error-primary)}
      .todo-bubble.overdue .todo-bubble-arrow{border-left-color:var(--dsw-alias-state-error-primary);border-top-color:var(--dsw-alias-state-error-primary)}
      /* 右栏标签体：撑满右栏面板高度 */
      .todo-pane{height:100%;min-height:0;display:flex;flex-direction:column}

      .todo-root :focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}
      .todo-root .todo-note:focus-visible{outline:none;box-shadow:inset 0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary)),var(--dsw-elevation-prominent)}
      .todo-root .todo-search input:focus-visible,.todo-root .todo-note-body:focus-visible,
      .todo-root .todo-editor input:focus-visible,.todo-root .todo-editor textarea:focus-visible,.todo-root .todo-editor select:focus-visible{outline:none}
      .todo-btn.todo-toggle:hover{background:var(--dsw-alias-interactive-bg-hover)}
      @keyframes todo-fade{from{opacity:0}to{opacity:1}}
      @keyframes todo-note-in{from{opacity:0;scale:.92}to{opacity:1;scale:1}}
      @keyframes todo-note-out{to{opacity:0;scale:.9}}
      @keyframes todo-dot-pulse{0%{scale:1}45%{scale:1.7}100%{scale:1}}
      @media (max-width:900px){.todo-search{width:150px}.todo-brand .sub{display:none}}
      @media (max-width:720px){.todo-topbar{padding:10px 14px}.todo-statusbar{padding:8px 14px}}
      .todo-bulkbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 20px;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);font-size:12px;animation:todo-fade .15s ease}
      .todo-bulkbar select{height:26px;border:1px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px}
      .todo-bulkbar .n{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
      .todo-check{width:14px;height:14px;accent-color:var(--dsw-alias-state-business-primary);cursor:pointer;flex:none}
      .todo-listview{flex:1;min-height:0;overflow:auto;padding:8px 20px 16px}
      .todo-list-group{margin:0 0 14px}
      .todo-list-group>h3{margin:0 0 6px;font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary);display:flex;align-items:center;gap:6px}
      .todo-list-table{width:100%;border-collapse:collapse;font-size:12.5px}
      .todo-list-table th{text-align:left;padding:4px 8px;color:var(--dsw-alias-label-tertiary);font-weight:500;border-bottom:1px solid var(--dsw-alias-border-l1);white-space:nowrap}
      .todo-list-table td{padding:5px 8px;border-bottom:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary);vertical-align:middle}
      .todo-list-table tr.selected td{background:var(--dsw-alias-interactive-bg-hover)}
      .todo-list-title{border:0;background:none;padding:0;color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;text-align:left;max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .todo-list-title:hover{color:var(--dsw-alias-state-business-primary);text-decoration:underline}
      .todo-list-table select{height:24px;border:1px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;max-width:140px}
      .todo-list-when{color:var(--dsw-alias-label-tertiary);white-space:nowrap;font-variant-numeric:tabular-nums}
      .todo-viewtoggle{display:inline-flex;border:1px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-sm);overflow:hidden}
      .todo-viewtoggle button{border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;padding:0 10px;height:30px;cursor:pointer}
      .todo-viewtoggle button[aria-pressed="true"]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font-weight:600}
      .todo-attach-thumb{width:34px;height:34px;object-fit:cover;border-radius:6px;border:1px solid rgba(120,100,60,.25);flex:none;cursor:zoom-in;background:rgba(255,255,255,.4)}
      .todo-preview-img{max-width:100%;max-height:60vh;object-fit:contain;border-radius:8px;display:block;margin:0 auto}
      .todo-preview-pre{margin:0;padding:10px 12px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.6;white-space:pre-wrap;word-break:break-word;max-height:60vh;overflow:auto}
      .todo-preview-md{max-height:60vh;overflow:auto;font-size:13px;line-height:1.7;color:var(--dsw-alias-label-primary)}
      .todo-remind-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-top:6px}
      .todo-remind-grid label{display:flex;flex-direction:column;gap:3px;font-size:11px;color:var(--dsw-alias-label-tertiary)}
      .todo-remind-grid input,.todo-remind-grid select{height:26px;border:1px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;padding:0 6px}
      @media (prefers-reduced-motion:reduce){.todo-mask,.todo-dialog{animation:none}.todo-note,.todo-note.arranging,.todo-note.removing,.todo-note.pulse .todo-tag .dot,.todo-editor .title,.todo-editor textarea,.todo-textview,.todo-bubble,.todo-bulkbar,.todo-switch,.todo-switch .knob,.todo-search{transition:none;animation:none}.todo-note:hover{translate:none}}
      /* 窄右栏响应式：chips 独立成行横滑，搜索与按钮收紧 */
      @container (max-width:560px){
        .todo-topbar{padding:10px 12px;gap:6px 8px}
        .todo-search{width:140px}
        .todo-tools{flex-wrap:nowrap}
        .todo-chips{order:3;flex:1 1 100%;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}
        .todo-chips::-webkit-scrollbar{display:none}
      }
      @container (max-width:400px){
        .todo-search{width:96px}
        .todo-brand h1{font-size:14px}
        .todo-btn{padding:0 8px}
        .todo-status-hint{display:none}
      }
    `

    /** 入口按钮先于墙面板挂载，CSS 必须全局注入一次，不能只靠面板组件内的 <style>。 */
    function ensureStyle() {
      if (typeof document === 'undefined') return () => {}
      const id = 'wysl-dsh-sticky-wall-style'
      let node = document.getElementById(id)
      let created = false
      if (!node) {
        node = document.createElement('style')
        node.id = id
        node.textContent = CSS
        document.head.appendChild(node)
        created = true
      }
      return () => {
        if (created && node && node.parentNode) node.parentNode.removeChild(node)
      }
    }

    function formatEntry(entry, params) {
      if (typeof entry !== 'string') return ''
      if (!params) return entry
      return entry.replace(/\{(\w+)\}/g, (match, name) => (params[name] === undefined ? match : String(params[name])))
    }

    function requestErrorText(t, result) {
      if (!result) return t('requestFailed')
      if (result.error === 'AUTH' || result.code === 'AUTH') return t('authError')
      const known = {
        NOT_FOUND: 'errNotFound',
        STATUS_INVALID: 'errStatus',
        TIME_INVALID: 'errTime',
        ATTACHMENTS_LIMIT: 'errAttachments',
        ATTACHMENT_INVALID: 'errAttachmentInvalid',
        WALL_FULL: 'errWallFull',
        CONFIG_INVALID: 'errConfig',
        COLOR_INVALID: 'errInvalid',
        POSITION_INVALID: 'errInvalid',
        INVALID: 'errInvalid',
        SUBTASKS_INVALID: 'errInvalid',
      }
      const key = known[result.code]
      return key ? t(key) : t('requestFailed')
    }

    function pad(value) {
      return String(value).padStart(2, '0')
    }

    function toLocalInput(iso) {
      if (!iso) return ''
      const date = new Date(iso)
      if (Number.isNaN(date.getTime())) return ''
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
    }

    function fromLocalInput(value) {
      if (!value) return null
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return null
      return date.toISOString()
    }

    function formatWhen(value) {
      if (!value) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return value
      return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
    }

    // ---------------------------------------------------------------- 轻量 Markdown 与搜索高亮

    /** 把搜索匹配词包成 <mark>；无匹配时原样返回文本。 */
    function highlightNodes(text, query, keyBase) {
      const needle = (query || '').trim().toLowerCase()
      if (!needle) return [text]
      const lower = text.toLowerCase()
      const nodes = []
      let i = 0
      let k = 0
      for (;;) {
        const at = lower.indexOf(needle, i)
        if (at < 0) {
          nodes.push(text.slice(i))
          break
        }
        if (at > i) nodes.push(text.slice(i, at))
        nodes.push(h('mark', { key: `${keyBase}-h${k++}`, className: 'todo-hl' }, text.slice(at, at + needle.length)))
        i = at + needle.length
      }
      return nodes
    }

    const MD_TOKEN = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(__[^_\n]+__)|(\*[^*\n]+\*)|(_[^_\n]+_)|(\[[^\]\n]+\]\((https?:\/\/[^)\s]+)\))|(https?:\/\/[^\s<>()]+)/g

    function mdLink(key, href, label) {
      return h('a', {
        key,
        className: 'todo-md-link',
        href,
        target: '_blank',
        rel: 'noopener noreferrer',
        onClick: (event) => event.stopPropagation(),
        onPointerDown: (event) => event.stopPropagation(),
      }, label)
    }

    /** 行内轻量 Markdown：code / 加粗 / 斜体 / 链接 / 裸 URL；其余文本走搜索高亮。 */
    function mdInline(text, query, keyBase) {
      const nodes = []
      let last = 0
      let k = 0
      MD_TOKEN.lastIndex = 0
      let m
      while ((m = MD_TOKEN.exec(text)) !== null) {
        if (m.index > last) nodes.push(...highlightNodes(text.slice(last, m.index), query, `${keyBase}-p${k}`))
        const key = `${keyBase}-m${k++}`
        if (m[1]) nodes.push(h('code', { key, className: 'todo-md-code' }, m[1].slice(1, -1)))
        else if (m[2]) nodes.push(h('strong', { key }, m[2].slice(2, -2)))
        else if (m[3]) nodes.push(h('strong', { key }, m[3].slice(2, -2)))
        else if (m[4]) nodes.push(h('em', { key }, m[4].slice(1, -1)))
        else if (m[5]) nodes.push(h('em', { key }, m[5].slice(1, -1)))
        else if (m[6]) nodes.push(mdLink(key, m[7], m[6].slice(1, m[6].indexOf(']('))))
        else if (m[8]) nodes.push(mdLink(key, m[8], m[8]))
        last = m.index + m[0].length
      }
      if (last < text.length) nodes.push(...highlightNodes(text.slice(last), query, `${keyBase}-tail`))
      return nodes
    }

    /** 正文渲染： fenced code block 成 <pre>，其余行内 Markdown；保留换行（容器 pre-wrap）。 */
    function renderMarkdown(text, query, keyBase) {
      const source = text || ''
      if (!source) return []
      const nodes = []
      const fence = /```[^\n]*\n?([\s\S]*?)```/g
      let last = 0
      let k = 0
      let m
      while ((m = fence.exec(source)) !== null) {
        if (m.index > last) nodes.push(...mdInline(source.slice(last, m.index), query, `${keyBase}-s${k}`))
        nodes.push(h('pre', { key: `${keyBase}-pre${k}`, className: 'todo-md-pre' }, h('code', null, m[1].replace(/\n$/, ''))))
        k += 1
        last = m.index + m[0].length
      }
      if (last < source.length) nodes.push(...mdInline(source.slice(last), query, `${keyBase}-tail`))
      return nodes
    }

    function timeText(task, t) {
      if (task.planStartAt && task.planEndAt) return `${formatWhen(task.planStartAt)} → ${formatWhen(task.planEndAt)}`
      if (task.planStartAt) return `${t('startsAt')} ${formatWhen(task.planStartAt)}`
      if (task.planEndAt) return `${t('endsAt')} ${formatWhen(task.planEndAt)}`
      return ''
    }

    function timeInvalid(task) {
      if (!task.planStartAt || !task.planEndAt) return false
      const start = new Date(task.planStartAt).getTime()
      const end = new Date(task.planEndAt).getTime()
      return !Number.isNaN(start) && !Number.isNaN(end) && end < start
    }

    // ---------------------------------------------------------------- 查询语法 / 模板 / 导入导出

    /** 解析 status:<v> / workspace:<v> token，剩余为自由文本。 */
    function parseQuery(raw) {
      const out = { status: null, workspace: null, text: '' }
      const rest = []
      for (const token of String(raw || '').trim().split(/\s+/)) {
        if (!token) continue
        const m = /^(status|workspace):(.*)$/i.exec(token)
        if (m && m[2]) {
          if (m[1].toLowerCase() === 'status') out.status = m[2].toLowerCase()
          else out.workspace = m[2].toLowerCase()
        } else rest.push(token)
      }
      out.text = rest.join(' ')
      return out
    }

    const TEMPLATE_IDS = ['plain', 'meeting', 'bug', 'idea']
    function templateSkeleton(id, t) {
      if (id === 'meeting') return { title: t('tplMeetingTitle'), note: t('tplMeetingBody') }
      if (id === 'bug') return { title: t('tplBugTitle'), note: t('tplBugBody') }
      if (id === 'idea') return { title: t('tplIdeaTitle'), note: t('tplIdeaBody') }
      return { title: t('titlePlaceholder'), note: '' }
    }

    function isImagePath(path) { return /\.(png|jpe?g|gif|webp|svg)$/i.test(String(path || '')) }
    function isMdPath(path) { return /\.(md|markdown)$/i.test(String(path || '')) }
    function isTxtPath(path) { return /\.txt$/i.test(String(path || '')) }

    function csvField(value) {
      const s = String(value ?? '')
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    function exportCsv(tasks) {
      const head = ['id', 'title', 'note', 'status', 'color', 'workspaceId', 'planStartAt', 'planEndAt', 'parentId']
      const lines = [head.join(',')]
      for (const task of tasks) lines.push(head.map((key) => csvField(task[key])).join(','))
      return lines.join('\r\n')
    }
    function parseCsvLine(line) {
      const out = []
      let cur = ''
      let quoted = false
      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i]
        if (quoted) {
          if (ch === '"') {
            if (line[i + 1] === '"') { cur += '"'; i += 1 } else quoted = false
          } else cur += ch
        } else if (ch === '"') quoted = true
        else if (ch === ',') { out.push(cur); cur = '' }
        else cur += ch
      }
      out.push(cur)
      return out
    }
    function parseCsv(text) {
      const lines = String(text || '').split(/\r?\n/).filter((l) => l.trim() !== '')
      if (lines.length < 2) return []
      const head = parseCsvLine(lines[0]).map((h) => h.trim())
      const tasks = []
      for (const line of lines.slice(1)) {
        const cells = parseCsvLine(line)
        const row = {}
        head.forEach((key, i) => { row[key] = cells[i] ?? '' })
        if (!row.title || !row.title.trim()) continue
        tasks.push({
          id: row.id || undefined,
          title: row.title,
          note: row.note || '',
          status: row.status || 'planned',
          color: row.color || 'cream',
          workspaceId: row.workspaceId || null,
          planStartAt: row.planStartAt || null,
          planEndAt: row.planEndAt || null,
          parentId: row.parentId || null,
        })
      }
      return tasks
    }
    function exportMarkdown(tasks, t) {
      const lines = [`# ${t('title')}`, '']
      for (const task of tasks.slice().sort(compareStatusThenRecent)) {
        const box = task.status === 'done' ? '[x]' : '[ ]'
        lines.push(`- ${box} **${task.title}** (${task.status})`)
        const meta = []
        if (task.planStartAt) meta.push(`start ${task.planStartAt}`)
        if (task.planEndAt) meta.push(`due ${task.planEndAt}`)
        if (task.workspaceId) meta.push(`workspace ${task.workspaceId}`)
        if (meta.length) lines.push(`  - meta: ${meta.join(' · ')}`)
        if (task.note) for (const nl of task.note.split('\n')) lines.push(`  ${nl}`)
        lines.push('')
      }
      return lines.join('\n')
    }
    function parseMarkdown(text) {
      const tasks = []
      let current = null
      for (const line of String(text || '').split(/\r?\n/)) {
        const m = /^\s*-\s*\[( |x|X)\]\s*(.*)$/.exec(line)
        if (m) {
          if (current) tasks.push(current)
          let title = m[2].trim()
          let status = m[1].toLowerCase() === 'x' ? 'done' : 'planned'
          const sm = /\((planned|active|done|cancelled)\)\s*$/.exec(title)
          if (sm) { status = sm[1]; title = title.slice(0, sm.index).trim() }
          title = title.replace(/^\*\*(.*)\*\*$/, '$1')
          current = { title: title || 'untitled', note: '', status }
          continue
        }
        if (current && /^\s{2,}\S/.test(line)) {
          const body = line.replace(/^\s{2}/, '')
          if (/^meta:/.test(body.trim())) {
            const due = /due (\S+)/.exec(body)
            const start = /start (\S+)/.exec(body)
            const ws = /workspace (\S+)/.exec(body)
            if (due) current.planEndAt = due[1]
            if (start) current.planStartAt = start[1]
            if (ws) current.workspaceId = ws[1]
          } else {
            current.note += (current.note ? '\n' : '') + body
          }
        }
      }
      if (current) tasks.push(current)
      return tasks
    }
    /** 按扩展名 / 内容嗅探识别 json / md / csv，返回 tasks 数组或 null。 */
    function detectImport(name, text) {
      const lower = String(name || '').toLowerCase()
      const fromJson = (raw) => {
        const payload = JSON.parse(raw)
        return Array.isArray(payload) ? payload : (Array.isArray(payload && payload.tasks) ? payload.tasks : null)
      }
      if (lower.endsWith('.md') || lower.endsWith('.markdown')) return parseMarkdown(text)
      if (lower.endsWith('.csv')) return parseCsv(text)
      if (lower.endsWith('.json')) return fromJson(text)
      const trimmed = String(text || '').trim()
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) return fromJson(trimmed)
      if (/^\s*-\s*\[[ xX]\]/m.test(trimmed)) return parseMarkdown(trimmed)
      if (trimmed.split(/\r?\n/)[0].includes(',')) return parseCsv(trimmed)
      return null
    }
    function downloadText(filename, text, mime) {
      const blob = new Blob([text], { type: mime })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }

    function tiltOf(id) {
      let hash = 0
      for (let index = 0; index < id.length; index += 1) hash = (hash * 31 + id.charCodeAt(index)) % 1000
      return ((hash % 9) - 4) * 0.35
    }

    function compareStatusThenRecent(left, right) {
      const leftRank = STATUSES.indexOf(left.status)
      const rightRank = STATUSES.indexOf(right.status)
      if (leftRank !== rightRank) return leftRank - rightRank
      return String(right.updatedAt || '').localeCompare(String(left.updatedAt || ''))
    }

    // ---------------------------------------------------------------- 数据源

    function createWallStore() {
      let snapshot = {
        phase: 'loading',
        tasks: [],
        config: { llmTools: false },
        workspaces: [],
        storage: null,
        pending: 0,
        trashCount: 0,
        error: null,
      }
      const listeners = new Set()
      let timer = null
      let inflight = false
      let queued = false
      let stopped = false
      let requestSeq = 0
      let appliedSeq = 0

      function emit(patch) {
        snapshot = { ...snapshot, ...patch }
        for (const listener of listeners) {
          try { listener() } catch (error) { console.warn('[dsh-todo] subscriber failed', error) }
        }
      }

      async function readJson(response) {
        try { return await response.json() } catch { return null }
      }

      function nextDelay() {
        if (snapshot.phase === 'ready') return POLL_MS
        if (snapshot.phase === 'error') return ERROR_POLL_MS
        return LOADING_POLL_MS
      }

      async function refresh() {
        if (inflight) {
          queued = true
          return
        }
        inflight = true
        const mine = ++requestSeq
        try {
          const response = await fetch(`${API}/state`, { credentials: 'same-origin', cache: 'no-store' })
          if (mine < appliedSeq) return
          if (response.status === 401 || response.status === 403) {
            appliedSeq = mine
            emit({ phase: 'error', error: 'AUTH' })
            return
          }
          const payload = await readJson(response)
          if (mine < appliedSeq) return
          if (!payload || payload.ok !== true || !payload.data) {
            appliedSeq = mine
            emit({ phase: 'error', error: 'REQUEST' })
            return
          }
          const data = payload.data
          appliedSeq = mine
          emit({
            phase: 'ready',
            tasks: Array.isArray(data.tasks) ? data.tasks : [],
            config: data.config && typeof data.config === 'object' ? data.config : { llmTools: false },
            workspaces: Array.isArray(data.workspaces) ? data.workspaces : [],
            storage: data.storage || null,
            pending: typeof data.pending === 'number' ? data.pending : 0,
            trashCount: typeof data.trashCount === 'number' ? data.trashCount : 0,
            error: null,
          })
        } catch {
          if (mine >= appliedSeq) {
            appliedSeq = mine
            emit({ phase: 'error', error: 'REQUEST' })
          }
        } finally {
          inflight = false
          if (queued) {
            queued = false
            void refresh()
          }
        }
      }

      async function post(path, body) {
        let response
        try {
          response = await fetch(`${API}${path}`, {
            method: 'POST',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body || {}),
          })
        } catch {
          return { ok: false, error: 'REQUEST' }
        }
        if (response.status === 401 || response.status === 403) return { ok: false, error: 'AUTH', code: 'AUTH' }
        const payload = await readJson(response)
        if (!payload || payload.ok !== true) {
          return {
            ok: false,
            error: (payload && typeof payload.error === 'string' && payload.error) || 'REQUEST',
            code: payload && typeof payload.code === 'string' ? payload.code : undefined,
          }
        }
        return { ok: true, data: payload.data }
      }

      async function get(path) {
        let response
        try {
          response = await fetch(`${API}${path}`, { credentials: 'same-origin', cache: 'no-store' })
        } catch {
          return { ok: false, error: 'REQUEST' }
        }
        if (response.status === 401 || response.status === 403) return { ok: false, error: 'AUTH', code: 'AUTH' }
        const payload = await readJson(response)
        if (!payload || payload.ok !== true) {
          return {
            ok: false,
            error: (payload && typeof payload.error === 'string' && payload.error) || 'REQUEST',
            code: payload && typeof payload.code === 'string' ? payload.code : undefined,
          }
        }
        return { ok: true, data: payload.data }
      }

      function schedule() {
        if (stopped) return
        if (timer !== null) clearTimeout(timer)
        timer = setTimeout(async () => {
          timer = null
          if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
            schedule()
            return
          }
          await refresh()
          schedule()
        }, nextDelay())
      }

      function subscribe(listener) {
        listeners.add(listener)
        if (listeners.size === 1) {
          stopped = false
          void refresh().then(schedule, schedule)
        }
        return () => {
          listeners.delete(listener)
          if (listeners.size === 0) {
            stopped = true
            if (timer !== null) {
              clearTimeout(timer)
              timer = null
            }
          }
        }
      }

      function replaceTask(task) {
        emit({
          tasks: snapshot.tasks.map((item) => (item.id === task.id ? task : item)),
          error: null,
        })
      }

      return {
        getSnapshot() { return snapshot },
        subscribe,
        refresh,
        async create(body) {
          const result = await post('/tasks', body)
          if (result.ok) {
            emit({ tasks: [...snapshot.tasks, result.data.task], phase: 'ready', error: null })
            void refresh()
          }
          return result
        },
        async update(id, patch) {
          const result = await post('/tasks/update', { id, patch })
          if (result.ok) {
            replaceTask(result.data.task)
            void refresh()
          }
          return result
        },
        async arrange(positions) {
          const result = await post('/tasks/arrange', { positions })
          if (result.ok) {
            const next = new Map(positions.map((entry) => [entry.id, entry]))
            emit({
              tasks: snapshot.tasks.map((task) => {
                const entry = next.get(task.id)
                return entry ? { ...task, x: entry.x, y: entry.y } : task
              }),
              error: null,
            })
            void refresh()
          }
          return result
        },
        async remove(id) {
          const result = await post('/tasks/delete', { id })
          if (result.ok) {
            emit({
              tasks: snapshot.tasks.filter((task) => task.id !== id)
                .map((task) => (task.parentId === id ? { ...task, parentId: null } : task)),
              error: null,
            })
            void refresh()
          }
          return result
        },
        async setConfig(patch) {
          const result = await post('/config', patch)
          if (result.ok) emit({ config: { ...snapshot.config, ...result.data }, error: null })
          return result
        },
        async open(path) {
          return post('/open', { path })
        },
        async restore(id) {
          const result = await post('/tasks/restore', { id })
          if (result.ok) void refresh()
          return result
        },
        async emptyTrash() {
          const result = await post('/trash/empty', {})
          if (result.ok) void refresh()
          return result
        },
        async trash() {
          return get('/trash')
        },
        async exportWall() {
          return get('/export')
        },
        async importWall(payload) {
          const result = await post('/import', payload)
          if (result.ok) void refresh()
          return result
        },
        async bulk(ids, patch) {
          const result = await post('/tasks/bulk', { ids, patch })
          if (result.ok) void refresh()
          return result
        },
        async serveFile(path) {
          return get(`/file?path=${encodeURIComponent(path)}`)
        },
      }
    }

    // 面板、侧栏计数与设置行共用一份快照：只开一个轮询。
    const WALL_STORE = createWallStore()
    // 每次页面加载（UI 启动）只弹一次启动气泡；模块级标记，刷新即重置。
    let bootBubbleDone = false
    // 到期提醒去重：key → 上次提醒时间；同一卡同一阈值每 1h 才再提醒。
    const dueReminded = new Map()

    // ---------------------------------------------------------------- 图标

    function NoteIcon({ size = 16 }) {
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 16 16',
        fill: 'none',
        'aria-hidden': true,
        style: { display: 'block' },
      },
        h('path', {
          d: 'M11.1 2.6H4.9A2.3 2.3 0 0 0 2.6 4.9v6.2a2.3 2.3 0 0 0 2.3 2.3h4.1l4.4-4.4V4.9a2.3 2.3 0 0 0-2.3-2.3Z',
          stroke: 'currentColor',
          strokeWidth: 1.2,
          strokeLinejoin: 'round',
        }),
        h('path', {
          d: 'M9 13.4V11a2 2 0 0 1 2-2h2.4',
          stroke: 'currentColor',
          strokeWidth: 1.2,
          strokeLinejoin: 'round',
        }),
        h('path', {
          d: 'M5.2 6.2h5.1M5.2 9h3',
          stroke: 'currentColor',
          strokeWidth: 1.2,
          strokeLinecap: 'round',
        }))
    }

    function GearIcon() {
      return h('svg', {
        width: 16,
        height: 16,
        viewBox: '0 0 16 16',
        fill: 'none',
        'aria-hidden': true,
        style: { display: 'block' },
      },
        h('path', { d: 'M2.8 5h2.2M8.6 5h4.6M2.8 11h4.6M11 11h2.2', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round' }),
        h('circle', { cx: 6.6, cy: 5, r: 1.6, stroke: 'currentColor', strokeWidth: 1.2 }),
        h('circle', { cx: 9.4, cy: 11, r: 1.6, stroke: 'currentColor', strokeWidth: 1.2 }))
    }

    function PlusIcon() {
      return h('svg', {
        width: 14,
        height: 14,
        viewBox: '0 0 16 16',
        fill: 'none',
        'aria-hidden': true,
        style: { display: 'block' },
      }, h('path', { d: 'M8 3.2v9.6M3.2 8h9.6', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round' }))
    }

    function CloseIcon() {
      return h('svg', {
        width: 14,
        height: 14,
        viewBox: '0 0 16 16',
        fill: 'none',
        'aria-hidden': true,
        style: { display: 'block' },
      }, h('path', { d: 'M3.9 3.9 12.1 12.1M12.1 3.9 3.9 12.1', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round' }))
    }

    function CollapseIcon() {
      return h('svg', {
        width: 14,
        height: 14,
        viewBox: '0 0 16 16',
        fill: 'none',
        'aria-hidden': true,
        style: { display: 'block' },
      }, h('path', { d: 'M4 5.5 8 9.5 12 5.5M4 12.5h8', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round', strokeLinejoin: 'round' }))
    }

    function TrashIcon() {
      return h('svg', {
        width: 14,
        height: 14,
        viewBox: '0 0 16 16',
        fill: 'none',
        'aria-hidden': true,
        style: { display: 'block' },
      }, h('path', { d: 'M2.5 4h11M6.5 2h3M4 4l.7 9.5h6.6L12 4M6.5 6.5v4.5M9.5 6.5v4.5', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round', strokeLinejoin: 'round' }))
    }

    function SearchIcon() {
      return h('svg', {
        width: 14,
        height: 14,
        viewBox: '0 0 16 16',
        fill: 'none',
        'aria-hidden': true,
        style: { display: 'block' },
      },
        h('circle', { cx: 7, cy: 7, r: 4.2, stroke: 'currentColor', strokeWidth: 1.2 }),
        h('path', { d: 'm10.2 10.2 3.2 3.2', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round' }))
    }

    // ---------------------------------------------------------------- 基础组件

    function Switch({ checked, onChange, label, disabled }) {
      return h('button', {
        type: 'button',
        role: 'switch',
        'aria-checked': checked ? 'true' : 'false',
        'aria-label': label,
        disabled,
        className: 'todo-switch',
        onClick: () => onChange(!checked),
      }, h('span', { className: 'knob' }))
    }

    function useSnapshot(store) {
      const [snapshot, setSnapshot] = React.useState(() => store.getSnapshot())
      React.useEffect(() => store.subscribe(() => setSnapshot(store.getSnapshot())), [store])
      return snapshot
    }

    function useFocusTrap(ref) {
      React.useEffect(() => {
        const node = ref.current
        if (!node) return undefined
        const onKey = (event) => {
          if (event.key !== 'Tab') return
          const all = node.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')
          const list = Array.prototype.filter.call(all, (element) => !element.disabled && element.offsetParent !== null)
          if (list.length === 0) return
          const first = list[0]
          const last = list[list.length - 1]
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first.focus()
          }
        }
        node.addEventListener('keydown', onKey)
        return () => node.removeEventListener('keydown', onKey)
      }, [ref])
    }

    function paperOf(task) {
      return `var(--todo-paper-${PAPER[task.color] ? task.color : 'cream'})`
    }

    // ---------------------------------------------------------------- 便签

    function NoteCard({ task, t, canvasWidth, draggingEnabled, suppressed, removing, query, selected, onToggleSelect, onDropStatus, onOpen, onMove, onDragY, onDragStart, onDragEnd, onContextMenu }) {
      const nodeRef = React.useRef(null)
      const dragRef = React.useRef(null)
      const suppressClickRef = React.useRef(0)
      const [position, setPosition] = React.useState({ x: task.x ?? 0, y: task.y ?? 0 })
      const [dragging, setDragging] = React.useState(false)
      const [pulse, setPulse] = React.useState(false)
      const prevStatus = React.useRef(task.status)
      React.useEffect(() => {
        if (prevStatus.current === task.status) return undefined
        prevStatus.current = task.status
        setPulse(true)
        const handle = setTimeout(() => setPulse(false), 380)
        return () => clearTimeout(handle)
      }, [task.status])

      React.useEffect(() => {
        if (dragRef.current === null) setPosition({ x: clamp(task.x ?? 0), y: task.y ?? 0 })
      }, [task.x, task.y, canvasWidth])

      function clamp(x) {
        return Math.max(8, Math.min(x, Math.max(8, canvasWidth - NOTE_W - 8)))
      }

      function handlePointerDown(event) {
        if (!draggingEnabled || event.button !== 0) return
        const node = nodeRef.current
        if (!node) return
        dragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          origX: position.x,
          origY: position.y,
          moved: false,
        }
        node.setPointerCapture(event.pointerId)
        event.preventDefault()
      }

      function handlePointerMove(event) {
        const drag = dragRef.current
        if (!drag || drag.pointerId !== event.pointerId) return
        const dx = event.clientX - drag.startX
        const dy = event.clientY - drag.startY
        if (!drag.moved && Math.hypot(dx, dy) > 5) {
          drag.moved = true
          setDragging(true)
          onDragStart()
        }
        if (!drag.moved) return
        setPosition({ x: clamp(drag.origX + dx), y: Math.max(8, drag.origY + dy) })
        onDragY(event.clientY)
      }

      function handlePointerUp(event) {
        const drag = dragRef.current
        if (!drag || drag.pointerId !== event.pointerId) return
        dragRef.current = null
        if (drag.moved) {
          const dx = event.clientX - drag.startX
          const dy = event.clientY - drag.startY
          setDragging(false)
          onDragEnd()
          suppressClickRef.current = Date.now()
          const dropEl = document.elementFromPoint(event.clientX, event.clientY)
          const chip = dropEl && dropEl.closest ? dropEl.closest('.todo-chip[data-status]') : null
          if (chip && onDropStatus) {
            onDropStatus(task.id, chip.getAttribute('data-status'))
            setPosition({ x: clamp(task.x ?? 0), y: task.y ?? 0 })
          } else {
            onMove(task.id, clamp(drag.origX + dx), Math.max(8, drag.origY + dy))
          }
        } else {
          if ((event.ctrlKey || event.metaKey) && onToggleSelect) {
            suppressClickRef.current = Date.now()
            onToggleSelect(task.id)
            return
          }
          onOpen()
        }
      }

      const when = timeText(task, t)
      const quiet = task.status === 'done' || task.status === 'cancelled'
      const bodyRef = React.useRef(null)

      React.useEffect(() => {
        const body = bodyRef.current
        if (!body) return undefined
        const sync = () => {
          const overflowing = body.scrollHeight > body.clientHeight + 2
          const atEnd = body.scrollTop + body.clientHeight >= body.scrollHeight - 2
          body.classList.toggle('can-scroll', overflowing && !atEnd)
        }
        body.addEventListener('scroll', sync, { passive: true })
        sync()
        return () => body.removeEventListener('scroll', sync)
      }, [task.note])

      return h('article', {
        ref: nodeRef,
        className: 'todo-note' + (dragging ? ' dragging' : '') + (quiet ? ' quiet' : '') + (removing ? ' removing' : '') + (pulse ? ' pulse' : '') + (selected ? ' selected' : ''),
        role: 'button',
        tabIndex: 0,
        'aria-label': [task.title || t('titlePlaceholder'), t('status' + task.status.charAt(0).toUpperCase() + task.status.slice(1)), when, t('edit')].filter(Boolean).join('，'),
        style: {
          left: `${position.x}px`,
          top: `${position.y}px`,
          '--todo-paper': paperOf(task),
          transform: dragging ? 'rotate(0deg) scale(1.02)' : `rotate(${tiltOf(task.id)}deg)`,
          display: (task.hidden || suppressed) ? 'none' : undefined,
        },
        onPointerDown: handlePointerDown,
        onPointerMove: handlePointerMove,
        onPointerUp: handlePointerUp,
        onPointerCancel: handlePointerUp,
        onContextMenu: (event) => { if (onContextMenu) onContextMenu(event) },
        onClick: (event) => {
          if (!draggingEnabled) return
          if (Date.now() - suppressClickRef.current < 300) return
          if (event.target.closest('.todo-tag')) return
          if ((event.ctrlKey || event.metaKey) && onToggleSelect) { onToggleSelect(task.id); return }
          onOpen()
        },
        onKeyDown: (event) => {
          if (!draggingEnabled) return
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onOpen()
          }
        },
      },
        h('span', { className: 'todo-tape', 'aria-hidden': true }),
        h('div', { className: 'todo-note-top' },
          h('span', { className: 'todo-tag', 'data-status': task.status },
            h('i', { className: 'dot' }),
            t('status' + task.status.charAt(0).toUpperCase() + task.status.slice(1)))),
        h('h2', { className: 'todo-note-title', title: task.title || undefined }, highlightNodes(task.title || t('titlePlaceholder'), query, `nt-${task.id}`)),
        h('div', { ref: bodyRef, className: 'todo-note-body', title: task.note || undefined }, renderMarkdown(task.note, query, `nb-${task.id}`)),
        when ? h('div', { className: 'todo-note-when' + (timeInvalid(task) ? ' warn' : '') },
          (timeInvalid(task) ? t('timeInvalidShort') + '：' : '') + when) : null)
    }

    // ---------------------------------------------------------------- 原地编辑

    function NoteEditor({ task, t, canvasWidth = 900, store, closing, query, initialTextMode, onConsumeText, onClose, onExited, onRemove, onChanged, onContextMenu }) {
      const snapshotState = useSnapshot(store)
      // null = 查看/快捷改态；'title' / 'note' = 该文本字段进入编辑。
      const [textMode, setTextMode] = React.useState(initialTextMode || null)
      const [title, setTitle] = React.useState(task.title)
      const [body, setBody] = React.useState(task.note || '')
      const [showEnd, setShowEnd] = React.useState(Boolean(task.planEndAt))
      const [draftPath, setDraftPath] = React.useState('')
      const [previewEntry, setPreviewEntry] = React.useState(null)
      const [error, setError] = React.useState(null)
      const [confirmDelete, setConfirmDelete] = React.useState(false)
      const [position, setPosition] = React.useState({ x: task.x ?? 8, y: task.y ?? 8 })
      const [maxH, setMaxH] = React.useState(null)
      const [dragging, setDragging] = React.useState(false)
      const dragRef = React.useRef(null)
      const suppressClickRef = React.useRef(0)
      const cardRef = React.useRef(null)
      const titleRef = React.useRef(null)
      const bodyRef = React.useRef(null)
      const viewBodyRef = React.useRef(null)
      const endRef = React.useRef(null)
      const draftRef = React.useRef(null)
      draftRef.current = { mode: textMode, title, body }
      useFocusTrap(cardRef)

      // 收起 / 切换便签时把未提交的文本草稿落盘，避免丢字。
      React.useEffect(() => () => {
        const d = draftRef.current
        if (!d || !d.mode) return
        if (d.mode === 'title') void store.update(task.id, { title: d.title.trim() || t('titlePlaceholder') })
        else void store.update(task.id, { note: d.body })
      }, [])

      React.useEffect(() => {
        if (!confirmDelete) return undefined
        const handle = setTimeout(() => setConfirmDelete(false), 4000)
        return () => clearTimeout(handle)
      }, [confirmDelete])

      React.useEffect(() => {
        const onKey = (event) => {
          if (event.key !== 'Escape') return
          commitText()
          onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [textMode, title, body])

      React.useEffect(() => {
        if (textMode === 'title' && titleRef.current) {
          titleRef.current.focus()
          titleRef.current.select()
        }
        if (textMode === 'note' && bodyRef.current) {
          bodyRef.current.focus()
          autosize()
        }
      }, [textMode])

      React.useEffect(() => {
        if (initialTextMode && typeof onConsumeText === 'function') onConsumeText()
      }, [])

      // 展开卡和小卡一样可拖：外部位置变化时同步（拖动中不覆盖）。
      React.useEffect(() => {
        if (dragRef.current === null) setPosition({ x: clampX(task.x ?? 8), y: task.y ?? 8 })
      }, [task.x, task.y, canvasWidth])

      // 矮右栏时限制展开卡高度，内容在卡内滚动，不溢出视口。
      React.useEffect(() => {
        const measure = () => {
          const sc = cardRef.current && cardRef.current.closest('.todo-scroll')
          if (sc) setMaxH(Math.max(160, sc.clientHeight - 16))
        }
        measure()
        window.addEventListener('resize', measure)
        return () => window.removeEventListener('resize', measure)
      }, [])

      // 查看态正文溢出时底部淡出，提示还有内容可滚。
      React.useEffect(() => {
        const body = viewBodyRef.current
        if (!body) return undefined
        const sync = () => {
          const overflowing = body.scrollHeight > body.clientHeight + 2
          const atEnd = body.scrollTop + body.clientHeight >= body.scrollHeight - 2
          body.classList.toggle('can-scroll', overflowing && !atEnd)
        }
        body.addEventListener('scroll', sync, { passive: true })
        sync()
        return () => body.removeEventListener('scroll', sync)
      }, [task.note, textMode])

      function clampX(x) {
        const w = cardRef.current ? cardRef.current.offsetWidth : 340
        return Math.max(8, Math.min(x, Math.max(8, canvasWidth - w - 8)))
      }
      function isControl(event) {
        return Boolean(event.target.closest('button, input, textarea, select, summary, label, a, details'))
      }
      function handlePointerDown(event) {
        if (event.button !== 0 || isControl(event)) return
        const node = cardRef.current
        if (!node) return
        dragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          origX: position.x,
          origY: position.y,
          moved: false,
        }
        // 不在这里捕获指针 / preventDefault：否则 click、dblclick 会被重定向到卡根，
        // 双击编辑失效、单击误触「点空白收起」。越过拖动阈值后才捕获。
      }
      function handlePointerMove(event) {
        const drag = dragRef.current
        if (!drag || drag.pointerId !== event.pointerId) return
        const dx = event.clientX - drag.startX
        const dy = event.clientY - drag.startY
        if (!drag.moved && Math.hypot(dx, dy) > 5) {
          drag.moved = true
          setDragging(true)
          const node = cardRef.current
          if (node) {
            try { node.setPointerCapture(event.pointerId) } catch { /* 捕获失败不阻塞拖动 */ }
          }
        }
        if (!drag.moved) return
        setPosition({ x: clampX(drag.origX + dx), y: Math.max(8, drag.origY + dy) })
      }
      function handlePointerUp(event) {
        const drag = dragRef.current
        if (!drag || drag.pointerId !== event.pointerId) return
        dragRef.current = null
        if (!drag.moved) return
        setDragging(false)
        suppressClickRef.current = Date.now()
        const x = clampX(drag.origX + (event.clientX - drag.startX))
        const y = Math.max(8, drag.origY + (event.clientY - drag.startY))
        void patch({ x, y })
      }

      function reducedMotion() {
        return typeof window !== 'undefined' && window.matchMedia
          && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      }
      /** 小卡矩形（canvas 坐标 + 滚动偏移），供展开/收回形变对齐。 */
      function noteRect() {
        const node = cardRef.current
        const canvas = node && node.parentElement
        if (!canvas) return null
        const r = canvas.getBoundingClientRect()
        return { left: r.left + (task.x ?? 8), top: r.top + (task.y ?? 8), width: NOTE_W, height: NOTE_H }
      }
      // 入场：从小卡矩形“长大”到展开卡（FLIP），观感是同一张纸。
      React.useEffect(() => {
        const node = cardRef.current
        if (!node || reducedMotion()) return undefined
        const from = noteRect()
        const to = node.getBoundingClientRect()
        if (!from || !to.width || !to.height) return undefined
        const dx = from.left - to.left
        const dy = from.top - to.top
        node.style.transformOrigin = 'top left'
        node.style.transform = `translate(${dx}px, ${dy}px) scale(${from.width / to.width}, ${from.height / to.height})`
        node.style.opacity = '0.5'
        const raf = requestAnimationFrame(() => {
          node.style.transition = 'transform .22s cubic-bezier(.2,.8,.2,1), opacity .22s ease'
          node.style.transform = 'translate(0px, 0px) scale(1, 1)'
          node.style.opacity = '1'
        })
        const timer = setTimeout(() => {
          node.style.transition = ''
          node.style.transform = ''
          node.style.opacity = ''
        }, 260)
        return () => { cancelAnimationFrame(raf); clearTimeout(timer) }
      }, [])
      // 收回：缩回小卡矩形后通知父级卸载。
      React.useEffect(() => {
        if (!closing) return undefined
        const node = cardRef.current
        if (!node || reducedMotion()) { onExited(); return undefined }
        const from = node.getBoundingClientRect()
        const to = noteRect()
        if (!to || !from.width || !from.height) { onExited(); return undefined }
        const dx = to.left - from.left
        const dy = to.top - from.top
        node.style.transformOrigin = 'top left'
        node.style.transition = 'transform .18s cubic-bezier(.4,0,.6,1), opacity .18s ease'
        node.style.transform = `translate(${dx}px, ${dy}px) scale(${to.width / from.width}, ${to.height / from.height})`
        node.style.opacity = '0.4'
        const timer = setTimeout(onExited, 190)
        return () => clearTimeout(timer)
      }, [closing])

      function autosize() {
        const node = bodyRef.current
        if (!node) return
        node.style.height = 'auto'
        node.style.height = `${Math.min(240, Math.max(88, node.scrollHeight))}px`
      }

      /** 控件即改即存：纸色 / 时间 / 状态 / 工作区 / 附件。 */
      async function patch(fields) {
        const result = await store.update(task.id, fields)
        if (!result.ok) setError(requestErrorText(t, result))
        return result.ok
      }

      /** 提交当前文本草稿并回到查看态。 */
      function commitText() {
        const d = draftRef.current
        if (!d || !d.mode) return
        const mode = d.mode
        setTextMode(null)
        if (mode === 'title') void patch({ title: d.title.trim() || t('titlePlaceholder') })
        else void patch({ note: d.body })
      }

      function collapse() {
        commitText()
        onClose()
      }

      /** 空白区域 = 非控件、非文本展示区；点它收回小卡面。 */
      function isBlank(event) {
        return !event.target.closest('button, input, textarea, select, summary, label, a, .todo-textview')
      }

      async function remove() {
        if (!confirmDelete) {
          setConfirmDelete(true)
          return
        }
        onRemove(task.id)
      }

      function addAttachment() {
        const raw = draftPath.trim()
        if (!raw) return
        const separator = raw.indexOf('::')
        const name = separator > 0 ? raw.slice(0, separator).trim() : ''
        const path = separator > 0 ? raw.slice(separator + 2).trim() : raw
        if (!path) return
        setDraftPath('')
        void patch({ addAttachments: [{ name, path }] })
      }

      const attachments = task.attachments || []
      async function openAttachment(entry) {
        const result = await store.open(entry.path)
        if (!result.ok) setError(requestErrorText(t, result))
      }
      const attachmentsRows = attachments.map((entry) => h('li', {
        key: entry.id,
        className: 'todo-attach openable',
        role: 'button',
        tabIndex: 0,
        title: t('openAttachment'),
        onClick: () => { void openAttachment(entry) },
        onKeyDown: (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            void openAttachment(entry)
          }
        },
      },
        isImagePath(entry.path) ? h(AttachmentThumb, { store, entry, onPreview: setPreviewEntry }) : null,
        h('span', { className: 'todo-attach-name' }, entry.name || entry.path),
        h('span', { className: 'todo-attach-path' }, entry.path),
        entry.missing ? h('span', { className: 'todo-attach-warn' }, t('missingFile')) : null,
        (isImagePath(entry.path) || isMdPath(entry.path) || isTxtPath(entry.path))
          ? h('button', {
            type: 'button',
            className: 'todo-attach-remove',
            onClick: (event) => { event.stopPropagation(); setPreviewEntry(entry) },
          }, t('preview'))
          : null,
        h('button', {
          type: 'button',
          className: 'todo-attach-remove',
          onClick: (event) => { event.stopPropagation(); void patch({ removeAttachments: [entry.id] }) },
        }, t('remove'))))

      const start = toLocalInput(task.planStartAt)
      const end = toLocalInput(task.planEndAt)

      return h('div', {
        ref: cardRef,
        className: 'todo-editor' + (dragging ? ' dragging' : '') + (closing ? ' closing' : ''),
        role: 'dialog',
        'aria-label': t('edit'),
        style: { left: `${position.x}px`, top: `${position.y}px`, maxHeight: maxH ? `${maxH}px` : undefined, '--todo-paper': `var(--todo-paper-${PAPER[task.color] ? task.color : 'cream'})` },
        onPointerDown: (event) => { event.stopPropagation(); handlePointerDown(event) },
        onPointerMove: handlePointerMove,
        onPointerUp: handlePointerUp,
        onPointerCancel: handlePointerUp,
        onContextMenu: (event) => { if (onContextMenu) onContextMenu(event) },
        onClick: (event) => {
          if (Date.now() - suppressClickRef.current < 300) return
          if (isBlank(event)) collapse()
        },
      },
        h('span', { className: 'todo-tape', 'aria-hidden': true }),
        h('button', {
          type: 'button',
          className: 'todo-collapse',
          title: t('collapse'),
          'aria-label': t('collapse'),
          onClick: collapse,
        }, h(CollapseIcon)),
        h('div', { className: 'todo-editor-body' },
        textMode === 'title'
          ? h('input', {
            ref: titleRef,
            className: 'title',
            value: title,
            maxLength: 200,
            placeholder: t('titlePlaceholder'),
            'aria-label': t('titleField'),
            onChange: (event) => setTitle(event.target.value),
            onBlur: commitText,
            onKeyDown: (event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                commitText()
              }
            },
          })
          : h('h2', {
            className: 'todo-textview todo-view-title',
            title: t('dblEdit'),
            onDoubleClick: () => {
              if (Date.now() - suppressClickRef.current < 300) return
              setTitle(task.title)
              setTextMode('title')
            },
          }, highlightNodes(task.title || t('titlePlaceholder'), query, `et-${task.id}`)),
        textMode === 'note'
          ? h('textarea', {
            ref: bodyRef,
            value: body,
            maxLength: 4000,
            placeholder: t('bodyPlaceholder'),
            'aria-label': t('noteField'),
            onChange: (event) => { setBody(event.target.value); autosize() },
            onBlur: commitText,
            onKeyDown: (event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault()
                commitText()
              }
            },
          })
          : h('div', {
            ref: viewBodyRef,
            className: 'todo-textview todo-view-body',
            title: t('dblEdit'),
            onDoubleClick: () => {
              if (Date.now() - suppressClickRef.current < 300) return
              setBody(task.note || '')
              setTextMode('note')
            },
          }, task.note ? renderMarkdown(task.note, query, `eb-${task.id}`) : h('span', { className: 'todo-empty-hint' }, t('emptyBodyHint'))),
        h('div', { className: 'todo-editor-row' },
          h('span', { className: 'label' }, t('paperColor')),
          h('div', { className: 'todo-palette', role: 'group', 'aria-label': t('paperColor') },
            ...PAPER_ORDER.map((id) => h('button', {
              key: id,
              type: 'button',
              className: 'todo-swatch',
              style: { '--swatch': `var(--todo-paper-${id})` },
              'aria-label': t('color' + id.charAt(0).toUpperCase() + id.slice(1)),
              'aria-pressed': (task.color || 'cream') === id ? 'true' : 'false',
              title: t('color' + id.charAt(0).toUpperCase() + id.slice(1)),
              onClick: () => { void patch({ color: id }) },
            })))),
        h('div', { className: 'todo-time-row' },
          h('label', { className: 'todo-field' },
            h('span', null, t('planStartField')),
            h('input', {
              type: 'datetime-local',
              value: start,
              'aria-label': t('planStartField'),
              onChange: (event) => { void patch({ planStartAt: fromLocalInput(event.target.value) }) },
            })),
          h('div', { className: 'todo-field todo-end-field' },
            h('div', { className: 'todo-field-head' },
              h('span', null, t('planEndField')),
              showEnd
                ? h('button', {
                    type: 'button',
                    className: 'todo-time-clear',
                    onClick: () => {
                      setShowEnd(false)
                      void patch({ planEndAt: null })
                    },
                  }, t('clearTime'))
                : null),
            showEnd
              ? h('input', {
                  ref: endRef,
                  type: 'datetime-local',
                  value: end,
                  'aria-label': t('planEndField'),
                  onChange: (event) => { void patch({ planEndAt: fromLocalInput(event.target.value) }) },
                })
              : h('button', {
                  type: 'button',
                  className: 'todo-add-end',
                  onClick: () => {
                    setShowEnd(true)
                    requestAnimationFrame(() => {
                      if (endRef.current) endRef.current.focus()
                    })
                  },
                }, t('addEnd')))),
        h('p', { className: 'todo-time-hint' }, t('timeOptionalHint')),
        (task.planStartAt && task.planEndAt && new Date(task.planEndAt) < new Date(task.planStartAt))
          ? h('p', { className: 'todo-invalid' }, t('timeWarning'))
          : null,
        h('div', { className: 'todo-status-row', role: 'group', 'aria-label': t('statusField') },
          ...STATUSES.map((value) => h('button', {
            key: value,
            type: 'button',
            className: 'todo-status-btn',
            'data-status': value,
            'aria-pressed': task.status === value ? 'true' : 'false',
            onClick: () => { void patch({ status: value }) },
          }, h('i', { className: 'dot' }), t('status' + value.charAt(0).toUpperCase() + value.slice(1))))),
        h('details', { className: 'todo-details' },
          h('summary', null, t('moreFields')),
          h('label', { className: 'todo-field', style: { marginBottom: '7px' } },
            h('span', null, t('workspaceField')),
            h('select', {
              value: task.workspaceId || '',
              'aria-label': t('workspaceField'),
              onChange: (event) => { void patch({ workspaceId: event.target.value || null }) },
            },
              h('option', { value: '' }, t('unlinked')),
              ...(snapshotState.workspaces || []).map((item) => h('option', { key: item.id, value: item.id }, item.title || item.path || item.id)),
              task.workspaceId && !(snapshotState.workspaces || []).some((item) => item.id === task.workspaceId)
                ? h('option', { value: task.workspaceId }, t('removedWorkspace'))
                : null)),
          h('div', { className: 'todo-field' },
            h('span', null, t('attachmentsField')),
            attachmentsRows.length > 0 ? h('ul', { className: 'todo-attach-list' }, ...attachmentsRows) : null,
            h('div', { className: 'todo-editor-row' },
              h('input', {
                style: { flex: '1 1 160px', height: '30px' },
                value: draftPath,
                placeholder: t('attachmentPlaceholder'),
                'aria-label': t('attachmentPlaceholder'),
                onChange: (event) => setDraftPath(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    addAttachment()
                  }
                },
              }),
              h('button', { type: 'button', className: 'todo-mini', onClick: addAttachment }, t('addAttachment'))),
            h('p', { style: { margin: '0', fontSize: '11px', lineHeight: '16px', color: 'var(--todo-ink-faint)' } }, t('attachmentHint')))),
        error ? h('p', { className: 'todo-invalid', role: 'alert' }, error) : null,
        h('div', { className: 'todo-editor-foot' },
          h('button', { type: 'button', className: 'todo-mini danger', onClick: remove },
            confirmDelete ? t('deleteAgain') : t('delete')),
          h('span', { className: 'spacer' }),
          h('span', { className: 'todo-quick-hint' }, t('quickHint')))),
        previewEntry ? h(PreviewDialog, { t, store, entry: previewEntry, onClose: () => setPreviewEntry(null) }) : null)
    }

    // ---------------------------------------------------------------- 设置弹层

    function ContextMenu({ menu, task, t, store, workspaces, onClose, onOpen, onEditText, onCollapse, onDelete }) {
      const [openSub, setOpenSub] = React.useState(null)
      const menuRef = React.useRef(null)
      React.useEffect(() => {
        const onKey = (event) => { if (event.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [onClose])
      React.useEffect(() => {
        const node = menuRef.current
        if (!node) return
        const rect = node.getBoundingClientRect()
        const x = Math.min(menu.x, Math.max(8, window.innerWidth - rect.width - 8))
        const y = Math.min(menu.y, Math.max(8, window.innerHeight - rect.height - 8))
        node.style.left = `${x}px`
        node.style.top = `${y}px`
        const first = node.querySelector('button')
        if (first) first.focus()
      }, [])
      if (!task) return null
      async function patch(fields) {
        await store.update(task.id, fields)
        onClose()
      }
      async function copy(text) {
        try { await navigator.clipboard.writeText(text || '') } catch { /* 剪贴板不可用忽略 */ }
        onClose()
      }
      function item(key, label, onClick, sub) {
        return h('button', {
          key,
          type: 'button',
          className: 'todo-ctx-item',
          role: 'menuitem',
          onClick: (event) => { event.stopPropagation(); if (sub) { setOpenSub(openSub === key ? null : key); return } onClick() },
          onMouseEnter: () => { if (sub) setOpenSub(key) },
          onFocus: () => { if (sub) setOpenSub(key) },
        }, label, sub ? h('span', { className: 'arrow', 'aria-hidden': true }, '▸') : null,
        sub && openSub === key ? h('span', { className: 'todo-ctx-sub', role: 'menu' }, sub) : null)
      }
      const statusSub = STATUSES.map((value) => h('button', {
        key: value,
        type: 'button',
        className: 'todo-ctx-item',
        role: 'menuitem',
        onClick: (event) => { event.stopPropagation(); void patch({ status: value }) },
      }, h('i', { className: 'dot', 'data-status': value }), t('status' + value.charAt(0).toUpperCase() + value.slice(1))))
      const colorSub = PAPER_ORDER.map((id) => h('button', {
        key: id,
        type: 'button',
        className: 'todo-ctx-item',
        role: 'menuitem',
        onClick: (event) => { event.stopPropagation(); void patch({ color: id }) },
      }, h('i', { className: 'swatch', style: { '--swatch': `var(--todo-paper-${id})` } }), t('color' + id.charAt(0).toUpperCase() + id.slice(1))))
      const workspaceSub = [
        h('button', {
          key: 'none',
          type: 'button',
          className: 'todo-ctx-item',
          role: 'menuitem',
          onClick: (event) => { event.stopPropagation(); void patch({ workspaceId: null }) },
        }, t('ctxUnlink')),
        ...workspaces.map((ws) => h('button', {
          key: ws.id,
          type: 'button',
          className: 'todo-ctx-item',
          role: 'menuitem',
          onClick: (event) => { event.stopPropagation(); void patch({ workspaceId: ws.id }) },
        }, ws.title || ws.path || ws.id)),
      ]
      return h('div', {
        className: 'todo-ctx-overlay',
        onClick: onClose,
        onContextMenu: (event) => { event.preventDefault(); onClose() },
      },
        h('div', {
          ref: menuRef,
          className: 'todo-ctx',
          role: 'menu',
          style: { left: `${menu.x}px`, top: `${menu.y}px` },
          onClick: (event) => event.stopPropagation(),
        },
          menu.expanded
            ? item('collapse', t('ctxCollapse'), onCollapse)
            : item('open', t('ctxOpen'), onOpen),
          item('editTitle', t('ctxEditTitle'), () => onEditText('title')),
          item('editBody', t('ctxEditBody'), () => onEditText('note')),
          h('div', { className: 'todo-ctx-sep', 'aria-hidden': true }),
          item('status', t('ctxStatus'), null, statusSub),
          item('color', t('ctxColor'), null, colorSub),
          item('workspace', t('ctxWorkspace'), null, workspaceSub),
          h('div', { className: 'todo-ctx-sep', 'aria-hidden': true }),
          item('copyTitle', t('ctxCopyTitle'), () => { void copy(task.title) }),
          item('copyBody', t('ctxCopyBody'), () => { void copy(task.note) }),
          h('div', { className: 'todo-ctx-sep', 'aria-hidden': true }),
          item('delete', t('ctxDelete'), () => onDelete(task.id))))
    }

    function TrashDialog({ t, store, onClose }) {
      const [items, setItems] = React.useState(null)
      const [error, setError] = React.useState(null)
      const [confirmEmpty, setConfirmEmpty] = React.useState(false)
      const dialogRef = React.useRef(null)
      useFocusTrap(dialogRef)
      React.useEffect(() => {
        const onKey = (event) => { if (event.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [onClose])
      React.useEffect(() => {
        let alive = true
        void store.trash().then((result) => {
          if (!alive) return
          if (result.ok) setItems(result.data.items || [])
          else setError(requestErrorText(t, result))
        })
        return () => { alive = false }
      }, [])
      React.useEffect(() => {
        if (!confirmEmpty) return undefined
        const handle = setTimeout(() => setConfirmEmpty(false), 4000)
        return () => clearTimeout(handle)
      }, [confirmEmpty])
      async function restore(id) {
        const result = await store.restore(id)
        if (!result.ok) { setError(requestErrorText(t, result)); return }
        setItems((list) => (list || []).filter((entry) => entry.task.id !== id))
      }
      async function empty() {
        if (!confirmEmpty) { setConfirmEmpty(true); return }
        const result = await store.emptyTrash()
        if (!result.ok) { setError(requestErrorText(t, result)); return }
        setItems([])
        setConfirmEmpty(false)
      }
      return h('div', { className: 'todo-overlay', role: 'presentation', onClick: onClose },
        h('div', { className: 'todo-mask', 'aria-hidden': true }),
        h('div', {
          ref: dialogRef,
          className: 'todo-dialog',
          role: 'dialog',
          'aria-modal': 'true',
          onClick: (event) => event.stopPropagation(),
        },
          h('div', { className: 'todo-dialog-head' },
            h('h2', { className: 'todo-dialog-title' }, t('trashTitle')),
            h('button', { type: 'button', className: 'todo-dialog-close', 'aria-label': t('close'), onClick: onClose }, h(CloseIcon))),
          h('div', { className: 'todo-dialog-body' },
            error ? h('p', { className: 'todo-error', role: 'alert' }, error) : null,
            items === null ? h('p', null, t('loading')) : null,
            items && items.length === 0 ? h('p', null, t('trashEmpty')) : null,
            items && items.length > 0
              ? h('ul', { className: 'todo-trash-list' }, ...items.map((entry) => h('li', { key: entry.task.id, className: 'todo-trash-row' },
                h('span', { className: 'todo-trash-title' }, entry.task.title),
                h('span', { className: 'todo-trash-when' }, new Date(entry.deletedAt).toLocaleString()),
                h('button', { type: 'button', className: 'todo-mini', onClick: () => { void restore(entry.task.id) } }, t('restore')))))
              : null,
            h('div', { className: 'todo-editor-foot' },
              h('button', {
                type: 'button',
                className: 'todo-mini danger',
                disabled: !items || items.length === 0,
                onClick: () => { void empty() },
              }, confirmEmpty ? t('deleteAgain') : t('emptyTrash')),
              h('span', { className: 'spacer' }),
              h('button', { type: 'button', className: 'todo-mini', onClick: onClose }, t('close'))))))
    }

    function SettingsDialog({ t, store, onClose }) {
      const snapshot = useSnapshot(store)
      const [busy, setBusy] = React.useState(false)
      const [notice, setNotice] = React.useState(null)
      const [importMode, setImportMode] = React.useState('merge')
      const enabled = snapshot.config.llmTools === true
      const dialogRef = React.useRef(null)
      useFocusTrap(dialogRef)

      React.useEffect(() => {
        const onKey = (event) => { if (event.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [onClose])

      async function toggle(next) {
        setBusy(true)
        setNotice(null)
        const result = await store.setConfig({ llmTools: next })
        setBusy(false)
        if (!result.ok) {
          setNotice({ kind: 'error', text: requestErrorText(t, result) })
          return
        }
        setNotice({ kind: 'ok', text: t('configSaved') })
      }

      const remind = {
        enabled: true, leadMinutes: 60, soonMin: 30, overdueMin: 10, reRemindHours: 1, checkMin: 5,
        ...(snapshot.config.remind || {}),
      }
      async function saveRemind(patchRemind) {
        const result = await store.setConfig({ remind: { ...remind, ...patchRemind } })
        setNotice(result.ok
          ? { kind: 'ok', text: t('configSaved') }
          : { kind: 'error', text: requestErrorText(t, result) })
      }

      async function doExport() {
        setBusy(true)
        const result = await store.exportWall()
        setBusy(false)
        if (!result.ok) { setNotice({ kind: 'error', text: requestErrorText(t, result) }); return }
        downloadText(`sticky-wall-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(result.data, null, 2), 'application/json')
        setNotice({ kind: 'ok', text: t('exported') })
      }
      function doExportMd() {
        downloadText(`sticky-wall-${new Date().toISOString().slice(0, 10)}.md`, exportMarkdown(snapshot.tasks, t), 'text/markdown')
        setNotice({ kind: 'ok', text: t('exportedMd') })
      }
      function doExportCsv() {
        downloadText(`sticky-wall-${new Date().toISOString().slice(0, 10)}.csv`, exportCsv(snapshot.tasks), 'text/csv')
        setNotice({ kind: 'ok', text: t('exportedCsv') })
      }
      async function doImport(file) {
        let tasks
        try { tasks = detectImport(file.name, await file.text()) } catch { setNotice({ kind: 'error', text: t('importBadFile') }); return }
        if (!tasks) { setNotice({ kind: 'error', text: t('importBadFile') }); return }
        if (importMode === 'replace' && !window.confirm(t('importConfirm'))) return
        setBusy(true)
        const result = await store.importWall({ mode: importMode, tasks })
        setBusy(false)
        setNotice(result.ok
          ? { kind: 'ok', text: t('imported', { added: result.data.added, skipped: result.data.skipped }) }
          : { kind: 'error', text: requestErrorText(t, result) })
      }

      const storage = snapshot.storage || {}

      return h('div', {
        className: 'todo-overlay',
        role: 'presentation',
        onClick: onClose,
      },
        h('div', { className: 'todo-mask', 'aria-hidden': true }),
        h('div', {
          ref: dialogRef,
          className: 'todo-dialog',
          role: 'dialog',
          'aria-modal': 'true',
          'aria-labelledby': 'todo-settings-title',
          onClick: (event) => event.stopPropagation(),
        },
          h('div', { className: 'todo-dialog-head' },
            h('h2', { id: 'todo-settings-title', className: 'todo-dialog-title' }, t('settingsTitle')),
            h('button', {
              type: 'button',
              className: 'todo-dialog-close',
              'aria-label': t('close'),
              onClick: onClose,
            }, h(CloseIcon))),
          h('div', { className: 'todo-dialog-body' },
            h('div', { className: 'todo-setting' },
              h('div', { className: 'todo-setting-copy' },
                h('span', { className: 'todo-setting-title' }, t('llmTitle')),
                h('p', { className: 'todo-setting-desc' }, t('llmHelp')),
                h('span', { className: 'todo-label' }, t('llmToolsLabel')),
                h('ul', { className: 'todo-tool-list' },
                  h('li', null, t('toolLoader')),
                  h('li', null, 'todo_list'),
                  h('li', null, 'todo_create'),
                  h('li', null, 'todo_update'),
                  h('li', null, 'todo_split'),
                  h('li', null, 'todo_delete'),
                  h('li', null, 'todo_restore'),
                  h('li', null, 'todo_bulk_update'),
                  h('li', null, 'todo_arrange'))),
              h(Switch, { checked: enabled, onChange: toggle, disabled: busy, label: t('llmTitle') })),
            h('div', { className: 'todo-setting' },
              h('div', { className: 'todo-setting-copy' },
                h('span', { className: 'todo-setting-title' }, t('backupTitle')),
                h('p', { className: 'todo-setting-desc' }, t('backupDesc')),
                h('select', {
                  value: importMode,
                  'aria-label': t('importMode'),
                  onChange: (event) => setImportMode(event.target.value),
                  style: { height: '28px' },
                },
                  h('option', { value: 'merge' }, t('importMerge')),
                  h('option', { value: 'replace' }, t('importReplace')))),
              h('div', { className: 'todo-general-control' },
                h('button', { type: 'button', className: 'todo-mini', disabled: busy, onClick: () => { void doExport() } }, t('exportWall')),
                h('button', { type: 'button', className: 'todo-mini', disabled: busy, onClick: doExportMd }, t('exportMd')),
                h('button', { type: 'button', className: 'todo-mini', disabled: busy, onClick: doExportCsv }, t('exportCsv')),
                h('label', { className: 'todo-mini', style: { cursor: 'pointer', display: 'inline-flex', alignItems: 'center' } }, t('importWall'),
                  h('input', {
                    type: 'file',
                    accept: '.json,.md,.markdown,.csv,application/json,text/markdown,text/csv',
                    style: { display: 'none' },
                    onChange: (event) => {
                      const file = event.target.files && event.target.files[0]
                      if (file) void doImport(file)
                      event.target.value = ''
                    },
                  })))),
            h('div', { className: 'todo-setting' },
              h('div', { className: 'todo-setting-copy' },
                h('span', { className: 'todo-setting-title' }, t('remindTitle')),
                h('p', { className: 'todo-setting-desc' }, t('remindDesc')),
                h('div', { className: 'todo-remind-grid' },
                  h('label', null,
                    t('remindLead'),
                    h('select', {
                      value: String(remind.leadMinutes),
                      onChange: (event) => { void saveRemind({ leadMinutes: Number(event.target.value) }) },
                    },
                      ...[15, 30, 60, 120, 1440].map((m) => h('option', { key: m, value: String(m) }, `${m} min`)))),
                  h('label', null,
                    t('remindSoon'),
                    h('input', {
                      type: 'number', min: 1, value: remind.soonMin,
                      onChange: (event) => { void saveRemind({ soonMin: Math.max(1, Number(event.target.value) || 1) }) },
                    })),
                  h('label', null,
                    t('remindOverdue'),
                    h('input', {
                      type: 'number', min: 1, value: remind.overdueMin,
                      onChange: (event) => { void saveRemind({ overdueMin: Math.max(1, Number(event.target.value) || 1) }) },
                    })),
                  h('label', null,
                    t('remindRe'),
                    h('input', {
                      type: 'number', min: 1, value: remind.reRemindHours,
                      onChange: (event) => { void saveRemind({ reRemindHours: Math.max(1, Number(event.target.value) || 1) }) },
                    })),
                  h('label', null,
                    t('remindCheck'),
                    h('input', {
                      type: 'number', min: 1, value: remind.checkMin,
                      onChange: (event) => { void saveRemind({ checkMin: Math.max(1, Number(event.target.value) || 1) }) },
                    })))),
              h(Switch, {
                checked: remind.enabled !== false,
                onChange: (next) => { void saveRemind({ enabled: next }) },
                disabled: busy,
                label: t('remindEnabled'),
              })),
            notice
              ? h('p', {
                className: notice.kind === 'error' ? 'todo-error' : 'todo-notice',
                role: notice.kind === 'error' ? 'alert' : 'status',
              }, notice.text)
              : null,
            storage.tasksFile ? h('div', { className: 'todo-field' },
              h('span', null, t('dataFile')),
              h('p', { className: 'todo-path' }, storage.tasksFile)) : null,
            storage.configFile ? h('div', { className: 'todo-field' },
              h('span', null, t('configFile')),
              h('p', { className: 'todo-path' }, storage.configFile)) : null),
          h('div', { className: 'todo-dialog-foot' },
            h('button', { type: 'button', className: 'todo-btn ghost', onClick: onClose }, t('close')))))
    }

    // ---------------------------------------------------------------- 附件缩略图 / 预览 / 批量 / 列表

    function b64ToText(base64) {
      return new TextDecoder().decode(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)))
    }

    function AttachmentThumb({ store, entry, onPreview }) {
      const [url, setUrl] = React.useState(null)
      React.useEffect(() => {
        let alive = true
        setUrl(null)
        void store.serveFile(entry.path).then((result) => {
          if (!alive || !result.ok) return
          setUrl(`data:${result.data.contentType || 'image/png'};base64,${result.data.base64}`)
        })
        return () => { alive = false }
      }, [entry.path])
      if (!url) return h('span', { className: 'todo-attach-thumb', 'aria-hidden': true })
      return h('img', {
        className: 'todo-attach-thumb',
        src: url,
        alt: entry.name || entry.path,
        onClick: (event) => { event.stopPropagation(); onPreview(entry) },
      })
    }

    function PreviewDialog({ t, store, entry, onClose }) {
      const [data, setData] = React.useState(null)
      const [error, setError] = React.useState(null)
      const dialogRef = React.useRef(null)
      useFocusTrap(dialogRef)
      React.useEffect(() => {
        const onKey = (event) => { if (event.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [onClose])
      React.useEffect(() => {
        let alive = true
        setData(null)
        setError(null)
        void store.serveFile(entry.path).then((result) => {
          if (!alive) return
          if (result.ok) setData(result.data)
          else setError(requestErrorText(t, result))
        })
        return () => { alive = false }
      }, [entry.path])
      let body
      if (error) body = h('p', { className: 'todo-error', role: 'alert' }, error)
      else if (!data) body = h('p', null, t('previewLoad'))
      else if (isImagePath(entry.path)) body = h('img', { className: 'todo-preview-img', src: `data:${data.contentType || 'image/png'};base64,${data.base64}`, alt: data.name || entry.path })
      else if (isMdPath(entry.path)) body = h('div', { className: 'todo-preview-md' }, renderMarkdown(b64ToText(data.base64), '', 'pv'))
      else body = h('pre', { className: 'todo-preview-pre' }, b64ToText(data.base64))
      return h('div', { className: 'todo-overlay', role: 'presentation', onClick: onClose },
        h('div', { className: 'todo-mask', 'aria-hidden': true }),
        h('div', {
          ref: dialogRef,
          className: 'todo-dialog',
          role: 'dialog',
          'aria-modal': 'true',
          onClick: (event) => event.stopPropagation(),
        },
          h('div', { className: 'todo-dialog-head' },
            h('h2', { className: 'todo-dialog-title' }, t('previewTitle')),
            h('button', { type: 'button', className: 'todo-dialog-close', 'aria-label': t('close'), onClick: onClose }, h(CloseIcon))),
          h('div', { className: 'todo-dialog-body' }, body)))
    }

    function BulkBar({ t, store, ids, workspaces, onClear, onDone }) {
      const [busy, setBusy] = React.useState(false)
      async function applyPatch(patch) {
        if (busy) return
        setBusy(true)
        const result = await store.bulk(ids, patch)
        setBusy(false)
        if (result.ok) onDone(t('bulkDone', { n: result.data.updated }))
        else onDone(null, requestErrorText(t, result))
      }
      async function del() {
        if (busy) return
        setBusy(true)
        let n = 0
        for (const id of ids) {
          const result = await store.remove(id)
          if (result.ok) n += 1
        }
        setBusy(false)
        onDone(t('bulkDeleted', { n }))
        onClear()
      }
      return h('div', { className: 'todo-bulkbar', role: 'toolbar', 'aria-label': t('selectedN', { n: ids.length }) },
        h('span', { className: 'n' }, t('selectedN', { n: ids.length })),
        h('select', {
          'aria-label': t('bulkStatus'), value: '', disabled: busy,
          onChange: (event) => { const v = event.target.value; event.target.value = ''; if (v) void applyPatch({ status: v }) },
        },
          h('option', { value: '' }, t('bulkStatus')),
          ...STATUSES.map((s) => h('option', { key: s, value: s }, t('status' + s.charAt(0).toUpperCase() + s.slice(1))))),
        h('select', {
          'aria-label': t('bulkColor'), value: '', disabled: busy,
          onChange: (event) => { const v = event.target.value; event.target.value = ''; if (v) void applyPatch({ color: v }) },
        },
          h('option', { value: '' }, t('bulkColor')),
          ...PAPER_ORDER.map((c) => h('option', { key: c, value: c }, t('color' + c.charAt(0).toUpperCase() + c.slice(1))))),
        h('select', {
          'aria-label': t('bulkWorkspace'), value: '', disabled: busy,
          onChange: (event) => { const v = event.target.value; event.target.value = ''; if (v) void applyPatch({ workspaceId: v === '__none' ? null : v }) },
        },
          h('option', { value: '' }, t('bulkWorkspace')),
          h('option', { value: '__none' }, t('unlinked')),
          ...workspaces.map((w) => h('option', { key: w.id, value: w.id }, w.title || w.path || w.id))),
        h('button', { type: 'button', className: 'todo-mini danger', disabled: busy, onClick: () => { void del() } }, t('bulkDelete')),
        h('button', { type: 'button', className: 'todo-mini', onClick: onClear }, t('clearSelect')))
    }

    function ListView({ t, store, tasks, selectedIds, onToggleSelect, onToggleAll, onOpenEdit, onRemove, workspaces }) {
      const groups = STATUSES
        .map((s) => ({ status: s, items: tasks.filter((x) => x.status === s) }))
        .filter((g) => g.items.length > 0)
      const allSelected = tasks.length > 0 && tasks.every((x) => selectedIds.includes(x.id))
      return h('div', { className: 'todo-listview' },
        h('label', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 8, cursor: 'pointer' } },
          h('input', { type: 'checkbox', className: 'todo-check', checked: allSelected, onChange: () => onToggleAll() }),
          t('selectAll')),
        ...groups.map((g) => {
          const rows = g.items.map((task) => {
            const cells = [
              h('td', null, h('input', {
                type: 'checkbox',
                className: 'todo-check',
                checked: selectedIds.includes(task.id),
                onChange: () => onToggleSelect(task.id),
                'aria-label': task.title,
              })),
              h('td', null, h('button', { type: 'button', className: 'todo-list-title', title: task.title, onClick: () => onOpenEdit(task.id) }, task.title || t('titlePlaceholder'))),
              h('td', null, h('select', {
                value: task.status,
                'aria-label': t('listStatus'),
                onChange: (event) => { void store.update(task.id, { status: event.target.value }) },
              }, ...STATUSES.map((s) => h('option', { key: s, value: s }, t('status' + s.charAt(0).toUpperCase() + s.slice(1)))))),
              h('td', null, h('select', {
                value: task.workspaceId || '',
                'aria-label': t('listWorkspace'),
                onChange: (event) => { void store.update(task.id, { workspaceId: event.target.value || null }) },
              },
                h('option', { value: '' }, t('unlinked')),
                ...workspaces.map((w) => h('option', { key: w.id, value: w.id }, w.title || w.path || w.id)),
                task.workspaceId && !workspaces.some((w) => w.id === task.workspaceId) ? h('option', { value: task.workspaceId }, t('removedWorkspace')) : null)),
              h('td', { className: 'todo-list-when' }, task.planEndAt ? formatWhen(task.planEndAt) : '—'),
              h('td', null, h('button', { type: 'button', className: 'todo-mini danger', onClick: () => onRemove(task.id) }, t('delete'))),
            ]
            return h('tr', { key: task.id, className: selectedIds.includes(task.id) ? 'selected' : '' }, ...cells)
          })
          const ths = ['', t('listTitle'), t('listStatus'), t('listWorkspace'), t('listEnd'), t('listActions')]
            .map((label, i) => h('th', { key: i }, label))
          return h('div', { key: g.status, className: 'todo-list-group' },
            h('h3', null, t('status' + g.status.charAt(0).toUpperCase() + g.status.slice(1)), ` · ${g.items.length}`),
            h('table', { className: 'todo-list-table' },
              h('thead', null, h('tr', null, ...ths)),
              h('tbody', null, ...rows)))
        }))
    }

    // ---------------------------------------------------------------- 主面板

    function WallPanel() {
      const t = translator
      const store = WALL_STORE
      const snapshot = useSnapshot(store)

      const [query, setQuery] = React.useState('')
      const [filter, setFilter] = React.useState('all')
      const [editingId, setEditingId] = React.useState(null)
      const [settingsOpen, setSettingsOpen] = React.useState(false)
      const [notice, setNotice] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      const [closing, setClosing] = React.useState(false)
      const [removingIds, setRemovingIds] = React.useState([])
      const [trashOpen, setTrashOpen] = React.useState(false)
      const [ctxMenu, setCtxMenu] = React.useState(null)
      const [pendingTextEdit, setPendingTextEdit] = React.useState(null)
      const [viewport, setViewport] = React.useState({ top: 0, height: 800 })
      const [view, setView] = React.useState('wall')
      const [selectedIds, setSelectedIds] = React.useState([])
      const [showArchived, setShowArchived] = React.useState(false)
      const [template, setTemplate] = React.useState('plain')
      const searchRef = React.useRef(null)
      const scrollRef = React.useRef(null)
      const pointerY = React.useRef(null)
      const autoScroll = React.useRef(null)
      const draftRef = React.useRef(null)

      // 大墙性能：只渲染视口附近（上下各留一屏余量）的便签。
      React.useEffect(() => {
        const node = scrollRef.current
        if (!node) return undefined
        let raf = null
        const measure = () => {
          raf = null
          setViewport({ top: node.scrollTop, height: node.clientHeight })
        }
        const onScroll = () => { if (raf === null) raf = requestAnimationFrame(measure) }
        measure()
        node.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('resize', onScroll)
        return () => {
          node.removeEventListener('scroll', onScroll)
          window.removeEventListener('resize', onScroll)
          if (raf !== null) cancelAnimationFrame(raf)
        }
      }, [])

      React.useEffect(() => {
        if (!notice) return undefined
        const handle = setTimeout(() => setNotice(null), 3000)
        return () => clearTimeout(handle)
      }, [notice])

      // 任务被删/导入替换后，剪掉已不存在的选中 id。
      React.useEffect(() => {
        setSelectedIds((list) => list.filter((id) => tasks.some((x) => x.id === id)))
      }, [tasks])

      React.useEffect(() => () => {
        if (autoScroll.current !== null) {
          clearInterval(autoScroll.current)
          autoScroll.current = null
        }
      }, [])

      const tasks = snapshot.tasks
      const parsed = parseQuery(query)
      const freeText = parsed.text
      const isArchived = (task) => task.status === 'done' || task.status === 'cancelled'
      const hideArchived = !showArchived && filter !== 'done' && filter !== 'cancelled'
      const matchWorkspace = (task) => {
        if (!parsed.workspace) return true
        if (!task.workspaceId) return false
        if (task.workspaceId.toLowerCase() === parsed.workspace) return true
        const ws = (snapshot.workspaces || []).find((w) => w.id === task.workspaceId)
        return ws ? (ws.title || ws.path || '').toLowerCase().includes(parsed.workspace) : false
      }
      const byFilter = tasks.filter((task) => {
        if (filter !== 'all' && task.status !== filter) return false
        if (parsed.status && task.status !== parsed.status) return false
        if (hideArchived && isArchived(task)) return false
        if (!matchWorkspace(task)) return false
        if (!freeText) return true
        const needle = freeText.toLowerCase()
        return task.title.toLowerCase().includes(needle)
          || (task.note || '').toLowerCase().includes(needle)
          || timeText(task, t).toLowerCase().includes(needle)
      })
      const visibleIds = new Set(byFilter.map((task) => task.id))
      const archivedCount = tasks.filter(isArchived).length
      const renderTasks = tasks.filter((task) => {
        if (hideArchived && isArchived(task)) return false
        const y = task.y ?? 0
        return y + NOTE_H >= viewport.top - 240 && y <= viewport.top + viewport.height + 240
      })

      const counts = { all: tasks.length }
      for (const status of STATUSES) counts[status] = 0
      for (const task of tasks) counts[task.status] += 1

      const canvasRef = React.useRef(null)
      const [canvasWidth, setCanvasWidth] = React.useState(900)

      React.useEffect(() => {
        const measure = () => {
          const width = scrollRef.current ? scrollRef.current.clientWidth : 900
          setCanvasWidth(Math.max(320, width))
        }
        measure()
        window.addEventListener('resize', measure)
        return () => window.removeEventListener('resize', measure)
      }, [])

      const canvasHeight = Math.max(
        snapshot.phase === 'loading' ? 320 : 0,
        ...tasks.map((task) => (task.y ?? 0) + NOTE_H + 56),
        360,
      )

      function beginDragScroll() {
        if (autoScroll.current !== null) return
        autoScroll.current = setInterval(() => {
          const y = pointerY.current
          const region = scrollRef.current
          if (y === null || region === null) return
          const edge = 64
          if (y < edge) region.scrollTop -= 14
          else if (y > window.innerHeight - edge) region.scrollTop += 14
        }, 40)
      }

      function endDragScroll() {
        if (autoScroll.current !== null) {
          clearInterval(autoScroll.current)
          autoScroll.current = null
        }
        pointerY.current = null
      }

      async function moveNote(id, x, y) {
        const result = await store.update(id, { x, y })
        if (!result.ok) setNotice({ kind: 'error', text: requestErrorText(t, result) })
      }

      function findSpot() {
        const width = canvasWidth
        const candidates = []
        for (let row = 0; row < 40; row += 1) {
          for (let col = 0; col * (NOTE_W + GAP) + 24 + NOTE_W < width - 12; col += 1) {
            candidates.push({ x: 24 + col * (NOTE_W + GAP), y: 24 + row * (NOTE_H + GAP) })
          }
        }
        const free = candidates.find((spot) => tasks.every((task) => (
          Math.abs((task.x ?? 0) - spot.x) > NOTE_W * 0.7 || Math.abs((task.y ?? 0) - spot.y) > NOTE_H * 0.7
        )))
        if (free) return free
        return { x: 24, y: 24 + tasks.length * 20 }
      }

      async function createNote(coord, templateId) {
        if (busy || editingId !== null) return
        setBusy(true)
        const spot = coord || findSpot()
        const skeleton = templateSkeleton(templateId || template, t)
        const result = await store.create({ title: skeleton.title, note: skeleton.note, x: spot.x, y: spot.y, color: 'cream' })
        setBusy(false)
        if (!result.ok) {
          setNotice({ kind: 'error', text: requestErrorText(t, result) })
          return
        }
        draftRef.current = result.data.task.id
        setClosing(false)
        setEditingId(result.data.task.id)
        setNotice({ kind: 'ok', text: t('created') })
      }

      function toggleSelect(id) {
        setSelectedIds((list) => (list.includes(id) ? list.filter((x) => x !== id) : list.concat(id)))
      }
      function toggleAll() {
        setSelectedIds((list) => (byFilter.length > 0 && byFilter.every((x) => list.includes(x.id)) ? [] : byFilter.map((x) => x.id)))
      }
      async function dropStatus(id, status) {
        const result = await store.update(id, { status })
        if (result.ok) setNotice({ kind: 'ok', text: t('dropStatus', { status: t('status' + status.charAt(0).toUpperCase() + status.slice(1)) }) })
        else setNotice({ kind: 'error', text: requestErrorText(t, result) })
      }
      function openEditFromList(id) {
        setView('wall')
        setClosing(false)
        setEditingId(id)
        const task = tasks.find((x) => x.id === id)
        if (task && scrollRef.current) scrollRef.current.scrollTo({ top: Math.max(0, (task.y ?? 0) - 40) })
      }
      function locateFirst() {
        const first = byFilter[0]
        if (!first || !scrollRef.current) return
        setView('wall')
        scrollRef.current.scrollTo({ top: Math.max(0, (first.y ?? 0) - 40), behavior: 'smooth' })
      }
      function canvasDoubleClick(event) {
        if (event.target.closest('.todo-note') || event.target.closest('.todo-editor')) return
        const canvas = canvasRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const x = Math.max(8, Math.min(event.clientX - rect.left, Math.max(8, canvasWidth - NOTE_W - 8)))
        const y = Math.max(8, event.clientY - rect.top)
        void createNote({ x, y })
      }

      // 键盘流：/ 搜索、n 新建、e 编辑、Delete 删除；守卫墙可见且焦点不在输入控件。
      const keyStateRef = React.useRef(null)
      keyStateRef.current = { byFilter, renderTasks, visibleIds, editingId, selectedIds }
      const actionsRef = React.useRef(null)
      actionsRef.current = { createNote, removeNote }
      React.useEffect(() => {
        const onKey = (event) => {
          const root = scrollRef.current && scrollRef.current.closest('.todo-root')
          if (!root || root.getBoundingClientRect().width === 0) return
          const el = event.target
          const tag = el && el.tagName
          if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el && el.isContentEditable)) return
          if (event.ctrlKey || event.metaKey || event.altKey) return
          const st = keyStateRef.current
          const act = actionsRef.current
          if (event.key === '/') {
            event.preventDefault()
            if (searchRef.current) searchRef.current.focus()
          } else if (event.key === 'n') {
            event.preventDefault()
            void act.createNote()
          } else if (event.key === 'e') {
            event.preventDefault()
            const first = st.renderTasks.find((x) => st.visibleIds.has(x.id)) || st.byFilter[0]
            const id = st.editingId || (first && first.id)
            if (id) { setView('wall'); setClosing(false); setEditingId(id) }
          } else if (event.key === 'Delete') {
            const id = st.editingId || st.selectedIds[0]
            if (id) { event.preventDefault(); act.removeNote(id) }
          }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [])

      /** 收回展开卡：先播缩回小卡的形变，再卸载。 */
      function collapseEditor() {
        if (editingId === null || closing) return
        setClosing(true)
      }
      function finishClose() {
        draftRef.current = null
        setClosing(false)
        setEditingId(null)
      }
      /** 删除：先播小卡缩淡出，再真正移除（进回收站，可撤销）。 */
      function removeNote(id) {
        if (removingIds.includes(id)) return
        setRemovingIds(removingIds.concat(id))
        setTimeout(() => {
          void store.remove(id).then((result) => {
            if (result.ok) setNotice({ kind: 'ok', text: t('removed'), undo: id })
          })
          setRemovingIds((list) => list.filter((item) => item !== id))
          if (editingId === id) finishClose()
        }, 170)
      }

      async function undoDelete(id) {
        setNotice(null)
        const result = await store.restore(id)
        if (!result.ok) setNotice({ kind: 'error', text: requestErrorText(t, result) })
      }

      function openCtx(event, taskId, expanded) {
        event.preventDefault()
        event.stopPropagation()
        setCtxMenu({ x: event.clientX, y: event.clientY, taskId, expanded })
      }
      function ctxEditText(mode) {
        const id = ctxMenu.taskId
        setCtxMenu(null)
        setPendingTextEdit(mode)
        setClosing(false)
        setEditingId(id)
      }

      async function arrange() {
        if (editingId !== null) return
        const width = canvasWidth - 48
        const columns = Math.max(1, Math.floor((width + GAP) / (NOTE_W + GAP)))
        const ordered = tasks.slice().sort(compareStatusThenRecent)
        const positions = ordered.map((task, index) => ({
          id: task.id,
          x: 24 + (index % columns) * (NOTE_W + GAP),
          y: 24 + Math.floor(index / columns) * (NOTE_H + GAP),
        }))
        const result = await store.arrange(positions)
        if (!result.ok) setNotice({ kind: 'error', text: requestErrorText(t, result) })
      }

      const editing = editingId ? tasks.find((task) => task.id === editingId) : null

      const chips = [
        { status: 'all', label: t('filterAll') },
        ...STATUSES.map((status) => ({ status, label: t('status' + status.charAt(0).toUpperCase() + status.slice(1)) })),
      ]

      const topbar = h('div', { className: 'todo-topbar' },
        h('div', { className: 'todo-brand' },
          h('h1', null, t('title'))),
        h('div', { className: 'todo-tools' },
          h('div', { className: 'todo-search' },
            h(SearchIcon),
            h('input', {
              ref: searchRef,
              value: query,
              placeholder: t('searchHint'),
              'aria-label': t('search'),
              onChange: (event) => setQuery(event.target.value),
              onKeyDown: (event) => {
                if (event.key === 'Enter') { event.preventDefault(); locateFirst() }
              },
            })),
          h('div', { className: 'todo-chips', role: 'group', 'aria-label': t('statusField') },
            ...chips.map((chip) => h('button', {
              key: chip.status,
              type: 'button',
              className: 'todo-chip',
              'data-status': chip.status === 'all' ? undefined : chip.status,
              'aria-pressed': filter === chip.status ? 'true' : 'false',
              onClick: () => setFilter(chip.status),
            },
              chip.status === 'all' ? null : h('i', { className: 'dot' }),
              chip.label,
              h('span', { className: 'n' }, String(counts[chip.status] || 0))))),
          h('div', { className: 'todo-viewtoggle', role: 'group', 'aria-label': t('viewToggle') },
            h('button', { type: 'button', 'aria-pressed': view === 'wall' ? 'true' : 'false', onClick: () => setView('wall') }, t('viewWall')),
            h('button', { type: 'button', 'aria-pressed': view === 'list' ? 'true' : 'false', onClick: () => setView('list') }, t('viewList'))),
          h('select', {
            'aria-label': t('template'),
            title: t('template'),
            value: template,
            style: { height: '30px' },
            onChange: (event) => setTemplate(event.target.value),
          }, ...TEMPLATE_IDS.map((id) => h('option', { key: id, value: id }, t('tpl' + id.charAt(0).toUpperCase() + id.slice(1))))),
          h('button', {
            type: 'button',
            className: 'todo-btn ghost outline',
            'aria-pressed': showArchived ? 'true' : 'false',
            title: (showArchived ? t('archiveHide') : t('archiveShow')) + ` (${archivedCount})`,
            onClick: () => setShowArchived(!showArchived),
          }, t('archive'), h('span', { className: 'n' }, String(archivedCount))),
          h('button', { type: 'button', className: 'todo-btn ghost outline', onClick: () => { void arrange() } }, t('arrange')),
          h('button', { type: 'button', className: 'todo-btn primary', onClick: () => { void createNote() } },
            h(PlusIcon), t('newNote')),
          h('button', {
            type: 'button',
            className: 'todo-btn ghost icon',
            'aria-label': t('trash'),
            title: t('trash') + (snapshot.trashCount ? ` (${snapshot.trashCount})` : ''),
            onClick: () => setTrashOpen(true),
          }, h(TrashIcon)),
          h('button', {
            type: 'button',
            className: 'todo-btn ghost icon',
            'aria-label': t('settings'),
            title: t('settings'),
            onClick: () => setSettingsOpen(true),
          }, h(GearIcon))))

      const wall = h('div', {
        ref: scrollRef,
        className: 'todo-scroll',
        // 点空白墙面（非便签、非展开卡）收回小卡面；未提交文本由 NoteEditor 卸载时落盘。
        onClick: (event) => {
          if (editingId === null) return
          if (event.target.closest('.todo-editor') || event.target.closest('.todo-note')) return
          collapseEditor()
        },
      },
        h('div', { ref: canvasRef, className: 'todo-canvas', style: { minHeight: `${canvasHeight}px` }, onDoubleClick: canvasDoubleClick },
          ...renderTasks.slice().sort((left, right) => String(left.updatedAt || '').localeCompare(String(right.updatedAt || ''))).map((task) => h(NoteCard, {
            key: task.id,
            task: { ...task, hidden: !visibleIds.has(task.id) },
            t,
            canvasWidth,
            draggingEnabled: editingId === null,
            suppressed: editingId === task.id,
            removing: removingIds.includes(task.id),
            query: freeText,
            selected: selectedIds.includes(task.id),
            onToggleSelect: toggleSelect,
            onDropStatus: dropStatus,
            onOpen: () => { setClosing(false); setEditingId(task.id) },
            onContextMenu: (event) => openCtx(event, task.id, false),
            onMove: moveNote,
            onDragY: (y) => { pointerY.current = y },
            onDragStart: beginDragScroll,
            onDragEnd: endDragScroll,
          })),
          editing ? h(NoteEditor, {
            key: `editor-${editing.id}`,
            task: editing,
            t,
            canvasWidth,
            store,
            closing,
            query: freeText,
            initialTextMode: pendingTextEdit,
            onConsumeText: () => setPendingTextEdit(null),
            onContextMenu: (event) => openCtx(event, editing.id, true),
            onClose: collapseEditor,
            onExited: finishClose,
            onRemove: removeNote,
            onChanged: (message) => setNotice({ kind: 'ok', text: message }),
          }) : null,
          (snapshot.phase === 'ready' && byFilter.length === 0) || (snapshot.phase === 'ready' && tasks.length === 0)
            ? h('div', { className: 'todo-wallhint' },
              h('strong', null, tasks.length === 0 ? t('wallEmpty') : t('noMatch')),
              h('span', null, tasks.length === 0 ? t('wallEmptyHint') : t('noMatchHint')))
            : null,
          snapshot.phase === 'loading' ? h('div', { className: 'todo-wallhint' }, h('strong', null, t('loading'))) : null,
          snapshot.phase === 'error'
            ? h('div', { className: 'todo-wallhint' },
              h('strong', null, snapshot.error === 'AUTH' ? t('authError') : t('errorTitle')),
              h('button', {
                type: 'button',
                className: 'todo-btn ghost outline',
                style: { marginTop: '10px', pointerEvents: 'auto' },
                onClick: () => { void store.refresh() },
              }, t('retry')))
            : null))

      const statusbar = h('div', { className: 'todo-statusbar' },
        h('span', { className: 'todo-status-hint' }, t('wallHint')),
        h('span', { className: 'sep', 'aria-hidden': true }),
        h('span', { className: 'todo-status-hint' }, t('kbdHint')),
        h('span', { className: 'sep', 'aria-hidden': true }),
        h('span', { className: 'state' },
          `${tasks.length} · ${t('statusPlanned')} ${counts.planned} · ${t('statusActive')} ${counts.active} · ${t('statusDone')} ${counts.done} · ${t('statusCancelled')} ${counts.cancelled}`),
        h('span', { className: 'spacer' }),
        h('button', {
          type: 'button',
          className: 'todo-btn todo-toggle',
          'data-on': snapshot.config.llmTools === true ? 'true' : 'false',
          onClick: () => setSettingsOpen(true),
        }, h('span', { className: 'dot' }), snapshot.config.llmTools === true ? t('llmBadgeOn') : t('llmBadgeOff')))

      return h('div', { className: 'todo-root' },
        h('style', null, CSS),
        topbar,
        notice
          ? h('p', {
            className: notice.kind === 'error' ? 'todo-error' : 'todo-notice',
            role: notice.kind === 'error' ? 'alert' : 'status',
          }, notice.text, notice.undo
            ? h('button', { type: 'button', className: 'todo-mini', onClick: () => { void undoDelete(notice.undo) } }, t('undo'))
            : null)
          : null,
        selectedIds.length > 0 ? h(BulkBar, {
          t,
          store,
          ids: selectedIds,
          workspaces: snapshot.workspaces || [],
          onClear: () => setSelectedIds([]),
          onDone: (msg, err) => setNotice(err ? { kind: 'error', text: err } : { kind: 'ok', text: msg }),
        }) : null,
        view === 'list' ? h(ListView, {
          t,
          store,
          tasks: byFilter,
          selectedIds,
          onToggleSelect: toggleSelect,
          onToggleAll: toggleAll,
          onOpenEdit: openEditFromList,
          onRemove: removeNote,
          workspaces: snapshot.workspaces || [],
        }) : wall,
        statusbar,
        settingsOpen ? h(SettingsDialog, { t, store, onClose: () => setSettingsOpen(false) }) : null,
        trashOpen ? h(TrashDialog, { t, store, onClose: () => setTrashOpen(false) }) : null,
        ctxMenu ? h(ContextMenu, {
          menu: ctxMenu,
          task: tasks.find((item) => item.id === ctxMenu.taskId) || null,
          t,
          store,
          workspaces: snapshot.workspaces || [],
          onClose: () => setCtxMenu(null),
          onOpen: () => { const id = ctxMenu.taskId; setCtxMenu(null); setClosing(false); setEditingId(id) },
          onEditText: ctxEditText,
          onCollapse: () => { setCtxMenu(null); collapseEditor() },
          onDelete: (id) => { setCtxMenu(null); removeNote(id) },
        }) : null)
    }

    // ---------------------------------------------------------------- 入口按钮与右栏面板

    /** 会话标题栏右上图标排里的入口：点开右栏便签墙。 */
    function HeaderToggle(props) {
      const t = props.t || translator
      const snapshot = useSnapshot(WALL_STORE)
      const pending = snapshot.pending || 0
      const remindKey = JSON.stringify(snapshot.config.remind || {})
      const label = pending > 0 ? `${t('nav')} · ${t('pendingCount', { n: pending })}` : t('nav')
      const buttonRef = React.useRef(null)
      const bubbleRef = React.useRef(null)
      const hideTimerRef = React.useRef(null)
      const [bubble, setBubble] = React.useState(null)

      function showBubble(payload, ms) {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
        setBubble(payload)
        hideTimerRef.current = setTimeout(() => setBubble(null), ms)
      }
      function anchor() {
        const node = buttonRef.current
        if (!node) return null
        const rect = node.getBoundingClientRect()
        if (rect.width === 0) return null
        return { left: Math.max(rect.right, 240), top: rect.bottom + 4 }
      }

      // 启动 2s 后弹一次悬浮待办框：锚按钮下方、标签条右侧空白带，不遮对话区。
      React.useEffect(() => {
        let timer = null
        let tries = 0
        if (bootBubbleDone) return undefined
        const attempt = () => {
          const snap = WALL_STORE.getSnapshot()
          if (snap.phase !== 'ready' || !(snap.pending > 0)) {
            tries += 1
            if (tries < 4) timer = setTimeout(attempt, 1200)
            return
          }
          const pos = anchor()
          if (!pos) return
          bootBubbleDone = true
          showBubble({ kind: 'boot', n: snap.pending, ...pos }, 6000)
        }
        timer = setTimeout(attempt, 2000)
        return () => { clearTimeout(timer); if (hideTimerRef.current) clearTimeout(hideTimerRef.current) }
      }, [])

      // 到期提醒：只看待完成且设了 planEndAt 的卡；阈值/时长/复检间隔读 config.remind。
      React.useEffect(() => {
        let first = null
        let interval = null
        const check = () => {
          const snap = WALL_STORE.getSnapshot()
          if (snap.phase !== 'ready') return
          const cfg = { enabled: true, leadMinutes: 60, soonMin: 30, overdueMin: 10, reRemindHours: 1, checkMin: 5, ...(snap.config.remind || {}) }
          if (cfg.enabled === false) return
          if (bubbleRef.current) return // 不与启动气泡 / 已有提醒同屏
          const lead = Math.max(1, Number(cfg.leadMinutes) || 60) * 60000
          const reRemind = Math.max(1, Number(cfg.reRemindHours) || 1) * 3600000
          const now = Date.now()
          let soon = 0
          let overdue = 0
          const keys = []
          for (const task of snap.tasks) {
            if (!task.planEndAt) continue
            if (task.status !== 'planned' && task.status !== 'active') continue
            const end = new Date(task.planEndAt).getTime()
            if (Number.isNaN(end)) continue
            const delta = end - now
            if (delta <= 0) {
              const key = `${task.id}:overdue`
              const last = dueReminded.get(key)
              if (last === undefined || now - last >= reRemind) { overdue += 1; keys.push(key) }
            } else if (delta <= lead) {
              const key = `${task.id}:soon`
              const last = dueReminded.get(key)
              if (last === undefined || now - last >= reRemind) { soon += 1; keys.push(key) }
            }
          }
          if (soon === 0 && overdue === 0) return
          const pos = anchor()
          if (!pos) return
          for (const key of keys) dueReminded.set(key, now)
          const ms = overdue > 0
            ? Math.max(1, Number(cfg.overdueMin) || 10) * 60000
            : Math.max(1, Number(cfg.soonMin) || 30) * 60000
          showBubble({ kind: 'due', soon, overdue, ...pos }, ms)
        }
        const cfg0 = { checkMin: 5, ...((WALL_STORE.getSnapshot().config || {}).remind || {}) }
        first = setTimeout(check, 9000)
        interval = setInterval(check, Math.max(1, Number(cfg0.checkMin) || 5) * 60000)
        return () => { clearTimeout(first); clearInterval(interval) }
      }, [remindKey])

      React.useEffect(() => {
        if (!bubble) return undefined
        const onKey = (event) => { if (event.key === 'Escape') setBubble(null) }
        const onDown = (event) => {
          if (bubbleRef.current && bubbleRef.current.contains(event.target)) return
          if (buttonRef.current && buttonRef.current.contains(event.target)) return
          setBubble(null)
        }
        const onResize = () => {
          // 窗口变化只重新锚定，不关闭长显提醒。
          const pos = anchor()
          setBubble((cur) => {
            if (!cur) return cur
            if (!pos) return null
            return { ...cur, left: pos.left, top: pos.top }
          })
        }
        window.addEventListener('keydown', onKey)
        document.addEventListener('pointerdown', onDown, true)
        window.addEventListener('resize', onResize)
        return () => {
          window.removeEventListener('keydown', onKey)
          document.removeEventListener('pointerdown', onDown, true)
          window.removeEventListener('resize', onResize)
        }
      }, [bubble])

      function open() {
        setBubble(null)
        if (typeof props.open === 'function') props.open(props.sid)
      }

      const bubbleText = !bubble ? ''
        : bubble.kind === 'due'
          ? (bubble.overdue > 0 && bubble.soon > 0
            ? t('dueBoth', { o: bubble.overdue, s: bubble.soon })
            : bubble.overdue > 0
              ? t('dueOverdue', { n: bubble.overdue })
              : t('dueSoon', { n: bubble.soon }))
          : t('bubblePending', { n: bubble.n })

      const bubbleNode = bubble ? h('div', {
        ref: bubbleRef,
        className: 'todo-bubble' + (bubble.kind === 'due' && bubble.overdue > 0 ? ' overdue' : ''),
        role: 'status',
        style: { left: `${bubble.left}px`, top: `${bubble.top}px` },
      },
        h('span', { className: 'todo-bubble-arrow', 'aria-hidden': true }),
        h('span', null, bubbleText),
        h('button', { type: 'button', className: 'todo-bubble-view', onClick: open }, t('bubbleView'))) : null

      return h(React.Fragment, null,
        h('button', {
          ref: buttonRef,
          type: 'button',
          className: 'todo-headbtn',
          title: label,
          'aria-label': label,
          onClick: open,
        }, h(NoteIcon, { size: 16 }), h(PendingBadge, { wide: false })),
        bubbleNode && ReactDOM && typeof ReactDOM.createPortal === 'function'
          ? ReactDOM.createPortal(bubbleNode, document.body)
          : bubbleNode)
    }

    /** 右栏标签体：便签墙撑满右栏面板。 */
    function PaneBody() {
      return h('div', { className: 'todo-pane' }, h(WallPanel))
    }

    function PendingBadge({ wide = true }) {
      const t = translator
      const snapshot = useSnapshot(WALL_STORE)
      const pending = snapshot.pending || 0
      if (pending === 0) return null
      if (wide !== true) return h('span', { className: 'todo-pending-dot', 'aria-hidden': true })
      return h('span', { className: 'todo-pending', title: t('pendingCount', { n: pending }) }, String(pending))
    }

    /** 设置 → 通用里的一行：只有开关和说明，写入后立即生效。 */
    function GeneralSettingsRow() {
      const t = translator
      const store = WALL_STORE
      const snapshot = useSnapshot(store)
      const [busy, setBusy] = React.useState(false)
      const [notice, setNotice] = React.useState(null)
      const enabled = snapshot.config.llmTools === true

      React.useEffect(() => {
        if (!notice) return undefined
        const handle = setTimeout(() => setNotice(null), 3000)
        return () => clearTimeout(handle)
      }, [notice])

      async function toggle(next) {
        setBusy(true)
        const result = await store.setConfig({ llmTools: next })
        setBusy(false)
        setNotice(result.ok
          ? { kind: 'ok', text: t('configSaved') }
          : { kind: 'error', text: requestErrorText(t, result) })
      }

      return h('div', { className: 'todo-general-row' },
        h('style', null, CSS),
        h('div', { className: 'todo-general-copy' },
          h('div', { className: 'todo-general-title' }, t('llmTitle')),
          h('div', { className: 'todo-general-desc' }, t('llmHelp')),
          notice
            ? h('div', {
              className: notice.kind === 'error' ? 'todo-general-error' : 'todo-general-status',
              role: notice.kind === 'error' ? 'alert' : 'status',
            }, notice.text)
            : null),
        h('div', { className: 'todo-general-control' },
          h(Switch, { checked: enabled, onChange: toggle, disabled: busy, label: t('llmTitle') })))
    }

    // ---------------------------------------------------------------- 注册

    function apply(ctx) {
      let locale = null
      try {
        locale = ctx.locale || (typeof ctx.get === 'function' ? ctx.get('locale') : null)
      } catch {
        locale = null
      }

      let t = (key, params) => formatEntry(DICT.zh[key] === undefined ? key : DICT.zh[key], params)
      if (locale && typeof locale.register === 'function' && typeof locale.bind === 'function') {
        const register = () => locale.register(NS, { zh: DICT.zh, en: DICT.en })
        try {
          if (typeof ctx.effect === 'function') ctx.effect(register, 'todo-wall: dictionaries')
          else register()
          const bound = locale.bind(NS)
          if (typeof bound === 'function') {
            t = (key, params) => {
              try {
                const value = bound(key, params)
                const text = typeof value === 'string' && value !== ''
                  ? value
                  : (DICT.zh[key] === undefined ? key : DICT.zh[key])
                return formatEntry(text, params)
              } catch {
                return formatEntry(DICT.zh[key] === undefined ? key : DICT.zh[key], params)
              }
            }
          }
        } catch (error) {
          console.warn('[todo-wall] locale registration skipped', error)
        }
      }
      translator = t

      // 全局样式：入口按钮不依赖墙面板是否挂载。
      try { ctx.effect(() => ensureStyle(), 'todo-wall: global styles') } catch (error) { console.warn('[todo-wall] styles', error) }

      // 开墙快捷键：默认 Ctrl+Shift+T，被占则退让到备选绑定。
      if (typeof ctx.inject === 'function') {
        ctx.inject(['shortcuts'], (scope) => {
          const sc = scope.shortcuts
          if (!sc || typeof sc.register !== 'function') return
          scope.effect(() => {
            const prof = `${sc.runtime}:${sc.platform}`
            const free = (binding) => {
              try {
                const d = typeof sc.describeBinding === 'function' ? sc.describeBinding(binding) : null
                return !d || (!d.issue && !(d.conflicts || []).length)
              } catch { return false }
            }
            const cands = [
              { code: 'KeyT', modifiers: ['primary', 'shift'] },
              { code: 'KeyT', modifiers: ['primary', 'alt'] },
              { code: 'KeyW', modifiers: ['primary', 'shift'] },
            ]
            const binding = cands.find(free)
            let off = null
            try {
              off = sc.register({
                id: 'sticky-wall.open',
                label: () => t('nav'),
                aliases: ['sticky wall', 'todo wall', '便签墙'],
                defaults: binding ? { [prof]: binding } : {},
                regions: ['page', 'editable'],
                modals: [],
                resolve: () => { openRight(); return { status: 'handled' } },
              })
            } catch (error) {
              console.warn('[sticky-wall] shortcut register failed', error)
              return () => {}
            }
            return () => { if (typeof off === 'function') off() }
          }, 'sticky-wall: open shortcut')
        })
      }

      const slots = ctx.slots
      if (!slots || typeof slots.inject !== 'function' || typeof slots.register !== 'function') return

      // 入口按钮：右上会话标题栏图标排。
      slots.inject('conversation.session.header.utilities', () => slots.register({
        name: 'conversation.session.header.utilities',
        id: PANEL_ID,
        order: -5,
        locale: NS,
        inject: (sessionId) => ({ sid: sessionId, t, open: openRight }),
      }, HeaderToggle))

      slots.inject('settings.general.item', () => slots.register({
        name: 'settings.general.item',
        id: 'todo-wall-llm',
        order: 42,
      }, GeneralSettingsRow))

      // 右栏标签页：便签墙开在右侧栏，不盖住主对话区。服务缺失时只保留入口按钮以外的贡献。
      if (typeof ctx.inject === 'function') {
        ctx.inject(['sidebarRight', 'sidebarRightTabs'], (scope) => {
          const right = scope.sidebarRight
          const tabs = scope.sidebarRightTabs
          if (!right || !tabs || typeof tabs.register !== 'function' || typeof right.openTab !== 'function') return
          scope.effect(() => {
            openRight = () => {
              try { right.openTab(PANEL_ID) } catch (error) { console.warn('[todo-wall] open right pane', error) }
            }
            return () => { openRight = () => {} }
          }, 'todo-wall: right opener')
          scope.effect(() => tabs.register({
            id: PANEL_ID,
            kind: PANEL_ID,
            title: () => t('nav'),
            keepMounted: true,
            // 右栏「开始」引导列表里的一张卡片：点它打开便签墙标签。
            guide: [{
              id: 'open',
              order: 35,
              title: () => t('nav'),
              description: () => t('guideDesc'),
              icon: NoteIcon,
            }],
          }), 'todo-wall: right tab type')
          scope.effect(() => slots.inject('sidebar.right.pane.tab', () => slots.register({
            name: 'sidebar.right.pane.tab',
            key: PANEL_ID,
            locale: NS,
            inject: (sessionId) => ({ sid: sessionId, t }),
          }, PaneBody)), 'todo-wall: right tab body')
        })
      }
    }

    let openRight = () => {}
    let translator = (key, params) => formatEntry(DICT.zh[key] === undefined ? key : DICT.zh[key], params)

    return { inject: ['slots', 'locale'], apply }
  },
})
