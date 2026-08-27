# AGENTS.md

Rules for AI agents working in this repository (SMA1 Framework fork + connection-string app logic).

## Confirm before complexity

Ask the user before adding:

- External dependencies (npm packages, CDN libraries, frameworks)
- Build tools or bundlers (Vite, Webpack, Rollup, etc.)
- Non-trivial architecture (state managers, routers, SSR)

Prefer the simplest approach that fits the existing stack. `package.json` already exists for framework sync/verify and `node --test` scripts — do not add runtime npm deps without asking.

## Stay vanilla

- Plain HTML, CSS, and JavaScript ES modules
- No build step unless explicitly approved
- App logic lives in `app/main.js` and `app/connection-string/`

## Reuse the design system

- Use CSS custom properties from `app/tokens.css` (`--bg`, `--accent`, etc.)
- Fork accent overrides go in `app/css/app.css` (never brand-patch `tokens.css`)
- Use existing component classes: `.btn`, `.btn-primary`, `.modal`, `.banner`, `.theme-toggle`
- Add or edit inline UI icons only in `app/utils/icons-framework.js` / `app/utils/icons-app.js` — do not invent SVG paths or duplicate them in HTML
- Do not introduce parallel styling systems (Tailwind, CSS-in-JS, component libraries)

## Page boot conventions

Every HTML entry point should:

1. Include blocking `app/theme-init.js` in `<head>` (prevents theme flash)
2. Link `app/styles.css` (imports `tokens.css` → `css/framework.css` → `css/app.css`)
3. Call `initShell()` from `app/shell/shell.js` as the first step in the page module

`initShell()` renders shared chrome via `renderPageShell()` (`app/shell/render-shell.js`), then boots icons, theme toggle, and page nav. Do **not** duplicate footer, theme toggle, or jump-up markup in HTML.

Optional `renderPageShell({ repoUrl, brandUrl, brandName })` / `initShell({ … })` overrides for forks. Fork config: `app/config.js` (`repoUrl`, `appUrl`, also-see).

## Module conventions

| Pattern | Use for |
| -------- | ------- |
| `initX({ … })` | Single instance (dialog, combo, dropdown) |
| `initXBlocks(root)` / `initXs(root)` | Scan a subtree for blocks |
| `initShell()` | Standard page boot |
| `setHidden(el, hidden)` | Toggle visibility — always sets **both** `.hidden` class and `hidden` attribute |
| `onDocumentClickOutside()` / `onDocumentEscape()` | Shared document listeners — do not add per-instance `document` listeners for these |

### Document listeners

`app/utils/document-listeners.js` registers **one** click and one keydown handler on `document`. Modules register callbacks:

- **Click outside:** all handlers run on every click (menus close when click is outside)
- **Escape:** handlers sorted by priority (higher first). Return `true` when handled. Dialogs use priority `100`, menus use `50`.

When a module registers listeners, store and call the returned unsubscribe in `destroy()` if provided.

### Visibility

Always use `setHidden()` from `app/utils/dom.js` when showing/hiding elements programmatically. Do not toggle `.hidden` alone.

### Icons

- Declare icons with `data-icon="name"` and optional `data-icon-class="…"` in HTML
- Call `initIcons()` (via `initShell()`) to inject SVGs — do not re-call for the same static markup
- Catalogue: `app/utils/icons-framework.js` + `app/utils/icons-app.js` merged by `app/utils/icons.js`
- Source SVGs via the `add-icon` skill / [Icônes Material Icons Round](https://icones.js.org/collection/ic?s=info&variant=Round); never invent path data
- Alias with `{ ref: "other-icon" }` when needed

## Connection string app

| Path | Role |
| ---- | ---- |
| `app/connection-string/types.js` | Database ids, formats, `isSupported` |
| `app/connection-string/defaults.js` | Ports, driver presets |
| `app/connection-string/fields.js` | Labels, required field ids |
| `app/connection-string/format.js` | Shared keyword helpers |
| `app/connection-string/builders/*.js` | Per-engine builders |
| `app/connection-string/index.js` | `buildConnectionString` entry |
| `app/connection-string/__tests__/` | Golden-string tests (`npm test`) |

After intentional keyword changes, regenerate goldens with `npm run test:goldens`.

## CSS structure

| File | Contents |
| ---- | -------- |
| `app/styles.css` | Entry point — `@import` only |
| `app/tokens.css` | Reset, `:root` tokens, dark theme, base typography, `.hidden`, reduced-motion |
| `app/css/framework.css` | Framework partials (synced) |
| `app/css/app.css` | Fork-owned overrides (accent, layout) |

Keep HTML linking only `styles.css`.

Respect `prefers-reduced-motion: reduce` — transitions live in components; global overrides are in `tokens.css`. JS scroll behaviour should use `prefersReducedMotion()` from `app/utils/dom.js`.

## Keep GitHub Pages deployable

- Entry HTML files live at the repo root (`index.html`)
- Shared assets live under `app/`
- Avoid features that require a backend or server-only APIs
- ES modules need a local server for development (`npx serve .`)

## Match aesthetics

Match the established look (based on [pqm-stepper](https://github.com/filcuk/pqm-stepper)):

- GitHub-inspired palette and 6px border radii
- System UI font stack
- Light / dark / auto theme via `data-theme` on `:root`
- Blocking `app/theme-init.js` in `<head>` to prevent flash of wrong theme

## Accessibility

- Dialogs: focus trap, Escape to close (via document listener), restore focus, `aria-modal` and labelled titles
- Toggle buttons: `aria-pressed` where state toggles
- Tooltips: `aria-describedby` linking trigger to `#tooltip` on show/hide; keyboard focus support
- Prefer semantic HTML (`header`, `main`, `footer`, `button`)
- Popup menus: `aria-expanded` on toggle buttons
