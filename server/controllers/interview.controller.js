const buildMockEvaluation = ({ answer, mode }) => {
  const trimmedAnswer = answer.trim();
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

export const generateQuestion = async (req, res) => {
  try {
    const { role, experience, mode } = req.body;

    if (!role?.trim() || !experience?.trim() || !mode?.trim()) {
      return res.status(400).json({
        message: "Role, experience, and mode are required.",
      });
    }

    let questions = [];

    if (mode === "Technical") {
      questions = [
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
    } else {
      questions = [
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
    }

    return res.status(200).json({
      success: true,
      message: "Mock interview questions generated successfully.",
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

    const evaluation = buildMockEvaluation({
      answer,
      mode: mode?.trim() || "Technical",
    });

    return res.status(200).json({
      success: true,
      message: "Answer evaluated successfully.",
      question,
      answer,
      evaluation,
    });
  } catch (error) {
    return res.status(500).json({
      message: `Failed to submit answer: ${error.message}`,
    });
  }
};
