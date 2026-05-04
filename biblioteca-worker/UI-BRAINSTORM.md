# Biblioteca UI Brainstorm — Professional, AI-native, lightweight

## What feels wrong now

The current split view is functional, but the reading/detail pane can read as an old-school admin drawer: hard edges, flat dark panel, narrow width, and little editorial hierarchy. For a public-facing Biblioteca/NM Socialists rewrite, the UI should keep the grassroots warmth while signaling that Sena's AI Collective has advanced tooling behind the curtain.

## Direction

**Modern editorial command sheet**: keep the left feed because it is fast and familiar, but make the right pane feel like a polished publication surface — rounded glass, depth, larger title scale, smart metadata chips, comfortable measure, and a strong CTA. This gives an “AI research desk” feel without shipping a heavy JS framework.

## Lightweight patterns to borrow

1. **Bento/editorial modules** — use modular cards for stats, summaries, and citations rather than one long raw document column.
2. **Glassmorphism 2.0, selectively** — frosted layered panels on the dark earth palette to signal tech sophistication without changing the brand.
3. **CSS-first motion** — small transforms, opacity, and hover states only; no scroll hijacking or animation libraries.
4. **Reader measure discipline** — keep prose near a readable line length rather than stretching full-width across desktop.
5. **AI affordances** — future additions can be tiny: “Aria summary,” “timeline,” “citation map,” “listen,” or “compare EN/ES,” displayed as chips/buttons inside the same pane.

## Sources checked

- Line25, “Web Design Trends 2026” — bento grids, variable typography, CSS scroll-driven effects.
- idataweb, “Web Design Trends 2026” — refined glassmorphism and performance-aware implementation.
- Seamonster Coding, “7 Web Design Trends Dominating 2026” — CSS-first animation and typography as premium signals.
- Letter Counter / Nielsen Norman summary — web readers scan; readable line length and concise chunks matter.

## Implementation in this PR

- Replace the hard-edged drawer with a rounded, glassy editorial command sheet.
- Increase detail pane width with a responsive clamp so it feels intentional on desktop but still works on mobile.
- Add stronger title hierarchy, pill metadata, a boxed excerpt, and a more premium gradient CTA.
- Preserve performance: CSS only, no new dependencies, no new images, no heavy animation runtime.
