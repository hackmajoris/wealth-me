import { useState, useRef, type ReactNode } from 'react';
import { api, ApiError } from '../lib/api';
import type { Entry } from '../lib/storage';

function exportCSV(entries: Entry[]): void {
  const header = 'month,year,cryptoInvested,cryptoReturn,stockInvested,stockReturn,note';
  const lines = [header];
  entries.forEach(e => {
    lines.push([e.mo, e.yr,
      e.cryptoInvested, e.cryptoReturn,
      e.stocksInvested, e.stocksReturn,
      e.note || '',
    ].join(','));
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'wealth-me-entries.csv'; a.click();
  URL.revokeObjectURL(url);
}

function SettingSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text3)' }}>{title}</div>
      </div>
      <div style={{ padding: '20px' }}>{children}</div>
    </div>
  );
}

interface SettingsProps {
  entries: Entry[];
  onRefresh: () => void;
  onClear: () => void;
}

export function Settings({ entries, onRefresh, onClear }: SettingsProps) {
  const [dragOver, setDragOver]       = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading]     = useState(false);
  const [uploadDone, setUploadDone]   = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | null | undefined) => {
    if (!file) return;
    setPendingFile(file);
    setUploadDone(null);
    setUploadError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    setUploadError(null);
    try {
      const imported = await api.upload.csv(pendingFile);
      setUploadDone(imported.length);
      setPendingFile(null);
      onRefresh();
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const a = document.createElement('a');
    a.href = api.upload.csvTemplateURL();
    a.download = 'wealth-me-template.csv';
    a.click();
  };

  const handleClear = async () => {
    for (const entry of entries) {
      await api.entries.remove(entry.id).catch(() => {});
    }
    onClear();
    setConfirmClear(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 680 }}>
      <div className="page-header" style={{ marginBottom: 4 }}>
        <div>
          <div className="page-title">Settings</div>
          <div className="page-sub">Data management &amp; preferences</div>
        </div>
      </div>

      <SettingSection title="Import Data · CSV">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '12px 14px', fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>
            <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 6, fontSize: 13 }}>Expected CSV columns</div>
            <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--purple)', display: 'block', whiteSpace: 'pre' }}>
              month, year, cryptoInvested, cryptoReturn, stockInvested, stockReturn, note
            </code>
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text3)' }}>
              month: "September" · year: 2021 · values as numbers · note optional
            </div>
          </div>

          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? 'var(--purple)' : 'var(--border2)'}`,
              borderRadius: 12, padding: '32px 20px', textAlign: 'center', cursor: 'pointer',
              background: dragOver ? 'rgba(167,139,250,0.06)' : 'transparent',
              transition: 'all .15s',
            }}
          >
            <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files?.[0])} />
            <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.5 }}>⬆</div>
            {pendingFile
              ? <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{pendingFile.name}</div>
              : <>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Drop a CSV file here</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>or click to browse</div>
                </>
            }
          </div>

          {pendingFile && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" style={{ fontSize: 12, padding: '7px 14px' }}
                onClick={() => { setPendingFile(null); setUploadError(null); }}>
                Discard
              </button>
              <button className="btn-primary" style={{ fontSize: 12, padding: '7px 14px' }}
                onClick={handleUpload} disabled={uploading}>
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          )}

          {uploadError && (
            <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#f87171', fontWeight: 500 }}>
              ✗ {uploadError}
            </div>
          )}

          {uploadDone !== null && (
            <div style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#34d399', fontWeight: 500 }}>
              ✓ Imported {uploadDone} row{uploadDone !== 1 ? 's' : ''} — entries are now visible in your portfolio.
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost" style={{ fontSize: 12, padding: '7px 14px' }} onClick={downloadTemplate}>
              ↓ Download template CSV
            </button>
          </div>
        </div>
      </SettingSection>

      <SettingSection title="Export Data">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>Export my entries</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              {entries.length} entr{entries.length === 1 ? 'y' : 'ies'} · saved as{' '}
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>wealth-me-entries.csv</span>
            </div>
          </div>
          <button className="btn-ghost" style={{ fontSize: 12, padding: '8px 16px', whiteSpace: 'nowrap', flexShrink: 0 }}
            disabled={entries.length === 0} onClick={() => exportCSV(entries)}>
            ↓ Export CSV
          </button>
        </div>
      </SettingSection>

      <SettingSection title="Data Management">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>Clear all entries</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Permanently remove all {entries.length} entries from the database.</div>
            </div>
            {!confirmClear
              ? <button className="btn-ghost" style={{ fontSize: 12, padding: '8px 16px', whiteSpace: 'nowrap', flexShrink: 0, borderColor: 'rgba(248,113,113,0.3)', color: '#f87171' }}
                  disabled={entries.length === 0} onClick={() => setConfirmClear(true)}>
                  Clear entries
                </button>
              : <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button className="btn-ghost" style={{ fontSize: 12, padding: '8px 14px' }} onClick={() => setConfirmClear(false)}>Cancel</button>
                  <button style={{ fontSize: 12, padding: '8px 14px', borderRadius: 8, border: 'none', background: '#f87171', color: '#fff', fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit' }} onClick={handleClear}>Yes, clear</button>
                </div>
            }
          </div>
        </div>
      </SettingSection>

      <SettingSection title="About">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {([
            ['App', 'Wealth Me'],
            ['Entries', String(entries.length)],
            ['Data storage', 'SQLite (server)'],
            ['Version', '1.0.0'],
          ] as [string, string][]).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text2)' }}>{k}</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text)' }}>{v}</span>
            </div>
          ))}
        </div>
      </SettingSection>
    </div>
  );
}
