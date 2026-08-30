'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/lib/store';
import { IssuePriority } from '@/lib/types';
import {
  X,
  Plus,
  Upload,
  AlertTriangle,
  HelpCircle,
  Lightbulb,
  Building,
  MapPin,
  Tag,
  Check,
  ThumbsUp,
  ArrowRight,
  Info,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newIssueId: string) => void;
}

export const ReportIssueModal: React.FC<ReportIssueModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const {
    currentUser,
    departments,
    locations,
    categories,
    assets,
    issues,
    createIssue,
    toggleAffected,
  } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || '');
  const [locationId, setLocationId] = useState(locations[0]?.id || '');
  const [locationDetails, setLocationDetails] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [assetId, setAssetId] = useState('');
  const [priority, setPriority] = useState<IssuePriority>('MEDIUM');
  const [possibleCause, setPossibleCause] = useState('');
  const [suggestedSolution, setSuggestedSolution] = useState('');
  const [occurredAt, setOccurredAt] = useState('');
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'details' | 'diagnostics' | 'evidence'>('details');

  // Filter assets matching selected department & location
  const matchingAssets = useMemo(() => {
    return assets.filter(
      (a) => (!departmentId || a.departmentId === departmentId) && (!locationId || a.locationId === locationId)
    );
  }, [assets, departmentId, locationId]);

  // Duplicate detection
  const potentialDuplicates = useMemo(() => {
    if (!locationId || title.trim().length < 3) return [];
    const query = title.toLowerCase();
    return issues.filter(
      (i) =>
        i.status !== 'VERIFIED' &&
        i.status !== 'CLOSED' &&
        (i.locationId === locationId || i.categoryId === categoryId) &&
        (i.title.toLowerCase().includes(query) ||
          query.split(' ').some((word) => word.length > 3 && i.title.toLowerCase().includes(word)))
    );
  }, [issues, locationId, categoryId, title]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert('Please provide a title and problem description.');
      return;
    }

    const created = createIssue({
      title,
      description,
      categoryId,
      departmentId,
      locationId,
      locationDetails: locationDetails || locations.find((l) => l.id === locationId)?.room,
      assetId: assetId || undefined,
      priority,
      possibleCause: possibleCause.trim() || undefined,
      suggestedSolution: suggestedSolution.trim() || undefined,
      occurredAt: occurredAt || undefined,
      attachments: selectedImage ? [selectedImage] : [],
    });

    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
    });

    onClose();
    if (onSuccess) onSuccess(created.id);
  };

  const handleSampleImagePick = (url: string) => {
    setSelectedImage(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-md flex items-center justify-center p-4 sm:p-6">
      <div className="relative w-full max-w-2xl bg-[#0b0f22] border border-indigo-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#0e1329] border-b border-indigo-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Report Campus Infrastructure Problem</h2>
              <p className="text-xs text-indigo-300/70">
                Reporting as <span className="font-semibold text-white">{currentUser?.name || 'Campus Member'}</span> ({currentUser?.role || 'STUDENT'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Navigation Tabs */}
        <div className="flex items-center border-b border-indigo-950/80 bg-[#070a1a] px-6 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'details'
                ? 'border-purple-500 text-purple-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building className="w-4 h-4" />
            1. Problem & Location
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('diagnostics')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'diagnostics'
                ? 'border-purple-500 text-purple-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            2. Hypotheses & Solution <span className="text-[10px] text-purple-400/80 bg-purple-950/60 px-1.5 py-0.2 rounded">(Optional)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('evidence')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'evidence'
                ? 'border-purple-500 text-purple-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            3. Photo Evidence
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          
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
                                onClose();
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1 shrink-0"
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
                  Issue Title / Headline <span className="text-purple-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Projector in Room 304 shutting down due to overheating"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070a1a] border border-indigo-950 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                />
              </div>

              {/* Category & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Category <span className="text-purple-400">*</span>
                    </label>
                    <span className="text-[10px] text-purple-400 font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> AI Assisted (Gemini 2.5 Flash)
                    </span>
                  </div>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#070a1a] border border-indigo-950 text-xs text-slate-200 focus:border-purple-500 outline-none"
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
                    Urgency / Priority Level <span className="text-purple-400">*</span>
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as IssuePriority)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#070a1a] border border-indigo-950 text-xs text-slate-200 focus:border-purple-500 outline-none"
                  >
                    <option value="LOW">Low (Cosmetic / Minor)</option>
                    <option value="MEDIUM">Medium (Degraded performance)</option>
                    <option value="HIGH">High (Disrupts classes/labs)</option>
                    <option value="CRITICAL">Critical (Safety hazard / total failure)</option>
                  </select>
                </div>
              </div>

              {/* Department & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Department / Academic Unit <span className="text-purple-400">*</span>
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#070a1a] border border-indigo-950 text-xs text-slate-200 focus:border-purple-500 outline-none"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Location / Building <span className="text-purple-400">*</span>
                  </label>
                  <select
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#070a1a] border border-indigo-950 text-xs text-slate-200 focus:border-purple-500 outline-none"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.building} &bull; {loc.room}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Specific Location Details */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Exact Spot / Classroom / Desk Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 3rd Row from left, Workstation 12, Ceiling unit near door"
                  value={locationDetails}
                  onChange={(e) => setLocationDetails(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070a1a] border border-indigo-950 text-xs text-white placeholder-slate-500 focus:border-purple-500 outline-none"
                />
              </div>

              {/* Link Asset if available */}
              {matchingAssets.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-purple-300 mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Link to Registered Campus Asset (Optional)
                  </label>
                  <select
                    value={assetId}
                    onChange={(e) => setAssetId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-purple-950/20 border border-purple-800/40 text-xs text-purple-200 focus:border-purple-400 outline-none"
                  >
                    <option value="">-- No specific asset tag / General room fixture --</option>
                    {matchingAssets.map((ast) => (
                      <option key={ast.id} value={ast.id}>
                        [{ast.assetTag}] {ast.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Observed Problem & Symptoms <span className="text-purple-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe what happens, when it occurs, and any error codes or sounds..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070a1a] border border-indigo-950 text-xs text-white placeholder-slate-500 focus:border-purple-500 outline-none resize-none leading-relaxed"
                />
              </div>

            </div>
          )}

          {/* TAB 2: DIAGNOSTICS & HYPOTHESES */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-xs text-indigo-300/90 leading-relaxed flex items-start gap-2.5">
                <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  These fields help maintenance personnel investigate faster. You do <strong>not</strong> need to be an engineer — sharing your educated guess or suggested fix is completely optional!
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  Hypothesized / Possible Cause (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Filter might be dusty; loose HDMI connector cable; breaker tripped after rainfall"
                  value={possibleCause}
                  onChange={(e) => setPossibleCause(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070a1a] border border-indigo-950 text-xs text-white placeholder-slate-500 focus:border-purple-500 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-purple-400" />
                  Suggested Solution / Action Idea (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Needs a technician with a vacuum blower, or replacement of the 3-pin power cord"
                  value={suggestedSolution}
                  onChange={(e) => setSuggestedSolution(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070a1a] border border-indigo-950 text-xs text-white placeholder-slate-500 focus:border-purple-500 outline-none resize-none"
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070a1a] border border-indigo-950 text-xs text-white placeholder-slate-500 focus:border-purple-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 3: EVIDENCE & ATTACHMENTS */}
          {activeTab === 'evidence' && (
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Attach Photo / Visual Proof
              </label>
              
              {/* Clean Upload Dropzone */}
              <div className="p-8 rounded-2xl border-2 border-dashed border-indigo-500/30 bg-indigo-950/20 text-center hover:border-purple-500/60 transition-colors">
                <Upload className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
                <p className="text-xs font-semibold text-slate-200">Upload photo from your computer or phone camera</p>
                <p className="text-[11px] text-slate-400 mt-1 mb-4">Supports PNG, JPG, JPEG, WebP up to 10MB</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => setSelectedImage(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 cursor-pointer"
                />
              </div>

              {selectedImage && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-200">
                  <span>Photo attached successfully</span>
                  <button
                    type="button"
                    onClick={() => setSelectedImage('')}
                    className="text-slate-400 hover:text-red-400 text-xs underline"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-indigo-950/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {activeTab !== 'details' && (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'evidence' ? 'diagnostics' : 'details')}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 border border-slate-800 transition-colors"
                >
                  Previous
                </button>
              )}
              {activeTab !== 'evidence' && (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'details' ? 'diagnostics' : 'evidence')}
                  className="px-3.5 py-2 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 text-xs text-indigo-300 border border-indigo-800/40 transition-colors flex items-center gap-1.5"
                >
                  Next Step <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 shadow-[0_0_20px_rgba(124,58,237,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Submit Issue Ticket
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
