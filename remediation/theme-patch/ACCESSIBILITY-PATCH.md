# Sirat Pro duplicate-title accessibility patch

Status: prepared for staging review only; dormant and not deployed.

The exact current responsive home source repeats `the_title()` inside the visible `h3` and a nested `.screen-reader-text` span. The one-line patch removes only that duplicate span. It does not change the visible title, article URL, image, excerpt, query, or carousel structure.

## Exact gate

- Remote target: `wp-content/themes/sirat-pro/template-parts/home/section-our-blog.php`
- Required preimage SHA-256: `8cc6a5771f0b7ae557c263a3cf422976751eb655079f0b611a19d02828206258`
- Patch: `remediation/theme-patch/sirat-pro-home-blog-accessible-title.patch`
- Expected patch shape: exactly one deletion and one insertion
- Expected canonical patched SHA-256: `174c72bf0ca894cdddd60132a59d66937a0b7b86dc47b05bd8bf38872a35fd32`
- Production authorization: false

Do not apply if the remote bytes do not match the required preimage hash. A different hash means the theme source has drifted and needs a fresh human review; fuzzy or context-only patching is not authorized.

The `prepared-accessibility` file is an LF-normalized review copy created through the workspace patching flow. Its normalized content must match the canonical one-line transformation, but the exact deployment candidate is the patch applied to the hash-matching CRLF preimage.

## Local validation

```powershell
node remediation/theme-patch/validate-accessibility-patch.mjs
git -C remediation/theme-patch/prepared apply -p0 --check ..\sirat-pro-home-blog-accessible-title.patch
git -C remediation/theme-patch/prepared apply -p0 --numstat ..\sirat-pro-home-blog-accessible-title.patch
```

The first command is dependency-free and validates exact hashes, the single replacement, normalized prepared content, and one-line patch shape. The `git apply` commands are read-only checks; they do not modify the prepared source.

For staging only, apply after the same hash check, lint the PHP file, purge only the affected staging page/cache, and run the full accessibility browser proof. Roll back by restoring the exact preimage bytes. No live or staging operation is performed by this artifact.
