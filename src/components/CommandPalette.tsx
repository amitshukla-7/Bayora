import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Cpu, ShieldCheck, Database, FileText, ExternalLink } from 'lucide-react';
import type { PageId, Model, Finding, Policy, Dataset } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: PageId, extraId?: string) => void;
  models: Model[];
  policies: Policy[];
  findings: Finding[];
  datasets: Dataset[];
}


export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  models,
  policies,
  findings,
  datasets,
}) => {
  const [query, setQuery] = useState('');

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();

    const matchedModels = models
      .filter(m => m.name.toLowerCase().includes(q) || m.identifier.toLowerCase().includes(q))
      .map(m => ({
        id: m.id,
        title: m.name,
        subtitle: `${m.provider} · ${m.execution_mode}`,
        category: 'Models',
        page: 'models' as PageId,
        icon: Cpu
      }));

    const matchedPolicies = policies
      .filter(p => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
      .map(p => ({
        id: p.id,
        title: `${p.id}: ${p.name}`,
        subtitle: `${p.category} · ${p.severity}`,
        category: 'Policies',
        page: 'security' as PageId,
        icon: ShieldCheck
      }));

    const matchedFindings = findings
      .filter(f => f.category.toLowerCase().includes(q) || f.explanation.toLowerCase().includes(q) || f.id.toLowerCase().includes(q))
      .slice(0, 5)
      .map(f => ({
        id: f.id,
        title: `${f.id}: ${f.category} (${f.severity})`,
        subtitle: f.explanation.slice(0, 80) + '...',
        category: 'Findings',
        page: 'evaluations' as PageId,
        icon: FileText
      }));

    const matchedDatasets = datasets
      .filter(d => d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q))
      .map(d => ({
        id: d.id,
        title: d.name,
        subtitle: `${d.total_cases} test cases`,
        category: 'Datasets',
        page: 'datasets' as PageId,
        icon: Database
      }));

    return [...matchedModels, ...matchedPolicies, ...matchedFindings, ...matchedDatasets];
  }, [query, models, policies, findings, datasets]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-start justify-center pt-24 px-4">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search models, tests, policies..."
            className="w-full text-sm outline-hidden text-slate-800 placeholder-slate-400 bg-transparent font-medium"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Container */}
        <div className="max-h-80 overflow-y-auto p-2">
          {query.trim() === '' ? (
            <div className="p-4 text-center text-xs text-slate-400">
              Type to search across registered models, test findings, datasets, and policies.
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No matching results found for "{query}".
            </div>
          ) : (
            <div className="space-y-1">
              {searchResults.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={`${item.category}-${item.id}`}
                    onClick={() => {
                      onNavigate(item.page, item.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#f4efff]/70 hover:border-[#e5d9fd] text-left transition-colors border border-transparent cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-[#ede5fd] flex items-center justify-center text-slate-500 group-hover:text-[#8762E0]">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-800 group-hover:text-[#7952D8]">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-500 font-normal">
                          {item.subtitle}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        {item.category}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#8762E0]" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Navigate with arrow keys</span>
          <div className="flex items-center gap-2">
            <span>[ESC] to close</span>
          </div>
        </div>
      </div>
    </div>
  );
};
