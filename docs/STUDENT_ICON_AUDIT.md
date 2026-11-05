# Student icon audit and implementation

Scope: student web interface only. The latest Guardian reconstruction request is separate. The existing web app uses Next.js/React; its installed `lucide-react` package is the correct web package. No React Native package or new icon dependency was installed in the web app.

## Findings and replacements

| Surface | Previous state | Current source |
|---|---|---|
| Student rail | Lucide, but completion check used for Practice and clock for Results | Official Lucide gamepad and performance chart with consistent student defaults |
| Dashboard | Legacy handwritten icon imports, one generic symbol for achievements, custom repeated SVG wave artwork | Central Lucide imports; distinct cap, mountain, target, gem, flame, book, crown and medal symbols for existing achievement IDs; library trophy replaces improvised decoration |
| Practice Arena | Official Lucide icons imported directly | Same official symbols through the shared student size/stroke/accessibility wrapper; larger reward treatment |
| Exam / offline assignments / results | Legacy SVG path components | Official Lucide aliases preserving call-site dimensions and layout |
| Calculator / scratchpad / review / solution drawer | Text glyphs or handwritten controls | Lucide close, reset and status controls |
| Settings / devices | Inline monitor SVG and legacy icons | Official Lucide monitor, lock and graduation cap |
| Student top bar | Repeated handwritten notification, settings, bell, chevron and logout SVG | Official Lucide symbols; approved ACQAD brand mark preserved |
| Shared dialogs / academic selector / notifications | Shared legacy icons used by multiple roles | Student icon provider selects official Lucide only in student routes; other roles retain existing selection |
| Report cards | Shared legacy icon imports | Student role selects official Lucide symbols; other role paths retain their previous icon map |

`frontend/components/icons/StudentIcons.tsx` imports actual library components; it contains no hand-drawn icon geometry. Defaults: 20px, 1.75 stroke, `currentColor`, nonfocusable decorative SVGs, with labelled icons exposed as images. Existing explicit dimensions remain supported. Navigation uses accessible link labels and `aria-current`; locked/disabled state is owned by the existing controls.

Achievement symbols correspond to implemented backend badge IDs. No achievement rules, scores, API requests, authorization, navigation routes or academic calculations were changed. Existing chart graphics and canvas drawing are data/content tools, not replacement icon assets.

## Licensing and offline delivery

Official source: https://lucide.dev/guide/react . License: https://lucide.dev/license . The installed package includes the Lucide ISC notice and the MIT notice for Feather-derived icons. A verbatim copy is bundled at `frontend/public/licenses/lucide.txt`.

Icons are bundled with application JavaScript. Essential icons make no CDN/image-generation request. The official ACQAD logo remains a branded exception; no substitute logo was generated.

## Validation

Frontend TypeScript check passes. Source scan finds no handwritten `<svg>` blocks or legacy icon-module imports in student pages/components or the student top bar after migration. Shared components retain their legacy implementations only for other roles. Further visual checks are recorded with local QA artifacts; a browser viewport check does not claim real-device Android/iOS validation.
