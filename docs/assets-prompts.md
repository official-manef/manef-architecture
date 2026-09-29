# Asset generation prompts

Generated from `assets.config.ts` and `src/lib/config/app.ts` using `bun run assets:prompts`.
Read [the asset workflow](assets.md) first. Approve one mark, then reuse it for all icon variants.

## favicon

- Output: `/brand/favicon.svg`
- Canvas: 64 × 64
- Status: placeholder

Create a distinctive simple brand mark for Svelte Convex Starter. Legible at 16px. Flat vector geometry, no text, no fine details. Use #171717. Transparent background.

## logo

- Output: `/brand/logo.svg`
- Canvas: 64 × 64
- Status: placeholder

Use the approved favicon mark for Svelte Convex Starter as the logo symbol. Preserve its exact geometry and colors. Transparent background; no invented wordmark.

## appleIcon

- Output: `/brand/apple-touch-icon.png`
- Canvas: 180 × 180
- Status: placeholder

Adapt the approved Svelte Convex Starter mark to an opaque square icon. Keep generous padding. No rounded outer corners baked into the image.

## appIcon

- Output: `/brand/icon-192.png`
- Canvas: 192 × 192
- Status: placeholder

Export the approved Svelte Convex Starter app icon on an opaque background. Same mark and palette as appleIcon.

## maskableIcon

- Output: `/brand/icon-512.png`
- Canvas: 512 × 512
- Status: placeholder

Create a maskable variant of the approved Svelte Convex Starter app icon. Essential artwork must fit inside the central circle with radius 40% of the canvas.

## socialImage

- Output: `/brand/social-preview.png`
- Canvas: 1200 × 630
- Status: placeholder

Create a social sharing illustration for Svelte Convex Starter: A SvelteKit and Bun starter with example screens, Convex setup, and guides for building your application.. Follow the approved brand mark and #171717 palette. Leave safe margins and room for the title. Do not generate text; overlay the exact app name with typography in a design tool after generation.

## hero

- Output: `/brand/hero.svg`
- Canvas: 1600 × 900
- Status: placeholder

Create a product hero illustration for Svelte Convex Starter: A SvelteKit and Bun starter with example screens, Convex setup, and guides for building your application.. Show only capabilities approved in the PRD. Use the approved visual direction and #171717 accent. No fake product screenshots, statistics, testimonials, logos, or text.

## emptyState

- Output: `/brand/empty-state.svg`
- Canvas: 480 × 320
- Status: placeholder

Create a quiet empty-state illustration for Svelte Convex Starter. Clear at small sizes, restrained #171717 accent, transparent background, no text or implied error. Match the hero illustration style.
