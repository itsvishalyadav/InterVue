export const languageOptions = [
  { label: "JavaScript", value: "javascript", monaco: "javascript" },
  { label: "Python", value: "python", monaco: "python" },
  { label: "Java", value: "java", monaco: "java" },
  { label: "C++", value: "cpp", monaco: "cpp" },
];

export const codeTemplates = {
  javascript: `function solve(input) {\n  // write your solution here\n  return input;\n}\n`,
  python: `def solve(input_data):\n    # write your solution here\n    return input_data\n`,
  java: `import java.util.*;\n\npublic class Solution {\n    public static Object solve(String input) {\n        // write your solution here\n        return input;\n    }\n\n    public static void main(String[] args) {\n        String input = args.length > 0 ? args[0] : \"\";\n        System.out.println(solve(input));\n    }\n}\n`,
  cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nstring solve(const string& input) {\n    // write your solution here\n    return input;\n}\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n\n    string input;\n    getline(cin, input);\n    cout << solve(input);\n    return 0;\n}\n`,
};

export const debugTemplates = {
  javascript: `function sumPositive(numbers) {\n  let total = 0;\n\n  for (let index = 0; index <= numbers.length; index += 1) {\n    if (numbers[index] > 0) {\n      total += numbers[index];\n    }\n  }\n\n  return total;\n}\n\nconsole.log(sumPositive([2, -1, 4]));\n`,
  python: `def sum_positive(numbers):\n    total = 0\n\n    for index in range(len(numbers) + 1):\n        if numbers[index] > 0:\n            total += numbers[index]\n\n    return total\n\nprint(sum_positive([2, -1, 4]))\n`,
  java: `import java.util.*;\n\npublic class Solution {\n    static int sumPositive(int[] numbers) {\n        int total = 0;\n\n        for (int index = 0; index <= numbers.length; index++) {\n            if (numbers[index] > 0) {\n                total += numbers[index];\n            }\n        }\n\n        return total;\n    }\n\n    public static void main(String[] args) {\n        System.out.println(sumPositive(new int[]{2, -1, 4}));\n    }\n}\n`,
  cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint sumPositive(const vector<int>& numbers) {\n    int total = 0;\n\n    for (size_t index = 0; index <= numbers.size(); index++) {\n        if (numbers[index] > 0) {\n            total += numbers[index];\n        }\n    }\n\n    return total;\n}\n\nint main() {\n    cout << sumPositive({2, -1, 4}) << endl;\n    return 0;\n}\n`,
};

export const quickRunSupport = {
  javascript: {
    available: true,
    label: "Quick run ready",
    description: "Runs locally on the interview server.",
  },
  python: {
    available: true,
    label: "Quick run ready",
    description: "Runs locally on the interview server.",
  },
  java: {
    available: false,
    label: "Review only",
    description: "Java runtime is not installed on the server yet.",
  },
  cpp: {
    available: true,
    label: "Quick run ready",
    description: "Compiles and runs locally on the interview server.",
  },
};

export const getCodeTemplate = (language) => codeTemplates[language] || codeTemplates.javascript;
export const getDebugTemplate = (language) => debugTemplates[language] || debugTemplates.javascript;
export const getMonacoLanguage = (language) => languageOptions.find((item) => item.value === language)?.monaco || 'javascript';

const sanitizeIdentifier = (value = "", fallback = "solve") => {
  const cleaned = value
    .replace(/[^a-zA-Z0-9_]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!cleaned.length) return fallback;

  const [first, ...rest] = cleaned;
  const identifier = [
    first.toLowerCase(),
    ...rest.map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()),
  ].join("");

  return /^[a-zA-Z_]/.test(identifier) ? identifier : fallback;
};

const toSnakeCase = (value = "", fallback = "solve") => {
  const normalized = value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  return normalized || fallback;
};

const extractFunctionInfo = (starterCode = "") => {
  const code = starterCode.trim();
  if (!code) {
    return null;
  }

  const patterns = [
    /function\s+([a-zA-Z_]\w*)\s*\(([^)]*)\)/,
    /def\s+([a-zA-Z_]\w*)\s*\(([^)]*)\)/,
    /(?:public|private|protected)?\s*(?:static\s+)?(?:[\w<>\[\]]+\s+)+([a-zA-Z_]\w*)\s*\(([^)]*)\)/,
    /([a-zA-Z_]\w*)\s*\(([^)]*)\)\s*\{/,
  ];

  for (const pattern of patterns) {
    const match = code.match(pattern);
    if (!match) continue;

    const [, rawName, rawParams = ""] = match;
    const params = rawParams
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item, index) => {
        const cleaned = item.replace(/=[^,]+/g, "").trim();
        const tokens = cleaned.split(/\s+/);
        const candidate = tokens[tokens.length - 1]?.replace(/[^a-zA-Z0-9_]/g, "") || `arg${index + 1}`;
        return candidate || `arg${index + 1}`;
      });

    return {
      name: sanitizeIdentifier(rawName),
      params: params.length ? params : ["input"],
    };
  }

  return null;
};

const inferFunctionInfoFromQuestion = (question = {}) => {
  const prompt = `${question?.question || ""}`.trim();
  const namedMatch = prompt.match(/function\s+(?:named\s+)?[`"']?([a-zA-Z_]\w*)[`"']?/i);
  if (namedMatch) {
    return { name: sanitizeIdentifier(namedMatch[1]), params: ["input"] };
  }

  const keywordMap = [
    ["textrank", "enhancedTextRank"],
    ["keyword extraction", "extractKeywords"],
    ["bandit", "selectBanditArm"],
    ["graph", "solveGraphProblem"],
    ["tree", "solveTreeProblem"],
    ["array", "solveArrayProblem"],
    ["string", "solveStringProblem"],
    ["linked list", "solveLinkedListProblem"],
  ];

  const lowered = prompt.toLowerCase();
  for (const [hint, fn] of keywordMap) {
    if (lowered.includes(hint)) {
      return { name: sanitizeIdentifier(fn), params: ["input"] };
    }
  }

  return { name: "solve", params: ["input"] };
};

const buildTranslatedStarter = (language, functionInfo) => {
  const info = functionInfo || { name: "solve", params: ["input"] };
  const jsName = sanitizeIdentifier(info.name, "solve");
  const pyName = toSnakeCase(info.name, "solve");
  const cppName = sanitizeIdentifier(info.name, "solve");
  const javaName = sanitizeIdentifier(info.name, "solve");
  const params = info.params.length ? info.params : ["input"];

  if (language === "python") {
    return `def ${pyName}(${params.map((param) => toSnakeCase(param, "input_data")).join(", ")}):\n    # write your solution here\n    pass\n`;
  }

  if (language === "cpp") {
    return `#include <bits/stdc++.h>\nusing namespace std;\n\nstring ${cppName}(const string& ${sanitizeIdentifier(params[0], "input")}) {\n    // write your solution here\n    return ${sanitizeIdentifier(params[0], "input")};\n}\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n\n    string input;\n    getline(cin, input);\n    cout << ${cppName}(input);\n    return 0;\n}\n`;
  }

  if (language === "java") {
    return `import java.util.*;\n\npublic class Solution {\n    public static Object ${javaName}(String ${sanitizeIdentifier(params[0], "input")}) {\n        // write your solution here\n        return ${sanitizeIdentifier(params[0], "input")};\n    }\n\n    public static void main(String[] args) {\n        String input = args.length > 0 ? args[0] : \"\";\n        System.out.println(${javaName}(input));\n    }\n}\n`;
  }

  return `function ${jsName}(${params.map((param) => sanitizeIdentifier(param, "input")).join(", ")}) {\n  // write your solution here\n  return ${sanitizeIdentifier(params[0], "input")};\n}\n`;
};

const LANGUAGE_HINTS = {
  python: [
    "python",
    "pandas",
    "numpy",
    "sklearn",
    "scikit",
    "matplotlib",
    "seaborn",
    "dataframe",
    "jupyter",
    "tensorflow",
    "pytorch",
    "data science",
    "machine learning",
    "nlp",
  ],
  java: ["java", "spring", "jvm", "hibernate", "maven"],
  cpp: ["c++", "cpp", "stl", "pointer", "competitive programming"],
  javascript: ["javascript", "node", "react", "frontend", "browser", "dom", "express"],
};

const detectLanguageFromStarterCode = (starterCode = "") => {
  const code = starterCode.trim().toLowerCase();

  if (!code) return null;
  if (code.includes("def ") || code.includes("none") || code.includes("print(")) return "python";
  if (code.includes("public class") || code.includes("system.out")) return "java";
  if (code.includes("#include") || code.includes("using namespace std")) return "cpp";
  if (code.includes("function ") || code.includes("console.log") || code.includes("=>")) return "javascript";
  return null;
};

export const inferPreferredLanguage = (question = {}) => {
  const starterLanguage = detectLanguageFromStarterCode(question?.starterCode || "");
  if (starterLanguage) {
    return starterLanguage;
  }

  const haystack = `${question?.question || ""} ${question?.category || ""} ${question?.questionType || ""}`.toLowerCase();

  for (const [language, hints] of Object.entries(LANGUAGE_HINTS)) {
    if (hints.some((hint) => haystack.includes(hint))) {
      return language;
    }
  }

  return "javascript";
};

export const getStarterCodeForQuestion = (question = {}, language = "javascript") => {
  if (question?.questionType === "debugging") {
    return getDebugTemplate(language);
  }

  const functionInfo = extractFunctionInfo(question?.starterCode || "") || inferFunctionInfoFromQuestion(question);
  return buildTranslatedStarter(language, functionInfo);
};
