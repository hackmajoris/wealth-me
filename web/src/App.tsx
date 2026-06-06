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

type TabId =
  | 'dashboard'
  | 'stocks'
  | 'crypto'
  | 'performance'
  | 'savings'
  | 'assets'
  | 'debts'
  | 'settings';

const navIcons: Record<TabId, string> = {
  dashboard: '◈',
  stocks: '↗',
  crypto: '◎',
  performance: '⊞',
  savings: '◻',
  assets: '⬡',
  debts: '⬡',
  settings: '⚙',
};
const navLabels: Record<TabId, string> = {
  dashboard: 'Overview',
  stocks: 'Stocks',
  crypto: 'Crypto',
  performance: 'Performance',
  savings: 'Savings',
  assets: 'Assets',
  debts: 'Debts',
  settings: 'Settings',
};
const TAB_IDS: TabId[] = [
  'dashboard',
  'performance',
  'stocks',
  'crypto',
  'savings',
  'assets',
  'debts',
  'settings',
];

export function App() {
  const [tab, setTab] = useState<TabId>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<Entry | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [savingsRefreshTrigger, setSavingsRefreshTrigger] = useState(0);
  const [theme, setTheme] = useState<string>(() => {
    const t = localStorage.getItem('theme') ?? 'dark';
    document.documentElement.dataset['theme'] = t;
    return t;
  });

  useEffect(() => {
    document.documentElement.dataset['theme'] = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const refreshEntries = useCallback(() => {
    api.entries.list().then(setEntries).catch(console.error);
  }, []);

  const refreshSavingsEntries = useCallback(() => {
    setSavingsRefreshTrigger((t) => t + 1);
  }, []);

  useEffect(() => {
    api
      .initMonth()
      .catch(console.error)
      .finally(() => refreshEntries());
  }, [refreshEntries]);

  const handleDeleteEntry = (id: number) => {
    api.entries.remove(id).then(refreshEntries).catch(console.error);
  };

  const showModal = () => {
    setEditEntry(undefined);
    setModalOpen(true);
  };
  const showEditModal = (entry: Entry) => {
    setEditEntry(entry);
    setModalOpen(true);
  };

  const renderTab = () => {
    switch (tab) {
      case 'dashboard':
        return <Dashboard />;
      case 'stocks':
        return (
          <Stocks
            showModal={showModal}
            entries={entries}
            onDelete={handleDeleteEntry}
            onRefresh={refreshEntries}
          />
        );
      case 'crypto':
        return (
          <Crypto
            showModal={showModal}
            entries={entries}
            onDelete={handleDeleteEntry}
            onRefresh={refreshEntries}
          />
        );
      case 'performance':
        return <Performance showModal={showModal} />;
      case 'savings':
        return (
          <Savings
            showModal={showModal}
            onEdit={showEditModal}
            onDelete={handleDeleteEntry}
            savingsRefreshKey={savingsRefreshTrigger}
          />
        );
      case 'assets':
        return <Assets />;
      case 'debts':
        return <Debts />;
      case 'settings':
        return (
          <Settings
            entries={entries}
            onRefresh={refreshEntries}
            onSavingsRefresh={refreshSavingsEntries}
            onClear={refreshEntries}
            theme={theme}
            onThemeChange={setTheme}
          />
        );
    }
  };

  const selectTab = (id: TabId) => {
    setTab(id);
    setMobileNavOpen(false);
  };

  return (
    <div className="layout">
      {modalOpen && (
        <EntryModal entry={editEntry} onClose={() => setModalOpen(false)} onSave={refreshEntries} />
      )}

      {/* Sidebar backdrop (mobile) */}
      {mobileNavOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileNavOpen(false)} />
      )}

      {/* Sidebar */}
      <nav className={`sidebar${mobileNavOpen ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">W</div>
          Wealth Me
        </div>
        {TAB_IDS.map((id) => (
          <button
            key={id}
            className={`nav-item ${tab === id ? 'active' : ''}`}
            onClick={() => selectTab(id)}
          >
            <span className="nav-icon">{navIcons[id]}</span>
            {navLabels[id]}
            <span className="nav-dot" />
          </button>
        ))}
        <div className="sidebar-footer">
          <div>Live data · Apr 2026</div>
        </div>
      </nav>

      {/* Mobile header */}
      <div className="mobile-header">
        <button className="hamburger" onClick={() => setMobileNavOpen((o) => !o)}>
          ☰
        </button>
        <div className="mobile-header-logo">
          <div className="logo-icon">W</div>
          Wealth Me
        </div>
      </div>

      {/* Content */}
      <main className="main">{renderTab()}</main>
    </div>
  );
}
