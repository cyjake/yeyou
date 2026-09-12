# YEYOU upgrade plan

**Status:** active  
**Product direction:** a social-first East Asian literary image studio, beginning with trustworthy Japanese quotation cards for Chinese-speaking users.

## Implementation status

Updated 2026-09-12:

- **Milestone 0:** complete. The legacy renderer is escaped and testable; its showcase is corrected; a 50-case benchmark records 40 baseline and 10 contextual cases.
- **Milestone 1:** complete. Vite, React and TypeScript build beside the original page, with unit tests and a responsive studio shell.
- **Milestone 2:** complete. The document model, hybrid analyzer, permanent-corpus gate, background worker, correction locks and undo/redo are implemented.
- **Milestone 3:** complete. Bunko, Cinema and Notebook are selectable; desktop and phone editors expose direction and social-ratio controls; complete attribution/context fields, draft restoration and distraction-free preview are working.
- **Milestone 4:** in progress. Native SVG output, 2× PNG download and an export-review gate for uncertain readings, attribution and likely overflow are implemented. Font coverage checks and preview/export visual regression fixtures remain.
- **Milestones 5–8:** not started.

## 1. Product contract

### First audience

Chinese-speaking users who enjoy Japanese literature, anime, film, music and visual culture, and who want to publish tasteful quotation images on platforms such as Xiaohongshu.

### First successful outcome

On a phone, a user can turn a Japanese quotation into a beautiful, correctly annotated, post-ready image in under two minutes.

### Product principles

1. **The artifact comes first.** The output must be worth saving and sharing.
2. **Text is data, not pixels.** Source text, readings, translations and attribution remain structured and editable.
3. **Correctness is visible.** Suggested readings can be corrected, locked and traced to their source.
4. **Taste through constraints.** A few excellent art directions beat dozens of unrelated themes.
5. **AI suggests; the renderer decides.** AI may propose copy, context and design recipes, but deterministic code renders production text.
6. **Regional typography is explicit.** Japanese and Chinese modes have independent language and layout policies.
7. **The web app is primary.** PWA capabilities are added when repeat use justifies them.

## 2. First-release scope

### Must have

- Japanese quotation input and editing.
- Context-aware furigana suggestions.
- Token-level reading correction and “lock this reading.”
- Source, work title, speaker/author and Chinese interpretation fields.
- Vertical and horizontal composition.
- Three exceptional templates.
- Common portrait, square and landscape social ratios.
- High-resolution PNG export.
- Print-quality PDF shortly after PNG.
- Local draft persistence.
- Responsive phone and desktop editor.
- A small, carefully sourced example gallery.

### Later

- Installable/offline PWA.
- Accounts and cloud synchronization.
- Public profiles, feeds, likes or comments.
- AI-generated backgrounds and style extraction.
- Full Chinese copybook system.
- Historical 碑帖集字 corpus.
- Native mobile applications.

### Explicit non-goals for v1

- Recreating Canva or Figma.
- Exposing every CSS property.
- Guaranteeing automatic readings without user review.
- Rendering final text through an image-generation model.
- Shipping a large unlicensed collection of contemporary quotations or lyrics.

## 3. Recommended stack

### Application

| Concern | Choice | Reason |
|---|---|---|
| Build and development | Vite | Fast, simple and well suited to a client-first creative tool |
| UI | React + TypeScript | Structured editor state, reusable controls and a broad ecosystem |
| Accessible primitives | Radix UI through selected shadcn components | Good editor chrome without imposing a visual identity |
| Styling | CSS variables + Tailwind utilities | Tokens for paper/ink themes; fast responsive layout |
| State | Zustand with explicit actions | Small API, easy undo/history integration, no server assumption |
| Validation | Zod | Versioned project documents and safe imports |
| Unit tests | Vitest | Language and document-model tests close to the code |
| Browser/visual tests | Playwright | Export and layout regression coverage |
| Local persistence | localStorage now; IndexedDB when assets arrive | Keep the first document-only draft simple, then migrate before storing media |

This is intentionally a client-side application. A backend is not required until cloud projects, shared editable links, analytics requiring a server, or hosted AI features become real requirements.

### Rendering

- Use semantic HTML for the interactive preview where browser ruby support is sufficient.
- Maintain an independent layout document; never treat `innerHTML` as saved project state.
- Build a deterministic SVG export surface from the same document model.
- Rasterize the SVG to high-resolution PNG in the browser.
- Add PDF export from deterministic layout output, with verified font embedding.
- Keep paper texture and generated decoration on separate layers from text.

### Language processing

- Use the selected hybrid adapter: curated dictionary readings for literary authority plus maintained Kuromoji/IPADIC morphology. See [the bake-off](./japanese-analyzer-bakeoff.md).
- Retain JMdict/Kanjidic-derived data as candidate readings and fallback information.
- Store analysis results, confidence, manual overrides and locks separately.
- Run language processing in a Web Worker so the editor remains responsive.

## 4. Core document model

The first architectural milestone is a serializable model that is independent of React and the DOM.

```ts
type ProjectDocument = {
  schemaVersion: 1;
  id: string;
  locale: "ja-JP";
  content: {
    sourceText: string;
    translationZh?: string;
    contextNoteZh?: string;
    attribution?: {
      work?: string;
      author?: string;
      speaker?: string;
      year?: string;
    };
    tokens: TextToken[];
  };
  layout: LayoutRecipe;
  export: ExportSettings;
  createdAt: string;
  updatedAt: string;
};

type TextToken = {
  id: string;
  surface: string;
  reading?: string;
  readingSource?: "analyzer" | "dictionary" | "manual";
  confidence?: "high" | "medium" | "low";
  locked?: boolean;
};
```

Rules:

- The concatenated token surfaces must always equal `sourceText` exactly.
- Rendering functions must not mutate the document.
- Manual overrides survive re-analysis unless explicitly reset.
- Imported documents are validated and migrated by `schemaVersion`.
- Export fails loudly when a font lacks a required glyph or content overflows.

## 5. Information architecture

### Start screen

- **Paste something memorable** — primary action.
- **Explore a line** — curated examples.
- **Open a draft** — returning-user path.

### Editor

Desktop:

```text
┌──────────────┬─────────────────────────┬────────────────┐
│ Content      │                         │ Style          │
│ Source       │       Live page         │ Template       │
│ Reading      │                         │ Typography     │
│ Context      │                         │ Paper/details  │
└──────────────┴─────────────────────────┴────────────────┘
             Undo · Preview · Export
```

Mobile:

- Page preview occupies the main surface.
- Content, reading and style appear as bottom sheets.
- A persistent Export action remains reachable with one thumb.
- Advanced typography controls are secondary to templates and art-direction presets.

### Correction interaction

- Selecting a token opens its reading candidates.
- Low-confidence tokens receive a quiet visual marker that is never included in export.
- A user can type a custom reading, remove ruby or lock a choice.
- “Review 3 uncertain readings” provides a guided pre-export check.

## 6. Visual system

Use shadcn-derived components only for editor infrastructure. The authored artifact needs its own components and tokens.

### Semantic tokens

- `paper`
- `paper-edge`
- `ink`
- `ink-muted`
- `annotation`
- `cinnabar`
- `faint-rule`
- `selection`
- `warning`

### Canvas primitives

- `PaperSurface`
- `TextFrame`
- `RubyRun`
- `AttributionBlock`
- `TranslationBlock`
- `SealMark`
- `RuleGrid`
- `TextureLayer`

### Initial template family

1. **素纸** — warm paper, Mincho typography and restrained ruby.
2. **夜幕** — dark field, subtle light and strong contrast.
3. **手稿** — tactile stationery, faint rules and a handwritten character.

Chinese mode extends the same visual vocabulary with **朱砂** (fine frames and cinnabar structure) and **水墨** (rice paper and pale ink). Template names describe the visible treatment rather than implying where the quotation came from.

Each template is a typed `LayoutRecipe`, not a pile of one-off CSS. A recipe may expose only the parameters that remain aesthetically safe.

## 7. Delivery roadmap

The time ranges assume one developer working part-time. Each milestone should be independently releasable.

### Implementation status — 2026-09-12

| Milestone | Status | Evidence / remaining gate |
| --- | --- | --- |
| M0 Establish truth | Complete | Permanent 50-case benchmark, legacy safety fixes and corrected showcase markup. |
| M1 Foundation | Complete | Vite/React/TypeScript studio, retained legacy entry and automated checks. |
| M2 Reading engine | Complete | Hybrid worker analyzer, correctable/lockable readings, reconciliation and undo/redo. The supported baseline is 100%; deliberately contextual cases remain visible and correctable. |
| M3 Lovable editor | Complete | Responsive editor, three Japanese templates, ratios, direction, metadata, autosave and preview. |
| M4 Reliable export | Complete for beta | Native deterministic SVG, 2× PNG, image-backed PDF, font-load wait, safe-area/content review and a full template/direction/ratio regression matrix. Real-device font and rendering checks remain part of beta QA. |
| M5 Content loop | Complete | 40 language-aware public-domain examples by mood, provenance, one-click use and device-local aggregate funnel events. |
| M6 Private beta | Ready to run | The product and test kit are ready. This milestone completes only after real participant sessions; see `beta-test-kit.md`. |
| M7 Chinese prototype | Complete | A simplified Japanese/Chinese experience, exact-script warnings and two exportable Chinese templates. Pinyin, script conversion, practice grids and historical 集字 are intentionally deferred. |
| M8 PWA and AI | Complete at client boundary | Installable/cached shell and update recovery; local deterministic suggestions plus a validated server contract for optional cloud assistance. A deployed AI server is intentionally not embedded in this static client. |

### Milestone 0 — establish truth (3–5 sessions)

**Goal:** make the existing behavior measurable before replacing it.

- Create a Japanese corpus with 50–100 cases: compounds, inflections, names, counters, dates, 熟字訓, ateji, punctuation, mixed Latin/numerals and vertical text.
- Add expected token boundaries and readings.
- Add export fixture texts and reference screenshots.
- Fix the incorrect initial `白く` reading and malformed `汽車` markup.
- Escape input instead of interpolating it into HTML.
- Document current behavior that will intentionally change.

**Exit criteria:** tests reproduce known errors and the current demo no longer contains unsafe or visibly incorrect showcase content.

### Milestone 1 — application foundation (3–5 sessions)

**Goal:** introduce the new stack without a big-bang rewrite.

- Scaffold Vite + React + TypeScript alongside the existing files.
- Configure formatting, linting, Vitest and Playwright.
- Establish design tokens, light/dark editor chrome and responsive layout.
- Preserve the current vanilla implementation under a temporary `/legacy` route or static folder until feature parity.
- Add continuous checks for build, types and tests.

**Exit criteria:** the new app loads, the legacy demo remains accessible and automated checks pass.

### Milestone 2 — document and reading engine (1–2 weeks)

**Goal:** trustworthy structured text editing.

- Implement the versioned project schema.
- Build tokenizer/analyzer and dictionary adapters.
- Evaluate analyzers using the permanent corpus.
- Implement token reconciliation so manual overrides survive edits.
- Add a reading-correction UI with candidates, custom values and locks.
- Move analysis into a Web Worker.
- Add undo/redo for content and reading actions.

**Exit criteria:** at least 95% of the agreed baseline corpus is correct automatically, every remaining case is easily correctable, and source text round-trips exactly.

### Milestone 3 — the first lovable editor (1–2 weeks)

**Goal:** make the central creation loop feel finished.

- Implement the three-pane desktop editor and page-first mobile editor.
- Add the three initial templates.
- Support vertical/horizontal direction and portrait/square/landscape ratios.
- Add source, author/speaker, work title, Chinese interpretation and context note.
- Add autosaved local drafts.
- Add a distraction-free preview mode.

**Exit criteria:** a first-time user can make a convincing composition without touching advanced controls.

### Milestone 4 — reliable export (1 week)

**Goal:** make the social artifact production-ready.

- Build deterministic SVG output.
- Export sharp PNG at multiple resolutions.
- Add font loading/coverage checks.
- Add overflow and safe-margin validation.
- Add an export review step for uncertain readings and missing attribution.
- Add PDF after PNG output is stable.
- Create regression tests comparing preview and exported layout.

**Exit criteria:** exported images match the preview, contain the exact source text, render all expected glyphs and remain sharp on high-density mobile displays.

### Milestone 5 — content and launch loop (1 week)

**Goal:** remove empty-canvas friction and learn what people share.

- Curate 20–30 public-domain or otherwise clearly usable examples.
- Organize them by mood rather than only author or work.
- Include verified text, reading, translation, context and provenance.
- Allow “use this line” and “remix this design.”
- Add privacy-conscious product analytics only for key funnel events.

**Exit criteria:** users can reach a finished export from both pasted text and a curated example; export completion can be measured.

### Milestone 6 — small private beta (ongoing)

**Goal:** validate the social-creation hypothesis.

- Recruit 5–8 Japanese learners and 5–8 visually motivated social-post creators.
- Observe time to first export and correction behavior.
- Collect exported results, not only verbal feedback.
- Improve templates and defaults before adding more controls.

**Decision gate:** proceed when people voluntarily export, share or make a second card. If they only experiment with controls, revisit the content/template loop.

### Milestone 7 — Chinese prototype (after the gate)

**Goal:** prove that the document model generalizes.

- Add explicit `zh-Hans-CN`, `zh-Hant-TW` and `zh-Hant-HK` policies.
- Implement region-aware punctuation and font fallback.
- Add one modern literary card and one classical vertical composition.
- Reconsider optional, correctable pinyin only if field research shows a real need.
- Add exact-script pre-export validation.
- Keep practice grids and historical 集字 outside this prototype.

**Exit criteria:** a supplied string cannot silently change script variants, and the two templates export reliably.

### Milestone 8 — PWA and AI, only when earned

PWA trigger:

- Returning users and offline/mobile creation are observed needs.
- Add installability, cached application shell, offline fonts/dictionaries and update recovery.

AI trigger:

- Users want more visual variety or contextual assistance than curated recipes provide.
- Begin with recipe suggestions, Chinese explanation drafts and text-free textures.
- Preserve a fully deterministic, editable result.

## 8. Quality gates

No public release should regress these invariants:

### Text and language

- Exported base text exactly matches the document.
- Manual readings persist and are visibly distinguishable in editing state.
- Uncertain readings are reviewable before export.
- No implicit simplified/traditional/Japanese glyph conversion.
- User input cannot execute markup or script.

### Layout

- Vertical punctuation and ruby placement follow the selected language policy.
- No clipped ruby, attribution or punctuation.
- Font loading is complete before capture.
- Preview/export visual differences stay within an agreed snapshot tolerance.

### Experience

- Mobile creation works without horizontal page scrolling.
- A new user can export from an example without registration.
- Autosave cannot overwrite another project silently.
- Failure messages explain how to repair the document.

### Content

- Every built-in passage records its source and rights status.
- Translations and context notes identify whether they are editorial or AI-assisted.
- Contemporary copyrighted text is not bundled casually as a growth library.

## 9. Suggested project structure

```text
src/
  app/                 routes, providers, responsive shell
  components/
    ui/                selected shadcn/Radix primitives
    canvas/            paper, text, ruby, seal, attribution
    editor/            content, reading and style inspectors
  domain/
    document/          schema, actions, migrations, invariants
    japanese/          analyzer and dictionary adapters
    layout/            recipes and deterministic layout
    export/            SVG, PNG and PDF pipeline
  workers/             language analysis
  templates/           Bunko, Cinema, Notebook
  content/             curated passages and provenance
  tests/fixtures/      language and layout corpus
public/
  fonts/
  textures/
legacy/                temporary current demo
```

## 10. Immediate backlog

Work in this order:

1. Build the permanent Japanese benchmark corpus.
2. Fix the current demo's correctness and injection problems.
3. Record baseline screenshots.
4. Scaffold the React/TypeScript application and checks.
5. Define and test the project document schema.
6. Run the analyzer bake-off.
7. Implement reading correction and token locks.
8. Build Bunko as the first complete template.
9. Make PNG export exact and reliable.
10. Test the full flow with five people before building Cinema and Notebook deeply.

The first major checkpoint is not “the rewrite is complete.” It is: **one Japanese quotation can travel from paste → verified reading → beautiful composition → exact exported image through the new architecture.**
