'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store';
import { apiClient } from '@/lib/api';
import { X, RefreshCcw, AlertTriangle, Upload, Check, Loader2 } from 'lucide-react';

interface ReopenModalProps {
  issueId: string;
  issueTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ReopenModal: React.FC<ReopenModalProps> = ({
  issueId,
  issueTitle,
  isOpen,
  onClose,
}) => {
  const { reopenIssue } = useApp();
  const [reason, setReason] = useState('');
  const [evidenceImage, setEvidenceImage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.length < 10) {
      setError('Please explain why the issue is still not resolved (minimum 10 characters).');
      return;
    }

    const success = await reopenIssue(
      issueId,
      reason.trim(),
      evidenceImage ? [evidenceImage] : []
    );

    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6">
      <div className="relative w-full max-w-lg bg-[#121217] border border-rose-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#18181f] border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-950/80 text-rose-400 border border-rose-500/30">
              <RefreshCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Reopen Campus Issue</h3>
              <p className="text-xs text-rose-300/80">Dispute Resolution / Problem Persists</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="px-6 py-3 bg-rose-950/30 border-b border-rose-900/30 text-xs text-rose-200 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>
            If the equipment is still malfunctioning after the staff fix, explain the current symptoms below so facilities can re-dispatch a technician.
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <span className="text-xs text-slate-400">Issue:</span>
            <p className="text-xs font-semibold text-slate-200 truncate mt-0.5">{issueTitle}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Why is this problem still unresolved? <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="e.g. Tried turning it on today during 10 AM class, projector still shut off after 5 minutes with blinking red light..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError('');
              }}
              className="w-full px-3.5 py-2.5 min-h-[100px] rounded-xl bg-[#09090b] border border-zinc-800 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Optional fresh photo */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-zinc-400" />
              Attach New Evidence Photo (Optional)
            </label>
            {isUploading ? (
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-center text-zinc-400 flex items-center justify-center gap-2 text-xs">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading evidence photo...</span>
              </div>
            ) : (
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setIsUploading(true);
                    setError('');
                    try {
                      const res = await apiClient.uploadFile(file);
                      if (res.data?.publicUrl) {
                        setEvidenceImage(res.data.publicUrl);
                      } else {
                        const reader = new FileReader();
                        reader.onload = () => setEvidenceImage(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    } catch {
                      const reader = new FileReader();
                      reader.onload = () => setEvidenceImage(reader.result as string);
                      reader.readAsDataURL(file);
                    } finally {
                      setIsUploading(false);
                    }
                  }
                }}
                className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-rose-700 file:text-white hover:file:bg-rose-600 cursor-pointer"
              />
            )}
            {evidenceImage && (
              <div className="mt-2 flex items-center justify-between p-2 rounded-lg bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300">
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Photo attached
                </span>
                <button
                  type="button"
                  onClick={() => setEvidenceImage('')}
                  className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {error && (
            <p className="text-xs text-rose-400 bg-rose-950/60 p-2.5 rounded-lg border border-rose-500/30">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-zinc-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 min-h-[44px] rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-600/30 transition-all cursor-pointer"
            >
              Confirm & Reopen Ticket
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
