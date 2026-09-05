'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useApp } from '@/lib/store';
import { apiClient } from '@/lib/api';
import { IssuePriority } from '@/lib/types';
import {
  X,
  Plus,
  Upload,
  AlertTriangle,
  AlertOctagon,
  HelpCircle,
  Lightbulb,
  MapPin,
  Tag,
  Check,
  ThumbsUp,
  ArrowRight,
  Info,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { triggerQuantumBurst } from '@/lib/quantumBurst';
import { CompactPulseSpinner, AiSentinelPulse } from '@/components/ui/CustomLoader';

function cleanErrorMessage(rawMsg: string): string {
  if (!rawMsg) return 'Failed to submit problem report.';
  // Parse JSON if backend or Zod returned stringified issues: e.g. [{"message":"Description must be at least 10 characters",...}]
  const jsonMatch = rawMsg.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const msgs = parsed.map((item: { message?: string }) => item.message).filter(Boolean);
        if (msgs.length > 0) return msgs.join('; ');
      }
    } catch {}
  }
  return rawMsg.replace(/^Validation error:\s*/i, '');
}

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newIssueId: string) => void;
}

export const ReportIssueModal: React.FC<ReportIssueModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const {
    currentUser,
    departments,
    categories,
    assets,
    issues,
    createIssue,
    toggleAffected,
  } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || 'dept-facilities');
  const [locationDetails, setLocationDetails] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 'cat-general');
  const [assetId, setAssetId] = useState('');
  const [priority, setPriority] = useState<IssuePriority>('MEDIUM');
  const [possibleCause, setPossibleCause] = useState('');
  const [suggestedSolution, setSuggestedSolution] = useState('');
  const [occurredAt, setOccurredAt] = useState('');
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [serverDuplicate, setServerDuplicate] = useState<{ id: string; title: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'diagnostics' | 'evidence'>('details');

  const resetForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setDepartmentId(departments[0]?.id || 'dept-facilities');
    setLocationDetails('');
    setCategoryId(categories[0]?.id || 'cat-general');
    setAssetId('');
    setPriority('MEDIUM');
    setPossibleCause('');
    setSuggestedSolution('');
    setOccurredAt('');
    setSelectedImage('');
    setIsUploadingImage(false);
    setIsSubmitting(false);
    setErrorMessage(null);
    setServerDuplicate(null);
    setActiveTab('details');
  }, [departments, categories]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  // Ensure form is completely cleared whenever the modal is closed without clicking submit
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  // Duplicate detection
  const potentialDuplicates = useMemo(() => {
    if (!locationDetails || title.trim().length < 3) return [];
    const query = title.toLowerCase();
    const locQuery = locationDetails.toLowerCase();
    return issues.filter(
      (i) =>
        i.status !== 'VERIFIED' &&
        i.status !== 'CLOSED' &&
        ((i.locationDetails || '').toLowerCase().includes(locQuery) || i.categoryId === categoryId) &&
        (i.title.toLowerCase().includes(query) ||
          query.split(' ').some((word) => word.length > 3 && i.title.toLowerCase().includes(word)))
    );
  }, [issues, locationDetails, categoryId, title]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMessage('Please provide a title and problem description.');
      return;
    }
    if (!locationDetails.trim()) {
      setErrorMessage('Please provide the location / classroom / lab details (e.g. CS 201).');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const created = await createIssue({
        title,
        description,
        categoryId,
        departmentId,
        locationId: locationDetails,
        locationDetails: locationDetails.trim(),
        assetId: assetId || undefined,
        priority,
        possibleCause: possibleCause.trim() || undefined,
        suggestedSolution: suggestedSolution.trim() || undefined,
        occurredAt: occurredAt || undefined,
        attachments: selectedImage ? [selectedImage] : [],
      });

      // Rule 1: Inform the user if the issue is kept for review
      if (created.moderationStatus === 'UNDER_REVIEW') {
        alert(
          'Notice: Your issue has been submitted and is currently held for review by campus administrators due to low confidence or potential spam. It will be published to the live campus feed once approved.'
        );
      } else {
        triggerQuantumBurst({
          variant: 'cobalt',
          intensity: 'celebration',
        });
      }

      resetForm();
      onClose();
      if (onSuccess) onSuccess(created.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit problem report.';
      setErrorMessage(cleanErrorMessage(msg));
      if (
        err &&
        typeof err === 'object' &&
        'duplicateOfIssueId' in err &&
        (err as { duplicateOfIssueId?: string }).duplicateOfIssueId
      ) {
        setServerDuplicate({
          id: (err as { duplicateOfIssueId?: string }).duplicateOfIssueId!,
          title: (err as { duplicateIssueTitle?: string }).duplicateIssueTitle || 'Existing Problem Ticket',
        });
      } else {
        setServerDuplicate(null);
      }
      setActiveTab('details');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className="relative w-full max-w-2xl bg-[#121217] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#18181f] border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/25">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Report Campus Infrastructure Problem</h2>
              <p className="text-xs text-zinc-400">
                Reporting as <span className="font-semibold text-white">{currentUser?.name || 'Campus Member'}</span> ({currentUser?.role || 'STUDENT'})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Navigation Tabs */}
        <div className="flex items-center border-b border-zinc-800 bg-[#09090b] px-6 text-xs font-medium overflow-x-auto scrollbar-none touch-scroll">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            1. Problem & Location
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('diagnostics')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'diagnostics'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            2. Diagnostic Notes
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('evidence')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'evidence'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            3. Photo Evidence
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Active AI Processing Banner */}
          {isSubmitting && (
            <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs text-blue-200 flex items-center gap-3 animate-pulse">
              <AiSentinelPulse />
              <div className="flex-1">
                <p className="font-semibold text-white">AI Sentinel Inspection in Progress...</p>
                <p className="text-[11px] text-blue-300/80 mt-0.5">
                  Verifying problem symptoms, evaluating authenticity, and checking duplicate candidates.
                </p>
              </div>
            </div>
          )}

          {/* Submission Error Alert */}
          {errorMessage && (
            <div
              className={`p-4 rounded-xl border shadow-inner flex items-start gap-3 ${
                errorMessage.includes('Issue already exists')
                  ? 'bg-amber-950/80 border-amber-500/60 text-amber-200'
                  : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
              }`}
            >
              {errorMessage.includes('Issue already exists') ? (
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h4
                  className={`text-xs font-bold ${
                    errorMessage.includes('Issue already exists') ? 'text-amber-200' : 'text-rose-200'
                  }`}
                >
                  {errorMessage.includes('Issue already exists')
                    ? 'Duplicate Problem Report Detected'
                    : 'Problem Report Not Accepted'}
                </h4>
                <p
                  className={`text-xs mt-1 leading-relaxed ${
                    errorMessage.includes('Issue already exists') ? 'text-amber-300' : 'text-rose-300'
                  }`}
                >
                  {errorMessage}
                </p>
                {errorMessage.includes('Issue already exists') && (serverDuplicate || potentialDuplicates.length > 0) && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const targetId = serverDuplicate?.id || potentialDuplicates[0]?.id;
                        if (targetId) {
                          toggleAffected(targetId);
                          alert("You've upvoted the existing issue (added to Affected users)!");
                          handleClose();
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      {serverDuplicate?.title ? `Upvote: ${serverDuplicate.title.slice(0, 45)}` : 'Upvote Previous Issue Now'}
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setServerDuplicate(null);
                }}
                className={`hover:text-white p-1 ${
                  errorMessage.includes('Issue already exists') ? 'text-amber-400' : 'text-rose-400'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* TAB 1: DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              
              {/* Duplicate Detection Alert */}
              {potentialDuplicates.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 shadow-inner">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-amber-300">Similar Ongoing Problem Detected!</h4>
                      <p className="text-xs text-slate-300 mt-1">
                        Someone may have already reported this issue. If it&apos;s the same problem, click &quot;I&apos;m Affected&quot; instead of creating a duplicate:
                      </p>
                      
                      <div className="mt-2 space-y-2">
                        {potentialDuplicates.slice(0, 2).map((dup) => (
                          <div key={dup.id} className="p-2.5 rounded-lg bg-black/40 border border-amber-500/20 flex items-center justify-between gap-2">
                            <div className="truncate text-xs">
                              <p className="font-semibold text-slate-200 truncate">{dup.title}</p>
                              <p className="text-[11px] text-slate-400 truncate">{dup.locationDetails}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                toggleAffected(dup.id);
                                alert("You've been added as affected to this issue!");
                                handleClose();
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                            >
                              <ThumbsUp className="w-3 h-3" />
                              I&apos;m Affected Too
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Issue Title / Headline <span className="text-blue-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Projector in CS 201 shutting down due to overheating"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#09090b] border border-zinc-800 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Location Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  Location / Classroom / Lab <span className="text-blue-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS 201, Mechanical Block Lab 3, Library 2nd Floor"
                  value={locationDetails}
                  onChange={(e) => setLocationDetails(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#09090b] border border-zinc-800 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Category & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Category <span className="text-blue-400">*</span>
                    </label>
                    <span className="text-[10px] text-blue-400 font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> AI Assisted
                    </span>
                  </div>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[44px] rounded-xl bg-[#09090b] border border-zinc-800 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Urgency / Priority Level <span className="text-blue-400">*</span>
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as IssuePriority)}
                    className="w-full px-3 py-2.5 min-h-[44px] rounded-xl bg-[#09090b] border border-zinc-800 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                  >
                    <option value="LOW">Low (Cosmetic / Minor)</option>
                    <option value="MEDIUM">Medium (Degraded performance)</option>
                    <option value="HIGH">High (Disrupts classes/labs)</option>
                    <option value="CRITICAL">Critical (Safety hazard / total failure)</option>
                  </select>
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Department / Academic Unit <span className="text-blue-400">*</span>
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full px-3 py-2.5 min-h-[44px] rounded-xl bg-[#09090b] border border-zinc-800 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional Asset / Equipment Link */}
              {assets.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Linked Campus Equipment (Optional)</span>
                    <span className="text-[10px] text-slate-400">Projector, AC, Lab Hardware</span>
                  </label>
                  <select
                    value={assetId}
                    onChange={(e) => setAssetId(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[44px] rounded-xl bg-[#09090b] border border-zinc-800 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                  >
                    <option value="">-- None / General Facility --</option>
                    {assets.map((ast) => (
                      <option key={ast.id} value={ast.id}>
                        [{ast.assetTag}] {ast.name} ({ast.locationId || 'Main Campus'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Observed Problem & Symptoms <span className="text-blue-400">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe what happens, when it occurs, and any error codes or sounds..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[110px] rounded-xl bg-[#09090b] border border-zinc-800 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none leading-relaxed"
                />
              </div>

            </div>
          )}

          {/* TAB 2: DIAGNOSTICS */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300 leading-relaxed flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  Optional diagnostic information helps campus maintenance crews bring the right replacement parts and tools on their first visit.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                  Suspected Root Cause (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Blown fuse, loose HDMI cable, clogged air filter, power surge"
                  value={possibleCause}
                  onChange={(e) => setPossibleCause(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#09090b] border border-zinc-800 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-emerald-400" />
                  Suggested Fix or Action (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Replace projector lamp bulb, reset circuit breaker, repair water pipe seal"
                  value={suggestedSolution}
                  onChange={(e) => setSuggestedSolution(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#09090b] border border-zinc-800 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  When did this issue first start / occur?
                </label>
                <input
                  type="text"
                  placeholder="e.g. Today during 9:30 AM lecture, or Past 2 days"
                  value={occurredAt}
                  onChange={(e) => setOccurredAt(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#09090b] border border-zinc-800 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 3: EVIDENCE */}
          {activeTab === 'evidence' && (
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Attach Photo / Visual Proof (Optional)
              </label>
              
              {/* Clean Upload Dropzone */}
              <div className="p-8 rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-900/30 text-center hover:border-blue-500/60 transition-colors relative">
                {isUploadingImage ? (
                  <div className="flex flex-col items-center justify-center py-4 text-blue-400">
                    <CompactPulseSpinner size={32} className="mb-2" />
                    <p className="text-xs font-semibold">Uploading to secure storage...</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
                    <p className="text-xs font-semibold text-slate-200">Upload photo from your computer or phone camera</p>
                    <p className="text-[11px] text-slate-400 mt-1 mb-4">Supports PNG, JPG, JPEG, WebP up to 5MB</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setIsUploadingImage(true);
                          try {
                            const res = await apiClient.uploadFile(file);
                            if (res.data?.publicUrl) {
                              setSelectedImage(res.data.publicUrl);
                            } else {
                              const reader = new FileReader();
                              reader.onload = () => setSelectedImage(reader.result as string);
                              reader.readAsDataURL(file);
                            }
                          } catch {
                            const reader = new FileReader();
                            reader.onload = () => setSelectedImage(reader.result as string);
                            reader.readAsDataURL(file);
                          } finally {
                            setIsUploadingImage(false);
                          }
                        }
                      }}
                      className="text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                    />
                  </>
                )}
              </div>

              {selectedImage && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/80 border border-zinc-700 text-xs text-zinc-200">
                  <span className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    Photo attached & verified
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedImage('')}
                    className="text-slate-400 hover:text-rose-400 text-xs underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-zinc-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {activeTab !== 'details' && (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'evidence' ? 'diagnostics' : 'details')}
                  className="flex-1 sm:flex-none px-3.5 py-2.5 min-h-[44px] rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 border border-zinc-700 transition-colors cursor-pointer"
                >
                  Previous
                </button>
              )}
              {activeTab !== 'evidence' && (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'details' ? 'diagnostics' : 'evidence')}
                  className="flex-1 sm:flex-none px-3.5 py-2.5 min-h-[44px] rounded-xl bg-blue-950/60 hover:bg-blue-900/60 text-xs text-blue-300 border border-blue-800/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Next Step <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="px-3.5 py-2 min-h-[44px] rounded-xl text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-zinc-800 hover:border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Clear all entered form fields"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear Form
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 min-h-[44px] rounded-xl text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <CompactPulseSpinner size={16} />
                    <span>Analyzing & Submitting...</span>
                  </>
                ) : (
                  <span>Submit Problem Report</span>
                )}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
