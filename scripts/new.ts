import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const name = process.argv[2];
if (!name) {
  console.error('Usage: tsx scripts/new.ts <composition-name>');
  console.error('Example: tsx scripts/new.ts kiro-setup-walkthrough');
  process.exit(1);
}

const rootDir = resolve(dirname(new URL(import.meta.url).pathname), '..');
const compDir = resolve(rootDir, 'compositions', name);

if (existsSync(compDir)) {
  console.error(`Composition already exists: ${compDir}`);
  process.exit(1);
}

mkdirSync(compDir, { recursive: true });

const manifest = {
  id: name,
  title: "Video Title",
  subtitle: "",
  duration: 90,
  output: { width: 1920, height: 1080, fps: 30, codec: "h264" },
  scenes: [
    { type: "intro", start: 0, duration: 5 },
    { type: "screen", start: 5, duration: 80, source: `${name}-raw.mp4`, segment: [0, 80] },
    { type: "outro", start: 85, duration: 5, cta: "Get Started →", url: "/" }
  ],
  captions: [
    { text: "First caption here", start: 8, duration: 3 },
    { text: "Second caption here", start: 14, duration: 3 }
  ],
  callouts: []
};

writeFileSync(
  resolve(compDir, 'manifest.json'),
  JSON.stringify(manifest, null, 2),
  'utf-8'
);

console.log(`Created composition scaffold:`);
console.log(`  ${compDir}/manifest.json`);
console.log(`\nNext steps:`);
console.log(`  1. Edit manifest.json with your video details`);
console.log(`  2. Place raw recording in assets/raw/${name}-raw.mp4`);
console.log(`  3. Run: npm run pipeline:render -- ${name}`);
