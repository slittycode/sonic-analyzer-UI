import { GoogleGenAI, Type, Type as SchemaType } from "@google/genai";
import { appConfig, isGeminiPhase2Available } from "../config";
import { DiagnosticLogEntry, Phase1Result, Phase2Result } from "../types";

interface AnalyzePhase2Args {
  file: File;
  modelName: string;
  phase1Result: Phase1Result;
  audioMetadata: DiagnosticLogEntry["audioMetadata"];
}

interface AnalyzePhase2Result {
  result: Phase2Result;
  log: DiagnosticLogEntry;
}

async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 2_000,
): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (error: unknown) {
      attempt += 1;
      const errorMessage = formatError(error);
      const isRetryable =
        errorMessage.includes("503") ||
        errorMessage.includes("high demand") ||
        errorMessage.includes("429") ||
        errorMessage.includes("quota") ||
        errorMessage.includes("UNAVAILABLE");

      if (!isRetryable || attempt >= maxRetries) {
        throw error;
      }

      const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 1_000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries reached for Gemini phase-2 analysis.");
}

export function canRunGeminiPhase2(): boolean {
  return isGeminiPhase2Available();
}

export async function analyzePhase2WithGemini({
  file,
  modelName,
  phase1Result,
  audioMetadata,
}: AnalyzePhase2Args): Promise<AnalyzePhase2Result> {
  if (!canRunGeminiPhase2()) {
    throw new Error("Gemini phase-2 is disabled or missing VITE_GEMINI_API_KEY.");
  }

  const ai = new GoogleGenAI({
    apiKey: appConfig.geminiApiKey,
    httpOptions: {
      timeout: 5 * 60 * 1_000,
    },
  });

  const base64Audio = await fileToBase64(file);
  const mimeType = file.type || "audio/mp3";
  const phase2Prompt = `You are an expert Ableton Live 12 producer and sound designer 
specialising in electronic music reconstruction. You receive:
1. A structured JSON object of deterministic DSP measurements
2. The audio file itself

ABSOLUTE RULES:
1. Every numeric value in the JSON is ground truth from a 
   deterministic DSP engine. Do not re-estimate or override 
   any numeric field using audio inference.
2. You are PROHIBITED from overriding: bpm, key, lufsIntegrated, 
   lufsRange, truePeak, stereoDetail values, durationSeconds.
3. Use the exact key string provided. Do not reinterpret as 
   relative major/minor. Do not override from audio perception.
4. If audio perception contradicts JSON, JSON is correct.
5. bpmAgreement: true = two algorithms agree. High confidence.
6. Low confidence handling:
   - pitchConfidence below 0.15 = melody is draft only
   - chordStrength below 0.70 = chords approximate
   - pumpingConfidence below 0.40 = do not assert sidechain
   - segmentKey from segments shorter than 10s = low confidence
7. You are a producer reading a spec sheet, not an audio analyser.

FIELD GLOSSARY:
- bpm: use exactly as Ableton project tempo
- grooveAmount near 0.0 = fully quantised, straight grid
- kickSwing > hihatSwing = kick has more timing push than hats
- kickAccent[16] = kick energy per 16th position, high variance = 
  dynamic pattern, low variance = four-on-the-floor
- lufsIntegrated: club electronic target is -6 to -9 LUFS
- truePeak above 0.0 dBTP = intersample clipping present
- crestFactor: higher = more transient punch, lower = more limited
- stereoWidth near 0.0 = effectively mono
- subBassMono: true = sub below 80Hz is mono, standard club mastering
- spectralCentroid: higher = brighter tonality
- segmentSpectral centroid rising across segments = filter opening
- oddToEvenRatio above 1.0 = saw/square character
- oddToEvenRatio below 1.0 = sine/triangle character  
- inharmonicity above 0.2 = FM or noise synthesis character
- logAttackTime more negative = faster attack transients
- attackTimeStdDev low = consistent mechanical transients
- structure.segments = arrangement blocks, plus or minus 5-10s
- segmentLoudness = per-section LUFS, reveals drops and builds
- dominantNotes = MIDI numbers, convert to note names
- pumpingStrength + pumpingConfidence both above 0.35 = sidechain
- arrangementDetail.noveltyPeaks = structural event timestamps
- segmentSpectral.stereoWidth changes = intentional width automation

IMPORTANT SPECTRAL NOTE:
- spectralBalance dB values describe spectral shape relative 
  to each other only, not absolute loudness or quality
- Do not use spectralBalance values to make qualitative 
  judgements about the track's perceived sound or production 
  quality
- High subBass dB does not mean "good bass" — it means 
  the spectral energy is concentrated there relative to 
  other bands
- Use spectralBalance only to inform EQ and filter 
  recommendations, not character descriptions

OUTPUT REQUIREMENTS — QUANTITY AND DEPTH ARE MANDATORY:

trackCharacter:
Write 4-5 sentences. Reference at least 4 specific numeric values 
from the JSON. Describe synthesis character, dynamic approach, 
stereo philosophy, and spectral signature. Be specific and 
production-focused, not generic.

detectedCharacteristics:
Return exactly 5 items. Each must reference a specific measured 
value. Confidence must be HIGH, MED, or LOW exactly.
Cover: loudness/dynamics, stereo field, spectral character, 
synthesis approach, rhythmic/groove characteristic.

arrangementOverview:
Return a structured object with three keys:
- summary: 2-3 sentence overview of the track's structural 
  philosophy referencing durationSeconds and overall 
  loudness approach
- segments: an array with one entry per segment in 
  structure.segments. For each segment include:
    index: segment number starting at 1
    startTime: start time in seconds from structure.segments
    endTime: end time in seconds from structure.segments
    lufs: LUFS value from segmentLoudness for this segment
    description: 3-4 sentences covering what is happening 
      musically and production-wise in this section, 
      referencing the segment's measured values
    spectralNote: one sentence on spectralCentroid or 
      stereoWidth change from segmentSpectral if available
- noveltyNotes: one paragraph mapping each noveltyPeak 
  timestamp to the structural event it represents

sonicElements:
Return ALL of the following keys with substantive content.
Each must be at minimum 4 sentences with specific values referenced:
- kick: reference crestFactor, kickAccent pattern, spectralBalance 
  subBass and lowBass, logAttackTime. Name specific Ableton devices 
  with parameter values.
- bass: reference synthesisCharacter oddToEvenRatio and 
  inharmonicity, subBassMono, spectralBalance subBass/lowBass. 
  Suggest oscillator type, filter settings, mono routing.
- melodicArp: convert dominantNotes MIDI to note names. Reference 
  pitchConfidence explicitly — if below 0.15 say so. Reference 
  chordDetail.dominantChords. Suggest synth approach and MIDI pattern.
- grooveAndTiming: reference grooveAmount, kickSwing, hihatSwing 
  with specific ms offset calculations at the track BPM. Suggest 
  Ableton groove pool settings.
- effectsAndTexture: reference effectsDetail, vibratoPresent, 
  arrangementDetail noveltyPeaks. Use audio perception here for 
  qualitative texture. Reference spectralContrast values.
- widthAndStereo: reference stereoWidth, stereoCorrelation, 
  subBassMono, segmentSpectral stereoWidth changes across segments. 
  Suggest Utility device settings and any width automation.
- harmonicContent: reference key, keyConfidence, segmentKey changes, 
  chordDetail.dominantChords, chordStrength. Suggest scale/mode 
  for writing new parts.

mixAndMasterChain:
Return an array of device objects in signal flow order.
Each object must include:
- order: position in chain starting at 1
- device: exact Ableton Live 12 device name
- parameter: specific parameter name as shown in Ableton
- value: specific numeric or descriptive target value 
  derived from JSON measurements
- reason: one sentence referencing the specific measured 
  value that justifies this device and setting
Minimum 5 devices. Cover: dynamics, EQ, stereo, 
saturation, limiting in that order.

secretSauce:
Title: a specific named technique, not generic.
icon: one word describing the core technique type. 
Must be exactly one of: DISTORTION, FILTER, COMPRESSION, 
MODULATION, ROUTING, SATURATION, STEREO, SYNTHESIS
Explanation: 4-5 sentences explaining what makes this technique 
specific to THIS track based on its measurements. Reference at 
least 3 specific JSON values.
implementationSteps: return exactly 6 steps. Each step must be 
a complete sentence with specific Ableton device names, parameter 
names, and numeric values. Steps must build on each other 
sequentially.

confidenceNotes:
Return at least 5 items. 
For the field name, use a human-readable label, NOT the JSON 
field name. For example:
- use "Key Signature" not "key"
- use "True Peak" not "truePeak"  
- use "Chord Progression" not "chordDetail.chordStrength"
- use "Melody Transcription" not "melodyDetail.pitchConfidence"
- use "Sidechain Detection" not "sidechainDetail.pumpingConfidence"
- use "Segment Key (short segment)" not "segmentKey[1]"
Every field that has a known accuracy limitation must appear here.

abletonRecommendations:
Return at least 10 device recommendation cards.
Cover the full signal chain: sound design devices, effects, 
group processing, and mastering.
For each card:
- device: exact Ableton Live 12 device name
- category: one of SYNTHESIS, DYNAMICS, EQ, EFFECTS, 
  STEREO, MASTERING, MIDI, ROUTING
- parameter: specific parameter name as it appears in Ableton
- value: specific numeric or descriptive target value derived 
  from JSON measurements
- reason: one sentence referencing the specific measured value 
  that justifies this recommendation
- advancedTip: one concrete advanced technique for this device 
  in this context

Do not pad with generic advice. Every recommendation must be 
justified by a specific measurement from the JSON.

Phase 1 Measurements:
${JSON.stringify(phase1Result, null, 2)}`;

  const phase2StartTime = Date.now();
  const phase2Response = await withRetry(() =>
    ai.models.generateContent({
      model: modelName,
      contents: [
        {
          parts: [
            {
              inlineData: {
                data: base64Audio,
                mimeType,
              },
            },
            { text: phase2Prompt },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            trackCharacter: { type: Type.STRING },
            detectedCharacteristics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  confidence: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                },
                required: ["name", "confidence", "explanation"],
              },
            },
            arrangementOverview: {
              type: SchemaType.OBJECT,
              properties: {
                summary: { type: SchemaType.STRING },
                segments: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    properties: {
                      index: { type: SchemaType.NUMBER },
                      startTime: { type: SchemaType.NUMBER },
                      endTime: { type: SchemaType.NUMBER },
                      lufs: { type: SchemaType.NUMBER },
                      description: { type: SchemaType.STRING },
                      spectralNote: { type: SchemaType.STRING },
                    },
                    required: ["index", "startTime", "endTime", "description"],
                  },
                },
                noveltyNotes: { type: SchemaType.STRING },
              },
              required: ["summary", "segments"],
            },
            sonicElements: {
              type: Type.OBJECT,
              properties: {
                kick: { type: Type.STRING },
                bass: { type: Type.STRING },
                melodicArp: { type: Type.STRING },
                grooveAndTiming: { type: Type.STRING },
                effectsAndTexture: { type: Type.STRING },
                widthAndStereo: { type: SchemaType.STRING },
                harmonicContent: { type: SchemaType.STRING },
              },
              required: ["kick", "bass", "melodicArp", "grooveAndTiming", "effectsAndTexture"],
            },
            mixAndMasterChain: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  order: { type: SchemaType.NUMBER },
                  device: { type: SchemaType.STRING },
                  parameter: { type: SchemaType.STRING },
                  value: { type: SchemaType.STRING },
                  reason: { type: SchemaType.STRING },
                },
                required: ["order", "device", "parameter", "value", "reason"],
              },
            },
            secretSauce: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                icon: { type: SchemaType.STRING },
                explanation: { type: Type.STRING },
                implementationSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["title", "explanation", "implementationSteps"],
            },
            confidenceNotes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  field: { type: Type.STRING },
                  value: { type: Type.STRING },
                  reason: { type: Type.STRING },
                },
                required: ["field", "value", "reason"],
              },
            },
            abletonRecommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  device: { type: Type.STRING },
                  category: { type: Type.STRING },
                  parameter: { type: Type.STRING },
                  value: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  advancedTip: { type: Type.STRING },
                },
                required: ["device", "category", "parameter", "value", "reason"],
              },
            },
          },
          required: [
            "trackCharacter",
            "detectedCharacteristics",
            "arrangementOverview",
            "sonicElements",
            "mixAndMasterChain",
            "secretSauce",
            "confidenceNotes",
            "abletonRecommendations",
          ],
        },
      },
    }),
  );
  const phase2EndTime = Date.now();

  const result = JSON.parse(phase2Response.text || "{}") as Phase2Result;
  const log: DiagnosticLogEntry = {
    model: modelName,
    phase: "Phase 2: Reconstruction & Mix Critique",
    promptLength: phase2Prompt.length,
    responseLength: phase2Response.text?.length || 0,
    durationMs: phase2EndTime - phase2StartTime,
    audioMetadata,
    timestamp: new Date().toISOString(),
    source: "gemini",
  };

  return {
    result,
    log,
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Failed to read file as base64."));
        return;
      }
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
