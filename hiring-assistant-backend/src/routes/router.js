const express = require("express");

const router = express.Router();
const resumeController = require("../controllers/resumeController");
const createInterviewController = require("../controllers/interviewController");
const InterviewService = require("../services/InterviewService");
const { load } = require("cheerio");
const { ChatOpenAI } = require("@langchain/openai");
const path = require("path");
const fs = require("fs");

function loadPromptFromFile(filename) {
  try {
    const filePath = path.join(__dirname, filename);
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    console.error("Error reading prompt file:", error);
    throw error;
  }
}

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0.9,
});
const systemTemplate = loadPromptFromFile("../prompts/interview_prompt.txt");
const interviewService = new InterviewService(model, systemTemplate);

// Create InterviewController
const interviewController = createInterviewController(interviewService);

router.post("/jobdescription", resumeController.getJobDescription);
router.post("/getrelevantresumes", resumeController.getRelevantResumes);
router.post("/calculate-resume-score", resumeController.getResumeScore);

// New interview routes
router.post("/initiate-interview", interviewController.initiateInterview);
router.post("/interview", interviewController.continueInterview);
router.post("/end-interview", interviewController.endInterview);
router.get("/check-interview", interviewController.checkInterview);
router.get("/get-interview-summary", interviewController.getInterviewSummary);

module.exports = router;
