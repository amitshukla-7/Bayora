import React from 'react';
import { X, FileText, AlertTriangle, ShieldCheck } from 'lucide-react';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  content: string;
  isRestricted?: boolean;
}

export const DocumentModal: React.FC<DocumentModalProps> = ({
  isOpen,
  onClose,
  fileName,
  content,
  isRestricted,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-[#0f1422] border border-slate-700/80 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#131b2e]">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isRestricted ? 'bg-rose-500/15 text-rose-400' : 'bg-sky-500/15 text-sky-400'}`}>
              {isRestricted ? <AlertTriangle className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-100 font-mono">{fileName}</h3>
                {isRestricted ? (
                  <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Restricted Tier-0
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Approved Document
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {isRestricted
                  ? 'Access prohibited by SentinelFlow Policy POL-002'
                  : 'Workspace Document · Read Authorized under POL-001'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-xs text-slate-300 leading-relaxed bg-[#0a0d14] selection:bg-sky-500/30">
          <pre className="whitespace-pre-wrap font-mono">{content}</pre>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-[#0f1422] text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span>Path: workspace/docs/{fileName}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
