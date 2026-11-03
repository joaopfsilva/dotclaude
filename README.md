# dotclaude

Personal Claude setup: my working preferences and custom skills for Claude Code.

## What's inside

- `dotclaude/CLAUDE.md`: how I like Claude to work (plan first, small steps, tested changes)
- `dotclaude/skills/grill-me/`: a skill where Claude questions me about requirements before building
- `prompts/fallback-prompts.md`: paste-in versions for setups where I can't install anything

## Install

```bash
git clone https://github.com/joaopfsilva/dotclaude.git
mkdir -p ~/.claude/skills
cp -r dotclaude/dotclaude/skills/* ~/.claude/skills/
```

Then merge the lines from `dotclaude/CLAUDE.md` into the project's existing CLAUDE.md, rather than overwriting it.
