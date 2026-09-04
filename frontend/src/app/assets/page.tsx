'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
import { Navbar } from '@/components/layout/Navbar';
import { Asset } from '@/lib/types';
import {
  Box,
  Search,
  Building2,
  MapPin,
  AlertOctagon,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  X,
  Cpu,
  Tv,
  AirVent,
  Zap,
  Trash2,
  Loader2
} from 'lucide-react';
import { triggerQuantumBurst } from '@/lib/quantumBurst';
import { CampusRadarLoader } from '@/components/ui/CustomLoader';
import { AmbientBackground } from '@/components/layout/AmbientBackground';

export default function AssetsPage() {
  const router = useRouter();
  const { assets, departments, getDepartmentById, currentUser, isLoadingAuth, isLoadingAssets, addAsset, deleteAsset } = useApp();
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);

  // New Asset Form State
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetTag, setNewAssetTag] = useState('');
  const [newAssetDept, setNewAssetDept] = useState(departments[0]?.id || 'dept-cse');
  const [newAssetLocation, setNewAssetLocation] = useState('');
  const [newAssetModel, setNewAssetModel] = useState('');

  useEffect(() => {
    if (!isLoadingAuth && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, isLoadingAuth, router]);

  if (isLoadingAuth || !currentUser) {
    return (
      <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center text-emerald-400">
        <CampusRadarLoader
          size="lg"
          message="Loading campus asset registry..."
          subMessage="Fetching hardware tags & maintenance logs"
        />
      </div>
    );
  }

  const isOfficialOrAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'OFFICIAL';

  const filteredAssets = assets.filter((asset) => {
    if (selectedDept !== 'ALL' && asset.departmentId !== selectedDept) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        asset.name.toLowerCase().includes(q) ||
        asset.assetTag.toLowerCase().includes(q) ||
        asset.modelNumber?.toLowerCase().includes(q) ||
        (asset.locationId || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getAssetCategoryIcon = (tag: string) => {
    if (tag.startsWith('PRJ') || tag.startsWith('AV')) return <Tv className="w-4 h-4 text-emerald-400" />;
    if (tag.startsWith('AC') || tag.startsWith('HVAC')) return <AirVent className="w-4 h-4 text-teal-400" />;
    if (tag.startsWith('LAB') || tag.startsWith('PC')) return <Cpu className="w-4 h-4 text-emerald-400" />;
    if (tag.startsWith('UPS') || tag.startsWith('PWR')) return <Zap className="w-4 h-4 text-amber-400" />;
    return <Box className="w-4 h-4 text-slate-400" />;
  };

  const getStatusBadge = (status: Asset['status']) => {
    switch (status) {
      case 'OPERATIONAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Operational
          </span>
        );
      case 'DEGRADED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950/70 text-amber-300 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3 text-amber-400" /> Degraded
          </span>
        );
      case 'UNDER_MAINTENANCE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-950/80 text-blue-300 border border-blue-500/30">
            <Clock className="w-3 h-3 text-blue-400" /> In Maintenance
          </span>
        );
      case 'OUT_OF_SERVICE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-950/80 text-rose-300 border border-rose-500/30">
            <AlertOctagon className="w-3 h-3 text-rose-400" /> Out of Service
          </span>
        );
      default:
        return null;
    }
  };

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetName.trim() || !newAssetTag.trim()) {
      alert('Please provide an asset name and tag.');
      return;
    }

    const createdAsset: Asset = {
      id: `ast-${Date.now()}`,
      name: newAssetName.trim(),
      assetTag: newAssetTag.trim().toUpperCase(),
      category: 'cat-general',
      departmentId: newAssetDept,
      locationId: newAssetLocation.trim() || 'Main Campus',
      status: 'OPERATIONAL',
      modelNumber: newAssetModel.trim() || undefined,
      installedAt: new Date().toISOString().split('T')[0],
      lastServicedAt: new Date().toISOString().split('T')[0],
      reportedIssuesCount: 0,
    };

    addAsset(createdAsset);
    triggerQuantumBurst({ variant: 'emerald', intensity: 'celebration' });
    setIsAddAssetOpen(false);
    setNewAssetName('');
    setNewAssetTag('');
    setNewAssetLocation('');
    setNewAssetModel('');
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col relative overflow-hidden">
      {/* Dynamic Ambient Background with Telemetry Grid, Scanner, Dust Particles & Emerald Orbs */}
      <AmbientBackground variant="emerald" />

      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-2">
              <Box className="w-3.5 h-3.5 text-emerald-400" />
              <span>CET Campus Equipment Registry</span>
              <span className="w-1 h-1 rounded-full bg-emerald-400/60" />
              <span className="text-emerald-200 font-mono">
                {isLoadingAssets ? 'Syncing...' : `${assets.length} Total Assets`}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Campus Assets & Equipment
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Maintainable lab equipment, projectors, and facilities across CET departments.
            </p>
          </div>

          {isOfficialOrAdmin && (
            <div className="flex items-center">
              <button
                onClick={() => setIsAddAssetOpen(true)}
                className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                Register Asset
              </button>
            </div>
          )}
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
            <input
              type="text"
              placeholder="Search by asset tag, model, or equipment name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-xl bg-[#111827] border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#111827] border border-slate-800 text-xs text-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer"
          >
            <option value="ALL">All Academic Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} - {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Loading State */}
        {isLoadingAssets ? (
          <div className="rounded-3xl bg-[#111827]/80 backdrop-blur-md p-8 sm:p-14 border border-slate-800 flex flex-col items-center justify-center min-h-[380px] text-center shadow-xl">
            <CampusRadarLoader
              size="lg"
              message="Loading campus asset registry..."
              subMessage="Fetching hardware tags & maintenance logs from CET database"
            />
            {/* 3-card skeleton outline preview underneath matching emerald asset cards */}
            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5 mt-10 opacity-35 pointer-events-none">
              {[1, 2, 3].map((n) => (
                <div key={n} className="rounded-2xl bg-[#0e1726]/60 border border-slate-800 p-5 space-y-3.5 animate-pulse">
                  <div className="flex justify-between items-center">
                    <div className="h-5 w-20 bg-emerald-950/60 border border-emerald-800/40 rounded-lg" />
                    <div className="h-5 w-24 bg-slate-800 rounded-full" />
                  </div>
                  <div className="h-5 w-4/5 bg-slate-700/60 rounded-md" />
                  <div className="h-3 w-1/3 bg-slate-800 rounded-md" />
                  <div className="p-3 rounded-xl bg-[#0B0F17]/80 border border-slate-800/60 space-y-2">
                    <div className="h-3.5 w-3/4 bg-slate-800/80 rounded" />
                    <div className="h-3.5 w-1/2 bg-slate-800/80 rounded" />
                  </div>
                  <div className="pt-2 flex justify-between items-center border-t border-slate-800/60">
                    <div className="h-3 w-24 bg-slate-800/60 rounded" />
                    <div className="h-4 w-16 bg-slate-800/60 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="rounded-3xl bg-[#111827]/80 p-12 text-center border border-slate-800 max-w-lg mx-auto my-12 shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 flex items-center justify-center mx-auto mb-4">
              <Box className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">No Registered Campus Assets</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed mb-6">
              Campus equipment (projectors, lab instruments, AC units) will appear here once registered by facilities staff.
            </p>
            {isOfficialOrAdmin && (
              <button
                onClick={() => setIsAddAssetOpen(true)}
                className="px-4 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                + Register First Asset
              </button>
            )}
          </div>
        ) : null}

        {/* Assets Cards Grid */}
        {filteredAssets.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAssets.map((asset) => {
              const dept = getDepartmentById(asset.departmentId);
              return (
                <div
                  key={asset.id}
                  className="rounded-2xl bg-[#111827]/80 backdrop-blur-md p-5 flex flex-col justify-between overflow-hidden relative border border-slate-800 hover:border-emerald-500/40 transition-all group shadow-md hover:shadow-emerald-950/20"
                >
                  <div>
                    {/* Top bar: Asset Tag & Status */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-700/60">
                          {getAssetCategoryIcon(asset.assetTag)}
                        </span>
                        <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-700/50">
                          {asset.assetTag}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(asset.status)}
                        {currentUser.role === 'ADMIN' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Are you sure you want to remove asset [${asset.assetTag}] ${asset.name}?`)) {
                                deleteAsset(asset.id);
                              }
                            }}
                            title="Delete Asset"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-500/30 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Name & Model */}
                    <h3 className="text-sm font-bold text-white mb-1 leading-snug">
                      {asset.name}
                    </h3>
                    {asset.modelNumber && (
                      <p className="text-xs text-slate-400 font-mono mb-3">
                        Model: {asset.modelNumber}
                      </p>
                    )}

                    {/* Location Info */}
                    <div className="p-3 rounded-xl bg-[#0B0F17]/80 border border-slate-800/80 space-y-1.5 text-xs text-slate-300 mb-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{asset.locationId || 'Main Campus'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Building2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                        <span className="truncate">{dept?.name || 'Facilities'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span>Installed: {asset.installedAt || 'N/A'}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      asset.reportedIssuesCount > 0
                        ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-900 text-slate-400'
                    }`}>
                      {asset.reportedIssuesCount} logged
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* Add Asset Modal */}
      {isAddAssetOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-[#111827] border border-slate-700/80 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Box className="w-4 h-4 text-emerald-400" />
                Register Campus Asset
              </div>
              <button
                onClick={() => setIsAddAssetOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddAsset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Equipment / Asset Name <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Epson EB-2250U Projector"
                  value={newAssetName}
                  onChange={(e) => setNewAssetName(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#0B0F17] border border-slate-800 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Asset Tag / Serial ID <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PRJ-CS-201"
                  value={newAssetTag}
                  onChange={(e) => setNewAssetTag(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#0B0F17] border border-slate-800 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none uppercase font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Department <span className="text-emerald-400">*</span>
                  </label>
                  <select
                    value={newAssetDept}
                    onChange={(e) => setNewAssetDept(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[44px] rounded-xl bg-[#0B0F17] border border-slate-800 text-sm text-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Room / Lab
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CS 201"
                    value={newAssetLocation}
                    onChange={(e) => setNewAssetLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#0B0F17] border border-slate-800 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Model Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. EB-2250U"
                  value={newAssetModel}
                  onChange={(e) => setNewAssetModel(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#0B0F17] border border-slate-800 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddAssetOpen(false)}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  Save Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
