/**
 * Generates interview-questions.js with 100+ questions per category.
 * Run: node scripts/generate-interview-questions.js
 */
const fs = require("fs");
const path = require("path");

const companies = ["General", "Google", "Amazon", "Microsoft", "Meta", "Apple", "Netflix", "Flipkart"];
const difficulties = ["Easy", "Medium", "Hard"];

function pick(list, index) {
  return list[index % list.length];
}

function buildHrQuestions() {
  const bases = [
    ["Tell me about yourself.", "Give a concise 60–90 second pitch: current role/education, relevant skills, and why this role fits your goals."],
    ["Why do you want to work here?", "Research the company mission, product, and culture; connect your skills and values to their goals."],
    ["Why should we hire you?", "Highlight 2–3 strengths with examples that map directly to the job requirements."],
    ["What are your strengths?", "Choose strengths relevant to the role and support each with a brief achievement."],
    ["What is your greatest weakness?", "Pick a real weakness, explain how you are improving it, and show progress."],
    ["Where do you see yourself in 5 years?", "Show ambition aligned with growth in the company without sounding unrealistic."],
    ["Why are you leaving your current job?", "Stay positive: focus on growth, new challenges, and alignment with this opportunity."],
    ["Describe your ideal work environment.", "Mention collaboration, learning culture, and values that match the employer."],
    ["How do you handle stress and pressure?", "Share a specific example with calm prioritization, communication, and delivery."],
    ["Tell me about a time you failed.", "Use STAR: explain the failure, what you learned, and how you applied that lesson later."],
    ["How do you prioritize tasks?", "Explain your framework: urgency vs impact, deadlines, stakeholder communication."],
    ["Describe a time you showed leadership.", "Leadership can be informal: taking initiative, mentoring, or unblocking the team."],
    ["What motivates you at work?", "Connect motivation to meaningful impact, learning, and team success."],
    ["How do you handle constructive criticism?", "Show openness, reflection, and concrete changes you made after feedback."],
    ["What salary are you expecting?", "Give a researched range and express flexibility based on total compensation and growth."],
    ["Are you willing to relocate?", "Answer honestly based on your situation while staying professional."],
    ["Do you prefer working alone or in a team?", "Show balance: independent ownership with strong collaboration."],
    ["How do you stay updated in your field?", "Mention courses, blogs, communities, side projects, or certifications."],
    ["Tell me about a conflict with a coworker.", "Focus on empathy, facts, resolution, and preserving the working relationship."],
    ["What do you know about our company?", "Summarize product, market, recent news, and why it excites you."],
    ["How would your previous manager describe you?", "Pick traits backed by examples: reliable, proactive, collaborative."],
    ["What makes you unique?", "Share a differentiator: perspective, skill combination, or achievement."],
    ["How do you define success?", "Tie success to quality outcomes, team impact, and continuous improvement."],
    ["What questions do you have for us?", "Ask about team structure, success metrics, growth, and engineering culture."],
    ["How do you handle tight deadlines?", "Describe planning, scope negotiation, focus, and transparent updates."],
  ];

  const questions = [];
  let n = 0;
  while (questions.length < 100) {
    const [q, a] = bases[n % bases.length];
    const variant = Math.floor(n / bases.length);
    questions.push({
      question: variant === 0 ? q : `${q.replace("?", "")} (Follow-up ${variant + 1})?`,
      answer: a,
      category: "HR",
      company: pick(companies, n),
      difficulty: pick(difficulties, n),
    });
    n += 1;
  }
  return questions;
}

function buildTechnicalQuestions() {
  const topics = [
    ["Explain the difference between TCP and UDP.", "TCP is connection-oriented and reliable; UDP is faster and connectionless with no guaranteed delivery."],
    ["What is the OSI model?", "Seven layers from physical to application that describe network communication responsibilities."],
    ["Explain REST API principles.", "Stateless resources, standard HTTP methods, clear URIs, and meaningful status codes."],
    ["What is normalization in databases?", "Organizing tables to reduce redundancy and improve integrity, typically up to 3NF."],
    ["Explain indexing in SQL.", "Indexes speed up reads but add write overhead; choose columns used in WHERE/JOIN."],
    ["What is a closure in JavaScript?", "A function that retains access to variables from its lexical scope after the outer function returns."],
    ["Difference between == and === in JavaScript?", "== performs coercion; === checks type and value strictly."],
    ["What is event bubbling?", "Events propagate from the target element up through ancestor elements in the DOM."],
    ["Explain async/await.", "Syntactic sugar over Promises that makes asynchronous code read sequentially."],
    ["What is the event loop?", "Mechanism that processes the call stack and task queue for non-blocking I/O in JS."],
    ["Explain OOP pillars.", "Encapsulation, abstraction, inheritance, and polymorphism."],
    ["What is polymorphism?", "Same interface, different implementations; enables flexible and extensible design."],
    ["Explain inheritance vs composition.", "Inheritance is an is-a relationship; composition is has-a and is often more flexible."],
    ["What is a binary search tree?", "Ordered tree where left < node < right; supports efficient search when balanced."],
    ["Time complexity of binary search?", "O(log n) on sorted data by halving the search space each step."],
    ["Explain Big-O notation.", "Upper bound on growth rate of runtime or space as input size increases."],
    ["What is a hash table?", "Key-value structure with average O(1) lookup using a hash function and buckets."],
    ["Explain CAP theorem.", "In distributed systems you can strongly guarantee only two of Consistency, Availability, Partition tolerance."],
    ["What is load balancing?", "Distributing traffic across servers for availability, scalability, and fault tolerance."],
    ["Explain caching strategies.", "Use TTL, cache-aside, write-through, and invalidation to reduce latency and load."],
    ["What is Docker?", "Platform to package apps with dependencies into portable containers."],
    ["Explain CI/CD.", "Automate build, test, and deployment pipelines for faster, reliable delivery."],
    ["What is Git rebase vs merge?", "Rebase replays commits on a new base for linear history; merge preserves branch topology."],
    ["Explain SQL JOIN types.", "INNER, LEFT, RIGHT, FULL return different combinations of matching rows."],
    ["What is authentication vs authorization?", "Authentication verifies identity; authorization determines permitted actions."],
  ];

  const questions = [];
  let n = 0;
  while (questions.length < 100) {
    const [q, a] = topics[n % topics.length];
    const level = Math.floor(n / topics.length);
    questions.push({
      question: level === 0 ? q : `[Level ${level + 1}] ${q}`,
      answer: a,
      category: "Technical",
      company: pick(companies, n + 1),
      difficulty: pick(difficulties, n + 2),
    });
    n += 1;
  }
  return questions;
}

function buildBehavioralQuestions() {
  const scenarios = [
    ["Tell me about a time you handled conflict in a team.", "Use STAR; emphasize listening, facts, and a constructive outcome."],
    ["Describe a situation where you had to persuade others.", "Show data, empathy, and alignment around a shared goal."],
    ["Give an example of taking initiative.", "Explain the problem you saw, action you took without being asked, and result."],
    ["Tell me about a time you missed a deadline.", "Own it, explain mitigation, communication, and process improvements."],
    ["Describe your most challenging project.", "Cover scope, constraints, your role, trade-offs, and measurable results."],
    ["Tell me about a time you received harsh feedback.", "Stay calm, show reflection, and concrete behavior change."],
    ["Describe a time you helped a struggling teammate.", "Show empathy, mentoring, and team-first mindset."],
    ["Tell me about a time you had competing priorities.", "Explain how you assessed impact, negotiated scope, and delivered."],
    ["Describe a mistake you made and how you fixed it.", "Accountability, quick correction, and prevention steps."],
    ["Tell me about a time you adapted to change.", "Show flexibility, learning speed, and positive attitude."],
    ["Describe a time you disagreed with your manager.", "Be respectful, focus on data, and show alignment after decision."],
    ["Tell me about delivering under ambiguity.", "Explain how you clarified goals, made assumptions explicit, and iterated."],
    ["Describe a time you improved a process.", "Baseline pain, your proposal, implementation, and measurable improvement."],
    ["Tell me about working with a difficult stakeholder.", "Set expectations, communicate often, and find win-win outcomes."],
    ["Describe a time you went above and beyond.", "Show ownership and impact beyond your formal responsibilities."],
    ["Tell me about a time you learned a new skill quickly.", "Learning plan, resources used, and application to real work."],
    ["Describe a time you had to say no.", "Explain trade-offs, alternatives offered, and stakeholder management."],
    ["Tell me about a successful presentation you gave.", "Audience, structure, visuals, and outcome."],
    ["Describe a time you recovered from a production issue.", "Detection, triage, communication, root cause, and prevention."],
    ["Tell me about mentoring or teaching others.", "How you assessed level, guided learning, and measured growth."],
    ["Describe a time you demonstrated attention to detail.", "Show how detail prevented bugs, errors, or customer issues."],
    ["Tell me about balancing quality and speed.", "Explain pragmatic decisions and how you avoided long-term debt."],
    ["Describe a cross-functional project you led.", "Stakeholders, alignment, execution, and results."],
    ["Tell me about a time you handled an unhappy customer.", "Listen, empathize, solve, and follow up."],
    ["Describe a time you championed diversity or inclusion.", "Specific actions and positive team impact."],
  ];

  const questions = [];
  let n = 0;
  while (questions.length < 100) {
    const [q, a] = scenarios[n % scenarios.length];
    const idx = Math.floor(n / scenarios.length);
    questions.push({
      question: idx === 0 ? q : `${q.replace(".", "")} — variant ${idx + 1}.`,
      answer: a,
      category: "Behavioral",
      company: pick(companies, n + 3),
      difficulty: pick(difficulties, n),
    });
    n += 1;
  }
  return questions;
}

function buildAptitudeQuestions() {
  const items = [];
  for (let i = 1; i <= 100; i += 1) {
    const a = 5 + (i % 20);
    const b = 3 + (i % 15);
    const op = i % 4;
    let question;
    let answer;
    if (op === 0) {
      question = `What is ${a} + ${b}?`;
      answer = String(a + b);
    } else if (op === 1) {
      question = `What is ${a * 2} - ${b}?`;
      answer = String(a * 2 - b);
    } else if (op === 2) {
      question = `If ${a} items cost ₹${b} each, what is the total cost?`;
      answer = String(a * b);
    } else {
      const speed = 10 + (i % 30);
      const time = 2 + (i % 5);
      question = `A train travels at ${speed} km/h for ${time} hours. How far does it go?`;
      answer = String(speed * time);
    }
    items.push({
      question,
      answer: `Answer: ${answer}. Show working clearly and verify units.`,
      category: "Aptitude",
      company: "General",
      difficulty: i % 3 === 0 ? "Hard" : i % 2 === 0 ? "Medium" : "Easy",
    });
  }
  return items;
}

function buildCodingQuestions() {
  const problems = [
    ["Reverse a string.", "Use two pointers or built-in reverse; watch immutability in your language."],
    ["Check if a string is a palindrome.", "Compare characters from both ends or reverse and compare."],
    ["Find the maximum element in an array.", "Single pass O(n); initialize max with first element."],
    ["Two sum problem.", "Use a hash map to store complements for O(n) time."],
    ["Merge two sorted arrays.", "Two-pointer merge in O(n + m) time."],
    ["Valid parentheses.", "Use a stack; push opens, pop and match closes."],
    ["Find duplicate in array.", "Floyd's cycle detection or set-based approach."],
    ["Binary search implementation.", "Maintain low/high pointers; compare mid and narrow range."],
    ["Reverse a linked list.", "Iterative three-pointer or recursive approach."],
    ["Detect cycle in linked list.", "Floyd's tortoise and hare algorithm."],
    ["Find middle of linked list.", "Slow and fast pointer technique."],
    ["Level order traversal of binary tree.", "Use BFS with a queue."],
    ["Maximum depth of binary tree.", "Recursive DFS: 1 + max(left, right)."],
    ["Invert a binary tree.", "Swap left/right recursively at each node."],
    ["Implement queue using stacks.", "Use two stacks for amortized O(1) enqueue/dequeue."],
    ["Implement stack using queues.", "Use two queues or one queue with rotation."],
    ["Find first non-repeating character.", "Count frequencies with hash map, then second pass."],
    ["Anagram check.", "Sort both strings or compare character counts."],
    ["Fibonacci with dynamic programming.", "Bottom-up DP to avoid exponential recursion."],
    ["Climbing stairs (1 or 2 steps).", "DP relation dp[i] = dp[i-1] + dp[i-2]."],
    ["Best time to buy and sell stock.", "Track min price so far and max profit."],
    ["Longest substring without repeating chars.", "Sliding window with last-seen index map."],
    ["Product of array except self.", "Prefix and suffix products without division."],
    ["Rotate array by k steps.", "Reverse whole array, then reverse segments."],
    ["Find missing number in 1..n.", "Sum formula or XOR all indices and values."],
  ];

  const questions = [];
  let n = 0;
  while (questions.length < 100) {
    const [q, a] = problems[n % problems.length];
    const pass = Math.floor(n / problems.length);
    questions.push({
      question: pass === 0 ? q : `${q} (Constraint set ${pass + 1})`,
      answer: a,
      category: "Coding",
      company: pick(companies, n),
      difficulty: pick(difficulties, n + 1),
    });
    n += 1;
  }
  return questions;
}

const allQuestions = [
  ...buildHrQuestions(),
  ...buildTechnicalQuestions(),
  ...buildBehavioralQuestions(),
  ...buildAptitudeQuestions(),
  ...buildCodingQuestions(),
];

const outputPath = path.join(__dirname, "..", "..", "frontend", "data", "interview-questions.js");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  `/* Auto-generated interview question bank — ${allQuestions.length} total */\nwindow.INTERVIEW_QUESTIONS = ${JSON.stringify(allQuestions, null, 2)};\n`,
  "utf8"
);

const counts = allQuestions.reduce((acc, q) => {
  acc[q.category] = (acc[q.category] || 0) + 1;
  return acc;
}, {});

console.log("Generated", outputPath);
console.log("Counts:", counts);
