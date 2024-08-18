const express = require("express");

const router = express.Router();
const resumeController = require("../controllers/resumeController");

router.post("/initiate-interview", resumeController.initiateInterview);
router.post("/jobdescription", resumeController.getJobDescription);
router.post("/getrelevantresumes", resumeController.getRelevantResumes);
router.post("/calculate-resume-score", resumeController.getResumeScore);

module.exports = router;
