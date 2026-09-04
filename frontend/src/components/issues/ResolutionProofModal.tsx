'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store';
import { apiClient } from '@/lib/api';
import { X, CheckCircle2, Upload, AlertCircle, Camera, ShieldCheck, Check, Loader2 } from 'lucide-react';
import { triggerQuantumBurst } from '@/lib/quantumBurst';

interface ResolutionProofModalProps {
  issueId: string;
  issueTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ResolutionProofModal: React.FC<ResolutionProofModalProps> = ({
  issueId,
  issueTitle,
  isOpen,
  onClose,
}) => {
  const { submitResolution } = useApp();
  const [proofImage, setProofImage] = useState<string>('');
  const [uploadId, setUploadId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofImage) {
      setError('A verification photo proof is strictly required by campus policy to submit a resolution.');
      return;
    }
    if (!notes.trim() || notes.length < 10) {
      setError('Please provide detailed maintenance notes describing the fix (min 10 chars).');
      return;
    }

    const success = await submitResolution(issueId, notes.trim(), proofImage, uploadId || undefined);

    if (success) {
      triggerQuantumBurst({
        variant: 'emerald',
        particleCount: 45,
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6">
      <div className="relative w-full max-w-xl bg-[#121217] border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#18181f] border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Sign-Off & Resolve Problem</h3>
              <p className="text-xs text-emerald-300/80">Admin / Technician Verification Protocol</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice */}
        <div className="px-6 py-3 bg-emerald-950/30 border-b border-emerald-900/40 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Issues can <strong>only</strong> be marked resolved when visual proof of completion is provided.</span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <span className="text-xs text-slate-400">Target Issue:</span>
            <p className="text-xs font-semibold text-slate-200 truncate mt-0.5">{issueTitle}</p>
          </div>

          {/* Proof Image Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              Upload Work Completion Proof Photo <span className="text-emerald-400">*</span>
            </label>

            {/* Clean Dropzone */}
            <div className="p-6 rounded-2xl border-2 border-dashed border-emerald-500/30 bg-emerald-950/20 text-center hover:border-emerald-500/60 transition-colors relative">
              {isUploading ? (
                <div className="flex flex-col items-center justify-center py-4 text-emerald-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <p className="text-xs font-semibold">Uploading proof image...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-200">Upload official resolution proof photo</p>
                  <p className="text-[11px] text-slate-400 mt-1 mb-3">JPG, PNG, WebP up to 5MB</p>
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
                            setProofImage(res.data.publicUrl);
                            if (res.data.uploadId) {
                              setUploadId(res.data.uploadId);
                            }
                          } else {
                            const reader = new FileReader();
                            reader.onload = () => setProofImage(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        } catch {
                          const reader = new FileReader();
                          reader.onload = () => setProofImage(reader.result as string);
                          reader.readAsDataURL(file);
                        } finally {
                          setIsUploading(false);
                        }
                      }
                    }}
                    className="text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
                  />
                </>
              )}
            </div>

            {proofImage && (
              <div className="mt-3 flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-200">
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Photo attached & verified
                </span>
                <button
                  type="button"
                  onClick={() => setProofImage('')}
                  className="text-slate-400 hover:text-rose-400 text-xs underline cursor-pointer"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Maintenance Work Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Resolution Summary & Action Taken <span className="text-emerald-400">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="Detail the root cause found, parts replaced, calibration steps, or technician sign-off notes..."
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setError('');
              }}
              className="w-full px-3.5 py-2.5 min-h-[100px] rounded-xl bg-[#09090b] border border-zinc-800 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none leading-relaxed"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
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
              className="px-5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
            >
              Submit Proof & Resolve Issue
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
