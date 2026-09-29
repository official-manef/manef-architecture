# UI/UX guide

[DESIGN.md](DESIGN.md) is the canonical visual and interaction contract. It covers
tokens, responsive composition, the app primitives, accessibility, failure states,
assets and browser verification. Keep changes there so the two guides cannot drift.

Implementation lives in `src/lib/components/app-ui/` and `src/routes/layout.css`.
Feature screens compose those primitives through root `slices/`; the registry owns
navigation. Product-specific outcomes and acceptance criteria belong in the product's
[PRD](docs/prd-template.md).
