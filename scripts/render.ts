import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { execSync } from 'node:child_process';

interface Scene {
  type: 'intro' | 'screen' | 'outro';
  start: number;
  duration?: number;
  source?: string;
  segment?: [number, number];
  cta?: string;
  url?: string;
}

interface Caption {
  text: string;
  start: number;
  duration: number;
}

interface Callout {
  type: 'circle' | 'arrow' | 'box';
  start: number;
  duration: number;
  target?: [number, number];
  radius?: number;
  from?: [number, number];
  to?: [number, number];
  position?: [number, number];
  size?: [number, number];
}

interface Manifest {
  id: string;
  title: string;
  subtitle: string;
  duration: number;
  output: { width: number; height: number; fps: number; codec: string };
  scenes: Scene[];
  captions: Caption[];
  callouts: Callout[];
}

const compositionName = process.argv[2];
if (!compositionName) {
  console.error('Usage: tsx scripts/render.ts <composition-name>');
  console.error('Example: tsx scripts/render.ts assessment-intro');
  process.exit(1);
}

const rootDir = resolve(dirname(new URL(import.meta.url).pathname), '..');
const compDir = resolve(rootDir, 'compositions', compositionName);
const manifestPath = resolve(compDir, 'manifest.json');

if (!existsSync(manifestPath)) {
  console.error(`Manifest not found: ${manifestPath}`);
  process.exit(1);
}

const manifest: Manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
const outputDir = resolve(rootDir, 'output');
mkdirSync(outputDir, { recursive: true });

const outputPath = resolve(outputDir, `${manifest.id}.mp4`);

const introScene = manifest.scenes.find(s => s.type === 'intro');
const screenScenes = manifest.scenes.filter(s => s.type === 'screen');
const outroScene = manifest.scenes.find(s => s.type === 'outro');

const totalScreenDuration = screenScenes.reduce((sum, s) => {
  if (s.segment) return sum + (s.segment[1] - s.segment[0]);
  return sum + (s.duration || 0);
}, 0);

const introDuration = introScene?.duration || 5;
const screenStart = introDuration;

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${manifest.output.width}, height=${manifest.output.height}" />
    <title>${manifest.title}</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"><\/script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=block" rel="stylesheet" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body {
        margin: 0;
        width: ${manifest.output.width}px;
        height: ${manifest.output.height}px;
        overflow: hidden;
        background: #0d1117;
      }
      .layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div
      id="root"
      data-composition-id="main"
      data-start="0"
      data-duration="${manifest.duration}"
      data-width="${manifest.output.width}"
      data-height="${manifest.output.height}"
    >
      ${screenScenes.map((scene, i) => {
        const segDuration = scene.segment ? scene.segment[1] - scene.segment[0] : scene.duration || 0;
        const rawPath = resolve(rootDir, 'assets', 'raw', scene.source || '');
        return `<video
        id="screen-${i}"
        data-start="${scene.start}"
        data-duration="${segDuration}"
        data-track-index="0"
        src="${rawPath}"
        muted
        playsinline
      ></video>`;
      }).join('\n      ')}

      <div
        id="intro-layer"
        class="layer"
        data-composition-id="intro"
        data-composition-src="${resolve(rootDir, 'templates', 'intro-card.html')}"
        data-start="0"
        data-duration="${introDuration}"
        data-track-index="1"
        data-width="${manifest.output.width}"
        data-height="${manifest.output.height}"
        data-variables='${JSON.stringify({ title: manifest.title, subtitle: manifest.subtitle })}'
      ></div>

      <div
        id="captions-layer"
        class="layer"
        data-composition-id="captions"
        data-composition-src="${resolve(rootDir, 'templates', 'caption-strip.html')}"
        data-start="${screenStart}"
        data-duration="${totalScreenDuration}"
        data-track-index="2"
        data-width="${manifest.output.width}"
        data-height="${manifest.output.height}"
        data-variables='${JSON.stringify({ captions: JSON.stringify(manifest.captions.map(c => ({ ...c, start: c.start - screenStart }))) })}'
      ></div>

      <div
        id="callouts-layer"
        class="layer"
        data-composition-id="callouts"
        data-composition-src="${resolve(rootDir, 'templates', 'callout-overlay.html')}"
        data-start="${screenStart}"
        data-duration="${totalScreenDuration}"
        data-track-index="3"
        data-width="${manifest.output.width}"
        data-height="${manifest.output.height}"
        data-variables='${JSON.stringify({ callouts: JSON.stringify(manifest.callouts.map(c => ({ ...c, start: c.start - screenStart }))) })}'
      ></div>

      ${outroScene ? `<div
        id="outro-layer"
        class="layer"
        data-composition-id="outro"
        data-composition-src="${resolve(rootDir, 'templates', 'outro-cta.html')}"
        data-start="${outroScene.start}"
        data-duration="${outroScene.duration || 5}"
        data-track-index="4"
        data-width="${manifest.output.width}"
        data-height="${manifest.output.height}"
        data-variables='${JSON.stringify({ cta: outroScene.cta || 'Get Started', url: outroScene.url || '' })}'
      ></div>` : ''}

      ${existsSync(resolve(rootDir, 'assets', 'music', 'ambient-warm.wav')) ? `<audio
        id="bg-music"
        data-start="0"
        data-duration="${manifest.duration}"
        data-track-index="5"
        data-volume="0.3"
        src="${resolve(rootDir, 'assets', 'music', 'ambient-warm.wav')}"
      ></audio>` : ''}
    </div>

    <script>
      window.__timelines = window.__timelines || {};
      var mainTl = gsap.timeline({ paused: true });
      window.__timelines['main'] = mainTl;
    <\/script>
  </body>
</html>`;

const generatedPath = resolve(compDir, '_generated.html');
writeFileSync(generatedPath, html, 'utf-8');
console.log(`Generated composition: ${generatedPath}`);

const renderCmd = `npx hyperframes render "${generatedPath}" --output "${outputPath}" --fps ${manifest.output.fps} --quality standard`;
console.log(`Rendering: ${renderCmd}`);

try {
  execSync(renderCmd, { stdio: 'inherit', cwd: rootDir });
  console.log(`\nDone! Output: ${outputPath}`);
} catch (err) {
  console.error('Render failed:', err);
  process.exit(1);
}
