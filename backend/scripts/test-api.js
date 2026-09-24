const fs = require("fs");
const path = require("path");
const { PDFParse } = require("pdf-parse");

const samplePdf = `%PDF-1.4
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj
4 0 obj<< /Length 68 >>stream
BT /F1 12 Tf 72 720 Td (John Doe Software Engineer JavaScript React Node.js Python SQL Git) Tj ET
endstream
endobj
5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000267 00000 n 
0000000384 00000 n 
trailer<< /Size 6 /Root 1 0 R >>
startxref
462
%%EOF`;

async function run() {
  const pdfPath = path.join(__dirname, "sample-resume.pdf");
  fs.writeFileSync(pdfPath, samplePdf);

  const parser = new PDFParse({ data: Buffer.from(samplePdf) });
  const parsed = await parser.getText();
  await parser.destroy();
  console.log("PDF text extracted:", parsed.text.trim());

  const form = new FormData();
  form.append("resume", new Blob([samplePdf], { type: "application/pdf" }), "sample-resume.pdf");

  const resumeRes = await fetch("http://localhost:5000/api/resume/analyze", {
    method: "POST",
    body: form,
  });
  const resumeJson = await resumeRes.json();
  console.log("Resume analyze status:", resumeRes.status);
  console.log("Resume score:", resumeJson.data?.score);
  console.log("Resume source:", resumeJson.source);

  const gapForm = new FormData();
  gapForm.append("resume", new Blob([samplePdf], { type: "application/pdf" }), "sample-resume.pdf");
  gapForm.append(
    "jobDescription",
    "Software Engineer with JavaScript, React, Node.js, Python, Docker, Kubernetes, AWS"
  );

  const gapRes = await fetch("http://localhost:5000/api/skill-gap/analyze", {
    method: "POST",
    body: gapForm,
  });
  const gapJson = await gapRes.json();
  console.log("Skill gap status:", gapRes.status);
  console.log("Match %:", gapJson.data?.matchPercentage);
  console.log("Missing skills:", gapJson.data?.missingSkills?.slice(0, 5));

  const codeRes = await fetch("http://localhost:5000/api/code-review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "function add(a,b){return a+b}", language: "javascript" }),
  });
  const codeJson = await codeRes.json();
  console.log("Code review status:", codeRes.status);
  console.log("Feedback preview:", String(codeJson.feedback).slice(0, 120));

  const chatRes = await fetch("http://localhost:5000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Hello", mode: "chat" }),
  });
  const chatJson = await chatRes.json();
  console.log("Chat status:", chatRes.status);
  console.log("Chat reply preview:", String(chatJson.reply).slice(0, 80));
}

run().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
