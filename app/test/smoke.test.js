// Minimal dependency-free smoke test: boots the server, hits /healthz, exits.
// Kept intentionally simple so the Jenkins pipeline has a real "test" stage
// without pulling in a full test framework.

const { spawn } = require('child_process');
const http = require('http');

const PORT = 4321;
const child = spawn('node', ['server.js'], {
  cwd: __dirname + '/..',
  env: { ...process.env, PORT },
  stdio: 'inherit',
});

function check(retries = 10) {
  http
    .get(`http://localhost:${PORT}/healthz`, (res) => {
      if (res.statusCode === 200) {
        console.log('smoke test passed: /healthz returned 200');
        child.kill();
        process.exit(0);
      } else {
        fail(retries, `unexpected status ${res.statusCode}`);
      }
    })
    .on('error', (err) => fail(retries, err.message));
}

function fail(retries, reason) {
  if (retries <= 0) {
    console.error('smoke test failed:', reason);
    child.kill();
    process.exit(1);
  }
  setTimeout(() => check(retries - 1), 500);
}

setTimeout(() => check(), 500);

