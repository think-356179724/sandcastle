# `sandcastle init` supports the no-sandbox provider

Status: accepted (extends [ADR 0015](0015-no-sandbox-allowed-for-afk.md); scope split out from the issue tracker as a separate follow-up)

ADR 0015 widened the programmatic AFK entry points to accept `noSandbox()`. This ADR covers the separate decision of how `sandcastle init` offers no-sandbox as a provider choice. The init provider registry was container-centric by design (every entry carried a `containerfileName` and a `cliNamespace`); no-sandbox has neither, so adding it is a structural change a future reader would question.

Decisions, resolved via a grilling session:

- **No Dockerfile/Containerfile is written** when no-sandbox is selected. The scaffold honestly reflects the runtime — a Dockerfile would imply a sandbox that does not exist. Users who later want a container re-run init or add one by hand.
- **The internal `SandboxProviderEntry` becomes a discriminated union** — `kind: "container"` (carrying `containerfileName` + `cliNamespace`) vs `kind: "none"`. This forces every container-specific step (writing the containerfile, the "build image now?" prompt, the `build-image`/`remove-image` CLI namespacing, the next-steps text) to handle the no-sandbox case explicitly at compile time, rather than null-checking optional fields.
- **The scaffolded entrypoint is produced by extending the existing main.ts rewrite step to rewrite the sandbox provider import + call generically** (not just the agent factory). For no-sandbox this yields `import { noSandbox } from "@ai-hero/sandcastle/sandboxes/no-sandbox"` and `sandbox: noSandbox()` with no explicit `branchStrategy` (head is the default per ADR 0015). This also fixes a pre-existing latent gap where selecting Podman left `docker()` hardcoded in the scaffold.
- **No `build-image` / `remove-image` equivalent exists for no-sandbox.** Init skips the "build image now?" confirmation and prints no-sandbox-specific next steps.
- **A `--sandbox` CLI flag is added** alongside the interactive picker entry, because ADR 0015's primary motivation (environments with no container runtime, typically CI) is inherently non-interactive — a picker-only choice would make the feature unusable in exactly the scenario it exists for. Flag design is to be coordinated with the broader non-interactive-init work (upstream #510) to avoid conflicting designs.
- **All five scaffold templates are offered with no-sandbox**, identical to the container providers (no subset, no extra warning) — consistent with ADR 0015's "you opt into the no-isolation risk via `noSandbox`" stance.
- **The picker surfaces the risk inline**: label "No sandbox" with a hint such as "runs the agent directly on the host — no isolation". No secondary confirmation (it would break the non-interactive flow).

## Consequences

`.env.example` / env handling is unchanged — it is agent-driven, not sandbox-driven. The `--sandbox` flag is public CLI surface and the discriminated-union registry is consumed in several call sites, so reversing this is non-trivial. CONTEXT.md updated to reflect that init now prompts for a sandbox provider and that no-sandbox has no Dockerfile / build-image.
