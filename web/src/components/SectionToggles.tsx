import { useState } from 'react';
import { api, type Section } from '../lib/api';

const LABELS: Record<Section['id'], string> = {
  stocks: 'Stocks',
  crypto: 'Crypto',
  savings: 'Savings',
  assets: 'Assets',
  debts: 'Debts',
};

interface SectionTogglesProps {
  sections: Section[];
  onChange: (sections: Section[]) => void;
}

// Turn optional sections on or off. Turning one off is only allowed while it
// holds no entries, so hiding a section never hides data.
export function SectionToggles({ sections, onChange }: SectionTogglesProps) {
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (s: Section) => {
    setSaving(s.id);
    setError(null);
    try {
      onChange(await api.settings.setSection(s.id, !s.enabled));
    } catch (e) {
      setError(e instanceof Error ? e.message.trim() : String(e));
    } finally {
      setSaving(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>
        Hide parts of the app you don't use. A section can be turned off only while it has no
        entries.
      </div>
      {sections.map((s) => {
        const locked = s.enabled && !s.canDisable;
        return (
          <div
            key={s.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '10px 0',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                {LABELS[s.id]}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                {s.entries > 0
                  ? `${s.entries} ${s.entries === 1 ? 'entry' : 'entries'}${locked ? ' · delete them to turn off' : ''}`
                  : 'No entries'}
              </div>
            </div>
            <button
              role="switch"
              aria-checked={s.enabled}
              aria-label={`${LABELS[s.id]} section`}
              title={locked ? 'Delete its entries to turn this section off' : undefined}
              disabled={locked || saving !== null}
              onClick={() => toggle(s)}
              style={{
                width: 38,
                height: 22,
                flexShrink: 0,
                borderRadius: 11,
                border: 'none',
                padding: 2,
                cursor: locked ? 'not-allowed' : 'pointer',
                opacity: locked ? 0.45 : 1,
                background: s.enabled ? 'var(--purple)' : 'var(--border2)',
                transition: 'background .15s',
              }}
            >
              <span
                style={{
                  display: 'block',
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: '#fff',
                  transform: s.enabled ? 'translateX(16px)' : 'none',
                  transition: 'transform .15s',
                }}
              />
            </button>
          </div>
        );
      })}
      {error && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 10 }}>{error}</div>}
    </div>
  );
}
