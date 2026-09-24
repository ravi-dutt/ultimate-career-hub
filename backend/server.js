require("dotenv").config();

const mongoose = require("mongoose");
const User = require("./models/User");
const bcrypt = require("bcryptjs");

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

const path = require("path");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const { GoogleGenAI } = require("@google/genai");

const app = express();
const PORT = process.env.PORT || 5000;

const corsOrigins = (process.env.CORS_ORIGINS || "https://ultimate-career-hub.vercel.app")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    // Requests without an Origin header include server-to-server health checks.
    if (!origin || corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS."));
  },
}));
app.use(express.json({ limit: "2mb" }));
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists with this email."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword
    });

    res.status(201).json({
      message: "Account created successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      message: "Server error while creating account."
    });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    res.json({
      message: "Login successful.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        picture: user.picture
      }
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Server error while logging in."
    });
  }
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      const error = new Error("Only PDF files are allowed.");
      error.status = 400;
      return cb(error);
    }
    cb(null, true);
  },
});

// ---------------------------------------------------------------------------
// Gemini client initialization
// ---------------------------------------------------------------------------
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const hasApiKey = Boolean(GEMINI_API_KEY);

const ai = hasApiKey
  ? new GoogleGenAI({ apiKey: GEMINI_API_KEY })
  : null;

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

// ---------------------------------------------------------------------------
// In-memory conversation history (per session)
// ---------------------------------------------------------------------------
// A simple in-memory store keyed by a session id.  In a production app this
// would live in Redis or a database, but for this project an in-memory map is
// sufficient and keeps the architecture simple.
const sessions = new Map();

function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      mode: "chat",
      history: [],
      interview: {
        questionNumber: 0,
        currentQuestion: null,
        jobRole: null,
        candidateAnswers: [],
      },
    });
  }
  return sessions.get(sessionId);
}

// ---------------------------------------------------------------------------
// System instructions — separated by mode
// ---------------------------------------------------------------------------
const CHAT_SYSTEM_INSTRUCTION =
  "You are a helpful conversational AI assistant. Respond naturally to the user's actual message. Use conversation history and provide contextually relevant answers. Do not use generic responses for unrelated questions. Keep replies concise and friendly.";

const INTERVIEW_SYSTEM_INSTRUCTION =
  "You are a professional mock interviewer. Conduct an interactive job interview. Ask one question at a time. Evaluate the candidate's actual answer. Give concise constructive feedback and ask an appropriate next question. Maintain interview context throughout the interview. Keep your responses concise.";

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------
const knownSkills = [
  "HTML", "CSS", "JavaScript", "TypeScript", "React", "Node.js", "Express",
  "Python", "Django", "Flask", "Java", "C++", "SQL", "MongoDB", "PostgreSQL",
  "REST API", "GraphQL", "Git", "Docker", "Kubernetes", "AWS", "Azure",
  "GCP", "CI/CD", "Agile", "Testing", "Unit Testing", "Data Structures",
  "Algorithms", "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch",
  "scikit-learn", "pandas", "NumPy", "Data Analysis", "Statistics",
  "Data Visualization", "MLOps", "Linux", "Communication", "Problem Solving",
  "Authentication", "System Design", "Cloud Deployment", "Feature Engineering",
];

function normalizeText(text = "") {
  return text.toLowerCase().replace(/[^\w\s.+/#-]/g, " ");
}

function extractSkills(text = "") {
  const normalizedText = normalizeText(text);
  return knownSkills.filter((skill) => {
    const normalizedSkill = normalizeText(skill);
    const escaped = normalizedSkill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|\\s)${escaped}(\\s|$)`, "i").test(normalizedText);
  });
}

function parseJsonResponse(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function ensureText(value, label, maxLength = 30000) {
  if (typeof value !== "string" || !value.trim()) {
    const error = new Error(`${label} is required.`);
    error.status = 400;
    throw error;
  }
  return value.trim().slice(0, maxLength);
}

// async function extractPdfText(file) {
//   if (!file?.buffer) {
//     const error = new Error("Resume PDF is required.");
//     error.status = 400;
//     throw error;
//   }

//   // const parser = new PDFParse({ data: file.buffer });
//   try {
//     const result = await parser.getText();
//     return ensureText(result.text, "Readable PDF text");
//   } finally {
//     await parser.destroy();
//   }
// }

// ---------------------------------------------------------------------------
// Gemini request helpers
// ---------------------------------------------------------------------------
async function extractPdfText(file) {
  if (!file?.buffer) {
    const error = new Error("Resume PDF is required.");
    error.status = 400;
    throw error;
  }

  return ensureText(
    file.buffer.toString("utf8"),
    "Readable PDF text"
  );
}
/**
 * Calls Gemini for a text response.
 * @param {Array} contents - Gemini contents array (alternating user/model roles).
 * @param {string} systemInstruction - System instruction for the model.
 * @returns {Promise<string>} - The text response from Gemini.
 */
async function callGeminiForText(contents, systemInstruction,fallback = null) {
  if (!hasApiKey) {
    const error = new Error("AI generation is unavailable because GEMINI_API_KEY is not configured.");
    error.status = 503;
    throw error;
  }

  console.log("[Gemini] Request started");

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction,
        temperature: 0.4,
      },
    });

    const content = response?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error("Gemini did not return any content.");
    }

    console.log("[Gemini] Request successful");
    return content.trim();
  } catch (error) {
    const status = error?.status || error?.code || "UNKNOWN";
    if (fallback && (status === 503 || status === "503")) {
  console.log("[Gemini] Using fallback after 503");
  return fallback();
}
    console.error(`[Gemini] Request failed: ${status} ${error.message}`);
    throw error;
  }
}

/**
 * Calls Gemini for a JSON response (used by resume analysis, skill gap, code review).
 * @param {Array} contents - Gemini contents array.
 * @param {string} systemInstruction - System instruction for the model.
 * @param {Function} fallback - Fallback function returning a default object.
 * @returns {Promise<{data: object, source: string}>}
 */
async function callGeminiForJson(contents, systemInstruction, fallback) {
  if (!hasApiKey) {
    return { data: fallback(), source: "fallback" };
  }

  console.log("[Gemini] Request started");

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

    const content = response?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = parseJsonResponse(content);
    if (!parsed) {
      throw new Error("AI response was not valid JSON.");
    }

    console.log("[Gemini] Request successful");
    return { data: parsed, source: "ai" };
  } catch (error) {
    const status = error?.status || error?.code || "UNKNOWN";
    console.error(`[Gemini] Request failed: ${status} ${error.message}`);
    return { data: fallback(), source: "fallback" };
  }
}

// ---------------------------------------------------------------------------
// Fallback builders (used only when the API key is missing or the AI call
// fails for resume/code-review/skill-gap endpoints — these are deterministic
// local computations, not generic chatbot fallbacks)
// ---------------------------------------------------------------------------
function buildFallbackResumeAnalysis(resumeText) {
  const skills = extractSkills(resumeText);
  const hasMetrics = /\b\d+%|\b\d+\+|\b\d{2,}\b/.test(resumeText);
  const hasProjects = /project|portfolio|github/i.test(resumeText);
  const score = Math.max(45, Math.min(88, 55 + skills.length * 3 + (hasMetrics ? 8 : 0) + (hasProjects ? 7 : 0)));

  return {
    summary: "The resume shows relevant experience and technical foundations, but it should present achievements with clearer impact, stronger keywords, and more targeted role alignment.",
    strengths: [
      skills.length ? `Includes marketable skills such as ${skills.slice(0, 6).join(", ")}.` : "Includes a foundation that can be shaped toward target roles.",
      hasProjects ? "Mentions projects or portfolio-style work." : "Can be improved quickly by adding project evidence.",
      hasMetrics ? "Uses some measurable details." : "Has room to add measurable outcomes.",
    ],
    weaknesses: [
      "Several bullet points may need stronger action verbs and measurable business or technical impact.",
      "ATS keywords should be tailored for each target job description.",
      "Project and experience sections should emphasize tools, scope, and results.",
    ],
    atsImprovements: [
      "Use a simple single-column format with standard headings like Skills, Experience, Projects, and Education.",
      "Mirror important keywords from the job description naturally throughout the resume.",
      "Add measurable outcomes, technologies used, and deployment or collaboration details.",
    ],
    missingKeywords: ["role-specific tools", "testing", "deployment", "metrics", "collaboration"],
    score,
    recommendations: [
      "Rewrite each major bullet using action, task, technology, and measurable result.",
      "Add a compact skills section grouped by language, framework, database, tools, and cloud.",
      "Customize the top summary and first five skills for every application.",
    ],
  };
}

function buildSkillGapResult(resumeText, jobDescription) {
  const resumeSkills = extractSkills(resumeText);
  const jobSkills = extractSkills(jobDescription);
  const matchingSkills = jobSkills.filter((skill) => resumeSkills.includes(skill));
  const missingSkills = jobSkills.filter((skill) => !resumeSkills.includes(skill));
  const matchPercentage = jobSkills.length
    ? Math.round((matchingSkills.length / jobSkills.length) * 100)
    : 0;

  return {
    matchingSkills,
    missingSkills,
    matchPercentage,
    learningRecommendations: missingSkills.slice(0, 6).map((skill) => `Build one resume-ready project or exercise using ${skill}.`),
    coursesOrTopics: missingSkills.slice(0, 6).map((skill) => `${skill} fundamentals and practical implementation`),
    prioritySkills: missingSkills.slice(0, 5),
  };
}
function buildFallbackJobDescription(role) {
  return `Job Title: ${role}

Job Summary:
We are seeking a motivated professional for the ${role} position. The role involves applying relevant technical and professional skills to solve problems, complete projects, and contribute effectively to the organization.

Responsibilities:
- Perform tasks and responsibilities related to the ${role} position.
- Work on projects and solve technical or business problems.
- Collaborate with team members and communicate progress clearly.
- Follow established development, quality, and documentation practices.
- Continuously improve skills and stay updated with relevant technologies.

Required Qualifications:
- Bachelor's degree or equivalent qualification in a relevant field.
- Strong problem-solving and analytical abilities.
- Good communication and teamwork skills.
- Understanding of concepts relevant to the ${role} role.

Required Technical/Professional Skills:
- Role-specific technical knowledge.
- Problem solving and analytical thinking.
- Communication and collaboration.
- Ability to learn and work with new tools and technologies.

Preferred Skills:
- Practical project experience.
- Internship or professional experience in a related area.
- Familiarity with modern tools, frameworks, and development practices.

Experience Requirements:
- Fresh graduates and candidates with relevant internship or project experience may apply.
- Professional experience may be preferred depending on the organization and seniority of the role.`;
}
// ---------------------------------------------------------------------------
// Chat endpoint — Chat Mode and Interview Mode
// ---------------------------------------------------------------------------
app.post("/api/chat", async (req, res) => {
  const { message, mode, sessionId } = req.body;

  const session = getSession(sessionId || "default");
  const currentMode = mode || session.mode;
  session.mode = currentMode;

  const userMessage = ensureText(message, "Message");

  // Build the contents array from conversation history + new message
  const contents = [];

  // For interview mode, prepend interview context as part of the system
  // instruction so the model has full context.
  let systemInstruction = CHAT_SYSTEM_INSTRUCTION;

  if (currentMode === "interview") {
    systemInstruction = INTERVIEW_SYSTEM_INSTRUCTION;

    // If this is the first message and it's a start command, begin the interview
    const isStartCommand = /^(start\s+interview|start)/i.test(userMessage);

    if (isStartCommand && session.interview.questionNumber === 0) {
      // Begin the interview
      session.interview.questionNumber = 1;
      session.interview.currentQuestion = "Tell me about yourself.";
      session.interview.candidateAnswers = [];

      contents.push({
        role: "user",
        parts: [{ text: `The candidate has started the interview. Begin by asking the first interview question: "Tell me about yourself."` }],
      });

      try {
        const reply = await callGeminiForText(
  contents,
  systemInstruction,
  () => "Tell me about yourself."
);
        session.history.push({ role: "user", parts: [{ text: userMessage }] });
        session.history.push({ role: "model", parts: [{ text: reply }] });
        return res.json({ success: true, reply, mode: "interview" });
      } catch (error) {
        return res.status(503).json({
          success: false,
          error: "AI_SERVICE_ERROR",
          message: "The AI service is temporarily unavailable.",
        });
      }
    }

    // If we have a current question and the user is answering, evaluate the answer
    if (session.interview.currentQuestion && session.interview.questionNumber > 0) {
      session.interview.candidateAnswers.push({
        question: session.interview.currentQuestion,
        answer: userMessage,
        questionNumber: session.interview.questionNumber,
      });

      // Build interview context for the model
      const interviewContext = `Interview context:\n` +
        `Current question number: ${session.interview.questionNumber}\n` +
        `Current question: "${session.interview.currentQuestion}"\n` +
        `Job role: ${session.interview.jobRole || "general software engineering role"}\n` +
        `Previous Q&A pairs:\n` +
        session.interview.candidateAnswers
          .slice(0, -1)
          .map((qa, i) => `Q${qa.questionNumber}: ${qa.question}\nA: ${qa.answer}`)
          .join("\n") +
        `\n\nThe candidate's answer to the current question is: "${userMessage}"\n\n` +
        `Evaluate this answer with concise constructive feedback, then ask the next relevant interview question.`;

      contents.push({
        role: "user",
        parts: [{ text: interviewContext }],
      });

      try {
        const reply = await callGeminiForText(
  contents,
  systemInstruction,
  () => "Thanks for your answer. Let's continue with the next question: What are your strengths as a software developer?"
);
        session.interview.questionNumber += 1;
        session.interview.currentQuestion = reply; // The reply contains the next question
        session.history.push({ role: "user", parts: [{ text: userMessage }] });
        session.history.push({ role: "model", parts: [{ text: reply }] });
        return res.json({ success: true, reply, mode: "interview" });
      } catch (error) {
        return res.status(503).json({
          success: false,
          error: "AI_SERVICE_ERROR",
          message: "The AI service is temporarily unavailable.",
        });
      }
    }

    // If no current question yet, treat as starting the interview
    session.interview.questionNumber = 1;
    session.interview.currentQuestion = "Tell me about yourself.";
    session.interview.candidateAnswers = [];

    contents.push({
      role: "user",
      parts: [{ text: `The candidate has started the interview. Begin by asking the first interview question: "Tell me about yourself."` }],
    });

    try {
      const reply = await callGeminiForText(contents, systemInstruction);
      session.history.push({ role: "user", parts: [{ text: userMessage }] });
      session.history.push({ role: "model", parts: [{ text: reply }] });
      return res.json({ success: true, reply, mode: "interview" });
    } catch (error) {
      return res.status(503).json({
        success: false,
        error: "AI_SERVICE_ERROR",
        message: "The AI service is temporarily unavailable.",
      });
    }
  }

  // ---- Chat Mode ----
  // Add conversation history
  for (const histItem of session.history) {
    contents.push(histItem);
  }

  // Add the new user message
  contents.push({
    role: "user",
    parts: [{ text: userMessage }],
  });

  try {
    // const reply = await callGeminiForText(contents, systemInstruction);
    const reply = await callGeminiForText(
  contents,
  systemInstruction,
  () => "Gemini is temporarily busy. Please try your question again in a moment."
);
    session.history.push({ role: "user", parts: [{ text: userMessage }] });
    session.history.push({ role: "model", parts: [{ text: reply }] });
    res.json({ success: true, reply, mode: "chat" });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: "AI_SERVICE_ERROR",
      message: "The AI service is temporarily unavailable.",
    });
  }
});

// ---------------------------------------------------------------------------
// Resume analysis endpoint
// ---------------------------------------------------------------------------
app.post("/api/resume/analyze", upload.single("resume"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Resume PDF is required." });
    }

    const resumeText = await extractPdfText(req.file);

    const result = await callGeminiForJson(
      [
        {
          role: "user",
          parts: [{
            text: `Analyze this resume and return JSON with these exact keys: summary string, strengths array, weaknesses array, atsImprovements array, missingKeywords array, score number from 0 to 100, recommendations array.\n\nResume:\n${resumeText}`,
          }],
        },
      ],
      "You are a senior resume reviewer. Return strict JSON only.",
      () => buildFallbackResumeAnalysis(resumeText)
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// Skill gap analysis endpoint
// ---------------------------------------------------------------------------
app.post("/api/skill-gap/analyze", upload.single("resume"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Resume PDF is required." });
    }

    const resumeText = await extractPdfText(req.file);
    const jobDescription = ensureText(req.body.jobDescription, "Job description");
    const deterministicGap = buildSkillGapResult(resumeText, jobDescription);

    const result = await callGeminiForJson(
      [
        {
          role: "user",
          parts: [{
            text: `Compare the resume to the job description. Return JSON with exact keys: matchingSkills array, missingSkills array, matchPercentage number, learningRecommendations array, coursesOrTopics array, prioritySkills array. Use this calculated match percentage unless you find a clear extraction issue: ${deterministicGap.matchPercentage}.\n\nResume:\n${resumeText}\n\nJob Description:\n${jobDescription}`,
          }],
        },
      ],
      "You are a career coach and ATS analyst. Return strict JSON only.",
      () => deterministicGap
    );

    const responseData = {
      ...deterministicGap,
      ...result.data,
      matchPercentage: deterministicGap.matchPercentage,
    };

    res.json({ data: responseData, source: result.source });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// Job description generation endpoint
// ---------------------------------------------------------------------------
app.post("/api/job-description", async (req, res, next) => {
  try {
    const role = ensureText(req.body.role, "Job role", 120);
    const description = await callGeminiForText(
      [
        {
          role: "user",
          parts: [{
            text: `Generate a professional and realistic job description for the following job role:\n\nJob Role: ${role}\n\nInclude:\n1. Job title\n2. Short job summary\n3. Responsibilities\n4. Required qualifications\n5. Required technical/professional skills\n6. Preferred skills\n7. Experience requirements\n\nWrite the result specifically for the requested role.\n\nDo not change the job role.\nDo not return only the job title.\nReturn the complete job description as plain text.`,
          }],
        },
      ],
    //   "You generate professional, realistic job descriptions. Return plain text only."
    // );
"You generate professional, realistic job descriptions. Return plain text only.",
() => buildFallbackJobDescription(role)
);
    res.json({ role, description, source: "ai" });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// Code review endpoint
// ---------------------------------------------------------------------------
app.post("/api/code-review", async (req, res, next) => {
  try {
    const code = ensureText(req.body.code, "Code snippet", 15000);
    const language = typeof req.body.language === "string" ? req.body.language.trim() : "javascript";

    const fallback = () => ({
      feedback:
        "Review your code for clear naming, edge cases, time/space complexity, and add tests for the main scenarios.",
    });

    const result = await callGeminiForJson(
      [
        {
          role: "user",
          parts: [{
            text: `Review this ${language} code for correctness, complexity, style, and interview readiness. Return JSON: { "feedback": "..." }\n\n${code}`,
          }],
        },
      ],
      "You are a coding interview coach. Return strict JSON only with key feedback as a string containing concise review points.",
      fallback
    );

    res.json({ feedback: result.data.feedback || fallback().feedback, source: result.source });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// Sandboxed code execution endpoint
// ---------------------------------------------------------------------------
// The execution provider is called from the server so a provider token is
// never exposed to browser users. CODE_EXECUTION_URL must be Piston-compatible.
const EXECUTABLE_LANGUAGES = {
  javascript: "javascript",
  python: "python",
  cpp: "c++",
  c: "c",
  java: "java",
};
const CODE_EXECUTION_URL = process.env.CODE_EXECUTION_URL || "https://emkc.org/api/v2/piston/execute";

app.post("/api/execute", async (req, res, next) => {
  try {
    const requestedLanguage = typeof req.body.language === "string" ? req.body.language.trim() : "";
    const language = EXECUTABLE_LANGUAGES[requestedLanguage];
    const code = ensureText(req.body.code, "Code", 15000);

    if (requestedLanguage === "html" || requestedLanguage === "css") {
      return res.status(400).json({ error: "HTML and CSS do not produce terminal output. Use a browser preview for these languages." });
    }
    if (!language) {
      return res.status(400).json({ error: "Choose JavaScript, Python, C++, C, or Java to run code." });
    }
    if (!process.env.CODE_EXECUTION_API_KEY && CODE_EXECUTION_URL.includes("emkc.org")) {
      return res.status(503).json({
        error: "Code execution is not configured. Set CODE_EXECUTION_URL to your Piston-compatible service and, if required, CODE_EXECUTION_API_KEY in Vercel.",
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let executionResponse;
    try {
      const headers = { "Content-Type": "application/json" };
      if (process.env.CODE_EXECUTION_API_KEY) headers.Authorization = `Bearer ${process.env.CODE_EXECUTION_API_KEY}`;
      executionResponse = await fetch(CODE_EXECUTION_URL, {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          language,
          version: "*",
          files: [{ content: code }],
          compile_timeout: 10000,
          run_timeout: 3000,
        }),
      });
    } finally {
      clearTimeout(timeout);
    }

    const result = await executionResponse.json().catch(() => ({}));
    if (!executionResponse.ok) {
      const providerMessage = result.message || result.error || "The code execution service rejected the request.";
      return res.status(502).json({ error: `Code execution service error: ${providerMessage}` });
    }

    const output = [result.compile?.output, result.run?.output].filter(Boolean).join("");
    res.json({ output, exitCode: result.run?.code ?? result.compile?.code ?? null });
  } catch (error) {
    if (error.name === "AbortError") {
      return res.status(504).json({ error: "Code execution timed out. Please simplify the program and try again." });
    }
    next(error);
  }
});

// ---------------------------------------------------------------------------
// Error handler
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE"
      ? "PDF must be 5 MB or smaller."
      : err.message;
    return res.status(400).json({ error: message });
  }

  console.error("API error:", err.message);
  res.status(err.status || 500).json({
    error: err.status ? err.message : "Something went wrong while processing the request.",
  });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

module.exports = app;
