import "./Candidates.css";
import { useEffect, useState } from "react";
import axios from "axios";
import Resume from "./Resume";

function Candidates({ gptResponse }) {
  const [responseObject, setResponseObject] = useState({});
  const [relevantResumes, setRelevantResumes] = useState({});

  function compareResumes(a, b) {
    return b.score.score - a.score.score;
  }

  function sortResumes() {
    console.log("relevant Resumes: ", relevantResumes);
    if (Array.isArray(relevantResumes)) {
      setRelevantResumes(relevantResumes.toSorted(compareResumes));
    }
    console.log("Sorted Relevant Resumes: ", relevantResumes);
  }

  useEffect(() => {
    try {
      if (gptResponse) {
        const parsedResponse = JSON.parse(gptResponse);
        setResponseObject(parsedResponse);
      }
    } catch (e) {
      console.error("Error parsing JSON:", e);
    }
  }, [gptResponse]);

  useEffect(() => {
    if (Object.keys(responseObject).length !== 0) {
      console.log("response object in Candidates", responseObject);
      getRelevantResumes();
    }
  }, [responseObject]);

  async function getRelevantResumes() {
    try {
      // console.log("HERE");
      const result = await axios.post(
        "http://localhost:3002/getrelevantresumes",
        { jobDescription: responseObject },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // console.log(result.data.relevantResumes);
      const final_set = {};

      const relevantResumesWithScores = await Promise.all(
        result.data.relevantResumes.map(async (element) => {
          try {
            const resumeScore = await axios.post(
              "http://localhost:3002/calculate-resume-score",
              {
                jobDescription: responseObject,
                resumePath: element.metadata.source.split("/data")[1],
              },
              {
                headers: {
                  "Content-Type": "application/json",
                },
              }
            );
            return { ...element, score: resumeScore.data };
          } catch (error) {
            console.error("Error calculating resume score:", error);
            return { ...element, score: 0 }; // Assign a default score if calculation fails
          }
        })
      );

      const sortedResumes = relevantResumesWithScores.sort(compareResumes);
      setRelevantResumes(sortedResumes);
    } catch {}
  }

  return (
    <div className="candidate-section">
      <p>
        {" "}
        https://careers.staples.com/en/job/framingham/software-engineer-iii-front-end-developer/44412/68181313840?utm_campaign=google_jobs_apply&utm_source=google_jobs_apply&utm_medium=organic{" "}
      </p>

      {relevantResumes && relevantResumes.length > 0 ? (
        relevantResumes.map((resume, index) => (
          <Resume
            resume={resume}
            index={index}
            jobDescription={responseObject}
          />
        ))
      ) : (
        <p>Please Enter A Job URL to filter Resumes</p>
      )}
    </div>
  );
}

export default Candidates;
