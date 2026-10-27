import React, { useState } from 'react';
import { Plus } from 'lucide-react';

export const RuleInput = ({ onAdd }) => {
  const [val, setVal] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (val.trim()) {
      onAdd(val.trim());
      setVal('');
    }
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-1">
      <input
        type="text"
        placeholder="Add pattern (e.g. $.traceId)"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="px-2 py-0.5 text-xs font-mono bg-slate-950 border border-slate-800 rounded text-slate-300 focus:outline-none focus:border-indigo-500 w-44"
      />
      <button
        type="submit"
        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
        title="Add rule"
      >
        <Plus className="w-3 h-3" />
      </button>
    </form>
  );
};
