"@ai-hero/sandcastle": patch
---

Allow top-level `run()` and `createSandbox()` / `sandbox.run()` to accept `noSandbox()`, default host runs to `branchStrategy: { type: "head" }`, and pass `--dangerously-skip-permissions` for AFK execution.
