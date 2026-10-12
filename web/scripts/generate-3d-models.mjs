/**
 * Rivals Series — Automated Image-to-3D GLB Generator Script
 * 
 * Usage:
 *   node scripts/generate-3d-models.mjs --provider meshy --apiKey <KEY>
 *   node scripts/generate-3d-models.mjs --provider tripo --apiKey <KEY>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TROPHIES_DIR = path.resolve(__dirname, '../public/models/trophies');
const REFERENCES_DIR = path.join(TROPHIES_DIR, 'references');

const TROPHY_TARGETS = [
  {
    name: 'Champion Trophy (AFC Asian Cup Inspired)',
    imageFile: 'champion_reference.jpg',
    outputGlb: 'champion.glb',
  },
  {
    name: 'Golden Boot (24K Gold Cleat)',
    imageFile: 'boot_reference.jpg',
    outputGlb: 'boot.glb',
  },
  {
    name: 'Golden Glove (Sculpted Catching Hand)',
    imageFile: 'glove_reference.jpg',
    outputGlb: 'glove.glb',
  },
];

// Parse command line arguments
const args = process.argv.slice(2);
function getArg(key) {
  const idx = args.indexOf(key);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return null;
}

const provider = getArg('--provider') || 'meshy';
const apiKey = getArg('--apiKey') || process.env.MESHY_API_KEY || process.env.TRIPO_API_KEY;

if (!apiKey) {
  console.log(`
===============================================================
  RIVALS SERIES — 3D MODEL GENERATION CLI
===============================================================
API key tidak ditemukan.

Cara menjalankan:
  node scripts/generate-3d-models.mjs --provider meshy --apiKey <API_KEY_ANDA>
  node scripts/generate-3d-models.mjs --provider tripo --apiKey <API_KEY_ANDA>

Atau ekspor environment variable:
  $env:MESHY_API_KEY="msy_xxx..."
  node scripts/generate-3d-models.mjs
===============================================================
`);
  process.exit(1);
}

console.log(`Starting 3D Model Generation via ${provider.toUpperCase()}...`);

async function generateWithMeshy(target) {
  const imagePath = path.join(REFERENCES_DIR, target.imageFile);
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Reference image not found: ${imagePath}`);
  }

  const base64Image = fs.readFileSync(imagePath).toString('base64');
  const dataUri = `data:image/jpeg;base64,${base64Image}`;

  console.log(`\n[${target.name}] Mengirim task image-to-3D ke Meshy...`);

  // Step 1: Create Image-to-3D task
  const createRes = await fetch('https://api.meshy.ai/openapi/v1/image-to-3d', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: dataUri,
      enable_pbr: true,
      surface_mode: 'hard',
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Meshy API Error (${createRes.status}): ${errText}`);
  }

  const createData = await createRes.json();
  const taskId = createData.result;
  console.log(`[${target.name}] Task dibuat dengan ID: ${taskId}. Menunggu proses...`);

  // Step 2: Poll for completion
  let glbUrl = null;
  while (!glbUrl) {
    await new Promise((r) => setTimeout(r, 6000));
    const statusRes = await fetch(`https://api.meshy.ai/openapi/v1/image-to-3d/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const statusData = await statusRes.json();

    const progress = statusData.progress || 0;
    process.stdout.write(`\r[${target.name}] Progress: ${progress}%...`);

    if (statusData.status === 'SUCCEEDED') {
      glbUrl = statusData.model_urls?.glb;
      break;
    } else if (statusData.status === 'FAILED') {
      throw new Error(`Task gagal: ${statusData.task_error?.message || 'Unknown error'}`);
    }
  }

  console.log(`\n[${target.name}] Selesai! Mengunduh file GLB...`);

  // Step 3: Download GLB
  const glbRes = await fetch(glbUrl);
  const glbBuffer = await glbRes.arrayBuffer();
  const outputPath = path.join(TROPHIES_DIR, target.outputGlb);
  fs.writeFileSync(outputPath, Buffer.from(glbBuffer));

  console.log(`[${target.name}] Tersimpan di: ${outputPath} (${(glbBuffer.byteLength / 1024 / 1024).toFixed(2)} MB)`);
}

async function main() {
  for (const target of TROPHY_TARGETS) {
    try {
      if (provider === 'meshy') {
        await generateWithMeshy(target);
      } else {
        console.log(`Provider ${provider} saat ini belum memiliki runner otomatis. Gunakan --provider meshy.`);
        break;
      }
    } catch (err) {
      console.error(`Error pada ${target.name}:`, err.message);
    }
  }
  console.log('\nSeluruh proses selesai! Buka web dan refresh halaman /awards.');
}

main();
