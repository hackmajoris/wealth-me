import { useState, useEffect, useCallback } from 'react';
import { EntryModal } from './components/EntryModal';
import { Dashboard } from './pages/Dashboard';
import { Stocks } from './pages/Stocks';
import { Crypto } from './pages/Crypto';
import { Performance } from './pages/Performance';
import { Savings } from './pages/Savings';
import { Settings } from './pages/Settings';
import { Assets } from './pages/Assets';
import { Debts } from './pages/Debts';
import { api } from './lib/api';
import type { Entry } from './lib/storage';

type TabId = 'dashboard' | 'stocks' | 'crypto' | 'performance' | 'savings' | 'assets' | 'debts' | 'settings';

const navIcons: Record<TabId, string> = {
  dashboard: '◈', stocks: '↗', crypto: '◎', performance: '⊞',
  savings: '◻', assets: '⬡', debts: '⬡', settings: '⚙',
};
const navLabels: Record<TabId, string> = {
  dashboard: 'Overview', stocks: 'Stocks', crypto: 'Crypto', performance: 'Performance',
  savings: 'Savings', assets: 'Assets', debts: 'Debts', settings: 'Settings',
};
const TAB_IDS: TabId[] = ['dashboard','performance','stocks','crypto','savings','assets','debts','settings'];

export function App() {
  const [tab, setTab] = useState<TabId>('dashboard');
  const [editEntry, setEditEntry] = useState<Entry | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [savingsRefreshTrigger, setSavingsRefreshTrigger] = useState(0);

  const refreshEntries = useCallback(() => {
    api.entries.list().then(setEntries).catch(console.error);
  }, []);

  const refreshSavingsEntries = useCallback(() => {
    setSavingsRefreshTrigger(t => t + 1);
  }, []);

  useEffect(() => {
    api.initMonth().catch(console.error).finally(() => refreshEntries());
  }, [refreshEntries]);

  const handleDeleteEntry = (id: number) => {
    api.entries.remove(id).then(refreshEntries).catch(console.error);
  };

  const showModal = () => { setEditEntry(undefined); setModalOpen(true); };
  const showEditModal = (entry: Entry) => { setEditEntry(entry); setModalOpen(true); };

  const renderTab = () => {
    switch (tab) {
      case 'dashboard':   return <Dashboard showModal={showModal} entries={entries} onEditEntry={showEditModal} onDeleteEntry={handleDeleteEntry} />;
      case 'stocks':      return <Stocks showModal={showModal} entries={entries} onDelete={handleDeleteEntry} onRefresh={refreshEntries} />;
      case 'crypto':      return <Crypto showModal={showModal} entries={entries} onDelete={handleDeleteEntry} onRefresh={refreshEntries} />;
      case 'performance': return <Performance showModal={showModal} />;
      case 'savings':     return <Savings showModal={showModal} onEdit={showEditModal} onDelete={handleDeleteEntry} savingsRefreshKey={savingsRefreshTrigger} />;
      case 'assets':      return <Assets />;
      case 'debts':       return <Debts />;
      case 'settings':    return <Settings entries={entries} onRefresh={refreshEntries} onSavingsRefresh={refreshSavingsEntries} onClear={refreshEntries} />;
    }
  };

  return (
    <div className="layout">
      {modalOpen && (
        <EntryModal entry={editEntry} onClose={() => setModalOpen(false)} onSave={refreshEntries} />
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
          <div>Live data · Apr 2026</div>
          <div style={{ marginTop: 4 }}>{entries.length} entries</div>
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
