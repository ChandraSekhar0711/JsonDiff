import React, { useRef } from 'react';
import { Clipboard, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';

/**
 * Escape text so it is safe to inject into HTML as a text node.
 */
function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Tokenize JSON source into syntax-highlighted spans.
 * Keys (strings followed by `:`) use the accent color; plain strings use
 * the added color; numbers use info; true/false/null use type-changed.
 */
function highlightJson(text) {
  if (!text) return '';
  let html = '';
  let i = 0;
  const n = text.length;

  while (i < n) {
    const c = text[i];

    if (c === '"') {
      let j = i + 1;
      while (j < n) {
        if (text[j] === '\\' && j + 1 < n) { j += 2; continue; }
        if (text[j] === '"') { j++; break; }
        j++;
      }
      const strText = text.slice(i, j);

      // A string followed by `:` (ignoring whitespace) is an object key.
      let k = j;
      while (k < n && (text[k] === ' ' || text[k] === '\t' || text[k] === '\n' || text[k] === '\r')) k++;
      const isKey = text[k] === ':';
      const cls = isKey ? 'text-accent' : 'text-added';

      html += `<span class="${cls}">${escapeHtml(strText)}</span>`;
      i = j;
    } else if (c === ' ' || c === '\n' || c === '\t' || c === '\r') {
      html += escapeHtml(c);
      i++;
    } else if (c === '-' || (c >= '0' && c <= '9')) {
      let j = i;
      while (j < n && /[0-9.eE+\-]/.test(text[j])) j++;
      html += `<span class="text-info">${escapeHtml(text.slice(i, j))}</span>`;
      i = j;
    } else if (c === 't' || c === 'f' || c === 'n') {
      let j = i;
      while (j < n && /[a-zA-Z]/.test(text[j])) j++;
      html += `<span class="text-type-changed">${escapeHtml(text.slice(i, j))}</span>`;
      i = j;
    } else {
      html += `<span class="text-muted">${escapeHtml(c)}</span>`;
      i++;
    }
  }

  return html;
}

export const JsonEditor = ({
  title,
  colorDot,
  value,
  onChange,
  onClear,
  onPaste,
  parseResult,
  placeholder,
}) => {
  const textareaRef = useRef(null);
  const preRef = useRef(null);

  // Keep the highlighted overlay in sync with the textarea's scroll position.
  const syncScroll = () => {
    if (preRef.current && textareaRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  return (
    <div className="border border-slate-800 rounded-2xl bg-panel overflow-hidden flex flex-col shadow-sm">
      <div className="px-3.5 py-2.5 bg-input border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${colorDot}`} />
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onPaste}
            className="px-2 py-1 rounded text-muted hover:text-secondary hover:bg-hover text-xs flex items-center gap-1 transition-colors"
          >
            <Clipboard className="w-3 h-3" /> Paste
          </button>
          <button
            onClick={onClear}
            className="p-1 rounded text-muted hover:text-removed hover:bg-hover transition-colors"
            title="Clear"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="relative flex-1">
        <pre
          ref={preRef}
          aria-hidden="true"
          className="absolute inset-0 m-0 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words overflow-auto pointer-events-none"
          dangerouslySetInnerHTML={{ __html: highlightJson(value) || escapeHtml(placeholder) }}
        />
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={syncScroll}
          spellCheck="false"
          placeholder={placeholder}
          className="relative w-full h-72 sm:h-80 p-3 bg-transparent font-mono text-xs text-transparent caret-accent focus:outline-none whitespace-pre-wrap break-words overflow-auto leading-relaxed"
        />
      </div>

      <div className="px-3 py-1.5 bg-input border-t border-slate-800 text-[11px] font-mono flex items-center justify-between text-muted">
        <span>{value.length} chars</span>
        {parseResult.error ? (
          <span className="text-removed flex items-center gap-1 truncate max-w-xs" title={parseResult.error}>
            <AlertTriangle className="w-3 h-3 flex-shrink-0" /> Invalid JSON: {parseResult.error}
          </span>
        ) : (
          <span className="text-added flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Valid JSON
          </span>
        )}
      </div>
    </div>
  );
};