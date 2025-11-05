import { spawn } from 'child_process';

let TEST_PORT = Number(process.env.TEST_PORT || 5002);
let BASE = `http://localhost:${TEST_PORT}/api`;

function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function waitForHealth(timeoutMs=30000){
  const start = Date.now();
  while(Date.now()-start < timeoutMs){
    try{
      const res = await fetch(`${BASE}/health`);
      if(res.ok) return true;
    }catch{}
    await wait(500);
  }
  throw new Error('Server did not become healthy in time');
}

async function main(){
  console.log('Starting server (memory Mongo)…');
  let child;
  const tryPorts = [];
  for (let p = TEST_PORT; p < TEST_PORT + 10; p++) tryPorts.push(p);
  for (const p of tryPorts) {
    BASE = `http://localhost:${p}/api`;
    child = spawn('npx', ['tsx','src/index.ts'], {
      shell: true,
      stdio: ['ignore','inherit','pipe'],
      env: { ...process.env, MONGO_URI: 'memory', PORT: String(p) }
    });
    const errLines = [];
    child.stderr.on('data', (d)=> errLines.push(String(d)));
    try {
      await waitForHealth();
      TEST_PORT = p;
      break;
    } catch (e) {
      const err = errLines.join('');
      try { child.kill('SIGINT'); } catch {}
      if (err.includes('EADDRINUSE')) {
        console.warn(`Port ${p} in use, trying next…`);
        continue;
      }
      throw e;
    }
  }

  try{
    console.log('Server is up. Running smoke tests…');
    const smoke = spawn(process.execPath, ['scripts/smoke-server.mjs'], {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: { ...process.env, BASE }
    });
    await new Promise((resolve,reject)=>{
      smoke.on('exit', (code)=> code===0?resolve(0):reject(new Error(`Smoke exited ${code}`)) );
    });
    console.log('E2E OK');
  } finally {
    try { child.kill('SIGINT'); } catch {}
  }
}

main().catch((e)=>{ console.error(e); process.exit(1); });
