import "./Candidates.css";
import { useEffect, useState } from "react";
import axios from "axios";

function Candidates({ gptResponse }) {
  const [responseObject, setResponseObject] = useState({});

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

      console.log(result);
    } catch {}
  }

  return (
    <div className="candidate-section">
      <p>
        {" "}
        https://careers.staples.com/en/job/framingham/software-engineer-iii-front-end-developer/44412/68181313840?utm_campaign=google_jobs_apply&utm_source=google_jobs_apply&utm_medium=organic{" "}
      </p>
      <p>{gptResponse}</p>
    </div>
  );
}

export default Candidates;
