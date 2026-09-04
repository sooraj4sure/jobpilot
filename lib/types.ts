// Shared types across the three JobPilot features.
// Feature 1 (match) output is consumed directly by Features 2 and 3 —
// keep these shapes in sync with the JSON schemas in lib/prompts.ts.

export type GapType = "missing" | "underdeveloped" | "unclear";

export interface MatchedRequirement {
  requirement: string;
  resume_evidence: string;
}

export interface GapItem {
  requirement: string;
  gap_type: GapType;
  notes: string;
}

export interface MatchResult {
  match_score: number;
  matched_requirements: MatchedRequirement[];
  gaps: GapItem[];
  summary: string;
}

export interface TailoredBullet {
  original: string;
  tailored: string;
  changes_made: string;
  // Added client/server-side by the verification pass — not part of the
  // model's own output schema.
  verification?: {
    has_unsupported_claim: boolean;
    unsupported_claims: string[];
    used_fallback: boolean;
  };
}

export interface TailorResult {
  tailored_bullets: TailoredBullet[];
  cover_letter_paragraph: string;
  grounding_check: string;
}

export interface VerificationResult {
  has_unsupported_claim: boolean;
  unsupported_claims: string[];
}

export interface TechnicalQuestion {
  question: string;
  why_likely: string;
}

export interface BehavioralQuestion {
  question: string;
}

export interface GapProbingQuestion {
  question: string;
  related_gap: string;
  gap_type: GapType;
  coaching_note: string;
}

export interface InterviewResult {
  technical_questions: TechnicalQuestion[];
  behavioral_questions: BehavioralQuestion[];
  gap_probing_questions: GapProbingQuestion[];
  disclaimer: string;
}
