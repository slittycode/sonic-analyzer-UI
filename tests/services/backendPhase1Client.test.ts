import {
  parseBackendAnalyzeResponse,
  BackendClientError,
  mapBackendError,
} from '../../src/services/backendPhase1Client';

const validPayload = {
  requestId: 'req_123',
  phase1: {
    bpm: 128,
    bpmConfidence: 0.98,
    key: 'A minor',
    keyConfidence: 0.91,
    timeSignature: '4/4',
    durationSeconds: 184.2,
    lufsIntegrated: -8.4,
    truePeak: -0.5,
    stereoWidth: 0.75,
    stereoCorrelation: 0.82,
    spectralBalance: {
      subBass: -1.2,
      lowBass: 0.8,
      mids: -0.4,
      upperMids: 0.2,
      highs: 1.1,
      brilliance: 0.5,
    },
  },
  diagnostics: {
    backendDurationMs: 1420,
    engineVersion: '0.4.0',
  },
};

describe('parseBackendAnalyzeResponse', () => {
  it('accepts a valid backend payload', () => {
    const parsed = parseBackendAnalyzeResponse(validPayload);

    expect(parsed.requestId).toBe('req_123');
    expect(parsed.phase1.bpm).toBe(128);
    expect(parsed.diagnostics?.engineVersion).toBe('0.4.0');
  });

  it('throws when phase1 is missing', () => {
    expect(() =>
      parseBackendAnalyzeResponse({
        requestId: 'req_123',
      }),
    ).toThrow(/phase1/i);
  });

  it('throws when spectralBalance contains non-numeric values', () => {
    expect(() =>
      parseBackendAnalyzeResponse({
        ...validPayload,
        phase1: {
          ...validPayload.phase1,
          spectralBalance: {
            ...validPayload.phase1.spectralBalance,
            mids: 'invalid',
          },
        },
      }),
    ).toThrow(/spectralBalance/i);
  });
});

describe('mapBackendError', () => {
  it('maps network failures to a user-friendly message', () => {
    const mapped = mapBackendError(new TypeError('Failed to fetch'));

    expect(mapped).toBeInstanceOf(BackendClientError);
    expect(mapped.code).toBe('NETWORK_UNREACHABLE');
    expect(mapped.message).toMatch(/Cannot reach DSP backend/i);
  });

  it('preserves explicit backend client errors', () => {
    const original = new BackendClientError('BACKEND_HTTP_ERROR', 'Backend failed', {
      status: 502,
    });

    const mapped = mapBackendError(original);

    expect(mapped).toBe(original);
    expect(mapped.details?.status).toBe(502);
  });
});
