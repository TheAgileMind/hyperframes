import { existsSync, statSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { execSync } from 'node:child_process';

const BUCKET = 'intent-hub-video-assets-beta';
const REGION = 'us-east-1';

const compositionName = process.argv[2];
if (!compositionName) {
  console.error('Usage: tsx scripts/upload.ts <composition-name>');
  console.error('Example: tsx scripts/upload.ts assessment-intro');
  process.exit(1);
}

const rootDir = resolve(dirname(new URL(import.meta.url).pathname), '..');
const outputPath = resolve(rootDir, 'output', `${compositionName}.mp4`);

if (!existsSync(outputPath)) {
  console.error(`Output file not found: ${outputPath}`);
  console.error('Run "npm run pipeline:render -- <name>" first.');
  process.exit(1);
}

const fileSize = statSync(outputPath).size;
const fileSizeMB = (fileSize / 1024 / 1024).toFixed(1);
console.log(`Uploading ${basename(outputPath)} (${fileSizeMB} MB) to s3://${BUCKET}/`);

try {
  execSync(
    `aws s3 cp "${outputPath}" "s3://${BUCKET}/${basename(outputPath)}" --region ${REGION} --content-type video/mp4 --cache-control "public, max-age=2592000"`,
    { stdio: 'inherit' }
  );
  console.log(`\nUploaded to s3://${BUCKET}/${basename(outputPath)}`);
} catch (err) {
  console.error('Upload failed. Make sure you have valid credentials:');
  console.error('  ada credentials update --account=969352773583 --provider=conduit --role=IibsAdminAccess-DO-NOT-DELETE --once');
  process.exit(1);
}

const distributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID;
if (distributionId) {
  console.log(`\nInvalidating CloudFront cache for /${basename(outputPath)}...`);
  try {
    execSync(
      `aws cloudfront create-invalidation --distribution-id ${distributionId} --paths "/${basename(outputPath)}" --region ${REGION}`,
      { stdio: 'inherit' }
    );
    console.log('Cache invalidated.');
  } catch (err) {
    console.error('CloudFront invalidation failed (non-fatal):', err);
  }
} else {
  console.log('\nSet CLOUDFRONT_DISTRIBUTION_ID env var to enable cache invalidation.');
}
