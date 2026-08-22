# AI Amigos social-card review packet

The retained PNG is a **rejected review candidate**, not a publishable brand asset. It is deliberately not referenced by the WordPress plugin or uploaded to staging/production.

The source logo is 240 by 213 pixels. The latest mechanical candidate is exactly 1200 by 630 and preserves the source logo without redraw. Missing brand approval and platform previews are the only blockers remaining for this mechanic.

Before a future social card can ship, an accountable reviewer must approve exact text and mark usage; the final exported asset must return HTTP 200 with an image content type, remain crawlable, and pass Facebook, LinkedIn, and X crop/readability previews. A page-specific approved image must continue to override the fallback.

All paths, dimensions, hashes, rejection reasons, and deployment flags are recorded in `candidate-manifest.json`.
