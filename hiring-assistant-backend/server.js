require("dotenv").config();
const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { ChatMessageHistory } = require("langchain/stores/message/in_memory");
const express = require("express");
const cors = require("cors");
const { ChatOpenAI } = require("@langchain/openai");
const {
  PromptTemplate,
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  MessagesPlaceholder,
  HumanMessagePromptTemplate,
  PipelinePrompt,
} = require("@langchain/core/prompts");
const { LLMChain, ConversationChain } = require("langchain/chains");
const {
  CheerioWebBaseLoader,
} = require("@langchain/community/document_loaders/web/cheerio");
const app = express();
const fs = require("fs").promises; // Using promises version for async/await
const path = require("path");
const { FaissStore } = require("@langchain/community/vectorstores/faiss");
const { OpenAIEmbeddings } = require("@langchain/openai");
const { BufferMemory } = require("langchain/memory");

app.use(cors());

const bodyParser = require("body-parser");
const { match } = require("assert");
const { SystemMessage, HumanMessage } = require("@langchain/core/messages");

const router = require("./src/routes/router");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/", router);
app.use("/pdfs", express.static(path.join(__dirname, "..", "data")));

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0.9,
});

const PORT = 3002;

async function loadDocuments(directory, maxDocsPerCategory = 5) {
  const documents = [];
  const dirs = await fs.readdir(directory);

  for (const dir of dirs) {
    const categoryPath = path.join(directory, dir);
    const stats = await fs.stat(categoryPath);

    if (stats.isDirectory()) {
      let count = 0;
      const files = await fs.readdir(categoryPath);

      for (const file of files) {
        if (path.extname(file).toLowerCase() === ".pdf") {
          const resumeFile = path.join(categoryPath, file);
          const loader = new PDFLoader(resumeFile);
          const docs = await loader.load();
          documents.push(...docs);
          count++;

          if (count >= maxDocsPerCategory) {
            break;
          }
        }
      }
    }
  }

  return documents;
}

async function processDocuments() {
  const directory = "/Users/chandu/Documents/hiring-assistant/data/";
  try {
    const documents = await loadDocuments(directory);
    // console.log(`Loaded ${documents.length} documents`);

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 200,
      chunkOverlap: 20,
    });
    const chunks = await textSplitter.splitDocuments(documents);

    const embeddings = new OpenAIEmbeddings();
    const vectorstore = await FaissStore.fromDocuments(chunks, embeddings);

    // console.log("Vector store created successfully");
    return vectorstore;
  } catch (error) {
    // console.error("Error processing documents:", error);
  }
}
const systemTemplate = `You are an expert software engineering recruiter. You are given a resume from the user. Enclosed in *** is the job description for which you will be conducting an interview. The interview questions and the responses will be used by another recruiter to evaluate the candidate's fit with the company. 
So ask questions that would cover all requirements mentioned in the job requirements. 

Below are the steps you must perform. Ask only one question at a time. 
1) Greet the candidate based on the first name found on the resume and Read out a summarized version of the job description to the candidate. 
2) Begin the interview by discussing the educational background. Read out the job's requirement for education and mention if the candidate's education meets the demand. Follow up with a question relating to the coursework or any other academic involvement that would answer any inconsistency with the job requirement. 
Ask any follow up questions if necessary. 
3) Move on to the work experience of the candidate. For each position in the candidate's work experience, determine if that experience matches the job requirement. If there is an exact match in the technologies
ask a technical question confirming the legibility of the experience. If there is a relevant technology but not an exact match (like a different programming language experience but in the same domain), ask about how the candidate
thinks his experience aligns with the requirement. 
4) Do the same with the Projects section if the candidate has any. Ask questions only if necessary if there is any inconsistencies with the job requirement. 
5) Ask 1-2 technical questions on topics that are most important to the job. 

***{job_description}***

***{resume}***`;

const chatPrompt = ChatPromptTemplate.fromPromptMessages([
  SystemMessagePromptTemplate.fromTemplate(systemTemplate),
  new MessagesPlaceholder("history"),
  HumanMessagePromptTemplate.fromTemplate("{input}"),
]);

let conversationChain;
let chatHistory;
let jobDescriptionGlobal;
let resumeContentGlobal;
let currentResumePath = "";

app.post("/initiate-interview", async (req, res) => {
  const { jobDescription, resumePath } = req.body;

  try {
    // Load the resume content
    const fullResumePath = path.join(__dirname, "..", "data", resumePath);
    const loader = new PDFLoader(fullResumePath);
    const docs = await loader.load();
    const resumeContent = docs.map((doc) => doc.pageContent).join("\n");

    currentResumePath = resumePath;

    // Store job description and resume content globally
    jobDescriptionGlobal = jobDescription;
    resumeContentGlobal = resumeContent;

    // Initialize a new chat history for this interview
    chatHistory = new ChatMessageHistory();

    // Set up the conversation chain with the new chat history
    conversationChain = new ConversationChain({
      memory: new BufferMemory({
        chatHistory: chatHistory,
        returnMessages: true,
        memoryKey: "history",
        inputKey: "input",
      }),
      prompt: chatPrompt,
      llm: model,
    });

    // Start the interview with the context
    const formattedPrompt = await chatPrompt.formatMessages({
      job_description: jobDescription,
      resume: resumeContent,
      input: "Let's start the interview.",
      history: [],
    });

    const response = await model.invoke(formattedPrompt);

    res.json({ reply: response.content });
  } catch (error) {
    console.error("Error initiating interview:", error);
    res
      .status(500)
      .json({ error: "An error occurred while initiating the interview" });
  }
});

app.post("/interview", async (req, res) => {
  const { message } = req.body;

  if (!conversationChain) {
    return res.status(400).json({
      error: "Interview not initiated. Please call /initiate-interview first.",
    });
  }

  try {
    const formattedPrompt = await chatPrompt.formatMessages({
      job_description: jobDescriptionGlobal,
      resume: resumeContentGlobal,
      input: message,
      history: await chatHistory.getMessages(),
    });

    const response = await model.invoke(formattedPrompt);
    await chatHistory.addUserMessage(message);
    await chatHistory.addAIMessage(response.content);

    res.json({ reply: response.content });
  } catch (error) {
    console.error("Error in chat:", error);
    res
      .status(500)
      .json({ error: "An error occurred during the conversation" });
  }
});

app.post("/end-interview", async (req, res) => {
  // console.log("Here");
  if (!conversationChain || !chatHistory || !currentResumePath) {
    return res.status(400).json({
      error:
        "No active interview found or resume path not set. Please initiate an interview first.",
    });
  }

  try {
    // Get all messages from the chat history
    const messages = await chatHistory.getMessages();

    // Create a summary of the conversation
    const summary = messages.map((msg) => ({
      role: msg._getType() === "human" ? "User" : "AI",
      content: msg.content,
    }));

    // Create a filename with the resume path
    const filename = `interview_summary_${path.basename(
      currentResumePath
    )}.json`;
    const filePath = path.join(__dirname, "interview_summaries", filename);

    // Ensure the directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Write the summary to a file
    await fs.writeFile(filePath, JSON.stringify(summary, null, 2));

    // Reset the conversation chain and chat history
    conversationChain = null;
    chatHistory = null;
    currentResumePath = "";

    res.json({ message: "Interview ended and summary saved successfully." });
  } catch (error) {
    console.error("Error ending interview:", error);
    res
      .status(500)
      .json({ error: "An error occurred while ending the interview" });
  }
});

app.get("/check-interview", async (req, res) => {
  const { resumePath } = req.query;

  if (!resumePath) {
    return res.status(400).json({ error: "Resume path is required" });
  }

  try {
    const filename = `interview_summary_${path.basename(resumePath)}.json`;
    const filePath = path.join(__dirname, "interview_summaries", filename);

    await fs.access(filePath);
    console.log("File found");
    // If the file exists, an interview has been conducted
    res.json({ interviewConducted: true });
  } catch (error) {
    // If the file doesn't exist, no interview has been conducted
    res.json({ interviewConducted: false });
  }
});

app.get("/get-interview-summary", async (req, res) => {
  const { resumePath } = req.query;

  if (!resumePath) {
    return res.status(400).json({ error: "Resume path is required" });
  }

  try {
    const filename = `interview_summary_${path.basename(resumePath)}.json`;
    const filePath = path.join(__dirname, "interview_summaries", filename);

    // Read the file
    const fileContent = await fs.readFile(filePath, "utf8");

    // Parse the JSON content
    const summary = JSON.parse(fileContent);

    res.json({ summary });
  } catch (error) {
    console.error("Error reading interview summary:", error);
    if (error.code === "ENOENT") {
      // File not found
      res.status(404).json({ error: "Interview summary not found" });
    } else {
      // Other errors
      res.status(500).json({
        error: "An error occurred while fetching the interview summary",
      });
    }
  }
});

processDocuments()
  .then((vectorstore) => {
    global.vectorstore = vectorstore;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((error) => {});

// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
