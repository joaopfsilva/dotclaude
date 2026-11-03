import { expect, test } from 'claude-code/testing'

const SURFACES = ['terminal', 'desktop'] as const
const PLUGIN = 'pretty-session'
const VIEWPORT = { columns: 100, rows: 40, isFullscreen: false }

test('a typed prompt draws as a labelled bubble', async $ => {
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({
      plugin: PLUGIN,
      surface,
      component: 'UserMessage',
      props: { text: 'Fix the login bug', origin: { kind: 'composer' }, isExpanded: true },
      viewport: VIEWPORT,
    })
    expect(await ui.find({ type: 'Text', text: 'You' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'Fix the login bug' })).toBeDefined()
    await ui.unmount()
  }
})

test('the first block of a reply carries the Claude label, later blocks do not', async $ => {
  for (const surface of SURFACES) {
    const first = await $.ui.mount({
      plugin: PLUGIN,
      surface,
      component: 'AssistantMessage',
      props: { text: 'Done, see `app/login.rb`.', isFirstOfReply: true },
      viewport: VIEWPORT,
    })
    expect(await first.find({ type: 'Text', text: /Claude/ })).toBeDefined()
    expect(await first.find({ type: 'Markdown', text: /login\.rb/ })).toBeDefined()
    await first.unmount()

    const later = await $.ui.mount({
      plugin: PLUGIN,
      surface,
      component: 'AssistantMessage',
      props: { text: 'Now the tests.', isFirstOfReply: false },
      viewport: VIEWPORT,
    })
    expect(await later.find({ type: 'Text', text: /Claude/ })).toBeUndefined()
    await later.unmount()
  }
})

test('a reply holding a table takes the full width, plain text keeps to three quarters', async $ => {
  const table = '| File | Purpose |\n|---|---|\n| hooks/register.tsx | the hooks |'
  const wide = await $.ui.mount({
    plugin: PLUGIN,
    surface: 'terminal',
    component: 'AssistantMessage',
    props: { text: table, isFirstOfReply: true },
    viewport: VIEWPORT,
  })
  const wideBubble = await wide.find({ type: 'Box', key: 'bubble' })
  expect(wideBubble?.props.width).toBe(98)
  await wide.unmount()

  const plain = await $.ui.mount({
    plugin: PLUGIN,
    surface: 'terminal',
    component: 'AssistantMessage',
    props: { text: 'x'.repeat(200), isFirstOfReply: true },
    viewport: VIEWPORT,
  })
  const plainBubble = await plain.find({ type: 'Box', key: 'bubble' })
  expect(plainBubble?.props.width).toBe(75)
  await plain.unmount()
})

const TOOL_USE = {
  tool_use_id: 't1',
  tool: 'Bash',
  input: { command: 'git status' },
  isRunning: false,
  isErrored: false,
  isInterrupted: false,
  output: { stdout: 'clean', stderr: '' },
} as const

test('a tool call is hidden by default and shows its command after the show button', async $ => {
  const ui = await $.ui.mount({
    plugin: PLUGIN,
    surface: 'terminal',
    component: 'ToolUse',
    props: TOOL_USE,
    requestId: 't1',
    viewport: { ...VIEWPORT, isFullscreen: true },
  })
  expect(await ui.find({ type: 'Text', text: 'Bash' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'git status' })).toBeUndefined()
  expect(await ui.find({ type: 'Button', key: 'show' })).toBeDefined()

  await ui.press({ key: 'show' })
  expect(await ui.find({ type: 'Text', text: 'git status' })).toBeDefined()
  await ui.unmount()
})

test('outside fullscreen a hidden tool call points at /tools instead of a button', async $ => {
  const ui = await $.ui.mount({
    plugin: PLUGIN,
    surface: 'terminal',
    component: 'ToolUse',
    props: TOOL_USE,
    requestId: 't2',
    viewport: VIEWPORT,
  })
  expect(await ui.find({ type: 'Button', key: 'show' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /\/tools/ })).toBeDefined()
  await ui.unmount()
})

test('a folded tool group draws one count line until revealed', async $ => {
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({
      plugin: PLUGIN,
      surface,
      component: 'ToolGroup',
      requestId: `group-${surface}`,
      props: {
        isActive: false,
        isExpanded: false,
        calls: [
          { tool: 'Read', input: { file_path: 'app/models/matter.rb' }, isRunning: false, isErrored: false, isInterrupted: false },
          { tool: 'Grep', input: { pattern: 'approve' }, isRunning: true, isErrored: false, isInterrupted: false },
        ],
      },
      viewport: { ...VIEWPORT, isFullscreen: true },
    })
    expect(await ui.find({ type: 'Text', text: /2 tool calls/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'app/models/matter.rb' })).toBeUndefined()

    await ui.press({ key: 'show' })
    expect(await ui.find({ type: 'Text', text: 'app/models/matter.rb' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '◐' })).toBeDefined()
    await ui.unmount()
  }
})
