const { spawn } = require('child_process');

const push = spawn('npm', ['run', 'db:push'], {
  cwd: __dirname,
  stdio: ['pipe', 'inherit', 'inherit']
});

// Answer "create column" for any prompts (by pressing Enter/newline)
setTimeout(() => {
  push.stdin.write('\n');
}, 3000);

push.on('close', (code) => {
  console.log(`\nProcess exited with code ${code}`);
  process.exit(code);
});
