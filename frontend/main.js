const questions = window.INTERVIEW_QUESTIONS || [];

let flashcardMode = false;

// === Job Filtering & Save Toggle ===
function saveJob(button) {
  const card = button.closest(".step-card");
  const title = card.querySelector("p").textContent.trim();

  let saved = JSON.parse(localStorage.getItem("savedJobs") || "[]");

  if (saved.includes(title)) {
    saved = saved.filter((job) => job !== title);
    button.textContent = "⭐ Save Job";
    button.classList.remove("saved");
  } else {
    saved.push(title);
    button.textContent = "✅ Saved";
    button.classList.add("saved");
  }

  localStorage.setItem("savedJobs", JSON.stringify(saved));
}

function clearFilters() {
  const skillInput = document.getElementById("skillInput");
  const locationInput = document.getElementById("locationInput");
  const typeSelect = document.getElementById("typeSelect");

  if (!skillInput || !locationInput || !typeSelect) return;

  skillInput.value = "";
  locationInput.value = "";
  typeSelect.value = "";
  filterJobs();
}

function showAllJobs() {
  clearFilters();
}

function normalizeOpportunityType(value) {
  const normalizedValue = String(value || "").trim().toLowerCase();

  if (normalizedValue.includes("intern")) return "internship";
  if (normalizedValue.includes("job")) return "job";

  return normalizedValue;
}

function updateOpportunityCount(count, type, hasAdditionalFilters) {
  const countElement = document.getElementById("opportunityCount");
  if (!countElement) return;

  const label = type === "job" ? "job" : type === "internship" ? "internship" : "opportunity";
  const pluralLabel = count === 1 ? label : label === "opportunity" ? "opportunities" : `${label}s`;
  const suffix = hasAdditionalFilters ? " matching your filters" : "";

  countElement.textContent = `Showing ${count} ${pluralLabel}${suffix}`;
}

function filterJobs() {
  const skillInput = document.getElementById("skillInput");
  const locationInput = document.getElementById("locationInput");
  const typeSelect = document.getElementById("typeSelect");
  const jobResults = document.getElementById("jobResults");

  if (!skillInput || !locationInput || !typeSelect || !jobResults) return;

  const skill = skillInput.value.trim().toLowerCase();
  const location = locationInput.value.trim().toLowerCase();
  const type = normalizeOpportunityType(typeSelect.value);
  const jobs = jobResults.querySelectorAll(".step-card");
  let matchCount = 0;

  jobs.forEach((job) => {
    const jobSkill = (job.dataset.skills || "").toLowerCase();
    const jobLocation = (job.dataset.location || "").toLowerCase();
    const jobType = normalizeOpportunityType(job.dataset.type);

    const matchesSkill = !skill || jobSkill.includes(skill);
    const matchesLocation = !location || jobLocation.includes(location);
    const matchesType = !type || jobType === type;
    const matches = matchesSkill && matchesLocation && matchesType;

    job.hidden = !matches;
    if (matches) matchCount += 1;
  });

  const notice = document.getElementById("noResultsMessage");
  if (notice) notice.style.display = matchCount ? "none" : "block";

  updateOpportunityCount(matchCount, type, Boolean(skill || location));
}

// === Chatbot Logic ===
let botMode = "chat"; // default
let chatSessionId = "default";

function setMode(mode) {
  botMode = mode;
  document
    .getElementById("chatMode")
    .classList.toggle("active-mode", mode === "chat");
  document
    .getElementById("interviewMode")
    .classList.toggle("active-mode", mode === "interview");

  const botMsg = document.createElement("div");
  botMsg.className = "chat-message bot";
  botMsg.textContent = `🔁 Switched to ${
    mode === "chat" ? "Chat" : "Interview"
  } Mode.`;
  document.getElementById("chatBox").appendChild(botMsg);
  scrollToBottom();
}

function sendMessage() {
  const input = document.getElementById("chatInput");
  const message = input.value.trim();
  if (!message) return;

  const chatBox = document.getElementById("chatBox");

  const userMsg = document.createElement("div");
  userMsg.className = "chat-message user";
  userMsg.textContent = message;
  chatBox.appendChild(userMsg);

  const botMsg = document.createElement("div");
  botMsg.className = "chat-message bot";
  botMsg.textContent = "Thinking...";
  chatBox.appendChild(botMsg);

  scrollToBottom();

  fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, mode: botMode, sessionId: chatSessionId }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success && data.reply) {
        typeBotMessage(botMsg, data.reply);
      } else if (data.success === false) {
        botMsg.textContent = `⚠️ ${data.message || "The AI service is temporarily unavailable."}`;
      } else {
        botMsg.textContent = "⚠️ No response received (empty reply).";
      }
    })
    .catch((err) => {
      console.error("Chat error:", err);
      botMsg.textContent = "⚠️ Something went wrong while contacting the AI.";
    });

  input.value = "";
}

function typeBotMessage(botMsgEl, fullText) {
  botMsgEl.textContent = "";
  let index = 0;
  const typing = setInterval(() => {
    botMsgEl.textContent += fullText[index];
    index++;
    scrollToBottom();
    if (index >= fullText.length) clearInterval(typing);
  }, 20);
}

function scrollToBottom() {
  const box = document.getElementById("chatBox");
  box.scrollTop = box.scrollHeight;
}

function clearChat() {
  const chatBox = document.getElementById("chatBox");
  chatBox.innerHTML =
    '<div class="chat-message bot">Hi! I\'m your AI interviewer. Ask me anything or type "Start interview".</div>';
  // Generate a new session id so the backend starts fresh
  chatSessionId = "session_" + Date.now();
  scrollToBottom();
}

function startVoiceInput() {
  const input = document.getElementById("chatInput");
  if (!("webkitSpeechRecognition" in window)) {
    alert("Voice input not supported in this browser.");
    return;
  }

  const recognition = new webkitSpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const speechText = event.results[0][0].transcript;
    input.value = speechText;
    input.focus();
  };

  recognition.onerror = (event) => {
    alert("Voice input failed: " + event.error);
  };

  recognition.start();
}

// === DOM Ready ===
document.addEventListener("DOMContentLoaded", () => {
  const saved = JSON.parse(localStorage.getItem("savedJobs") || "[]");
  document.querySelectorAll(".step-card").forEach((card) => {
    const title = card.querySelector("p").textContent.trim();
    const button = card.querySelector("button");
    if (saved.includes(title)) {
      button.textContent = "✅ Saved";
      button.classList.add("saved");
    }
  });

  const input = document.getElementById("chatInput");
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });

  document
    .getElementById("job-filter-form")
    ?.addEventListener("submit", (e) => {
      e.preventDefault();
      filterJobs();
    });

  ["skillInput", "locationInput"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", filterJobs);
  });
  document.getElementById("typeSelect")?.addEventListener("change", filterJobs);

  filterJobs();
});

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("dashboard-summary")) {
    // ROADMAP PROGRESS
    const totalSteps = Object.keys(localStorage).filter((key) =>
      key.includes("-step-")
    );
    const completed = totalSteps.filter(
      (key) => localStorage.getItem(key) === "true"
    );
    document.getElementById("roadmapCount").textContent = completed.length;

    // SAVED JOBS
    const savedJobsList = document.getElementById("savedJobsList");
    const savedJobs = JSON.parse(localStorage.getItem("savedJobs")) || [];

    if (savedJobs.length === 0) {
      savedJobsList.innerHTML = "<li>No saved jobs yet.</li>";
    } else {
      savedJobs.forEach((job) => {
        const li = document.createElement("li");
        li.textContent = job;
        savedJobsList.appendChild(li);
      });
    }
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const steps = document.querySelectorAll(".step-card");

  steps.forEach((step, i) => {
    const checkbox = step.querySelector(".roadmap-check");
    const stepId = `${location.pathname}-step-${i}`;
    const saved = localStorage.getItem(stepId);
    if (!checkbox) return;

    step.setAttribute("role", "checkbox");
    step.setAttribute("tabindex", "0");

    if (checkbox && saved) {
      checkbox.checked = true;
      step.classList.add("step-done");
      step.setAttribute("aria-checked", "true");
    }

    const saveStepState = () => {
      const done = checkbox.checked;
      const title = step.querySelector("p")?.innerText;
      const blockHeading = step.closest(".roadmap-container")?.querySelector("h3")?.innerText || "General Roadmap";

      if (done && title) {
        localStorage.setItem(stepId, JSON.stringify({ block: blockHeading, title: title })); // ✅ Save block heading + step name
      } else {
        localStorage.removeItem(stepId); // ❌ Remove from storage
      }

      step.classList.toggle("step-done", done);
      step.setAttribute("aria-checked", String(done));
    };

    checkbox.addEventListener("change", saveStepState);

    step.addEventListener("click", (event) => {
      if (event.target === checkbox) return;

      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event("change"));
    });

    step.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;

      event.preventDefault();
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event("change"));
    });
  });
});

// Show/hide back to top button
window.addEventListener("scroll", () => {
  const button = document.querySelector(".back-to-top");
  if (!button) return;

  if (window.scrollY > 250) {
    button.classList.add("show");
  } else {
    button.classList.remove("show");
  }
});

// Smooth scroll to top
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}


// Set window.CAREER_HUB_API_BASE_URL before main.js when the API is deployed
// somewhere other than the default production API. This never falls back to
// localhost in production.
const API_BASE_URL = (window.CAREER_HUB_API_BASE_URL || "https://ultimate-career-hub-ngne.vercel.app").replace(/\/$/, "");
function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function renderList(items) {
  const safeItems = normalizeList(items);
  if (!safeItems.length) return "<p>Not enough information found.</p>";
  return `<ul>${safeItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderLoading(target, message) {
  if (!target) return;
  target.hidden = false;
  target.innerHTML = `
    <div class="ai-loading-card">
      <div class="spinner"></div>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function renderError(target, message) {
  if (!target) return;
  target.hidden = false;
  target.innerHTML = `<div class="ai-error-card">${escapeHtml(message)}</div>`;
}

function renderResult(target, html) {
  if (!target) return;
  target.innerHTML = html;
  target.hidden = !target.textContent.trim();
}

function clearResult(target) {
  if (!target) return;
  target.innerHTML = "";
  target.hidden = true;
}

function getFriendlyAIError(message = "") {
  const lowerMessage = message.toLowerCase();
  if (
    lowerMessage.includes("429") ||
    lowerMessage.includes("quota") ||
    lowerMessage.includes("billing") ||
    lowerMessage.includes("exceeded your current quota")
  ) {
    return "AI generation is currently unavailable because the API quota has been exceeded. Please check the Gemini API project's billing and usage.";
  }
  return message || "Could not generate the job description.";
}

function renderResumeAnalysis(analysis) {
  return `
    <div class="ai-result-card">
      <div class="ai-result-header">
        <h3>Resume Review</h3>
        <div class="resume-score">${Number(analysis.score || 0)}/100</div>
      </div>
      <div class="ai-result-section">
        <h4>Resume Summary</h4>
        <p>${escapeHtml(analysis.summary || "Summary unavailable.")}</p>
      </div>
      <div class="ai-result-grid">
        <div class="ai-result-section">
          <h4>Strengths</h4>
          ${renderList(analysis.strengths)}
        </div>
        <div class="ai-result-section">
          <h4>Weaknesses</h4>
          ${renderList(analysis.weaknesses)}
        </div>
        <div class="ai-result-section">
          <h4>ATS Improvements</h4>
          ${renderList(analysis.atsImprovements)}
        </div>
        <div class="ai-result-section">
          <h4>Missing Keywords</h4>
          ${renderList(analysis.missingKeywords)}
        </div>
      </div>
      <div class="ai-result-section">
        <h4>Actionable Recommendations</h4>
        ${renderList(analysis.recommendations)}
      </div>
    </div>
  `;
}

function renderSkillGapResult(result) {
  return `
    <div class="ai-result-card">
      <div class="ai-result-header">
        <h3>Skill Gap Analysis</h3>
        <div class="resume-score">${Number(result.matchPercentage || 0)}%</div>
      </div>
      <div class="ai-result-grid">
        <div class="ai-result-section">
          <h4>Matching Skills</h4>
          ${renderList(result.matchingSkills)}
        </div>
        <div class="ai-result-section">
          <h4>Missing Skills</h4>
          ${renderList(result.missingSkills)}
        </div>
        <div class="ai-result-section">
          <h4>Learning Recommendations</h4>
          ${renderList(result.learningRecommendations)}
        </div>
        <div class="ai-result-section">
          <h4>Courses/Topics to Learn</h4>
          ${renderList(result.coursesOrTopics)}
        </div>
      </div>
      <div class="ai-result-section">
        <h4>Priority Skills</h4>
        ${renderList(result.prioritySkills)}
      </div>
    </div>
  `;
}

async function postFormData(url, formData) {
  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "The server could not process this request.");
  }
  return data;
}

async function analyzeResumeWithAI() {
  const file = document.getElementById("resumeInput").files[0];
  const resultDiv = document.getElementById("resumeAIResult");

  if (!file) {
    renderError(resultDiv, "Please upload a resume PDF.");
    return;
  }

  renderLoading(resultDiv, "Analyzing your resume...");

  try {
    const formData = new FormData();
    formData.append("resume", file);

    const response = await postFormData(`${API_BASE_URL}/api/resume/analyze`, formData);

    renderResult(resultDiv, renderResumeAnalysis(response.data));
  } catch (error) {
    console.error("Resume analysis failed:", error);
    renderError(resultDiv, getFriendlyAIError(error.message));
  }
}

async function analyzeSkillGap() {
  const resumeFile = document.getElementById("resumeFile").files[0];
  const jobDesc = document.getElementById("jobDesc").value.trim();
  const gapResults = document.getElementById("gapResults");
  const loadingText = document.getElementById("gapLoading");

  if (!resumeFile || !jobDesc) {
    renderError(gapResults, "Please upload a resume and paste a job description.");
    return;
  }

  loadingText.style.display = "block";
  clearResult(gapResults);

  try {
    const formData = new FormData();
    formData.append("resume", resumeFile);
    formData.append("jobDescription", jobDesc);

    const response = await postFormData(`${API_BASE_URL}/api/skill-gap/analyze`, formData);

    renderResult(gapResults, renderSkillGapResult(response.data));
  } catch (error) {
    console.error("Skill gap analysis failed:", error);
    renderError(gapResults, `Unable to analyze the resume. Reason: ${getFriendlyAIError(error.message)}`);
  } finally {
    loadingText.style.display = "none";
  }
}

async function fetchJobDescription() {
  const jobRoleInput = document.getElementById("jobSearchQuery");
  const jobDescBox = document.getElementById("jobDesc");
  const button = document.getElementById("autofillJobDescBtn");
  const status = document.getElementById("jobDescriptionStatus");
  const role = jobRoleInput.value.trim();

  if (!role) {
    if (status) {
      status.textContent = "Please enter a job role first.";
      status.classList.add("error");
      status.hidden = false;
    } else {
      alert("Please enter a job role first.");
    }
    jobRoleInput.focus();
    return;
  }

  try {
    if (button) {
      button.disabled = true;
      button.textContent = "? Generating with AI...";
    }
    if (status) {
      status.textContent = "Generating a role-specific job description with AI...";
      status.classList.remove("error");
      status.hidden = false;
    }

    const response = await fetch(`${API_BASE_URL}/api/job-description`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Could not generate a job description.");
    }

    const generatedDescription = data.description || data.text || data.reply || "";
    if (!generatedDescription.trim()) {
      throw new Error("AI returned an empty job description.");
    }

    jobDescBox.value = generatedDescription.trim();
    jobDescBox.dispatchEvent(new Event("input", { bubbles: true }));
    if (status) {
      status.textContent = "";
      status.classList.remove("error");
      status.hidden = true;
    }
  } catch (err) {
    console.error("Job description autofill failed:", err);
    if (status) {
      status.textContent = getFriendlyAIError(err.message);
      status.classList.add("error");
      status.hidden = false;
    } else {
      alert(err.message);
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "? Autofill Job Description";
    }
  }
}

function showCompanyInsights(company) {
  document.getElementById("modalCompany").innerText = company;
  const modalContent = document.getElementById("modalContent");

  const insights = {
    CodeCraft: {
      rating: "4.4 ⭐",
      salary: "$1,000/mo (internship)",
      difficulty: "Medium",
      questions: ["CSS Grid vs Flexbox?", "React lifecycle methods"],
      culture: "Creative environment, flexible work hours.",
    },
    "AI Labs": {
      rating: "4.7 ⭐",
      salary: "$1,500–$2,000/mo",
      difficulty: "High",
      questions: ["Explain backpropagation", "TensorFlow vs PyTorch"],
      culture: "Research-focused, collaborative teams.",
    },
    WriteWise: {
      rating: "3.9 ⭐",
      salary: "$800/mo",
      difficulty: "Easy",
      questions: ["What is SEO?", "How do you write engaging content?"],
      culture: "Content-driven, flexible deadlines.",
    },
    // Add more companies as needed
  };

  const info = insights[company] || {
    rating: "N/A",
    salary: "N/A",
    difficulty: "N/A",
    questions: ["No available questions."],
    culture: "No data available yet.",
  };

  modalContent.innerHTML = `
    <p><strong>Rating:</strong> ${info.rating}</p>
    <p><strong>Average Salary:</strong> ${info.salary}</p>
    <p><strong>Interview Difficulty:</strong> ${info.difficulty}</p>
    <p><strong>Sample Questions:</strong></p>
    <ul>${info.questions.map((q) => `<li>${q}</li>`).join("")}</ul>
    <p><strong>Company Culture:</strong> ${info.culture}</p>
  `;

  document.getElementById("companyModal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("companyModal").classList.add("hidden");
}

// === Interview Tab Switching ===
const CATEGORY_TABS = {
  technical: "Technical",
  hr: "HR",
  behavioral: "Behavioral",
  aptitude: "Aptitude",
  coding: "Coding",
};

const interviewPracticeState = {
  activeTab: "technical",
  indexByTab: {
    technical: 0,
    hr: 0,
    behavioral: 0,
    aptitude: 0,
    coding: 0,
  },
  showAnswer: false,
};

function renderCategoryQuestions(tabId, category) {
  const container = document.getElementById(`${tabId}-questions`);
  if (!container) return;

  const categoryQuestions = questions.filter((q) => q.category === category);
  if (!categoryQuestions.length) {
    container.innerHTML = `<p>No questions available for ${escapeHtml(category)} yet.</p>`;
    return;
  }

  const currentIndex = interviewPracticeState.indexByTab[tabId] || 0;
  const safeIndex = Math.min(currentIndex, categoryQuestions.length - 1);
  interviewPracticeState.indexByTab[tabId] = safeIndex;
  const q = categoryQuestions[safeIndex];
  const progress = ((safeIndex + 1) / categoryQuestions.length) * 100;
  const answerHtml = interviewPracticeState.showAnswer
    ? `<div class="practice-answer">${formatPracticeAnswer(q)}</div>`
    : "";

  container.innerHTML = `
    <article class="practice-panel">
      <div class="practice-topline">
        <span>Question ${safeIndex + 1} of ${categoryQuestions.length}</span>
        <small>${escapeHtml(q.difficulty || "Practice")}</small>
      </div>
      <div class="practice-progress" aria-label="Question progress">
        <div style="width: ${progress}%"></div>
      </div>
      <div class="practice-card">
        <h4>${escapeHtml(q.question)}</h4>
        ${formatQuestionDetails(q)}
        ${answerHtml}
      </div>
      <div class="practice-controls">
        <button onclick="goToPracticeQuestion('${tabId}', -1)" ${safeIndex === 0 ? "disabled" : ""}>← Previous</button>
        <button onclick="togglePracticeAnswer()">${interviewPracticeState.showAnswer ? "Hide Answer" : "Show Answer"}</button>
        <button onclick="goToPracticeQuestion('${tabId}', 1)" ${safeIndex === categoryQuestions.length - 1 ? "disabled" : ""}>Next →</button>
      </div>
      <div class="practice-navigator">
        ${categoryQuestions
          .map(
            (_, index) =>
              `<button class="${index === safeIndex ? "active" : ""}" onclick="jumpToPracticeQuestion('${tabId}', ${index})">${index + 1}</button>`
          )
          .join("")}
      </div>
    </article>
  `;
}

function showTab(tabName) {
  document.querySelectorAll(".qa-tab").forEach((tab) => {
    tab.classList.remove("active-tab");
  });

  const activeTab = document.getElementById(tabName);
  if (activeTab) {
    activeTab.classList.add("active-tab");
  }

  document.querySelectorAll(".tab-buttons button").forEach((btn) => {
    btn.classList.remove("active");
    const onclick = btn.getAttribute("onclick") || "";
    if (onclick.includes(`'${tabName}'`) || onclick.includes(`"${tabName}"`)) {
      btn.classList.add("active");
    }
  });

  if (CATEGORY_TABS[tabName]) {
    interviewPracticeState.activeTab = tabName;
    interviewPracticeState.indexByTab[tabName] = 0;
    interviewPracticeState.showAnswer = false;
    renderCategoryQuestions(tabName, CATEGORY_TABS[tabName]);
  }
}

function goToPracticeQuestion(tabId, direction) {
  const categoryQuestions = questions.filter((q) => q.category === CATEGORY_TABS[tabId]);
  const nextIndex = Math.max(
    0,
    Math.min((interviewPracticeState.indexByTab[tabId] || 0) + direction, categoryQuestions.length - 1)
  );
  interviewPracticeState.indexByTab[tabId] = nextIndex;
  interviewPracticeState.showAnswer = false;
  renderCategoryQuestions(tabId, CATEGORY_TABS[tabId]);
}

function jumpToPracticeQuestion(tabId, index) {
  interviewPracticeState.indexByTab[tabId] = index;
  interviewPracticeState.showAnswer = false;
  renderCategoryQuestions(tabId, CATEGORY_TABS[tabId]);
}

function togglePracticeAnswer() {
  interviewPracticeState.showAnswer = !interviewPracticeState.showAnswer;
  renderCategoryQuestions(
    interviewPracticeState.activeTab,
    CATEGORY_TABS[interviewPracticeState.activeTab]
  );
}

function formatPracticeAnswer(q) {
  if (q.category === "Aptitude") {
    return `
      <p><strong>Correct Answer:</strong> ${escapeHtml(q.correctAnswer)}</p>
      <p><strong>Explanation:</strong> ${escapeHtml(q.explanation)}</p>
    `;
  }

  if (q.category === "Coding") {
    return `
      <p><strong>Explanation:</strong> ${escapeHtml(q.explanation)}</p>
      <p><strong>Solution:</strong></p>
      <pre><code>${escapeHtml(q.solution)}</code></pre>
      <p><strong>Time Complexity:</strong> ${escapeHtml(q.timeComplexity)}</p>
      <p><strong>Space Complexity:</strong> ${escapeHtml(q.spaceComplexity)}</p>
    `;
  }

  return `<p>${escapeHtml(q.answer)}</p>`;
}

function formatQuestionDetails(q) {
  if (q.category === "Aptitude") {
    return `
      <ol class="practice-options" type="A">
        ${q.options.map((option) => `<li>${escapeHtml(option)}</li>`).join("")}
      </ol>
    `;
  }

  if (q.category === "Coding") {
    return `
      <p><strong>Problem:</strong> ${escapeHtml(q.statement)}</p>
      <div class="practice-example">
        <p><strong>Example Input:</strong> ${escapeHtml(q.exampleInput)}</p>
        <p><strong>Example Output:</strong> ${escapeHtml(q.exampleOutput)}</p>
      </div>
    `;
  }

  return "";
}

function displayQuestions(filtered = questions) {
  const container = document.getElementById("questionContainer");
  if (!container) return;

  container.innerHTML = "";

  filtered.forEach((q, index) => {
    const card = document.createElement("div");
    card.className = flashcardMode
      ? "question-card flashcard"
      : "question-card";
    card.innerHTML = `
              <strong>Q${index + 1}: ${q.question}</strong>
              <p class="answer" hidden>${q.answer}</p>
              <button type="button" class="answer-toggle" aria-expanded="false">Show Answer</button>
              <p><small>${q.category} • ${q.company} • ${
      q.difficulty
    }</small></p>
            `;
    const answer = card.querySelector(".answer");
    const answerToggle = card.querySelector(".answer-toggle");

    const setAnswerVisibility = (showAnswer) => {
      answer.hidden = !showAnswer;
      answerToggle.textContent = showAnswer ? "Hide Answer" : "Show Answer";
      answerToggle.setAttribute("aria-expanded", String(showAnswer));
      card.classList.toggle("flipped", showAnswer);
    };

    answerToggle.addEventListener("click", () => {
      setAnswerVisibility(answer.hidden);
    });

    if (flashcardMode) {
      card.onclick = (event) => {
        if (event.target.closest("button")) return;
        setAnswerVisibility(answer.hidden);
      };
    }
    container.appendChild(card);
  });
}

function filterQuestions() {
  const cat = document.getElementById("filterCategory").value;
  const comp = document.getElementById("filterCompany").value;
  const diff = document.getElementById("filterDifficulty").value;

  const filtered = questions.filter((q) => {
    return (
      (!cat || q.category === cat) &&
      (!comp || q.company === comp) &&
      (!diff || q.difficulty === diff)
    );
  });

  displayQuestions(filtered);
}

function toggleFlashcardMode() {
  flashcardMode = !flashcardMode;
  displayQuestions();
}

window.onload = () => {
  if (document.getElementById("questionContainer")) {
    displayQuestions();
  }

  if (document.getElementById("technical-questions")) {
    showTab("technical");
  }
};

document.addEventListener("keydown", (event) => {
  if (!document.getElementById("interview")) return;
  if (event.key === "ArrowLeft") {
    goToPracticeQuestion(interviewPracticeState.activeTab, -1);
  }
  if (event.key === "ArrowRight") {
    goToPracticeQuestion(interviewPracticeState.activeTab, 1);
  }
});

// === AI Career Tools Tab Switching ===
function switchAIToolTab(tabId) {
  // Update tab buttons
  document.querySelectorAll(".ai-tools-tab-btn").forEach((btn) => {
    btn.classList.remove("active");
    btn.setAttribute("aria-selected", "false");
  });

  const activeBtn = document.getElementById(`tab-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.add("active");
    activeBtn.setAttribute("aria-selected", "true");
  }

  // Update tab panels
  document.querySelectorAll(".ai-tools-tab-panel").forEach((panel) => {
    panel.classList.remove("active");
  });

  const activePanel = document.getElementById(tabId);
  if (activePanel) {
    activePanel.classList.add("active");
  }
}

