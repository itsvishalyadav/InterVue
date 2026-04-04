import fs from "fs"
import os from "os";
import path from "path";
import { execFile } from "child_process";
import { askAi } from "../services/openRouter.service.js";
import { analyzeAtsScore } from "../services/ats.service.js";
import User from "../models/user.model.js";
import Interview from "../models/interview.model.js";

const QUICK_RUN_TIMEOUT_MS = 5000;
const MAX_OUTPUT_LENGTH = 12000;

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

const parseAiJson = (value) => {
  const trimmed = value?.trim?.() || "";
  const withoutFences = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  return JSON.parse(extractFirstJsonValue(withoutFences));
};

const clipOutput = (value = "") => {
  if (value.length <= MAX_OUTPUT_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_OUTPUT_LENGTH)}\n\n[output truncated]`;
};

const execFileAsync = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    execFile(command, args, options, (error, stdout, stderr) => {
      if (error) {
        reject({
          error,
          stdout: stdout || "",
          stderr: stderr || "",
        });
        return;
      }

      resolve({
        stdout: stdout || "",
        stderr: stderr || "",
      });
    });
  });

const DIFFICULTY_WEIGHTS = {
  easy: 0,
  medium: 1,
  hard: 2,
};

const COMPANY_TAG_POOL = [
  "Google",
  "Meta",
  "Amazon",
  "Microsoft",
  "Netflix",
  "Apple",
  "Uber",
  "Airbnb",
  "LinkedIn",
  "Atlassian",
  "Stripe",
  "Adobe",
];

const YEAR_TAG_POOL = ["2021", "2022", "2023", "2024", "2025", "2026"];

const ROUND_TAG_POOL = [
  "Online Assessment",
  "Phone Screen",
  "Tech Round 1",
  "Tech Round 2",
  "Coding Round",
  "Hiring Loop",
];

const shuffleList = (items = []) => {
  const cloned = [...items];

  for (let index = cloned.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [cloned[index], cloned[swapIndex]] = [cloned[swapIndex], cloned[index]];
  }

  return cloned;
};

const normalizeForMatching = (value = "") =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isPersonalizedCodingQuestion = ({ question = "", projects = [] }) => {
  const normalizedQuestion = normalizeForMatching(question);

  if (!normalizedQuestion) {
    return false;
  }

  const candidateContextPatterns = [
    /\byour experience\b/,
    /\byour project\b/,
    /\byour projects\b/,
    /\bon your resume\b/,
    /\bfrom your resume\b/,
    /\bbased on your\b/,
    /\byou built\b/,
    /\byou worked on\b/,
    /\byou have worked\b/,
    /\byour background\b/,
    /\byour previous\b/,
    /\byour past\b/,
    /\bgiven your\b/,
  ];

  if (candidateContextPatterns.some((pattern) => pattern.test(normalizedQuestion))) {
    return true;
  }

  return (projects || []).some((project) => {
    const normalizedProject = normalizeForMatching(project);
    if (!normalizedProject) {
      return false;
    }

    return normalizedProject.length >= 4 && normalizedQuestion.includes(normalizedProject);
  });
};

const buildQuestionInterviewTag = ({ question, questionType, projects, tagIndex, companies, years, rounds }) => {
  const isEligibleCodingQuestion =
    questionType === "coding" &&
    !isPersonalizedCodingQuestion({ question, projects });

  if (!isEligibleCodingQuestion) {
    return {
      companyTag: "",
      yearTag: "",
      roundTag: "",
    };
  }

  return {
    companyTag: companies[tagIndex % companies.length],
    yearTag: years[tagIndex % years.length],
    roundTag: rounds[tagIndex % rounds.length],
  };
};

const normalizeQuestionSignature = (value = "") =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getQuestionTokens = (value = "") =>
  normalizeQuestionSignature(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 2);

const calculateTokenSimilarity = (left = "", right = "") => {
  const leftTokens = new Set(getQuestionTokens(left));
  const rightTokens = new Set(getQuestionTokens(right));

  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }

  let intersectionCount = 0;
  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) {
      intersectionCount += 1;
    }
  });

  return intersectionCount / Math.max(leftTokens.size, rightTokens.size);
};

const hasQuestionOverlap = (questionText = "", seenSignatures = new Set()) => {
  const normalized = normalizeQuestionSignature(questionText);
  if (!normalized) {
    return false;
  }

  if (seenSignatures.has(normalized)) {
    return true;
  }

  const normalizedTokens = normalized.split(" ").filter((token) => token.length > 2);
  const normalizedCore = normalizedTokens.slice(0, 10).join(" ");

  if (normalizedCore && seenSignatures.has(normalizedCore)) {
    return true;
  }

  for (const signature of seenSignatures) {
    if (signature === normalized || (normalizedCore && signature === normalizedCore)) {
      return true;
    }

    if (calculateTokenSimilarity(normalized, signature) >= 0.9) {
      return true;
    }
  }

  return false;
};

const QUESTION_COUNT = 6;
const TECHNICAL_DIFFICULTY_SEQUENCE = ["easy", "easy", "medium", "medium", "medium", "hard"];
const QUESTION_GENERATION_ATTEMPTS = 3;

const buildTechnicalQuestionPrompt = ({ previousQuestionsText = "None" }) => `
You are a senior software engineer designing a realistic mock interview.

Return ONLY valid JSON as an array with exactly 6 items.
Each item must follow this exact shape:
{
  "question": "string",
  "category": "role_based" | "project_based" | "behavioral",
  "requiresCode": boolean,
  "questionType": "coding" | "debugging" | "discussion",
  "starterCode": "string"
}

You must produce exactly:
- 2 role_based questions
- 2 project_based questions
- 2 behavioral questions

Rules:
- role_based questions must be DSA or problem-solving oriented for the target role and must require code.
- project_based questions must come directly from the candidate's resume projects and must not repeat role_based questions.
- behavioral questions must be professional and realistic and must not require code.
- At least 4 of the 6 questions must require code overall.
- Keep all 6 questions clearly different from each other.
- Do not ask any question that is the same as, a rewording of, or substantially overlaps with any question listed in PREVIOUS_QUESTIONS.
- Keep each question to one sentence.
- Avoid generic filler wording.
- For debugging questions, starterCode must contain a short buggy JavaScript snippet relevant to the question.
- For coding questions, starterCode may contain a JavaScript function signature or a tiny scaffold.
- For discussion questions, starterCode must be an empty string.
- Do not wrap the JSON in markdown fences.

PREVIOUS_QUESTIONS:
${previousQuestionsText}
`;

const buildHrQuestionPrompt = ({ previousQuestionsText = "None" }) => `
You are a real human interviewer conducting a professional interview.

Generate exactly 6 interview questions.

Strict Rules:
- Return one question per line only.
- Each question must contain between 15 and 25 words.
- Each question must be a single complete sentence.
- Do NOT number them.
- Do NOT add explanations.
- Do NOT add extra text before or after.
- Keep language simple and conversational.
- Keep all 6 questions different from each other.
- Avoid any question that is the same as, a rewording of, or substantially overlaps with PREVIOUS_QUESTIONS.

Mix:
- 2 role-focused scenario questions
- 2 resume-project questions
- 2 behavioral questions

Difficulty progression:
Question 1 -> easy
Question 2 -> easy
Question 3 -> medium
Question 4 -> medium
Question 5 -> medium
Question 6 -> hard

PREVIOUS_QUESTIONS:
${previousQuestionsText}
`;

const createStarterCodeFromPrompt = (questionText = "") => {
  const lower = questionText.toLowerCase();

  if (lower.includes("debug") || lower.includes("fix") || lower.includes("bug")) {
    return `function solve(input) {\n  for (let index = 0; index <= input.length; index += 1) {\n    if (input[index] > 0) {\n      return input[index];\n    }\n  }\n\n  return -1;\n}\n`;
  }

  return `function solve(input) {\n  // implement your solution here\n  return input;\n}\n`;
};

const buildFallbackQuestions = ({ mode, role, projects = [], seenSignatures }) => {
  const topProject = projects[0] || "one project from your resume";
  const secondProject = projects[1] || projects[0] || "another project from your resume";

  if (mode !== "Technical") {
    const hrCandidates = [
      { category: "role_based", question: `Tell me about a time you had to make a difficult tradeoff while working as a ${role}.` },
      { category: "role_based", question: `How do you prioritize tasks when multiple stakeholders need different outcomes from you in the same week?` },
      { category: "project_based", question: `Walk me through the most important problem you solved in ${topProject} and how you approached it.` },
      { category: "project_based", question: `What would you improve if you had to rebuild ${secondProject} today with what you know now?` },
      { category: "behavioral", question: `Describe a time you received critical feedback and how you responded to it professionally.` },
      { category: "behavioral", question: `Tell me about a moment when you had to handle ambiguity and still deliver a strong outcome.` },
    ];

    return hrCandidates
      .filter((item) => !hasQuestionOverlap(item.question, seenSignatures))
      .slice(0, QUESTION_COUNT)
      .map((item) => ({
        ...item,
        requiresCode: false,
        questionType: "discussion",
        starterCode: "",
      }));
  }

  const technicalCandidates = [
    {
      category: "role_based",
      question: `Write a function to solve a realistic ${role} array or string optimization problem with edge-case handling.`,
      requiresCode: true,
      questionType: "coding",
    },
    {
      category: "role_based",
      question: `Implement a hash-map or graph based problem that demonstrates strong DSA fundamentals expected from a ${role}.`,
      requiresCode: true,
      questionType: "coding",
    },
    {
      category: "project_based",
      question: `Based on ${topProject}, implement one core function that reflects the main technical challenge you solved there.`,
      requiresCode: true,
      questionType: "coding",
    },
    {
      category: "project_based",
      question: `Using ${secondProject} as context, write code for a critical component you would expect to own in production.`,
      requiresCode: true,
      questionType: "coding",
    },
    {
      category: "behavioral",
      question: `Tell me about a time you made a technical decision under pressure and how you explained the tradeoff to your team.`,
      requiresCode: false,
      questionType: "discussion",
    },
    {
      category: "behavioral",
      question: `Describe a situation where your first implementation approach failed and what you changed to recover successfully.`,
      requiresCode: false,
      questionType: "discussion",
    },
  ];

  return technicalCandidates
    .filter((item) => !hasQuestionOverlap(item.question, seenSignatures))
    .slice(0, QUESTION_COUNT)
    .map((item) => ({
      ...item,
      starterCode: item.requiresCode ? createStarterCodeFromPrompt(item.question) : "",
    }));
};

const hasRequiredTechnicalMix = (questions = []) => {
  const counts = questions.reduce((total, item) => {
    const category = item.category || "general";
    total[category] = (total[category] || 0) + 1;
    return total;
  }, {});

  const requiredCodeCount = questions.filter((item) => item.requiresCode).length;
  const roleBasedCount = counts.role_based || 0;
  const projectBasedCount = counts.project_based || 0;
  const behavioralCount = counts.behavioral || 0;

  return (
    questions.length === QUESTION_COUNT &&
    roleBasedCount === 2 &&
    projectBasedCount === 2 &&
    behavioralCount === 2 &&
    requiredCodeCount >= 4 &&
    questions.slice(0, 2).every((item) => item.category === "role_based" && item.requiresCode) &&
    questions.slice(2, 4).every((item) => item.category === "project_based") &&
    questions.slice(4, 6).every((item) => item.category === "behavioral" && !item.requiresCode)
  );
};

const hasRequiredHrMix = (questions = []) => {
  const counts = questions.reduce((total, item) => {
    const category = item.category || "general";
    total[category] = (total[category] || 0) + 1;
    return total;
  }, {});

  return (
    questions.length === QUESTION_COUNT &&
    (counts.role_based || 0) === 2 &&
    (counts.project_based || 0) === 2 &&
    (counts.behavioral || 0) === 2
  );
};

const extractExperienceYears = (value = "") => {
  const yearsMatch = value.match(/(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)/i);
  if (yearsMatch) {
    return Number(yearsMatch[1]);
  }

  const plainNumber = value.match(/\b(\d+(?:\.\d+)?)\b/);
  return plainNumber ? Number(plainNumber[1]) : 0;
};

const estimateQuestionComplexity = ({ question = "", questionType = "discussion", requiresCode = false }) => {
  const lower = question.toLowerCase();
  const keywordGroups = [
    ["dynamic programming", "dp", "graph", "tree", "backtracking", "shortest path", "dfs", "bfs"],
    ["concurrency", "parallel", "thread", "locking", "race condition", "distributed", "consensus"],
    ["machine learning", "neural", "nlp", "tensorflow", "pytorch", "ranking", "wordnet", "vector"],
    ["optimize", "scale", "latency", "throughput", "memory", "tradeoff", "streaming", "real time"],
    ["debug", "broken", "bug", "fix", "edge case", "refactor", "test case"],
  ];

  const keywordScore = keywordGroups.reduce((total, group) => {
    return total + (group.some((term) => lower.includes(term)) ? 1 : 0);
  }, 0);

  const lengthScore = Math.min(3, Math.floor(question.trim().split(/\s+/).length / 18));
  const codingScore = requiresCode ? 2 : 0;
  const typeScore =
    questionType === "coding" ? 2 : questionType === "debugging" ? 1 : 0;

  return keywordScore + lengthScore + codingScore + typeScore;
};

const calculateTimePlan = ({
  mode,
  question,
  difficulty = "easy",
  questionType = "discussion",
  requiresCode = false,
  experience = "",
}) => {
  const difficultyWeight = DIFFICULTY_WEIGHTS[difficulty] ?? 0;
  const complexity = estimateQuestionComplexity({ question, questionType, requiresCode });
  const experienceYears = extractExperienceYears(experience);
  const experienceAdjustment = experienceYears >= 5 ? -30 : experienceYears >= 2 ? 0 : 45;

  if (mode === "Technical") {
    const baseSeconds = [300, 480, 720][difficultyWeight] || 300;
    const typeAdjustment =
      questionType === "coding" ? 90 : questionType === "debugging" ? 60 : 15;
    const complexityAdjustment = complexity * 25;
    const timeLimit = Math.max(
      240,
      Math.min(1200, baseSeconds + typeAdjustment + complexityAdjustment + experienceAdjustment)
    );

    const ratio =
      questionType === "coding"
        ? [0.28, 0.32, 0.38][difficultyWeight] || 0.28
        : questionType === "debugging"
          ? [0.24, 0.28, 0.32][difficultyWeight] || 0.24
          : [0.2, 0.24, 0.28][difficultyWeight] || 0.2;

    const minimumSubmissionTime = Math.max(
      60,
      Math.min(timeLimit - 30, Math.round(timeLimit * ratio + complexity * 10))
    );

    return { timeLimit, minimumSubmissionTime };
  }

  const baseSeconds = [75, 120, 180][difficultyWeight] || 75;
  const complexityAdjustment = complexity * 10;
  const timeLimit = Math.max(
    60,
    Math.min(300, baseSeconds + complexityAdjustment + Math.max(0, experienceAdjustment / 3))
  );
  const minimumSubmissionTime = Math.max(
    20,
    Math.min(timeLimit - 10, Math.round(timeLimit * ([0.22, 0.27, 0.33][difficultyWeight] || 0.22)))
  );

  return { timeLimit, minimumSubmissionTime };
};

const getRunnerConfig = (language) => {
  switch (language) {
    case "javascript":
      return {
        supported: true,
        fileName: "solution.js",
        command: "node",
        args: (filePath) => [filePath],
      };
    case "python":
      return {
        supported: true,
        fileName: "solution.py",
        command: "python3",
        args: (filePath) => [filePath],
      };
    case "cpp":
      return {
        supported: true,
        fileName: "solution.cpp",
        command: "c++",
        compileArgs: (filePath, outputPath) => [filePath, "-std=c++17", "-O2", "-o", outputPath],
        executeCommand: (outputPath) => outputPath,
        executeArgs: () => [],
      };
    case "typescript":
      return {
        supported: false,
        message: "Quick run for TypeScript needs a TypeScript runtime on the server. Submit is still available.",
      };
    case "java":
      return {
        supported: false,
        message: "Quick run for Java is unavailable because a Java runtime is not installed on the server.",
      };
    case "go":
      return {
        supported: false,
        message: "Quick run for Go is unavailable because the Go toolchain is not installed on the server.",
      };
    default:
      return {
        supported: false,
        message: `Quick run is not configured for ${language}.`,
      };
  }
};

const runCodeInSandbox = async ({ language, code }) => {
  const runner = getRunnerConfig(language);

  if (!runner.supported) {
    return {
      ok: false,
      output: runner.message,
      status: "unavailable",
    };
  }

  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "interviewiq-run-"));
  const sourcePath = path.join(tempDir, runner.fileName);
  const binaryPath = path.join(tempDir, "solution.out");

  try {
    await fs.promises.writeFile(sourcePath, code, "utf8");

    if (runner.compileArgs) {
      await execFileAsync(runner.command, runner.compileArgs(sourcePath, binaryPath), {
        cwd: tempDir,
        timeout: QUICK_RUN_TIMEOUT_MS,
        maxBuffer: MAX_OUTPUT_LENGTH,
      });
    }

    const executionCommand = runner.executeCommand ? runner.executeCommand(binaryPath) : runner.command;
    const executionArgs = runner.executeArgs ? runner.executeArgs(sourcePath, binaryPath) : runner.args(sourcePath);
    const result = await execFileAsync(executionCommand, executionArgs, {
      cwd: tempDir,
      timeout: QUICK_RUN_TIMEOUT_MS,
      maxBuffer: MAX_OUTPUT_LENGTH,
    });

    const combinedOutput = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();

    return {
      ok: true,
      output: clipOutput(combinedOutput || "Program finished with no output."),
      status: "success",
    };
  } catch (failure) {
    const errorMessage = failure?.stderr || failure?.stdout || failure?.error?.message || "Execution failed.";
    const didTimeout = failure?.error?.killed || failure?.error?.signal === "SIGTERM";

    return {
      ok: false,
      output: clipOutput(didTimeout ? "Execution timed out after 5 seconds." : errorMessage.trim()),
      status: didTimeout ? "timeout" : "error",
    };
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
};

export const analyzeResume = async (req, res) => {
  try {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

    if (!req.file) {
      return res.status(400).json({ message: "Resume required" });
    }
    const filepath = req.file.path

    const fileBuffer = await fs.promises.readFile(filepath)
    const uint8Array = new Uint8Array(fileBuffer)

    const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;

    let resumeText = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();

      const pageText = content.items.map(item => item.str).join(" ");
      resumeText += pageText + "\n";
    }

    resumeText = resumeText
      .replace(/\s+/g, " ")
      .trim();

    const messages = [
      {
        role: "system",
        content: `
Extract structured data from resume.

Return strictly JSON:

{
  "role": "string",
  "experience": "string",
  "projects": ["project1", "project2"],
  "skills": ["skill1", "skill2"]
}
`
      },
      {
        role: "user",
        content: resumeText
      }
    ];

    const aiResponse = await askAi(messages, "openai/gpt-4o-mini")
    const parsed = parseAiJson(aiResponse);

    fs.unlinkSync(filepath)

    res.json({
      role: parsed.role,
      experience: parsed.experience,
      projects: parsed.projects,
      skills: parsed.skills,
      resumeText
    });

  } catch (error) {
    console.error(error);

    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({ message: error.message });
  }
};

export const getAtsReport = async (req, res) => {
  try {
    const { targetRole, jobDescription, resumeText, skills, projects, extractedRole, experience } = req.body;

    if (!resumeText?.trim()) {
      return res.status(400).json({ message: "Resume analysis is required before ATS scoring." });
    }

    if (!targetRole?.trim() && !jobDescription?.trim()) {
      return res.status(400).json({ message: "Target role or job description is required." });
    }

    const report = await analyzeAtsScore({
      targetRole: targetRole?.trim() || extractedRole || "General role",
      jobDescription: jobDescription?.trim() || "",
      resumeText,
      skills: Array.isArray(skills) ? skills : [],
      projects: Array.isArray(projects) ? projects : [],
      extractedRole: extractedRole?.trim() || "",
      experience: experience?.trim() || "",
    });

    return res.status(200).json(report);
  } catch (error) {
    return res.status(500).json({ message: `failed to generate ats report ${error}` });
  }
};

export const quickRunCode = async (req, res) => {
  try {
    const { language, code } = req.body;

    if (!language?.trim()) {
      return res.status(400).json({ message: "Language is required." });
    }

    if (!code?.trim()) {
      return res.status(400).json({ message: "Code is required." });
    }

    const result = await runCodeInSandbox({
      language: language.trim(),
      code,
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ message: `failed to run code ${error}` });
  }
};

export const generateQuestion = async (req, res) => {
  try {
    let { role, experience, mode, resumeText, projects, skills } = req.body

    role = role?.trim();
    experience = experience?.trim();
    mode = mode?.trim();

    if (!role || !experience || !mode) {
      return res.status(400).json({ message: "Role, Experience and Mode are required." })
    }

    const user = await User.findById(req.userId)

    if (!user) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    if (user.credits < 50) {
      return res.status(400).json({
        message: "Not enough credits. Minimum 50 required."
      });
    }

    const projectText = Array.isArray(projects) && projects.length
      ? projects.join(", ")
      : "None";

    const skillsText = Array.isArray(skills) && skills.length
      ? skills.join(", ")
      : "None";

    const safeResume = resumeText?.trim() || "None";
    const resumeFingerprint = safeResume.toLowerCase();

    const previousInterviews = await Interview.find({
      userId: user._id,
      resumeText: safeResume,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("questions.question");

    const previousQuestionSignatures = new Set();
    const previousQuestionList = [];

    previousInterviews.forEach((interview) => {
      (interview.questions || []).forEach((item) => {
        const questionText = item?.question?.trim();
        if (!questionText) {
          return;
        }

        const normalized = normalizeQuestionSignature(questionText);
        const normalizedCore = normalized.split(" ").filter((token) => token.length > 2).slice(0, 10).join(" ");

        previousQuestionList.push(`- ${questionText}`);
        previousQuestionSignatures.add(normalized);
        if (normalizedCore) {
          previousQuestionSignatures.add(normalizedCore);
        }
      });
    });

    const previousQuestionsText = previousQuestionList.length
      ? previousQuestionList.join("\n")
      : "None";

    const userPrompt = `
Role:${role}
Experience:${experience}
InterviewMode:${mode}
Projects:${projectText}
Skills:${skillsText}
Resume:${safeResume}
ResumeFingerprint:${resumeFingerprint}
`;

    if (!userPrompt.trim()) {
      return res.status(400).json({
        message: "Prompt content is empty."
      });
    }

    const questionSystemPrompt = mode === "Technical"
      ? buildTechnicalQuestionPrompt({ previousQuestionsText })
      : buildHrQuestionPrompt({ previousQuestionsText });

    const inferTechnicalType = (questionText = "") => {
      const lower = questionText.toLowerCase();
      if (lower.includes("debug") || lower.includes("fix") || lower.includes("broken") || lower.includes("bug")) {
        return "debugging";
      }
      if (lower.includes("write") || lower.includes("implement") || lower.includes("code") || lower.includes("algorithm") || lower.includes("function")) {
        return "coding";
      }
      return "discussion";
    };

    const inferRequiresCode = (questionText = "", questionType = "discussion") => {
      if (questionType === "coding" || questionType === "debugging") return true;
      const lower = questionText.toLowerCase();
      return lower.includes("write") || lower.includes("implement") || lower.includes("code") || lower.includes("debug") || lower.includes("fix");
    };

    let questionsArray = [];

    for (let attempt = 0; attempt < QUESTION_GENERATION_ATTEMPTS; attempt += 1) {
      const messages = [
        {
          role: "system",
          content: questionSystemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ];

      const aiResponse = await askAi(messages);

      if (!aiResponse || !aiResponse.trim()) {
        continue;
      }

      let nextQuestions = [];

      if (mode === "Technical") {
        let questionDrafts = [];

        try {
          const parsed = parseAiJson(aiResponse);
          questionDrafts = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.questions) ? parsed.questions : [];
        } catch {
          questionDrafts = aiResponse
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .slice(0, QUESTION_COUNT)
            .map((question, index) => ({
              question,
              category: index < 2 ? "role_based" : index < 4 ? "project_based" : "behavioral",
              requiresCode: index < 4,
              questionType: index < 4 ? inferTechnicalType(question) : "discussion",
              starterCode: "",
            }));
        }

        nextQuestions = questionDrafts
          .filter((item) => item && typeof item.question === "string")
          .slice(0, QUESTION_COUNT)
          .map((item, index) => {
            const question = item.question.trim();
            const questionType = ["coding", "debugging", "discussion"].includes(item.questionType)
              ? item.questionType
              : inferTechnicalType(question);
            const fallbackCategory = index < 2 ? "role_based" : index < 4 ? "project_based" : "behavioral";
            const category = ["role_based", "project_based", "behavioral"].includes(item.category)
              ? item.category
              : fallbackCategory;
            const requiresCodeByCategory = category === "behavioral" ? false : true;

            return {
              question,
              category,
              requiresCode: category === "behavioral"
                ? false
                : typeof item.requiresCode === "boolean"
                  ? item.requiresCode
                  : requiresCodeByCategory || inferRequiresCode(question, questionType),
              questionType: category === "behavioral" ? "discussion" : questionType,
              starterCode: category === "behavioral" ? "" : typeof item.starterCode === "string" ? item.starterCode.trim() : "",
            };
          });
      } else {
        nextQuestions = aiResponse
          .split("\n")
          .map((q) => q.trim())
          .filter((q) => q.length > 0)
          .slice(0, QUESTION_COUNT)
          .map((question, index) => ({
            question,
            category: index < 2 ? "role_based" : index < 4 ? "project_based" : "behavioral",
            requiresCode: false,
            questionType: "discussion",
            starterCode: "",
          }));
      }

      nextQuestions = nextQuestions.filter((item, index, collection) => {
        const questionText = item?.question?.trim();
        if (!questionText) {
          return false;
        }

        const normalized = normalizeQuestionSignature(questionText);
        const firstIndex = collection.findIndex((candidate) => normalizeQuestionSignature(candidate.question) === normalized);

        if (firstIndex !== index) {
          return false;
        }

        return !hasQuestionOverlap(questionText, previousQuestionSignatures);
      });

      const hasValidMix = mode === "Technical"
        ? hasRequiredTechnicalMix(nextQuestions)
        : hasRequiredHrMix(nextQuestions);

      if (hasValidMix) {
        questionsArray = nextQuestions;
        break;
      }
    }

    if (questionsArray.length !== QUESTION_COUNT) {
      const fallbackQuestions = buildFallbackQuestions({
        mode,
        role,
        projects: Array.isArray(projects) ? projects : [],
        seenSignatures: previousQuestionSignatures,
      });

      if ((mode === "Technical" && hasRequiredTechnicalMix(fallbackQuestions)) || (mode !== "Technical" && hasRequiredHrMix(fallbackQuestions))) {
        questionsArray = fallbackQuestions;
      } else {
        return res.status(500).json({
          message: "AI failed to generate 6 unique questions for this resume. Please try again."
        });
      }
    }

    user.credits -= 50;
    await user.save();

    const shuffledCompanies = shuffleList(COMPANY_TAG_POOL);
    const shuffledYears = shuffleList(YEAR_TAG_POOL);
    const shuffledRounds = shuffleList(ROUND_TAG_POOL);
    let eligibleTagIndex = 0;

    const interview = await Interview.create({
      userId: user._id,
      role,
      experience,
      mode,
      resumeText: safeResume,
      questions: questionsArray.map((item, index) => {
        const difficulty = TECHNICAL_DIFFICULTY_SEQUENCE[index] || "medium";
        const { timeLimit, minimumSubmissionTime } = calculateTimePlan({
          mode,
          question: item.question,
          difficulty,
          questionType: item.questionType || "discussion",
          requiresCode: Boolean(item.requiresCode),
          experience,
        });

        const questionTags = buildQuestionInterviewTag({
          question: item.question,
          questionType: item.questionType || "discussion",
          projects,
          tagIndex: eligibleTagIndex,
          companies: shuffledCompanies,
          years: shuffledYears,
          rounds: shuffledRounds,
        });

        if (questionTags.companyTag) {
          eligibleTagIndex += 1;
        }

        return {
          question: item.question,
          difficulty,
          timeLimit,
          minimumSubmissionTime,
          category: item.category || "general",
          requiresCode: Boolean(item.requiresCode),
          questionType: item.questionType || "discussion",
          starterCode: item.starterCode || "",
          companyTag: questionTags.companyTag,
          yearTag: questionTags.yearTag,
          roundTag: questionTags.roundTag,
        };
      })
    })

    res.json({
      interviewId: interview._id,
      creditsLeft: user.credits,
      userName: user.name,
      questions: interview.questions
    });
  } catch (error) {
    return res.status(500).json({ message: `failed to create interview ${error}` })
  }
}
export const submitAnswer = async (req, res) => {
  try {
    const { interviewId, questionIndex, answer, timeTaken, code, language, explanation } = req.body

    const interview = await Interview.findById(interviewId)
    if (!interview) {
      return res.status(404).json({ message: "Interview not found." });
    }

    const question = interview.questions[questionIndex]
    if (!question) {
      return res.status(404).json({ message: "Question not found." });
    }

    const safeTimeTaken = Math.max(0, Math.round(Number(timeTaken) || 0));
    const minimumSubmissionTime = Math.max(0, question.minimumSubmissionTime || 0);
    const submittedTooEarly = safeTimeTaken > 0 && safeTimeTaken < minimumSubmissionTime;
    const timingFlag = submittedTooEarly
      ? `Submitted after ${safeTimeTaken}s, below the ${minimumSubmissionTime}s minimum review threshold.`
      : "";

    const hasTextAnswer = Boolean(answer?.trim());
    const hasCodeAnswer = Boolean(code?.trim());

    if (!hasTextAnswer && !hasCodeAnswer) {
      question.score = 0;
      question.feedback = "You did not submit an answer.";
      question.answer = "";
      question.code = "";
      question.language = language || question.language || "javascript";
      question.explanation = explanation || "";
      question.submittedAtSeconds = safeTimeTaken;
      question.submittedTooEarly = false;
      question.timingFlag = "";

      await interview.save();

      return res.json({
        feedback: question.feedback
      });
    }

    if (safeTimeTaken > question.timeLimit && interview.mode !== "Technical") {
      question.score = 0;
      question.feedback = "Time limit exceeded. Answer not evaluated.";
      question.answer = answer;
      question.code = code || "";
      question.language = language || question.language || "javascript";
      question.explanation = explanation || answer || "";
      question.submittedAtSeconds = safeTimeTaken;
      question.submittedTooEarly = false;
      question.timingFlag = "";

      await interview.save();

      return res.json({
        feedback: question.feedback
      });
    }

    const evaluationSystemPrompt = interview.mode === "Technical"
      ? `
You are a senior engineer evaluating a candidate's technical interview answer.

Return ONLY valid JSON in this format:
{
  "confidence": number,
  "communication": number,
  "correctness": number,
  "finalScore": number,
  "feedback": "short human feedback"
}

Technical interview scoring rules:
- Evaluate the submitted code directly when code is present.
- Check whether the code matches the task, the bug-fix request, or the algorithm being asked.
- Reward correct logic, sensible structure, debugging skill, edge-case awareness, and clear explanation.
- If the candidate improved a buggy starter snippet, judge whether the bug is truly fixed.
- If code was expected but not submitted, correctness must stay low unless the reasoning is exceptionally strong.
- Give partial credit for a strong approach even if the code is incomplete.
- Do not require perfect syntax for a strong score, but penalize obviously broken logic.

Scoring guidance:
- 0 to 3: mostly incorrect or missing
- 4 to 6: partial understanding with notable gaps
- 7 to 8: strong and mostly correct
- 9 to 10: excellent and interview-ready

Feedback rules:
- 14 to 28 words.
- Mention something specific about the code, debugging, or reasoning quality.
- Mention one improvement area if needed.
- Do not mention numeric scores.
`
      : `
You are a professional human interviewer evaluating a candidate's answer in a real interview.

Return ONLY valid JSON in this format:
{
  "confidence": number,
  "communication": number,
  "correctness": number,
  "finalScore": number,
  "feedback": "short human feedback"
}

Score the answer fairly for confidence, communication, and correctness.
Keep feedback concise, honest, and natural.
`;

    const messages = [
      {
        role: "system",
        content: evaluationSystemPrompt
      },
      {
        role: "user",
        content: `
Interview Mode: ${interview.mode}
Question Type: ${question.questionType || "discussion"}
Requires Code: ${question.requiresCode ? "yes" : "no"}
Question: ${question.question}
Language: ${language || question.language || "javascript"}
Starter Code:
${question.starterCode || "None"}
Explanation:
${explanation || answer || "No explanation submitted"}
Submitted Code:
${code || "No code submitted"}
Answer Text:
${answer || "No answer text submitted"}
`
      }
    ];

    const aiResponse = await askAi(messages)
    const parsed = parseAiJson(aiResponse);

    const feedbackWithTimingFlag = submittedTooEarly
      ? `${parsed.feedback} Submitted unusually early, so this response was flagged for reviewer attention.`
      : parsed.feedback;

    question.answer = answer;
    question.code = code || "";
    question.language = language || question.language || "javascript";
    question.explanation = explanation || answer || "";
    question.submittedAtSeconds = safeTimeTaken;
    question.submittedTooEarly = submittedTooEarly;
    question.timingFlag = timingFlag;
    question.confidence = parsed.confidence;
    question.communication = parsed.communication;
    question.correctness = parsed.correctness;
    question.score = parsed.finalScore;
    question.feedback = feedbackWithTimingFlag;
    await interview.save();

    return res.status(200).json({
      feedback: feedbackWithTimingFlag,
      submittedTooEarly,
      minimumSubmissionTime,
      timeTaken: safeTimeTaken,
    })
  } catch (error) {
    return res.status(500).json({ message: `failed to submit answer ${error}` })
  }
}

const recalculateProctoringSummary = (warnings = []) => {
  const warningCount = warnings.length;
  const activeWarnings = warnings.filter((warning) => warning.status === "active");
  const activeCount = activeWarnings.length;
  const lastEventAt = warnings.length
    ? warnings.reduce((latest, warning) => {
      const candidate = warning.endedAt || warning.startedAt;
      if (!latest || new Date(candidate) > new Date(latest)) {
        return candidate;
      }
      return latest;
    }, null)
    : null;

  // Risk should primarily represent what is happening right now, not linger
  // at a high score after the frame returns to normal.
  const activeRisk = activeWarnings.reduce((total, warning) => {
    const base = warning.severity === "high" ? 28 : 16;
    const liveDurationMs = Math.max(0, Date.now() - new Date(warning.startedAt).getTime());
    const durationFactor = Math.min(liveDurationMs / 4000, 3);
    return total + base + durationFactor * 8;
  }, 0);

  const resolvedWarnings = warnings.filter((warning) => warning.status !== "active");
  const historyBump = Math.min(
    resolvedWarnings.reduce((total, warning) => {
      const perEvent = warning.severity === "high" ? 3 : 1.5;
      return total + perEvent;
    }, 0),
    12
  );

  return {
    warningCount,
    activeCount,
    riskScore: activeCount > 0 ? Math.min(100, Math.round(activeRisk + historyBump)) : 0,
    lastEventAt,
  };
};

export const logProctoringEvent = async (req, res) => {
  try {
    const {
      interviewId,
      eventId,
      type,
      label,
      message,
      severity = "medium",
      status = "active",
      startedAt,
      endedAt = null,
      durationMs = 0,
      confidence = 0,
      meta = {},
    } = req.body;

    if (!interviewId || !eventId || !type || !startedAt) {
      return res.status(400).json({ message: "Missing proctoring event details." });
    }

    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return res.status(404).json({ message: "Interview not found." });
    }

    const warnings = interview.proctoring?.warnings || [];
    const existingIndex = warnings.findIndex((warning) => warning.eventId === eventId);
    const payload = {
      eventId,
      type,
      label: label || type,
      message: message || "",
      severity: severity === "high" ? "high" : "medium",
      status: status === "resolved" ? "resolved" : "active",
      startedAt,
      endedAt: status === "resolved" ? endedAt : null,
      durationMs: status === "resolved" ? durationMs || 0 : 0,
      confidence,
      meta,
    };

    if (existingIndex >= 0) {
      warnings[existingIndex] = {
        ...warnings[existingIndex].toObject?.(),
        ...payload,
      };
    } else {
      warnings.push(payload);
    }

    interview.proctoring = {
      warnings,
      summary: recalculateProctoringSummary(warnings),
    };

    await interview.save();

    return res.status(200).json(interview.proctoring.summary);
  } catch (error) {
    return res.status(500).json({ message: `failed to log proctoring event ${error}` });
  }
}

export const finishInterview = async (req, res) => {
  try {
    const { interviewId } = req.body
    const interview = await Interview.findById(interviewId)
    if (!interview) {
      return res.status(400).json({ message: "failed to find Interview" })
    }

    const totalQuestions = interview.questions.length;

    let totalScore = 0;
    let totalConfidence = 0;
    let totalCommunication = 0;
    let totalCorrectness = 0;

    interview.questions.forEach((q) => {
      totalScore += q.score || 0;
      totalConfidence += q.confidence || 0;
      totalCommunication += q.communication || 0;
      totalCorrectness += q.correctness || 0;
    });

    const finalScore = totalQuestions ? totalScore / totalQuestions : 0;
    const avgConfidence = totalQuestions ? totalConfidence / totalQuestions : 0;
    const avgCommunication = totalQuestions ? totalCommunication / totalQuestions : 0;
    const avgCorrectness = totalQuestions ? totalCorrectness / totalQuestions : 0;

    interview.finalScore = finalScore;
    interview.status = "completed";

    await interview.save();

    return res.status(200).json({
      finalScore: Number(finalScore.toFixed(1)),
      confidence: Number(avgConfidence.toFixed(1)),
      communication: Number(avgCommunication.toFixed(1)),
      correctness: Number(avgCorrectness.toFixed(1)),
      proctoring: interview.proctoring || { warnings: [], summary: { warningCount: 0, activeCount: 0, riskScore: 0, lastEventAt: null } },
      questionWiseScore: interview.questions.map((q) => ({
        question: q.question,
        score: q.score || 0,
        feedback: q.feedback || "",
        confidence: q.confidence || 0,
        communication: q.communication || 0,
        correctness: q.correctness || 0,
        timeLimit: q.timeLimit || 0,
        minimumSubmissionTime: q.minimumSubmissionTime || 0,
        submittedAtSeconds: q.submittedAtSeconds || 0,
        submittedTooEarly: Boolean(q.submittedTooEarly),
        timingFlag: q.timingFlag || "",
      })),
    })
  } catch (error) {
    return res.status(500).json({ message: `failed to finish Interview ${error}` })
  }
}

export const getMyInterviews = async (req, res) => {
  try {
    const interviews = await Interview.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .select("role experience mode finalScore status createdAt");

    return res.status(200).json(interviews)

  } catch (error) {
    return res.status(500).json({ message: `failed to find currentUser Interview ${error}` })
  }
}

export const getInterviewReport = async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id)

    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    const totalQuestions = interview.questions.length;

    let totalConfidence = 0;
    let totalCommunication = 0;
    let totalCorrectness = 0;

    interview.questions.forEach((q) => {
      totalConfidence += q.confidence || 0;
      totalCommunication += q.communication || 0;
      totalCorrectness += q.correctness || 0;
    });
    const avgConfidence = totalQuestions ? totalConfidence / totalQuestions : 0;
    const avgCommunication = totalQuestions ? totalCommunication / totalQuestions : 0;
    const avgCorrectness = totalQuestions ? totalCorrectness / totalQuestions : 0;

    return res.json({
      finalScore: interview.finalScore,
      confidence: Number(avgConfidence.toFixed(1)),
      communication: Number(avgCommunication.toFixed(1)),
      correctness: Number(avgCorrectness.toFixed(1)),
      proctoring: interview.proctoring || { warnings: [], summary: { warningCount: 0, activeCount: 0, riskScore: 0, lastEventAt: null } },
      questionWiseScore: interview.questions
    });

  } catch (error) {
    return res.status(500).json({ message: `failed to find currentUser Interview report ${error}` })
  }
}