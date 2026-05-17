import { NodeContext, NodeFileSystem, NodePath } from "@effect/platform-node";
import { Effect, Layer, Ref } from "effect";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DisplayEntry } from "./Display.js";
import { SilentDisplay } from "./Display.js";

const {
  selectMock,
  confirmMock,
  isCancelMock,
  introMock,
  logInfoMock,
  logSuccessMock,
  logWarningMock,
  logErrorMock,
} = vi.hoisted(() => ({
  selectMock: vi.fn(),
  confirmMock: vi.fn(),
  isCancelMock: vi.fn((value: unknown) => value === Symbol.for("cancel")),
  introMock: vi.fn(),
  logInfoMock: vi.fn(),
  logSuccessMock: vi.fn(),
  logWarningMock: vi.fn(),
  logErrorMock: vi.fn(),
}));

vi.mock("@clack/prompts", () => ({
  select: selectMock,
  confirm: confirmMock,
  isCancel: isCancelMock,
  intro: introMock,
  log: {
    info: logInfoMock,
    success: logSuccessMock,
    warning: logWarningMock,
    error: logErrorMock,
  },
}));

describe("sandcastle init interactive no-sandbox", () => {
  const originalCwd = process.cwd();

  beforeEach(() => {
    selectMock.mockReset();
    confirmMock.mockReset();
    isCancelMock.mockClear();
    introMock.mockClear();
    logInfoMock.mockClear();
    logSuccessMock.mockClear();
    logWarningMock.mockClear();
    logErrorMock.mockClear();
  });

  afterEach(() => {
    process.chdir(originalCwd);
  });

  it("shows no-sandbox in the picker with a hint and skips the build-image prompt", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sandcastle-cli-init-"));
    process.chdir(dir);

    selectMock
      .mockResolvedValueOnce("claude-code")
      .mockResolvedValueOnce("no-sandbox")
      .mockResolvedValueOnce("beads")
      .mockResolvedValueOnce("blank");

    const [{ cli }, ref] = await Promise.all([
      import("./cli.js"),
      Effect.runPromise(Ref.make<ReadonlyArray<DisplayEntry>>([])),
    ]);

    const layer = Layer.mergeAll(
      NodeContext.layer,
      NodeFileSystem.layer,
      NodePath.layer,
      SilentDisplay.layer(ref),
    );

    await Effect.runPromise(
      cli(["node", "sandcastle", "init"]).pipe(Effect.provide(layer)),
    );

    expect(selectMock).toHaveBeenCalledTimes(4);
    expect(confirmMock).not.toHaveBeenCalled();

    expect(selectMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        message: "Select a sandbox provider:",
        options: expect.arrayContaining([
          expect.objectContaining({
            value: "no-sandbox",
            label: "No sandbox",
            hint: "runs the agent directly on the host — no isolation",
          }),
        ]),
      }),
    );

    const entries = await Effect.runPromise(Ref.get(ref));
    const textEntries = entries
      .filter(
        (entry): entry is Extract<DisplayEntry, { _tag: "text" }> =>
          entry._tag === "text",
      )
      .map((entry) => entry.message);
    expect(textEntries.join("\n")).not.toContain("build-image");

    const mainContent = await readFile(
      join(dir, ".sandcastle", "main.mts"),
      "utf8",
    );
    expect(mainContent).toContain(
      'import { noSandbox } from "@ai-hero/sandcastle/sandboxes/no-sandbox";',
    );
    expect(mainContent).toContain("sandbox: noSandbox()");
  });

  it("--sandbox no-sandbox skips the picker and writes no container file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sandcastle-cli-init-"));
    process.chdir(dir);

    // Only the backlog-manager select remains (agent/template/sandbox via flags).
    selectMock.mockResolvedValueOnce("beads");

    const [{ cli }, ref] = await Promise.all([
      import("./cli.js"),
      Effect.runPromise(Ref.make<ReadonlyArray<DisplayEntry>>([])),
    ]);

    const layer = Layer.mergeAll(
      NodeContext.layer,
      NodeFileSystem.layer,
      NodePath.layer,
      SilentDisplay.layer(ref),
    );

    await Effect.runPromise(
      cli([
        "node",
        "sandcastle",
        "init",
        "--agent",
        "claude-code",
        "--template",
        "blank",
        "--sandbox",
        "no-sandbox",
      ]).pipe(Effect.provide(layer)),
    );

    // Sandbox picker is bypassed: only the backlog-manager select fires.
    expect(selectMock).toHaveBeenCalledTimes(1);
    expect(selectMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ message: "Select a sandbox provider:" }),
    );
    expect(confirmMock).not.toHaveBeenCalled();

    const configDir = join(dir, ".sandcastle");
    await expect(
      readFile(join(configDir, "Dockerfile"), "utf8"),
    ).rejects.toThrow();
    await expect(
      readFile(join(configDir, "Containerfile"), "utf8"),
    ).rejects.toThrow();

    const mainContent = await readFile(join(configDir, "main.mts"), "utf8");
    expect(mainContent).toContain(
      'import { noSandbox } from "@ai-hero/sandcastle/sandboxes/no-sandbox";',
    );
    expect(mainContent).toContain("sandbox: noSandbox()");
  });

  it("--sandbox docker skips the picker and writes a Dockerfile", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sandcastle-cli-init-"));
    process.chdir(dir);

    selectMock.mockResolvedValueOnce("beads");
    // Decline the "build the image now?" prompt for the container provider.
    confirmMock.mockResolvedValueOnce(false);

    const [{ cli }, ref] = await Promise.all([
      import("./cli.js"),
      Effect.runPromise(Ref.make<ReadonlyArray<DisplayEntry>>([])),
    ]);

    const layer = Layer.mergeAll(
      NodeContext.layer,
      NodeFileSystem.layer,
      NodePath.layer,
      SilentDisplay.layer(ref),
    );

    await Effect.runPromise(
      cli([
        "node",
        "sandcastle",
        "init",
        "--agent",
        "claude-code",
        "--template",
        "blank",
        "--sandbox",
        "docker",
      ]).pipe(Effect.provide(layer)),
    );

    expect(selectMock).toHaveBeenCalledTimes(1);
    expect(selectMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ message: "Select a sandbox provider:" }),
    );

    const configDir = join(dir, ".sandcastle");
    const dockerfile = await readFile(join(configDir, "Dockerfile"), "utf8");
    expect(dockerfile).toContain("FROM node:22-bookworm");

    const mainContent = await readFile(join(configDir, "main.mts"), "utf8");
    expect(mainContent).toContain("sandbox: docker()");
  });

  it("without --sandbox the interactive sandbox picker is still shown", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sandcastle-cli-init-"));
    process.chdir(dir);

    selectMock
      .mockResolvedValueOnce("claude-code")
      .mockResolvedValueOnce("no-sandbox")
      .mockResolvedValueOnce("beads")
      .mockResolvedValueOnce("blank");

    const [{ cli }, ref] = await Promise.all([
      import("./cli.js"),
      Effect.runPromise(Ref.make<ReadonlyArray<DisplayEntry>>([])),
    ]);

    const layer = Layer.mergeAll(
      NodeContext.layer,
      NodeFileSystem.layer,
      NodePath.layer,
      SilentDisplay.layer(ref),
    );

    await Effect.runPromise(
      cli(["node", "sandcastle", "init"]).pipe(Effect.provide(layer)),
    );

    expect(selectMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Select a sandbox provider:" }),
    );
  });
});
