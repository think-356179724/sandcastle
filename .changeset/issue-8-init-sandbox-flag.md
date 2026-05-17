---
"@ai-hero/sandcastle": patch
---

`sandcastle init` now accepts a `--sandbox <name>` flag (`docker`, `podman`, `no-sandbox`) that skips the interactive provider picker, making `init` runnable in non-interactive environments such as CI. Invalid values produce a clear error listing the valid providers. The flag uses the same single-string-value shape as the existing `--agent`/`--template` flags — the coordination point with the broader non-interactive-init work in upstream mattpocock/sandcastle#510.
