// ============================================================
// Membersihkan hasil install yang kacau, lalu install ulang dari nol.
//
// Dipakai kalau muncul error aneh seputar dependency: modul "tidak ditemukan"
// padahal ada di package.json, esbuild/rollup gagal jalan, atau sisa-sisa
// percobaan install sebelumnya (mis. node_modules di root dari konfigurasi
// npm workspaces yang lama) bikin bentrok.
//
// Aman dijalankan kapan saja: tidak menyentuh kode, .env, atau database.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';
const npm = isWindows ? 'npm.cmd' : 'npm';

// node_modules & package-lock.json di ROOT memang sengaja dihapus: sekarang
// tiap folder (client/ dan server/) punya node_modules sendiri-sendiri.
const targets = [
  'node_modules',
  'package-lock.json',
  'server/node_modules',
  'client/node_modules',
];

console.log('');
for (const t of targets) {
  const full = path.join(root, t);
  if (fs.existsSync(full)) {
    fs.rmSync(full, { recursive: true, force: true });
    console.log(`  dihapus  ${t}`);
  } else {
    console.log(`  lewati   ${t} (tidak ada)`);
  }
}

console.log('\n  Install ulang...\n');
const res = spawnSync(npm, ['install'], { cwd: root, stdio: 'inherit', shell: isWindows });
process.exit(res.status ?? 0);
