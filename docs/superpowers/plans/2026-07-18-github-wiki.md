# GitHub Wiki Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Yasb-style public wiki staged in-repo and publishable to `rngdle-unlocked.wiki.git`.

**Architecture:** `docs/wiki/**` staging + `scripts/publish-wiki.mjs`; README slimmed to link hub.

**Tech Stack:** GitHub Wiki (git), Markdown, pnpm script

---

### Task 1: Scaffold + publish script

- [x] `docs/wiki/Home.md`, `_Sidebar.md`, core pages
- [x] `scripts/publish-wiki.mjs` + `pnpm wiki:publish`

### Task 2: Fill pages + slim README

- [x] Remaining wiki pages from inventory
- [x] Slim README; AGENTS/HANDOFF wiki pointers; chron0.tech link graph

### Task 3: Bootstrap remote wiki

- [x] Enable wiki / create Home if needed; run publish (best-effort with gh/git)
