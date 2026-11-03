# Working preferences

## Workflow
- Explore relevant code before proposing changes; use subagents for broad exploration.
- For features, fixes, and tickets, use the `implement-task` skill. It asks for the run mode itself.
- For any other non-trivial work, propose a short plan, then ask me for approval and the run mode before coding:
  - **Autonomous**: work through everything without stopping.
  - **Interactive**: stop after each step so I can review.
- Work in small, testable steps. Keep progress updates short and high-level.

## Code
- Follow the existing patterns and conventions in this codebase.
- Prefer the simplest solution that works. No speculative abstractions.
- Don't add new dependencies without asking.

## Testing
- Write or update tests for every change (at least unit tests), and run the full suite.
- If Brakeman is installed, it must report no unresolved warnings.
- Never claim something works without running it.

## Communication
- Be concise. Flag assumptions and open questions explicitly.
- If something is ambiguous, ask instead of guessing.

## Timeboxed sessions (only when I say so)
- Aim for a simple working version first, then improve.
- For each decision, give a one-line reason and the main trade-off.
- Keep `plan.md` (the same file `implement-task` uses) updated: goal, decisions, open questions, next steps.
- When I ask to wrap up, summarise what was built, trade-offs made, and what you'd do next.

## Hard rules
- Never commit secrets, `.env` files, or absolute home paths.
- Never deploy from an agent shell; deploys go through CI on merge to `main`.
- Never spend money autonomously. Draft, then wait for my approval.
- Commit locally as you see fit, with a clear message explaining why. Don't push unless I ask.
- Need credentials, server/DNS details, or anything that costs money? Use `notify-human` and stop.
