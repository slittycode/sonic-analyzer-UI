import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { DiagnosticLog } from '../../src/components/DiagnosticLog';
import { DiagnosticLogEntry } from '../../src/types';

const baseLog: DiagnosticLogEntry = {
  model: 'local-dsp-engine',
  phase: 'Phase 1: Local DSP analysis',
  promptLength: 0,
  responseLength: 0,
  durationMs: 42000,
  audioMetadata: {
    name: 'track.mp3',
    size: 1024,
    type: 'audio/mpeg',
  },
  timestamp: '2026-03-06T02:00:00.000Z',
  source: 'backend',
  status: 'error',
  message: 'Local DSP analysis timed out before completion.',
  errorCode: 'ANALYZER_TIMEOUT',
};

describe('DiagnosticLog rendering', () => {
  it('renders error status, message, and error code', () => {
    const html = renderToStaticMarkup(React.createElement(DiagnosticLog, { logs: [baseLog] }));

    expect(html).toContain('ERROR');
    expect(html).toContain('ANALYZER_TIMEOUT');
    expect(html).toContain('Local DSP analysis timed out before completion.');
  });

  it('renders skipped entries without the running cursor', () => {
    const html = renderToStaticMarkup(
      React.createElement(DiagnosticLog, {
        logs: [
          {
            ...baseLog,
            phase: 'Phase 2: Advisory skipped',
            model: 'disabled',
            source: 'system',
            status: 'skipped',
            message: 'Phase 2 advisory is disabled.',
            errorCode: undefined,
          },
        ],
      }),
    );

    expect(html).toContain('SKIPPED');
    expect(html).toContain('Phase 2 advisory is disabled.');
    expect(html).not.toContain('animate-pulse');
  });
});
