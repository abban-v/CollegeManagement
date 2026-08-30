import { IssuePriority, type Issue } from "@prisma/client";

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

function extractResponseText(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;

  const response = payload as { output_text?: unknown; output?: unknown };
  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  if (!Array.isArray(response.output)) {
    return null;
  }

  for (const item of response.output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;

    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string") {
        return text;
      }
    }
  }

  return null;
}

function extractJsonObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Grok response did not contain JSON");
  }

  return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
}

async function analyzeIssueWithGrok(
  input: IssueAnalysisInput,
  duplicateCandidates: DuplicateCandidate[],
  fallback: IssueAnalysisResult
): Promise<IssueAnalysisResult> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey || apiKey === "your_xai_api_key_here") {
    return fallback;
  }

  const baseUrl = process.env.XAI_API_BASE_URL || "https://api.x.ai/v1";
  const model = process.env.XAI_MODEL || "grok-4.6";
  const response = await fetch(`${baseUrl}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content:
            "Classify campus maintenance issues. Return only compact JSON with keys category, suggestedDepartment, priority, severity, confidence, spamScore, toxicityScore, moderationFlags, reasoning.",
        },
        {
          role: "user",
          content: JSON.stringify({
            title: input.title,
            description: input.description,
            userCategory: input.category,
            userDepartment: input.department,
            location: input.location,
            duplicateCandidates,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Grok analysis failed with ${response.status}`);
  }

  const text = extractResponseText(await response.json());
  if (!text) {
    throw new Error("Grok response did not include text output");
  }

  const parsed = extractJsonObject(text);
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
      ? parsed.moderationFlags.filter((flag): flag is string => typeof flag === "string")
      : fallback.moderationFlags,
    confidence: clampScore(parsed.confidence, fallback.confidence),
    duplicateCandidates,
    reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : fallback.reasoning,
    modelUsed: model,
  };
}

export async function analyzeIssue(
  input: IssueAnalysisInput,
  duplicateCandidates: DuplicateCandidate[] = []
): Promise<IssueAnalysisResult> {
  const fallback = analyzeIssueLocally(input, duplicateCandidates);

  try {
    return await analyzeIssueWithGrok(input, duplicateCandidates, fallback);
  } catch (error) {
    console.warn("Grok analysis unavailable, falling back to local analyzer", error);
    return fallback;
  }
}
