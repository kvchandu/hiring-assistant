const {
  HtmlToTextTransformer,
} = require("@langchain/community/document_transformers/html_to_text");
require("dotenv").config();
const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const express = require("express");
const cors = require("cors");
const { ChatOpenAI } = require("@langchain/openai");
const {
  PromptTemplate,
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  MessagesPlaceholder,
  HumanMessagePromptTemplate,
} = require("@langchain/core/prompts");
const { LLMChain } = require("langchain/chains");
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
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// console.log(path.join(__dirname, "..", "data"));
app.use("/pdfs", express.static(path.join(__dirname, "..", "data")));

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

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0.9,
});

app.post("/getrelevantresumes", async (req, res) => {
  try {
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
});

app.post("/jobdescription", async (req, res) => {
  try {
    const url = req.body.jobUrl;

    const loader = new CheerioWebBaseLoader(url);
    const docs = await loader.load();
    // console.log(docs[0].pageContent);
    const transformer = new HtmlToTextTransformer();
    const webContent = await transformer.invoke(docs);

    const system_prompt = await loadPromptFromFile("job_prompt.txt");

    // console.log(system_prompt);

    const prompt = ChatPromptTemplate.fromTemplate(system_prompt);
    const messages = await prompt.formatMessages({
      web_page: webContent[0].pageContent,
    });

    const result = await model.invoke(messages);
    // console.log(result.content);

    res.json({ response: result.content });
  } catch (error) {
    // console.error("Error:", error);
    res.status(500).json({ error: "An error occurred" });
  }
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

const matching_skills_prompt = `
Given the following job description and resume, please analyze and provide the following information in JSON format:
1. A list of skills that match between the job description and the resume.
2. A list of skills mentioned in the job description but missing from the resume.
3. A dictionary of job titles from the resume with their corresponding months of experience (only number).
4. A list of educational qualifications mentioned in the resume.

Job Description:
{job_description}

Resume:
{resume}

Please format your response as a JSON object with the following keys:
{{
  "matching skills": [],
  "missing skills": [],
  "job titles with months of experience": {{}},
  "educational experience": []
}}
`;

app.post("/calculate-resume-score", async (req, res) => {
  try {
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

    const fullResumePath = path.join(__dirname, "..", "data", resumePath);
    // console.log("Full Resume Path", fullResumePath);
    const loader = new PDFLoader(fullResumePath);
    const document = await loader.load();
    const loadedResume = document.map((doc) => doc.pageContent).join(" ");

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
    // console.error("Error calculating resume score:", error);
    res.status(500).json({ error: "Failed to calculate resume score" });
  }
});

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

// System template for the interview process
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

const memory = new BufferMemory({ returnMessages: true, memoryKey: "history" });

let conversationChain;

app.post("/initiate-interview", async (req, res) => {
  const { jobDescription, resumePath } = req.body;
  console.log(resumePath);
  try {
    // Load the resume content
    const fullResumePath = path.join(__dirname, "..", "data", resumePath);

    const loader = new PDFLoader(fullResumePath);
    const docs = await loader.load();
    const resumeContent = docs.map((doc) => doc.pageContent).join("\n");

    conversationChain = new ConversationChain({
      memory: memory,
      prompt: chatPrompt,
      llm: model,
    });

    const response = await conversationChain.call({
      input: "Let's start the interview.",
      job_description: jobDescription,
      resume: resumeContent,
    });

    res.json({ reply: response.response });
  } catch (error) {
    // console.error("Error initiating interview:", error);
    res.status(500);
    // .json({ error: "An error occurred while initiating the interview" });
  }
});

app.post("/interview", async (req, res) => {
  const { message } = req.body;

  if (!conversationChain) {
    return res.status(400).json({
      // error: "Interview not initiated. Please call /initiate-interview first.",
    });
  }

  try {
    const response = await conversationChain.call({ input: message });
    res.json({ reply: response.response });
  } catch (error) {
    // console.error("Error in chat:", error);
    res.status(500);
    // .json({ error: "An error occurred during the conversation" });
  }
});

processDocuments()
  .then((vectorstore) => {
    global.vectorstore = vectorstore;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((error) => {
    // console.error("Failed to process documents:", error);
  });
