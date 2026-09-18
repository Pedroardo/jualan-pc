// ============================================================
// Pemeriksa struktur folder.
//
// Kenapa file ini ada:
// Error "No workspaces found: --workspace=client" itu sebenarnya npm yang
// bingung, bukan kode yang rusak. Penyebabnya cuma satu: perintah dijalankan
// di folder yang TIDAK punya client/package.json dan server/package.json
// (biasanya folder patch/zip, bukan folder project asli).
//
// Script ini dijalankan lebih dulu oleh semua perintah npm di root, lalu
// menghentikan proses dengan pesan yang menyebut persis apa yang kurang —
// jauh lebih enak dibaca daripada error bawaan npm.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const verbose = process.argv.includes('--verbose');

// Warna ANSI. Git Bash, PowerShell, dan Terminal Windows semuanya sudah
// mendukung ini. Kalau output dialihkan ke file (bukan terminal), warna
// dimatikan supaya file log-nya tidak penuh karakter aneh.
const tty = process.stdout.isTTY;
const c = {
  red: (s) => (tty ? `\x1b[31m${s}\x1b[0m` : s),
  green: (s) => (tty ? `\x1b[32m${s}\x1b[0m` : s),
  yellow: (s) => (tty ? `\x1b[33m${s}\x1b[0m` : s),
  dim: (s) => (tty ? `\x1b[2m${s}\x1b[0m` : s),
  bold: (s) => (tty ? `\x1b[1m${s}\x1b[0m` : s),
};

/** Daftar hal yang wajib ada di folder project asli. */
const required = [
  { file: 'server/package.json', label: 'Backend (Express)' },
  { file: 'client/package.json', label: 'Frontend (Vite + React)' },
];

const missing = required.filter((r) => !fs.existsSync(path.join(root, r.file)));

if (missing.length > 0) {
  console.error('');
  console.error(c.red(c.bold('  X  Folder ini belum lengkap, perintah dibatalkan.')));
  console.error('');
  console.error(`  Folder yang dipakai : ${c.yellow(root)}`);
  console.error('');
  console.error('  File yang tidak ditemukan:');
  for (const m of missing) {
    console.error(`    ${c.red('-')} ${m.file}   ${c.dim(`(${m.label})`)}`);
  }
  console.error('');
  console.error(c.bold('  Penyebab paling umum:'));
  console.error('  Anda menjalankan perintah di dalam folder PATCH hasil unzip.');
  console.error('  Folder patch hanya berisi file yang berubah, jadi tidak bisa');
  console.error('  dijalankan sendiri — isinya harus disalin dulu ke project asli.');
  console.error('');
  console.error(c.bold('  Cara memperbaiki:'));
  console.error('');
  console.error(c.green('    # 1. Salin seluruh isi folder patch ke folder project asli'));
  console.error(c.green('    #    (menimpa file lama, struktur foldernya sudah sama persis)'));
  console.error(c.green('    cp -r ~/Downloads/pc-portfolio-patch/* ~/path/ke/pc-portfolio/'));
  console.error('');
  console.error(c.green('    # 2. Pindah ke folder project asli'));
  console.error(c.green('    cd ~/path/ke/pc-portfolio'));
  console.error('');
  console.error(c.green('    # 3. Install lalu jalankan'));
  console.error(c.green('    npm install'));
  console.error(c.green('    npm run dev'));
  console.error('');
  console.error(c.dim('  Selengkapnya ada di README.md bagian "Cara memasang patch".'));
  console.error('');
  process.exit(1);
}

if (verbose) {
  console.log('');
  console.log(c.bold('  Pemeriksaan project'));
  console.log(`  Folder      : ${root}`);
  console.log(`  Node.js     : ${process.version}${majorVersion() < 18 ? c.red('  <- minimal v18!') : c.green('  OK')}`);
  for (const r of required) {
    console.log(`  ${c.green('v')} ${r.file}`);
  }
  for (const [label, file] of [
    ['node_modules server', 'server/node_modules'],
    ['node_modules client', 'client/node_modules'],
    ['konfigurasi server', 'server/.env'],
    ['konfigurasi client', 'client/.env'],
  ]) {
    const ok = fs.existsSync(path.join(root, file));
    console.log(`  ${ok ? c.green('v') : c.yellow('!')} ${file}  ${ok ? '' : c.dim(`(${label} belum ada)`)}`);
  }
  console.log('');
}

function majorVersion() {
  return Number(process.version.replace('v', '').split('.')[0]);
}
