import "./Candidates.css";
import { useEffect, useState } from "react";
import axios from "axios";
import Resume from "./Resume";

function Candidates({ gptResponse }) {
  const [responseObject, setResponseObject] = useState({});
  const [relevantResumes, setRelevantResumes] = useState({});
  useEffect(() => {
    try {
      const parsedResponse = JSON.parse(gptResponse);
      setResponseObject(parsedResponse);
      console.log(parsedResponse);
    } catch (e) {
      console.error("Error parsing JSON:", e);
    }
  }, [gptResponse]);

  useEffect(() => {
    getRelevantResumes();
  }, [responseObject]);

  async function getRelevantResumes() {
    try {
      console.log("HERE");
      const result = await axios.post(
        "http://localhost:3002/getrelevantresumes",
        { jobDescription: responseObject },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log(result.data.relevantResumes);
      setRelevantResumes(result.data.relevantResumes);
    } catch {}
  }

  return (
    <div className="candidate-section">
      <p>
        {" "}
        https://careers.staples.com/en/job/framingham/software-engineer-iii-front-end-developer/44412/68181313840?utm_campaign=google_jobs_apply&utm_source=google_jobs_apply&utm_medium=organic{" "}
      </p>
      {/* <p>{gptResponse}</p> */}

      {relevantResumes && relevantResumes.length > 0 ? (
        relevantResumes.map((resume, index) => (
          <Resume resume={resume} index={index} />
        ))
      ) : (
        <p>No relevant resumes found.</p>
      )}
    </div>
  );
}

export default Candidates;
