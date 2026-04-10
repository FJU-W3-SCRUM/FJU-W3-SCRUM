(The file `d:\FJU\\Mast0102\\W3-E1-E3_LW210_敏捷式軟體開發\\50_Project\\TEST-COPILOT\\.github\\SCAFFOLD.md` exists, but is empty)
# Scaffold: Simple Group Selection Feature

Purpose
- Provide a very small feature so students can open a page and select a group, and teachers can view which groups have been chosen.

User flows
- Student flow: visit `/select-group`, see a list of available groups, click one to join. UI confirms the selection.
- Teacher flow: visit `/teacher/groups` (authenticated view) to see which groups have selections and which are still free.

Minimal routes and components
- Routes:
	- `GET /select-group` (client page): student selection UI
	- `GET /teacher/groups` (client page, teacher view)
- Suggested components/files:
	- `src/app/select-group/page.jsx` — page wrapper that renders `GroupSelector`
	- `src/components/GroupSelector.jsx` — reusable component showing group list and join buttons
	- `src/app/teacher/groups/page.jsx` — teacher overview page showing aggregated selections

Data model (Firestore)
- Collection: `groupSelections` (or `selections`)
	- Document per selection (simple, append-only):
		- `groupId` (string)
		- `studentId` (string)
		- `studentName` (string)
		- `createdAt` (timestamp)

Security & rules (high-level)
- Students only write their own selection documents. Teachers read aggregation.
- For production, enforce rules to prevent duplicate selections per student or excessive changes.

Testing notes
- Unit tests: `__tests__/select-group.test.jsx` — mock Firestore with `vi.mock()` and assert selection flow.
- E2E: `e2e/select-group.spec.js` — optional Playwright test for the full flow (student selects, teacher sees update).

UI test ids (for e2e / playwright)
- `data-testid="group-select-page"` — selection page container
- `data-testid="group-row-<groupId>"` — each group row
- `data-testid="teacher-groups-table"` — teacher overview table

Notes
- Keep the implementation minimal: client-side Firestore writes and real-time listener on teacher overview are acceptable for demo purposes.
