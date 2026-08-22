# Sirat Pro staging compatibility patch

This one-line staging patch corrects the homepage blog-card heading from `h5` to `h3`, directly beneath the section's `h2`. It is required because the licensed parent theme exposes no filter around that tag. It does not change post content.

- Exact target: `wp-content/themes/sirat-pro/template-parts/home/section-our-blog.php`
- Captured pre-change SHA-256: `55261d7b7e1702c99acbd4be55cf480a66f4bfe3d70a0f8afb2c19155b892034`
- Patched SHA-256: `2dea4f7a2800034b9addc82be14e7da18002d155cc6d829f0f1fc15b2a84e815`
- Expected replacement count: exactly one
- Patch structure gate: `git apply --numstat` reports exactly one insertion and one deletion.
- Forward/reverse gate: the exact captured source transforms to the patched hash, and reversing the same hunk restores the pre-change hash byte-for-byte.

Apply only when the pre-change hash matches. Roll back by reversing the included patch. A Sirat Pro update may overwrite the file, so reapply only after validating the new vendor package and confirming the same semantic defect still exists. This patch does not prove that the current Sirat Pro package is supported or maintained.
