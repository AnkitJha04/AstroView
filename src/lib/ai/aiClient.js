const DEFAULT_PROVIDER = "openrouter";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const AI_PROVIDER = (import.meta.env.VITE_AI_PROVIDER || DEFAULT_PROVIDER).toLowerCase();

const OPENROUTER_MODEL =
  import.meta.env.VITE_OPENROUTER_MODEL ||
  "mistralai/mistral-7b-instruct:free";
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";
const OPENROUTER_SITE_URL = import.meta.env.VITE_OPENROUTER_SITE_URL || "";
const OPENROUTER_APP_NAME = import.meta.env.VITE_OPENROUTER_APP_NAME || "AstroView";

const OLLAMA_BASE_URL = import.meta.env.VITE_OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || "llama3.1:latest";

const STYLE_INSTRUCTIONS =
  "Respond in plain text only. Do not use markdown, bullets, tables, bold, italics, or special formatting. " +
  "If listing points, use short numbered lines like '1) ...' (max 4). Keep it concise for a general audience. " +
  "End with one line that is a fun or surprising fact related to the topic."+
  "Do not include any emojis or special characters."+
  "If you don't know the answer, say 'Sorry, I don't have that information.'"+
  "Give a fun fact related to the topic at the end of your response if its actually a good one.";

const hasOpenRouterKey = Boolean(OPENROUTER_API_KEY);

export const getAiProvider = () => {
  if (AI_PROVIDER === "ollama") return "ollama";
  return hasOpenRouterKey ? "openrouter" : "ollama";
};

export const getAiProviderLabel = () =>
  getAiProvider() === "ollama" ? "Ollama" : "OpenRouter";

export const getAiProviderDetails = () =>
  getAiProvider() === "ollama"
    ? `Ollama (${OLLAMA_MODEL})`
    : `OpenRouter (${OPENROUTER_MODEL})`;

export const getAiProviderHelp = () =>
  getAiProvider() === "ollama"
    ? "Make sure Ollama is running on localhost:11434 or set VITE_OLLAMA_BASE_URL."
    : "Set VITE_OPENROUTER_API_KEY or switch to Ollama with VITE_AI_PROVIDER=ollama.";

export const getAiModelName = () =>
  getAiProvider() === "ollama" ? OLLAMA_MODEL : OPENROUTER_MODEL;

const buildOpenRouterHeaders = () => {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${OPENROUTER_API_KEY}`
  };

  if (OPENROUTER_SITE_URL) {
    headers["HTTP-Referer"] = OPENROUTER_SITE_URL;
  }

  if (OPENROUTER_APP_NAME) {
    headers["X-Title"] = OPENROUTER_APP_NAME;
  }

  return headers;
};

const generateOpenRouterText = async ({ prompt, system, temperature, maxTokens, signal, model }) => {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key missing.");
  }

  const messages = [];
  const combinedSystem = system ? `${system}\n\n${STYLE_INSTRUCTIONS}` : STYLE_INSTRUCTIONS;
  messages.push({ role: "system", content: combinedSystem });
  messages.push({ role: "user", content: prompt });

  const res = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: buildOpenRouterHeaders(),
    body: JSON.stringify({
      model: model || OPENROUTER_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens
    }),
    signal
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.message || "OpenRouter request failed";
    throw new Error(message);
  }

  return data?.choices?.[0]?.message?.content || "";
};

const generateOllamaText = async ({ prompt, temperature, maxTokens, signal, model, system }) => {
  const options = {};
  if (typeof temperature === "number") {
    options.temperature = temperature;
  }
  if (typeof maxTokens === "number") {
    options.num_predict = maxTokens;
  }

  const combinedPrompt = system
    ? `${system}\n\n${STYLE_INSTRUCTIONS}\n\n${prompt}`
    : `${STYLE_INSTRUCTIONS}\n\n${prompt}`;

  const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model || OLLAMA_MODEL,
      prompt: combinedPrompt,
      stream: false,
      options
    }),
    signal
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || "Ollama request failed");
  }

  const data = JSON.parse(text);
  return data?.response || data?.message?.content || "";
};

export const generateAiText = async ({
  prompt,
  system,
  temperature = 0.7,
  maxTokens = 350,
  signal,
  model
}) => {
  if (!prompt) return "";

  if (getAiProvider() === "ollama") {
    return generateOllamaText({
      prompt,
      system,
      temperature,
      maxTokens,
      signal,
      model: model || OLLAMA_MODEL
    });
  }

  if (!hasOpenRouterKey) {
    return generateOllamaText({
      prompt,
      system,
      temperature,
      maxTokens,
      signal,
      model: OLLAMA_MODEL
    });
  }

  try {
    return await generateOpenRouterText({ prompt, system, temperature, maxTokens, signal, model });
  } catch (err) {
    return generateOllamaText({
      prompt,
      system,
      temperature,
      maxTokens,
      signal,
      model: OLLAMA_MODEL
    });
  }
};

export const fetchLocalOllamaModels = async (signal) => {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { signal });
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  if (!Array.isArray(data?.models)) return [];
  return data.models.map((model) => model.name).filter(Boolean);
};

export default {
  generateAiText,
  getAiProvider,
  getAiProviderLabel,
  getAiProviderDetails,
  getAiProviderHelp,
  getAiModelName,
  fetchLocalOllamaModels
};
