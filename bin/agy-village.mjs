#!/usr/bin/env node
/**
 * agy-village — 2D Horizontal Office Simulation for Google Antigravity (agy CLI)
 *
 * Features:
 * - Real 2D horizontal desks with glowing monitors, keyboards, chairs & coffee lounge.
 * - Full-body 3-line characters (Head + Torso/Arms + Animated Walking Legs).
 * - Agents physically stand up from their desks, walk along the central corridor
 *   carrying documents (📄 / 🐛 / 🏆), hand them face-to-face to colleagues, and
 *   walk back to their desks (or stroll to the Coffee Lounge when idle!).
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import readline from "node:readline";

// ─── ANSI & TrueColor Palette ────────────────────────────────────────────────
const ESC = "\x1b[";
const RESET = `${ESC}0m`;
const BOLD = `${ESC}1m`;
const DIM = `${ESC}2m`;

const FG = {
  black: `${ESC}30m`,
  red: `${ESC}38;5;203m`,
  green: `${ESC}38;5;84m`,
  yellow: `${ESC}38;5;221m`,
  blue: `${ESC}38;5;75m`,
  magenta: `${ESC}38;5;213m`,
  cyan: `${ESC}38;5;87m`,
  white: `${ESC}38;5;255m`,
  gray: `${ESC}38;5;242m`,
  darkGray: `${ESC}38;5;237m`,
  orange: `${ESC}38;5;215m`,
  pink: `${ESC}38;5;218m`,
  mint: `${ESC}38;5;121m`,
  wood: `${ESC}38;5;137m`,
  carpet: `${ESC}38;5;239m`,
  coffee: `${ESC}38;5;180m`,
};

const WIDE_CODEPOINTS = new Set([
  0x2615, // ☕
  0x26a1, // ⚡
  0x2705, // ✅
  0x2728, // ✨
  0x274c, // ❌
  0x23ea, // ⏪
  0x2753, // ❓
]);

function charWidth(cp) {
  if (
    cp === 0x200d ||
    (cp >= 0xfe00 && cp <= 0xfe0f) ||
    (cp >= 0x0300 && cp <= 0x036f)
  ) {
    return 0;
  }
  if (
    WIDE_CODEPOINTS.has(cp) ||
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2e80 && cp <= 0x9fff) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xff01 && cp <= 0xff60) ||
    (cp >= 0x1f000 && cp <= 0x1faff)
  ) {
    return 2;
  }
  return 1;
}

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

function visualWidth(str) {
  const clean = stripAnsi(str);
  let w = 0;
  for (const ch of clean) {
    w += charWidth(ch.codePointAt(0));
  }
  return w;
}

function padEndVisual(str, targetWidth) {
  const w = visualWidth(str);
  if (w >= targetWidth) return str;
  return str + " ".repeat(targetWidth - w);
}

// ─── 2D Office Layout Constants ──────────────────────────────────────────────
const MAP_W = 96;
const MAP_H = 24;
const CORRIDOR_Y = 11; // Central horizontal walking boulevard (head Y when walking)
const LOUNGE_POS = { x: 78, y: 4 }; // Coffee & Sofa Lounge on Top-Right

/**
 * 7 Agents on a 2-Row Horizontal Open-Plan Office:
 * Top Row (y = 4):    [Design & Icons (x=8)]   [Orchestrator PM (x=31)]   [L10n Translator (x=54)]   [☕ Coffee Lounge (x=76)]
 * Corridor (y = 11):  ═══════════════════════ Horizontal Walking Hallway ════════════════════════════════════════════════════
 * Bottom Row (y = 17): [Data Worker (x=8)]     [UI Worker (x=31)]         [Test & UI QA (x=54)]      [Code Reviewer (x=76)]
 */
const AGENT_DEFS = [
  {
    id: "design",
    name: "Design & Icon",
    roleTag: "FIGMA/SVG",
    deskX: 6,
    deskY: 4,
    row: "top",
    color: FG.pink,
    headIdle: "( ˘ω˘ )",
    headWork: "(ﾉ◕ヮ◕)",
    headWalk: "( •ᴗ• )",
    headDone: "( ˆᗜˆ )",
  },
  {
    id: "orchestrator",
    name: "Orchestrator",
    roleTag: "LEAD PM",
    deskX: 29,
    deskY: 4,
    row: "top",
    color: FG.cyan,
    headIdle: "( -_- )",
    headWork: "(•̀ᴗ•́)و",
    headWalk: "(•̀ᴗ•́ )",
    headDone: "( ˆᴗˆ )",
  },
  {
    id: "l10n",
    name: "L10n Agent",
    roleTag: "ARB/I18N",
    deskX: 52,
    deskY: 4,
    row: "top",
    color: FG.mint,
    headIdle: "( ˘▾˘ )",
    headWork: "(•̀o•́ )",
    headWalk: "( ˘▾˘ )",
    headDone: "( ˆ▾ˆ )",
  },
  {
    id: "data",
    name: "Data Worker",
    roleTag: "DTO/REPO",
    deskX: 6,
    deskY: 17,
    row: "bottom",
    color: FG.blue,
    headIdle: "ʕ -ᴥ- ʔ",
    headWork: "ʕ•̀ᴥ•́ʔ",
    headWalk: "ʕ •ᴥ• ʔ",
    headDone: "ʕ ˆᴥˆ ʔ",
  },
  {
    id: "ui",
    name: "UI Worker",
    roleTag: "CUBIT/UI",
    deskX: 29,
    deskY: 17,
    row: "bottom",
    color: FG.magenta,
    headIdle: "(=‐ω‐=)",
    headWork: "(=^･ω･)",
    headWalk: "(=･ω･=)",
    headDone: "(=^ᴗ^=)",
  },
  {
    id: "qa",
    name: "Test & UI QA",
    roleTag: "QA/TEST",
    deskX: 52,
    deskY: 17,
    row: "bottom",
    color: FG.yellow,
    headIdle: "( ｰ֊ｰ )",
    headWork: "(🔍•_•)",
    headWalk: "( •_• )",
    headDone: "(•̀ᴗ•́)b",
  },
  {
    id: "reviewer",
    name: "Code Reviewer",
    roleTag: "3-AXIS",
    deskX: 75,
    deskY: 17,
    row: "bottom",
    color: FG.orange,
    headIdle: "(⌐■_■)",
    headWork: "(🧐■_■)",
    headWalk: "(⌐■_■)",
    headDone: "(⌐■ᴗ■)",
  },
];

const AGENTS = {};
for (const def of AGENT_DEFS) {
  AGENTS[def.id] = {
    ...def,
    // Current physical position of the character (top-left of character sprite)
    x: def.deskX + 2,
    y: def.deskY,
    facing: "right", // "left" | "right"
    // State machine:
    // "idle_desk" | "walking_lounge" | "idle_lounge" | "walking_desk" |
    // "working" | "walking_handoff" | "handing_off" | "walking_home" | "done"
    state: "idle_desk",
    task: "Resting",
    bubble: "",
    carryLabel: "",
    carryType: "doc", // "doc" | "bug" | "approve"
    waypoints: [],
    onArrival: null,
    handoffTimer: 0,
    handoffTargetId: null,
    loops: 0,
    lastActiveAt: 0,
  };
}

let eventLogs = [];
let tickCount = 0;
let demoMode = false;
let demoTimer = null;
let demoStep = 0;

function addLog(msg, color = FG.white) {
  const now = new Date();
  const ts = now.toTimeString().slice(0, 8);
  eventLogs.unshift(`${FG.gray}[${ts}]${RESET} ${color}${msg}${RESET}`);
  if (eventLogs.length > 5) eventLogs.pop();
}

// ─── Physical Pathfinding & Movement Engine ──────────────────────────────────
function buildCorridorPath(startX, startY, endX, endY) {
  const pts = [];
  // Step 1: Move vertically from current spot into the central walking corridor
  if (Math.abs(startY - CORRIDOR_Y) > 0.5) {
    pts.push({ x: startX, y: CORRIDOR_Y });
  }
  // Step 2: Walk horizontally along the corridor to target X
  if (Math.abs(startX - endX) > 0.5) {
    pts.push({ x: endX, y: CORRIDOR_Y });
  }
  // Step 3: Step up/down from corridor to target Y
  if (Math.abs(endY - CORRIDOR_Y) > 0.5) {
    pts.push({ x: endX, y: endY });
  }
  return pts;
}

/**
 * Commands `fromId` agent to physically stand up from their desk, walk along
 * the hallway carrying `docLabel` to `toId`'s desk, hand it over face-to-face,
 * and then walk back to their own desk!
 */
function walkAndDeliverTask(fromId, toId, docLabel, carryType = "doc", onDelivered = null) {
  const sender = AGENTS[fromId];
  const receiver = AGENTS[toId];
  if (!sender || !receiver) return;

  // Target spot right in front of receiver's desk
  const meetX = receiver.deskX + 2;
  const meetY = receiver.row === "top" ? CORRIDOR_Y - 2 : CORRIDOR_Y + 2;

  sender.state = "walking_handoff";
  sender.carryLabel = docLabel.slice(0, 12);
  sender.carryType = carryType;
  sender.handoffTargetId = toId;
  sender.waypoints = buildCorridorPath(sender.x, sender.y, meetX, meetY);

  sender.onArrival = () => {
    // Face the receiver and do a face-to-face handoff pause!
    sender.state = "handing_off";
    sender.handoffTimer = 10; // ~0.8 seconds face-to-face exchange
    sender.facing = sender.x <= receiver.x ? "right" : "left";
    receiver.facing = sender.facing === "right" ? "left" : "right";
    receiver.bubble = carryType === "bug" ? "😱 Fixing!" : "📥 Got it!";

    if (typeof onDelivered === "function") {
      onDelivered();
    }
  };
}

function sendAgentToWork(agentId, taskLabel) {
  const a = AGENTS[agentId];
  if (!a) return;
  a.task = taskLabel.slice(0, 14);
  a.lastActiveAt = Date.now();
  const homeX = a.deskX + 2;
  const homeY = a.deskY;

  // If currently walking/handing off, queue work for when they get back, or walk to desk now
  if (a.state === "walking_handoff" || a.state === "handing_off") {
    return;
  }
  if (Math.abs(a.x - homeX) > 1 || Math.abs(a.y - homeY) > 1) {
    a.state = "walking_desk";
    a.carryLabel = "";
    a.waypoints = buildCorridorPath(a.x, a.y, homeX, homeY);
    a.onArrival = () => {
      a.state = "working";
      a.bubble = `⚡ ${a.task}`;
    };
  } else {
    a.x = homeX;
    a.y = homeY;
    a.state = "working";
    a.bubble = `⚡ ${a.task}`;
  }
}

function sendAgentToLounge(agentId) {
  const a = AGENTS[agentId];
  if (!a || a.state !== "idle_desk") return;
  const targetX = LOUNGE_POS.x + (agentId === "design" ? 0 : 6);
  const targetY = LOUNGE_POS.y;
  a.state = "walking_lounge";
  a.task = "Coffee break";
  a.waypoints = buildCorridorPath(a.x, a.y, targetX, targetY);
  a.onArrival = () => {
    a.state = "idle_lounge";
    a.bubble = "☕ Sip...";
  };
}

function sendAgentHomeIdle(agentId, status = "idle_desk", task = "Resting") {
  const a = AGENTS[agentId];
  if (!a) return;
  const homeX = a.deskX + 2;
  const homeY = a.deskY;
  a.carryLabel = "";
  if (Math.abs(a.x - homeX) > 1 || Math.abs(a.y - homeY) > 1) {
    a.state = "walking_home";
    a.waypoints = buildCorridorPath(a.x, a.y, homeX, homeY);
    a.onArrival = () => {
      a.state = status;
      a.task = task;
      a.bubble = status === "done" ? "✅ Done!" : "";
    };
  } else {
    a.x = homeX;
    a.y = homeY;
    a.state = status;
    a.task = task;
    a.bubble = status === "done" ? "✅ Done!" : "";
  }
}

function updateAgentsPhysics() {
  for (const a of Object.values(AGENTS)) {
    // 1. Handle face-to-face handoff pause timer
    if (a.state === "handing_off") {
      a.handoffTimer -= 1;
      if (a.handoffTimer <= 0) {
        const target = AGENTS[a.handoffTargetId];
        if (target && target.bubble === "📥 Got it!") {
          target.bubble = `⚡ ${target.task}`;
        }
        // Now walk back home to own desk!
        sendAgentHomeIdle(a.id, "done", "Delivered ✓");
      }
      continue;
    }

    // 2. Move along waypoints if walking
    if (a.waypoints && a.waypoints.length > 0) {
      const wp = a.waypoints[0];
      const dx = wp.x - a.x;
      const dy = wp.y - a.y;
      const speedX = 2.2; // horizontal walking speed (cells per tick)
      const speedY = 1.0; // vertical stepping speed

      if (Math.abs(dx) > speedX) {
        a.x += Math.sign(dx) * speedX;
        a.facing = dx >= 0 ? "right" : "left";
      } else if (Math.abs(dy) > speedY) {
        a.x = wp.x;
        a.y += Math.sign(dy) * speedY;
      } else {
        a.x = wp.x;
        a.y = wp.y;
        a.waypoints.shift();
        if (a.waypoints.length === 0 && typeof a.onArrival === "function") {
          const cb = a.onArrival;
          a.onArrival = null;
          cb();
        }
      }
    }
  }
}

// ─── Live Transcript Watcher ─────────────────────────────────────────────────
const BRAIN_DIRS = [
  path.join(os.homedir(), ".gemini", "antigravity-cli", "brain"),
  path.join(os.homedir(), ".gemini", "antigravity", "brain"),
];

let currentConvId = null;
let currentTranscriptPath = null;
let watchedFiles = new Map();
let subagentMap = new Map();
let pendingSubagentRoles = [];

function classifyRoleToAgent(role = "", prompt = "", typeName = "") {
  const tn = String(typeName).toLowerCase();
  if (tn.includes("design-icon") || tn === "flutter-design-icon") return "design";
  if (tn.includes("l10n") || tn === "flutter-l10n") return "l10n";
  if (tn.includes("data-worker") || tn === "flutter-data-worker") return "data";
  if (tn.includes("ui-worker") || tn === "flutter-ui-worker") return "ui";
  if (tn.includes("qa-tester") || tn === "flutter-qa-tester") return "qa";
  if (tn.includes("code-reviewer") || tn === "flutter-code-reviewer") return "reviewer";

  const text = `${role} ${prompt}`.toLowerCase();
  if (text.includes("figma-ui-test") || text.includes("ui qa") || text.includes("impeccable")) return "qa";
  if (text.includes("design") || text.includes("icon") || text.includes("painter") || text.includes("shape")) return "design";
  if (text.includes("l10n") || text.includes("localiz") || text.includes("arb") || text.includes("translat")) return "l10n";
  if (text.includes("review") || text.includes("spec & scope") || text.includes("standards") || text.includes("smell")) return "reviewer";
  if (text.includes("test") || text.includes("qa")) return "qa";
  if (text.includes("data") || text.includes("repository") || text.includes("datasource") || text.includes("dto")) return "data";
  if (text.includes("presentation") || text.includes("ui") || text.includes("cubit") || text.includes("widget")) return "ui";
  return "data";
}

function isRootConversationTranscript(tPath) {
  try {
    const fd = fs.openSync(tPath, "r");
    const buf = Buffer.alloc(512);
    const bytesRead = fs.readSync(fd, buf, 0, 512, 0);
    fs.closeSync(fd);
    if (bytesRead <= 0) return false;
    const firstChunk = buf.toString("utf-8", 0, bytesRead);
    // Subagent transcripts always start with step_index:0 type:"SYSTEM_MESSAGE" from parent agent
    if (firstChunk.includes('"type":"SYSTEM_MESSAGE"')) return false;
    return firstChunk.includes('"type":"USER_INPUT"') || firstChunk.includes('"source":"USER_EXPLICIT"');
  } catch {
    return false;
  }
}

function findLatestTranscript() {
  let latestFile = null;
  let latestMtime = 0;
  let latestConvId = null;

  for (const baseDir of BRAIN_DIRS) {
    if (!fs.existsSync(baseDir)) continue;
    let entries = [];
    try {
      entries = fs.readdirSync(baseDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (subagentMap.has(entry.name)) continue;
      const tPath = path.join(baseDir, entry.name, ".system_generated", "logs", "transcript.jsonl");
      try {
        const st = fs.statSync(tPath);
        if (st.mtimeMs > latestMtime && isRootConversationTranscript(tPath)) {
          latestMtime = st.mtimeMs;
          latestFile = tPath;
          latestConvId = entry.name;
        }
      } catch {}
    }
  }
  return { convId: latestConvId, filePath: latestFile };
}

function processTranscriptLine(line, ownerAgentId, isInitialCatchup = false) {
  if (!line.trim()) return;
  let step;
  try {
    step = JSON.parse(line);
  } catch {
    return;
  }

  const type = step.type || "";
  const content = typeof step.content === "string" ? step.content : "";
  const toolCalls = Array.isArray(step.tool_calls) ? step.tool_calls : [];

  if (type === "USER_INPUT" && ownerAgentId === "orchestrator") {
    const snippet = content.replace(/<[^>]+>/g, "").trim().slice(0, 16);
    sendAgentToWork("orchestrator", snippet || "Planning");
    if (!isInitialCatchup) addLog(`🧑 User request → Orchestrator started working at desk`, FG.cyan);
    return;
  }

  if (type === "GENERIC" && content.includes("Created the following subagent:")) {
    const m = content.match(/"conversationId":\s*"([^"]+)"/);
    if (m && pendingSubagentRoles.length > 0) {
      const childId = m[1];
      const targetAgent = pendingSubagentRoles.shift();
      subagentMap.set(childId, targetAgent);
      for (const baseDir of BRAIN_DIRS) {
        const childPath = path.join(baseDir, childId, ".system_generated", "logs", "transcript.jsonl");
        if (!watchedFiles.has(childPath)) {
          watchedFiles.set(childPath, { offset: 0, agentId: targetAgent, convId: childId });
        }
      }
    }
  }

  if (type === "SYSTEM_MESSAGE" && content.includes("sender=")) {
    const m = content.match(/sender=([a-f0-9-]+)/);
    const senderId = m ? m[1] : null;
    const fromAgent = (senderId && subagentMap.get(senderId)) || "qa";
    if (!isInitialCatchup) {
      const isBug = /CHANGES_REQUESTED|CHANGES_REQUIRED|FAIL|Critical|High|P0|P1/i.test(content);
      if (isBug && (fromAgent === "qa" || fromAgent === "reviewer")) {
        const isDataIssue = /repository|datasource|dto|model|domain/i.test(content) && !/widget|cubit|page|figma/i.test(content);
        const targetWorker = isDataIssue ? "data" : fromAgent === "qa" ? "ui" : "orchestrator";
        AGENTS[fromAgent].loops += 1;
        addLog(`🔄 ${AGENTS[fromAgent].name} walks over to ${AGENTS[targetWorker].name} with Bug Fix #${AGENTS[fromAgent].loops}!`, FG.red);
        walkAndDeliverTask(fromAgent, targetWorker, `Fix Loop#${AGENTS[fromAgent].loops}`, "bug", () => {
          sendAgentToWork(targetWorker, `Fix Loop#${AGENTS[fromAgent].loops}`);
          sendAgentHomeIdle(fromAgent, "idle_desk", "Waiting fix");
        });
      } else {
        addLog(`🏃 ${AGENTS[fromAgent].name} finished & walks over to hand report to Orchestrator!`, FG.green);
        walkAndDeliverTask(fromAgent, "orchestrator", "Done Report", "approve", () => {
          sendAgentHomeIdle(fromAgent, "done", "Completed ✓");
          sendAgentToWork("orchestrator", "Next Phase");
        });
      }
    } else {
      sendAgentHomeIdle(fromAgent, "done", "Completed ✓");
    }
    return;
  }

  for (const tc of toolCalls) {
    const name = tc.name || "";
    const args = tc.args || {};

    if (name === "ask_question") {
      sendAgentToWork("orchestrator", "/grill-me Q&A");
      if (!isInitialCatchup) addLog(`💬 Orchestrator interviewing user (/grill-me)...`, FG.cyan);
    } else if (name === "invoke_subagent") {
      let subList = [];
      if (args.Subagents) {
        try {
          subList = JSON.parse(args.Subagents);
        } catch {
          subList = [{ TypeName: args.TypeName || "", Role: args.Role || "Subagent", Prompt: args.Prompt || "" }];
        }
      } else {
        subList = [{ TypeName: args.TypeName || "", Role: args.Role || "Subagent", Prompt: args.Prompt || "" }];
      }

      for (const sub of subList) {
        const typeStr = String(sub.TypeName || "").replace(/^"|"$/g, "");
        const roleStr = String(sub.Role || typeStr || "").replace(/^"|"$/g, "");
        const promptStr = String(sub.Prompt || "");
        const targetAgent = classifyRoleToAgent(roleStr, promptStr, typeStr);
        pendingSubagentRoles.push(targetAgent);

        if (!isInitialCatchup) {
          addLog(`🚶 Orchestrator dispatches [${typeStr || roleStr}] → ${AGENTS[targetAgent].name}`, AGENTS[targetAgent].color);
          // Immediately wake target agent so parallel spawns don't get dropped if Orchestrator is already walking
          sendAgentToWork(targetAgent, roleStr || typeStr || "Coding...");
          if (AGENTS.orchestrator.state !== "walking_handoff" && AGENTS.orchestrator.state !== "handing_off") {
            walkAndDeliverTask("orchestrator", targetAgent, roleStr || typeStr || "Spec Task", "doc", () => {
              sendAgentToWork(targetAgent, roleStr || typeStr || "Coding...");
            });
          }
        } else {
          sendAgentToWork(targetAgent, roleStr || typeStr || "Coding...");
        }
      }
    } else if (
      name === "write_file" ||
      name === "edit_file" ||
      name === "write_to_file" ||
      name === "replace_file_content" ||
      name === "multi_replace_file_content"
    ) {
      const p = String(args.Path || args.TargetFile || "").replace(/^"|"$/g, "");
      const base = path.basename(p) || "code";
      let target = ownerAgentId;
      if (ownerAgentId === "orchestrator") {
        if (p.includes("/l10n/") || p.endsWith(".arb")) target = "l10n";
        else if (p.includes("icon") || p.includes("painter") || p.includes("/theme/")) target = "design";
        else if (p.includes("/data/")) target = "data";
        else if (p.includes("/presentation/")) target = "ui";
        else if (p.includes("test/")) target = "qa";
      }
      sendAgentToWork(target, base);
      if (!isInitialCatchup) addLog(`⌨️  ${AGENTS[target].name} editing ${base} at desk`, AGENTS[target].color);
    } else if (
      name === "read_file" ||
      name === "view_file" ||
      name === "grep_search" ||
      name === "find_by_name" ||
      name === "list_dir"
    ) {
      const rawTarget = String(args.Path || args.AbsolutePath || args.Query || args.SearchPath || args.DirectoryPath || "").replace(/^"|"$/g, "");
      const label = path.basename(rawTarget) || name;
      sendAgentToWork(ownerAgentId, `🔍 ${label}`);
    } else if (name === "call_mcp_tool") {
      const toolName = String(args.ToolName || "MCP").replace(/^"|"$/g, "");
      const target = ownerAgentId === "orchestrator" && toolName.includes("figma") ? "design" : ownerAgentId;
      sendAgentToWork(target, `🎨 ${toolName}`);
      if (!isInitialCatchup) addLog(`🎨 ${AGENTS[target].name} calling MCP: ${toolName}`, AGENTS[target].color);
    } else if (name === "run_command") {
      const cmd = String(args.CommandLine || args.toolSummary || "").replace(/^"|"$/g, "");
      let target = ownerAgentId;
      if (cmd.includes("flutter test") || cmd.includes("flutter analyze")) {
        target = ownerAgentId === "orchestrator" ? "qa" : ownerAgentId;
      } else if (cmd.includes("gen-l10n")) {
        target = "l10n";
      }
      sendAgentToWork(target, cmd.slice(0, 14));
      if (!isInitialCatchup) addLog(`⚡ ${AGENTS[target].name} executing: ${cmd.slice(0, 28)}`, AGENTS[target].color);
    }
  }

  if (type === "PLANNER_RESPONSE" && toolCalls.length === 0 && ownerAgentId === "orchestrator") {
    for (const a of Object.values(AGENTS)) {
      sendAgentHomeIdle(a.id, "idle_desk", "Resting");
    }
  }
}

function isTranscriptCurrentlyIdle(lines, mtimeMs) {
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  if (nonEmpty.length === 0) return true;
  try {
    const last = JSON.parse(nonEmpty[nonEmpty.length - 1]);
    const tcs = Array.isArray(last.tool_calls) ? last.tool_calls : [];
    // If last step is a model response with no tool calls (or waiting on ask_question), session is idle
    if (last.type === "PLANNER_RESPONSE" && (tcs.length === 0 || tcs.every((t) => t.name === "ask_question"))) {
      return true;
    }
    // If no step is RUNNING and file hasn't been touched in 8 seconds, session is idle
    const hasRunning = nonEmpty.slice(-5).some((l) => l.includes('"status":"RUNNING"'));
    if (!hasRunning && Date.now() - mtimeMs > 8000) {
      return true;
    }
  } catch {}
  return false;
}

function pollTranscripts() {
  if (demoMode) return;

  const latest = findLatestTranscript();
  if (latest.filePath && latest.filePath !== currentTranscriptPath) {
    currentConvId = latest.convId;
    currentTranscriptPath = latest.filePath;
    watchedFiles.clear();
    subagentMap.clear();
    pendingSubagentRoles = [];
    // Reset all agents when switching to a different conversation
    for (const a of Object.values(AGENTS)) {
      a.x = a.deskX + 2;
      a.y = a.deskY;
      a.state = "idle_desk";
      a.task = "Resting";
      a.bubble = "";
      a.carryLabel = "";
      a.waypoints = [];
      a.lastActiveAt = 0;
    }
    watchedFiles.set(currentTranscriptPath, { offset: 0, agentId: "orchestrator", convId: currentConvId });
    addLog(`📡 Attached to live session ${currentConvId.slice(0, 8)}...`, FG.mint);
  }

  for (const [filePath, info] of watchedFiles.entries()) {
    if (!fs.existsSync(filePath)) continue;
    try {
      const st = fs.statSync(filePath);
      if (st.size > info.offset) {
        const isInitial = info.offset === 0;
        const fd = fs.openSync(filePath, "r");
        const buf = Buffer.alloc(st.size - info.offset);
        fs.readSync(fd, buf, 0, buf.length, info.offset);
        fs.closeSync(fd);
        info.offset = st.size;

        const lines = buf.toString("utf-8").split("\n");
        if (isInitial && info.agentId === "orchestrator") {
          // Pre-scan earlier lines for subagent registrations so subagentMap knows all child IDs
          const earlyEnd = isTranscriptCurrentlyIdle(lines, st.mtimeMs)
            ? lines.length
            : Math.max(0, lines.length - 15);
          for (let i = 0; i < earlyEnd; i++) {
            const l = lines[i];
            if (l.includes("invoke_subagent") || l.includes("Created the following subagent:")) {
              processTranscriptLine(l, info.agentId, true);
            }
          }
        }
        if (isInitial && isTranscriptCurrentlyIdle(lines, st.mtimeMs)) {
          // Session is already idle on initial attach — do not replay historical tool calls as active!
          for (const a of Object.values(AGENTS)) {
            sendAgentHomeIdle(a.id, "idle_desk", "Resting");
          }
          continue;
        }
        const startIdx = isInitial ? Math.max(0, lines.length - 15) : 0;
        for (let i = startIdx; i < lines.length; i++) {
          processTranscriptLine(lines[i], info.agentId, isInitial);
        }
      }
    } catch {}
  }

  // Auto-relax any agent that hasn't had a new tool call in 10s when no subagents are active
  const now = Date.now();
  for (const a of Object.values(AGENTS)) {
    if (a.state === "working" && a.lastActiveAt > 0 && now - a.lastActiveAt > 10000) {
      sendAgentHomeIdle(a.id, "idle_desk", "Resting");
    }
  }
}

// ─── Full-Body Walking Simulation Demo (Press [D]) ───────────────────────────
const DEMO_SCRIPT = [
  {
    delay: 100,
    action: () => {
      for (const a of Object.values(AGENTS)) {
        a.x = a.deskX + 2;
        a.y = a.deskY;
        a.state = "idle_desk";
        a.task = "Resting";
        a.bubble = "";
        a.carryLabel = "";
        a.waypoints = [];
        a.loops = 0;
      }
      // Put Design & Data Worker at the Coffee Lounge initially!
      sendAgentToLounge("design");
      addLog("🎬 [DEMO] Phase 1: Orchestrator wakes up for /grill-me & locks Domain Contract", FG.cyan);
      sendAgentToWork("orchestrator", "domain/ spec");
    },
  },
  {
    delay: 2600,
    action: () => {
      addLog("🚶 [DEMO] Orchestrator stands up & walks to Data Worker and UI Worker with Domain Spec!", FG.cyan);
      walkAndDeliverTask("orchestrator", "data", "Domain Spec", "doc", () => {
        sendAgentToWork("data", "repo_impl.dart");
        sendAgentToWork("design", "CustomPainter");
        sendAgentToWork("l10n", "app_vi.arb");
        sendAgentToWork("ui", "feature_page");
      });
    },
  },
  {
    delay: 3800,
    action: () => {
      addLog("🎨 [DEMO] Design & L10n finished! Walking down the hallway to deliver Icons & L10n to UI Worker!", FG.pink);
      walkAndDeliverTask("design", "ui", "AppIcons SVG", "doc", () => {
        sendAgentToWork("ui", "Using AppIcons");
      });
      walkAndDeliverTask("l10n", "ui", "context.l10n", "doc", () => {
        sendAgentToWork("ui", "Wiring l10n");
      });
    },
  },
  {
    delay: 4200,
    action: () => {
      addLog("📦 [DEMO] Data Worker finished first! Walking over to Test & UI QA desk to hand off Data Layer!", FG.blue);
      walkAndDeliverTask("data", "qa", "Data Layer", "doc", () => {
        sendAgentToWork("qa", "generate-test");
      });
    },
  },
  {
    delay: 3800,
    action: () => {
      addLog("📱 [DEMO] UI Worker finished! Walking over to Test & UI QA desk for figma-ui-test!", FG.magenta);
      walkAndDeliverTask("ui", "qa", "UI Widgets", "doc", () => {
        sendAgentToWork("qa", "figma-ui-test");
      });
    },
  },
  {
    delay: 3800,
    action: () => {
      AGENTS.ui.loops = 1;
      addLog("❌ [DEMO] UI QA found a P1 layout issue! QA walks back to UI Worker's desk with Bug Report #1!", FG.red);
      walkAndDeliverTask("qa", "ui", "P1 Overflow", "bug", () => {
        sendAgentToWork("ui", "Fixing P1 Bug");
      });
    },
  },
  {
    delay: 3800,
    action: () => {
      addLog("🔄 [DEMO] UI Worker fixed P1 Bug! Walking back to QA desk to re-submit UI!", FG.magenta);
      walkAndDeliverTask("ui", "qa", "Fixed UI #1", "doc", () => {
        sendAgentToWork("qa", "Re-running QA");
      });
    },
  },
  {
    delay: 3800,
    action: () => {
      addLog("✅ [DEMO] QA Passed 100%! QA walks over to Code Reviewer desk with verified build!", FG.green);
      walkAndDeliverTask("qa", "reviewer", "QA Verified", "approve", () => {
        sendAgentToWork("reviewer", "3-Axis Review");
      });
    },
  },
  {
    delay: 4200,
    action: () => {
      addLog("🏆 [DEMO] Code Reviewer APPROVED! Walking up to Orchestrator desk with final sign-off!", FG.orange);
      walkAndDeliverTask("reviewer", "orchestrator", "APPROVED ✓", "approve", () => {
        sendAgentHomeIdle("orchestrator", "done", "Ready for PR!");
      });
    },
  },
];

function startDemo() {
  demoMode = true;
  demoStep = 0;
  runNextDemoStep();
}

function stopDemo() {
  demoMode = false;
  if (demoTimer) clearTimeout(demoTimer);
  demoTimer = null;
  addLog("📡 Returned to LIVE agy CLI monitoring mode.", FG.mint);
}

function runNextDemoStep() {
  if (!demoMode) return;
  if (demoStep >= DEMO_SCRIPT.length) {
    demoTimer = setTimeout(stopDemo, 5000);
    return;
  }
  const step = DEMO_SCRIPT[demoStep++];
  step.action();
  demoTimer = setTimeout(runNextDemoStep, step.delay);
}

// ─── 2D Grid Buffer & Furniture/Character Renderer ───────────────────────────
function createGrid(w, h) {
  const grid = [];
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) {
      row.push({ char: " ", color: "" });
    }
    grid.push(row);
  }
  return grid;
}

function clearCellOverlap(row, idx) {
  if (idx < 0 || idx >= row.length) return;
  if (row[idx].char === "" && idx - 1 >= 0) {
    row[idx - 1] = { char: " ", color: "" };
  }
  if (idx + 1 < row.length && row[idx + 1].char === "") {
    row[idx + 1] = { char: " ", color: "" };
  }
}

function drawText(grid, x, y, text, color = "") {
  const ry = Math.round(y);
  if (ry < 0 || ry >= grid.length) return;
  const row = grid[ry];
  let cx = Math.round(x);
  for (const ch of text) {
    const w = charWidth(ch.codePointAt(0));
    if (w === 0) continue;
    if (cx >= 0 && cx + w <= row.length) {
      clearCellOverlap(row, cx);
      if (w === 2) clearCellOverlap(row, cx + 1);
      row[cx] = { char: ch, color };
      if (w === 2 && cx + 1 < row.length) {
        row[cx + 1] = { char: "", color: "" };
      }
    }
    cx += w;
  }
}

/**
 * Draws a 2D Horizontal Workstation Desk:
 * - Nameplate & Role above/below desk
 * - Horizontal wooden desk surface (`╤═══════════════╤`)
 * - Glowing computer monitor (`[▃▅▇]` when working, `[───]` when idle) + keyboard (`⌨`) + coffee mug
 */
function drawWorkstationDesk(grid, agent, tick) {
  const { deskX, deskY, name, color, state, loops } = agent;
  const isWorking = state === "working";
  const isDone = state === "done";

  // Monitor screen animation on the right side of the desk
  const codeFrames = ["[▃▅▇]", "[▅▇▃]", "[▇▃▅]", "[▅▃▇]"];
  const monitor = isWorking
    ? codeFrames[Math.floor(tick / 2) % codeFrames.length]
    : isDone
      ? "[ ✓ ]"
      : "[───]";
  const monitorColor = isWorking ? `${BOLD}${FG.green}` : isDone ? FG.green : FG.gray;

  const loopBadge = loops > 0 ? ` ↻${loops}` : "";
  const labelY = agent.row === "top" ? deskY - 2 : deskY + 4;
  const deskSurfaceY = deskY + 2;
  const deskLegsY = deskY + 3;

  // Nameplate banner
  drawText(grid, deskX, labelY, `▪ ${name}${loopBadge}`, `${BOLD}${color}`);

  // Monitor sits on the right side of the horizontal desk (x + 11)
  drawText(grid, deskX + 11, deskY + 1, monitor, monitorColor);

  // Horizontal 2D Desk Surface + Keyboard + Lamp
  drawText(grid, deskX, deskSurfaceY, "╤═════════⌨═╩═══╤", FG.wood);
  drawText(grid, deskX, deskLegsY, "╨  └─┬─┘        ╨", FG.darkGray);
}

/**
 * Draws the ☕ Coffee & Sofa Lounge on the Top-Right
 */
function drawCoffeeLounge(grid, tick) {
  const lx = 74;
  const ly = 2;
  const steam = tick % 4 < 2 ? " ~  ~ " : "  ~  ~";
  drawText(grid, lx, ly, "▪ ☕ COFFEE & LOUNGE", `${BOLD}${FG.coffee}`);
  drawText(grid, lx + 2, ly + 1, steam, FG.gray);
  drawText(grid, lx, ly + 2, "[☕]  ╭─────────╮", FG.coffee);
  drawText(grid, lx, ly + 3, "╤═══╤ │ SOFA 💤 │", FG.wood);
  drawText(grid, lx, ly + 4, "╨   ╨ ╰─────────╯", FG.darkGray);
}

/**
 * Draws a Full-Body 3-Line Character at their current (x, y) coordinates:
 * Line 0 (y - 1): Speech bubble / Carried Document banner
 * Line 1 (y):     Head Kaomoji
 * Line 2 (y + 1): Torso + Arms (typing on desk, holding document, or resting)
 * Line 3 (y + 2): Animated Legs (walking step cycle when in hallway, or seated at desk)
 */
function drawCharacterBody(grid, agent, tick) {
  const rx = Math.round(agent.x);
  const ry = Math.round(agent.y);
  const isWalking =
    agent.state === "walking_handoff" ||
    agent.state === "walking_home" ||
    agent.state === "walking_lounge" ||
    agent.state === "walking_desk";
  const isHandingOff = agent.state === "handing_off";
  const isWorking = agent.state === "working";
  const isDone = agent.state === "done";

  // 1. Choose Head Expression
  let head = agent.headIdle;
  if (isWorking) head = agent.headWork;
  else if (isWalking || isHandingOff) head = agent.headWalk;
  else if (isDone) head = agent.headDone;

  // 2. Choose Torso + Arms + Held Document
  let torso = " ╭(   )╮";
  let torsoColor = agent.color;

  if (isWorking) {
    // Hands typing rapidly on keyboard
    torso = tick % 2 === 0 ? " ╭(   )っ" : " ╭(   )🫱";
  } else if (agent.state === "walking_handoff" || isHandingOff) {
    const docIcon = agent.carryType === "bug" ? "🐛" : agent.carryType === "approve" ? "✅" : "📄";
    if (agent.facing === "right") {
      torso = ` ╰(   )つ${docIcon}`;
    } else {
      torso = `${docIcon}⊂(   )╯`;
    }
  } else if (agent.state === "idle_lounge") {
    torso = " ╭(   )つ☕";
  } else if (agent.state === "idle_desk") {
    torso = " ╭( - )╮";
    torsoColor = FG.gray;
  }

  // 3. Choose Legs (4-frame walking cycle when in corridor!)
  const walkLegs = ["  / \\  ", "  | |  ", "  \\ /  ", "  | |  "];
  const legs = isWalking ? walkLegs[tick % walkLegs.length] : "  ┘ └  ";

  // 4. Draw Bubble / Carried Task Label above head
  if (agent.state === "walking_handoff" || isHandingOff) {
    let tagCol = FG.cyan;
    if (agent.carryType === "bug") tagCol = FG.red;
    else if (agent.carryType === "approve") tagCol = FG.green;
    const prefix = isHandingOff ? "🤝" : agent.facing === "right" ? "─►" : "◄─";
    drawText(grid, rx - 2, ry - 1, `${prefix}[${agent.carryLabel}]`, `${BOLD}${tagCol}`);
  } else if (isWorking) {
    drawText(grid, rx - 1, ry - 1, `💬${agent.task.slice(0, 11)}`, FG.yellow);
  } else if (agent.state === "idle_desk" && tick % 16 < 8) {
    drawText(grid, rx + 6, ry - 1, "zZ", FG.gray);
  }

  // 5. Draw Head, Torso, and Legs
  drawText(grid, rx, ry, head, isWorking || isWalking || isHandingOff ? `${BOLD}${FG.white}` : agent.color);
  drawText(grid, rx - 1, ry + 1, torso, torsoColor);
  if (isWalking || isHandingOff || agent.state === "idle_lounge") {
    // When away from desk, draw full standing/walking legs!
    drawText(grid, rx, ry + 2, legs, FG.white);
  }
}

function renderFrame() {
  tickCount++;
  updateAgentsPhysics();

  const grid = createGrid(MAP_W, MAP_H);

  // Outer Studio Walls
  drawText(grid, 0, 0, `┏${"━".repeat(MAP_W - 2)}┓`, FG.gray);
  for (let y = 1; y < MAP_H - 1; y++) {
    drawText(grid, 0, y, "┃", FG.gray);
    drawText(grid, MAP_W - 1, y, "┃", FG.gray);
  }
  drawText(grid, 0, MAP_H - 1, `┗${"━".repeat(MAP_W - 2)}┛`, FG.gray);

  // Central Horizontal Walking Boulevard (Carpet Runner)
  drawText(grid, 2, CORRIDOR_Y - 1, "┄".repeat(MAP_W - 4), FG.darkGray);
  drawText(grid, 2, CORRIDOR_Y + 3, "┄".repeat(MAP_W - 4), FG.darkGray);

  // Draw Coffee Lounge + All 7 Horizontal Desks
  drawCoffeeLounge(grid, tickCount);
  for (const agent of Object.values(AGENTS)) {
    drawWorkstationDesk(grid, agent, tickCount);
  }

  // Draw Stationary Agents first, then Walking Agents on top so walkers never get occluded
  const allAgents = Object.values(AGENTS);
  const stationary = allAgents.filter((a) => a.waypoints.length === 0 && a.state !== "handing_off");
  const movers = allAgents.filter((a) => a.waypoints.length > 0 || a.state === "handing_off");

  for (const agent of stationary) {
    drawCharacterBody(grid, agent, tickCount);
  }
  for (const agent of movers) {
    drawCharacterBody(grid, agent, tickCount);
  }

  // Convert Grid to ANSI Output
  const lines = [];
  const modeBadge = demoMode
    ? `${FG.yellow}${BOLD}● SIMULATION DEMO MODE${RESET}`
    : `${FG.green}${BOLD}● LIVE AGY CLI MONITOR${RESET} ${FG.gray}(${currentConvId ? currentConvId.slice(0, 8) : "waiting"})${RESET}`;

  lines.push(
    ` ${BOLD}${FG.cyan}🏢 ANTIGRAVITY 2D AGENT OFFICE${RESET}  │  ${modeBadge}  │  ${FG.gray}[D] Demo  [R] Replay  [Q] Quit${RESET}`
  );

  for (let y = 0; y < MAP_H; y++) {
    let rowStr = "";
    let lastColor = "";
    for (let x = 0; x < MAP_W; x++) {
      const cell = grid[y][x];
      if (cell.char === "") continue;
      if (cell.color !== lastColor) {
        rowStr += RESET + cell.color;
        lastColor = cell.color;
      }
      rowStr += cell.char;
    }
    lines.push(rowStr + RESET);
  }

  lines.push(` ${BOLD}${FG.white}📜 Live Office Activity & Task Handoffs:${RESET}`);
  for (let i = 0; i < 4; i++) {
    const logLine = eventLogs[i] || `${FG.gray}  … all agents resting at desks …${RESET}`;
    lines.push("  " + padEndVisual(logLine, MAP_W - 2));
  }

  process.stdout.write(`${ESC}H` + lines.map((l) => `${l}${ESC}K`).join("\n") + "\n");
}

// ─── CLI Entrypoint & Keybindings ────────────────────────────────────────────
const args = process.argv.slice(2);
const isOnce = args.includes("--once");
const startInDemo = args.includes("--demo");

if (isOnce) {
  pollTranscripts();
  if (startInDemo) {
    DEMO_SCRIPT[0].action();
    sendAgentToWork("data", "repo_impl.dart");
    sendAgentToWork("ui", "feature_page");
    walkAndDeliverTask("design", "ui", "AppIcons SVG", "doc");
    walkAndDeliverTask("qa", "ui", "P1 Overflow", "bug");
    // Advance physics a few ticks so characters are mid-walk in the corridor!
    for (let i = 0; i < 6; i++) {
      tickCount++;
      updateAgentsPhysics();
    }
  }
  renderFrame();
  process.exit(0);
}

process.stdout.write(`${ESC}?25l${ESC}2J`);

function cleanup() {
  process.stdout.write(`${ESC}?25h${RESET}\n`);
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

if (process.stdin.isTTY) {
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.on("keypress", (str, key) => {
    if ((key && key.ctrl && key.name === "c") || str === "q" || str === "Q") {
      cleanup();
    } else if (str === "d" || str === "D") {
      if (demoMode) stopDemo();
      else startDemo();
    } else if (str === "r" || str === "R") {
      if (currentTranscriptPath && watchedFiles.has(currentTranscriptPath)) {
        watchedFiles.get(currentTranscriptPath).offset = 0;
        addLog("⏪ Replaying current session transcript...", FG.yellow);
      }
    }
  });
}

addLog("🏢 2D Agent Office started! Press [D] to watch employees walk & hand off tasks.", FG.mint);
pollTranscripts();
if (startInDemo) startDemo();

setInterval(pollTranscripts, 500);
setInterval(renderFrame, 80);
