# Brand and assets

Edit `src/lib/config/app.ts` for public app identity, landing copy and browser theme color.
Edit `src/routes/layout.css` for UI design tokens; the browser theme color is browser chrome,
not a replacement for accessible light/dark UI tokens. Set `PUBLIC_SITE_URL` to your HTTPS
origin when deploying. Titles and descriptions combine this identity with the page registry.
Without an origin, canonical tags are omitted and indexing is disabled. App examples remain
noindex. Public production indexing also requires `PUBLIC_SEO_INDEXABLE=true`; previews
keep it false even when they have an origin. See [environment settings](environment.md).
Never put secrets, user records or provider credentials in public configuration.

`assets.config.ts` owns asset paths, dimensions, placeholder/custom status and prompt briefs.
The shell, favicon links, Open Graph/Twitter metadata and generated web manifest use this catalog.
The web manifest provides icons and install metadata; it does not add an offline service worker.

## Placeholder workflow

```sh
bun run assets:generate
bun run assets:prompts
bun run assets:check
```

The generator creates eight neutral, geometric placeholders and `static/site.webmanifest`.
It does not call an AI service. PNG export uses the development-only resvg renderer; generated
files are committed so the app works immediately. Hero and empty-state placeholders are available
for features to opt into; they are not inserted into screens without a product need.

The asset manifest records the configuration fingerprint and file hashes. `bun run check`
checks freshness, file existence, expected sizes and SVG restrictions. Do not hand-edit generated
manifests. After a brand/config change, regenerate and review the result before committing.

## Generate final artwork with an agent

1. Read the project's PRD asset requirements and `DESIGN.md`. Decide audience, visual direction,
   palette, tone and prohibited content. Do not infer a product from a placeholder.
2. Run `assets:prompts` and use [the generated prompts](assets-prompts.md). Generate and approve
   the favicon/mark first. Reference that approved asset for subsequent icon/logo variants.
3. Use the agent's image-generation tool for illustrations. Convert approved artwork to required
   formats with the available design/export tool. Raster output does not become vector by renaming
   its extension: vectorize/review the mark or change its catalog path to PNG. Metadata derives the MIME type.
4. Set each finished entry's `status` to `custom`, then place the file at its catalog path.
   `assets:generate` preserves custom files and refreshes the manifest; missing/custom-size errors fail.
   It also refuses to overwrite a locally modified placeholder; mark finished artwork as custom first.
5. Overlay exact social-image text in a layout tool. Check spelling, rights, contrast and small-size
   recognition. Do not use invented trademarks, endorsements, dashboard data or testimonials.
6. Run all three asset commands, then verify desktop/mobile pages and sharing metadata. Commit
   config, artwork, generated prompts and manifests together. Check social previews on the actual
   public domain after deployment; caches and crawler support differ.

Use SVG for reviewed vector symbols/illustrations; PNG for social images and app icons. Preserve
maskable safe zones. The SVG checker accepts a restricted static-vector subset, not arbitrary SVG;
it is not a general sanitizer. Review exported vectors and remove active elements, CSS, event handlers
and external resources before committing. Record the
generation source, approvals and licensing in the project's PRD asset table; never commit credentials
or private reference material. Placeholder files are included under the repository MIT license.
