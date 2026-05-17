---
"@ai-hero/sandcastle": patch
---

Fix `sandcastle init` Dockerfile templates failing to build on macOS. The host user's primary group (staff, GID 20) collides with Debian's `dialout` group, making `groupmod` fail. The generated Dockerfiles now skip the `groupmod` when a group with the target GID already exists.
