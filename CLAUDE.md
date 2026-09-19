# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

A single-page to-do app in `ToDo/`: plain HTML + CSS + vanilla JavaScript, no framework, no build step, no dependencies, no server.

## Commands

- **Run:** `open ToDo/index.html` (or open the file in any browser). There is no build, lint or test setup.
- **Syntax-check `app.js`:** `node` is not installed on this machine, so run this from inside `ToDo/` (it is already allow-listed in `.claude/settings.local.json`):
  ```
  osascript -l JavaScript -e 'ObjC.import("Foundation"); var s = $.NSString.stringWithContentsOfFileEncodingError("app.js", $.NSUTF8StringEncoding, null).js; try { new Function(s); "syntax ok" } catch (e) { "SYNTAX ERROR: " + e }'
  ```
  This only checks syntax. App behaviour can't be run headlessly, so behavioural changes need a manual check in a browser.

## Architecture

State lives in one in-memory `tasks` array in `ToDo/app.js`, shaped `{id, text, done, priority, due}`. The pieces that span files or aren't obvious from a single function:

- **Data flow is always mutate, then `save()`, then `render()`.** Helpers such as `toggle`, `setPriority`, `setDue`, `rename` and `remove` follow this. `render()` rebuilds the whole list from scratch, so transient DOM state (focus, an open edit box) is lost on every call. `startEdit()` copes with this using a `finished` flag so Enter, Escape and blur can't both fire.
- **Display order is computed in `render()` on a copy of `tasks`:** priority (`PRIORITY_ORDER`), then due date (`compareDue`, tasks with no date last), then insertion order (stable sort). The stored array stays in insertion order, and the undo logic depends on that.
- **Undo:** deletes stash `[{task, index}]` in `pendingUndo`, with indexes into the stored array. `undo()` splices them back in ascending order. The "storage full" warning in `save()` also goes through `showToast`.
- **Persistence:** localStorage keys `todo-tasks` and `todo-theme`. `load()` migrates older saved tasks by defaulting a missing `priority` (medium) and `due` (empty), so any new task field needs a default there.
- **Theme:** a `data-theme` attribute on `<html>`, with colours as CSS variables in `style.css` and a dark override under `:root[data-theme="dark"]`. A small inline script in the `<head>` of `index.html` sets the attribute before first paint to avoid a light-mode flash. It duplicates the `todo-theme` key from `app.js`, so keep the two in sync.

## Gotchas

- `style.css` forces `[hidden] { display: none !important; }` because several components set their own `display`. Keep it, or `el.hidden` stops working.
- Due dates are `YYYY-MM-DD` strings compared as text. `today()` builds the local date on purpose, since `toISOString()` gives the UTC date.
- Task ids are `Date.now()`.

## Docs

`ToDo/specs.md` is the living spec (feature list plus technology choices). Update it when adding or changing a feature.
