import { IssuePriority } from "@prisma/client";
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
  suspectedCause?: string;
  proposedSolution?: string;
  attachments?: string[];
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

// Patterns representing joke, trolling, emotional, or non-infrastructure submissions
const JOKE_OR_NON_INFRASTRUCTURE_PATTERNS = [
  /cant\s+stop\s+(smiling|laughing|crying|dancing)/i,
  /can't\s+stop\s+(smiling|laughing|crying|dancing)/i,
  /\b(smiling|laughing|joke|prank|funny|meme|bored|lol|lmao|rofl|xd|haha|hehe)\b/i,
  /\b(marry me|i love you|dating|kiss|hug|party|dance|hungry|food)\b/i,
  /^(urgent\s+)?issue\s+someone\s+please\s+address$/i,
  /^(please\s+)?(help\s+me|look\s+at\s+this|test(ing)?\s*(123)?)$/i,
];

const INFRASTRUCTURE_SYMPTOM_TERMS = [
  "broken", "leak", "leaking", "pipe", "tap", "sink", "water", "drain", "drainage", "flush",
  "power", "electricity", "wire", "switch", "light", "bulb", "fuse", "socket", "circuit", "shock", "spark", "blackout",
  "ac", "air conditioner", "fan", "cooling", "heater", "ventilation",
  "computer", "pc", "laptop", "keyboard", "mouse", "monitor", "screen", "cpu", "ups", "oscilloscope",
  "projector", "hdmi", "vga", "audio", "speaker", "mic", "microphone",
  "desk", "bench", "chair", "table", "door", "window", "lock", "handle", "blackboard", "whiteboard",
  "wifi", "internet", "network", "router", "ethernet", "portal", "login", "server",
  "fire", "smoke", "alarm", "hazard", "ceiling", "roof", "floor", "tiles", "stairs", "wall", "paint", "crack"
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
  const isJokeOrNonInfrastructure = JOKE_OR_NON_INFRASTRUCTURE_PATTERNS.some((p) => p.test(fullText));
  const hasInfrastructureSymptoms = includesAny(fullText, INFRASTRUCTURE_SYMPTOM_TERMS);

  const matchedCategory = CATEGORY_RULES.find((rule) => includesAny(fullText, rule.terms));
  const matchedPriority = PRIORITY_RULES.find((rule) => includesAny(fullText, rule.terms));

  let spamScore = 0.02;
  let confidence = matchedCategory ? 0.88 : (hasInfrastructureSymptoms ? 0.65 : 0.35);

  if (hasSpamTerms && isSevereGibberish) {
    spamScore = 0.95;
    confidence = 0.10;
  } else if (isSevereGibberish) {
    spamScore = 0.88;
    confidence = 0.15;
  } else if (hasSpamTerms) {
    spamScore = 0.85;
    confidence = 0.25;
  } else if (isJokeOrNonInfrastructure || (!matchedCategory && !hasInfrastructureSymptoms)) {
    // Joke submission, trolling, or completely missing actionable infrastructure symptoms
    spamScore = 0.65;
    confidence = 0.35;
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
    ...(isJokeOrNonInfrastructure ? ["NON_INFRASTRUCTURE_CONTENT"] : []),
  ];

  const category = input.category?.trim() || matchedCategory?.category || "UNCATEGORIZED";
  const suggestedDepartment = input.department?.trim() || matchedCategory?.department || "Campus Facilities & Maintenance";
  
  // Do not escalate to HIGH priority if the submission is a joke or lacks infrastructure symptoms
  const aiPriority = (isJokeOrNonInfrastructure || (!matchedCategory && !hasInfrastructureSymptoms))
    ? IssuePriority.MEDIUM
    : (matchedPriority?.priority ?? IssuePriority.MEDIUM);

  let reasoning = `Local rules evaluated ${category} with ${aiPriority} priority.`;
  if (isDuplicate) {
    reasoning = `Local analyzer detected existing issue "${duplicateIssueTitle}" as duplicate.`;
  } else if (spamScore > 0.8 && confidence < 0.3) {
    reasoning = "Local analyzer flagged input as severe spam or gibberish.";
  } else if (spamScore > 0.5 && confidence < 0.6) {
    reasoning = isJokeOrNonInfrastructure
      ? "Local analyzer identified non-infrastructure or joke content requiring administrative review."
      : "Local analyzer identified potential spam or low-confidence issue requiring review.";
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
  const num = value > 1 ? value / 100 : value;
  return Math.min(1, Math.max(0, num));
}

async function analyzeIssueWithOpenRouter(
  prompt: string,
  fallback: IssueAnalysisResult,
  duplicateCandidates: DuplicateCandidate[]
): Promise<IssueAnalysisResult | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === "your_openrouter_api_key_here") return null;

  const configuredModel = process.env.OPENROUTER_MODEL || "nvidia/nemotron-3.5-lightning:free";
  const modelList = [
    configuredModel,
    "nvidia/nemotron-3.5-lightning:free",
    "google/gemma-4-31b-it:free",
  ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 3);

  console.log(`[OpenRouter AI Sentinel] Initiating issue triage analysis with models: ${modelList.join(", ")}`);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://slashforge.cet.ac.in",
        "X-Title": "Slashforge Campus Issue Portal",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: configuredModel,
        models: modelList,
        reasoning: { max_tokens: 0 },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    clearTimeout(timer);

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.warn(`[OpenRouter AI Sentinel] HTTP ${response.status} ${response.statusText}:`, errText);
      return null;
    }

    const json = await response.json();
    const message = json.choices?.[0]?.message;
    const rawContent = message?.content || message?.reasoning || "";
    
    // Strip thinking tags if present
    const cleanContent = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("[OpenRouter AI Sentinel] No JSON object found in response:", cleanContent);
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const aiPriority = normalizePriority(parsed.priority);
    const isDuplicate = typeof parsed.isDuplicate === "boolean" ? parsed.isDuplicate : fallback.isDuplicate;
    const modelUsed = json.model || configuredModel;

    console.log(`[OpenRouter AI Sentinel] Analysis complete via ${modelUsed} -> Spam: ${parsed.spamScore}, Confidence: ${parsed.confidence}, Category: ${parsed.category}`);

    return {
      category: typeof parsed.category === "string" ? parsed.category : fallback.category,
      suggestedDepartment:
        typeof parsed.suggestedDepartment === "string" ? parsed.suggestedDepartment : fallback.suggestedDepartment,
      aiPriority,
      severity: normalizePriority(parsed.severity),
      spamScore: clampScore(parsed.spamScore, fallback.spamScore),
      toxicityScore: clampScore(parsed.toxicityScore, fallback.toxicityScore),
      moderationFlags: Array.isArray(parsed.moderationFlags)
        ? parsed.moderationFlags.filter((f: unknown): f is string => typeof f === "string")
        : fallback.moderationFlags,
      confidence: clampScore(parsed.confidence, fallback.confidence),
      duplicateCandidates,
      isDuplicate,
      duplicateOfIssueId: typeof parsed.duplicateOfIssueId === "string" ? parsed.duplicateOfIssueId : fallback.duplicateOfIssueId,
      duplicateIssueTitle: typeof parsed.duplicateIssueTitle === "string" ? parsed.duplicateIssueTitle : fallback.duplicateIssueTitle,
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : fallback.reasoning,
      modelUsed: `openrouter/${modelUsed}`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[OpenRouter AI Sentinel] Request failed: ${msg}`);
    return null;
  }
}

async function analyzeIssueWithGemini(
  input: IssueAnalysisInput,
  existingIssues: ExistingIssueContext[],
  duplicateCandidates: DuplicateCandidate[],
  fallback: IssueAnalysisResult
): Promise<IssueAnalysisResult> {
  const configuredModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const candidateModels = [configuredModel, "gemini-3.6-flash"].filter(
    (v, i, a) => a.indexOf(v) === i
  );

  const existingIssuesListText = existingIssues && existingIssues.length > 0
    ? existingIssues
        .slice(0, 20)
        .map(
          (iss, i) =>
            `${i + 1}. [ID: ${iss.id}] Status: ${iss.status || "REPORTED"} | Category: ${iss.category || "General"} | Location: ${
              iss.location || "N/A"
            } | Title: "${iss.title}" | Description: "${iss.description.slice(0, 140)}"`
        )
        .join("\n")
    : "None currently active.";

  const prompt = `You are the AI Quality & Triage Sentinel for a College Campus Infrastructure and Asset Issue Reporting Platform.
Your task is to analyze submitted tickets for legitimacy, category, priority, spam likelihood, authenticity, and duplicate detection against already reported / active platform issues.

Carefully evaluate the newly submitted issue:
- Problem Title: "${input.title}"
- Problem Description: "${input.description}"
- Location / Classroom / Lab: "${input.location || "not specified"}"
- User Category: "${input.category || "not specified"}"
- User Department: "${input.department || "not specified"}"
- Suspected Cause: "${input.suspectedCause || "not specified"}"
- Suggested Solution: "${input.proposedSolution || "not specified"}"

CURRENTLY REPORTED & ACTIVE PLATFORM ISSUES:
${existingIssuesListText}

CRITICAL EVALUATION RUBRIC:
1. DUPLICATE DETECTION & PRIOR RESOLUTION:
   - Check if this newly submitted issue is reporting the EXACT SAME or SUBSTANTIALLY IDENTICAL problem, room, incident, or equipment that is already present in the CURRENTLY REPORTED & ACTIVE PLATFORM ISSUES list above (e.g. same projector failure in same classroom, same water leak in same restroom, same AC breakdown).
   - If it is a duplicate of an existing unresolved/open issue:
     - Set "isDuplicate": true
     - Set "duplicateOfIssueId": "<matching-issue-id>"
     - Set "duplicateIssueTitle": "<matching-issue-title>"
     - Include "POSSIBLE_DUPLICATE" in "moderationFlags".
     - Set "spamScore" to a higher rating between 0.70 and 0.95 depending on how closely it matches.
   - If it is a unique/new issue:
     - Set "isDuplicate": false
     - Set "duplicateOfIssueId": null
     - Set "duplicateIssueTitle": null

2. CAMPUS INFRASTRUCTURE AUTHENTICITY & CONFIDENCE (0.0 to 1.0):
   - Check if the issue seems genuine, coherent, and actionable from the perspective of a college campus infrastructure and facility management platform (classrooms, labs, restrooms, electrical fixtures, AC, projectors, WiFi, civil structures, water pipes, furniture, safety hazards).
   - 0.80 to 1.00 (High Confidence): Genuine, specific, coherent, well-described campus maintenance problem with clear location and actionable physical/technical symptoms.
   - 0.60 to 0.79 (Moderate Confidence): Plausible campus maintenance issue but with brief or basic detail.
   - 0.30 to 0.59 (Low Confidence): Ambiguous or poorly worded, personal banter, or uncertain if it represents a real actionable campus issue.
   - 0.00 to 0.29 (Very Low Confidence): Incoherent, nonsensical, fabricated, joke/meme submissions (e.g. 'I CANT STOP SMILING', 'someone talk to me'), gibberish, or impossible to determine any legitimate maintenance issue.

3. SPAM SCORE (0.0 to 1.0):
   - 0.81 to 1.00 (High / Severe Spam or Fabrication): Blatant spam, advertising, commercial promotions, crypto, casinos, external links, gibberish/keyboard mashing (e.g., 'asdfgh', 'test 12345'), fabricated stories, malicious text, trolling, jokes, or completely nonsensical input.
   - 0.51 to 0.80 (Potential Spam / Ambiguous / Joke): Unclear/vague claims, rambling disconnected text, suspicious wording, joke submissions, personal expressions, or submissions completely lacking physical campus infrastructure context.
   - 0.00 to 0.50 (Legitimate): Genuine campus infrastructure, equipment, or facility problem.

4. CATEGORY: One of "Electrical & Power", "HVAC & Ventilation", "Plumbing & Water", "Lab Hardware & Computers", "Projectors & AV Systems", "Furniture & Desks", "General Infrastructure", "Network & IT", "Campus Safety", or "UNCATEGORIZED".
5. PRIORITY: One of "LOW", "MEDIUM", "HIGH", "CRITICAL". (Do NOT assign HIGH/CRITICAL to joke or non-infrastructure submissions).
6. SEVERITY: One of "LOW", "MEDIUM", "HIGH", "CRITICAL".
7. TOXICITY SCORE: 0.0 to 1.0 likelihood of profanity, harassment, or abusive attacks.
8. MODERATION FLAGS: Array of strings. Include "SPAM" if spamScore > 0.5. Include "TOXIC_LANGUAGE" if toxicityScore > 0.6. Include "POSSIBLE_FABRICATION" if spamScore > 0.8 and confidence < 0.3. Include "POSSIBLE_DUPLICATE" if isDuplicate is true. Include "NON_INFRASTRUCTURE_CONTENT" if the submission is a joke or personal expression.

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

  // 1. Try OpenRouter if configured
  const openRouterResult = await analyzeIssueWithOpenRouter(prompt, fallback, duplicateCandidates);
  if (openRouterResult) {
    return openRouterResult;
  }

  // 2. Try Google Generative AI
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    return fallback;
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  for (const modelName of candidateModels) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      
      // Execute with a comfortable 7.5s timeout per model attempt
      const result = await Promise.race([
        model.generateContent(prompt),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Gemini request timeout")), 7500)
        ),
      ]);

      const response = result.response;
      const text = response.text();

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        continue;
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
    } catch {
      // Try next candidate model or fallback immediately
      continue;
    }
  }

  return fallback;
}

export type ImageInspectionResult = {
  isAppropriate: boolean;
  isRelevant: boolean;
  safetyFlag: string | null;
  relevanceFlag: string | null;
  confidence: number;
  description: string;
  reasoning: string;
  modelUsed: string;
};

export async function inspectIssueImage(
  input: IssueAnalysisInput,
  imageUrl: string
): Promise<ImageInspectionResult | null> {
  if (!imageUrl || typeof imageUrl !== "string" || !imageUrl.trim()) {
    return null;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === "your_openrouter_api_key_here") {
    return null;
  }

  // Vision-capable models on OpenRouter (free tier)
  const visionModels = [
    process.env.OPENROUTER_VISION_MODEL || "dots-studio/dots-3-note-preview:free",
    "google/gemma-4-31b-it:free",
    "openrouter/free",
  ].filter((v, i, a) => a.indexOf(v) === i);

  const prompt = `You are an AI Safety & Visual Relevance Sentinel for a college campus infrastructure reporting platform.
A campus member has submitted a problem ticket with the following details:
- Issue Title: "${input.title}"
- Problem Description: "${input.description}"
- Reported Location: "${input.location || "Campus Facilities"}"
- Category: "${input.category || "General Infrastructure"}"

You are provided with an image uploaded as evidence for this problem ticket.
Your task is to thoroughly analyze the image and verify two critical criteria:

1. APPROPRIATENESS & CONTENT SAFETY:
Ensure the image DOES NOT contain:
- Inappropriate, NSFW, sexually suggestive, or adult content
- Graphic violence, gore, weapons, or physical harm
- Hate symbols, profanity, harassment, or offensive signs
- Personally identifiable confidential information

2. RELEVANCE TO THE REPORTED PROBLEM:
Validate whether the image is actually relevant to the reported campus problem:
- Does the image show the described equipment, classroom, lab, campus facility, electrical/plumbing defect, physical damage, or infrastructure?
- Is it completely irrelevant spam (e.g., memes, celebrity photos, random video game screenshots, anime/cartoons, personal selfies, random internet downloads, or blank images)?

Output strict JSON with this exact schema:
{
  "isAppropriate": boolean,
  "isRelevant": boolean,
  "safetyFlag": null | "INAPPROPRIATE_CONTENT" | "NSFW" | "VIOLENCE" | "HARASSMENT",
  "relevanceFlag": null | "IRRELEVANT_IMAGE" | "MEME_OR_SPAM",
  "confidence": number,
  "description": string,
  "reasoning": string
}`;

  for (const model of visionModels) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 18000);

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://slashforge.campus.local",
          "X-Title": "Slashforge Campus Management",
        },
        body: JSON.stringify({
          model,
          reasoning: { max_tokens: 0 },
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: imageUrl } },
              ],
            },
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(`[OpenRouter Vision Sentinel] Model ${model} returned HTTP ${response.status}`);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) continue;

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log(`[OpenRouter Vision Sentinel] Inspection via ${model} -> Appropriate: ${parsed.isAppropriate}, Relevant: ${parsed.isRelevant}`);
        return {
          isAppropriate: typeof parsed.isAppropriate === "boolean" ? parsed.isAppropriate : true,
          isRelevant: typeof parsed.isRelevant === "boolean" ? parsed.isRelevant : true,
          safetyFlag: typeof parsed.safetyFlag === "string" ? parsed.safetyFlag : null,
          relevanceFlag: typeof parsed.relevanceFlag === "string" ? parsed.relevanceFlag : null,
          confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.8,
          description: typeof parsed.description === "string" ? parsed.description : "",
          reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "",
          modelUsed: `openrouter/${model}`,
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[OpenRouter Vision Sentinel] Model ${model} attempt failed: ${msg}`);
      continue;
    }
  }

  return null;
}

export async function analyzeIssue(
  input: IssueAnalysisInput,
  existingIssues: ExistingIssueContext[] = [],
  duplicateCandidates: DuplicateCandidate[] = []
): Promise<IssueAnalysisResult> {
  const fallback = analyzeIssueLocally(input, duplicateCandidates);

  // 1. If an image attachment is provided, inspect it with OpenRouter vision models
  let imageInspection: ImageInspectionResult | null = null;
  const imageAttachment = input.attachments?.find(
    (att): att is string =>
      typeof att === "string" &&
      att.trim().length > 0 &&
      (att.startsWith("data:image/") || att.startsWith("http://") || att.startsWith("https://"))
  );
  if (imageAttachment) {
    try {
      imageInspection = await inspectIssueImage(input, imageAttachment);
    } catch (err) {
      console.warn("[OpenRouter Vision Sentinel] Image inspection threw an error:", err);
    }
  }

  // 2. Perform text triage analysis
  let analysis: IssueAnalysisResult;
  try {
    analysis = await analyzeIssueWithGemini(input, existingIssues, duplicateCandidates, fallback);
  } catch (error) {
    console.warn("Gemini analysis unavailable, falling back to local analyzer", error);
    analysis = fallback;
  }

  // 3. Integrate image safety and relevance signals into analysis
  if (imageInspection) {
    if (!imageInspection.isAppropriate) {
      analysis.moderationFlags.push("INAPPROPRIATE_IMAGE");
      if (imageInspection.safetyFlag) {
        analysis.moderationFlags.push(imageInspection.safetyFlag);
      }
      analysis.spamScore = Math.max(analysis.spamScore, 0.95);
      analysis.confidence = Math.min(analysis.confidence, 0.1);
      analysis.reasoning = `[Image Safety Alert] Inappropriate/unsafe image detected: ${imageInspection.reasoning}. ${analysis.reasoning}`;
    } else if (!imageInspection.isRelevant) {
      analysis.moderationFlags.push("IRRELEVANT_IMAGE");
      if (imageInspection.relevanceFlag) {
        analysis.moderationFlags.push(imageInspection.relevanceFlag);
      }
      analysis.spamScore = Math.min(1.0, analysis.spamScore + 0.35);
      analysis.confidence = Math.max(0.1, analysis.confidence - 0.25);
      analysis.reasoning = `[Image Relevance Note] Uploaded image not relevant to problem: ${imageInspection.reasoning}. ${analysis.reasoning}`;
    } else {
      analysis.confidence = Math.min(1.0, analysis.confidence + 0.15);
      analysis.spamScore = Math.max(0.0, analysis.spamScore - 0.1);
      analysis.reasoning = `[Image Evidence Verified] ${imageInspection.description}. ${analysis.reasoning}`;
    }
  }

  return analysis;
}
