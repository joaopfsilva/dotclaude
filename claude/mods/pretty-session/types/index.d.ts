export type PrettySessionShown = boolean

declare module 'claude-code' {
  interface PluginState {
    'pretty-session': { isShown: StateFamily<PrettySessionShown>; isShownAll: PrettySessionShown }
  }
}
