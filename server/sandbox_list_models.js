import dotenv from "dotenv";
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

async function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.models) {
      console.log("Supported Models for generateContent:");
      const filtered = data.models.filter(m => m.supportedGenerationMethods.includes("generateContent"));
      filtered.forEach(m => {
        console.log(`- ${m.name}`);
      });
    } else {
      console.log("No models field in response:", data);
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

listModels();
