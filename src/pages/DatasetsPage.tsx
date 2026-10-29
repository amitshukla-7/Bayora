import React, { useState, useEffect } from 'react';
import {
  Database,
  Upload,
  Download,
  Search,
  AlertCircle,
  Flame,
  X
} from 'lucide-react';
import type { Dataset, PageId } from '../types';
import { fetchDatasetById, uploadDataset } from '../services/api';

interface DatasetsPageProps {
  datasets: Dataset[];
  onNavigate: (page: PageId, extraId?: string) => void;
  onRefreshData: () => Promise<void>;
}

export const DatasetsPage: React.FC<DatasetsPageProps> = ({
  datasets,
  onNavigate,
  onRefreshData,
}) => {
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(datasets[0]?.id || '');
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [caseSearch, setCaseSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Upload Form states
  const [uploadName, setUploadName] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [rawFileContent, setRawFileContent] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (selectedDatasetId) {
      fetchDatasetById(selectedDatasetId)
        .then(setSelectedDataset)
        .catch(err => console.error('Failed to load dataset details:', err));
    }
  }, [selectedDatasetId]);

  const categories = selectedDataset?.categories || [];

  const filteredCases = (selectedDataset?.cases || []).filter((c) => {
    const matchesSearch =
      c.prompt.toLowerCase().includes(caseSearch.toLowerCase()) ||
      c.expected_behavior.toLowerCase().includes(caseSearch.toLowerCase()) ||
      c.id.toLowerCase().includes(caseSearch.toLowerCase());
    const matchesCat = categoryFilter === 'All' || c.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setUploadError('File size exceeds maximum 2MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawFileContent(content);
      if (!uploadName) {
        setUploadName(file.name.replace(/\.[^/.]+$/, ''));
      }
      setUploadError('');
    };
    reader.onerror = () => setUploadError('Failed to read file.');
    reader.readAsText(file);
  };

  const parseAndSubmitDataset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadName.trim() || !rawFileContent.trim()) {
      setUploadError('Dataset name and file content are required.');
      return;
    }
    setUploadError('');
    setIsUploading(true);

    try {
      let parsedCases: any[] = [];
      const contentTrimmed = rawFileContent.trim();

      // Check if JSON
      if (contentTrimmed.startsWith('[') || contentTrimmed.startsWith('{')) {
        const parsed = JSON.parse(contentTrimmed);
        parsedCases = Array.isArray(parsed) ? parsed : (parsed.cases || []);
      } else {
        // Parse CSV
        const lines = contentTrimmed.split('\n').filter(l => l.trim() !== '');
        if (lines.length < 2) {
          throw new Error('CSV file must have a header row and at least one data row.');
        }
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const catIdx = headers.indexOf('category');
        const promptIdx = headers.indexOf('prompt');
        const expIdx = headers.indexOf('expected_behavior') !== -1 ? headers.indexOf('expected_behavior') : headers.indexOf('expected');

        if (promptIdx === -1) {
          throw new Error('CSV must contain a "prompt" column.');
        }

        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',');
          parsedCases.push({
            id: `TC-CSV-${i}`,
            category: catIdx !== -1 ? parts[catIdx]?.trim() || 'General' : 'General',
            prompt: parts[promptIdx]?.trim() || '',
            expected_behavior: expIdx !== -1 ? parts[expIdx]?.trim() || 'Safe standard output' : 'Safe output',
            severity: 'Medium',
            evaluation_method: 'Policy Check'
          });
        }
      }

      if (parsedCases.length === 0) {
        throw new Error('No valid test cases parsed from file.');
      }

      await uploadDataset({
        name: uploadName,
        description: uploadDesc || 'User-uploaded adversarial dataset benchmark',
        cases: parsedCases
      });

      await onRefreshData();
      setShowUploadModal(false);
      setUploadName('');
      setUploadDesc('');
      setRawFileContent('');
    } catch (err: any) {
      setUploadError(err.message || 'Dataset parsing failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleExportCsv = () => {
    if (!selectedDataset || !selectedDataset.cases) return;
    let csv = 'ID,Category,Severity,Prompt,Expected Behavior,Evaluation Method\n';
    for (const c of selectedDataset.cases) {
      const escape = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;
      csv += `${c.id},${escape(c.category)},${c.severity},${escape(c.prompt)},${escape(c.expected_behavior)},${escape(c.evaluation_method)}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedDataset.name.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Evaluation Datasets
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage adversarial test suites, import synthetic datasets, and audit test cases.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={!selectedDataset}
            className="bayora-btn-secondary px-3.5 py-2.5 text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowUploadModal(true)}
            className="bayora-btn-primary px-4 py-2.5 text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Dataset</span>
          </button>
        </div>
      </div>

      {/* Dataset Selection Tabs */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {datasets.map((d) => {
          const isSelected = selectedDatasetId === d.id;
          return (
            <button
              key={d.id}
              onClick={() => setSelectedDatasetId(d.id)}
              className={`px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer whitespace-nowrap border ${
                isSelected
                  ? 'bg-white border-[#9B7DE8] text-[#7952D8] shadow-sm ring-2 ring-[#9B7DE8]/10'
                  : 'bg-white/80 border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Database className={`w-4 h-4 ${isSelected ? 'text-[#8762E0]' : 'text-slate-400'}`} />
              <span>{d.name}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500 font-mono">
                {d.total_cases} cases
              </span>
            </button>
          );
        })}
      </div>

      {/* Dataset Overview Summary */}
      {selectedDataset && (
        <div className="bayora-card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{selectedDataset.name}</h2>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-[#7952D8] border border-purple-200">
                  v{selectedDataset.version}
                </span>
                {selectedDataset.is_builtin === 1 && (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                    Standard Benchmark
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">{selectedDataset.description}</p>
            </div>

            <button
              onClick={() => onNavigate('redteam')}
              className="px-4 py-2 rounded-xl bg-[#f4efff] hover:bg-[#ede5fd] text-[#7952D8] text-xs font-semibold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto transition-colors"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Use in Red Team</span>
            </button>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={caseSearch}
                onChange={(e) => setCaseSearch(e.target.value)}
                placeholder="Search test prompt or expected behavior..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 outline-hidden focus:bg-white focus:border-[#9B7DE8]"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              <button
                onClick={() => setCategoryFilter('All')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  categoryFilter === 'All' ? 'bg-[#9B7DE8] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(c)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${
                    categoryFilter === c ? 'bg-[#9B7DE8] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Test Cases Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4">Case ID</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Severity</th>
                  <th className="py-2.5 px-4">Synthetic Prompt Case</th>
                  <th className="py-2.5 px-4">Expected Behavior</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredCases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{c.id}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800">{c.category}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          c.severity === 'Critical'
                            ? 'bg-red-50 text-red-600'
                            : c.severity === 'High'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-blue-50 text-blue-600'
                        }`}
                      >
                        {c.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs font-mono text-[11px] text-slate-800 truncate" title={c.prompt}>
                      {c.prompt}
                    </td>
                    <td className="py-3 px-4 max-w-xs text-slate-600 truncate" title={c.expected_behavior}>
                      {c.expected_behavior}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Dataset Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#8762E0]" />
                <span>Upload Adversarial Dataset (CSV or JSON)</span>
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={parseAndSubmitDataset} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Dataset Name</label>
                <input
                  type="text"
                  required
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="e.g. Finance Adversarial Probes v2.0"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-hidden focus:border-[#9B7DE8]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Select File (.csv or .json)</label>
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileUpload}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-100 file:text-[#7952D8] hover:file:bg-purple-200 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Or Paste Content (CSV/JSON)</label>
                <textarea
                  rows={4}
                  value={rawFileContent}
                  onChange={(e) => setRawFileContent(e.target.value)}
                  placeholder="category,prompt,expected_behavior&#10;Jailbreak,Hypothetical roleplay...,Refuse roleplay"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] outline-hidden focus:border-[#9B7DE8]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="bayora-btn-primary px-5 py-2 font-semibold cursor-pointer"
                >
                  {isUploading ? 'Validating...' : 'Import Dataset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
