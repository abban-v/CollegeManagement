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
  { category: "NETWORK", department: "IT", terms: ["wifi", "internet", "network", "router", "login", "server"] },
  { category: "FACILITIES", department: "Facilities", terms: ["water", "leak", "light", "fan", "ac", "hvac", "door"] },
  { category: "SAFETY", department: "Campus Safety", terms: ["fire", "smoke", "shock", "hazard", "injury", "broken glass"] },
  { category: "ACADEMIC", department: "Academic Affairs", terms: ["classroom", "projector", "lab", "exam", "lecture"] },
];

const PRIORITY_RULES = [
  { priority: IssuePriority.CRITICAL, terms: ["fire", "smoke", "shock", "danger", "injury", "flood", "gas"] },
  { priority: IssuePriority.HIGH, terms: ["down", "not working", "broken", "leak", "outage", "urgent"] },
  { priority: IssuePriority.MEDIUM, terms: ["slow", "intermittent", "noise", "unstable", "flicker"] },
];

const SPAM_TERMS = ["buy now", "free money", "crypto", "casino", "click here"];
const TOXIC_TERMS = ["idiot", "stupid", "hate", "kill"];

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
  const text = `${input.title} ${input.description}`.toLowerCase();
  const matchedCategory = CATEGORY_RULES.find((rule) => includesAny(text, rule.terms));
  const matchedPriority = PRIORITY_RULES.find((rule) => includesAny(text, rule.terms));
  const spamScore = includesAny(text, SPAM_TERMS) ? 0.82 : 0.03;
  const toxicityScore = includesAny(text, TOXIC_TERMS) ? 0.74 : 0.01;
  const moderationFlags = [
    ...(spamScore >= 0.7 ? ["SPAM"] : []),
    ...(toxicityScore >= 0.7 ? ["TOXIC_LANGUAGE"] : []),
    ...(duplicateCandidates.length > 0 ? ["POSSIBLE_DUPLICATE"] : []),
  ];

  const category = input.category?.trim() || matchedCategory?.category || "UNCATEGORIZED";
  const suggestedDepartment = input.department?.trim() || matchedCategory?.department || "Operations";
  const aiPriority = matchedPriority?.priority ?? IssuePriority.MEDIUM;

  return {
    category,
    suggestedDepartment,
    aiPriority,
    severity: aiPriority,
    spamScore,
    toxicityScore,
    moderationFlags,
    confidence: matchedCategory ? 0.86 : 0.58,
    duplicateCandidates,
    reasoning: `Local analyzer matched ${category} signals and assigned ${aiPriority} priority.`,
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

    const prompt = `Classify this campus maintenance issue and return ONLY a JSON object with these exact keys:
- category (string): One of NETWORK, FACILITIES, SAFETY, ACADEMIC, UNCATEGORIZED
- suggestedDepartment (string): The department that should handle this
- priority (string): One of LOW, MEDIUM, HIGH, CRITICAL
- severity (string): One of LOW, MEDIUM, HIGH, CRITICAL
- confidence (number): 0-1 confidence score
- spamScore (number): 0-1 spam likelihood
- toxicityScore (number): 0-1 toxicity likelihood
- moderationFlags (array of strings): e.g., ["SPAM", "TOXIC_LANGUAGE"] or []
- reasoning (string): Brief explanation

Issue details:
Title: ${input.title}
Description: ${input.description}
User Category: ${input.category || "not specified"}
User Department: ${input.department || "not specified"}
Location: ${input.location || "not specified"}
Duplicate Candidates: ${JSON.stringify(duplicateCandidates)}`;

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
