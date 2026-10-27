import React, { useState } from 'react';
import { Send, RefreshCw, HelpCircle, Plus, Trash2, Clock } from 'lucide-react';
import { HTTP_METHODS } from '../../constants/sampleData';

export const ApiTester = ({
  apiUrl,
  setApiUrl,
  apiMethod,
  setApiMethod,
  queryParams,
  setQueryParams,
  headers,
  setHeaders,
  reqBody,
  setReqBody,
  isFetching,
  executeApiRequest,
  apiResponseMeta,
  setCorsModalOpen,
}) => {
  const [apiActiveSubTab, setApiActiveSubTab] = useState('params');

  return (
    <div className="border border-slate-800 rounded-2xl bg-slate-900/50 p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Method select */}
        <select
          value={apiMethod}
          onChange={(e) => setApiMethod(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono font-bold text-indigo-400 focus:outline-none focus:border-indigo-500"
        >
          {HTTP_METHODS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        {/* URL Input */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="https://api.yourdomain.com/v1/users/123"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Send Request Button */}
        <button
          disabled={isFetching}
          onClick={executeApiRequest}
          className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20"
        >
          {isFetching ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Fetching...</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Check for Changes</span>
            </>
          )}
        </button>

        <button
          onClick={() => setCorsModalOpen(true)}
          className="p-2 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg hover:bg-slate-800"
          title="CORS & Fetch Diagnostic Guidance"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Request Configuration Tabs */}
      <div className="border border-slate-800/80 rounded-xl bg-slate-950/60 overflow-hidden">
        <div className="flex border-b border-slate-800 bg-slate-900/60 px-3">
          <button
            onClick={() => setApiActiveSubTab('params')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              apiActiveSubTab === 'params'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Query Params ({queryParams.filter((p) => p.key).length})
          </button>
          <button
            onClick={() => setApiActiveSubTab('headers')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              apiActiveSubTab === 'headers'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Headers ({headers.filter((h) => h.key).length})
          </button>
          {['POST', 'PUT', 'PATCH'].includes(apiMethod) && (
            <button
              onClick={() => setApiActiveSubTab('body')}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                apiActiveSubTab === 'body'
                  ? 'border-indigo-500 text-indigo-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Body (JSON)
            </button>
          )}
        </div>

        <div className="p-3">
          {/* Query Params Subtab */}
          {apiActiveSubTab === 'params' && (
            <div className="space-y-2">
              {queryParams.map((p, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={p.enabled}
                    onChange={(e) => {
                      const updated = [...queryParams];
                      updated[idx].enabled = e.target.checked;
                      setQueryParams(updated);
                    }}
                    className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                  />
                  <input
                    type="text"
                    placeholder="Parameter Name"
                    value={p.key}
                    onChange={(e) => {
                      const updated = [...queryParams];
                      updated[idx].key = e.target.value;
                      setQueryParams(updated);
                    }}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={p.value}
                    onChange={(e) => {
                      const updated = [...queryParams];
                      updated[idx].value = e.target.value;
                      setQueryParams(updated);
                    }}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={() => setQueryParams(queryParams.filter((_, i) => i !== idx))}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setQueryParams([...queryParams, { key: '', value: '', enabled: true }])}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono pt-1"
              >
                <Plus className="w-3 h-3" /> Add Query Param
              </button>
            </div>
          )}

          {/* Headers Subtab */}
          {apiActiveSubTab === 'headers' && (
            <div className="space-y-2">
              {headers.map((h, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={h.enabled}
                    onChange={(e) => {
                      const updated = [...headers];
                      updated[idx].enabled = e.target.checked;
                      setHeaders(updated);
                    }}
                    className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                  />
                  <input
                    type="text"
                    placeholder="Header Key (e.g. Authorization, X-Api-Key)"
                    value={h.key}
                    onChange={(e) => {
                      const updated = [...headers];
                      updated[idx].key = e.target.value;
                      setHeaders(updated);
                    }}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Header Value"
                    value={h.value}
                    onChange={(e) => {
                      const updated = [...headers];
                      updated[idx].value = e.target.value;
                      setHeaders(updated);
                    }}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={() => setHeaders(headers.filter((_, i) => i !== idx))}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setHeaders([...headers, { key: '', value: '', enabled: true }])}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono pt-1"
              >
                <Plus className="w-3 h-3" /> Add Header
              </button>
            </div>
          )}

          {/* Body Subtab */}
          {apiActiveSubTab === 'body' && (
            <div>
              <textarea
                value={reqBody}
                onChange={(e) => setReqBody(e.target.value)}
                rows={5}
                className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed"
                placeholder="JSON payload..."
              />
            </div>
          )}
        </div>
      </div>

      {/* API Metadata Bar */}
      {apiResponseMeta && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                apiResponseMeta.status >= 200 && apiResponseMeta.status < 300
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              STATUS: {apiResponseMeta.status} {apiResponseMeta.statusText}
            </span>
            <span className="text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" /> {apiResponseMeta.timeMs}ms
            </span>
            <span className="text-slate-500">Fetched at: {apiResponseMeta.timestamp}</span>
          </div>
          {apiResponseMeta.error && (
            <span className="text-rose-400 text-[11px]">{apiResponseMeta.error}</span>
          )}
        </div>
      )}
    </div>
  );
};
