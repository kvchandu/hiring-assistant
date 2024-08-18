// interviewService.js
const {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
  MessagesPlaceholder,
} = require("@langchain/core/prompts");
const { ConversationChain } = require("langchain/chains");
const { BufferMemory } = require("langchain/memory");
const { ChatMessageHistory } = require("langchain/memory");
const { PDFLoader } = require("langchain/document_loaders/fs/pdf");
const path = require("path");
const fs = require("fs").promises;

class InterviewService {
  constructor(model, systemTemplate) {
    this.model = model;
    this.chatPrompt = ChatPromptTemplate.fromPromptMessages([
      SystemMessagePromptTemplate.fromTemplate(systemTemplate),
      new MessagesPlaceholder("history"),
      HumanMessagePromptTemplate.fromTemplate("{input}"),
    ]);
    this.conversationChain = null;
    this.chatHistory = null;
    this.jobDescriptionGlobal = "";
    this.resumeContentGlobal = "";
    this.currentResumePath = "";
  }

  async initiateInterview(jobDescription, resumePath) {
    const fullResumePath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "data",
      resumePath
    );
    const loader = new PDFLoader(fullResumePath);
    const docs = await loader.load();
    const resumeContent = docs.map((doc) => doc.pageContent).join("\n");

    this.currentResumePath = resumePath;
    this.jobDescriptionGlobal = jobDescription;
    this.resumeContentGlobal = resumeContent;
    this.chatHistory = new ChatMessageHistory();

    this.conversationChain = new ConversationChain({
      memory: new BufferMemory({
        chatHistory: this.chatHistory,
        returnMessages: true,
        memoryKey: "history",
        inputKey: "input",
      }),
      prompt: this.chatPrompt,
      llm: this.model,
    });

    const formattedPrompt = await this.chatPrompt.formatMessages({
      job_description: jobDescription,
      resume: resumeContent,
      input: "Let's start the interview.",
      history: [],
    });

    const response = await this.model.invoke(formattedPrompt);
    return response.content;
  }

  async continueInterview(message) {
    if (!this.conversationChain) {
      throw new Error("Interview not initiated.");
    }

    const formattedPrompt = await this.chatPrompt.formatMessages({
      job_description: this.jobDescriptionGlobal,
      resume: this.resumeContentGlobal,
      input: message,
      history: await this.chatHistory.getMessages(),
    });

    const response = await this.model.invoke(formattedPrompt);
    await this.chatHistory.addUserMessage(message);
    await this.chatHistory.addAIMessage(response.content);

    return response.content;
  }

  async endInterview() {
    if (
      !this.conversationChain ||
      !this.chatHistory ||
      !this.currentResumePath
    ) {
      throw new Error("No active interview found or resume path not set.");
    }

    const messages = await this.chatHistory.getMessages();
    const summary = messages.map((msg) => ({
      role: msg._getType() === "human" ? "User" : "AI",
      content: msg.content,
    }));

    const filename = `interview_summary_${path.basename(
      this.currentResumePath
    )}.json`;
    const filePath = path.join(__dirname, "interview_summaries", filename);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(summary, null, 2));

    this.reset();

    return "Interview ended and summary saved successfully.";
  }

  reset() {
    this.conversationChain = null;
    this.chatHistory = null;
    this.currentResumePath = "";
    this.jobDescriptionGlobal = "";
    this.resumeContentGlobal = "";
  }

  async checkInterview(resumePath) {
    const filename = `interview_summary_${path.basename(resumePath)}.json`;
    const filePath = path.join(__dirname, "interview_summaries", filename);

    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getInterviewSummary(resumePath) {
    const filename = `interview_summary_${path.basename(resumePath)}.json`;
    const filePath = path.join(__dirname, "interview_summaries", filename);

    const fileContent = await fs.readFile(filePath, "utf8");
    return JSON.parse(fileContent);
  }
}

module.exports = InterviewService;
