import React from 'react';
import { Layers } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="border-t border-slate-800 bg-panel px-6 py-6 text-xs text-muted flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-accent" />
        <span>API Diff — Lightweight Client-Side Regression Checker</span>
      </div>
      <div className="text-center sm:text-right">
        <span className="text-[11px] block">Data Privacy: 100% processed locally in your browser session. No API tokens or payloads are sent to external analytics.</span>
      </div>
    </footer>
  );
};
