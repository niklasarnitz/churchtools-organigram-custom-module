import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Script to generate a changelog entry from git commits since the last tag.
 */

try {
  // 1. Get the latest tag
  let lastTag = '';
  try {
    lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
  } catch (e) {
    // If no tags found, get the first commit
    lastTag = execSync('git rev-list --max-parents=0 HEAD', { encoding: 'utf8' }).trim();
    console.log(`No tags found, starting from first commit: ${lastTag}`);
  }

  console.log(`Generating changelog since tag: ${lastTag}`);

  // 2. Get commits since last tag
  const commits = execSync(`git log ${lastTag}..HEAD --oneline`, { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(line => line.length > 0)
    // Filter out merge commits and trivial messages
    .filter(line => !line.toLowerCase().includes('merge pull request'))
    .filter(line => !line.toLowerCase().includes('merge branch'))
    .map(line => {
      // Remove the hash
      const message = line.split(' ').slice(1).join(' ');
      return message;
    });

  if (commits.length === 0) {
    console.log('No new commits since last tag.');
    process.exit(0);
  }

  // 3. Format output
  const date = new Date().toISOString().split('T')[0];
  const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  const version = packageJson.version;

  console.log('\n--- Suggested Changelog Entry ---');
  console.log(JSON.stringify({
    version,
    date,
    changes: commits
  }, null, 2));
  console.log('---------------------------------\n');

  console.log('Common changes (filtered):');
  commits.forEach(c => console.log(`- ${c}`));

} catch (error) {
  console.error('Error generating changelog:', error.message);
  process.exit(1);
}
