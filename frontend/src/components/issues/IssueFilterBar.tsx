'use client';

import React from 'react';
import { useApp } from '@/lib/store';
import { IssueStatus, IssuePriority } from '@/lib/types';
import { Search, Filter, ArrowUpDown, Layers, Flame } from 'lucide-react';

interface FilterState {
  search: string;
  status: string;
  departmentId: string;
  categoryId: string;
  sortBy: 'most_affected' | 'newest' | 'priority';
}

interface IssueFilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

export const IssueFilterBar: React.FC<IssueFilterBarProps> = ({ filters, onFilterChange }) => {
  const { departments, categories } = useApp();

  const statuses: { label: string; value: string }[] = [
    { label: 'All Issues', value: 'ALL' },
    { label: 'Reported', value: 'REPORTED' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Resolved', value: 'RESOLVED' },
    { label: 'Reopened', value: 'REOPENED' },
  ];

  return (
    <div className="space-y-4 mb-6">
      {/* Top Search & Dropdown Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400/70" />
          <input
            type="text"
            placeholder="Search problems, equipment (e.g. Projector, AC, Lab 202, Pump)..."
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#090d20]/80 border border-indigo-950/80 focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 text-sm text-white placeholder-slate-500 transition-all outline-none"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 md:pb-0">
          {/* Department Filter */}
          <select
            value={filters.departmentId}
            onChange={(e) => onFilterChange({ ...filters, departmentId: e.target.value })}
            className="px-3 py-2.5 rounded-xl bg-[#090d20]/80 border border-indigo-950/80 text-xs text-slate-300 focus:border-purple-500/60 outline-none cursor-pointer"
          >
            <option value="ALL">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.code} - {dept.name}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={filters.categoryId}
            onChange={(e) => onFilterChange({ ...filters, categoryId: e.target.value })}
            className="px-3 py-2.5 rounded-xl bg-[#090d20]/80 border border-indigo-950/80 text-xs text-slate-300 focus:border-purple-500/60 outline-none cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={filters.sortBy}
            onChange={(e) =>
              onFilterChange({ ...filters, sortBy: e.target.value as FilterState['sortBy'] })
            }
            className="px-3 py-2.5 rounded-xl bg-[#090d20]/80 border border-indigo-950/80 text-xs text-slate-300 focus:border-purple-500/60 outline-none cursor-pointer"
          >
            <option value="most_affected">🔥 Most Affected / Upvoted</option>
            <option value="newest">⚡ Newest First</option>
            <option value="priority">🚨 Highest Priority</option>
          </select>
        </div>
      </div>

      {/* Quick Status Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {statuses.map((s) => {
          const isSelected = filters.status === s.value;
          return (
            <button
              key={s.value}
              onClick={() => onFilterChange({ ...filters, status: s.value })}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.35)]'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-indigo-950/50'
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
