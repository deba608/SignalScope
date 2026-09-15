# SignalScope AI — UI/UX Pro Max Redesign Playbook

> **Purpose:** Turn the current functional-but-generic shadcn dark UI into a
> world-class, mission-control-grade RF analysis workbench.
> **Stack:** Next.js 14 App Router + shadcn/ui + Tailwind 3.4 + TanStack Query + Plotly `scattergl`/`heatmap` + Lucide.
> **Scope:** Frontend only (`apps/web/`). No backend/API contract changes.
> **How to use:** Feed this file to Claude / any coding agent section-by-section. Each section has `Audit → Target → Implementation`.

Reference files audited:
- `src/app/page.tsx` — Dashboard
- `src/app/login/page.tsx` — Auth
- `src/app/recordings/page.tsx` — Library
- `src/app/projects/[id]/page.tsx` — Analysis Workspace (most important)
- `src/components/Layout.tsx` — Shell / Sidebar
- `src/components/UploadWizard.tsx` — 3-step wizard
- `src/components/ProvenanceBadge.tsx` + `EstimateCard` — Trust system (core differentiator)
- `src/components/PlotlyChart.tsx`, `src/app/globals.css`, `tailwind.config.ts`

> Note on skills: `ui-ux-pro-max` / Claude Skills are not installed in this
> workspace (only `customize-opencode` is available). This playbook bakes in
> the equivalent Pro-Max principles — design tokens, hierarchy, states,
> accessibility, data-viz craft — so any agent can execute without the plugin.

---

## 1. Design Vision — "RF Mission Control"

### 1.1 Product personality
SignalScope is **offline, explainable, provenance-tracked**. The UI must scream:
`precise · trustworthy · technical · calm under complexity`.

Not a generic SaaS dashboard. Think:
**Keysight PathWave + Linear.app + Vercel Geist + oscilloscope phosphor.**

Principles:
1. **Evidence first** — every number shows *source × confidence × evidence*. Never a naked value.
2. **Density with rhythm** — lab tool, not marketing site. Compact cards, 12px labels, mono numerals.
3. **Signal-first color** — dark lab background, I=cyan, Q=orange, PSD=blue, constellation=green. Consistent across all plots.
4. **Zero dead-ends** — every empty / loading / error state has a next action.
5. **Keyboard + speed** — analysts live in the workspace. `Cmd+K`, `R` to run, `1-5` for tabs.

### 1.2 Design tokens (implement first)

Replace the current generic blue-on-dark in `globals.css` with a proper lab system.

```css
/* globals.css — Pro Max tokens */
@layer base {
  :root {
    /* Lab surfaces — true dark with blue tint, not pure black */
    --background: 222 47% 5%;      /* #060B14 */
    --surface-1: 222 47% 7%;       /* card */
    --surface-2: 217 33% 10%;      /* raised */
    --surface-3: 217 33% 14%;      /* hover */

    --foreground: 210 40% 98%;
    --muted-foreground: 215 20% 62%; /* bump from 55% for a11y */

    /* Brand — signal cyan, not generic blue */
    --primary: 187 92% 52%;        /* #1EC8EE phosphor cyan */
    --primary-foreground: 222 47% 5%;

    /* Signal channels — NEVER change these */
    --ch-i: 199 89% 60%;           /* I  #38BDF8 */
    --ch-q: 24 95% 60%;            /* Q  #FB923C */
    --ch-psd: 217 91% 60%;         /* PSD #3B82F6 */
    --ch-const: 142 76% 45%;       /* constellation #22C55E */

    /* Provenance — exact vs inferred */
    --prov-exact: 217 91% 60%;     /* blue */
    --prov-high: 142 76% 45%;      /* green >=0.7 */
    --prov-med: 45 93% 55%;        /* amber 0.4-0.7 */
    --prov-low: 0 84% 60%;         /* red <0.4 */

    --border: 217 33% 16%;
    --ring: 187 92% 52%;
    --radius: 0.75rem;             /* 12px — more modern than 8px */
  }
}
```

Typography:
- **Sans:** `Inter` (UI) — `font-feature-settings: "tnum", "cv11"`
- **Mono:** `JetBrains Mono` (all numbers, filenames, bits, hex) — add `font-mono` to every `formatBytes/formatFrequency/formatDuration` output.
- Scale: page `text-2xl font-semibold tracking-tight` (not `text-3xl font-bold`), card titles `text-sm font-medium`, micro-labels `text-[11px] uppercase tracking-wider text-muted-foreground`.

Add to `layout.tsx`:
```tsx
import { Inter, JetBrains_Mono } from "next/font/google";
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
```

Extend `tailwind.config.ts`:
```ts
fontFamily: {
  sans: ["var(--font-sans)", "Inter", "system-ui"],
  mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
},
boxShadow: {
  glow: "0 0 24px -6px hsl(var(--primary) / 0.4)",
  card: "0 1px 2px rgb(0 0 0 / 0.4), 0 8px 24px -12px rgb(0 0 0 / 0.5)",
},
keyframes: { pulsedot: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.4" } } },
```

---

## 2. Global Shell (`Layout.tsx`) — Audit → Fix

**Audit now:**
- Sidebar only 2 items, no project context, no status dot, no footer version.
- Mobile header unstyled, no topbar, no `Cmd+K`, no job ticker.
- Auth loading is bare text.

**Pro Max target:**
```
┌────────┬────────────────────────────────────────┐
│ Logo   │ Breadcrumb / Project name + Job pill   │ Topbar (search, status, avatar)
│ Nav    │                                        │
│ - Dash │  Main (max-w-[1400px] mx-auto p-6)     │
│ - Lib  │                                        │
│ Recent │                                        │
│ ─────  │                                        │
│ User   │                                        │
└────────┴────────────────────────────────────────┘
```

Implementation:
1. **Topbar (new):** `src/components/Topbar.tsx` — breadcrumb (`Dashboard / Recordings / <project>`), global running-job pill (green pulsing dot + `%`), `Cmd+K` button, avatar dropdown.
2. **Sidebar upgrade:**
   - Logo block: gradient radio icon in `bg-primary/10 rounded-lg p-1.5` + `SignalScope` + `AI · v0.1` micro badge.
   - Nav items with `active: bg-primary/10 text-primary shadow-glow` + count badges (`Recordings (12)`).
   - New section `RECENT PROJECTS (3)` — fetch via `dashboardApi.stats`, show dot by status.
   - Footer: user email truncated + `Log out` + `API ● Online` health dot (hit `/health`).
3. **Loading:** replace all `Loading...` text with `<Skeleton>` rows. Add `src/components/PageSkeleton.tsx`.
4. **Focus:** `*:focus-visible:ring-2 ring-primary ring-offset-2 ring-offset-background`.
5. **Empty auth guard:** animated logo pulse, not static text.

---

## 3. Dashboard (`app/page.tsx`)

**Audit:** 3 identical stat cards, no deltas, no hero, no quick actions, plain list rows, raw `toLocaleDateString()`.

**Pro Max:**
1. **Hero row:** `Good evening, analyst.` + date + primary CTA `+ New Recording` + secondary `View docs`. Left-aligned, `tracking-tight`.
2. **Stat cards:** add `+2 this week` delta, sparkline (tiny Plotly or SVG), icon in tinted tile:
   ```tsx
   <Card className="shadow-card hover:border-primary/40 transition">
     <CardHeader className="flex flex-row items-center justify-between pb-2">
       <CardTitle className="text-[13px] font-medium text-muted-foreground">Recordings</CardTitle>
       <div className="rounded-md bg-sky-500/10 p-1.5"><Library className="h-4 w-4 text-sky-400"/></div>
     </CardHeader>
     <CardContent>
       <div className="font-mono text-3xl font-semibold tabular-nums">12</div>
       <p className="text-xs text-muted-foreground mt-1"><span className="text-green-400">+2</span> this week</p>
     </CardContent>
   </Card>
   ```
3. **Running jobs:** replace plain list with progress bar + stage + ETA + `View` link. Poll at 2s (already done in project page — reuse hook `useJobPoll(jobId)`).
4. **Recent projects/recordings:** table-like rows with mono filename, format badge with color coding (`WAV=sky, IQ=orange, SigMF=violet`), file-size + duration in mono, hover `hover:bg-surface-2`, chevron reveal on hover.
5. **Empty state (critical):** illustration (Lucide `Satellite-Dish` in dashed circle), headline `No signals yet`, copy `Upload a WAV, Raw IQ or SigMF capture to start provenance-tracked analysis.`, CTA + `Try with synthetic generator` link (calls `synth/generator.py` path).
6. Dates: `formatDistanceToNow` (`2h ago`) + full date in tooltip via `title=`.

---

## 4. Login (`app/login/page.tsx`)

**Audit:** centered card on flat bg, generic copy, no product value prop, no password toggle, no caps-lock hint.

**Pro Max — split screen:**
- Left (55%): product panel — animated waveform SVG / CSS grid bg + logo + `Explainable RF analysis. Offline. Provenance-tracked.` + 3 bullets (`No cloud upload`, `Every estimate has evidence`, `WAV · Raw IQ · SigMF`) + footer `Authorized offline use only`.
- Right (45%): form card `max-w-sm` — `Sign in to SignalScope`, show/hide password (`Eye/EyeOff`), `Remember me`, error shake animation, submit loading spinner (`Loader2 animate-spin`), OAuth disabled note.
- Add `aria-labels`, `autocomplete="email/current-password"`, Enter-to-submit (native form already good — keep `react-hook-form+zod`).
- Background: `bg-[radial-gradient(...)]` + subtle grid `bg-grid-white/[0.02]`.

---

## 5. Recording Library (`app/recordings/page.tsx`)

**Audit:** vertical card list, `confirm()` for delete (blocks UI, ugly), no search/filter/sort, no grid toggle, headers duplicated.

**Pro Max:**
1. **Toolbar:** search input (`Search recordings... ⌘K`), format filter pills (`All · WAV · IQ · SigMF`), sort select (`Newest · Largest · Name`), view toggle (list/grid `LayoutGrid/List`).
2. **Row redesign:** checkbox (bulk delete/export), file icon tinted by format, filename mono `text-sm font-medium truncate`, meta line mono `text-xs`: `WAV · 24.4 MB · 12.3s · 1.00 MHz · 2.4k samples`, status dot, actions on hover only (`Analyze` primary small + overflow `MoreHorizontal` → Download / Duplicate / Delete).
3. **Delete:** replace `confirm()` with `AlertDialog` (shadcn) — `Delete "file.iq"? This cannot be undone.` + red confirm + toast with `Undo` (re-upload cache or soft-delete).
4. **Empty/search-empty:** two variants — `No recordings` vs `No results for "xyz"` + `Clear search`.
5. **Upload button:** sticky header, `sticky top-0 backdrop-blur bg-background/80 border-b z-10`, primary with `Upload` icon + kbd hint.

---

## 6. Upload Wizard (`UploadWizard.tsx`) — biggest friction point

**Audit:** works, but stepper is 3 tiny bars, no file validation feedback, no real progress %, no drag-active illustration, SigMF order confusing, preview charts unthemed.

**Pro Max steps:**

### Step 1 — Select
- Dropzone: `border-dashed rounded-2xl p-10`, drag-active: `border-primary bg-primary/5 scale-[1.01] shadow-glow` + icon swap to `FileUp`.
- File list: icon + name mono + size + format badge auto-inferred (`inferFormatFromFilename` already exists — surface it: `Detected: Raw IQ ✓`) + remove `X` + total size footer.
- Validation inline: `⚠️ Need .sigmf-data companion` if only `-meta` selected, oversize warning `>500MB — preview will downsample`.

### Step 2 — Configure
- Format cards (not dropdown): 3 selectable tiles `WAV / Raw IQ / SigMF` with icon + desc + selected ring.
- Raw IQ params: grouped in `Card` with tooltips (`Info` icon → `int16 LE interleaved is RTL-SDR default`), presets row: `[RTL-SDR] [HackRF] [USRP]` one-click fill.
- Upload progress: real `Progress` + stage label `Uploading… 42% · 12 MB/s` (use `XMLHttpRequest` or `axios onUploadProgress` — current `fetch` fake 30→70→100 must go).
- Sticky footer: `Back` ghost left, `Upload & Preview` primary right with spinner.

### Step 3 — Preview
- Header stats strip: `4,096 of 2.1M samples · 1.00 MHz · 2.04s window`.
- Charts side-by-side with themed Plotly (see §8), toolbar (`Reset zoom`, `Download PNG` via `Plotly.toImage`).
- Actions: `Cancel & Delete` ghost-destructive left, `Confirm → Analyze` primary right (creates project immediately, not just `router.push("/recordings")`).

---

## 7. Analysis Workspace (`projects/[id]/page.tsx`) — hero screen

This is where analysts spend 90% of time. Current page is long-scroll soup. Redesign as **3-zone workbench**:

```
[Header: Project name + file + Run button + job status]
[Meta strip: 4 KPIs + badges]
[Tabs: Overview | Signal | Spectrum | Demod | FEC | Correlation]
[Tab content: charts left (2fr) + insights right (1fr)]
```

Implementation checklist:
1. **Sticky header:** `sticky top-0 backdrop-blur` with project name editable (pencil), filename mono + format badge, right: `Run` button states — `idle: Play Run`, `running: Loader2 Analyzing 42%` (progress bar under), `done: RotateCcw Re-run`, `failed: TriangleAlert Retry`.
2. **Job progress:** not just text — `Progress value=%` + stage timeline (`queued → loading → PSD → classify → demod → done` with check icons). Extract `useJobPoll` hook.
3. **ROI selector:** dual `Slider` is good — add preset buttons `[Full] [First 10%] [Burst]` + numeric inputs (seconds + samples) synced both ways + zoom-to-burst button.
4. **Chart tabs:** replace 2-button + 5-button groups with shadcn `Tabs` + icons + kbd (`1-5`). Persist in URL `?tab=spectrum&roi=0-100` for shareability.
5. **PSD:** log-x toggle, peak marker annotation, hover `Freq: 12.4 kHz · -42.1 dB` crosshair, `Viridis` → `Turbo` for waterfall (better contrast on dark).
6. **Constellation:** color by density (`marker.color` array), decision-boundary overlay for QPSK/QAM, `lasso` select → show selected symbol stats.
7. **Bits/hex panels:** mono block with `Copy` + `Download .bin` buttons (`navigator.clipboard.writeText`), line-wrap toggle, `CRC OK` green pill vs `mismatch` red.
8. **Parameter Estimates grid:** sort by confidence desc, filter `All / Exact / Estimated`, each card (see §9).
9. **Deep-link evidence:** every `Evidence (n)` expands inline, not alert.

Mobile: stack to single column, charts `height: 320`, tabs scrollable `overflow-x-auto`.

---

## 8. Provenance System (`ProvenanceBadge.tsx` + `EstimateCard`) — differentiator, make it shine

**Audit:** emoji icons (📄✍️📏🧮🔎❓) look toy-like, break in some fonts, fail a11y. Confidence colors text-only, low contrast.

**Pro Max:**
1. **Replace emojis with Lucide:**
   ```
   metadata      → FileText   blue
   user_supplied → PenLine    violet
   measured      → Ruler      green
   estimated     → Calculator amber
   hypothesis    → Search     orange
   unknown       → HelpCircle gray
   ```
2. **Badge:** `rounded-full border px-2.5 py-0.5 text-[11px] font-medium` + dot + `Tooltip` (`Source: measured — exact value from file header`).
   ```tsx
   <Tooltip><TooltipTrigger><Badge className="bg-blue-500/10 border-blue-500/30 text-blue-300">
     <FileText className="h-3 w-3"/> metadata · exact
   </Badge></TooltipTrigger><TooltipContent>...</TooltipContent></Tooltip>
   ```
3. **Confidence:** tier pill, not just number:
   - `≥0.7 High` green, `0.4–0.7 Med` amber, `<0.4 Low` red, `null Hidden` gray dashed.
   - Show bar: 40px `Progress` mini + `0.82` mono. Never show `0.8199999` — `toFixed(2)`.
4. **EstimateCard:** header label `text-[11px] uppercase tracking-wider`, value `font-mono text-2xl tabular-nums`, unit muted, footer `ProvenanceBadge + ConfidenceBar`, expanders as `Collapsible` with chevron rotation, warnings as `Alert` amber with `TriangleAlert` icon (not ⚠️ emoji), alternatives as mini-table (value | conf | evidence count).
5. Add `ProvenanceLegend` component (once, atop workspace): 6 dots with labels — teaches trust model.

---

## 9. Plotly Theming (applies to all charts)

Create `src/lib/plotlyTheme.ts`:

```ts
export const plotlyDark = {
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(0,0,0,0)",
  font: { family: "Inter, system-ui", size: 11, color: "#94A3B8" },
  xaxis: { gridcolor: "rgba(148,163,184,0.12)", zerolinecolor: "rgba(148,163,184,0.2)", tickfont: { size: 10 } },
  yaxis: { gridcolor: "rgba(148,163,184,0.12)", zerolinecolor: "rgba(148,163,184,0.2)", tickfont: { size: 10 } },
  margin: { l: 48, r: 16, t: 32, b: 40 },
};
export const CH = { I: "#38BDF8", Q: "#FB923C", PSD: "#3B82F6", CONST: "#22C55E" };
```

Apply in `PlotlyChart.tsx`: `config={{ responsive: true, displaylogo: false, modeBarButtonsToRemove: ["lasso2d","select2d"] }}` + loading skeleton + `No data` empty + `toImage` download. Wrap with `React.memo` + `useMemo` data (workspace already downsamples — keep `downsamplePair` caps: wave 20k, scatter 5k).

---

## 10. States, A11y, Motion — non-negotiable checklist

- [ ] **Loading:** skeletons everywhere (`Skeleton className="h-24"`), chart shimmer, never bare `Loading...`.
- [ ] **Error:** `Alert variant=destructive` + `Retry` button + `Copy error ID`. Log to console with project/recording IDs.
- [ ] **Empty:** illustration + headline + action (see §3.5).
- [ ] **Toasts:** success green check, destructive red, action (`View project`, `Undo`). Auto-dismiss 4s.
- [ ] **A11y:** contrast ≥4.5:1 (bump `muted-foreground` to 62% lightness), all icon-buttons `aria-label`, charts `role="img" aria-label="..."` + data table fallback (`<details>View as table</details>`), focus rings, `prefers-reduced-motion` disables pulse/spin.
- [ ] **Motion:** `transition-colors duration-150`, card hover `hover:border-border/80 hover:shadow-card`, buttons `active:scale-[0.98]`, tab content `animate-in fade-in-50 duration-200`, number count-up on dashboard (`requestAnimationFrame` or `framer-motion` if added).
- [ ] **Responsive:** `max-w-[1400px]`, grids `grid-cols-1 md:2 lg:3`, sidebar → drawer (already), workspace tabs scroll, tables → cards on mobile.

---

## 11. File-by-File Build Order (for Claude)

Execute in this order — each is independently reviewable:

1. `src/app/globals.css` + `tailwind.config.ts` + `src/app/layout.tsx` — tokens, fonts, focus, scrollbar styling.
2. `src/lib/plotlyTheme.ts` (new) + `src/components/PlotlyChart.tsx` — theme, memo, toolbar.
3. `src/components/ProvenanceBadge.tsx` — Lucide swap, tier pills, legend, EstimateCard v2.
4. `src/components/Layout.tsx` + `src/components/Topbar.tsx` (new) + `PageSkeleton.tsx` (new).
5. `src/app/login/page.tsx` — split screen.
6. `src/app/page.tsx` — hero, deltas, job progress, empty state.
7. `src/app/recordings/page.tsx` — toolbar, filters, AlertDialog delete.
8. `src/components/UploadWizard.tsx` — format tiles, presets, real progress, themed preview.
9. `src/app/projects/[id]/page.tsx` — sticky header, Tabs, URL state, bits copy/download.
10. `src/lib/utils.ts` — `formatRelativeTime()`, `formatConfidence()`, shared `FILE_FORMAT_META {wav:{label,color,icon}, raw_iq:{...}, sigmf:{...}}`.

Acceptance per file: `npm run lint && npm test` (Vitest) still green; no new `any` without eslint-disable; light-house a11y ≥95.

---

## 12. Copy-paste prompts for Claude

> **Prompt 1 — tokens:** "In `apps/web`, implement §1.2 of `docs/UI-REDESIGN-PRO-MAX.md`: Inter + JetBrains Mono, lab color tokens, glow/card shadows, focus rings. Update `globals.css`, `tailwind.config.ts`, `layout.tsx`. Keep dark-only, no light mode."
>
> **Prompt 2 — provenance:** "Rewrite `ProvenanceBadge.tsx` per §8: replace all emoji with Lucide, add confidence tier pills + mini progress, add ProvenanceLegend, restyle EstimateCard with mono numerals and shadcn Collapsible/Alert. Keep props backward-compatible so existing tests pass, then add tests for 4 tiers."
>
> **Prompt 3 — workspace:** "Refactor `app/projects/[id]/page.tsx` per §7 into sticky header + shadcn Tabs (persist `?tab=`), extract `useJobPoll`, add Copy/Download for bits/hex, themed Plotly via `lib/plotlyTheme.ts`. No API changes."
>
> **Prompt 4 — wizard:** "Redesign `UploadWizard.tsx` per §6: format select tiles, SDR presets, real upload progress, themed preview with PNG download, Confirm creates project. Keep `inferFormatFromFilename` behavior."

---

## 13. What NOT to do

- No light mode (lab tool is dark-first; adds maintenance).
- No new chart lib (stay on Plotly `scattergl` — already perf-tuned).
- No backend changes, no new routes, no auth flow changes.
- No emoji in UI (Lucide only).
- No `confirm()` / `alert()` — shadcn Dialog only.
- No unformatted floats — all DSP numbers via `toFixed` / `toLocaleString` + mono.

---

*Generated from audit of SignalScope AI MVP (Next.js 14 + FastAPI + signalscope_dsp). Implement §11 in order; review each PR with `npm run dev` at `localhost:3000` + `npm test`.*
