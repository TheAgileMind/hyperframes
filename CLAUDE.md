# Hyperframes Video Pipeline

Fork of HeyGen's hyperframes with a branded video production pipeline for Intent Building Hub.

**Owner:** Dave Marshall (Amazon GFP)
**GitHub:** TheAgileMind/hyperframes (public fork, master branch)
**Upstream:** heygen-com/hyperframes (tracked as `upstream` remote)
**Related project:** IntentBuildingHub (`C:\Users\dmrshal\Project Documents_Leadership Review\IntentBuildingHub`)

## Pipeline Layer (Dave's additions on top of upstream)

```
templates/              # 4 branded composition templates
  intro-card.html       # 5s animated title card (dark navy + amber accent)
  caption-strip.html    # Lower-third animated captions (GSAP)
  callout-overlay.html  # Circle/arrow/box annotations
  outro-cta.html        # End card with CTA button
compositions/           # Per-video manifests
  assessment-intro/manifest.json  # First video (105s assessment orientation)
scripts/                # Pipeline CLIs (run with tsx)
  render.ts             # manifest.json → generated HTML → hyperframes render → MP4
  upload.ts             # MP4 → S3 (intent-hub-video-assets-beta) + CloudFront invalidation
  new.ts                # Scaffold a new composition directory
assets/
  raw/                  # Screen recordings (gitignored)
  music/                # Background tracks
  brand/colors.json     # Palette: navy #0d1117, amber #FFB347, teal #5BBFBF
projects/
  intent-building-hub/videos.json  # Registry of videos + CDN URLs
output/                 # Rendered MP4s (gitignored)
```

## Pipeline Commands

```bash
tsx scripts/new.ts <name>       # Scaffold new composition
tsx scripts/render.ts <name>    # Render video from manifest
tsx scripts/upload.ts <name>    # Upload to S3 + invalidate CDN
hyperframes preview <file>      # Live browser preview of composition/template
```

## Tooling Requirements

- Node.js >= 22 (installed: v25.0.0)
- hyperframes CLI (installed globally: v0.4.44)
- tsx (installed globally: v4.21.0)
- FFmpeg (installed: v8.1.1 via winget, PATH at `C:\Users\dmrshal\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin\`)
- AWS CLI + ada credentials for upload (account 969352773583)

**Note:** Full monorepo `bun install` stalls on Windows due to native deps (sharp, puppeteer). Use global hyperframes CLI instead.

## Current Status (2026-05-05)

- All templates, scripts, and manifests are committed and pushed
- Awaiting: Dave records assessment walkthrough → `assets/raw/assessment-walkthrough.mp4`
- Awaiting: Kiro creates S3 bucket + CloudFront distribution
- Then: `tsx scripts/render.ts assessment-intro` produces first video draft

## Video Design Decisions

- Screen recordings + animated overlays (no avatars, no voiceover)
- Text captions + ambient music only (works in open offices)
- Dark navy gradient + warm amber accents (distinct from site's pure black)
- Inline embed (< 60s clips) + lightbox (longer) on the Hub site
- Manifest JSON is the authoring interface; HTML is the render artifact

---

## Upstream Hyperframes (reference)

Open-source video rendering framework: write HTML, render video.

```
packages/
  cli/       → hyperframes CLI (create, preview, lint, render)
  core/      → Types, parsers, generators, linter, runtime, frame adapters
  engine/    → Seekable page-to-video capture engine (Puppeteer + FFmpeg)
  player/    → Embeddable <hyperframes-player> web component
  producer/  → Full rendering pipeline (capture + encode + audio mix)
  studio/    → Browser-based composition editor UI
```

## Development

```bash
bun install     # Install dependencies
bun run build   # Build all packages
bun run test    # Run tests
```

**This repo uses bun**, not pnpm. Do NOT run `pnpm install` — it creates a `pnpm-lock.yaml` that should not exist. Workspace linking relies on bun's resolution from `"workspaces"` in root `package.json`.

### Linting & Formatting

This project uses **oxlint** and **oxfmt** (not biome, not eslint, not prettier).

```bash
bunx oxlint <files>        # Lint
bunx oxfmt <files>         # Format (write)
bunx oxfmt --check <files> # Format (check only, used by pre-commit hook)
```

Always run both on changed files before committing. The lefthook pre-commit hook runs `bunx oxlint` and `bunx oxfmt --check` automatically.

### Adding CLI Commands

When adding a new CLI command:

1. Define the command in `packages/cli/src/commands/<name>.ts` using `defineCommand` from citty
2. **Export `examples`** in the same file — `export const examples: Example[] = [...]` (import `Example` from `./_examples.js`). These are displayed by `--help`.
3. Register it in `packages/cli/src/cli.ts` under `subCommands` (lazy-loaded)
4. **Add to help groups** in `packages/cli/src/help.ts` — add the command name and description to the appropriate `GROUPS` entry. Without this, the command won't appear in `hyperframes --help` even though it works.
5. **Document it** in `docs/packages/cli.mdx` — add a section with usage examples and flags.
6. Validate by running `npx tsx packages/cli/src/cli.ts --help` (command appears in the list) and `npx tsx packages/cli/src/cli.ts <name> --help` (examples appear).

### Regression Test Golden Baselines (producer)

`packages/producer/tests/<name>/output/output.mp4` baselines MUST be generated
inside `Dockerfile.test`, not on your host. CI renders inside that Docker image
with a specific Chrome + ffmpeg build; pixel-level output drifts across
different host Chrome/ffmpeg versions and will fail PSNR at dozens of
checkpoints even when the code is correct.

```bash
# Build the test image once:
docker build -t hyperframes-producer:test -f Dockerfile.test .

# Generate or update a baseline (runs the harness with --update inside Docker):
bun run --cwd packages/producer docker:test:update <test-name>
```

Never run `bun run --cwd packages/producer test:update` directly from the
host to capture a baseline that will be committed — the resulting output.mp4
will not match CI. Use it only for local-only experimentation.

## Skills

Composition authoring (not repo development) is guided by skills installed via `npx skills add heygen-com/hyperframes`. See `skills/` for source. Invoke `/hyperframes`, `/hyperframes-cli`, `/hyperframes-registry`, `/tailwind`, or `/gsap` when authoring compositions. Use `/tailwind` for projects created with `hyperframes init --tailwind` so agents follow the pinned Tailwind v4 browser-runtime contract instead of Studio's Tailwind v3 setup. Use `/animejs`, `/css-animations`, `/lottie`, `/three`, or `/waapi` when a composition uses those first-party runtime adapters. Invoke `/hyperframes-media` for asset preprocessing (TTS narration, audio/video transcription, background removal for transparent overlays) — these commands have their own skill so the CLI skill stays focused on the dev loop. When a user provides a website URL and wants a video, invoke `/website-to-hyperframes` — it runs the full 7-step capture-to-video pipeline.
