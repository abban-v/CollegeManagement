import { IssuePriority, type Issue } from "@prisma/client";
import { GoogleGenerativeAI } from "@google/generative-ai";

export type DuplicateCandidate = {
  issueId: string;
  title: string;
  confidence: number;
};

export type IssueAnalysisInput = {
  title: string;
  description: string;
  category?: string;
  department?: string;
  location?: string;
};

export type IssueAnalysisResult = {
  category: string;
  suggestedDepartment: string;
  aiPriority: IssuePriority;
  severity: IssuePriority;
  spamScore: number;
  toxicityScore: number;
  moderationFlags: string[];
  confidence: number;
  duplicateCandidates: DuplicateCandidate[];
  reasoning: string;
  modelUsed: string;
};

const CATEGORY_RULES = [
  { category: "Electrical & Power", department: "Electrical & Electronics", terms: ["power", "electricity", "wire", "switch", "light", "fuse", "shock", "circuit", "socket", "spark", "blackout", "tripping"] },
  { category: "HVAC & Ventilation", department: "Campus Facilities & Maintenance", terms: ["ac", "air conditioner", "fan", "cooling", "ventilation", "heater", "temperature", "humidity", "exhaust"] },
  { category: "Plumbing & Water", department: "Campus Facilities & Maintenance", terms: ["water", "leak", "pipe", "tap", "restroom", "washroom", "toilet", "drainage", "flood", "sink", "flush"] },
  { category: "Lab Hardware & Computers", department: "Computer Science & Engineering", terms: ["computer", "pc", "lab", "monitor", "keyboard", "mouse", "oscilloscope", "equipment", "instrument", "cpu", "workstation", "ups"] },
  { category: "Projectors & AV Systems", department: "Campus Facilities & Maintenance", terms: ["projector", "hdmi", "audio", "speaker", "display", "mic", "microphone", "av", "screen", "vga", "amplifier"] },
  { category: "Furniture & Desks", department: "Campus Facilities & Maintenance", terms: ["desk", "bench", "chair", "table", "podium", "door", "window", "whiteboard", "blackboard", "lock", "handle"] },
  { category: "General Infrastructure", department: "Civil Engineering", terms: ["road", "building", "paint", "civil", "pathway", "floor", "ceiling", "wall", "roof", "crack", "tiles", "stairs", "railing"] },
  { category: "Network & IT", department: "Computer Science & Engineering", terms: ["wifi", "internet", "network", "router", "login", "server", "ethernet", "connection", "portal", "firewall", "dns"] },
  { category: "Campus Safety", department: "Campus Facilities & Maintenance", terms: ["fire", "smoke", "shock", "hazard", "injury", "broken glass", "extinguisher", "alarm", "emergency"] },
];

const PRIORITY_RULES = [
  { priority: IssuePriority.CRITICAL, terms: ["fire", "smoke", "shock", "danger", "injury", "flood", "gas"] },
  { priority: IssuePriority.HIGH, terms: ["down", "not working", "broken", "leak", "outage", "urgent"] },
  { priority: IssuePriority.MEDIUM, terms: ["slow", "intermittent", "noise", "unstable", "flicker"] },
];

const SPAM_TERMS = [
  "buy now", "free money", "crypto", "casino", "click here", "viagra", "telegram",
  "whatsapp", "discount", "cheap", "invest", "earn money", "loan", "free cash",
  "dating", "escort", "subscribe", "lottery", "win cash", "prizes"
];
const TOXIC_TERMS = ["idiot", "stupid", "hate", "kill", "shut up", "dumb", "useless fool"];

// Common keyboard mashing / gibberish substrings
const GIBBERISH_PATTERNS = [
  /^[a-z0-9]{1,4}$/i,
  /[bcdfghjklmnpqrstvwxyz]{6,}/i, // 6+ consecutive consonants without vowels
  /asdf|sdfg|dfgh|fghj|ghjk|hjkl|qwerty|zxcv|qwer|asdfg/i,
  /(.)\1{4,}/, // 5+ repeated characters like aaaaa or 11111
  /^test\s+test(\s+test)*$/i,
  /^(blah|blabla|lorem\s+ipsum|foo\s+bar|asdf)\b/i,
];

function isGibberish(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 5) return true;
  return GIBBERISH_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function tokenize(value: string) {
  return new Set(value.toLowerCase().match(/[a-z0-9]+/g) ?? []);
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function jaccard(a: Set<string>, b: Set<string>) {
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

export function findDuplicateCandidates(
  input: IssueAnalysisInput,
  issues: Pick<Issue, "id" | "title" | "description">[]
): DuplicateCandidate[] {
  const targetTokens = tokenize(`${input.title} ${input.description}`);

  return issues
    .map((issue) => ({
      issueId: issue.id,
      title: issue.title,
      confidence: Number(jaccard(targetTokens, tokenize(`${issue.title} ${issue.description}`)).toFixed(2)),
    }))
    .filter((candidate) => candidate.confidence >= 0.35)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
}

export function analyzeIssueLocally(
  input: IssueAnalysisInput,
  duplicateCandidates: DuplicateCandidate[] = []
): IssueAnalysisResult {
  const fullText = `${input.title} ${input.description}`.toLowerCase();
  const titleText = input.title.toLowerCase();
  const descText = input.description.toLowerCase();

  const hasSpamTerms = includesAny(fullText, SPAM_TERMS);
  const hasToxicTerms = includesAny(fullText, TOXIC_TERMS);
  const titleGibberish = isGibberish(titleText);
  const descGibberish = isGibberish(descText);
  const isSevereGibberish = (titleGibberish && descGibberish) || fullText.length < 12;

  const matchedCategory = CATEGORY_RULES.find((rule) => includesAny(fullText, rule.terms));
  const matchedPriority = PRIORITY_RULES.find((rule) => includesAny(fullText, rule.terms));

  let spamScore = 0.02;
  let confidence = matchedCategory ? 0.88 : 0.65;

  if (hasSpamTerms && isSevereGibberish) {
    spamScore = 0.95;
    confidence = 0.10;
  } else if (isSevereGibberish) {
    spamScore = 0.88;
    confidence = 0.15;
  } else if (hasSpamTerms) {
    spamScore = 0.85;
    confidence = 0.25;
  } else if (titleGibberish || descGibberish || (!matchedCategory && fullText.length < 25)) {
    // Potential spam / ambiguous
    spamScore = 0.62;
    confidence = 0.42;
  }

  const toxicityScore = hasToxicTerms ? 0.80 : 0.01;

  const moderationFlags = [
    ...(spamScore >= 0.5 ? ["SPAM"] : []),
    ...(toxicityScore >= 0.6 ? ["TOXIC_LANGUAGE"] : []),
    ...(duplicateCandidates.length > 0 ? ["POSSIBLE_DUPLICATE"] : []),
  ];

  const category = input.category?.trim() || matchedCategory?.category || "UNCATEGORIZED";
  const suggestedDepartment = input.department?.trim() || matchedCategory?.department || "Campus Facilities & Maintenance";
  const aiPriority = matchedPriority?.priority ?? IssuePriority.MEDIUM;

  let reasoning = `Local rules evaluated ${category} with ${aiPriority} priority.`;
  if (spamScore > 0.8 && confidence < 0.3) {
    reasoning = "Local analyzer flagged input as severe spam or gibberish.";
  } else if (spamScore > 0.5 && confidence < 0.6) {
    reasoning = "Local analyzer identified potential spam or low-confidence issue requiring review.";
  }

  return {
    category,
    suggestedDepartment,
    aiPriority,
    severity: aiPriority,
    spamScore,
    toxicityScore,
    moderationFlags,
    confidence,
    duplicateCandidates,
    reasoning,
    modelUsed: "slashforge-local-rules-v1",
  };
}

function normalizePriority(value: unknown): IssuePriority {
  if (typeof value !== "string") return IssuePriority.MEDIUM;

  const normalized = value.toUpperCase();
  if (normalized in IssuePriority) {
    return IssuePriority[normalized as keyof typeof IssuePriority];
  }

  return IssuePriority.MEDIUM;
}

function clampScore(value: unknown, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

async function analyzeIssueWithGemini(
  input: IssueAnalysisInput,
  duplicateCandidates: DuplicateCandidate[],
  fallback: IssueAnalysisResult
): Promise<IssueAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    return fallback;
  }

  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `You are the AI Quality & Triage Sentinel for a College Campus Infrastructure and Asset Issue Reporting Platform.
Your task is to analyze submitted issues for validity, category, priority, spam likelihood, and authenticity.

Carefully evaluate the following issue for authenticity and campus relevance:
- Title: "${input.title}"
- Description: "${input.description}"
- User Category: "${input.category || "not specified"}"
- User Department: "${input.department || "not specified"}"
- Location: "${input.location || "not specified"}"
- Known Potential Duplicates: ${JSON.stringify(duplicateCandidates)}

CRITICAL EVALUATION RUBRIC:
1. spamScore (float between 0.0 and 1.0):
   - 0.81 to 1.00 (High / Severe Spam or Fabrication): Blatant spam, advertising, commercial promotions, crypto, casinos, external links, gibberish/keyboard mashing (e.g., 'asdfgh', 'test 12345'), fabricated stories, malicious text, trolling, or completely nonsensical input.
   - 0.51 to 0.80 (Potential Spam / Ambiguous): Unclear/vague claims, rambling disconnected text, suspicious wording, joke submissions, or lacking authentic campus context.
   - 0.00 to 0.50 (Legitimate): Genuine campus infrastructure, equipment, or facility problem.

2. confidence (float between 0.0 and 1.0):
   - 0.80 to 1.00 (High Confidence): Specific, coherent, well-described problem with clear physical location and actionable symptoms.
   - 0.60 to 0.79 (Moderate Confidence): Plausible campus maintenance issue but with brief or basic detail.
   - 0.30 to 0.59 (Low Confidence): Ambiguous or poorly worded, uncertain if it represents a real actionable issue.
   - 0.00 to 0.29 (Very Low Confidence): Incoherent, nonsensical, fabricated, gibberish, or impossible to determine any legitimate maintenance issue.

3. category: One of "Electrical & Power", "HVAC & Ventilation", "Plumbing & Water", "Lab Hardware & Computers", "Projectors & AV Systems", "Furniture & Desks", "General Infrastructure", "Network & IT", "Campus Safety", or "UNCATEGORIZED".
4. priority: One of "LOW", "MEDIUM", "HIGH", "CRITICAL".
5. severity: One of "LOW", "MEDIUM", "HIGH", "CRITICAL".
6. toxicityScore: 0.0 to 1.0 likelihood of profanity, harassment, or abusive attacks.
7. moderationFlags: Array of strings. Include "SPAM" if spamScore > 0.5. Include "TOXIC_LANGUAGE" if toxicityScore > 0.6. Include "POSSIBLE_FABRICATION" if spamScore > 0.8 and confidence < 0.3.

Return ONLY a valid JSON object matching this exact format with NO surrounding markdown backticks or commentary:
{
  "category": "string",
  "suggestedDepartment": "string",
  "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "confidence": 0.95,
  "spamScore": 0.02,
  "toxicityScore": 0.0,
  "moderationFlags": [],
  "reasoning": "Clear explanation of the assessment and why these scores were assigned."
}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Gemini response did not contain valid JSON");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const aiPriority = normalizePriority(parsed.priority);

    return {
      category: typeof parsed.category === "string" ? parsed.category : fallback.category,
      suggestedDepartment:
        typeof parsed.suggestedDepartment === "string" ? parsed.suggestedDepartment : fallback.suggestedDepartment,
      aiPriority,
      severity: normalizePriority(parsed.severity),
      spamScore: clampScore(parsed.spamScore, fallback.spamScore),
      toxicityScore: clampScore(parsed.toxicityScore, fallback.toxicityScore),
      moderationFlags: Array.isArray(parsed.moderationFlags)
        ? parsed.moderationFlags.filter((flag: unknown): flag is string => typeof flag === "string")
        : fallback.moderationFlags,
      confidence: clampScore(parsed.confidence, fallback.confidence),
      duplicateCandidates,
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : fallback.reasoning,
      modelUsed: modelName,
    };
  } catch (error) {
    console.warn("Gemini analysis failed, falling back to local analyzer", error);
    return fallback;
  }
}

export async function analyzeIssue(
  input: IssueAnalysisInput,
  duplicateCandidates: DuplicateCandidate[] = []
): Promise<IssueAnalysisResult> {
  const fallback = analyzeIssueLocally(input, duplicateCandidates);

  try {
    return await analyzeIssueWithGemini(input, duplicateCandidates, fallback);
  } catch (error) {
    console.warn("Gemini analysis unavailable, falling back to local analyzer", error);
    return fallback;
  }
}
