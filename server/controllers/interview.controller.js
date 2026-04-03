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
          question: `Write the logic to reverse a string without using built-in reverse methods.`,
          difficulty: "easy",
          timeLimit: 120,
        },
        {
          question: `Describe how you would design error handling in a production-level ${role} project.`,
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
