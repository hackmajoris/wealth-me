import { useState, useRef, type ReactNode, useEffect } from 'react';
import { api, ApiError } from '../lib/api';
import type { ExchangeRates } from '../lib/api';
import type { Entry } from '../lib/storage';

function exportCSV(entries: Entry[]): void {
  const header = 'month,year,cryptoInvested,cryptoReturn,stockInvested,stockReturn,note';
  const lines = [header];
  entries.forEach((e) => {
    lines.push(
      [
        e.mo,
        e.yr,
        e.cryptoInvested,
        e.cryptoReturn,
        e.stocksInvested,
        e.stocksReturn,
        e.note || '',
      ].join(',')
    );
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'wealth-me-entries.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function SettingSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface2)',
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            color: 'var(--text3)',
          }}
        >
          {title}
        </div>
      </div>
      <div style={{ padding: '20px' }}>{children}</div>
    </div>
  );
}

interface SettingsProps {
  entries: Entry[];
  onRefresh: () => void;
  onSavingsRefresh: () => void;
  onClear: () => void;
}

export function Settings({ entries, onRefresh, onSavingsRefresh, onClear }: SettingsProps) {
  const [dragOver, setDragOver] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [savingsDragOver, setSavingsDragOver] = useState(false);
  const [savingsPendingFile, setSavingsPendingFile] = useState<File | null>(null);
  const [savingsUploading, setSavingsUploading] = useState(false);
  const [savingsUploadDone, setSavingsUploadDone] = useState<number | null>(null);
  const [savingsUploadError, setSavingsUploadError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [currency, setCurrency] = useState<string>('RON');
  const [isSavingCurrency, setIsSavingCurrency] = useState(false);
  const [assetsCurrency, setAssetsCurrency] = useState<string>('RON');
  const [isSavingAssetsCurrency, setIsSavingAssetsCurrency] = useState(false);
  const [debtsCurrency, setDebtsCurrency] = useState<string>('RON');
  const [isSavingDebtsCurrency, setIsSavingDebtsCurrency] = useState(false);
  const [assetHistoryDragOver, setAssetHistoryDragOver] = useState(false);
  const [assetHistoryPendingFile, setAssetHistoryPendingFile] = useState<File | null>(null);
  const [assetHistoryUploading, setAssetHistoryUploading] = useState(false);
  const [assetHistoryUploadDone, setAssetHistoryUploadDone] = useState<number | null>(null);
  const [assetHistoryUploadError, setAssetHistoryUploadError] = useState<string | null>(null);
  const [debtHistoryDragOver, setDebtHistoryDragOver] = useState(false);
  const [debtHistoryPendingFile, setDebtHistoryPendingFile] = useState<File | null>(null);
  const [debtHistoryUploading, setDebtHistoryUploading] = useState(false);
  const [debtHistoryUploadDone, setDebtHistoryUploadDone] = useState<number | null>(null);
  const [debtHistoryUploadError, setDebtHistoryUploadError] = useState<string | null>(null);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({
    usdToRon: 4.35,
    eurToRon: 5.09,
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const savingsFileRef = useRef<HTMLInputElement>(null);
  const assetHistoryFileRef = useRef<HTMLInputElement>(null);
  const debtHistoryFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.settings
      .getCurrency()
      .then((s) => setCurrency(s.value))
      .catch(console.error);
    api.settings
      .getAssetsCurrency()
      .then((s) => setAssetsCurrency(s.value))
      .catch(console.error);
    api.settings
      .getDebtsCurrency()
      .then((s) => setDebtsCurrency(s.value))
      .catch(console.error);
    api.settings.getExchangeRates().then(setExchangeRates).catch(console.error);
  }, []);

  const handleFile = (file: File | null | undefined) => {
    if (!file) return;
    setPendingFile(file);
    setUploadDone(null);
    setUploadError(null);
  };

  const handleSavingsFile = (file: File | null | undefined) => {
    if (!file) return;
    setSavingsPendingFile(file);
    setSavingsUploadDone(null);
    setSavingsUploadError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSavingsDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setSavingsDragOver(false);
    handleSavingsFile(e.dataTransfer.files[0]);
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

  const handleSavingsUpload = async () => {
    if (!savingsPendingFile) return;
    setSavingsUploading(true);
    setSavingsUploadError(null);
    try {
      const imported = await api.upload.savingsCsv(savingsPendingFile);
      setSavingsUploadDone(imported.length);
      setSavingsPendingFile(null);
      onSavingsRefresh();
    } catch (err) {
      setSavingsUploadError(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setSavingsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const a = document.createElement('a');
    a.href = api.upload.csvTemplateURL();
    a.download = 'wealth-me-template.csv';
    a.click();
  };

  const downloadSavingsTemplate = () => {
    const a = document.createElement('a');
    a.href = api.upload.savingsCsvTemplateURL();
    a.download = 'savings-template.csv';
    a.click();
  };

  const handleClear = async () => {
    for (const entry of entries) {
      await api.entries.remove(entry.id).catch(() => {});
    }
    onClear();
    setConfirmClear(false);
  };

  const handleSaveCurrency = async (newCurrency: string) => {
    setCurrency(newCurrency);
    setIsSavingCurrency(true);
    try {
      await api.settings.setCurrency(newCurrency);
    } catch (err) {
      console.error('Failed to save currency:', err);
      setCurrency(currency);
    } finally {
      setIsSavingCurrency(false);
    }
  };

  const handleSaveAssetsCurrency = async (newCurrency: string) => {
    setAssetsCurrency(newCurrency);
    setIsSavingAssetsCurrency(true);
    try {
      await api.settings.setAssetsCurrency(newCurrency);
    } catch (err) {
      console.error('Failed to save assets currency:', err);
      setAssetsCurrency(assetsCurrency);
    } finally {
      setIsSavingAssetsCurrency(false);
    }
  };

  const handleAssetHistoryUpload = async () => {
    if (!assetHistoryPendingFile) return;
    setAssetHistoryUploading(true);
    setAssetHistoryUploadError(null);
    try {
      const result = await api.upload.assetHistoryCsv(assetHistoryPendingFile);
      setAssetHistoryUploadDone(result.imported);
      setAssetHistoryPendingFile(null);
    } catch (err) {
      setAssetHistoryUploadError(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setAssetHistoryUploading(false);
    }
  };

  const handleDebtHistoryUpload = async () => {
    if (!debtHistoryPendingFile) return;
    setDebtHistoryUploading(true);
    setDebtHistoryUploadError(null);
    try {
      const result = await api.upload.debtHistoryCsv(debtHistoryPendingFile);
      setDebtHistoryUploadDone(result.imported);
      setDebtHistoryPendingFile(null);
    } catch (err) {
      setDebtHistoryUploadError(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setDebtHistoryUploading(false);
    }
  };

  const handleSaveDebtsCurrency = async (newCurrency: string) => {
    setDebtsCurrency(newCurrency);
    setIsSavingDebtsCurrency(true);
    try {
      await api.settings.setDebtsCurrency(newCurrency);
    } catch (err) {
      console.error('Failed to save debts currency:', err);
      setDebtsCurrency(debtsCurrency);
    } finally {
      setIsSavingDebtsCurrency(false);
    }
  };

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 680, margin: '0 auto' }}
    >
      <div className="page-header" style={{ marginBottom: 4 }}>
        <div>
          <div className="page-title">Settings</div>
          <div className="page-sub">Data management &amp; preferences</div>
        </div>
      </div>

      <SettingSection title="Savings">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Currency</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['EUR', 'USD', 'RON'].map((c) => (
                <button
                  key={c}
                  onClick={() => handleSaveCurrency(c)}
                  disabled={isSavingCurrency}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: currency === c ? 'var(--primary)' : 'var(--surface2)',
                    color: currency === c ? 'white' : 'var(--text)',
                    border: `1px solid ${currency === c ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: currency === c ? 600 : 400,
                    cursor: isSavingCurrency ? 'not-allowed' : 'pointer',
                    opacity: isSavingCurrency ? 0.6 : 1,
                    transition: 'all .15s',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>
              Import Savings Data · CSV
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div
                style={{
                  background: 'var(--surface2)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  fontSize: 12,
                  color: 'var(--text2)',
                  lineHeight: 1.7,
                }}
              >
                <div
                  style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 6, fontSize: 13 }}
                >
                  Expected CSV columns
                </div>
                <code
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 11,
                    color: 'var(--purple)',
                    display: 'block',
                    whiteSpace: 'pre',
                  }}
                >
                  month, year, netIncome, totalExpenses, note
                </code>
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text3)' }}>
                  month: "September" · year: 2021 · values as numbers · note optional
                </div>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setSavingsDragOver(true);
                }}
                onDragLeave={() => setSavingsDragOver(false)}
                onDrop={handleSavingsDrop}
                onClick={() => savingsFileRef.current?.click()}
                style={{
                  border: `2px dashed ${savingsDragOver ? 'var(--purple)' : 'var(--border2)'}`,
                  borderRadius: 12,
                  padding: '32px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: savingsDragOver ? 'rgba(167,139,250,0.06)' : 'transparent',
                  transition: 'all .15s',
                }}
              >
                <input
                  ref={savingsFileRef}
                  type="file"
                  accept=".csv,text/csv"
                  style={{ display: 'none' }}
                  onChange={(e) => handleSavingsFile(e.target.files?.[0])}
                />
                <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.5 }}>⬆</div>
                {savingsPendingFile ? (
                  <div
                    style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}
                  >
                    {savingsPendingFile.name}
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--text)',
                        marginBottom: 4,
                      }}
                    >
                      Drop a CSV file here
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>or click to browse</div>
                  </>
                )}
              </div>

              {savingsPendingFile && (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    className="btn-ghost"
                    style={{ fontSize: 12, padding: '7px 14px' }}
                    onClick={() => {
                      setSavingsPendingFile(null);
                      setSavingsUploadError(null);
                    }}
                  >
                    Discard
                  </button>
                  <button
                    className="btn-primary"
                    style={{ fontSize: 12, padding: '7px 14px' }}
                    onClick={handleSavingsUpload}
                    disabled={savingsUploading}
                  >
                    {savingsUploading ? 'Uploading…' : 'Upload'}
                  </button>
                </div>
              )}

              {savingsUploadError && (
                <div
                  style={{
                    background: 'rgba(248,113,113,0.08)',
                    border: '1px solid rgba(248,113,113,0.2)',
                    borderRadius: 10,
                    padding: '12px 14px',
                    fontSize: 13,
                    color: '#f87171',
                    fontWeight: 500,
                  }}
                >
                  ✗ {savingsUploadError}
                </div>
              )}

              {savingsUploadDone !== null && (
                <div
                  style={{
                    background: 'rgba(52,211,153,0.08)',
                    border: '1px solid rgba(52,211,153,0.2)',
                    borderRadius: 10,
                    padding: '12px 14px',
                    fontSize: 13,
                    color: '#34d399',
                    fontWeight: 500,
                  }}
                >
                  ✓ Imported {savingsUploadDone} row{savingsUploadDone !== 1 ? 's' : ''} — entries
                  are now visible in your savings.
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn-ghost"
                  style={{ fontSize: 12, padding: '7px 14px' }}
                  onClick={downloadSavingsTemplate}
                >
                  ↓ Download template CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      </SettingSection>

      <SettingSection title="Assets">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Currency</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['EUR', 'USD', 'RON'].map((c) => (
                <button
                  key={c}
                  onClick={() => handleSaveAssetsCurrency(c)}
                  disabled={isSavingAssetsCurrency}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: assetsCurrency === c ? 'var(--primary)' : 'var(--surface2)',
                    color: assetsCurrency === c ? 'white' : 'var(--text)',
                    border: `1px solid ${assetsCurrency === c ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: assetsCurrency === c ? 600 : 400,
                    cursor: isSavingAssetsCurrency ? 'not-allowed' : 'pointer',
                    opacity: isSavingAssetsCurrency ? 0.6 : 1,
                    transition: 'all .15s',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>
              Import Historical Data · CSV
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div
                style={{
                  background: 'var(--surface2)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  fontSize: 12,
                  color: 'var(--text2)',
                  lineHeight: 1.7,
                }}
              >
                <div
                  style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 6, fontSize: 13 }}
                >
                  Expected CSV columns
                </div>
                <code
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 11,
                    color: 'var(--purple)',
                    display: 'block',
                    whiteSpace: 'pre',
                  }}
                >
                  month, year, name, type, amount
                </code>
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text3)' }}>
                  month: "September" · year: 2021 · one row per asset per month
                </div>
              </div>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setAssetHistoryDragOver(true);
                }}
                onDragLeave={() => setAssetHistoryDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setAssetHistoryDragOver(false);
                  const f = e.dataTransfer.files[0];
                  if (f) {
                    setAssetHistoryPendingFile(f);
                    setAssetHistoryUploadDone(null);
                    setAssetHistoryUploadError(null);
                  }
                }}
                onClick={() => assetHistoryFileRef.current?.click()}
                style={{
                  border: `2px dashed ${assetHistoryDragOver ? 'var(--blue)' : 'var(--border2)'}`,
                  borderRadius: 12,
                  padding: '32px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: assetHistoryDragOver ? 'rgba(96,165,250,0.06)' : 'transparent',
                  transition: 'all .15s',
                }}
              >
                <input
                  ref={assetHistoryFileRef}
                  type="file"
                  accept=".csv,text/csv"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setAssetHistoryPendingFile(f);
                      setAssetHistoryUploadDone(null);
                      setAssetHistoryUploadError(null);
                    }
                  }}
                />
                <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.5 }}>⬆</div>
                {assetHistoryPendingFile ? (
                  <div
                    style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}
                  >
                    {assetHistoryPendingFile.name}
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--text)',
                        marginBottom: 4,
                      }}
                    >
                      Drop a CSV file here
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>or click to browse</div>
                  </>
                )}
              </div>
              {assetHistoryPendingFile && (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    className="btn-ghost"
                    style={{ fontSize: 12, padding: '7px 14px' }}
                    onClick={() => {
                      setAssetHistoryPendingFile(null);
                      setAssetHistoryUploadError(null);
                    }}
                  >
                    Discard
                  </button>
                  <button
                    className="btn-primary"
                    style={{ fontSize: 12, padding: '7px 14px' }}
                    onClick={handleAssetHistoryUpload}
                    disabled={assetHistoryUploading}
                  >
                    {assetHistoryUploading ? 'Uploading…' : 'Upload'}
                  </button>
                </div>
              )}
              {assetHistoryUploadError && (
                <div
                  style={{
                    background: 'rgba(248,113,113,0.08)',
                    border: '1px solid rgba(248,113,113,0.2)',
                    borderRadius: 10,
                    padding: '12px 14px',
                    fontSize: 13,
                    color: '#f87171',
                    fontWeight: 500,
                  }}
                >
                  ✗ {assetHistoryUploadError}
                </div>
              )}
              {assetHistoryUploadDone !== null && (
                <div
                  style={{
                    background: 'rgba(52,211,153,0.08)',
                    border: '1px solid rgba(52,211,153,0.2)',
                    borderRadius: 10,
                    padding: '12px 14px',
                    fontSize: 13,
                    color: '#34d399',
                    fontWeight: 500,
                  }}
                >
                  ✓ Imported {assetHistoryUploadDone} row{assetHistoryUploadDone !== 1 ? 's' : ''}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn-ghost"
                  style={{ fontSize: 12, padding: '7px 14px' }}
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = api.upload.assetHistoryCsvTemplateURL();
                    a.download = 'asset-history-template.csv';
                    a.click();
                  }}
                >
                  ↓ Download template CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      </SettingSection>

      <SettingSection title="Debts">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Currency</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['EUR', 'USD', 'RON'].map((c) => (
                <button
                  key={c}
                  onClick={() => handleSaveDebtsCurrency(c)}
                  disabled={isSavingDebtsCurrency}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: debtsCurrency === c ? 'var(--primary)' : 'var(--surface2)',
                    color: debtsCurrency === c ? 'white' : 'var(--text)',
                    border: `1px solid ${debtsCurrency === c ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: debtsCurrency === c ? 600 : 400,
                    cursor: isSavingDebtsCurrency ? 'not-allowed' : 'pointer',
                    opacity: isSavingDebtsCurrency ? 0.6 : 1,
                    transition: 'all .15s',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>
              Import Historical Data · CSV
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div
                style={{
                  background: 'var(--surface2)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  fontSize: 12,
                  color: 'var(--text2)',
                  lineHeight: 1.7,
                }}
              >
                <div
                  style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 6, fontSize: 13 }}
                >
                  Expected CSV columns
                </div>
                <code
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 11,
                    color: 'var(--purple)',
                    display: 'block',
                    whiteSpace: 'pre',
                  }}
                >
                  month, year, totalDebt
                </code>
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text3)' }}>
                  month: "September" · year: 2021 · totalDebt as number (amount used)
                </div>
              </div>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDebtHistoryDragOver(true);
                }}
                onDragLeave={() => setDebtHistoryDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDebtHistoryDragOver(false);
                  const f = e.dataTransfer.files[0];
                  if (f) {
                    setDebtHistoryPendingFile(f);
                    setDebtHistoryUploadDone(null);
                    setDebtHistoryUploadError(null);
                  }
                }}
                onClick={() => debtHistoryFileRef.current?.click()}
                style={{
                  border: `2px dashed ${debtHistoryDragOver ? 'var(--red)' : 'var(--border2)'}`,
                  borderRadius: 12,
                  padding: '32px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: debtHistoryDragOver ? 'rgba(248,113,113,0.06)' : 'transparent',
                  transition: 'all .15s',
                }}
              >
                <input
                  ref={debtHistoryFileRef}
                  type="file"
                  accept=".csv,text/csv"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setDebtHistoryPendingFile(f);
                      setDebtHistoryUploadDone(null);
                      setDebtHistoryUploadError(null);
                    }
                  }}
                />
                <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.5 }}>⬆</div>
                {debtHistoryPendingFile ? (
                  <div
                    style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}
                  >
                    {debtHistoryPendingFile.name}
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--text)',
                        marginBottom: 4,
                      }}
                    >
                      Drop a CSV file here
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>or click to browse</div>
                  </>
                )}
              </div>
              {debtHistoryPendingFile && (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    className="btn-ghost"
                    style={{ fontSize: 12, padding: '7px 14px' }}
                    onClick={() => {
                      setDebtHistoryPendingFile(null);
                      setDebtHistoryUploadError(null);
                    }}
                  >
                    Discard
                  </button>
                  <button
                    className="btn-primary"
                    style={{ fontSize: 12, padding: '7px 14px' }}
                    onClick={handleDebtHistoryUpload}
                    disabled={debtHistoryUploading}
                  >
                    {debtHistoryUploading ? 'Uploading…' : 'Upload'}
                  </button>
                </div>
              )}
              {debtHistoryUploadError && (
                <div
                  style={{
                    background: 'rgba(248,113,113,0.08)',
                    border: '1px solid rgba(248,113,113,0.2)',
                    borderRadius: 10,
                    padding: '12px 14px',
                    fontSize: 13,
                    color: '#f87171',
                    fontWeight: 500,
                  }}
                >
                  ✗ {debtHistoryUploadError}
                </div>
              )}
              {debtHistoryUploadDone !== null && (
                <div
                  style={{
                    background: 'rgba(52,211,153,0.08)',
                    border: '1px solid rgba(52,211,153,0.2)',
                    borderRadius: 10,
                    padding: '12px 14px',
                    fontSize: 13,
                    color: '#34d399',
                    fontWeight: 500,
                  }}
                >
                  ✓ Imported {debtHistoryUploadDone} row{debtHistoryUploadDone !== 1 ? 's' : ''}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn-ghost"
                  style={{ fontSize: 12, padding: '7px 14px' }}
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = api.upload.debtHistoryCsvTemplateURL();
                    a.download = 'debt-history-template.csv';
                    a.click();
                  }}
                >
                  ↓ Download template CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      </SettingSection>

      <SettingSection title="Exchange Rates">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>
            Current exchange rates (auto-fetched from Yahoo Finance).
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                background: 'var(--surface2)',
                borderRadius: 6,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>1 USD =</span>
              <span
                style={{
                  fontSize: 13,
                  color: 'var(--text)',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                {exchangeRates.usdToRon.toFixed(4)} RON
              </span>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                ≈ ${(1 / exchangeRates.usdToRon).toFixed(3)}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                background: 'var(--surface2)',
                borderRadius: 6,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>1 EUR =</span>
              <span
                style={{
                  fontSize: 13,
                  color: 'var(--text)',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                {exchangeRates.eurToRon.toFixed(4)} RON
              </span>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                € {(1 / exchangeRates.eurToRon).toFixed(3)}
              </span>
            </div>
          </div>
        </div>
      </SettingSection>

      <SettingSection title="Stocks &amp; Crypto">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
            Import Data · CSV
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                background: 'var(--surface2)',
                borderRadius: 10,
                padding: '12px 14px',
                fontSize: 12,
                color: 'var(--text2)',
                lineHeight: 1.7,
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 6, fontSize: 13 }}>
                Expected CSV columns
              </div>
              <code
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 11,
                  color: 'var(--purple)',
                  display: 'block',
                  whiteSpace: 'pre',
                }}
              >
                month, year, cryptoInvested, cryptoReturn, stockInvested, stockReturn, note
              </code>
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text3)' }}>
                month: "September" · year: 2021 · values as numbers · note optional
              </div>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--purple)' : 'var(--border2)'}`,
                borderRadius: 12,
                padding: '32px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragOver ? 'rgba(167,139,250,0.06)' : 'transparent',
                transition: 'all .15s',
              }}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: 'none' }}
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.5 }}>⬆</div>
              {pendingFile ? (
                <div
                  style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}
                >
                  {pendingFile.name}
                </div>
              ) : (
                <>
                  <div
                    style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}
                  >
                    Drop a CSV file here
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>or click to browse</div>
                </>
              )}
            </div>

            {pendingFile && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  className="btn-ghost"
                  style={{ fontSize: 12, padding: '7px 14px' }}
                  onClick={() => {
                    setPendingFile(null);
                    setUploadError(null);
                  }}
                >
                  Discard
                </button>
                <button
                  className="btn-primary"
                  style={{ fontSize: 12, padding: '7px 14px' }}
                  onClick={handleUpload}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading…' : 'Upload'}
                </button>
              </div>
            )}

            {uploadError && (
              <div
                style={{
                  background: 'rgba(248,113,113,0.08)',
                  border: '1px solid rgba(248,113,113,0.2)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  fontSize: 13,
                  color: '#f87171',
                  fontWeight: 500,
                }}
              >
                ✗ {uploadError}
              </div>
            )}

            {uploadDone !== null && (
              <div
                style={{
                  background: 'rgba(52,211,153,0.08)',
                  border: '1px solid rgba(52,211,153,0.2)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  fontSize: 13,
                  color: '#34d399',
                  fontWeight: 500,
                }}
              >
                ✓ Imported {uploadDone} row{uploadDone !== 1 ? 's' : ''} — entries are now visible
                in your portfolio.
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn-ghost"
                style={{ fontSize: 12, padding: '7px 14px' }}
                onClick={downloadTemplate}
              >
                ↓ Download template CSV
              </button>
            </div>
          </div>
        </div>
      </SettingSection>

      <SettingSection title="Export Data">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
              Export my entries
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              {entries.length} entr{entries.length === 1 ? 'y' : 'ies'} · saved as{' '}
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                wealth-me-entries.csv
              </span>
            </div>
          </div>
          <button
            className="btn-ghost"
            style={{ fontSize: 12, padding: '8px 16px', whiteSpace: 'nowrap', flexShrink: 0 }}
            disabled={entries.length === 0}
            onClick={() => exportCSV(entries)}
          >
            ↓ Export CSV
          </button>
        </div>
      </SettingSection>

      <SettingSection title="Data Management">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
                Clear all entries
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                Permanently remove all {entries.length} entries from the database.
              </div>
            </div>
            {!confirmClear ? (
              <button
                className="btn-ghost"
                style={{
                  fontSize: 12,
                  padding: '8px 16px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  borderColor: 'rgba(248,113,113,0.3)',
                  color: '#f87171',
                }}
                disabled={entries.length === 0}
                onClick={() => setConfirmClear(true)}
              >
                Clear entries
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  className="btn-ghost"
                  style={{ fontSize: 12, padding: '8px 14px' }}
                  onClick={() => setConfirmClear(false)}
                >
                  Cancel
                </button>
                <button
                  style={{
                    fontSize: 12,
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#f87171',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'Outfit',
                  }}
                  onClick={handleClear}
                >
                  Yes, clear
                </button>
              </div>
            )}
          </div>
        </div>
      </SettingSection>

      <SettingSection title="About">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(
            [
              ['App', 'Wealth Me'],
              ['Entries', String(entries.length)],
              ['Data storage', 'SQLite (server)'],
              ['Version', '1.0.0'],
            ] as [string, string][]
          ).map(([k, v]) => (
            <div
              key={k}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 13,
                padding: '7px 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span style={{ color: 'var(--text2)' }}>{k}</span>
              <span
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 12,
                  color: 'var(--text)',
                }}
              >
                {v}
              </span>
            </div>
          ))}
        </div>
      </SettingSection>
    </div>
  );
}
