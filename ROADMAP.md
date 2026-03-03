# Todo.txt MailExtension – Roadmap

This document outlines planned and potential future work for the Todo.txt MailExtension. Features are grouped by theme; the **recommended order of implementation** is given at the end so that each step builds on the previous one without blocking.

---

## Recommended order of implementation

| Phase | Focus | Sections below |
|-------|--------|----------------|
| **0a** | Repository migration (own repo, URLs, structure) | § 6 |
| **0b** | Legacy / dead code cleanup | § 7 |
| **1** | Dual UI: popup (pending only) + “Open in tab” (full page) | § 1 |
| **2** | Full tab page: pending + done, same actions, no filters yet | § 1 |
| **3** | Full tab: filters, search, sort, grouping (power view) | § 4 (first part) |
| **4** | Configuration and portability (read-only, errors) | § 3 |
| **5** | Calendar integration Phase 1 done; Phase 2 (conflict resolution, etc.) planned | § 2 |
| **6** | Planning window (backlog + calendar drag‑drop) | § 5 |
| **7** | Sleek-style advanced (recurrence, archiving, file watch, i18n) | § 4 (rest) |

Phases **0a** (repository migration) and **0b** (legacy/dead code cleanup) are listed in sections § 6 and § 7 below; they are recommended before or in parallel with phase 1.

---

## 1. Dual UI: popup (quick) + tab (full page)

**Goal:** Keep the toolbar button for a fast glance, and add an explicit way to open a full page. Split responsibilities so the popup stays minimal and the tab becomes the “power” interface.

**Current state:** One popup shows all tasks (pending + done), add, complete, edit, refresh, options.

**Target state:**

- **Popup (quick view)**
  - Shows **only pending** tasks (no items from `done.txt`).
  - Add task, Refresh, link to Options.
  - Optional: “Open in tab” link/button that opens the full page in a new tab.
  - Purpose: answer “what’s left?” and add one thing in a couple of seconds.

- **Full page (tab)**
  - Opened via “Open in tab” (from popup or from a menu). Same page can be the target of a future sidebar if Thunderbird supports it.
  - **Phase 1 (recommended first):** Same content as today but in a tab: pending + done (e.g. two sub-tabs or one list with a toggle), add / complete / edit / refresh / options. No new features yet.
  - **Phase 2 (after § 4 first part):** This tab becomes the “power” view: filters, search, sort, grouping, and later the planning window (§ 5).

**Planned steps:**

1. Add a dedicated full-page HTML/JS (e.g. `tab/tab.html`) or reuse popup HTML in a tab via `browser.tabs.create({ url: ... })`. Prefer a dedicated page so the popup can be simplified without sharing layout constraints.
2. In the popup, request only **pending** items from the backend (e.g. filter by `isComplete === false` or equivalent API).
3. Add an “Open in tab” control in the popup that opens the full page (same list as today: pending + done).
4. Optionally add a menu entry or secondary action “Open Todo.txt in tab” so the full page is discoverable without opening the popup first.
5. Document in README: toolbar click = quick popup (pending only); “Open in tab” = full page (pending + done, later with filters and planning).

This establishes the foundation for all later UX work: popup = quick, tab = powerful.

---

## 2. Calendar integration (Lightning)

**Phase 1 (done – Thunderbird 140.7 ESR):**

- **Experiment API:** Integration uses the webext-experiments calendar API (`calendar.calendars`, `calendar.items`) shipped in the extension (`experiments/calendar/`). A local calendar "Todo.txt" is created when the user enables integration in Options.
- **Sync:** Only tasks with `due:YYYY-MM-DD` are synced. Bidirectional sync: todo.txt → calendar (push on file change / "Sync now") and calendar → todo.txt (onCreated/onUpdated/onRemoved). Deduplication avoids loops (normalized title+due key).
- **Options:** Toggle to enable/disable integration, calendar selector, "Sync now" button, "Export to ICS" fallback when the API is unavailable, "Copy last sync log" for debugging.
- **Docs:** `docs/calendar-integration.md`, `docs/experiments-calendar-analysis.md`. Tasks appear in Lightning **Tasks** view, not the day grid.

**Phase 2 (planned):**

- Richer conflict resolution (e.g. timestamps), optional recurrence mapping, and further UX/performance improvements once the Experiment API is stable and widely available.

---

## 3. Configuration and portability

**Done:**

- **Read-only mode:** Option in Options → Behavior to never write to `todo.txt`/`done.txt` (preference `readOnly`). When enabled, add/modify/complete/delete and calendar→todo sync skip writing; sync todo→calendar (read) still works.
- **Error reporting:** Clearer, localized messages for missing files, locked files, and network/remote locations. FSA errors are mapped to `FILE_NOT_FOUND`, `FILE_CANNOT_WRITE`, `FILE_LOCKED`, `FILE_NETWORK_OR_REMOTE`; existing messages (e.g. `error_filesNotSpecified`) improved in _locales.

---

## 4. Feature parity with sleek-style todo.txt managers

Long-term goal: approach the UX and power of dedicated managers like [sleek](https://github.com/ransome1/sleek), within Thunderbird’s constraints. These features belong primarily in the **full tab page** (§ 1), not in the popup.

**Phase A – Filters, search, sort (recommended after dual UI and basic tab):**

- **Rich filtering:** By project (`+project`), context (`@context`), priority, due date, completed/open; combine multiple filters.
- **Full-text search:** Search box in the tab that filters as you type (title, projects, contexts, add-ons).
- **Sorting and grouping:** Sort by priority, due date, creation date, completion date, etc.; group by project, context, priority, or completion. Persist sort/group preferences in `storage.local`.

**Phase B – Advanced behaviour and housekeeping:**

- **Recurring todos:** Support recurrence conventions (e.g. `rec:1w`, `rec:2m`) and optional UI helpers.
- **Due dates and reminders:** First-class handling of `due:` in the tab UI; optional reminders/alarms when Thunderbird APIs allow (aligned with § 2).
- **Archiving and housekeeping:** Smarter `done.txt` handling (archiving, truncation, split by year, etc.); tools to clean or normalize tasks (e.g. merge duplicate tags, normalize priorities).
- **File watching:** Complement or replace polling so changes from external apps (sleek, CLI) are reflected quickly when the platform allows.
- **Multi-language UX:** Extend localized strings (EN/DE/ES) and use localized date formatting and labels for filters/groups.

All of the above must respect `AGENTS.md` (tests, complexity, no regression of current popup + file sync).

---

## 5. Planning window (backlog → calendar)

Provide a **planning view** that combines the Todo.txt backlog with a calendar, ideally inside the full tab page or as a dedicated sub-view.

- **Backlog pane:** Show all tasks **without a date** (`due:` or similar) as a backlog list, with filtering/grouping as in the main tab.
- **Calendar pane:** Day/week/month view (Thunderbird’s calendar UI when possible, or custom UI). **Drag & drop** from backlog:
  - Onto a **day (all-day)** → set/update date only (e.g. `due:YYYY-MM-DD`).
  - Onto a **time slot** → create a calendar event at that time (when APIs allow), linked to the Todo.txt item if supported.
- **Sync:** Dragging to a date updates Todo.txt; dragging to a time slot creates/updates a calendar event with clear conflict rules when APIs exist.

This depends on § 2 (calendar integration) and on the full tab page (§ 1) existing. First iteration can use a custom calendar-like UI and only `due:` dates; deeper integration with Thunderbird’s native calendar follows once stable MailExtension APIs are available.

---

## 6. Repository migration (own repo)

**Goal:** Move the MailExtension to its own repository so it can be maintained, versioned and published independently from the legacy `todo.txt-ext` codebase.

**Planned steps:**

1. Create a new repository (e.g. GitHub/GitLab) containing only the `webext/` tree (and any shared docs/CI at the root).
2. Set up CI (e.g. lint, tests, optional XPI build) in the new repo.
3. Update all references: README, `manifest.json` (homepage, support URLs if any), `package.json`, links in docs and `_locales`.
4. Document the fork/migration in the new README (credits to original author, link to legacy repo if desired).
5. Optionally: publish the XPI under the new project name/ID or keep the same add-on ID for existing users; document the choice.

Can be done in parallel with or before phase 0b (legacy cleanup). Doing it early keeps the "official" history and issues in one place.

---

## 7. Legacy and dead code cleanup

**Goal:** Remove inherited and unused code so the codebase only contains what the current MailExtension uses, reducing confusion and maintenance cost.

**Planned steps:**

1. **Identify dead code:** Unused modules, experiment code paths that are never called (e.g. calendar experiment if it is no-op on TB 140), commented-out blocks, obsolete polyfills or fallbacks that are no longer needed for the minimum supported Thunderbird version.
2. **Remove or stub experiments:** If an experiment (e.g. `calendarTodoTxt`) cannot work on current TB and has no callers that affect behaviour, either remove it from the build and manifest or replace it with a minimal stub that fails gracefully and is clearly marked as "future" in the code and docs.
3. **Trim legacy leftovers:** References to the old extension structure (paths, names from `todo.txt-ext`), duplicate or unused strings in `_locales`, unused CSS or HTML fragments.
4. **Document what remains:** In README or a short CONTRIBUTING/ARCHITECTURE note, list the active parts of the codebase (background, popup, options, experiments in use) so future contributors know what is live vs. deprecated.

Recommended after or in parallel with repo migration (phase 0a). Cleanup is easier when the repo boundary is clear and the "single product" is the webext only.

---

## Summary

- **Popup** = quick view, **pending only**; “Open in tab” opens the **full page**.
- **Full page (tab)** = main place for power features: pending + done, then filters/search/sort, then planning window, then sleek-style advanced features.
- Implementation order: **repo migration (0a)** and **legacy/dead code cleanup (0b)** first, then dual UI and basic tab (1–2) → filters/search/sort (3) → config/portability (4) → calendar (5) → planning window (6) → recurrence/archiving/file watch/i18n (7).
