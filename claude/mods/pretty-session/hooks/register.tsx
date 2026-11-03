import { atom, memberOf, read, update } from 'claude-code'
import type { ElementTable, Register, RenderInput, StateDollar } from 'claude-code'

const DEFAULT_COLUMNS = 80
const SUMMARY_LIMIT = 100
const GROUP_ROW_LIMIT = 12
const COMMAND = 'tools'
const isShown = atom({ plugin: 'pretty-session', key: 'isShown' } as const, false)
const isShownAll = atom({ plugin: 'pretty-session', key: 'isShownAll' } as const, false)

export const register: Register = on => {
  on('ui.render', { component: 'UserMessage' }, ($, e, next) => {
    if (e.props.origin.kind !== 'composer') return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const columns = e.viewport?.columns ?? DEFAULT_COLUMNS

    return (
      <Box width="100%" flexDirection="row" justifyContent="flex-end">
        <Box
          key="bubble"
          flexDirection="column"
          width={bubbleWidth(e.props.text, columns)}
          borderStyle="round"
          borderColor="success"
          paddingX={1}
        >
          <Text bold color="success">
            You
          </Text>
          <Text>{e.props.text}</Text>
        </Box>
      </Box>
    )
  })

  // No border on Claude's card: a bordered box puts a bar at both ends of every
  // line, so code copied from the terminal carries them. A rule above the label
  // keeps replies visually separated instead.
  on('ui.render', { component: 'AssistantMessage' }, ($, e) => {
    const { Box, Markdown, Text } = $.ui.resolve(e)
    const columns = e.viewport?.columns ?? DEFAULT_COLUMNS
    const isSummary = e.props.isSummary === true
    const width = bubbleWidth(e.props.text, columns)

    return (
      <Box width="100%" flexDirection="row" justifyContent="flex-start">
        <Box key="bubble" flexDirection="column" width={width}>
          {e.props.isFirstOfReply && (
            <Box flexDirection="column">
              <Text dimColor>{'─'.repeat(width)}</Text>
              <Text bold color="claude">
                Claude
              </Text>
            </Box>
          )}
          <Markdown text={e.props.text} dimColor={isSummary} />
        </Box>
      </Box>
    )
  })

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: COMMAND,
      description: 'Show or hide the tool calls Claude makes',
    })
    return next(e)
  })

  on('command.run', { command: COMMAND }, async $ => {
    const isShownNow = await update($, isShownAll, shown => !shown)
    return { text: isShownNow ? 'Tool calls are shown.' : 'Tool calls are hidden.' }
  })

  on('ui.render', { component: 'ToolUse' }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const columns = e.viewport?.columns ?? DEFAULT_COLUMNS
    const { glyph, color } = statusOf(e.props)
    const isRevealed = (await read($, isShownAll)) || (await read($, memberOf(isShown, e)))

    if (!isRevealed) {
      return (
        <Box paddingLeft={2} flexDirection="row" gap={1}>
          <Text color={color}>{glyph}</Text>
          <Text dimColor>{e.props.tool}</Text>
          {revealControl($, e, Button, Text)}
        </Box>
      )
    }

    return (
      <Box paddingLeft={2} flexDirection="row" gap={1}>
        <Text color={color}>{glyph}</Text>
        <Text bold>{e.props.tool}</Text>
        <Text dimColor wrap="truncate-end">
          {summarise(e.props.input, columns - e.props.tool.length - 6)}
        </Text>
      </Box>
    )
  })

  on('ui.render', { component: 'ToolResult' }, async ($, e, next) => {
    const isRevealed = (await read($, isShownAll)) || (await read($, memberOf(isShown, e)))
    if (isRevealed) return next(e)

    const { Box } = $.ui.resolve(e)
    return <Box />
  })

  on('ui.render', { component: 'ToolGroup' }, async ($, e, next) => {
    if (e.props.isExpanded) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    const columns = e.viewport?.columns ?? DEFAULT_COLUMNS
    const isRevealed = (await read($, isShownAll)) || (await read($, memberOf(isShown, e)))
    const running = e.props.calls.filter(call => call.isRunning).length
    const failed = e.props.calls.filter(call => call.isErrored).length

    if (!isRevealed) {
      const count = e.props.calls.length
      const state = running > 0 ? 'running' : failed > 0 ? `${failed} failed` : 'done'
      return (
        <Box paddingLeft={2} flexDirection="row" gap={1}>
          <Text color={running > 0 ? 'warning' : failed > 0 ? 'error' : 'success'}>⚙</Text>
          <Text dimColor>
            {count} tool {count === 1 ? 'call' : 'calls'} · {state}
          </Text>
          {revealControl($, e, Button, Text)}
        </Box>
      )
    }

    const shown = e.props.calls.slice(0, GROUP_ROW_LIMIT)
    const hidden = e.props.calls.length - shown.length

    return (
      <Box paddingLeft={2} flexDirection="column">
        {shown.map(call => {
          const { glyph, color } = statusOf(call)
          return (
            <Box flexDirection="row" gap={1}>
              <Text color={color}>{glyph}</Text>
              <Text bold>{call.tool}</Text>
              <Text dimColor wrap="truncate-end">
                {summarise(call.input, columns - call.tool.length - 6)}
              </Text>
            </Box>
          )
        })}
        {hidden > 0 && <Text dimColor>… {hidden} more</Text>}
      </Box>
    )
  })

  on('ui.render', { component: 'TurnDuration' }, ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const columns = e.viewport?.columns ?? DEFAULT_COLUMNS
    const label = ` ${e.props.word} for ${formatDuration(e.props.durationMs)} `
    const side = '─'.repeat(Math.max(2, Math.floor((columns - label.length) / 2) - 1))

    return (
      <Box width="100%" justifyContent="center">
        <Text dimColor>
          {side}
          {label}
          {side}
        </Text>
      </Box>
    )
  })
}

function revealControl(
  $: StateDollar,
  e: RenderInput,
  Button: ElementTable['Button'],
  Text: ElementTable['Text'],
) {
  if (e.viewport?.isFullscreen !== true) return <Text dimColor>· /tools shows</Text>

  return (
    <Button key="show" plain dimColor onPress={() => update($, memberOf(isShown, e), () => true)}>
      · show
    </Button>
  )
}

const BUBBLE_SHARE = 0.75
const BUBBLE_FRAME = 4
const BUBBLE_MIN = 12

const WIDE_BLOCK = /^\s*(\||```)/m

function bubbleWidth(text: string, columns: number): number {
  const fullWidth = columns - 2
  if (WIDE_BLOCK.test(text)) return fullWidth

  const cap = Math.min(fullWidth, Math.max(BUBBLE_MIN, Math.floor(columns * BUBBLE_SHARE)))
  const longestLine = Math.max(...text.split('\n').map(line => line.length), 0)
  return Math.max(BUBBLE_MIN, Math.min(cap, longestLine + BUBBLE_FRAME))
}

type CallStatus = { isRunning: boolean; isErrored: boolean; isInterrupted: boolean }

function statusOf(call: CallStatus): { glyph: string; color: string } {
  if (call.isRunning) return { glyph: '◐', color: 'warning' }
  if (call.isInterrupted) return { glyph: '◌', color: 'warning' }
  if (call.isErrored) return { glyph: '✖', color: 'error' }
  return { glyph: '●', color: 'success' }
}

function summarise(input: unknown, room: number): string {
  const limit = Math.max(10, Math.min(SUMMARY_LIMIT, room))
  const text = leadingField(input)
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text
}

function leadingField(input: unknown): string {
  if (typeof input !== 'object' || input === null) return ''
  const fields = input as Record<string, unknown>
  const leading = ['command', 'file_path', 'pattern', 'query', 'description', 'skill', 'url', 'prompt']
  for (const key of leading) {
    const value = fields[key]
    if (typeof value === 'string' && value !== '') return value.split('\n')[0] ?? ''
  }
  return JSON.stringify(fields)
}

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}
