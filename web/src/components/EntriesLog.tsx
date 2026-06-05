import { type Entry } from '../lib/storage';
import { fmt$, fmtPct, clsROI } from '../lib/formatters';

interface EntriesLogProps {
  entries: Entry[];
  onEdit: (entry: Entry) => void;
  onDelete: (id: number) => void;
}

const btnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 13,
  padding: '2px 5px',
  borderRadius: 4,
  lineHeight: 1,
};

export function EntriesLog({ entries, onEdit, onDelete }: EntriesLogProps) {
  if (!entries.length) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)', fontSize: 13 }}>
        No entries yet. Click <strong style={{ color: 'var(--text2)' }}>+ Add Entry</strong> to log
        your first month.
      </div>
    );
  }

  return (
    <div className="data-table-wrap">
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Crypto Inv.</th>
              <th>Crypto Value</th>
              <th>Crypto ROI</th>
              <th>Stocks Inv.</th>
              <th>Stocks Value</th>
              <th>Stocks ROI</th>
              <th>Note</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {[...entries].reverse().map((e) => {
              const cRoi =
                e.cryptoInvested > 0
                  ? ((e.cryptoReturn - e.cryptoInvested) / e.cryptoInvested) * 100
                  : null;
              const sRoi =
                e.stocksInvested > 0
                  ? ((e.stocksReturn - e.stocksInvested) / e.stocksInvested) * 100
                  : null;
              return (
                <tr key={e.id}>
                  <td style={{ fontWeight: 600 }}>{e.monthFull}</td>
                  <td>{fmt$(e.cryptoInvested)}</td>
                  <td>{fmt$(e.cryptoReturn)}</td>
                  <td className={clsROI(cRoi)}>{fmtPct(cRoi)}</td>
                  <td>{fmt$(e.stocksInvested)}</td>
                  <td>{fmt$(e.stocksReturn)}</td>
                  <td className={clsROI(sRoi)}>{fmtPct(sRoi)}</td>
                  <td
                    style={{
                      color: 'var(--text3)',
                      maxWidth: 120,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {e.note || '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button
                        onClick={() => onEdit(e)}
                        style={{ ...btnStyle, color: 'var(--text3)' }}
                        title="Edit"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => onDelete(e.id)}
                        style={{ ...btnStyle, color: 'var(--text3)' }}
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
