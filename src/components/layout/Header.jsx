import React from 'react';
import { Layers, Database, Send } from 'lucide-react';

export const Header = ({
  activeTab,
  setActiveTab,
  savedBaselines,
  setIsBaselinesDrawerOpen,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-header/95 backdrop-blur-md px-4 sm:px-6 h-16 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-bg-app shadow-md shadow-accent/30">
          <Layers className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-primary">API Diff</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-accent/15 text-accent">
              Regression Tool
            </span>
          </div>
          <p className="text-[11px] text-muted hidden sm:block">Catch API breaking changes before production</p>
        </div>
      </div>

      {/* Mode Toggle Controls */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-input border border-slate-800">
        <button
          onClick={() => setActiveTab('manual')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'manual'
              ? 'bg-accent text-bg-app shadow'
              : 'text-muted hover:text-secondary'
          }`}
        >
          Manual Compare
        </button>
        <button
          onClick={() => setActiveTab('api')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            activeTab === 'api'
              ? 'bg-accent text-bg-app shadow'
              : 'text-muted hover:text-secondary'
          }`}
        >
          <Send className="w-3 h-3" />
          API Tester
        </button>
      </div>

      {/* Action icons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsBaselinesDrawerOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-medium text-secondary hover:bg-hover transition-colors"
          title="Saved Baselines in localStorage"
        >
          <Database className="w-3.5 h-3.5 text-accent" />
          <span className="hidden md:inline">Baselines</span>
          {savedBaselines.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-hover text-[10px] flex items-center justify-center font-mono text-secondary">
              {savedBaselines.length}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
