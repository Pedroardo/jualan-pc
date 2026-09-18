// ============================================================
// Menjalankan backend + frontend bersamaan dari satu terminal.
//
// Sengaja TIDAK memakai library tambahan (dulu: concurrently). Alasannya:
// kalau `npm install` di root belum sempat jalan atau gagal, `npm run dev`
// tetap bisa dipakai. Script ini hanya memakai modul bawaan Node.js.
//
// Yang dilakukan:
//   1. memastikan struktur folder benar (lihat check-structure.mjs)
//   2. memastikan dependency sudah ter-install, kalau belum langsung diinstall
//   3. menyalakan `npm run dev` di server/ dan client/ sekaligus
//   4. memberi awalan [SERVER] / [CLIENT] pada tiap baris output
//   5. Ctrl+C sekali -> keduanya mati bersama
// ============================================================

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';

// Di Windows, `npm` sebenarnya file batch (npm.cmd). Sejak Node 20 file .cmd
// tidak bisa di-spawn langsung tanpa shell, jadi kita nyalakan shell di sana.
const npm = isWindows ? 'npm.cmd' : 'npm';
const spawnOpts = { cwd: root, shell: isWindows };

const tty = process.stdout.isTTY;
const paint = (code, s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);

const targets = [
  { name: 'SERVER', dir: 'server', color: 36 }, // cyan
  { name: 'CLIENT', dir: 'client', color: 32 }, // hijau
];

// ------------------------------------------------------------
// 1. Struktur folder
// ------------------------------------------------------------
const check = spawnSync(process.execPath, [path.join(root, 'scripts', 'check-structure.mjs')], {
  stdio: 'inherit',
});
if (check.status !== 0) process.exit(check.status ?? 1);

// ------------------------------------------------------------
// 2. Dependency
// ------------------------------------------------------------
// Tanpa langkah ini, orang yang lupa `npm install` akan dapat error Vite/Express
// "command not found" yang tidak menjelaskan apa-apa.
for (const t of targets) {
  if (!fs.existsSync(path.join(root, t.dir, 'node_modules'))) {
    console.log(paint(33, `\n  Dependency ${t.dir}/ belum ter-install. Menginstall dulu (sekali saja)...\n`));
    const res = spawnSync(npm, ['--prefix', t.dir, 'install'], { ...spawnOpts, stdio: 'inherit' });
    if (res.status !== 0) {
      console.error(paint(31, `\n  Gagal menginstall dependency di ${t.dir}/. Periksa koneksi internet lalu ulangi.\n`));
      process.exit(1);
    }
  }
}

// ------------------------------------------------------------
// 3 & 4. Nyalakan keduanya, beri label per baris
// ------------------------------------------------------------
console.log('');
console.log(paint(1, '  Menjalankan backend + frontend. Tekan Ctrl+C untuk berhenti.'));
console.log('');

const children = [];
let shuttingDown = false;

for (const t of targets) {
  const label = paint(t.color, `[${t.name}]`);

  const child = spawn(npm, ['--prefix', t.dir, 'run', 'dev'], {
    ...spawnOpts,
    stdio: ['ignore', 'pipe', 'pipe'],
    // `npm run dev` menyalakan proses cucu (nodemon/vite). Kalau hanya npm-nya
    // yang dibunuh, cucunya tetap hidup dan port 4000/5173 tetap terpakai —
    // besoknya muncul error "port already in use" yang membingungkan.
    // detached membuat tiap anak punya process group sendiri, sehingga bisa
    // dimatikan satu rombongan. Di Windows tidak dipakai (bikin jendela baru);
    // di sana pembersihan ditangani `taskkill /T`.
    detached: !isWindows,
  });

  // Output datang potongan-potongan, belum tentu pas satu baris. Sisa potongan
  // disimpan di `buffer` supaya label tidak nyempil di tengah kalimat.
  const prefixLines = (stream, out) => {
    let buffer = '';
    stream.setEncoding('utf8');
    stream.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';
      for (const line of lines) out.write(`${label} ${line}\n`);
    });
    stream.on('end', () => {
      if (buffer.trim()) out.write(`${label} ${buffer}\n`);
    });
  };

  prefixLines(child.stdout, process.stdout);
  prefixLines(child.stderr, process.stderr);

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    const reason = signal ? `sinyal ${signal}` : `kode ${code}`;
    console.log(`${label} ${paint(31, `proses berhenti (${reason}).`)}`);
    // Kalau salah satu mati, yang lain ikut dimatikan. Membiarkan satu proses
    // hidup sendirian cuma bikin bingung: halaman terbuka tapi API-nya mati.
    shutdown(code ?? 1);
  });

  children.push(child);
}

// ------------------------------------------------------------
// 5. Matikan bersama
// ------------------------------------------------------------
function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode === null) {
      try {
        if (isWindows) {
          // /T = ikut proses turunan, /F = paksa.
          spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
        } else {
          // PID negatif = "kirim sinyal ke seluruh process group", bukan cuma
          // ke npm-nya saja.
          process.kill(-child.pid, 'SIGTERM');
        }
      } catch {
        /* proses sudah mati duluan, tidak apa-apa */
      }
    }
  }
  setTimeout(() => process.exit(exitCode), 300);
}

process.on('SIGINT', () => {
  console.log('\n  Menghentikan backend & frontend...');
  shutdown(0);
});
process.on('SIGTERM', () => shutdown(0));
