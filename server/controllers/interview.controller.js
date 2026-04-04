
import fs from "fs";

import { askAi } from "../services/openRouter.service.js";

const QUESTION_COUNT = 5;
const DEFAULT_MODE = "Technical";
const ALLOWED_DIFFICULTIES = ["easy", "medium", "hard"];

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

const parseAiJson = (value = "") => {
  const trimmed = value.trim();
  const withoutFences = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  return JSON.parse(extractFirstJsonValue(withoutFences));
};

const hasAiAccess = () => Boolean(process.env.OPENROUTER_API_KEY?.trim());

const clampScore = (value) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return 0;
  }

  return Math.max(0, Math.min(10, Number(numeric.toFixed(1))));
};

const buildMockQuestions = ({ role, mode }) => {
  if (mode === "Technical") {
    return [
      {
        question: `Explain the difference between var, let, and const in JavaScript for a ${role} role.`,
        difficulty: "easy",
        timeLimit: 60,
      },
      {
        question: `How would you optimize a slow-rendering component in a ${role} application?`,
        difficulty: "medium",
        timeLimit: 90,
      },
      {
        question: "Write the logic to reverse a string without using built-in reverse methods.",
        difficulty: "easy",
        timeLimit: 120,
      },
      {
        question: `Describe how you would design error handling in a production-level ${role} project.`,
        difficulty: "medium",
        timeLimit: 90,
      },
      {
        question: `How would you improve API calling and loading-state handling in a ${role} application?`,
        difficulty: "medium",
        timeLimit: 90,
      },
    ];
  }

  return [
    {
      question: "Tell me about yourself.",
      difficulty: "easy",
      timeLimit: 60,
    },
    {
      question: "Why do you want this role?",
      difficulty: "easy",
      timeLimit: 60,
    },
    {
      question: "Describe a challenge you faced in a project and how you solved it.",
      difficulty: "medium",
      timeLimit: 90,
    },
    {
      question: "Tell me about a time you worked in a team under pressure.",
      difficulty: "medium",
      timeLimit: 90,
    },
    {
      question: "What is one weakness you are actively trying to improve?",
      difficulty: "medium",
      timeLimit: 90,
    },
  ];
};

const buildMockEvaluation = ({ answer, mode }) => {
  const trimmedAnswer = answer.trim();

  if (!trimmedAnswer) {
    return {
      confidence: 0,
      communication: 0,
      correctness: 0,
      finalScore: 0,
      feedback: "No answer was submitted.",
    };
  }

  const wordCount = trimmedAnswer.split(/\s+/).filter(Boolean).length;
  const lowerAnswer = trimmedAnswer.toLowerCase();

  let confidence = 4;
  let communication = 4;
  let correctness = 4;

  if (wordCount >= 8) {
    confidence = 6;
    communication = 6;
    correctness = 6;
  }

  if (wordCount >= 18) {
    confidence = 7;
    communication = 7;
    correctness = 7;
  }

  if (wordCount >= 35) {
    confidence = 8;
    communication = 8;
    correctness = 8;
  }

  const strongKeywords = [
    "because",
    "example",
    "approach",
    "optimize",
    "performance",
    "tradeoff",
    "solution",
    "handle",
  ];

  if (strongKeywords.some((keyword) => lowerAnswer.includes(keyword))) {
    communication += 1;
    correctness += 1;
  }

  if (mode !== "Technical" && (lowerAnswer.includes("team") || lowerAnswer.includes("challenge"))) {
    confidence += 1;
  }

  confidence = Math.min(confidence, 10);
  communication = Math.min(communication, 10);
  correctness = Math.min(correctness, 10);

  const finalScore = Number(((confidence + communication + correctness) / 3).toFixed(1));

  let feedback = "Decent answer, but add more structure and specifics.";

  if (finalScore >= 8) {
    feedback = "Strong answer with clear structure and good detail.";
  } else if (finalScore >= 6) {
    feedback = "Good answer overall, but it needs a bit more depth.";
  } else if (finalScore >= 5) {
    feedback = "Average answer. Try to explain your reasoning more clearly.";
  }

  return {
    confidence,
    communication,
    correctness,
    finalScore,
    feedback,
  };
};

const normalizeQuestions = (items = []) => {
  const fallbackTimes = [60, 90, 120, 90, 90];

  return items
    .filter((item) => item && typeof item.question === "string" && item.question.trim())
    .slice(0, QUESTION_COUNT)
    .map((item, index) => ({
      question: item.question.trim(),
      difficulty: ALLOWED_DIFFICULTIES.includes(item.difficulty) ? item.difficulty : "medium",
      timeLimit:
        Number.isFinite(Number(item.timeLimit)) && Number(item.timeLimit) > 0
          ? Number(item.timeLimit)
          : fallbackTimes[index] || 90,
    }));
};

const normalizeEvaluation = (value = {}) => {
  const confidence = clampScore(value.confidence);
  const communication = clampScore(value.communication);
  const correctness = clampScore(value.correctness);
  const fallbackScore = Number(((confidence + communication + correctness) / 3).toFixed(1));
  const providedFinalScore = Number(value.finalScore);

  return {
    confidence,
    communication,
    correctness,
    finalScore: Number.isFinite(providedFinalScore) ? clampScore(providedFinalScore) : fallbackScore,
    feedback:
      typeof value.feedback === "string" && value.feedback.trim()
        ? value.feedback.trim()
        : "Solid attempt. Add more clarity and specifics in your answer.",
  };
};

const buildQuestionMessages = ({ role, experience, mode, resumeText, projects, skills }) => [
  {
    role: "system",
    content: `
You are a mock interview generator.

Return ONLY valid JSON as an array with exactly 5 items.
Each item must follow this shape:
{
  "question": "string",
  "difficulty": "easy" | "medium" | "hard",
  "timeLimit": number
}

Rules:
- If mode is Technical, generate realistic role-specific technical interview questions.
- If mode is HR, generate realistic behavioral/professional interview questions.
- YOU MUST incorporate the candidate's resume details, projects, and specific skills into the questions.
- Keep each question to one sentence.
- Do not wrap the JSON in markdown fences.
`,
  },
  {
    role: "user",
    content: `
Role: ${role}
Experience: ${experience}
Mode: ${mode}
Resume Text: ${resumeText && resumeText.trim() !== '' ? resumeText.substring(0, 500) + '...' : 'Not provided'}
Skills: ${skills && skills.length > 0 ? skills.join(', ') : 'Not provided'}
Projects: ${projects && projects.length > 0 ? projects.join(', ') : 'Not provided'}
`,
  },
];

const buildEvaluationMessages = ({ question, answer, mode }) => [
  {
    role: "system",
    content: `
You are evaluating a mock interview answer.

Return ONLY valid JSON in this format:
{
  "confidence": number,
  "communication": number,
  "correctness": number,
  "finalScore": number,
  "feedback": "string"
}

Rules:
- Scores must be between 0 and 10.
- feedback must be short, human, and realistic.
- Do not wrap the JSON in markdown fences.
`,
  },
  {
    role: "user",
    content: `
Interview Mode: ${mode}
Question: ${question}
Answer: ${answer}
`,
  },
];


const generateAiQuestions = async ({ role, experience, mode, resumeText, projects, skills }) => {
  const aiResponse = await askAi(buildQuestionMessages({ role, experience, mode, resumeText, projects, skills }));
  const parsed = parseAiJson(aiResponse);
  const questions = Array.isArray(parsed) ? parsed : parsed?.questions;
  const normalized = normalizeQuestions(questions);

  if (normalized.length !== QUESTION_COUNT) {
    throw new Error("AI did not return 5 valid questions.");
  }

  return normalized;
};

const evaluateAnswerWithAi = async ({ question, answer, mode }) => {
  const aiResponse = await askAi(buildEvaluationMessages({ question, answer, mode }));
  const parsed = parseAiJson(aiResponse);
  return normalizeEvaluation(parsed);
};

const evaluateAnswer = async ({ question, answer, mode }) => {
  const safeMode = mode?.trim() || DEFAULT_MODE;
  const trimmedAnswer = answer?.trim() || "";

  if (!trimmedAnswer) {
    return {
      source: "mock",
      evaluation: buildMockEvaluation({ answer: "", mode: safeMode }),
    };
  }

  if (!hasAiAccess()) {
    return {
      source: "mock",
      evaluation: buildMockEvaluation({ answer: trimmedAnswer, mode: safeMode }),
    };
  }

  try {
    const evaluation = await evaluateAnswerWithAi({
      question,
      answer: trimmedAnswer,
      mode: safeMode,
    });

    return {
      source: "ai",
      evaluation,
    };
  } catch {
    return {
      source: "mock",
      evaluation: buildMockEvaluation({ answer: trimmedAnswer, mode: safeMode }),
    };
  }
};

const buildOverallFeedback = ({ finalScore, mode }) => {
  if (finalScore >= 8) {
    return mode === "Technical"
      ? "Strong overall technical performance with clear reasoning and solid communication."
      : "Strong overall interview performance with clear communication and confident examples.";
  }

  if (finalScore >= 6) {
    return mode === "Technical"
      ? "Good technical baseline. Sharper detail and deeper explanation would improve the overall result."
      : "Good overall interview performance, but stronger examples and more depth would help.";
  }

  return mode === "Technical"
    ? "The basics are there, but the answers need more structure, accuracy, and technical depth."
    : "The answers need clearer structure and stronger examples to leave a better impression.";
};


const buildResumeFallback = (resumeText = "") => {
  const normalized = resumeText.toLowerCase();

  const skillPool = [
    "javascript",
    "typescript",
    "react",
    "node",
    "express",
    "mongodb",
    "firebase",
    "html",
    "css",
    "tailwind",
    "redux",
    "next.js",
    "python",
    "java",
    "sql",
    "git",
  ];

  const skills = skillPool.filter((skill) => normalized.includes(skill)).slice(0, 8);

  const experienceMatch = resumeText.match(/(\d+(?:\.\d+)?)\s*\+?\s*(years?|yrs?)/i);

  return {
    role: "",
    experience: experienceMatch ? experienceMatch[0] : "",
    projects: [],
    skills,
  };
};

export const analyzeResume = async (req, res) => {
  try {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

    if (!req.file) {
      return res.status(400).json({ message: "Resume required" });
    }

    const filePath = req.file.path;
    const fileBuffer = await fs.promises.readFile(filePath);
    const uint8Array = new Uint8Array(fileBuffer);

    const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;

    let resumeText = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => item.str).join(" ");
      resumeText += `${pageText}\n`;
    }

    resumeText = resumeText.replace(/\s+/g, " ").trim();

    let parsed;
    let source = "fallback";

    if (hasAiAccess()) {
      try {
        const messages = [
          {
            role: "system",
            content: `
Extract structured data from a resume.

Return ONLY valid JSON in this exact shape:
{
  "role": "string",
  "experience": "string",
  "projects": ["string"],
  "skills": ["string"]
}

Rules:
- role must be a short target title like "Frontend Developer", "Software Engineer", or "Data Analyst".
- experience must be a short normalized summary like "3 years", "3.5 years", "Fresher", or "5+ years".
- Do NOT return full job history, date ranges, company names, or paragraph text in experience.
- projects must contain only the most relevant 3 to 5 project names.
- skills must contain only the most relevant 8 to 12 skill names.
- Keep project and skill items short and deduplicated.
- If something is missing, return an empty string or empty array.
- Do not wrap the JSON in markdown fences.
`,
          },
          {
            role: "user",
            content: resumeText,
          },
        ];

        const aiResponse = await askAi(messages, "openai/gpt-4o-mini");
        parsed = parseAiJson(aiResponse);
        source = "ai";
      } catch {
        parsed = buildResumeFallback(resumeText);
        source = "fallback";
      }
    } else {
      parsed = buildResumeFallback(resumeText);
    }

    await fs.promises.unlink(filePath);

    return res.status(200).json({
      source,
      role: parsed.role || "",
      experience: parsed.experience || "",
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      resumeText,
    });
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      await fs.promises.unlink(req.file.path);
    }

    return res.status(500).json({
      message: `Failed to analyze resume: ${error.message}`,
    });
  }
};


export const generateQuestion = async (req, res) => {
  try {
    let { role, experience, mode, resumeText, projects, skills } = req.body;

    role = role?.trim();
    experience = experience?.trim();
    mode = mode?.trim();

    if (!role || !experience || !mode) {
      return res.status(400).json({
        message: "Role, experience, and mode are required.",
      });
    }

    let questions = buildMockQuestions({ role, mode });
    let source = "mock";

    if (hasAiAccess()) {
      try {
        questions = await generateAiQuestions({ role, experience, mode, resumeText, projects, skills });
        source = "ai";
      } catch {
        questions = buildMockQuestions({ role, mode });
        source = "mock";
      }
    }

    return res.status(200).json({
      success: true,
      message: "Interview questions generated successfully.",
      source,
      interview: {
        role,
        experience,
        mode,
        questions,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: `Failed to generate questions: ${error.message}`,
    });
  }
};

export const submitAnswer = async (req, res) => {
  try {
    const { question, answer, mode } = req.body;

    if (!question?.trim() || !answer?.trim()) {
      return res.status(400).json({
        message: "Question and answer are required.",
      });
    }

    const { evaluation, source } = await evaluateAnswer({
      question: question.trim(),
      answer: answer.trim(),
      mode: mode?.trim() || DEFAULT_MODE,
    });

    return res.status(200).json({
      success: true,
      message: "Answer evaluated successfully.",
      source,
      question: question.trim(),
      answer: answer.trim(),
      evaluation,
    });
  } catch (error) {
    return res.status(500).json({
      message: `Failed to submit answer: ${error.message}`,
    });
  }
};

export const finishInterview = async (req, res) => {
  try {
    const { answers, mode } = req.body;
    const safeMode = mode?.trim() || DEFAULT_MODE;

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({
        message: "A non-empty answers array is required.",
      });
    }

    const results = await Promise.all(
      answers.map(async (item) => {
        const question = item?.question?.trim();
        const answer = item?.answer?.trim() || "";

        if (!question) {
          return null;
        }

        if (item?.evaluation && typeof item.evaluation === "object") {
          const normalizedEvaluation = normalizeEvaluation(item.evaluation);

          return {
            question,
            answer,
            source: "provided",
            ...normalizedEvaluation,
          };
        }

        const { evaluation, source } = await evaluateAnswer({
          question,
          answer,
          mode: safeMode,
        });

        return {
          question,
          answer,
          source,
          ...evaluation,
        };
      })
    );

    const questionWiseScore = results.filter(Boolean);

    if (questionWiseScore.length === 0) {
      return res.status(400).json({
        message: "At least one valid question is required.",
      });
    }

    const totals = questionWiseScore.reduce(
      (accumulator, item) => {
        accumulator.finalScore += item.finalScore || 0;
        accumulator.confidence += item.confidence || 0;
        accumulator.communication += item.communication || 0;
        accumulator.correctness += item.correctness || 0;
        return accumulator;
      },
      {
        finalScore: 0,
        confidence: 0,
        communication: 0,
        correctness: 0,
      }
    );

    const count = questionWiseScore.length;

    const summary = {
      finalScore: Number((totals.finalScore / count).toFixed(1)),
      confidence: Number((totals.confidence / count).toFixed(1)),
      communication: Number((totals.communication / count).toFixed(1)),
      correctness: Number((totals.correctness / count).toFixed(1)),
    };

    summary.overallFeedback = buildOverallFeedback({
      finalScore: summary.finalScore,
      mode: safeMode,
    });

    return res.status(200).json({
      success: true,
      message: "Interview finished successfully.",
      summary,
      questionWiseScore,
    });
  } catch (error) {
    return res.status(500).json({
      message: `Failed to finish interview: ${error.message}`,
    });
  }
};
