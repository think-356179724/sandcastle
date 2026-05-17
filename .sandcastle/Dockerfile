FROM node:22-bookworm

# Install system dependencies
RUN apt-get update && apt-get install -y \
  git \
  curl \
  jq \
  && rm -rf /var/lib/apt/lists/*

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
  | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
  | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
  && apt-get update && apt-get install -y gh \
  && rm -rf /var/lib/apt/lists/*

# Build-args for UID/GID alignment: sandcastle docker build-image
# defaults these to the host user's UID/GID so image-built files
# and bind-mounted files share an owner without runtime chown.
ARG AGENT_UID=1000
ARG AGENT_GID=1000

# Rename the base image's "node" user to "agent" and align UID/GID.
# If a group with the target GID already exists (e.g. macOS hosts where the
# user's primary group is staff/GID 20, which collides with Debian's dialout),
# skip the groupmod and just point the user at that existing GID.
RUN set -eux; \
  if ! getent group "$AGENT_GID" >/dev/null; then groupmod -g "$AGENT_GID" node; fi; \
  usermod -u "$AGENT_UID" -g "$AGENT_GID" -d /home/agent -m -l agent node

# Install Codex CLI (run as root before USER agent)
RUN npm install -g @openai/codex

USER ${AGENT_UID}:${AGENT_GID}

WORKDIR /home/agent

# Point Codex at the third-party relay (Upthos) via the Responses API.
# The API key itself is NOT baked in here — Sandcastle injects it at runtime
# through the OPENAI_API_KEY env var (declared in .sandcastle/.env), which the
# `env_key` setting below tells Codex to read.
RUN mkdir -p /home/agent/.codex && \
  cat > /home/agent/.codex/config.toml <<'EOF'
model = "gpt-5.5"
model_provider = "relay"

[model_providers.relay]
name = "Upthos Relay"
base_url = "https://relay.upthos.com/v1"
wire_api = "responses"
env_key = "OPENAI_API_KEY"
EOF

# In worktree sandbox mode, Sandcastle bind-mounts the git worktree at /home/agent/workspace
# and overrides the working directory to /home/agent/workspace at container start.
# Structure your Dockerfile so that /home/agent/workspace can serve as the project root.
ENTRYPOINT ["sleep", "infinity"]
