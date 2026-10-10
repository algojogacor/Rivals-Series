import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

const DEFAULT_UPLOAD_ENDPOINT = 'https://efimg.aryariap.my.id/upload-evidence';
const DEFAULT_UPLOAD_SECRET = 'rs_evidence_secret_2026_9f8a7b6c5d4e3f2a1b0c';
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

function isValidImageBuffer(buf: Uint8Array): boolean {
  if (!buf || buf.length < 12) return false;
  // PNG
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return true;
  }
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return true;
  }
  // WEBP
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return true;
  }
  return false;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: 'Akses ditolak. Anda harus masuk sebagai peserta untuk mengunggah bukti screenshot.' },
      { status: 401 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const rawPrefix = String(formData.get('prefix') || 'md')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 24);

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Pilih file gambar screenshot terlebih dahulu.' },
        { status: 400 }
      );
    }

    if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: 'Ukuran gambar maksimal 10 MB.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    if (!isValidImageBuffer(uint8)) {
      return NextResponse.json(
        { error: 'Format file tidak didukung. Gunakan screenshot PNG, JPG, atau WEBP.' },
        { status: 400 }
      );
    }

    const uploadEndpoint = process.env.EVIDENCE_UPLOAD_ENDPOINT || DEFAULT_UPLOAD_ENDPOINT;
    const uploadSecret = process.env.EVIDENCE_UPLOAD_SECRET || DEFAULT_UPLOAD_SECRET;
    const prefix = `${rawPrefix}_${session.participantId === 'participant_a' ? 'pa' : 'pb'}`;

    const vmRes = await fetch(uploadEndpoint, {
      method: 'POST',
      headers: {
        'x-upload-secret': uploadSecret,
        'x-evidence-prefix': prefix,
        'content-type': 'application/octet-stream',
      },
      body: Buffer.from(uint8),
    });

    const vmData = await vmRes.json().catch(() => ({}));
    if (!vmRes.ok || !vmData.url) {
      return NextResponse.json(
        { error: vmData.error || 'Gagal menyimpan bukti screenshot ke server VM.' },
        { status: vmRes.status || 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      url: vmData.url,
      filename: vmData.filename,
      size: vmData.size,
    });
  } catch (err: any) {
    console.error('Upload evidence error:', err);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengunggah screenshot ke VM.' },
      { status: 500 }
    );
  }
}
