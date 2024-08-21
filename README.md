AI Hiring Assistant:

This project aims to be a phone screen interview simulator for a HR department at a company. The hiring pipeline progresses in the following stages. 

i) Job Description Summarization: Given a link to a job posting online, LLM prompts are used to gather required information from the job posting. 
ii) Relevant Resume Screener: A dataset of resumes are chunked and stored in a vector database. Upon receiving a job description, vector similarity search is performed to gather the most relevant resumes to the job posting. 
iii) Resume Scoring: After a set of relevant resumes have been screened, each resume is then filtered to find relevant keywords, and the total relevant experience the candidate has. Based on all the matching and missing skills on top of the amount of experience, a score is calculated to help the HR choose the best resume. 
iv) Interview: After a candidate has been selected to interview, an interview screen is shown, and carefully crafted prompts help an LLM conduct a pseudo phone screen interview with the candidate asking for imissing information from the resume and technical questions based on the job description. 
v) Interview Transcript: The whole interview is transcribed into readable structurized format, and another LLM agent is used to read the transcript and give a final verdict on whether the candidate is eligible for further rounds of interview. 

