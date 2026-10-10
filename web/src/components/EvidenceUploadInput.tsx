'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, Loader2, Trash2, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';

interface EvidenceUploadInputProps {
  name?: string;
  defaultValue?: string;
  prefix?: string;
  label?: string;
  helperText?: string;
  required?: boolean;
}

export function EvidenceUploadInput({
  name = 'evidence_url',
  defaultValue = '',
  prefix = 'md',
  label = 'Bukti Screenshot Pertandingan (Tersimpan di Server VM)',
  helperText = 'Klik untuk pilih foto, seret & lepas (drag & drop), atau tekan Ctrl+V untuk menempel screenshot langsung.',
  required = false,
}: EvidenceUploadInputProps) {
  const [url, setUrl] = useState<string>(defaultValue || '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUrl(defaultValue || '');
  }, [defaultValue]);

  const handleUploadFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Pilih file gambar (PNG, JPG, atau WEBP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Ukuran gambar maksimal 10 MB.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('prefix', prefix);

      const res = await fetch('/api/upload-evidence', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Gagal mengunggah screenshot ke VM.');
      }

      setUrl(data.url);
    } catch (err: any) {
      setError(err.message || 'Gagal mengunggah screenshot.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          handleUploadFile(file);
          break;
        }
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      handleUploadFile(file);
    }
  };

  return (
    <div className="space-y-2" onPaste={handlePaste}>
      <label className="block text-[11px] font-semibold text-[var(--text-dim)]">
        {label} {required && <span className="text-[var(--danger)]">*</span>}
      </label>

      {/* Hidden form input so Server Action receives evidence_url */}
      <input type="hidden" name={name} value={url} required={required} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUploadFile(f);
        }}
      />

      {url ? (
        /* Uploaded State with Image Preview */
        <div className="rounded-[10px] bg-[var(--ink-1)] border border-[var(--ok)]/40 p-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-[var(--ok)] font-semibold min-w-0">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="truncate">Screenshot tersimpan di Server VM</span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 px-2.5 rounded-[6px] bg-[var(--ink-2)] border border-[var(--line)] text-[11px] font-semibold text-[var(--text)] hover:border-[var(--text-dim)] inline-flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Buka Ukuran Penuh</span>
              </a>

              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="h-8 px-2.5 rounded-[6px] bg-[var(--ink-2)] border border-[var(--line)] text-[11px] font-semibold text-[var(--text-dim)] hover:text-[var(--text)]"
              >
                Ganti Foto
              </button>

              <button
                type="button"
                disabled={uploading}
                onClick={() => setUrl('')}
                className="h-8 w-8 rounded-[6px] bg-[var(--danger)]/15 border border-[var(--danger)]/30 text-[var(--danger)] flex items-center justify-center hover:bg-[var(--danger)] hover:text-white transition-colors"
                title="Hapus screenshot"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="relative rounded-[8px] overflow-hidden border border-[var(--line)] bg-[var(--ink-0)] max-h-64 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="Bukti Screenshot"
              className="max-h-64 w-auto object-contain"
            />
          </div>
        </div>
      ) : (
        /* Dropzone / Upload Trigger */
        <div
          role="button"
          tabIndex={0}
          onClick={() => !uploading && fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (!uploading) fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`rounded-[10px] border-2 border-dashed p-5 text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 ${
            dragOver
              ? 'border-[var(--text)] bg-[var(--ink-2)]'
              : 'border-[var(--line)] bg-[var(--ink-1)] hover:border-[var(--text-dim)]'
          }`}
        >
          {uploading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin text-[var(--text)]" />
              <span className="text-xs font-semibold text-[var(--text)]">
                Mengunggah screenshot ke Server VM…
              </span>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-[var(--ink-2)] border border-[var(--line)] flex items-center justify-center text-[var(--text)]">
                <Upload className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-[var(--text)]">
                Klik untuk Pilih Screenshot / Foto dari Perangkat
              </div>
              <p className="text-[11px] text-[var(--text-faint)] max-w-md">
                {helperText} (Format: PNG, JPG, WEBP · Maks. 10 MB)
              </p>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-[6px] bg-[var(--danger)]/15 border border-[var(--danger)]/30 px-3 py-2 text-[11px] text-[var(--danger)] flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
