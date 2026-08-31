import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const activityFilePath = path.join(projectRoot, 'docs', 'STREAK_ACTIVITY.md');

// Ensure docs directory exists
if (!fs.existsSync(path.dirname(activityFilePath))) {
  fs.mkdirSync(path.dirname(activityFilePath), { recursive: true });
}

// Parse CLI arguments
const args = process.argv.slice(2);
function getArg(flag, defaultValue) {
  const index = args.indexOf(flag);
  if (index !== -1 && args[index + 1]) {
    return args[index + 1];
  }
  return defaultValue;
}

const dateStr = getArg('--date', new Date().toISOString().split('T')[0]); // YYYY-MM-DD
const count = parseInt(getArg('--count', '1'), 10);
const startHour = parseFloat(getArg('--startHour', '9'));
const endHour = parseFloat(getArg('--endHour', '22'));
const shouldPush = args.includes('--push');

const AUTHOR_NAME = 'Saurabh Gaur';
const AUTHOR_EMAIL = 'saurabhgaur122000@gmail.com';
const TIMEZONE_OFFSET = '+05:30';

console.log(`[STREAK-GEN] Starting commit batch generation:`);
console.log(`  Date: ${dateStr}`);
console.log(`  Commit Count: ${count}`);
console.log(`  Time Range: ${startHour}:00 to ${endHour}:00 (${TIMEZONE_OFFSET})`);
console.log(`  Target File: ${activityFilePath}`);

const messages = [
  'chore(activity): record streak telemetry checkpoint',
  'docs(activity): update sync timestamp log',
  'chore(metrics): update contribution log entry',
  'chore(telemetry): sync activity metrics heartbeat',
  'docs(metrics): log automated development cadence benchmark',
  'chore(sync): maintain daily repo activity sequence',
  'docs(journal): track continuous integration activity flow',
  'chore(telemetry): record dev pulse status heartbeat',
];

const totalSecondsSpan = (endHour - startHour) * 3600;
const intervalSeconds = count > 1 ? totalSecondsSpan / (count - 1) : 0;

for (let i = 0; i < count; i++) {
  const offsetSeconds = Math.round(i * intervalSeconds);
  const currentTotalSeconds = Math.round(startHour * 3600) + offsetSeconds;
  
  const h = Math.floor(currentTotalSeconds / 3600);
  const m = Math.floor((currentTotalSeconds % 3600) / 60);
  const s = currentTotalSeconds % 60;
  
  const timeFormatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  const gitDate = `${dateStr}T${timeFormatted}${TIMEZONE_OFFSET}`;
  
  const msgType = messages[i % messages.length];
  const commitMsg = `${msgType} #${i + 1} (${dateStr})`;
  
  const logLine = `- **${dateStr} ${timeFormatted} ${TIMEZONE_OFFSET}** | Commit #${i + 1}/${count} | \`${commitMsg}\`\n`;
  
  // Update the activity file
  fs.appendFileSync(activityFilePath, logLine, 'utf8');
  
  // Run git add and git commit with environment variables for date and author
  execSync(`git add "${activityFilePath}"`, { cwd: projectRoot, stdio: 'pipe' });
  
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: AUTHOR_NAME,
    GIT_AUTHOR_EMAIL: AUTHOR_EMAIL,
    GIT_COMMITTER_NAME: AUTHOR_NAME,
    GIT_COMMITTER_EMAIL: AUTHOR_EMAIL,
    GIT_AUTHOR_DATE: gitDate,
    GIT_COMMITTER_DATE: gitDate,
  };
  
  execSync(`git commit -m "${commitMsg}"`, {
    cwd: projectRoot,
    env,
    stdio: 'pipe',
  });
  
  if ((i + 1) % 25 === 0 || i + 1 === count) {
    console.log(`[STREAK-GEN] Progress: ${i + 1}/${count} commits created (Latest: ${gitDate})...`);
  }
}

console.log(`[STREAK-GEN] Successfully created ${count} commits for ${dateStr}!`);

if (shouldPush) {
  console.log(`[STREAK-GEN] Pushing to origin main...`);
  execSync('git push origin main', { cwd: projectRoot, stdio: 'inherit' });
  console.log(`[STREAK-GEN] Push completed successfully.`);
}
