# PHP 8.4.24 validation evidence — 2026-08-13

Status: **local parser and pure-policy gate passed; remote runtime migration remains open**

## Trusted runtime

- Source: [official PHP for Windows download page](https://www.php.net/downloads.php?os=windows&osvariant=windows-downloads&version=8.4)
- Archive: `https://downloads.php.net/~windows/releases/archives/php-8.4.24-nts-Win32-vs17-x64.zip`
- Published and observed SHA-256: `86470a30cbbaeafb259e727dfa5cd336f2f3f0a462cd6f8e3eac00fdbded13cb`
- Executed version: `PHP 8.4.24 (cli) (built: Jul 29 2026 06:00:34) (NTS Visual C++ 2022 x64)`

The archive was downloaded into a GUID-named directory under the Windows temporary root. Extraction occurred only after the archive hash matched the official value. The resolved cleanup target was checked to be a strict descendant of the temporary root and was removed after validation; no portable PHP binary was retained in the repository.

## Results

`php -l` passed for **16/16** artifacts with zero syntax errors:

- 6 plugin source/test files under `remediation/wp-plugin/aiamigos-remediation/`;
- 5 production-package files under `remediation/releases/aiamigos-remediation/`;
- 3 prepared theme PHP files;
- 2 captured theme preimage/patched evidence files.

The dependency-free policy suite also passed:

- command: `php remediation/wp-plugin/aiamigos-remediation/tests/test-policy.php`
- result: **28 assertions, 0 failures**
- process exit code: `0`

The assertions cover route normalization, permanent redirects including multi-digit pagers, self-redirect suppression, quarantine merging and protected team ID 38, canonical menu normalization, script-strategy removal, malformed MailPoet replacement, and phone/email discrimination.

## Evidence boundary

This proves that the exact local plugin, release, and prepared theme PHP artifacts parse under PHP 8.4.24 and that the pure policy layer behaves as asserted. It does **not** prove WordPress/theme/plugin compatibility under a Hostinger PHP 8.4 web SAPI, remote extension parity, database compatibility, absence of deprecations, or production readiness. Staging and production still advertise PHP 8.1.34 and must be migrated and re-crawled in an isolated, blast-radius-controlled environment before H1 can close.
