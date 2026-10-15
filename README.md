# Interview Prep

A local web app for studying for coding interviews. TypeScript problem set with an
in-browser code editor, plus system design prompts with structured talking-point
outlines. Optionally connects to a model hosted locally in LM Studio for real-time
code feedback and adaptive practice generation.

## Quick start

Requires Node 24 (asdf-managed; the project pins `24.21.0` in `.tool-versions`).

```bash
npm install
npm run dev
```

Open http://localhost:5173

Build for production:

```bash
npm run build
```

## What's inside

- **Algorithms & Data Structures** — 16 TypeScript problems across 11 topics
  (hashing, two pointers, stacks, sliding window, sorting, linked lists, binary
  search, DP, graphs/trees, backtracking, heaps). Each has a full statement,
  examples, hints, a model solution (spoiler-collapsible), and a starter file.
- **System Design** — 6 classic prompts (URL shortener, rate limiter, KV store,
  real-time chat, news feed, web crawler), each with functional/non-functional
  requirements, structured talking points, and follow-ups to expect.
- **AI feedback** — when connected to LM Studio, each problem gets a feedback
  panel: review your code on demand or turn on *auto* to get a review ~5s after
  you stop typing. Every review scores your attempt (0–10) and tags the weakest
  area; scores build a per-topic profile.
- **Generated practice** — "Generate practice" in the sidebar uses your
  strengths/weaknesses profile to have the model author new problems (3 per
  click). Weak topics get more problems; strong topics get harder ones.
  Generated problems are validated and saved locally.
- **Too hard?** — a button under each problem title asks the model for an
  easier variant of the same topic (smaller constraints, fewer edge cases,
  single core idea) and opens it; it's saved in Generated practice.

## LM Studio setup

1. In LM Studio, start the local server (Developer tab → Start Server, default
   port **1234**) with your model loaded.
2. Copy the **API token** (Developer tab → "API token"). LM Studio requires one
   for every request.
3. In this app, click the **⚙ gear** in the sidebar footer, paste the token, and
   hit **Test connection**. Your loaded models are listed — pick the id of the
   Qwen model you want (e.g. `qwen3-8b-...`) and **Save**.

Everything runs on this machine — requests go to `localhost:1234` only.

> **Dev-only proxy:** the app reaches LM Studio through a small Vite middleware
> proxy (`/api/lmstudio/*` → `localhost:1234`) that exists only in `npm run dev`
> (it sidesteps CORS). A production build won't have the proxy. To point at a
> different LM Studio instance, set `LMSTUDIO_HOST` / `LMSTUDIO_PORT` env vars
> when starting the dev server (defaults `localhost` / `1234`).

### How the adaptive loop works

- Each AI review returns a 0–10 score; it's recorded against the problem's topic
  (`profile:topics`).
- A topic counts as **weak** at an average score below 6 and **strong** at 8 or
  above.
- "Generate practice" prompts the model to prioritize your weak topics and step
  up the difficulty on strong ones, producing 3 problems in the same shape as
  the built-in set (statement, examples, hints, starter, model solution).
  Problems land in the **Generated practice** section and stay across restarts.

## Project structure

```
src/
  data/
    types.ts      # AlgoProblem & DesignProblem interfaces
    problems.ts   # algorithm problem content (append here to add problems)
    designs.ts    # system design prompt content
  components/
    Sidebar.tsx   # topic-grouped navigation + generated practice + settings gear
    ProblemView.tsx  # statement + CodeMirror editor + feedback panel
    FeedbackPanel.tsx  # AI review (manual + auto) wired to the model
    SettingsModal.tsx  # LM Studio token / model / auto-feedback settings
    DesignView.tsx   # design prompt + talking points + notes
  lib/
    settings.ts   # localStorage-backed LM Studio settings
    lmstudio.ts   # fetch client for the /api/lmstudio proxy (chat, models, JSON)
    profile.ts    # per-topic score tracking (weak/strong summarizer)
    customProblems.ts  # persistence + validation of generated problems
    prompts.ts    # the feedback + generation system/user prompts
  App.tsx
  main.tsx
  styles.css
vite.config.ts    # react plugin + dev-only LM Studio proxy middleware
```

To add a problem, append an object to the relevant array in `src/data/` matching
the interface in `types.ts`. Content is plain data — no schema migration needed.

## Notes

- Everything persists to `localStorage` only (nothing leaves your browser):
  drafts (`draft:<id>`), design notes (`notes:<id>`), LM settings
  (`lm:settings`), the skills profile (`profile:topics`), and generated problems
  (`problems:generated`). Clearing site data clears them.
- The code editor autosaves every keystroke locally; **Download .ts** exports
  your current draft as a standalone file.
- Auto-feedback is off by default (toggle in the feedback panel or settings);
  it skips unchanged starter code and debounces ~5s after the last keystroke.
