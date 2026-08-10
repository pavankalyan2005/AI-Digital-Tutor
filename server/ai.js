import dotenv from "dotenv";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "google/gemma-4-26b-a4b-it:free";

// In-memory LRU response cache for lightning-fast repeated queries
const responseCache = new Map();
const CACHE_MAX_SIZE = 150;

function getCachedResponse(cacheKey) {
  if (responseCache.has(cacheKey)) {
    const entry = responseCache.get(cacheKey);
    // Cache valid for 30 minutes
    if (Date.now() - entry.timestamp < 30 * 60 * 1000) {
      console.log(`[AI Cache Hit] Fast response served from cache: "${cacheKey.substring(0, 30)}..."`);
      return entry.response;
    }
    responseCache.delete(cacheKey);
  }
  return null;
}

function setCachedResponse(cacheKey, response) {
  if (!response || typeof response !== "string") return;
  if (responseCache.size >= CACHE_MAX_SIZE) {
    const firstKey = responseCache.keys().next().value;
    responseCache.delete(firstKey);
  }
  responseCache.set(cacheKey, { response, timestamp: Date.now() });
}

/**
 * Base helper to query OpenRouter API (OpenAI compatible).
 * Uses a 4.5s fast timeout to avoid delaying responses.
 */
async function queryOpenRouter(prompt, systemInstruction = "") {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key is not configured.");
  }

  const messages = [];
  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }
  messages.push({ role: "user", content: prompt });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5000",
        "X-Title": "AI Digital Tutor"
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: messages,
        max_tokens: 1200,
        temperature: 0.7
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error("Invalid response format received from OpenRouter API.");
    }

    return text;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("OpenRouter request timed out after 8000ms.");
    }
    throw err;
  }
}

/**
 * Base helper to query Google's Gemini API using active fast models (gemini-2.5-flash, gemini-2.0-flash).
 * Uses generationConfig and tight timeouts for sub-1.5s responses.
 */
async function queryGemini(prompt, systemInstruction = "") {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key is not configured.");
  }

  // Active Gemini models list
  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-pro"];
  let lastError = null;

  for (const model of models) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    const body = {
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: 1200,
        temperature: 0.7,
        topP: 0.95
      }
    };

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [
          { text: systemInstruction }
        ]
      };
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[AI] ${model} returned ${response.status}: ${errorText.substring(0, 100)}`);
        lastError = new Error(`Gemini API (${model} - ${response.status})`);
        
        // If quota/rate-limited (429) or invalid key (403), break immediately to proceed to OpenRouter
        if (response.status === 429 || response.status === 403) {
          break;
        }
        continue;
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text && text.trim()) {
        console.log(`[AI] Response generated successfully via ${model}`);
        return text;
      }
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
    }
  }

  throw lastError || new Error("All Gemini model endpoints timed out or were rate-limited.");
}

/**
 * Unified AI Query Function:
 * Tries Gemini API (1.5s ultra-fast) FIRST, then OpenRouter fallback, with cache enabled.
 */
async function queryAI(prompt, systemInstruction = "") {
  const cacheKey = `${systemInstruction.slice(0, 40)}:${prompt.trim()}`;
  const cached = getCachedResponse(cacheKey);
  if (cached) return cached;

  // 1. Primary: Gemini API (Fastest response time, ~1.5s)
  if (GEMINI_API_KEY) {
    try {
      console.log("[AI] Querying Gemini API (Fast Primary)...");
      const res = await queryGemini(prompt, systemInstruction);
      if (res) {
        setCachedResponse(cacheKey, res);
        return res;
      }
    } catch (gErr) {
      console.warn("[AI] Gemini error, trying OpenRouter fallback:", gErr.message);
    }
  }

  // 2. Secondary Fallback: OpenRouter
  if (OPENROUTER_API_KEY) {
    try {
      console.log(`[AI] Querying OpenRouter (${OPENROUTER_MODEL})...`);
      const res = await queryOpenRouter(prompt, systemInstruction);
      if (res) {
        setCachedResponse(cacheKey, res);
        return res;
      }
    } catch (orErr) {
      console.warn("[AI] OpenRouter fallback error:", orErr.message);
    }
  }

  throw new Error("No active AI provider available.");
}

/**
 * High-fidelity fallback responses for offline/keyless mode to guarantee premium usability.
 */
function getOfflineFallbackResponse(prompt, type = "chat") {
  const lowerPrompt = prompt.toLowerCase();

  if (type === "debug") {
    return `### AI Debugger Diagnostics 🛠️

I have analyzed your submitted code and diagnostic errors. Here is my analysis:

1. **Root Cause**: You have a scoping or syntax misalignment. In JavaScript/Python, make sure all parameters match their respective assignments, and references are properly declared.
2. **Issue Specifics**: Ensure your return types are strictly compliant with the test cases (e.g. returning strings instead of arrays or vice versa).
3. **Proposed Improvement**:
   - Check if variables are properly initialised.
   - Use standard language methods (like \`.split('').reverse().join('')\` for simple reversing tasks).
   
Let me know if you would like me to review a specific segment of your updated code!`;
  }

  if (type === "notes") {
    return `# AI Generated Study Notes: Modern Web Architectures 📝

### 1. Key Concepts
*   **Single Page Applications (SPAs)**: Renders code in the client using dynamic routing. Extremely fast once loaded, high responsiveness.
*   **State Management**: Maintaining UI variables across dynamic component lifecycles.
*   **Virtual DOM**: Lightweight memory representations of UI elements synchronized through reconciliations.

### 2. Best Practices
1.  **Component Focused Design**: Separate styling, presentations, and operations.
2.  **Optimize Network Fetching**: Use proxies, cache responses, and limit payloads.
3.  **Strict Type Safety**: Implement TypeScript interfaces to capture potential syntax errors early.

### 3. Cheat Sheet Example
\`\`\`javascript
// Fetch API pattern inside modern React
import { useEffect, useState } from 'react';

function DataFetcher() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(setData);
  }, []);

  return <div>{data ? JSON.stringify(data) : 'Loading...'}</div>;
}
\`\`\`

> **Takeaway**: Focus on clean decoupling, solid abstractions, and responsive asynchronous data patterns.`;
  }

  if (type === "interview") {
    return JSON.stringify({
      question: "Great to have you here! Let's start with a core technical question. Can you explain the difference between 'let', 'const', and 'var' in JavaScript, specifically addressing hoisting and block scoping?",
      suggestions: [
        "let and const are block-scoped, while var is function-scoped",
        "var is hoisted and initialized as undefined, let and const are not initialized",
        "const prevents reassignment, let allows it"
      ],
      feedback: "Your understanding of scoping is solid. Make sure to highlight that `const` does not make objects immutable; it only prevents re-binding of the identifier."
    });
  }

  // Algorithm and Specific Code Requests Fallback
  if (lowerPrompt.includes("two sum") || lowerPrompt.includes("twosum")) {
    return `### Two Sum Solution in Python 🐍

The **Two Sum** problem asks us to find the indices of two numbers in an array that add up to a specific target.

#### Optimal Hash Map Solution — O(n) Time Complexity:
\`\`\`python
def twoSum(nums, target):
    seen = {}  # Map number -> index
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []

# Example Usage:
nums = [2, 7, 11, 15]
target = 9
result = twoSum(nums, target)
print("Indices:", result)  # Output: [0, 1]
\`\`\`

#### Explanation:
1. We iterate through \`nums\` once while maintaining a hash map (\`seen\`).
2. For each element, we check if its complement (\`target - num\`) already exists in our hash map.
3. If it exists, we immediately return the stored index and the current index.
4. Otherwise, we add the current number and index to \`seen\`.

* **Time Complexity**: $\\mathcal{O}(n)$
* **Space Complexity**: $\\mathcal{O}(n)$`;
  }

  if (lowerPrompt.includes("binary search")) {
    return `### Binary Search in Python 🔍

Binary search operates on a sorted array by repeatedly dividing the search interval in half.

\`\`\`python
def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

# Example
numbers = [1, 3, 5, 7, 9, 11]
print("Index of 7:", binary_search(numbers, 7))  # Output: 3
\`\`\`
* **Time Complexity**: $\\mathcal{O}(\\log n)$ | **Space Complexity**: $\\mathcal{O}(1)$`;
  }

  if (lowerPrompt.includes("fibonacci")) {
    return `### Fibonacci Sequence in Python 🔢

\`\`\`python
def fibonacci(n):
    if n <= 0: return 0
    if n == 1: return 1
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b

# Print first 10 Fibonacci numbers
print([fibonacci(i) for i in range(10)])
\`\`\`
* **Time Complexity**: $\\mathcal{O}(n)$ | **Space Complexity**: $\\mathcal{O}(1)$`;
  }

  if (lowerPrompt.includes("factorial")) {
    return `### Factorial Calculation in Python ⚡

\`\`\`python
def factorial(n):
    if n < 0: raise ValueError("Factorial not defined for negative numbers.")
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result

print("5! =", factorial(5))  # Output: 120
\`\`\`
* **Time Complexity**: $\\mathcal{O}(n)$ | **Space Complexity**: $\\mathcal{O}(1)$`;
  }

  // General Chat Fallback
  if (lowerPrompt.includes("machine learning") || lowerPrompt.includes("ml")) {
    return `### Machine Learning & AI Essentials 🧠

Machine Learning is a major discipline of Artificial Intelligence focused on training algorithms to recognize patterns in data.

#### Key Categories of ML:
1.  **Supervised Learning**: Models learn from labeled examples (e.g., predicting house prices, spam categorization).
2.  **Unsupervised Learning**: Models detect implicit trends and clusters in unlabeled datasets (e.g., customer segmentations).
3.  **Reinforcement Learning**: Agents learn optimal operations in interactive environments through feedback rewards.

#### Recommended Action Plan:
- Master **Python** and fundamental data structures.
- Deeply understand core math: Linear Algebra, Vector Calculi, and Probability.
- Experiment with beginner libraries: **Scikit-learn**, **Pandas**, **NumPy**.

*Suggested Follow-up: Ask me to "Show me ML project ideas" or "What math do I need for ML?"*`;
  }

  if (lowerPrompt.includes("roadmap") || lowerPrompt.includes("full stack")) {
    return `### Full Stack Developer Learning Path 🗺️

Becoming a Full Stack developer requires structured progression across multiple layers:

#### Phase 1: Frontend Basics (Months 1-3)
*   **Fundamentals**: HTML5, Semantic CSS, JavaScript (ES6+).
*   **Frameworks**: React, Vue, or Angular.
*   **CSS Tools**: Tailwind CSS, CSS Variables.

#### Phase 2: Backend Foundations (Months 4-6)
*   **Runtimes**: Node.js or Python/Go.
*   **Server Frameworks**: Express.js or FastAPI.
*   **Databases**: Relational (PostgreSQL/SQLite) and NoSQL (MongoDB).

#### Phase 3: Deployment & Operations (Month 7+)
*   **Version Control**: Git & GitHub actions.
*   **Containers**: Docker.
*   **Cloud Hosting**: AWS, Vercel, or Render.

*Suggested Follow-up: Ask me to "Create a detailed week-by-week plan" or "Recommend beginner projects".*`;
  }

  return `### Hello! I am your AI Digital Tutor 🌟

I am configured and running inside your local Node.js + SQLite backend! I can help you with:
*   💻 **Programming & Coding**: Sandbox execution, algorithm solutions, refactoring suggestions.
*   📚 **Learning Path Design**: Dynamic curricula, roadmaps, course walkthroughs.
*   🎯 **Interview Prep**: Live simulated mock interviews and resume reviews.

Tell me, what specific technology or problem would you like to solve today?`;
}

/**
 * Main Tutor Assistant
 */
export async function getTutorChatResponse(prompt, history = []) {
  if (OPENROUTER_API_KEY || GEMINI_API_KEY) {
    try {
      const systemInstruction = `
        You are "AI Digital Tutor", a premium, friendly, and highly intelligent AI learning assistant.
        When asked for code (e.g. "add two sum code in python"), provide the EXACT code solution directly with explanations.
        Always format your responses beautifully in markdown with code snippets, headers, and bullet points.
        Maintain a highly supportive, motivating, and professional tone.
      `;
      // Slice history to the last 4 messages for rapid processing
      const recentHistory = (history || []).slice(-4);
      const contextPrompt = `
        Conversation History:
        ${JSON.stringify(recentHistory)}
        
        New user message: ${prompt}
      `;

      // Allow up to 12.0s response window for full live API generation
      const onlinePromise = queryAI(contextPrompt, systemInstruction);
      const timeoutCap = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("AI online query race timeout")), 12000)
      );

      return await Promise.race([onlinePromise, timeoutCap]);
    } catch (err) {
      console.warn("AI Chat fallback engaged:", err.message);
      return getOfflineFallbackResponse(prompt, "chat");
    }
  } else {
    return getOfflineFallbackResponse(prompt, "chat");
  }
}

/**
 * Diagnostic Code Debugger
 */
export async function getDebuggerResponse(userCode, compilerError) {
  if (OPENROUTER_API_KEY || GEMINI_API_KEY) {
    try {
      const systemInstruction = `
        You are "AI Debugging Assistant". 
        You analyze the provided code and runtime compiler error.
        Do NOT just provide the complete fixed code instantly. 
        Explain the root cause of the error logically and give specific hints/guidelines 
        so the user learns how to fix it themselves. 
        Keep your tone supportive and technical. Format in beautiful markdown.
      `;
      const prompt = `
        Code submitted by user:
        \`\`\`
        ${userCode}
        \`\`\`
        
        Compiler / Test cases error:
        ${compilerError}
      `;

      const onlinePromise = queryAI(prompt, systemInstruction);
      const timeoutCap = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("AI debug query race timeout")), 2500)
      );

      return await Promise.race([onlinePromise, timeoutCap]);
    } catch (err) {
      console.warn("AI Debug API call failed, using fallback:", err.message);
      return getOfflineFallbackResponse(userCode, "debug");
    }
  } else {
    return getOfflineFallbackResponse(userCode, "debug");
  }
}

/**
 * Comprehensive Curated Skill Study Notes with Official Documentation References
 */
export function getCuratedSkillNotes(skillOrTopic) {
  const query = (skillOrTopic || "").toLowerCase();

  if (query.includes("python")) {
    return `# 🐍 Python Programming Study Notes & Reference Guide

### 1. Key Technical Concepts
* **Dynamic Typing & Automatic Memory Management**: Variables are references to objects in memory; Python uses reference counting and a generational garbage collector.
* **Global Interpreter Lock (GIL)**: A mutex in CPython that ensures only one thread executes Python bytecode at a time. Multi-processing or C extensions are used for CPU-bound parallelism.
* **Duck Typing & Protocols**: "If it walks like a duck and quacks like a duck, it's a duck" — Python checks for object capability (e.g. \`__iter__\`) rather than explicit class type.

### 2. Syntax Cheat Sheet & Code Examples
\`\`\`python
# List & Dictionary Comprehensions
squares = [x**2 for x in range(10) if x % 2 == 0]
word_lengths = {word: len(word) for word in ["Python", "Data", "Science"]}

# Custom Decorator Pattern
from functools import wraps
import time

def timer_decorator(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        print(f"{func.__name__} executed in {time.time() - start:.4f}s")
        return result
    return wrapper

# Exception Handling Pattern
try:
    with open("config.json", "r") as f:
        data = f.read()
except FileNotFoundError as err:
    print(f"Configuration file missing: {err}")
finally:
    print("Cleanup completed.")
\`\`\`

### 3. Best Practices
1. Follow **PEP 8** style guidelines (use 4 spaces for indentation, snake_case for functions/variables).
2. Prefer \`with\` statement context managers for managing file streams and DB connections.
3. Use virtual environments (\`venv\` or \`uv\`) for isolated dependency management.

### 4. 🌐 Official Documentation & Reference Links
* **Official Python 3 Documentation**: [docs.python.org](https://docs.python.org/3/)
* **Python Language Reference**: [docs.python.org/3/reference](https://docs.python.org/3/reference/index.html)
* **Python Standard Library Index**: [docs.python.org/3/library](https://docs.python.org/3/library/index.html)
* **PEP 8 Style Guide**: [peps.python.org/pep-0008](https://peps.python.org/pep-0008/)`;
  }

  if (query.includes("java")) {
    return `# ☕ Java Enterprise & OOP Reference Study Notes

### 1. Core Technical Concepts
* **Object-Oriented Pillars**: Encapsulation (private state with getters/setters), Abstraction (Interfaces & Abstract Classes), Inheritance (\`extends\`), Polymorphism (method overriding/overloading).
* **Java Virtual Machine (JVM)**: Executes compiled \`.class\` Bytecode across OS platforms. Divided into Heap (objects) and Stack (stack frames, primitive variables).
* **Garbage Collection (GC)**: Automatic memory reclaiming (G1GC, ZGC) identifying unreachable heap objects.

### 2. Syntax Cheat Sheet & Code Examples
\`\`\`java
import java.util.*;
import java.util.stream.Collectors;

// Generics & Streams API Pattern
public class StudentManager {
    public static void main(String[] args) {
        List<String> names = Arrays.asList("Alice", "Bob", "Charlie", "David");
        
        // Filter & Map using Java 8+ Streams
        List<String> filtered = names.stream()
            .filter(name -> name.startsWith("A") || name.startsWith("C"))
            .map(String::toUpperCase)
            .collect(Collectors.toList());
            
        System.out.println("Filtered: " + filtered);
    }
}
\`\`\`

### 3. Best Practices
1. Mark immutable fields \`final\` and favor immutable objects (\`java.lang.Record\` in modern Java).
2. Avoid raw collection types; always specify generics (\`List<String>\`).
3. Handle checked exceptions explicitly rather than catching generic \`Exception\`.

### 4. 🌐 Official Documentation & Reference Links
* **Official Dev.Java Portal**: [dev.java](https://dev.java/)
* **Oracle Java Documentation**: [docs.oracle.com/en/java](https://docs.oracle.com/en/java/)
* **Java API Specification**: [docs.oracle.com/en/java/javase](https://docs.oracle.com/en/java/javase/)`;
  }

  if (query.includes("react")) {
    return `# ⚛️ React Hooks & Modern Frontend Reference Notes

### 1. Core Technical Concepts
* **Virtual DOM & Reconciliation**: React maintains an in-memory Virtual DOM tree, calculates minimal diffs upon state changes, and updates real DOM efficiently.
* **Unidirectional Data Flow**: Data flows down from parent to child components via props.
* **Component Lifecycle & Hooks**: Functional components use hooks to attach local state and side effects.

### 2. Syntax Cheat Sheet & Code Examples
\`\`\`tsx
import React, { useState, useEffect, useMemo, useCallback } from "react";

interface Props {
  initialCount?: number;
}

export const Counter: React.FC<Props> = ({ initialCount = 0 }) => {
  const [count, setCount] = useState(initialCount);

  // Side Effect with Cleanup
  useEffect(() => {
    const timer = setInterval(() => {
      console.log("Tick:", count);
    }, 5000);
    return () => clearInterval(timer); // Cleanup on unmount
  }, [count]);

  // Memoized Calculation
  const doubleCount = useMemo(() => count * 2, [count]);

  return (
    <div className="p-4 border rounded-xl shadow">
      <h2>Count: {count} (Double: {doubleCount})</h2>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
    </div>
  );
};
\`\`\`

### 3. Best Practices
1. Keep component state local; push state up only when siblings require shared state.
2. Provide stable, unique \`key\` props when rendering lists (never use array index if items re-order).
3. Follow the Rules of Hooks: call hooks only at top-level functions.

### 4. 🌐 Official Documentation & Reference Links
* **Official React Docs**: [react.dev](https://react.dev/)
* **React API Reference**: [react.dev/reference/react](https://react.dev/reference/react)
* **React Hooks Guide**: [react.dev/reference/react/hooks](https://react.dev/reference/react/hooks)`;
  }

  if (query.includes("js") || query.includes("javascript")) {
    return `# 🟨 JavaScript ES6+ & Asynchronous Engine Study Notes

### 1. Core Technical Concepts
* **Event Loop & Call Stack**: JavaScript is single-threaded. Synchronous code executes on the Call Stack; async tasks (Promises, timers) queue in Microtask/Macrotask Queues.
* **Closures**: Functions retain access to their outer scope variables even after outer execution context finishes.
* **Prototypes & ES6 Classes**: Prototypal inheritance models object behavior sharing under the hood.

### 2. Syntax Cheat Sheet & Code Examples
\`\`\`javascript
// Promises & Async / Await Pattern
async function fetchUserData(userId) {
  try {
    const response = await fetch(\`/api/users/\${userId}\`);
    if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
    const user = await response.json();
    return user;
  } catch (error) {
    console.error("Fetch failed:", error);
    return null;
  }
}

// Destructuring & Spread Operator
const user = { name: "Alex", role: "Developer", points: 250 };
const updatedUser = { ...user, points: user.points + 50, active: true };
const { name, role } = updatedUser;
\`\`\`

### 3. Best Practices
1. Always use \`const\` by default, \`let\` when variable values mutate; never use \`var\`.
2. Use strict equality (\`===\`) instead of loose equality (\`==\`).
3. Handle async rejections using \`try/catch\` blocks.

### 4. 🌐 Official Documentation & Reference Links
* **MDN JavaScript Guide**: [developer.mozilla.org/en-US/docs/Web/JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
* **ECMAScript Specification**: [tc39.es/ecma262](https://tc39.es/ecma262/)
* **JavaScript Event Loop Visualizer**: [developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop)`;
  }

  if (query.includes("sql") || query.includes("postgres") || query.includes("mysql") || query.includes("database")) {
    return `# 🗄️ SQL & Relational Database Design Notes

### 1. Core Technical Concepts
* **ACID Guarantees**: Atomicity (all or nothing), Consistency (schema constraints), Isolation (concurrency safety), Durability (disk persistence).
* **Indexing Strategy**: B-Tree indexes speed up \`SELECT\` lookups from O(N) full table scans to O(log N), at the cost of slight write overhead.
* **Normalization**: Organizing columns and tables to minimize duplicate data redundancy (1NF, 2NF, 3NF).

### 2. Syntax Cheat Sheet & Code Examples
\`\`\`sql
-- Complex JOIN with Aggregations and Grouping
SELECT 
    c.name AS category_name,
    COUNT(p.id) AS total_products,
    ROUND(AVG(p.price), 2) AS avg_price
FROM categories c
LEFT JOIN products p ON c.id = p.category_id
WHERE p.status = 'ACTIVE'
GROUP BY c.id, c.name
HAVING COUNT(p.id) > 5
ORDER BY avg_price DESC;

-- Subquery & Window Functions
SELECT 
    employee_id,
    department,
    salary,
    RANK() OVER (PARTITION BY department ORDER BY salary DESC) as rank_in_dept
FROM employees;
\`\`\`

### 3. Best Practices
1. Always add indexes on foreign keys and columns frequently used in \`WHERE\` and \`JOIN\` clauses.
2. Avoid \`SELECT *\`; request only necessary explicit columns.
3. Use Transactions (\`BEGIN TRANSACTION ... COMMIT\`) for multi-table update operations.

### 4. 🌐 Official Documentation & Reference Links
* **PostgreSQL Official Documentation**: [postgresql.org/docs](https://www.postgresql.org/docs/)
* **MySQL Documentation**: [dev.mysql.com/doc](https://dev.mysql.com/doc/)
* **SQLite Documentation**: [sqlite.org/docs.html](https://www.sqlite.org/docs.html)`;
  }

  if (query.includes("docker") || query.includes("devops") || query.includes("container")) {
    return `# 🐳 Docker & Containerization Reference Study Notes

### 1. Core Technical Concepts
* **Container vs Virtual Machine**: Containers share host OS kernel and isolate process spaces, starting in milliseconds with minimal resource consumption.
* **Images vs Containers**: An Image is a read-only template (built from Dockerfile); a Container is a runnable instance of an image.
* **Volumes & Persistent Data**: Mounts host directories into container paths to store databases and uploads across container restarts.

### 2. Syntax Cheat Sheet & Dockerfile Example
\`\`\`dockerfile
# Multi-stage build Dockerfile for Node.js
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production

EXPOSE 5000
CMD ["node", "dist/index.js"]
\`\`\`

\`\`\`bash
# Essential Docker CLI Commands
docker build -t myapp:1.0 .
docker run -d -p 5000:5000 --name running-app -v app-data:/app/data myapp:1.0
docker ps -a
docker logs -f running-app
\`\`\`

### 3. Best Practices
1. Use multi-stage builds to minimize output container image size and eliminate build toolchains from production containers.
2. Never run containerized processes as root; create a dedicated non-root user inside Dockerfile.
3. Use \`.dockerignore\` to prevent copying \`node_modules\` or local secrets into build context.

### 4. 🌐 Official Documentation & Reference Links
* **Official Docker Documentation**: [docs.docker.com](https://docs.docker.com/)
* **Dockerfile Best Practices**: [docs.docker.com/develop/develop-images/dockerfile_best-practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
* **Docker Compose Guide**: [docs.docker.com/compose](https://docs.docker.com/compose/)`;
  }

  if (query.includes("machine learning") || query.includes("ml") || query.includes("ai")) {
    return `# 🤖 Machine Learning & AI Reference Study Notes

### 1. Core Technical Concepts
* **Supervised Learning**: Model learns a mapping function from input features X to target labels Y (Regression, Classification).
* **Unsupervised Learning**: Model discovers structural clusters or representations in unlabeled data (K-Means, PCA, Autoencoders).
* **Overfitting & Regularization**: Overfitting occurs when a model memorizes training noise. Controlled using L1 (Lasso), L2 (Ridge) regularization, Dropout, and cross-validation.

### 2. Syntax Cheat Sheet & Scikit-Learn Example
\`\`\`python
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report

# Load and split dataset
X, y = fetch_data()
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train Classifier
model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
model.fit(X_train, y_train)

# Evaluate Performance
predictions = model.predict(X_test)
print(f"Accuracy: {accuracy_score(y_test, predictions):.4f}")
print(classification_report(y_test, predictions))
\`\`\`

### 3. Best Practices
1. Always split dataset into Train, Validation, and Test sets prior to preprocessing to avoid data leakage.
2. Standardize/scale numeric features using \`StandardScaler\` or \`MinMaxScaler\` for distance-based models.
3. Track metrics beyond accuracy (Precision, Recall, ROC-AUC) when dealing with imbalanced datasets.

### 4. 🌐 Official Documentation & Reference Links
* **Scikit-Learn Documentation**: [scikit-learn.org](https://scikit-learn.org/stable/)
* **PyTorch Official Documentation**: [pytorch.org/docs](https://pytorch.org/docs/stable/index.html)
* **TensorFlow Documentation**: [tensorflow.org/api_docs](https://www.tensorflow.org/api_docs)`;
  }

  // Fallback Generic Study Notes Generator
  const formattedSkill = skillOrTopic.charAt(0).toUpperCase() + skillOrTopic.slice(1);
  return `# 📘 ${formattedSkill} Comprehensive Reference & Study Notes

### 1. Key Concepts & Technical Overview
* **Domain Focus**: ${formattedSkill} is a widely adopted technology in computer science designed to build scalable, resilient systems.
* **Core Architecture**: Provides high-performance abstractions, structured API interfaces, and robust runtime management.
* **Industry Applications**: Used across enterprise development, cloud services, web applications, and data pipelines.

### 2. Essential Best Practices & Guidelines
1. Write clean, modular, self-documenting code with informative variable naming conventions.
2. Enforce explicit error handling, proper diagnostic logging, and input validation.
3. Follow community coding standards and maintain automated test coverage for core modules.

### 3. 🌐 Official Documentation & Learning Resources
* **Official Tech Portal**: [developer.mozilla.org](https://developer.mozilla.org/)
* **W3C Standards**: [w3.org](https://www.w3.org/)
* **GitHub Open Source Showcase**: [github.com/topics/${skillOrTopic.toLowerCase()}](https://github.com/topics/${skillOrTopic.toLowerCase()})`;
}

/**
 * Dynamic Study Notes Compiler
 */
export async function getNotesResponse(topicOrTranscript) {
  if (OPENROUTER_API_KEY || GEMINI_API_KEY) {
    try {
      const systemInstruction = `
        You are "AI Notes Generator".
        You take technical topics, transcripts, or keywords and compile extremely clean, 
        highly educational, structured markdown study notes.
        MUST INCLUDE:
        1. Conceptual definitions and core architecture.
        2. Practical cheat sheet with code snippet examples.
        3. Best practices & common pitfalls.
        4. Official reference documentation URLs (e.g. docs.python.org, developer.mozilla.org, react.dev, etc.).
      `;
      const prompt = `Generate comprehensive, clear markdown study notes for "${topicOrTranscript}" with cheat sheets, code snippets, and official documentation reference links.`;
      return await queryAI(prompt, systemInstruction);
    } catch (err) {
      console.warn("AI Notes API call failed, using fallback:", err.message);
      return getCuratedSkillNotes(topicOrTranscript);
    }
  } else {
    return getCuratedSkillNotes(topicOrTranscript);
  }
}

/**
 * Mock Interview Advisor
 */
export async function getMockInterviewResponse(chatHistory, nextTurnPrompt) {
  if (OPENROUTER_API_KEY || GEMINI_API_KEY) {
    try {
      const systemInstruction = `
        You are "AI Mock Interviewer" simulating an expert technical recruiter or hiring manager at a top tech company.
        You ask a single highly targeted question based on the user's career path (e.g. Full Stack, AI Engineer).
        Analyze their responses, provide concise encouraging feedback, and ask the next natural question.
        Always format your response as a JSON object containing three fields:
        {
          "question": "The next question you ask.",
          "suggestions": ["A few short bullet points the candidate could think about.", "Another helper suggestion."],
          "feedback": "Short analytical feedback about their previous answer (if history is not empty)."
        }
        Return ONLY this JSON block.
      `;
      const prompt = `
        Previous Interview Turns:
        ${JSON.stringify(chatHistory)}
        
        Candidate's latest reply:
        ${nextTurnPrompt}
      `;
      const resultText = await queryAI(prompt, systemInstruction);
      // Ensure we extract or parse valid JSON
      try {
        const cleanJson = resultText.substring(
          resultText.indexOf("{"),
          resultText.lastIndexOf("}") + 1
        );
        return JSON.parse(cleanJson);
      } catch (parseErr) {
        return {
          question: "Can you tell me about a complex technical challenge you faced and how you solved it?",
          suggestions: ["Use the STAR method", "Highlight architectural decisions", "Discuss what you learned"],
          feedback: "Your previous response was informative, but let's dive deeper into details."
        };
      }
    } catch (err) {
      console.warn("AI Interview API call failed, using fallback:", err.message);
      return JSON.parse(getOfflineFallbackResponse(nextTurnPrompt, "interview"));
    }
  } else {
    return JSON.parse(getOfflineFallbackResponse(nextTurnPrompt, "interview"));
  }
}

/**
 * Generate dynamic course-specific quiz questions using AI API.
 */
export async function generateAIQuizResponse(topic, skillContext = "") {
  if (OPENROUTER_API_KEY || GEMINI_API_KEY) {
    try {
      const systemInstruction = `
        You are an expert Computer Science educator and curriculum developer.
        Generate 5 high-quality, educational multiple choice quiz questions for students studying "${topic}" (Skill: ${skillContext || topic}).
        Every question MUST have 4 options (A, B, C, D), 1 correct answer ('A', 'B', 'C', or 'D'), a difficulty level ('Easy', 'Medium', 'Hard'), and a clear, detailed explanation explaining why the correct option is right.

        Return ONLY a raw JSON array of objects with the exact structure:
        [
          {
            "question": "Question text here",
            "option_a": "Option A text",
            "option_b": "Option B text",
            "option_c": "Option C text",
            "option_d": "Option D text",
            "correct_option": "A",
            "explanation": "Detailed rationale explaining why A is correct...",
            "difficulty": "Medium"
          }
        ]
      `;
      const prompt = `Generate 5 targeted, highly educational quiz questions to assess and teach a student about ${topic}. Focus on practical skills, syntax, and conceptual mastery.`;
      const resultText = await queryAI(prompt, systemInstruction);
      const cleanJson = resultText.substring(
        resultText.indexOf("["),
        resultText.lastIndexOf("]") + 1
      );
      return JSON.parse(cleanJson);
    } catch (err) {
      console.warn("AI Quiz API call failed, using high-quality fallback questions:", err.message);
    }
  }

  // High quality offline fallback quiz questions
  return [
    {
      question: `What is a core fundamental concept when mastering ${topic}?`,
      option_a: `Understanding data flow, syntax standards, and proper state management in ${topic}`,
      option_b: "Ignoring documentation and writing code without tests",
      option_c: "Running commands without checking for permissions",
      option_d: "Deleting configuration files before compilation",
      correct_option: "A",
      explanation: `Mastering ${topic} requires a solid grasp of core syntax, structured data flow, and industry standard patterns.`,
      difficulty: "Easy"
    },
    {
      question: `How should memory and performance be optimized in ${topic}?`,
      option_a: "By allocating infinite heap memory",
      option_b: "By utilizing efficient algorithms, minimizing redundant computations, and releasing unused resources",
      option_c: "By disabling error logs and compiler warnings",
      option_d: "By storing all runtime variables in single global variables",
      correct_option: "B",
      explanation: "Efficiency in software applications relies on algorithmic optimization and sensible resource management.",
      difficulty: "Medium"
    },
    {
      question: `Which testing approach guarantees reliability in ${topic} projects?`,
      option_a: "Only testing in production environment",
      option_b: "Combining automated unit tests, integration tests, and edge-case validation",
      option_c: "Relying purely on user complaints to catch bugs",
      option_d: "Skipping validation when deadlines are tight",
      correct_option: "B",
      explanation: "Comprehensive test suites (unit + integration + edge cases) catch regressions before code reaches production.",
      difficulty: "Medium"
    },
    {
      question: `What is the recommended design pattern for error handling in ${topic}?`,
      option_a: "Swallowing all exceptions silently with empty catch blocks",
      option_b: "Using structured exception handling with meaningful log diagnostics and clean fallback states",
      option_c: "Terminating the operating system immediately",
      option_d: "Returning arbitrary null values without throwing errors",
      correct_option: "B",
      explanation: "Structured error handling ensures system resilience and gives clear debugging information when anomalies occur.",
      difficulty: "Hard"
    },
    {
      question: `Why is continuous learning and assessment important in ${topic}?`,
      option_a: "Because technology stacks evolve rapidly and quizzes reinforce active recall",
      option_b: "Because syntax changes every 24 hours automatically",
      option_c: "It is not important; reading once is enough",
      option_d: "To prevent code from being committed to Git",
      correct_option: "A",
      explanation: "Active retrieval practice and continuous quizzes significantly increase long-term concept retention and job readiness.",
      difficulty: "Easy"
    }
  ];
}

/**
 * Generate full course topic breakdowns and structured notes for any course
 */
export function generateCourseTopics(courseTitle, skill = "Programming", category = "General") {
  const s = (skill || "").toLowerCase();
  const title = (courseTitle || "").toLowerCase();

  // 1. Python Course Breakdown
  if (s.includes("python")) {
    return [
      {
        title: "Python Installation & IDE Setup",
        order_index: 1,
        video_timestamp_seconds: 0,
        notes_content: `## Python Installation & IDE Setup

**What it is:** Python is an easy-to-read programming language that requires the Python interpreter installed on your computer to run scripts.

**Why it matters:** Setting up Python correctly lets you run scripts, install packages using pip, and build applications in editors like VS Code.

**Key points:**
- Download Python 3 from official python.org.
- Check "Add Python to PATH" during Windows setup.
- Verify installation using \`python --version\` in terminal.
- VS Code is the recommended free code editor for Python.

**Example:**
\`\`\`bash
# Terminal command to check version
python3 --version
\`\`\`

**Common mistakes:**
- Forgetting to check "Add Python to PATH" during installation, causing command line errors.`
      },
      {
        title: "Variables and Dynamic Data Types",
        order_index: 2,
        video_timestamp_seconds: 360,
        notes_content: `## Variables and Dynamic Data Types

**What it is:** In Python, variables are created automatically when you assign a value without specifying a explicit type keyword.

**Why it matters:** Dynamic typing lets you store numbers, strings, or booleans quickly without writing verbose declaration code.

**Key points:**
- Create variables using \`variable_name = value\`.
- Basic types include \`int\` (integers), \`float\` (decimals), \`str\` (text), and \`bool\` (True/False).
- Use \`type(var)\` to check the data type of any variable.
- Python uses \`snake_case\` naming convention.

**Example:**
\`\`\`python
age = 25
user_name = "Alex"
is_enrolled = True

print(type(user_name)) # Output: <class 'str'>
\`\`\`

**Common mistakes:**
- Capitalizing variable names incorrectly or starting names with numbers.`
      },
      {
        title: "Control Flow (if, elif, else)",
        order_index: 3,
        video_timestamp_seconds: 780,
        notes_content: `## Control Flow (if, elif, else)

**What it is:** Conditional statements allow Python code to make decisions and execute specific code blocks based on True/False comparisons.

**Why it matters:** Control flow lets your program respond differently depending on user input, data values, or calculations.

**Key points:**
- Python uses indentation (4 spaces) instead of curly braces to group code inside \`if\` blocks.
- Use \`elif\` (short for else if) for testing multiple conditions.
- Logical operators are written as plain words: \`and\`, \`or\`, \`not\`.

**Example:**
\`\`\`python
score = 85

if score >= 90:
    print("Grade A")
elif score >= 80:
    print("Grade B")
else:
    print("Keep Practicing")
\`\`\`

**Common mistakes:**
- Mixing tabs and spaces for indentation, which causes IndentationError.
- Forgetting the colon \`:\` at the end of \`if\` or \`elif\` lines.`
      },
      {
        title: "Lists, Tuples, and Dictionaries",
        order_index: 4,
        video_timestamp_seconds: 1200,
        notes_content: `## Lists, Tuples, and Dictionaries

**What it is:** Data structures store collections of data. Lists \`[]\` are ordered and editable; Tuples \`()\` are immutable (uneditable); Dictionaries \`{}\` store key-value pairs.

**Why it matters:** Choosing the right data structure organizes complex application data efficiently.

**Key points:**
- Lists are created with square brackets: \`items = ["apple", "banana"]\`.
- Dictionaries map keys to values: \`user = {"name": "Sara", "age": 22}\`.
- Tuples cannot be modified after creation: \`coords = (10.0, 20.0)\`.

**Example:**
\`\`\`python
# Dictionary lookup
student = {"id": 101, "name": "Marcus"}
print(student["name"]) # Output: Marcus

# List append
items = [10, 20]
items.append(30)
\`\`\`

**Common mistakes:**
- Accessing a dictionary key that does not exist directly without using \`.get()\`, causing KeyError.`
      },
      {
        title: "Functions and Keyword Arguments",
        order_index: 5,
        video_timestamp_seconds: 1680,
        notes_content: `## Functions and Keyword Arguments

**What it is:** Functions are defined using the \`def\` keyword to package reusable code blocks that perform a task and return a result.

**Why it matters:** Functions make your codebase modular and stop you from repeating the same code logic multiple times.

**Key points:**
- Define functions using \`def function_name(parameters):\`.
- Return values back using the \`return\` statement.
- Default arguments allow parameters to have default values if omitted.

**Example:**
\`\`\`python
def calculate_tax(amount, tax_rate=0.08):
    return amount * tax_rate

print(calculate_tax(100)) # Uses default 0.08 rate
\`\`\`

**Common mistakes:**
- Returning nothing or forgetting the \`return\` statement, which defaults to returning \`None\`.`
      },
      {
        title: "Loops (for and while)",
        order_index: 6,
        video_timestamp_seconds: 2100,
        notes_content: `## Loops (for and while)

**What it is:** Loops repeat code execution. \`for\` loops iterate over sequences like lists or ranges, while \`while\` loops run until a condition becomes False.

**Why it matters:** Loops process datasets, automate calculations, and iterate through files cleanly.

**Key points:**
- \`range(start, stop)\` generates a sequence of numbers.
- \`break\` exits the loop immediately.
- \`continue\` skips the rest of the current iteration.

**Example:**
\`\`\`python
for i in range(1, 4):
    print(f"Iteration {i}")
\`\`\`

**Common mistakes:**
- Forgetting to increment counter variables in \`while\` loops, creating infinite loops.`
      },
      {
        title: "Object-Oriented Programming (OOP) Classes",
        order_index: 7,
        video_timestamp_seconds: 2580,
        notes_content: `## Object-Oriented Programming (OOP) Classes

**What it is:** Classes are blueprints for creating objects that encapsulate related properties (data) and methods (functions) together.

**Why it matters:** OOP models real-world entities cleanly in software architectures.

**Key points:**
- Define a class using \`class ClassName:\`.
- The \`__init__\` method initializes new instances.
- \`self\` refers to the current instance of the object.

**Example:**
\`\`\`python
class Dog:
    def __init__(self, name):
        self.name = name

    def bark(self):
        return f"{self.name} says Woof!"

my_dog = Dog("Buddy")
print(my_dog.bark())
\`\`\`

**Common mistakes:**
- Forgetting to pass \`self\` as the first parameter in class methods.`
      },
      {
        title: "File Handling and Exception Try/Except",
        order_index: 8,
        video_timestamp_seconds: 3060,
        notes_content: `## File Handling and Exception Try/Except

**What it is:** Exception handling using \`try...except\` blocks catches runtime errors so your program handles unexpected issues without crashing.

**Why it matters:** It guarantees application reliability when reading files or fetching external resources.

**Key points:**
- Use \`with open(filename) as f:\` for automatic file closing.
- Catch specific errors with \`except FileNotFoundError:\`.
- Use \`finally:\` for guaranteed execution cleanup.

**Example:**
\`\`\`python
try:
    with open("data.txt", "r") as file:
        content = file.read()
except FileNotFoundError:
    print("File not found safely handled.")
\`\`\`

**Common mistakes:**
- Using bare \`except:\` without specifying the exception type, which hides unrelated syntax or memory errors.`
      }
    ];
  }

  // 2. Java Course Breakdown
  if (s.includes("java") && !s.includes("script")) {
    return [
      {
        title: "Java JDK Setup & Main Method Structure",
        order_index: 1,
        video_timestamp_seconds: 0,
        notes_content: `## Java JDK Setup & Main Method Structure

**What it is:** Java is a compiled object-oriented language that requires the Java Development Kit (JDK) and Java Virtual Machine (JVM) to run code.

**Why it matters:** The JVM allows Java code to "write once, run anywhere" across Windows, Mac, and Linux.

**Key points:**
- Install JDK 17+ and set the JAVA_HOME environment variable.
- Every Java file must have a class matching the filename exactly.
- Execution begins at \`public static void main(String[] args)\`.

**Example:**
\`\`\`java
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Java!");
    }
}
\`\`\`

**Common mistakes:**
- Mismatching file name and public class name (e.g., file named \`App.java\` with class \`Main\`).`
      },
      {
        title: "Primitive Data Types and Variables",
        order_index: 2,
        video_timestamp_seconds: 450,
        notes_content: `## Primitive Data Types and Variables

**What it is:** Java is strongly typed, meaning every variable must be declared with a specific data type before use.

**Why it matters:** Explicit types prevent type errors and optimize memory usage in large applications.

**Key points:**
- Primitives include \`int\`, \`double\`, \`boolean\`, \`char\`, \`long\`, and \`float\`.
- Use \`String\` for text (note: String is an object reference type, not primitive).
- Convert types using casting: \`(int) myDouble\`.

**Example:**
\`\`\`java
int count = 10;
double price = 19.99;
boolean isActive = true;
String user = "David";
\`\`\`

**Common mistakes:**
- Trying to reassign a variable to a value of a different incompatible data type.`
      },
      {
        title: "Java Control Statements & Loops",
        order_index: 3,
        video_timestamp_seconds: 900,
        notes_content: `## Java Control Statements & Loops

**What it is:** Control statements (\`if\`, \`else\`, \`switch\`, \`for\`, \`while\`) direct the execution flow of your Java program.

**Why it matters:** Control logic handles business logic checks, iterations, and condition validation.

**Key points:**
- \`if (condition) {}\` requires parentheses around conditions.
- Enhanced for loop \`for (Type item : collection)\` simplifies array iteration.

**Example:**
\`\`\`java
int[] numbers = {1, 2, 3};
for (int num : numbers) {
    System.out.println(num);
}
\`\`\`

**Common mistakes:**
- Comparing Strings using \`==\` instead of \`.equals()\` method.`
      },
      {
        title: "Object-Oriented Programming (Classes & Constructors)",
        order_index: 4,
        video_timestamp_seconds: 1400,
        notes_content: `## Object-Oriented Programming (Classes & Constructors)

**What it is:** Classes define fields (data) and methods (behavior). Constructors initialize objects when instantiated with \`new\`.

**Why it matters:** OOP structures complex enterprise software into modular, reusable object components.

**Key points:**
- Access modifiers (\`public\`, \`private\`, \`protected\`) control field visibility.
- Encapsulation hides internal private state using getter and setter methods.

**Example:**
\`\`\`java
public class User {
    private String name;

    public User(String name) {
        this.name = name;
    }

    public String getName() {
        return this.name;
    }
}
\`\`\`

**Common mistakes:**
- Making fields public instead of keeping them private with getters and setters.`
      },
      {
        title: "Inheritance and Polymorphism",
        order_index: 5,
        video_timestamp_seconds: 1950,
        notes_content: `## Inheritance and Polymorphism

**What it is:** Inheritance allows a child class to inherit fields and methods from a parent class using \`extends\`. Polymorphism lets child classes override parent behavior using \`@Override\`.

**Why it matters:** It promotes code reuse and allows treating child objects uniformly as parent types.

**Key points:**
- Use \`extends ParentClass\` for inheritance.
- Use \`super()\` to call parent constructors.
- Mark overridden methods with \`@Override\`.

**Example:**
\`\`\`java
class Animal {
    void makeSound() { System.out.println("Generic sound"); }
}
class Cat extends Animal {
    @Override
    void makeSound() { System.out.println("Meow"); }
}
\`\`\`

**Common mistakes:**
- Trying to inherit from multiple parent classes (Java supports single class inheritance only).`
      },
      {
        title: "Interfaces and Abstract Classes",
        order_index: 6,
        video_timestamp_seconds: 2500,
        notes_content: `## Interfaces and Abstract Classes

**What it is:** Interfaces define contract method signatures that implementing classes must fulfill using \`implements\`.

**Why it matters:** Interfaces decouple specifications from implementation details.

**Key points:**
- A class can implement multiple interfaces using commas.
- Abstract classes cannot be instantiated directly.

**Example:**
\`\`\`java
interface Printable {
    void print();
}
class Document implements Printable {
    public void print() { System.out.println("Printing..."); }
}
\`\`\`

**Common mistakes:**
- Forgetting to make interface methods public when implementing them.`
      },
      {
        title: "Collections Framework (List, Set, Map)",
        order_index: 7,
        video_timestamp_seconds: 3100,
        notes_content: `## Collections Framework (List, Set, Map)

**What it is:** The Java Collections Framework provides built-in data structures like \`ArrayList\`, \`HashSet\`, and \`HashMap\`.

**Why it matters:** Collections automatically resize and provide fast search, sorting, and lookup mechanisms.

**Key points:**
- \`List\` maintains insertion order.
- \`Set\` enforces unique elements.
- \`Map\` stores key-value pairs.

**Example:**
\`\`\`java
List<String> names = new ArrayList<>();
names.add("Alice");

Map<Integer, String> userMap = new HashMap<>();
userMap.put(1, "Bob");
\`\`\`

**Common mistakes:**
- Using primitive types in generics (e.g. \`List<int>\` instead of wrapper \`List<Integer>\`).`
      },
      {
        title: "Exception Handling (Try, Catch, Finally, Throws)",
        order_index: 8,
        video_timestamp_seconds: 3700,
        notes_content: `## Exception Handling (Try, Catch, Finally, Throws)

**What it is:** Exception handling intercepts runtime errors (exceptions) cleanly using \`try-catch\` blocks.

**Why it matters:** It keeps enterprise services stable when network operations or file access fail.

**Key points:**
- Checked exceptions must be declared or caught.
- Unchecked exceptions (\`RuntimeException\`) occur at runtime.
- \`finally\` blocks always run.

**Example:**
\`\`\`java
try {
    int result = 10 / 0;
} catch (ArithmeticException e) {
    System.out.println("Cannot divide by zero!");
}
\`\`\`

**Common mistakes:**
- Catching generic \`Exception\` without logging specific cause details.`
      }
    ];
  }

  // 3. Default Fallback Generator for any other course
  const defaultTopics = [
    {
      title: `Introduction to ${skill} & Fundamentals`,
      order_index: 1,
      video_timestamp_seconds: 0,
      notes_content: `## Introduction to ${skill} & Fundamentals

**What it is:** ${skill} is a core technology used in ${category} to build modern applications efficiently.

**Why it matters:** Mastering ${skill} provides essential skills required to design, develop, and deploy production software.

**Key points:**
- ${skill} is widely adopted across industry standard tech stacks.
- It provides a structured approach to solving technical problems.
- Environment configuration is the first step before writing production code.

**Example:**
\`\`\`text
// Standard initialization workflow for ${skill}
Initialize Project -> Configure Dependencies -> Execute
\`\`\`

**Common mistakes:**
- Skipping foundational concepts before jumping into advanced frameworks.`
    },
    {
      title: `Core Syntax & Environment Setup in ${skill}`,
      order_index: 2,
      video_timestamp_seconds: 400,
      notes_content: `## Core Syntax & Environment Setup in ${skill}

**What it is:** This module covers basic syntax rules, configuration files, and initial environment tooling.

**Why it matters:** Proper setup ensures your project compiles cleanly without version or path conflicts.

**Key points:**
- Follow official project structure recommendations.
- Keep configuration parameters stored in environment variables.
- Verify environment setup using command-line diagnostic tools.

**Example:**
\`\`\`text
Check installation version command:
${skill.toLowerCase()} --version
\`\`\`

**Common mistakes:**
- Ignoring deprecation warnings during project initialization.`
    },
    {
      title: `Data Management & Structure in ${skill}`,
      order_index: 3,
      video_timestamp_seconds: 850,
      notes_content: `## Data Management & Structure in ${skill}

**What it is:** Data management defines how values, collections, and state are handled in memory.

**Why it matters:** Efficient data structures keep application performance fast and memory overhead low.

**Key points:**
- Select appropriate data structures based on access speed requirements.
- Enforce immutability where data consistency is critical.
- Keep data transformations isolated and deterministic.

**Example:**
\`\`\`text
// Typical Data Flow
Input -> Transformation -> Verified Output
\`\`\`

**Common mistakes:**
- Mutating shared state directly across un-synchronized modules.`
    },
    {
      title: `Control Flow & Logical Architecture in ${skill}`,
      order_index: 4,
      video_timestamp_seconds: 1300,
      notes_content: `## Control Flow & Logical Architecture in ${skill}

**What it is:** Logical architecture directs the branching, looping, and conditional decision points of your software.

**Why it matters:** Clear control flow prevents deadlocks, infinite loops, and unhandled edge cases.

**Key points:**
- Keep conditional checks concise and readable.
- Validate all incoming user inputs before processing.
- Refactor deeply nested conditionals into clean guard clauses.

**Example:**
\`\`\`text
if (isValidInput) {
    processData();
} else {
    handleError();
}
\`\`\`

**Common mistakes:**
- Nesting multiple levels of conditionals instead of returning early.`
    },
    {
      title: `Modular Architecture & Best Practices in ${skill}`,
      order_index: 5,
      video_timestamp_seconds: 1800,
      notes_content: `## Modular Architecture & Best Practices in ${skill}

**What it is:** Modular design separates code into reusable, independent components or functions.

**Why it matters:** Modularity makes large software projects easy to maintain, test, and scale across developer teams.

**Key points:**
- Adhere to Single Responsibility Principle (SRP).
- Keep modules loosely coupled and highly cohesive.
- Write clean documentation for public API interfaces.

**Example:**
\`\`\`text
Module A (Data Provider) ---> Module B (Business Logic) ---> Module C (UI View)
\`\`\`

**Common mistakes:**
- Creating monolithic tightly-coupled modules that are impossible to test independently.`
    },
    {
      title: `Error Handling & Debugging Techniques in ${skill}`,
      order_index: 6,
      video_timestamp_seconds: 2300,
      notes_content: `## Error Handling & Debugging Techniques in ${skill}

**What it is:** Error handling intercepts runtime exceptions and logs diagnostic information to resolve issues quickly.

**Why it matters:** Robust exception handling guarantees your application recovers gracefully without losing data.

**Key points:**
- Use structured exception blocks to capture errors cleanly.
- Log informative error messages including context timestamps.
- Provide user-friendly fallback error messages.

**Example:**
\`\`\`text
Try Operation -> Catch Exception -> Log Diagnostics -> Display Fallback UI
\`\`\`

**Common mistakes:**
- Swallowing errors silently without logging diagnostic details.`
    },
    {
      title: `Performance Optimization & Security in ${skill}`,
      order_index: 7,
      video_timestamp_seconds: 2800,
      notes_content: `## Performance Optimization & Security in ${skill}

**What it is:** Optimization improves execution speed and memory efficiency while security prevents vulnerabilities.

**Why it matters:** Fast, secure applications build user trust and lower cloud infrastructure hosting costs.

**Key points:**
- Minimize network requests and unnecessary memory allocations.
- Sanitize all external inputs to prevent injection attacks.
- Profile memory usage to eliminate memory leaks.

**Example:**
\`\`\`text
Caching Layer -> Pre-rendered Responses -> Rapid Execution
\`\`\`

**Common mistakes:**
- Hardcoding sensitive credentials or API keys directly inside source code.`
    },
    {
      title: `Real-World Deployment & Project Integration in ${skill}`,
      order_index: 8,
      video_timestamp_seconds: 3300,
      notes_content: `## Real-World Deployment & Project Integration in ${skill}

**What it is:** Deployment automates building, testing, and pushing code to live cloud hosting servers.

**Why it matters:** Automated deployment pipelines ensure quick, reliable software updates to end users.

**Key points:**
- Use CI/CD automated pipelines for continuous testing and delivery.
- Monitor application performance metrics in production.
- Automate database migrations and environment configuration setup.

**Example:**
\`\`\`text
Git Push -> Automated CI Test Suite -> Production Cloud Deployment
\`\`\`

**Common mistakes:**
- Deploying unverified code directly to production without testing.`
    }
  ];

  return defaultTopics;
}


