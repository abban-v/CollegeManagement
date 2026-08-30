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
  QrCode,
  Calendar,
  AlertOctagon,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Cpu,
  Tv,
  AirVent,
  Zap,
  Droplets,
  Loader2
} from 'lucide-react';
import Link from 'next/link';

export default function AssetsPage() {
  const router = useRouter();
  const { assets, departments, locations, issues, getDepartmentById, getLocationById, getCategoryById, currentUser, isLoadingAuth } = useApp();
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

  useEffect(() => {
    if (!isLoadingAuth && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, isLoadingAuth, router]);

  if (isLoadingAuth || !currentUser) {
    return (
      <div className="min-h-screen bg-[#060813] flex items-center justify-center text-purple-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const filteredAssets = assets.filter((asset) => {
    if (selectedDept !== 'ALL' && asset.departmentId !== selectedDept) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        asset.name.toLowerCase().includes(q) ||
        asset.assetTag.toLowerCase().includes(q) ||
        asset.modelNumber?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getAssetCategoryIcon = (tag: string) => {
    if (tag.startsWith('PRJ')) return <Tv className="w-5 h-5 text-purple-400" />;
    if (tag.startsWith('AC')) return <AirVent className="w-5 h-5 text-cyan-400" />;
    if (tag.startsWith('LAB')) return <Cpu className="w-5 h-5 text-emerald-400" />;
    if (tag.startsWith('UPS')) return <Zap className="w-5 h-5 text-amber-400" />;
    return <Droplets className="w-5 h-5 text-blue-400" />;
  };

  const getStatusBadge = (status: Asset['status']) => {
    switch (status) {
      case 'OPERATIONAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Operational
          </span>
        );
      case 'DEGRADED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/70 text-amber-300 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Degraded
          </span>
        );
      case 'UNDER_MAINTENANCE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-500/30">
            <Clock className="w-3.5 h-3.5 text-indigo-400" /> In Maintenance
          </span>
        );
      case 'OUT_OF_SERVICE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-300 border border-rose-500/30">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" /> Out of Service
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#060813] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-2">
              <Box className="w-3.5 h-3.5" />
              Digital Asset Registry
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Maintainable Campus Assets
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Live digital profiles, health metrics, and maintenance histories for campus infrastructure.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl glass-panel text-center">
              <span className="text-[11px] text-slate-400">Total Registered</span>
              <p className="text-xl font-extrabold text-white">{assets.length} Assets</p>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
            <input
              type="text"
              placeholder="Search by asset tag (e.g. PRJ-TUR-304), model, or equipment name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#090d20] border border-indigo-950 text-xs text-white placeholder-slate-500 focus:border-purple-500 outline-none"
            />
          </div>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-[#090d20] border border-indigo-950 text-xs text-slate-300 focus:border-purple-500 outline-none"
          >
            <option value="ALL">All Academic Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} - {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Assets Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAssets.map((asset) => {
            const dept = getDepartmentById(asset.departmentId);
            const loc = getLocationById(asset.locationId);
            const relatedIssues = issues.filter((i) => i.assetId === asset.id);

            return (
              <div
                key={asset.id}
                className="rounded-2xl glass-panel glass-panel-hover p-5 flex flex-col justify-between overflow-hidden relative"
              >
                <div>
                  {/* Top bar: Asset Tag & Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-mono font-bold text-purple-300 bg-purple-950/60 px-2.5 py-1 rounded-lg border border-purple-800/40">
                      {asset.assetTag}
                    </span>
                    {getStatusBadge(asset.status)}
                  </div>

                  {/* Asset Image preview if available */}
                  {asset.imageUrl && (
                    <div className="mb-3 rounded-xl overflow-hidden aspect-video border border-indigo-950 relative">
                      <img src={asset.imageUrl} alt={asset.name} className="w-full h-full object-cover" />
                      <div className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/60 backdrop-blur-sm">
                        {getAssetCategoryIcon(asset.assetTag)}
                      </div>
                    </div>
                  )}

                  {/* Name & Model */}
                  <h3 className="text-base font-bold text-white mb-1 leading-snug">
                    {asset.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mb-4">
                    Model: {asset.modelNumber || 'N/A'} &bull; SN: {asset.serialNumber || 'N/A'}
                  </p>

                  {/* Location Info */}
                  <div className="p-3 rounded-xl bg-[#070a1a]/70 border border-indigo-950/70 space-y-1.5 text-xs text-slate-300 mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">{loc?.building} &bull; {loc?.room}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Building2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="truncate">{dept?.name}</span>
                    </div>
                  </div>
                </div>

                {/* Footer / Health Summary */}
                <div className="pt-3 border-t border-indigo-950/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Last Serviced: {asset.lastServicedAt}</span>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    asset.reportedIssuesCount > 0
                      ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-950/60 text-emerald-300'
                  }`}>
                    {asset.reportedIssuesCount} issue{asset.reportedIssuesCount !== 1 ? 's' : ''} logged
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      </main>
    </div>
  );
}
