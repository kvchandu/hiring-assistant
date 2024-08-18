// interviewController.js
const createInterviewController = (interviewService) => ({
  initiateInterview: async (req, res) => {
    const { jobDescription, resumePath } = req.body;
    try {
      const reply = await interviewService.initiateInterview(
        jobDescription,
        resumePath
      );
      res.json({ reply });
    } catch (error) {
      console.error("Error initiating interview:", error);
      res
        .status(500)
        .json({ error: "An error occurred while initiating the interview" });
    }
  },

  continueInterview: async (req, res) => {
    const { message } = req.body;
    try {
      const reply = await interviewService.continueInterview(message);
      res.json({ reply });
    } catch (error) {
      console.error("Error in chat:", error);
      res
        .status(500)
        .json({ error: "An error occurred during the conversation" });
    }
  },

  endInterview: async (req, res) => {
    try {
      const message = await interviewService.endInterview();
      res.json({ message });
    } catch (error) {
      console.error("Error ending interview:", error);
      res
        .status(500)
        .json({ error: "An error occurred while ending the interview" });
    }
  },

  checkInterview: async (req, res) => {
    const { resumePath } = req.query;
    if (!resumePath) {
      return res.status(400).json({ error: "Resume path is required" });
    }
    try {
      const interviewConducted = await interviewService.checkInterview(
        resumePath
      );
      res.json({ interviewConducted });
    } catch (error) {
      console.error("Error checking interview:", error);
      res
        .status(500)
        .json({ error: "An error occurred while checking the interview" });
    }
  },

  getInterviewSummary: async (req, res) => {
    const { resumePath } = req.query;
    if (!resumePath) {
      return res.status(400).json({ error: "Resume path is required" });
    }
    try {
      const summary = await interviewService.getInterviewSummary(resumePath);
      res.json({ summary });
    } catch (error) {
      console.error("Error reading interview summary:", error);
      if (error.code === "ENOENT") {
        res.status(404).json({ error: "Interview summary not found" });
      } else {
        res.status(500).json({
          error: "An error occurred while fetching the interview summary",
        });
      }
    }
  },
});

module.exports = createInterviewController;
