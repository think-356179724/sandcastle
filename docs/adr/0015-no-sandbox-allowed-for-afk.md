# No-sandbox provider is allowed for AFK runs

Status: accepted (reverses the prior decision recorded in `CONTEXT.md` that the **no-sandbox provider** was `interactive()`-only)

To support environments with **no container runtime available** (restricted CI, some cloud functions, customer machines), the **no-sandbox provider** is now accepted by every AFK entry point — `run()`, `createSandbox()`, `sandbox.run()`, and `wt.run()` — not just `interactive()`. The type-level and runtime restrictions that excluded it are removed; `run()`'s `sandbox` option widens from `SandboxProvider` to `AnySandboxProvider`. In all AFK paths the agent receives `--dangerously-skip-permissions` regardless of provider (an unsupervised agent has nobody to approve prompts), and `noSandbox() + run()` defaults to the `head` branch strategy, exactly like a bind-mount provider — the call site is intentionally indistinguishable from `docker() + run()`.

## Considered options

- **Explicit danger flag** (e.g. `dangerouslyRunWithoutSandbox: true`) gating `noSandbox() + run()`. Rejected: the API should be identical to the Docker path with zero extra ceremony, even though the behavioral risk is not identical.
- **Withhold `--dangerously-skip-permissions`** for no-sandbox AFK. Rejected: AFK is unsupervised, so the agent would hang on permission prompts — AFK would be unusable.
- **Default to `merge-to-head`** for `noSandbox() + run()` to protect the working tree. Rejected: keeps the default consistent with bind-mount (`head`) at the cost of the working tree on a bad run.

## Consequences

No-sandbox + AFK trades away **all** isolation: an unsupervised agent runs directly on the host with permission prompts skipped and, by default, writes straight to the working directory. A prompt injection from an untrusted task source (e.g. issue bodies fetched via `gh`) can reach host credentials (`~/.ssh`, `~/.aws`, `.env`) with nothing to stop it — there is no container boundary, unlike the bind-mount path. This risk was reviewed against a concrete prompt-injection scenario and accepted deliberately in exchange for supporting container-runtime-free environments. Callers are responsible for only using this combination where they trust the task source. README and `CONTEXT.md` updated to match.
