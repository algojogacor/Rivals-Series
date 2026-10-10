'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Match } from '@/lib/types';
import { disputeMatchAction } from '@/lib/actions';
import { EvidenceUploadInput } from '../EvidenceUploadInput';

interface DisputesTabProps {
  matches: Match[];
  disputes: any[];
  isPending: boolean;
  startTransition: (callback: () => Promise<void>) => void;
  showMessage: (type: 'success' | 'error', text: string) => void;
}

export function DisputesTab({
  matches,
  disputes,
  isPending,
  startTransition,
  showMessage,
}: DisputesTabProps) {
  return (
    <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-6 sm:p-8 space-y-8">
      <div>
        <h2 className="font-[family-name:var(--font-display)] font-extrabold text-2xl uppercase tracking-tight text-[var(--text)]">
          Penyelesaian Sengketa Resmi (BAB IX)
        </h2>
        <p className="text-[13px] text-[var(--text-dim)]">
          Keberatan resmi diajukan berlandaskan bukti tangkapan layar atau rekaman video (Pasal 35).
        </p>
      </div>

      {/* Form Ajukan Sengketa */}
      <form
        action={(formData) => {
          startTransition(async () => {
            const res = await disputeMatchAction(formData);
            if (res?.error) {
              showMessage('error', res.error);
            } else {
              showMessage('success', 'Sengketa resmi berhasil diajukan.');
            }
          });
        }}
        className="space-y-4 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] p-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] text-[var(--text-dim)] mb-1">Pilih Matchday</label>
            <select
              name="match_id"
              required
              className="w-full h-10 px-3 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-xs text-[var(--text)]"
            >
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id} ({m.home_participant_id === 'participant_a' ? 'A vs B' : 'B vs A'})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-[var(--text-dim)] mb-1">Pasal Terkait</label>
            <input
              type="text"
              name="rule_article"
              placeholder="Contoh: Pasal 19"
              required
              className="w-full h-10 px-3 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-xs text-[var(--text)]"
            />
          </div>
          <div>
            <label className="block text-[11px] text-[var(--text-dim)] mb-1">Kategori Sengketa</label>
            <select
              name="dispute_type"
              required
              className="w-full h-10 px-3 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-xs text-[var(--text)]"
            >
              <option value="violation_roster">Pelanggaran Roster / Skuad</option>
              <option value="violation_quota_idn">Pelanggaran Kuota Indonesia</option>
              <option value="disconnection_dispute">Sengketa Gangguan Koneksi</option>
              <option value="score_mismatch">Perbedaan Catatan Skor</option>
              <option value="unsporting_behavior">Perilaku Tidak Sportif</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-[var(--text-dim)] mb-1">Uraian Klaim & Fakta</label>
          <textarea
            name="claim_summary"
            rows={3}
            placeholder="Jelaskan fakta objektif dan kronologi kejadian..."
            required
            className="w-full p-3 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-xs text-[var(--text)]"
          />
        </div>

        <EvidenceUploadInput
          name="evidence_url"
          prefix="sengketa"
          label="Unggah Bukti Screenshot / Rekaman Sengketa"
          helperText="Pilih screenshot keberatan, seret & lepas, atau paste (Ctrl+V) langsung."
        />

        <button
          type="submit"
          disabled={isPending}
          className="h-10 px-6 rounded-[8px] bg-[var(--danger)] text-[var(--ink-0)] font-semibold text-xs uppercase tracking-wider hover:opacity-90 disabled:opacity-40"
        >
          Ajukan Keberatan Resmi
        </button>
      </form>

      {/* Active Disputes List */}
      <div className="space-y-3">
        <span className="font-bold text-xs text-[var(--text)] uppercase block">
          Daftar Sengketa ({disputes.length})
        </span>
        {disputes.length > 0 ? (
          disputes.map((d) => (
            <div
              key={d.id}
              className="p-4 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-[var(--text)]">{d.id} · {d.match_id}</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-[var(--danger)]/15 text-[var(--danger)] uppercase font-bold">
                  {d.status}
                </span>
              </div>
              <p className="text-[var(--text-dim)]">{d.claim_summary}</p>
              {d.evidence_url && (
                <div className="pt-2 flex items-center gap-3">
                  <a
                    href={d.evidence_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative h-14 w-24 rounded-[6px] overflow-hidden border border-[var(--line)] bg-[var(--ink-0)] shrink-0 hover:border-[var(--text)] transition-colors"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={d.evidence_url}
                      alt="Bukti Sengketa"
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </a>
                  <a
                    href={d.evidence_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-[var(--p-a)] hover:underline inline-flex items-center gap-1 font-mono"
                  >
                    <span>Lihat Bukti Lampiran</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-xs text-[var(--text-dim)]">Tidak ada sengketa aktif.</p>
        )}
      </div>
    </div>
  );
}
