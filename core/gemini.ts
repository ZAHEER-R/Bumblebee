import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_MODELS } from "./models";

function shouldRotateModel(error: unknown) {
  if (typeof error !== "object" || error === null) return /429|404|5\d\d|quota|rate.?limit|resource.?exhausted|not found/i.test(String(error));
  const status = "status" in error && typeof error.status === "number" ? error.status : 0;
  const message = error instanceof Error ? error.message : String(error);
  return (status === 400 && /model.*(?:unavailable|unsupported|not found)/i.test(message)) ||
    status === 404 || status === 429 || status >= 500 ||
    /quota|rate.?limit|resource.?exhausted|not found|model.*(?:unavailable|unsupported|not found)/i.test(message);
}

export async function askGemini(message: string, preferredModel?: string) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (
    !apiKey ||
    apiKey === "PASTE_YOUR_GEMINI_API_KEY_HERE" ||
    apiKey === "your_google_ai_studio_api_key"
  ) {
    throw new Error("Add your Google AI Studio key to GEMINI_API_KEY in .env.local, then restart the app.");
  }

  const prompt = `You are Bumblebee, a helpful desktop AI assistant.
Answer the user's request accurately and naturally. Keep the response concise and easy to speak aloud.
This request is running in browser-only mode and cannot access Windows applications, files, keyboard input, media controls, or PowerShell. Never claim that a desktop action was completed. Explain briefly that local Windows actions require the Bumblebee desktop app.

User: ${message}`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const preferredIndex = preferredModel ? GEMINI_MODELS.indexOf(preferredModel) : -1;
  const startingIndex = preferredIndex >= 0 ? preferredIndex : 0;
  for (let attempt = 0; attempt < GEMINI_MODELS.length; attempt++) {
    const modelIndex = (startingIndex + attempt) % GEMINI_MODELS.length;
    const modelName = GEMINI_MODELS[modelIndex];
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return { reply: result.response.text(), model: modelName };
    } catch (error) {
      if (!shouldRotateModel(error) || attempt === GEMINI_MODELS.length - 1) {
        console.error(`Gemini generation failed using ${modelName}:`, error);
        if (error instanceof Error) {
          throw new Error(`Gemini request failed: ${error.message}`);
        }
        throw new Error("Gemini request failed. Check the server log for details.");
      }

      console.warn(`Gemini model ${modelName} is temporarily unavailable; trying ${GEMINI_MODELS[(modelIndex + 1) % GEMINI_MODELS.length]}.`);
    }
  }

  throw new Error("Gemini request failed without a response.");
}