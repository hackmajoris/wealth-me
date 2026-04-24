import { useState } from 'react';
import { EntryModal } from './components/EntryModal';
import { Dashboard } from './pages/Dashboard';
import { Stocks } from './pages/Stocks';
import { Crypto } from './pages/Crypto';
import { Performance } from './pages/Performance';
import { Savings } from './pages/Savings';
import { Annual } from './pages/Annual';
import { Settings } from './pages/Settings';
import { loadEntries, saveEntries, type Entry } from './lib/storage';

type TabId = 'dashboard' | 'stocks' | 'crypto' | 'performance' | 'savings' | 'annual' | 'settings';

const navIcons: Record<TabId, string> = {
  dashboard: '◈', stocks: '↗', crypto: '◎', performance: '⊞',
  savings: '◻', annual: '≡', settings: '⚙',
};
const navLabels: Record<TabId, string> = {
  dashboard: 'Overview', stocks: 'Stocks', crypto: 'Crypto', performance: 'Perf.',
  savings: 'Savings', annual: 'Annual', settings: 'Settings',
};
const TAB_IDS: TabId[] = ['dashboard','stocks','crypto','performance','savings','annual','settings'];

export function App() {
  const [tab, setTab] = useState<TabId>('dashboard');
  const [modalOpen, setModalOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>(() => loadEntries());

  const handleDeleteEntry = (id: number) => {
    const updated = entries.filter(e => e.id !== id);
    saveEntries(updated);
    setEntries(updated);
  };

  const showModal = () => setModalOpen(true);

  const renderTab = () => {
    switch (tab) {
      case 'dashboard':   return <Dashboard showModal={showModal} entries={entries} onDeleteEntry={handleDeleteEntry} />;
      case 'stocks':      return <Stocks showModal={showModal} />;
      case 'crypto':      return <Crypto showModal={showModal} />;
      case 'performance': return <Performance showModal={showModal} />;
      case 'savings':     return <Savings showModal={showModal} />;
      case 'annual':      return <Annual />;
      case 'settings':    return <Settings entries={entries} onImport={setEntries} onClear={() => setEntries([])} />;
    }
  };

  return (
    <div className="layout">
      {modalOpen && (
        <EntryModal onClose={() => setModalOpen(false)} onSave={setEntries} />
      )}

      {/* Sidebar */}
      <nav className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">W</div>
          Wealth Me
        </div>
        {TAB_IDS.map(id => (
          <button
            key={id}
            className={`nav-item ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
          >
            <span className="nav-icon">{navIcons[id]}</span>
            {navLabels[id]}
            {id === 'dashboard' && entries.length > 0
              ? <span className="entries-badge" style={{ marginLeft: 'auto' }}>{entries.length}</span>
              : <span className="nav-dot" />
            }
          </button>
        ))}
        <div className="sidebar-footer">
          <div>Sample data · Apr 2026</div>
          <div style={{ marginTop: 4 }}>6.6 years tracked</div>
        </div>
      </nav>

      {/* Content */}
      <main className="main">
        {renderTab()}
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          {TAB_IDS.map(id => (
            <button
              key={id}
              className={`bottom-nav-item ${tab === id ? 'active' : ''}`}
              onClick={() => setTab(id)}
            >
              <span className="nav-icon">{navIcons[id]}</span>
              {navLabels[id]}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
