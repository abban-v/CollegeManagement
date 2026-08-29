'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store';
import { X, CheckCircle2, Upload, AlertCircle, Camera, ShieldCheck, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

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
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const sampleProofs = [
    {
      title: 'Fixed Air Filter / Cooling Replaced',
      url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80',
    },
    {
      title: 'Condensate Drain Pipe Flushed & Repaired',
      url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80',
    },
    {
      title: 'Equipment Calibration & Safety Sign-off',
      url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=600&auto=format&fit=crop&q=80',
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofImage) {
      setError('A verification photo proof is strictly required by campus policy to submit a resolution.');
      return;
    }
    if (!notes.trim() || notes.length < 10) {
      setError('Please provide detailed maintenance notes describing the fix (min 10 chars).');
      return;
    }

    const success = submitResolution(issueId, notes.trim(), proofImage);

    if (success) {
      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#6ee7b7', '#a855f7'],
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6">
      <div className="relative w-full max-w-xl bg-[#0a0f24] border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#0d1430] border-b border-emerald-950/80 flex items-center justify-between">
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
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
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
            <div className="p-6 rounded-2xl border-2 border-dashed border-emerald-500/30 bg-emerald-950/20 text-center hover:border-emerald-500/60 transition-colors">
              <Upload className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-200">Upload official resolution proof photo</p>
              <p className="text-[11px] text-slate-400 mt-1 mb-3">JPG, PNG, WebP up to 10MB</p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      setProofImage(reader.result as string);
                      setError('');
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
              />
            </div>

            {proofImage && (
              <div className="mt-3 flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-200">
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Photo attached
                </span>
                <button
                  type="button"
                  onClick={() => setProofImage('')}
                  className="text-slate-400 hover:text-red-400 text-xs underline"
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
              rows={3}
              placeholder="Detail the root cause found, parts replaced, calibration steps, or technician sign-off notes..."
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setError('');
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#060a17] border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none resize-none leading-relaxed"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-[0_0_18px_rgba(16,185,129,0.35)] transition-all"
            >
              Submit Proof & Resolve Issue
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
