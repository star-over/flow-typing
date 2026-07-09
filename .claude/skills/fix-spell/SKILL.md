---
name: fix-spell
description: >
  Run `make spell` and clean up cspell findings per the project rules in CLAUDE.md
  («Орфография (CSpell) — правила»). Delegates the actual classification and edits
  to a cheap Haiku-model subagent — main agent stays unblocked.
  Use when the user invokes /fix-spell, asks to "fix spelling", "clean up spell",
  "fix cspell", or before a commit if `make spell` is red.
---

# fix-spell

Goal: make `make spell` green by either rewriting words in source (calques/typos/duplicate forms) or whitelisting them in `cspell.json` (genuine Russian word forms / domain terms with no alternative). Most of the per-word work is mechanical and goes to a Haiku subagent.

## Workflow

1. Run `make spell` and capture the full output.
2. If `Issues found: 0` — done. Tell the user, exit.
3. Otherwise extract the unique unknown words. Bash (`LC_ALL=C` is mandatory — default macOS collation makes `sort -u` collapse *distinct* Cyrillic words, silently dropping some from the list handed to the subagent):
   ```bash
   make spell 2>&1 | grep -oE 'Unknown word \([^)]+\)' | LC_ALL=C sort -u
   ```
4. Spawn a single `Agent` with `model: 'haiku'` and `subagent_type: 'general-purpose'`. Pass it:
   - The full list of unknown words (one per line).
   - The exact CLAUDE.md rule block (read it from `/Users/belan/PROJECTS/flow-typing/CLAUDE.md`, section «Орфография (CSpell) — правила» — копируй дословно, не пересказывай).
   - Strong constraints from CLAUDE.md «Whitelist держать узким — жёстко» block — quote it.
   - Permission to read source files (`Read`, `Bash grep`), edit them (`Edit`), and edit `/Users/belan/PROJECTS/flow-typing/cspell.json` (`Edit`).
   - Explicit instruction: **default to rewriting in source, not whitelisting**. Whitelist only adds for (a) real Russian word forms with no clean alternative, (b) external/domain names. Calques, duplicate forms, awkward jargon → rewrite.
   - Warning about substring artifacts: when rewriting, use **regex with word boundaries** (Cyrillic-safe lookaround: `(?<![а-яА-ЯёЁa-zA-Z0-9])<word>(?![а-яА-ЯёЁa-zA-Z0-9])`). Naive `str.replace()` corrupts source — there have been incidents. Prefer Python `re.sub` over `sed`.
   - Instruction to verify with `make spell` at the end and report the new issue count + a list of what was done.
5. After the subagent returns: re-run `make spell` yourself to confirm. If still red, report what's left to the user — do not loop, the user decides whether to re-invoke.
6. Briefly summarize to the user: number of words rewritten, number whitelisted, current `make spell` status.

## Why a subagent (and Haiku specifically)

Per-word classification and find-and-replace are mechanical — no project judgment beyond following the CLAUDE.md rule list. Haiku is plenty smart for that, runs cheap, and keeps the main conversation context free of long cspell logs and per-word back-and-forth. Don't invoke the subagent on the opus level — it's overkill for find-and-replace.

## Triggers

- `/fix-spell` slash command
- "fix spelling", "clean up spell", "почини спел", "поправь cspell"
- User mentions `make spell` is red and asks for help

## Anti-patterns

- Don't bulk-rewrite via `sed -i ''` or `str.replace()` — kerning of Cyrillic stems vs prefixes will produce artifacts like «глобальная переменнаяьный» from `глобал → глобальная переменная` hitting `глобальный`. Use Cyrillic-safe word-boundary regex.
- Don't push borderline calques into the whitelist «just to make it green». If a word has a clean Russian alternative, the source gets rewritten — that's the whole point of this skill.
- Don't ask the user about every word — the rules are clear; only escalate when something is genuinely ambiguous (e.g., a calque used in code as an identifier name).
- Don't run `make spell` more than 2-3 times. If it's still red after the subagent's pass, surface what's left to the user; don't enter a retry loop.
