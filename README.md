# 🏢 agy-village — 2D Terminal Agent Office for Google Antigravity (`agy` CLI)

**`agy-village`** is a zero-dependency, real-time 2D Terminal Office Visualizer for **Google Antigravity (`agy` CLI & Desktop App)**. Run it in a split terminal pane right next to `agy` to watch your AI Orchestrator and Subagents wake up, code at horizontal 2D desks, physically walk down the corridor carrying documents to hand off tasks, and run back with bug reports during self-healing QA loops.

---

## ✨ Preview

```text
 🏢 ANTIGRAVITY 2D AGENT OFFICE  │  ● LIVE AGY CLI MONITOR (8bfb6c8c)  │  [D] Demo  [R] Replay  [Q] Quit
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                                              ┃
┃     ▪ Design & Icon        ▪ Orchestrator         ▪ L10n Agent          ▪ ☕ COFFEE & LOUNGE ┃
┃                             💬domain/ spe                 zZ                ~  ~             ┃
┃                              (•ᴗ•)و                 ( ˘▾˘ )             [☕]  ╭─────────╮    ┃
┃                [───]         ╭(   )🫱 [▅▃▇]         ╭( - )╮  [───]      ╤═══╤ │ SOFA 💤 │    ┃
┃     ╤═════════⌨═╩═══╤      ╤═════════⌨═╩═══╤      ╤═════════⌨═╩═══╤     ╨   ╨ ╰─────────╯    ┃
┃     ╨  └─┬─┘        ╨      ╨  └─┬─┘        ╨      ╨  └─┬─┘        ╨                          ┃
┃                                                                                              ┃
┃                                                                                              ┃
┃ ┄┄┄┄─►[AppIcons SVG]┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄◄─[P1 Overflow]┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ ┃
┃       ( •ᴗ• )                                     ( •_• )                                    ┃
┃       ╰(   )つ📄                                 🐛⊂(   )╯                                   ┃
┃         | |                                         | |                                      ┃
┃ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ ┃
┃                                                                                              ┃
┃      💬repo_impl.d          💬feature_pag                                        zZ          ┃
┃       ʕ•ᴥ•ʔ                  (=^･ω･)                                       (⌐■_■)            ┃
┃       ╭(   )🫱 [▅▃▇]         ╭(   )🫱 [▅▃▇]                  [───]         ╭( - )╮  [───]    ┃
┃     ╤═════════⌨═╩═══╤      ╤═════════⌨═╩═══╤      ╤═════════⌨═╩═══╤      ╤═════════⌨═╩═══╤   ┃
┃     ╨  └─┬─┘        ╨      ╨  └─┬─┘        ╨      ╨  └─┬─┘        ╨      ╨  └─┬─┘        ╨   ┃
┃     ▪ Data Worker          ▪ UI Worker            ▪ Test & UI QA         ▪ Code Reviewer     ┃
┃                                                                                              ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
 📜 Live Office Activity & Task Handoffs:
  [20:05:12] 🎨 Design & L10n finished! Walking down the hallway to deliver Icons & L10n to UI Worker!
  [20:05:12] 🚶 Orchestrator stands up & walks to Data Worker and UI Worker with Domain Spec!
  [20:05:12] 🎬 Phase 1: Orchestrator wakes up for /grill-me & locks Domain Contract
```

---

## 🎯 Features

- **2D Horizontal Workstations & Coffee Lounge**:
  - 7 specialized Agent desks (**Design & Icon**, **Orchestrator**, **L10n Agent**, **Data Worker**, **UI Worker**, **Test & UI QA**, **Code Reviewer**) plus a **☕ Coffee & Sofa Lounge**.
  - Monitors dynamically animate green code bars (`[▃▅▇]` ↔ `[▅▇▃]`) when an agent is actively running tools, and turn off (`[───]`) when idle or away from their desk.
- **Full-Body 3-Line Characters with Physical Pathfinding**:
  - When delegating a subagent (`invoke_subagent`), finishing a stream, or rejecting a build during QA/Review (`🐛 Fix Loop #1`), the agent **stands up from their chair** (leaving the desk empty!), steps onto the **Central Walking Corridor**, and walks step-by-step (`/ \` ↔ `| |`) carrying the document (`╰(   )つ📄` or `🐛⊂(   )╯`) to the colleague's desk.
  - Performs a face-to-face handoff (`🤝` / `📥 Got it!`) before walking back to their own desk.
- **Zero-Config Live `transcript.jsonl` Monitoring**:
  - Automatically attaches to your active Antigravity session in `~/.gemini/antigravity-cli/brain/` (and `~/.gemini/antigravity/brain/`) and tails both parent Orchestrator and spawned Subagent transcripts in real time.
  - Intelligently detects idle sessions (`isTranscriptCurrentlyIdle`) so agents rest peacefully (`zZ`) when no tools or background tasks are running.
- **Built-in Full Workflow Simulation (`[D]` / `--demo`)**:
  - Press **`D`** anytime to watch a full multi-agent choreography (Discovery ➔ Domain Contract ➔ Parallel Streams ➔ Reactive QA Rejection Loop ➔ Final 3-Axis Code Review Approval).

---

## 🚀 Installation & Usage

### Run directly with `npx`
```bash
npx github:huyxoann/agy-village
```

### Or install globally
```bash
git clone https://github.com/huyxoann/agy-village.git
cd agy-village
npm link
```

### Usage in a Split Terminal Pane
Open a split pane next to `agy` CLI (`Cmd + D` in iTerm2 / Ghostty / Warp, or a `tmux` split) with width ≥ 98 columns and run:

```bash
# Start in live monitoring mode (attaches to your active agy session)
agy-village

# Start directly in full workflow simulation mode
agy-village --demo
```

---

## ⌨️ Interactive Keybindings

| Key | Action |
| :--- | :--- |
| **`[D]`** | Toggle **Simulation Demo Mode** (watch the full multi-agent handoff & QA loop choreography) |
| **`[R]`** | **Replay** the current live session transcript from the beginning |
| **`[Q]`** / `Ctrl+C` | Quit cleanly |

---

## 📄 License

MIT © [huyxoann](https://github.com/huyxoann)
