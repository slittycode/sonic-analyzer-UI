import React from 'react';

import { DiagnosticLogEntry, DiagnosticLogStatus } from '../types';

interface DiagnosticLogProps {
  logs: DiagnosticLogEntry[];
}

function statusLabel(status: DiagnosticLogStatus | undefined): string {
  return (status ?? 'success').toUpperCase();
}

function statusClass(status: DiagnosticLogStatus | undefined): string {
  switch (status) {
    case 'running':
      return 'text-accent border-accent/30 bg-accent/10';
    case 'error':
      return 'text-red-400 border-red-500/30 bg-red-500/10';
    case 'skipped':
      return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
    default:
      return 'text-green-400 border-green-500/30 bg-green-500/10';
  }
}

function formatEstimateRange(lowMs?: number, highMs?: number): string | null {
  if (typeof lowMs !== 'number' || typeof highMs !== 'number') return null;
  return `${Math.round(lowMs / 1000)}s-${Math.round(highMs / 1000)}s`;
}

export function DiagnosticLog({ logs }: DiagnosticLogProps) {
  if (logs.length === 0) return null;

  const showRunningCursor = logs.some((log) => (log.status ?? 'success') === 'running');

  return (
    <div className="mt-12 space-y-4">
      <h2 className="text-sm font-mono uppercase tracking-wider text-text-secondary flex items-center">
        <span className="w-2 h-2 bg-accent rounded-full mr-2"></span>
        System Diagnostics
      </h2>
      <div className="bg-[#1a1a1a] border border-border rounded-sm p-4 font-mono text-xs overflow-x-auto relative shadow-inner">
        <div className="space-y-4 relative z-10">
          {logs.map((log, idx) => {
            const estimateRange = formatEstimateRange(log.estimateLowMs, log.estimateHighMs);
            return (
              <div
                key={idx}
                className="space-y-2 border-l-2 border-border pl-3 ml-1 hover:border-accent/50 transition-colors group"
              >
                <div className="flex flex-wrap items-center gap-3 text-accent/80 group-hover:text-accent">
                  <span className="opacity-50">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  <span className="font-bold tracking-wide uppercase">&gt;&gt; {log.phase}</span>
                  <span className={`px-2 py-1 rounded-sm border text-[10px] ${statusClass(log.status)}`}>
                    {statusLabel(log.status)}
                  </span>
                </div>
                {log.message && (
                  <p className="pl-2 text-text-primary/90 leading-relaxed">
                    {log.message}
                  </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-1 text-text-secondary/70 pl-2">
                  <div className="flex justify-between gap-4">
                    <span className="opacity-50">MODEL:</span>
                    <span className="text-text-primary">{log.model}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="opacity-50">EXEC_TIME:</span>
                    <span className="text-text-primary">{log.durationMs}ms</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="opacity-50">TOKENS_IN:</span>
                    <span className="text-text-primary">{log.promptLength}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="opacity-50">TOKENS_OUT:</span>
                    <span className="text-text-primary">{log.responseLength}</span>
                  </div>
                  {log.requestId && (
                    <div className="flex justify-between gap-4 col-span-1 md:col-span-2">
                      <span className="opacity-50">REQUEST_ID:</span>
                      <span className="text-text-primary truncate">{log.requestId}</span>
                    </div>
                  )}
                  {log.errorCode && (
                    <div className="flex justify-between gap-4">
                      <span className="opacity-50">ERROR_CODE:</span>
                      <span className="text-text-primary">{log.errorCode}</span>
                    </div>
                  )}
                  {estimateRange && (
                    <div className="flex justify-between gap-4">
                      <span className="opacity-50">ESTIMATE:</span>
                      <span className="text-text-primary">{estimateRange}</span>
                    </div>
                  )}
                  {idx === 0 && (
                    <>
                      <div className="flex justify-between gap-4 col-span-1 md:col-span-2">
                        <span className="opacity-50">FILE:</span>
                        <span className="text-text-primary truncate">{log.audioMetadata.name}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="opacity-50">SIZE:</span>
                        <span className="text-text-primary">{(log.audioMetadata.size / 1024).toFixed(1)} KB</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="opacity-50">TYPE:</span>
                        <span className="text-text-primary">{log.audioMetadata.type}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {showRunningCursor && <div className="animate-pulse text-accent/50 pl-1">_</div>}
        </div>
      </div>
    </div>
  );
}
