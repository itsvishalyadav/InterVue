import axios from "axios"

export const askAi = async (messages, model = "deepseek/deepseek-chat", options = {}) => {
    try {
        if(!messages || !Array.isArray(messages) || messages.length === 0) {
            throw new Error("Messages array is empty.");
        }
        const {
            maxTokens = 2200,
            temperature,
        } = options;
        const response = await axios.post("https://openrouter.ai/api/v1/chat/completions",
            {
                model,
                messages: messages,
                max_tokens: maxTokens,
                ...(typeof temperature === "number" ? { temperature } : {}),

            },
            {
            headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
        },});

        const content = response?.data?.choices?.[0]?.message?.content;

        if (!content || !content.trim()) {
      throw new Error("AI returned empty response.");
    }

    return content
    } catch (error) {
            console.error("OpenRouter Error:", error.response?.data || error.message);
    throw new Error("OpenRouter API Error");

    }
}
