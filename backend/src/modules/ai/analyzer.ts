import { IssuePriority, type Issue } from "@prisma/client";
import { GoogleGenerativeAI } from "@google/generative-ai";

export type ExistingIssueContext = {
  id: string;
  title: string;
  description: string;
  location?: string | null;
  status?: string | null;
  category?: string | null;
};

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
  isDuplicate?: boolean;
  duplicateOfIssueId?: string | null;
  duplicateIssueTitle?: string | null;
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
  issues: ExistingIssueContext[]
): DuplicateCandidate[] {
  const targetTokens = tokenize(`${input.title} ${input.description} ${input.location || ""}`);

  return issues
    .map((issue) => {
      const issueTokens = tokenize(`${issue.title} ${issue.description} ${issue.location || ""}`);
      const baseJaccard = jaccard(targetTokens, issueTokens);
      const locMatch =
        input.location &&
        issue.location &&
        input.location.toLowerCase().trim() === issue.location.toLowerCase().trim();
      const rawScore = locMatch ? Math.min(1, baseJaccard + 0.25) : baseJaccard;

      return {
        issueId: issue.id,
        title: issue.title,
        confidence: Number(rawScore.toFixed(2)),
      };
    })
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

  const topCandidate = duplicateCandidates[0];
  const isDuplicate = Boolean(topCandidate && topCandidate.confidence >= 0.70);
  const duplicateOfIssueId = isDuplicate && topCandidate ? topCandidate.issueId : null;
  const duplicateIssueTitle = isDuplicate && topCandidate ? topCandidate.title : null;

  const moderationFlags = [
    ...(spamScore >= 0.5 ? ["SPAM"] : []),
    ...(toxicityScore >= 0.6 ? ["TOXIC_LANGUAGE"] : []),
    ...(duplicateCandidates.length > 0 ? ["POSSIBLE_DUPLICATE"] : []),
  ];

  const category = input.category?.trim() || matchedCategory?.category || "UNCATEGORIZED";
  const suggestedDepartment = input.department?.trim() || matchedCategory?.department || "Campus Facilities & Maintenance";
  const aiPriority = matchedPriority?.priority ?? IssuePriority.MEDIUM;

  let reasoning = `Local rules evaluated ${category} with ${aiPriority} priority.`;
  if (isDuplicate) {
    reasoning = `Local analyzer detected existing issue "${duplicateIssueTitle}" as duplicate.`;
  } else if (spamScore > 0.8 && confidence < 0.3) {
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
    isDuplicate,
    duplicateOfIssueId,
    duplicateIssueTitle,
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
  existingIssues: ExistingIssueContext[],
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

    const existingIssuesListText = existingIssues && existingIssues.length > 0
      ? existingIssues
          .slice(0, 15)
          .map(
            (iss, i) =>
              `${i + 1}. [ID: ${iss.id}] Status: ${iss.status || "REPORTED"} | Location: ${
                iss.location || "N/A"
              } | Title: "${iss.title}" | Description: "${iss.description.slice(0, 120)}"`
          )
          .join("\n")
      : "None currently active.";

    const prompt = `You are the AI Quality & Triage Sentinel for a College Campus Infrastructure and Asset Issue Reporting Platform.
Your task is to analyze submitted issues for validity, category, priority, spam likelihood, authenticity, and duplicate detection against already reported / active platform issues.

Carefully evaluate the newly submitted issue:
- Title: "${input.title}"
- Description: "${input.description}"
- User Category: "${input.category || "not specified"}"
- User Department: "${input.department || "not specified"}"
- Location: "${input.location || "not specified"}"

CURRENTLY REPORTED & ACTIVE PLATFORM ISSUES:
${existingIssuesListText}

CRITICAL EVALUATION RUBRIC:
1. DUPLICATE DETECTION:
   - Check if this newly submitted issue is reporting the EXACT SAME or SUBSTANTIALLY IDENTICAL problem, incident, room, or equipment that is already being resolved or reported in the CURRENTLY REPORTED & ACTIVE PLATFORM ISSUES list above (e.g. same projector in same room, same water leak in same washroom, same AC breakdown).
   - If it is a duplicate of an existing unresolved/open issue:
     - Set "isDuplicate": true
     - Set "duplicateOfIssueId": "<matching-issue-id>"
     - Set "duplicateIssueTitle": "<matching-issue-title>"
     - Include "POSSIBLE_DUPLICATE" in "moderationFlags".
   - If it is a unique/new issue:
     - Set "isDuplicate": false
     - Set "duplicateOfIssueId": null
     - Set "duplicateIssueTitle": null

2. spamScore (float between 0.0 and 1.0):
   - 0.81 to 1.00 (High / Severe Spam or Fabrication): Blatant spam, advertising, commercial promotions, crypto, casinos, external links, gibberish/keyboard mashing (e.g., 'asdfgh', 'test 12345'), fabricated stories, malicious text, trolling, or completely nonsensical input.
   - 0.51 to 0.80 (Potential Spam / Ambiguous): Unclear/vague claims, rambling disconnected text, suspicious wording, joke submissions, or lacking authentic campus context.
   - 0.00 to 0.50 (Legitimate): Genuine campus infrastructure, equipment, or facility problem.

3. confidence (float between 0.0 and 1.0):
   - 0.80 to 1.00 (High Confidence): Specific, coherent, well-described problem with clear physical location and actionable symptoms.
   - 0.60 to 0.79 (Moderate Confidence): Plausible campus maintenance issue but with brief or basic detail.
   - 0.30 to 0.59 (Low Confidence): Ambiguous or poorly worded, uncertain if it represents a real actionable issue.
   - 0.00 to 0.29 (Very Low Confidence): Incoherent, nonsensical, fabricated, gibberish, or impossible to determine any legitimate maintenance issue.

4. category: One of "Electrical & Power", "HVAC & Ventilation", "Plumbing & Water", "Lab Hardware & Computers", "Projectors & AV Systems", "Furniture & Desks", "General Infrastructure", "Network & IT", "Campus Safety", or "UNCATEGORIZED".
5. priority: One of "LOW", "MEDIUM", "HIGH", "CRITICAL".
6. severity: One of "LOW", "MEDIUM", "HIGH", "CRITICAL".
7. toxicityScore: 0.0 to 1.0 likelihood of profanity, harassment, or abusive attacks.
8. moderationFlags: Array of strings. Include "SPAM" if spamScore > 0.5. Include "TOXIC_LANGUAGE" if toxicityScore > 0.6. Include "POSSIBLE_FABRICATION" if spamScore > 0.8 and confidence < 0.3. Include "POSSIBLE_DUPLICATE" if isDuplicate is true.

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
  "isDuplicate": false,
  "duplicateOfIssueId": null,
  "duplicateIssueTitle": null,
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
    const isDuplicate = typeof parsed.isDuplicate === "boolean" ? parsed.isDuplicate : fallback.isDuplicate;

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
      isDuplicate,
      duplicateOfIssueId: typeof parsed.duplicateOfIssueId === "string" ? parsed.duplicateOfIssueId : fallback.duplicateOfIssueId,
      duplicateIssueTitle: typeof parsed.duplicateIssueTitle === "string" ? parsed.duplicateIssueTitle : fallback.duplicateIssueTitle,
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
  existingIssues: ExistingIssueContext[] = [],
  duplicateCandidates: DuplicateCandidate[] = []
): Promise<IssueAnalysisResult> {
  const fallback = analyzeIssueLocally(input, duplicateCandidates);

  try {
    return await analyzeIssueWithGemini(input, existingIssues, duplicateCandidates, fallback);
  } catch (error) {
    console.warn("Gemini analysis unavailable, falling back to local analyzer", error);
    return fallback;
  }
}
