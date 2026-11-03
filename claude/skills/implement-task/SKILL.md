---
name: implement-task
description: Use this skill when the user asks Claude to "implement", "build", "work on", or "finish" a task, feature, fix, or ticket. The task can be a GitHub issue (number or URL), an inline description, or a vague idea that needs research. Do not use when the user only wants to plan or discuss without building.
---

# Implement Task

Take a task from "the user wants this" to "it's done and tested". The only other skill this workflow uses is `grill-me`.

## Step 1 — Start exploring the project

As soon as the user says they want to work on a task, **before asking anything else**, launch a background subagent (Agent tool, `Explore` type, running in the background) to learn the project. If the user hasn't shared the task yet, ask "What's the task?" while the subagent runs. Ask it to return a concise summary, not file dumps:

- What the project is, and the technologies it uses
- How it is structured, and the conventions to follow
- How tests run (the real command), and whether Brakeman is installed
- If the task is already known: what exists that could help, what is missing, and whether the solution (or part of it) already exists

If the task only becomes known after the first subagent finishes, send it a follow-up (`SendMessage`) or launch a second one for the task-specific findings. The summaries land in this session's context, so everything after builds on them and the main session doesn't need to re-read the code.

**Trivial tasks:** if the change is tiny and fully specified (a typo, a copy tweak, a one-line fix), skip the subagent and the interview. Read only the affected file, write a one-line `plan.md`, confirm it with the user (Step 4), and carry on. When in doubt, treat the task as non-trivial.

## Step 2 — Understand the task

The task arrives in one of three forms:

- **GitHub issue** (`#123` or URL): read the description **and** all comments with `gh issue view <number> --comments`. Clarifications and scope changes often live in the thread. If the issue has several sub-tasks, plan all of them together.
- **Inline description**: use it as the starting point.
- **Vague or generic task** that needs research: treat it as the starting point and expect a longer interview.

Then invoke the `grill-me` skill to interview the user until you reach a shared understanding of the user-facing change, the acceptance criteria, and what is out of scope. Use the subagent's findings to ask better questions and to propose recommended answers. Never ask the user something the exploration already answered. For a clear, well-specified issue the interview can be short, but still confirm anything unclear, contradictory, or risky (data loss, production state) instead of assuming.

## Step 3 — Write `plan.md`

Combine the interview and the code exploration into a `plan.md` file **at the root of the project**. If a `plan.md` already exists, read it: if it is for this same task, update it; if it is for a different task, ask the user before overwriting. Contents:

- Summary of what was agreed
- What exists vs. what needs to be created
- Task breakdown with file paths
- Test plan (which unit tests will be added)
- Open questions deliberately deferred

## Step 4 — Get approval and pick a mode

Show the user the plan and ask two things in the same message:

1. Do they agree with the plan, or want changes? Update `plan.md` until they approve.
2. Which mode should execution run in?
   - **Autonomous**: implement the whole plan without stopping, then verify and report.
   - **Interactive**: stop after each step of the plan so the user can review before continuing.

**Do not write any code before approval.**

## Step 5 — Execute

Implement the plan in the chosen mode. Keep the user informed with short, high-level updates: what you are working on now and why, a line or two at a time. Not a play-by-play of every command.

- **Autonomous**: work through every step, then continue to Step 6.
- **Interactive**: after each step, summarise what was done and wait for the user to say continue. Steps 6–8 run after the last step.

Keep scope tight. Do only what the plan says, and mention unrelated observations at the end instead of fixing them.

## Step 6 — Verify

When you think the work is done:

1. **Tests exist**: new or changed behavior has at least unit tests. Add them if missing.
2. **Tests pass**: find the project's real test command (e.g. `package.json` scripts, `bin/rails test`, `.github/workflows/`) and run the **whole** suite. If anything fails, fix it and re-run until green.
3. **Brakeman**: if Brakeman is installed (`bin/brakeman` or the gem in the `Gemfile`), run `bin/brakeman --no-pager` and fix every warning (none may stay unresolved). Only for a confirmed false positive, add an entry to `config/brakeman.ignore` with a `note` explaining why it is safe. If Brakeman is not installed, skip this.

## Step 7 — Code review

Invoke the `/code-review` skill on the changes. This is mandatory, even when the diff is small and everything is green: linters and tests don't catch logic bugs, cross-file breakage, or security concerns. Treat the output as a real reviewer's notes and apply the feedback. If a point seems wrong or out of scope, say so explicitly instead of silently ignoring it. If you changed code, re-run the full test suite (and Brakeman if installed) from Step 6.

## Step 8 — Report

Tell the user the task is done, concisely:

- What changed
- What was verified (tests added, suite result, Brakeman result or "not installed")
- **How to test it** by hand: the concrete steps to see the change working
- Any follow-ups, or an explicit "nothing left to do"

Commit the work locally with a clear message that explains why the change was made. Do not push or deploy unless the user asks.
