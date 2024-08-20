const {
  HtmlToTextTransformer,
} = require("@langchain/community/document_transformers/html_to_text");
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
const { load } = require("cheerio");

const initiateInterview = async (req, res) => {
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
};

async function loadPromptFromFile(filename) {
  try {
    const filePath = path.join(__dirname, filename);
    const data = await fs.readFile(filePath, "utf8");
    return data;
  } catch (error) {
    // console.error("Error reading prompt file:", error);
    throw error;
  }
}

const getJobDescription = async (req, res) => {
  try {
    const model = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      temperature: 0.9,
    });

    const url = req.body.jobUrl;
    const loader = new CheerioWebBaseLoader(url);
    const docs = await loader.load();
    const transformer = new HtmlToTextTransformer();
    const webContent = await transformer.invoke(docs);

    const system_prompt = await loadPromptFromFile("../prompts/job_prompt.txt");

    // console.log("System Prompt in Controller: ", system_prompt);

    const prompt = ChatPromptTemplate.fromTemplate(system_prompt);
    const messages = await prompt.formatMessages({
      web_page: webContent[0].pageContent,
    });

    const result = await model.invoke(messages);
    res.json({ response: result.content });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "An error occurred" });
  }
};

const getRelevantResumes = async (req, res) => {
  try {
    const model = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      temperature: 0.9,
    });
    // console.log("REQ: ", req);
    const jobDescription = req.body.jobDescription;

    if (!jobDescription) {
      return res.status(400).json({ error: "Job description is required" });
    }

    if (!global.vectorstore) {
      return res.status(500).json({ error: "Vector store is not initialized" });
    }
    // console.log("JOB DESCRIPTION: ", JSON.stringify(jobDescription));
    const keys = Object.entries(jobDescription);
    var descriptionString = "";
    for (const [key, value] of keys) {
      var temp = "";
      if (Array.isArray(value)) {
        temp = value.join(",");
      } else {
        temp = value;
      }

      descriptionString = descriptionString + key + ":  " + temp + "\n";
    }

    // console.log("DESCRIPTION STRING: ", descriptionString);
    // Perform similarity search for top 20 results
    const searchResults = await global.vectorstore.similaritySearch(
      descriptionString,
      20
    );

    // Count occurrences of each source
    const sourceCounts = {};
    const matches = {};
    searchResults.forEach((result) => {
      const source = result.metadata.source;
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      if (!matches[source]) {
        matches[source] = [];
      }

      // console.log("Result: ", result);
      matches[source].push(result.pageContent);
    });

    // Sort results by source frequency, then by similarity score
    const sortedResults = searchResults.sort((a, b) => {
      const countDiff =
        sourceCounts[b.metadata.source] - sourceCounts[a.metadata.source];
      if (countDiff !== 0) return countDiff;
      // If counts are equal, sort by similarity score (assuming lower index means higher similarity)
      return searchResults.indexOf(a) - searchResults.indexOf(b);
    });

    // Take top 5 unique sources
    const uniqueSources = new Set();
    const relevantResumes = [];
    for (const result of sortedResults) {
      if (uniqueSources.size >= 3) break;
      if (!uniqueSources.has(result.metadata.source)) {
        uniqueSources.add(result.metadata.source);
        relevantResumes.push({
          content: result.pageContent,
          matches: matches[result.metadata.source],
          metadata: result.metadata,
        });
      }
    }
    res.json({ relevantResumes });
  } catch (error) {
    // console.error("Error in getrelevantresumes:", error);
    res
      .status(500)
      .json({ error: "An error occurred while processing the request" });
  }
};

const getResumeScore = async (req, res) => {
  try {
    const model = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      temperature: 0.9,
    });

    const { jobDescription, resumePath } = req.body;

    const keys = Object.entries(jobDescription);
    var descriptionString = "";
    for (const [key, value] of keys) {
      var temp = "";
      if (Array.isArray(value)) {
        temp = value.join(",");
      } else {
        temp = value;
      }

      descriptionString = descriptionString + key + ":  " + temp + "\n";
    }

    const fullResumePath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "data",
      resumePath
    );
    // console.log("Full Resume Path", fullResumePath);
    const loader = new PDFLoader(fullResumePath);
    const document = await loader.load();
    const loadedResume = document.map((doc) => doc.pageContent).join(" ");

    const matching_skills_prompt = await loadPromptFromFile(
      "../prompts/match_skills.txt"
    );

    // console.log("***", matching_skills_prompt, "***");
    const prompt = PromptTemplate.fromTemplate(matching_skills_prompt);
    const formattedPrompt = await prompt.format({
      job_description: descriptionString,
      resume: loadedResume,
    });

    const response = await model.invoke(formattedPrompt);
    // console.log(response.content);
    let match;
    try {
      match = JSON.parse(response.content);
      // console.log(match);
    } catch (error) {
      // console.error("Error parsing LLM response:", error);
      return res.status(500).json({ error: "Failed to parse LLM response" });
    }

    const numMatches = match["matching skills"].length;
    const numMisses = match["missing skills"].length;
    const numMonths = Object.values(
      match["job titles with months of experience"]
    ).reduce((a, b) => a + b, 0);
    const numDegrees = match["educational experience"].length;

    const score =
      numMatches * 2 - numMisses * 2 + numMonths * 0.5 + numDegrees * 1;

    res.json({ score, match });
  } catch (error) {
    console.error("Error calculating resume score:", error);
    res.status(500).json({ error: "Failed to calculate resume score" });
  }
};

module.exports = {
  initiateInterview,
  getJobDescription,
  getRelevantResumes,
  getResumeScore,
};
