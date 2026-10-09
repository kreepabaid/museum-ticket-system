const { spawn } = require('child_process');
const path = require('path');

console.log('================================================================');
console.log(' MUSEUM AND EXHIBITION TICKET SYSTEM — LOCAL LAUNCHER');
console.log('================================================================');
console.log(' Starting Serverless Express Backend (Port 3000)...');
console.log(' Starting Vite React Frontend (Port 5173)...');
console.log(' Admin Demo:   admin@museum.org / Admin@123');
console.log(' Visitor Demo: visitor@example.com / Visitor@123');
console.log('================================================================\n');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

// 1. Launch Backend
const backend = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true
});

// 2. Launch Frontend
const frontend = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'inherit',
  shell: true
});

const cleanup = () => {
  console.log('\nShutting down Museum Ticket System processes...');
  try { backend.kill(); } catch (e) {}
  try { frontend.kill(); } catch (e) {}
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
