import { askAi } from "./openRouter.service.js";

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in",
  "is", "it", "of", "on", "or", "that", "the", "to", "with", "you", "your",
  "we", "our", "this", "will", "can", "using", "use", "have", "has", "had",
  "than", "into", "over", "under", "through", "across", "their", "them",
  "they", "who", "what", "when", "where", "why", "how", "years", "year",
  "role", "job", "resume", "candidate", "experience"
]);

const clampScore = (value) => Math.max(0, Math.min(100, Math.round(value || 0)));

const extractFirstJsonValue = (value = "") => {
  const startIndex = value.search(/[\[{]/);

  if (startIndex === -1) {
    return value;
  }

  const opening = value[startIndex];
  const closing = opening === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < value.length; index += 1) {
    const char = value[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === opening) {
      depth += 1;
      continue;
    }

    if (char === closing) {
      depth -= 1;
      if (depth === 0) {
        return value.slice(startIndex, index + 1);
      }
    }
  }

  return value;
};

const safeJsonParse = (value) => {
  const trimmed = value?.trim?.() || "";
  const withoutFences = trimmed.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
  return JSON.parse(extractFirstJsonValue(withoutFences));
};

const normalizeText = (value = "") =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (value = "") =>
  normalizeText(value)
    .split(" ")
    .map((item) => item.trim())
    .filter((item) => item.length > 2 && !STOP_WORDS.has(item));

const unique = (items = []) => [...new Set(items.filter(Boolean))];

const extractKeywords = ({ targetRole, jobDescription, skills, projects, experience }) => {
  const baseText = [
    targetRole,
    jobDescription,
    experience,
    ...(skills || []),
    ...(projects || []),
  ]
    .filter(Boolean)
    .join(" ");

  return unique(tokenize(baseText)).slice(0, 35);
};

const computeRuleScores = ({ resumeText, skills, projects, extractedRole, experience, keywords }) => {
  const normalizedResume = normalizeText([
    resumeText,
    extractedRole,
    experience,
    ...(skills || []),
    ...(projects || []),
  ].join(" "));

  const matchedKeywords = keywords.filter((keyword) => normalizedResume.includes(keyword));
  const missingKeywords = keywords.filter((keyword) => !normalizedResume.includes(keyword));
  const keywordCoverage = keywords.length ? (matchedKeywords.length / keywords.length) * 100 : 60;

  const skillScore = clampScore((skills?.length ? 60 : 30) + Math.min(matchedKeywords.length, 8) * 5);
  const projectScore = clampScore((projects?.length ? 55 : 25) + Math.min(projects?.length || 0, 4) * 8);
  const experienceScore = clampScore(experience ? 75 : 40);
  const formatSignals = ["experience", "skills", "project", "education", "summary"];
  const formatScore = clampScore(40 + formatSignals.filter((signal) => normalizedResume.includes(signal)).length * 12);

  return {
    keywordScore: clampScore(keywordCoverage),
    skillsScore: skillScore,
    experienceScore,
    projectsScore: projectScore,
    formatScore,
    overallScore: clampScore(
      keywordCoverage * 0.2 +
      skillScore * 0.3 +
      experienceScore * 0.2 +
      projectScore * 0.2 +
      formatScore * 0.1
    ),
    matchedKeywords: matchedKeywords.slice(0, 12),
    missingKeywords: missingKeywords.slice(0, 12),
  };
};

export const analyzeAtsScore = async ({
  targetRole,
  jobDescription,
  resumeText,
  skills,
  projects,
  extractedRole,
  experience,
}) => {
  const keywords = extractKeywords({ targetRole, jobDescription, skills, projects, experience });
  const ruleScores = computeRuleScores({
    resumeText,
    skills,
    projects,
    extractedRole,
    experience,
    keywords,
  });

  const messages = [
    {
      role: "system",
      content: `
You are an ATS evaluator.

Return only valid JSON in this exact shape:
{
  "overallScore": number,
  "keywordScore": number,
  "skillsScore": number,
  "experienceScore": number,
  "projectsScore": number,
  "formatScore": number,
  "matchedKeywords": ["string"],
  "missingKeywords": ["string"],
  "strengths": ["string"],
  "weaknesses": ["string"],
  "suggestions": ["string"]
}

Rules:
- Scores must be integers from 0 to 100.
- Keep strengths, weaknesses, and suggestions concise.
- Use the provided rule-based scores as the starting point.
`
    },
    {
      role: "user",
      content: JSON.stringify({
        targetRole,
        jobDescription: jobDescription || "Not provided",
        extractedRole,
        experience,
        skills,
        projects,
        ruleScores,
        resumeText: resumeText?.slice(0, 5000),
      }),
    }
  ];

  const aiResponse = await askAi(messages, "openai/gpt-4o-mini");
  const parsed = safeJsonParse(aiResponse);

  return {
    overallScore: clampScore(parsed.overallScore ?? ruleScores.overallScore),
    keywordScore: clampScore(parsed.keywordScore ?? ruleScores.keywordScore),
    skillsScore: clampScore(parsed.skillsScore ?? ruleScores.skillsScore),
    experienceScore: clampScore(parsed.experienceScore ?? ruleScores.experienceScore),
    projectsScore: clampScore(parsed.projectsScore ?? ruleScores.projectsScore),
    formatScore: clampScore(parsed.formatScore ?? ruleScores.formatScore),
    matchedKeywords: unique(parsed.matchedKeywords?.length ? parsed.matchedKeywords : ruleScores.matchedKeywords).slice(0, 12),
    missingKeywords: unique(parsed.missingKeywords?.length ? parsed.missingKeywords : ruleScores.missingKeywords).slice(0, 12),
    strengths: unique(parsed.strengths || []).slice(0, 4),
    weaknesses: unique(parsed.weaknesses || []).slice(0, 4),
    suggestions: unique(parsed.suggestions || []).slice(0, 5),
  };
};
