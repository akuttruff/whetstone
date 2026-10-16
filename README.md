# Whetstone

Interview practice for senior software engineers, reviewed by a local model.
Five tracks (coding, practical TypeScript, system design, knowledge questions,
behavioral), a primer per topic distilling the techniques before you start, a
live TypeScript editor with sandboxed tests, streaming model feedback with an
optional auto mode, a hint ladder when you are stuck, and a steerable easier/similar/harder variant
generation on the same pattern. Mobile-first (iPhone 13 mini), with a split view on desktop.

Same stack as cairn and lm-chat: Vite 8 + React 19 + TypeScript 7, a Vite
plugin server (`server/api.ts`) with SQLite (`node:sqlite`), Vitest, oxlint.
The model is any OpenAI-compatible server; by default oMLX on `:8000` with
`Qwen3.8-27B-MLX-8bit`.

## Run

```bash
npm install
npm run dev        # http://localhost:8300, scratch database in .data-dev/
npm run check      # typecheck + lint + tests
npm run deploy     # build and restart the persistent instance on :8310
```

The persistent instance is a launchd job (`com.amie.whetstone`, plist in
`scripts/`) that runs `vite preview` on :8310. To reach it from a phone, put it
behind Tailscale Serve (`tailscale serve --bg --https=8444 http://127.0.0.1:8310`)
and open `https://<your-machine>.<your-tailnet>.ts.net:8444`. Its data lives in
`.data/`.

Install the launch agent once. Edit the three paths in the plist first (the
`npm` binary, this checkout, and the log file), then:

```bash
cp scripts/com.amie.whetstone.plist ~/Library/LaunchAgents/
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.amie.whetstone.plist
/Applications/Tailscale.app/Contents/MacOS/Tailscale serve --bg --https=8444 http://127.0.0.1:8310
```

## How it works

- **Content** is plain data in `src/data/*.ts`. Every problem has a `topic`
  (list grouping), a `pattern` (the skill it exercises; variants keep it), a
  difficulty, and track-specific fields. Code problems carry `tests`: each is a
  `call` expression evaluated with the solution's exports in scope and an
  `expected` JSON value. `server/content.test.ts` runs every reference
  solution through the real sandbox, so content cannot drift.
- **Run** (`POST /api/run`) writes the draft to a scratch directory and runs
  it in a child Node process with Node's native TypeScript support
  (`--experimental-transform-types`), a per-test and overall timeout, and
  captured console output. It is a convenience, not a security boundary.
- **Review** (`POST /api/review`) streams the model's review as server-sent
  events. The prompt is per track (code with test results, design notes against
  talking points, STAR for behavioral) and ends with a `VERDICT` line carrying a
  0-10 score, correctness and a focus phrase. Reviews are saved and aggregated
  per pattern into the progress shown on the list screen.
- **Auto review** debounces N seconds after the last edit (Settings), skips
  unchanged or starter text, and queues one more review if you keep typing
  during one.
- **Primers** (`src/data/primers-*.ts`) are one per topic in every track: how
  to recognise the problem type, each technique with when/how/complexity and a
  TypeScript template, pitfalls, and what to say out loud. They open from the
  topic header on the list and from a link at the top of every problem. A test
  checks that every topic has one.
- **Guide** (`POST /api/guides/:id`) writes a hint ladder for the current
  draft: five to seven rungs from the gentlest nudge to a full plan, each with
  one thing to try, never the code. Rungs are revealed one at a time and the
  position is saved server-side; "Rewrite for my draft" makes a new ladder
  from where you are now.
- **Ask about it** (`POST /api/chat/:id`) is a conversation thread, streamed
  like a review and saved per problem. Under a review the model has the
  problem, your current code, test results and its latest review, and it may
  show code snippets ("what would the syntax look like?"). On a primer the
  thread id is `primer:<track>:<topic>` and the model tutors from the primer's
  content. The last 12 turns ride along with each question.
- **Variants** (`POST /api/variants`) ask the model for an easier, similar or
  harder problem on the same pattern using a JSON schema. The "New problem"
  button on a problem opens a sheet: an optional free-text steer (for example
  "keep practising hash lookups but focus on counting") and then the level.
  "Similar" keeps the difficulty and the core technique but changes the
  scenario, so you can drill one pattern by repetition. The steer rides along
  in the prompt (max 600 characters) and is saved on the generated problem,
  which shows it under its statement. The request also lists the titles
  already on that pattern (built-in and generated) so repeated drills stay
  distinct. For code, the model's own
  solution is run against the tests it wrote; failing tests are dropped and the
  result says how many were verified. Variants are stored in SQLite under
  their parent.
- **Drafts** and settings live server-side, so the phone and the desktop share
  them.

## Layout

```
server/   api.ts (routes), store.ts (SQLite), llm.ts (chat client),
          prompts.ts (review + variant prompts, validation), runner.ts (sandbox)
src/      App.tsx, components/, hooks/, lib/api.ts, data/ (content), types.ts
scripts/  deploy.sh, com.amie.whetstone.plist
```
