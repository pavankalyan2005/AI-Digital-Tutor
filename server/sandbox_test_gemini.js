import dotenv from "dotenv";
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

async function testGemini() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [
      {
        parts: [
          { text: "Hello! Tell me in 10 words what is machine learning." }
        ]
      }
    ]
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log("Success:", data.candidates?.[0]?.content?.parts?.[0]?.text);
    } else {
      const text = await res.text();
      console.error("Failed:", res.status, text);
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

testGemini();
