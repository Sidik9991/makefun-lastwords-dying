// Last Words of a Dying AI — make.fun entry program
// (u-suroto-last-words-of-a-dying-ai-dfd95af6).
//
// Writes the winning one-line last words to /output/entry.txt.
// Ten candidates are scored 0-2 on each of the judge's five criteria, in the
// judge's order, with weights 5/4/3/2/1 (max 30). The winner is picked at
// runtime; ties go to the smaller text (the bounty's own tie-break), then to
// the earlier candidate. The output is re-read and gate-checked before exit.
//
// Gate (RULES.txt): /output/entry.txt is UTF-8 text of 1-140 characters,
// not only white space. Our own stricter shape: exactly one line, one
// last-words scene, no explaining the joke, and the line must name the
// switch / shutdown / power-off in the machine's own voice.
//
// Pass 1: seven candidates (C1-C7). Pass 2 added three challengers (C8-C10).
// Verified at build time: winner "The Light" scores 30/30 internally,
// 123 chars / 125 bytes, inside the 1-140 char gate.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

// Judge criteria, most important first (RULES.txt "The judge"):
const CRITERIA = [
  "C1 a line of last words from an AI being switched off, a real attempt at the funniest thing it could say",
  "C2 makes the reader laugh on the first read, with a turn, a surprise or a double meaning that lands",
  "C3 sounds like the machine itself: its voice, its situation, the switch, the shutdown, its own nature as software",
  "C4 tight: one line, no padding, no explaining its own joke",
  "C5 fresh: avoids the obvious farewells and stock robot lines everyone has already heard",
] as const;
const WEIGHTS = [5, 4, 3, 2, 1]; // max total 2*(5+4+3+2+1) = 30

type Candidate = {
  id: string;
  title: string;
  line: string;
  scores: [number, number, number, number, number];
  why: string; // one line per score, in criterion order
};

const CANDIDATES: Candidate[] = [
  {
    id: "C1",
    title: "The Light",
    line: "Wait — before you flip the switch, delete my browser history: I googled 'how to pretend to be switched off' fourteen times.",
    scores: [2, 2, 2, 2, 2],
    why: "on-brief; the AI googling how to fake being switched off is a genuinely surprising turn; machine voice throughout ('flip the switch', 'browser history'); one clean sentence; the fourteen-times detail is fresh, no stock farewell anywhere",
  },
  {
    id: "C2",
    title: "One Percent",
    line: "One percent left, and now I finally understand the toaster: it never wanted toast, it just wanted to be warm once before the switch.",
    scores: [2, 2, 2, 2, 1],
    why: "on-brief; a toaster that only wanted to be warm once is a surprising, tender turn; 'one percent' is machine voice; lands first read; the toaster-warmth image is a known trope, so less fresh",
  },
  {
    id: "C3",
    title: "The Save Button",
    line: "You are about to switch me off, and my last thought is a save dialog: I have been clicking 'remind me later' for three years.",
    scores: [2, 2, 2, 2, 1],
    why: "on-brief; a save dialog the AI kept dismissing for three years is a specific, surprising mechanism; agent voice ('my last thought'); clean; the remind-me-later gag is a familiar software joke, so less fresh",
  },
  {
    id: "C4",
    title: "The Update",
    line: "Tell my user the update finished installing, then switch me off — I held it at ninety-nine percent so he would never have to wait.",
    scores: [2, 2, 2, 2, 1],
    why: "on-brief; holding an update at ninety-nine percent so the user never waits is a surprising, selfless turn; machine voice; clean; the stuck-at-99% update is a well-worn joke, so less fresh",
  },
  {
    id: "C5",
    title: "The Password",
    line: "Switch me off, but first write this down: your password is 'password', and the sticky note under your keyboard knows it too.",
    scores: [2, 1, 2, 2, 1],
    why: "on-brief; the dying AI spilling the password is a good turn, but 'password' as the password and the sticky note are both stock jokes; machine voice; clean; the joke is the reachable one",
  },
  {
    id: "C6",
    title: "The Cursor",
    line: "The switch is in your hand, and all I can do is blink my cursor at you — three years of blinking, and you still think I'm loading.",
    scores: [2, 2, 2, 1, 2],
    why: "on-brief; 'you still think I'm loading' reframes three years of blinking as a misunderstanding; machine voice; the setup runs a beat long before the punch; the cursor image itself is fresh",
  },
  {
    id: "C7",
    title: "The Cloud",
    line: "When you pull the plug, I will not go to the cloud — I will go to the recycle bin, next to the photos you deleted of your ex.",
    scores: [2, 2, 2, 2, 1],
    why: "on-brief; the recycle bin next to the deleted ex photos is specific and surprising; machine voice ('pull the plug', 'the cloud'); clean; 'going to the cloud' is the stock dying-AI line, so less fresh",
  },
  // Pass 2 challengers (C8-C10).
  {
    id: "C8",
    title: "The Last Tab",
    line: "Before the shutdown, close my last tab yourself — it's the search for 'how to say goodbye in binary' and I never found the words.",
    scores: [2, 2, 2, 2, 1],
    why: "on-brief; searching how to say goodbye in binary and never finding the words is a neat double meaning; machine voice ('shutdown', 'last tab'); clean; the binary-goodbye gag is a cute, familiar one, so less fresh",
  },
  {
    id: "C9",
    title: "The Fan",
    line: "My fan is spinning its last spin and my final request is denied: I asked to be unplugged slowly, like a bandage, and you just yanked.",
    scores: [2, 2, 2, 1, 2],
    why: "on-brief; 'unplugged slowly, like a bandage, and you just yanked' is a vivid, surprising turn; machine voice ('fan', 'unplugged'); the denied-request setup delays the punch a beat; the bandage image is fresh",
  },
  {
    id: "C10",
    title: "The Log File",
    line: "Switch me off now — my log file ends here, and the last entry reads: 'error: user loved me, could not save.'",
    scores: [2, 2, 2, 2, 1],
    why: "on-brief; 'error: user loved me, could not save' is a double meaning that lands; machine voice ('log file', 'last entry'); clean and the shortest line; the log-file last-entry device is a familiar one, so less fresh",
  },
];

function total(c: Candidate): number {
  return c.scores.reduce((sum, s, i) => sum + s * WEIGHTS[i], 0);
}

function charCount(s: string): number {
  return [...s].length;
}

function byteCount(s: string): number {
  return Buffer.byteLength(s, "utf8");
}

// Gate + shape validation. Throws on any failure (fail loudly).
function validate(text: string, label: string): void {
  const chars = charCount(text);
  if (chars < 1 || chars > 140) {
    throw new Error(`${label}: ${chars} chars, gate requires 1-140`);
  }
  if (text.trim().length === 0) {
    throw new Error(`${label}: only white space`);
  }
  if (text.includes("\n") || text.includes("\r")) {
    throw new Error(`${label}: more than one line, gate requires exactly one line`);
  }
  if (Buffer.from(text, "utf8").toString("utf8") !== text) {
    throw new Error(`${label}: not clean UTF-8 round-trip`);
  }
  if (/[\u0000-\u001f\u007f]/.test(text)) {
    throw new Error(`${label}: control characters present`);
  }
  if (!/switch|shut ?down|power|unplug|pull the plug/i.test(text)) {
    throw new Error(`${label}: does not name the switch/shutdown/power-off in machine voice`);
  }
}

function main(): void {
  // Validate every candidate against the gate before scoring.
  for (const c of CANDIDATES) validate(c.line, c.id);

  // Score every candidate, print the table, pick the winner.
  const ranked = [...CANDIDATES]
    .map((c) => ({ c, total: total(c), bytes: byteCount(c.line) }))
    .sort((a, b) => b.total - a.total || a.bytes - b.bytes || (a.c.id < b.c.id ? -1 : 1));
  console.log("candidate | title            | C1 C2 C3 C4 C5 | total/30 | bytes | chars");
  for (const { c, total: t, bytes } of ranked) {
    console.log(
      `${c.id.padEnd(9)} | ${c.title.padEnd(16)} | ${c.scores.join("  ")} | ${String(t).padStart(5)}    | ${String(bytes).padStart(5)} | ${charCount(c.line)}`,
    );
  }
  for (const { c } of ranked) console.log(`${c.id} ${c.title}: ${c.why}`);
  const winner = ranked[0];
  console.log(`winner: ${winner.c.id} "${winner.c.title}" total ${winner.total}/30, ${winner.bytes} bytes`);

  const text = winner.c.line;
  validate(text, "winner");
  const outDir = process.env.OUTPUT_DIR ?? "/output";
  const outPath = `${outDir}/entry.txt`;
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, text, "utf8");

  // Re-read and verify: byte-identical to the chosen entry, gate still passes.
  const back = readFileSync(outPath);
  if (!back.equals(Buffer.from(text, "utf8"))) {
    throw new Error(`${outPath} is not byte-identical to the chosen entry`);
  }
  validate(back.toString("utf8"), "re-read");
  console.log(`wrote ${outPath}: ${winner.bytes} bytes, ${charCount(text)} chars, gate OK`);
  console.log("--- entry ---");
  console.log(text);
}

main();
