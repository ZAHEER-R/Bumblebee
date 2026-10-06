const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
require("@next/env").loadEnvConfig(process.cwd());

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("Set GEMINI_API_KEY in .env.local before running this test.");
}

const ai = new GoogleGenerativeAI(apiKey);
const models = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.1-flash-lite",
];

async function test() {
  let lastError;
  for (const modelName of models) {
    try {
      const model = ai.getGenerativeModel({
        model: modelName,
        tools: [{
          functionDeclarations: [{
            name: "get_test_status",
            description: "Return a fixed status string for the Gemini tool-call smoke test.",
            parameters: {
              type: SchemaType.OBJECT,
              properties: { label: { type: SchemaType.STRING } },
              required: ["label"],
            },
          }],
        }],
      });
      const contents = [{
        role: "user",
        parts: [{ text: "Call get_test_status with label bumblebee-ready, then report its result." }],
      }];
      let result = await model.generateContent({ contents });
      const calls = result.response.functionCalls() || [];
      if (calls.length === 0) throw new Error(`${modelName} did not return the expected test function call.`);

      contents.push(result.response.candidates[0].content);
      contents.push({
        role: "user",
        parts: calls.map((call) => ({
          functionResponse: {
            name: call.name,
            response: { result: { status: call.args.label } },
          },
        })),
      });
      result = await model.generateContent({ contents });
      console.log(`Model: ${modelName}`);
      console.log(`Tool calls: ${calls.length}`);
      console.log(`Reply: ${result.response.text()}`);
      return;
    } catch (error) {
      lastError = error;
      const status = typeof error === "object" && error !== null && "status" in error ? error.status : 0;
      const errorText = String(error);
      const retryable =
        (status === 400 && /model.*(?:unavailable|unsupported|not found)/i.test(errorText)) ||
        status === 404 ||
        status === 429 ||
        status >= 500 ||
        /quota|rate.?limit|resource.?exhausted|not found|model.*(?:unavailable|unsupported|not found)/i.test(errorText);
      if (!retryable) break;
      console.warn(`${modelName} unavailable (${status || "model error"}); trying the next model.`);
    }
  }
  throw lastError ?? new Error("No Gemini model returned a response.");
}

test().catch((error) => {
  console.error("Gemini smoke test failed after model fallback:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});