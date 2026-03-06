import React from 'react';
import { Activity, Clock3, Radio, TimerReset } from 'lucide-react';

import { BackendAnalysisEstimate } from '../types';

interface AnalysisStatusPanelProps {
  title: string;
  summary: string;
  detail: string;
  requestState: string;
  elapsedMs: number;
  estimate?: BackendAnalysisEstimate | null;
}

function formatSecondsLabel(seconds: number): string {
  const totalSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remaining = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${remaining}s`;
  }
  return `${remaining}s`;
}

function formatElapsedLabel(elapsedMs: number): string {
  return formatSecondsLabel(elapsedMs / 1000);
}

function formatEstimateRange(estimate: BackendAnalysisEstimate): string {
  return `${formatSecondsLabel(estimate.totalLowMs / 1000)}-${formatSecondsLabel(estimate.totalHighMs / 1000)}`;
}

export function AnalysisStatusPanel({
  title,
  summary,
  detail,
  requestState,
  elapsedMs,
  estimate,
}: AnalysisStatusPanelProps) {
  return (
    <div className="h-full rounded-sm border border-border bg-bg-panel p-6 flex flex-col justify-between gap-6">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-mono text-text-secondary uppercase tracking-[0.24em]">Analysis Status</p>
            <h3 className="mt-2 text-lg font-bold uppercase tracking-wide text-text-primary">{title}</h3>
            <p className="mt-2 text-sm text-text-primary/90">{summary}</p>
            <p className="mt-2 text-xs font-mono text-text-secondary uppercase tracking-wider">{detail}</p>
          </div>
          <div className="flex items-center gap-2 rounded-sm border border-accent/30 bg-accent/10 px-3 py-2 text-accent">
            <Activity className="w-4 h-4" />
            <span className="text-[10px] font-mono uppercase tracking-[0.24em]">Active</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-sm border border-border bg-bg-card p-3">
            <div className="flex items-center gap-2 text-text-secondary">
              <Radio className="w-4 h-4 text-accent" />
              <span className="text-[10px] font-mono uppercase tracking-wider">Request State</span>
            </div>
            <p className="mt-3 text-sm font-bold uppercase tracking-wide text-text-primary">{requestState}</p>
          </div>

          <div className="rounded-sm border border-border bg-bg-card p-3">
            <div className="flex items-center gap-2 text-text-secondary">
              <Clock3 className="w-4 h-4 text-accent" />
              <span className="text-[10px] font-mono uppercase tracking-wider">Elapsed</span>
            </div>
            <p className="mt-3 text-sm font-bold uppercase tracking-wide text-text-primary">{formatElapsedLabel(elapsedMs)}</p>
          </div>

          <div className="rounded-sm border border-border bg-bg-card p-3">
            <div className="flex items-center gap-2 text-text-secondary">
              <TimerReset className="w-4 h-4 text-accent" />
              <span className="text-[10px] font-mono uppercase tracking-wider">Estimated local analysis</span>
            </div>
            <p className="mt-3 text-sm font-bold uppercase tracking-wide text-text-primary">
              {estimate ? formatEstimateRange(estimate) : 'Unavailable'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {estimate?.stages?.length ? (
          estimate.stages.map((stage) => (
            <div key={stage.key} className="rounded-sm border border-border bg-bg-card p-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-secondary">{stage.label}</span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-primary">
                  {formatSecondsLabel(stage.lowMs / 1000)}-{formatSecondsLabel(stage.highMs / 1000)}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-sm border border-dashed border-border p-3 text-[10px] font-mono uppercase tracking-wider text-text-secondary">
            Backend estimate unavailable for this request.
          </div>
        )}
      </div>
    </div>
  );
}
