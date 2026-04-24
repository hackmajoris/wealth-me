import { useState, useRef, type ReactNode } from 'react';
import { saveEntries, type Entry } from '../lib/storage';
import { fmt$ } from '../lib/formatters';

const CSV_TEMPLATE_HEADERS = 'month,year,cryptoInvested,cryptoReturn,stocksInvested,stocksReturn,note';
const CSV_TEMPLATE_EXAMPLE = 'Jan,2025,5000,7200,3000,3600,Added BTC position';
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface ParseResult {
  rows: Entry[];
  errors: string[];
}

function parseCSV(text: string): ParseResult {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (!lines.length) return { rows: [], errors: [] };
  const errors: string[] = [];
  const rows: Entry[] = [];
  const firstLow = lines[0].toLowerCase();
  const startIdx = (firstLow.includes('month') || firstLow.includes('year')) ? 1 : 0;
  lines.slice(startIdx).forEach((line, i) => {
    const lineNum = startIdx + i + 1;
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const [mo, yr, cInv, cRet, sInv, sRet, ...noteParts] = cols;
    const note = noteParts.join(',').trim();
    if (!mo || !yr) { errors.push(`Line ${lineNum}: missing month or year`); return; }
    if (!MONTH_NAMES.includes(mo)) { errors.push(`Line ${lineNum}: unrecognized month "${mo}" — use Jan, Feb…`); return; }
    const year = parseInt(yr);
    if (isNaN(year) || year < 2000 || year > 2100) { errors.push(`Line ${lineNum}: invalid year "${yr}"`); return; }
    rows.push({
      id: Date.now() + i,
      month: `${mo} ${String(year).slice(2)}`,
      monthFull: `${mo} ${year}`,
      yr: year, mo,
      cryptoInvested: parseFloat(cInv) || 0,
      cryptoReturn:   parseFloat(cRet) || 0,
      stocksInvested: parseFloat(sInv) || 0,
      stocksReturn:   parseFloat(sRet) || 0,
      note: note || '',
      createdAt: new Date().toISOString(),
    });
  });
  return { rows, errors };
}

function exportCSV(entries: Entry[]): void {
  const lines = [CSV_TEMPLATE_HEADERS];
  entries.forEach(e => {
    lines.push([e.mo, e.yr, e.cryptoInvested, e.cryptoReturn, e.stocksInvested, e.stocksReturn, e.note || ''].join(','));
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
  onImport: (imported: Entry[]) => void;
  onClear: () => void;
}

export function Settings({ entries, onImport, onClear }: SettingsProps) {
  const [dragOver, setDragOver] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importDone, setImportDone] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | null | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const result = parseCSV(e.target?.result as string);
      setParseResult(result);
      setImportDone(false);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleConfirmImport = () => {
    if (!parseResult || !parseResult.rows.length) return;
    const merged = [...entries];
    parseResult.rows.forEach(row => {
      const dup = merged.find(e => e.mo === row.mo && e.yr === row.yr);
      if (!dup) merged.push(row);
    });
    saveEntries(merged);
    onImport(merged);
    setImportDone(true);
    setParseResult(null);
  };

  const handleClear = () => {
    saveEntries([]);
    onClear();
    setConfirmClear(false);
  };

  const downloadTemplate = () => {
    const content = [CSV_TEMPLATE_HEADERS, CSV_TEMPLATE_EXAMPLE].join('\n');
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'wealth-me-template.csv'; a.click();
    URL.revokeObjectURL(url);
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
            <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--purple)', display: 'block', whiteSpace: 'pre' }}>{CSV_TEMPLATE_HEADERS}</code>
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text3)' }}>
              Month as 3-letter abbreviation (Jan, Feb…) · Year as 4-digit number · Values in your local currency · Note is optional
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
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Drop a CSV file here</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>or click to browse</div>
          </div>

          {parseResult && (
            <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: parseResult.rows.length ? '#34d399' : '#f87171' }}>
                  {parseResult.rows.length ? `✓ ${parseResult.rows.length} row${parseResult.rows.length > 1 ? 's' : ''} ready to import` : '✗ No valid rows found'}
                </div>
                {parseResult.errors.length > 0 && (
                  <div style={{ fontSize: 11, color: '#fb923c', marginLeft: 'auto' }}>
                    {parseResult.errors.length} warning{parseResult.errors.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
              {parseResult.errors.length > 0 && (
                <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {parseResult.errors.map((err, i) => <div key={i} style={{ color: '#fb923c' }}>⚠ {err}</div>)}
                </div>
              )}
              {parseResult.rows.length > 0 && (
                <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                  <table className="data-table" style={{ fontSize: 11 }}>
                    <thead><tr><th>Month</th><th>Crypto Inv.</th><th>Crypto Value</th><th>Stocks Inv.</th><th>Stocks Value</th></tr></thead>
                    <tbody>
                      {parseResult.rows.map((r, i) => (
                        <tr key={i}>
                          <td style={{ fontFamily: 'Outfit', fontWeight: 600 }}>{r.monthFull}</td>
                          <td>{fmt$(r.cryptoInvested)}</td>
                          <td>{fmt$(r.cryptoReturn)}</td>
                          <td>{fmt$(r.stocksInvested)}</td>
                          <td>{fmt$(r.stocksReturn)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                <button className="btn-ghost" style={{ fontSize: 12, padding: '7px 14px' }} onClick={() => setParseResult(null)}>Discard</button>
                {parseResult.rows.length > 0 && (
                  <button className="btn-primary" style={{ fontSize: 12, padding: '7px 14px' }} onClick={handleConfirmImport}>
                    Import {parseResult.rows.length} row{parseResult.rows.length > 1 ? 's' : ''}
                  </button>
                )}
              </div>
            </div>
          )}

          {importDone && (
            <div style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#34d399', fontWeight: 500 }}>
              ✓ Import complete — entries are now visible in the Dashboard.
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
              {entries.length} manual entr{entries.length === 1 ? 'y' : 'ies'} · saved as{' '}
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
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Permanently remove all {entries.length} manually logged entries from local storage.</div>
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
            ['Data range', 'Sep 2019 – Apr 2026 · 6.6 years'],
            ['Data storage', 'localStorage (this browser only)'],
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
