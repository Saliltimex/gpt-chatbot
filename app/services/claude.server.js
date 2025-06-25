// chatgptService.js
import OpenAI from "openai";
import AppConfig from "./config.server";
import systemPrompts from "../prompts/prompts.json";

export function createChatGPTService(apiKey = process.env.OPENAI_API_KEY) {
  const openai = new OpenAI({ apiKey });

  const streamConversation = async (
    { messages, promptType = AppConfig.api.defaultPromptType, tools },
    streamHandlers
  ) => {
    const systemInstruction = getSystemPrompt(promptType);

    // Format messages with system prompt
    const chatMessages = [
      { role: "system", content: systemInstruction },
      ...messages,
    ];

    const stream = await openai.chat.completions.create({
      model: AppConfig.api.defaultModel, // e.g., 'gpt-4o'
      messages: chatMessages,
      tools,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.content && streamHandlers.onText) {
        streamHandlers.onText(delta.content);
      }

      // Handle function/tool calls if used
      const toolCall = delta?.tool_calls?.[0];
      if (toolCall && streamHandlers.onToolUse) {
        await streamHandlers.onToolUse(toolCall);
      }

      // Optionally collect full message
      if (streamHandlers.onMessage) {
        streamHandlers.onMessage(chunk);
      }
    }

    // You can return a final constructed message if needed
    return { success: true };
  };

  const getSystemPrompt = (promptType) => {
    return (
      systemPrompts.systemPrompts[promptType]?.content ||
      systemPrompts.systemPrompts[AppConfig.api.defaultPromptType].content
    );
  };

  return {
    streamConversation,
    getSystemPrompt,
  };
}

export default {
  createChatGPTService,
};
