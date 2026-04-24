import { type SavingsEntry } from '../lib/storage';

interface SavingsLogProps {
  entries: SavingsEntry[];
  onEdit: (e: SavingsEntry) => void;
  onDelete: (id: number) => void;
}

export function SavingsLog({ entries, onEdit, onDelete }: SavingsLogProps) {
  if (!entries.length) {
    return (
      <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text3)', fontSize: 13 }}>
        No entries yet. Click <strong style={{ color: 'var(--text2)' }}>+ Add Entry</strong> to log your first month.
      </div>
    );
  }
  return (
    <div className="data-table-wrap">
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Month</th><th>Income</th><th>Expenses</th><th>Saved</th>
              <th>Rate</th><th>Target</th><th>Δ</th><th>Note</th><th></th>
            </tr>
          </thead>
          <tbody>
            {[...entries].reverse().map(e => {
              const delta = Math.round((e.savingRate - e.target) * 10) / 10;
              return (
                <tr key={e.id}>
                  <td style={{ fontWeight: 600 }}>{e.monthFull}</td>
                  <td>{e.netIncome.toLocaleString()} lei</td>
                  <td className="neg">{e.totalExpenses.toLocaleString()} lei</td>
                  <td className="pos">{e.savings.toLocaleString()} lei</td>
                  <td className={e.savingRate >= e.target ? 'pos' : 'neg'}>{e.savingRate.toFixed(1)}%</td>
                  <td className="neu">{e.target}%</td>
                  <td className={delta >= 0 ? 'pos' : 'neg'}>{delta >= 0 ? '+' : ''}{delta}%</td>
                  <td style={{ color: 'var(--text3)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.note || '—'}
                  </td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => onEdit(e)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 12 }}>✎</button>
                    <button onClick={() => onDelete(e.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 12 }}>✕</button>
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
