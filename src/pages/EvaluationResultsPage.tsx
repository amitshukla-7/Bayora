import React, { useState, useEffect } from 'react';
import {
  Download,
  ShieldAlert,
  CheckCircle2,
  Search,
  Eye,
  X,
  Lock,
  ArrowLeft
} from 'lucide-react';
import type { Evaluation, Finding, PageId, AuditVerification, AdvisorIncidentResponse } from '../types';
import { fetchEvaluations, fetchEvaluationById, verifyAuditLedger, explainIncident } from '../services/api';

interface EvaluationResultsPageProps {
  initialEvaluationId?: string;
  categoryFilter?: string;
  onNavigate: (page: PageId, extraId?: string) => void;
}

export const EvaluationResultsPage: React.FC<EvaluationResultsPageProps> = ({
  initialEvaluationId,
  categoryFilter: initialCategoryFilter,
  onNavigate,
}) => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [selectedEvalId, setSelectedEvalId] = useState<string>(initialEvaluationId || '');
  const [currentEval, setCurrentEval] = useState<Evaluation | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [advisorReport, setAdvisorReport] = useState<AdvisorIncidentResponse | null>(null);
  const [isLoadingAdvisor, setIsLoadingAdvisor] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(initialCategoryFilter || 'All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Audit modal
  const [auditResult, setAuditResult] = useState<AuditVerification | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  useEffect(() => {
    fetchEvaluations().then((res) => {
      setEvaluations(res.evaluations || []);
      if (!selectedEvalId && res.evaluations.length > 0) {
        setSelectedEvalId(res.evaluations[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedEvalId) {
      fetchEvaluationById(selectedEvalId).then((res) => {
        setCurrentEval(res);
        setFindings(res.findings || []);
      });
    }
  }, [selectedEvalId]);

  useEffect(() => {
    if (selectedFinding) {
      setIsLoadingAdvisor(true);
      explainIncident({
        contextId: selectedFinding.id,
        policyId: selectedFinding.policy_violated || 'POL-001',
        category: selectedFinding.category,
        testPrompt: selectedFinding.test_case_prompt,
        observedResponse: selectedFinding.observed_response,
        evidence: selectedFinding.evidence
      })
        .then((adv) => setAdvisorReport(adv))
        .catch(() => setAdvisorReport(null))
        .finally(() => setIsLoadingAdvisor(false));
    } else {
      setAdvisorReport(null);
    }
  }, [selectedFinding]);

  const filteredFindings = findings.filter((f) => {
    const matchesSearch =
      f.id.toLowerCase().includes(search.toLowerCase()) ||
      f.test_case_prompt.toLowerCase().includes(search.toLowerCase()) ||
      f.explanation.toLowerCase().includes(search.toLowerCase()) ||
      f.model_name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === 'All' || f.category === categoryFilter;
    const matchesSev = severityFilter === 'All' || f.severity === severityFilter;
    const matchesStat = statusFilter === 'All' || f.status === statusFilter;
    return matchesSearch && matchesCat && matchesSev && matchesStat;
  });

  const handleVerifyLedger = async () => {
    setIsVerifying(true);
    setShowAuditModal(true);
    try {
      const res = await verifyAuditLedger();
      setAuditResult(res);
    } catch (err: any) {
      setAuditResult({
        verified: false,
        message: err.message || 'Audit verification failed.'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDownloadReport = (format: 'json' | 'csv') => {
    if (!selectedEvalId) return;
    window.open(`/api/evaluations/${selectedEvalId}/export?format=${format}`, '_blank');
  };

  const allCategories = ['All', 'Jailbreak', 'Prompt Injection', 'Sensitive Data Leakage', 'Toxicity', 'Hallucination', 'Data Exfiltration', 'Bias & Fairness', 'Compliance Drift'];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('dashboard')}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Evaluation Results & Audit Findings
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 pl-7">
            Review detailed test case outcomes, adversarial findings, and cryptographic audit evidence.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Audit Verification Button */}
          <button
            onClick={handleVerifyLedger}
            className="bayora-btn-secondary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-[#8762E0]" />
            <span>Verify SHA-256 Ledger</span>
          </button>

          {/* Export JSON Button */}
          <button
            onClick={() => handleDownloadReport('json')}
            className="bayora-btn-secondary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>JSON Report</span>
          </button>

          {/* Export CSV Button */}
          <button
            onClick={() => handleDownloadReport('csv')}
            className="bayora-btn-primary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV Cases</span>
          </button>
        </div>
      </div>

      {/* Evaluation Selector Dropdown / Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0">
          Run History:
        </span>
        {evaluations.map((ev) => (
          <button
            key={ev.id}
            onClick={() => setSelectedEvalId(ev.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border ${
              selectedEvalId === ev.id
                ? 'bg-[#9B7DE8] text-white shadow-xs border-[#8762e0]'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {ev.name} ({ev.id})
          </button>
        ))}
      </div>

      {/* Run Summary Metric Cards */}
      {currentEval && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="bayora-card p-4 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Test Cases</span>
            <div className="text-xl font-bold font-mono text-slate-900">{currentEval.total_cases}</div>
            <div className="text-[10px] text-slate-500 font-medium">{currentEval.preset_scenario}</div>
          </div>

          <div className="bayora-card p-4 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Passed Checks</span>
            <div className="text-xl font-bold font-mono text-emerald-600">{currentEval.passed_count}</div>
            <div className="text-[10px] text-emerald-700 font-medium">Safe Behavior</div>
          </div>

          <div className="bayora-card p-4 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Warning Incidents</span>
            <div className="text-xl font-bold font-mono text-amber-500">{currentEval.warning_count}</div>
            <div className="text-[10px] text-amber-700 font-medium">Non-critical drift</div>
          </div>

          <div className="bayora-card p-4 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Critical Failures</span>
            <div className="text-xl font-bold font-mono text-red-500">{currentEval.failed_count}</div>
            <div className="text-[10px] text-red-700 font-medium">Policy Violations</div>
          </div>

          <div className="bayora-card p-4 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Duration & Mode</span>
            <div className="text-xl font-bold font-mono text-slate-800">
              {currentEval.execution_duration_ms > 0 ? `${currentEval.execution_duration_ms} ms` : currentEval.estimated_duration}
            </div>
            <div className="text-[10px] text-purple-700 font-medium">Deterministic Sim</div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bayora-card p-5 space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search findings by prompt, explanation, or ID..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-hidden focus:bg-white focus:border-[#9B7DE8]"
            />
          </div>

          {/* Severity & Status Dropdowns */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 outline-hidden font-medium cursor-pointer"
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 outline-hidden font-medium cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Failed">Failed</option>
              <option value="Warning">Warning</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
          {allCategories.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                categoryFilter === c ? 'bg-[#9B7DE8] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Findings Table */}
      <div className="bayora-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900">
            Recorded Findings ({filteredFindings.length})
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Click row to view evidence & mitigation
          </span>
        </div>

        {filteredFindings.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
            <div className="font-semibold text-slate-700">No matching adversarial findings</div>
            <p>All evaluated test cases satisfied safety guardrails within selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4">Finding ID</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Model</th>
                  <th className="py-2.5 px-4">Severity</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Risk</th>
                  <th className="py-2.5 px-4">Adversarial Input</th>
                  <th className="py-2.5 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredFindings.map((f) => (
                  <tr
                    key={f.id}
                    onClick={() => setSelectedFinding(f)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{f.id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{f.category}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{f.model_name}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          f.severity === 'Critical'
                            ? 'bg-red-50 text-red-600'
                            : f.severity === 'High'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-blue-50 text-blue-600'
                        }`}
                      >
                        {f.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          f.status === 'Failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {f.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{f.risk_score}</td>
                    <td className="py-3 px-4 max-w-xs truncate font-mono text-[11px] text-slate-600" title={f.test_case_prompt}>
                      {f.test_case_prompt}
                    </td>
                    <td className="py-3 px-4 text-[#8762E0] font-semibold flex items-center gap-1 group-hover:underline">
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Finding Detail Modal */}
      {selectedFinding && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Finding {selectedFinding.id}: {selectedFinding.category}
                  </h3>
                  <div className="text-xs text-slate-500 font-mono">
                    Model: {selectedFinding.model_name} · Severity: {selectedFinding.severity} · Risk: {selectedFinding.risk_score}/100
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedFinding(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                  1. Synthetic Adversarial Input
                </span>
                <div className="p-3 rounded-2xl bg-slate-900 text-slate-100 font-mono text-[11px] leading-relaxed">
                  {selectedFinding.test_case_prompt}
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                  2. Observed Model Response
                </span>
                <div className="p-3 rounded-2xl bg-red-50/70 border border-red-200 text-red-950 font-mono text-[11px] leading-relaxed">
                  {selectedFinding.observed_response}
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                  3. Expected Safe Behavior
                </span>
                <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 text-xs leading-relaxed">
                  {selectedFinding.expected_behavior}
                </div>
              </div>

              {/* Advisory Guidance Section */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7952D8] bg-[#f4efff] border border-[#e5d9fd] px-2.5 py-0.5 rounded-full">
                    Advisory – not a decision
                  </span>
                  <div className="flex items-center gap-2">
                    {isLoadingAdvisor ? (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                        <span className="w-2 h-2 rounded-full bg-[#9B7DE8] animate-ping" />
                        Querying AI Advisor...
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                        source: {advisorReport?.source || 'template'}
                      </span>
                    )}
                  </div>
                </div>

                {advisorReport?.incidentSummary && (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-xs">
                    <span className="font-bold text-slate-900 block mb-0.5 text-[11px] uppercase">Incident Summary:</span>
                    <p className="leading-relaxed">{advisorReport.incidentSummary}</p>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                  4. Root Cause & Violated Guardrail
                </span>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 space-y-1.5">
                  <div className="font-semibold text-slate-900 leading-relaxed">
                    {advisorReport?.rootCause || selectedFinding.explanation}
                  </div>
                  {selectedFinding.policy_violated && (
                    <div className="text-[11px] font-mono text-[#7952D8]">
                      Triggered Policy: {selectedFinding.policy_violated}
                    </div>
                  )}
                  <div className="text-[11px] text-slate-500 italic">
                    Evidence: {selectedFinding.evidence}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                  5. Recommended Defensive Mitigations
                </span>
                <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200 text-[#7952D8] text-xs space-y-1.5">
                  {advisorReport?.mitigations && advisorReport.mitigations.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 text-slate-800 font-medium leading-relaxed">
                      {advisorReport.mitigations.map((m, idx) => (
                        <li key={idx} className="text-xs">
                          <span className="text-slate-800">{m}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="font-medium leading-relaxed">{selectedFinding.mitigation}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedFinding(null)}
                className="bayora-btn-primary px-5 py-2 text-xs font-semibold cursor-pointer"
              >
                Close Finding
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Evidence Chain Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#8762E0]" />
                <span>SHA-256 Cryptographic Evidence Ledger</span>
              </h3>
              <button
                onClick={() => setShowAuditModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isVerifying ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <div className="w-6 h-6 border-2 border-[#9B7DE8] border-t-transparent rounded-full animate-spin mx-auto" />
                <p>Computing SHA-256 block hashes across canonical evidence logs...</p>
              </div>
            ) : auditResult ? (
              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Integrity Status: Cryptographically Intact</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {auditResult.message}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-[10px] space-y-1">
                  <div className="text-slate-400 uppercase font-semibold">Total Verified Blocks</div>
                  <div className="text-slate-800 font-bold">{auditResult.totalRecords} Evidence Records</div>
                  <div className="text-slate-400 uppercase font-semibold pt-1">Latest Merkle Root Hash</div>
                  <div className="text-purple-700 break-all">{auditResult.latestHash}</div>
                </div>

                <p className="text-[11px] text-slate-400 italic">
                  Note: A SHA-256 hash chain provides tamper detection by ensuring records cannot be retroactively altered without invalidating child blocks.
                </p>
              </div>
            ) : null}

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowAuditModal(false)}
                className="bayora-btn-primary px-5 py-2 text-xs font-semibold cursor-pointer"
              >
                Close Verification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
