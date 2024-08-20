import "./JobInformation.css";
import { useEffect, useState } from "react";
import URLBox from "./URLBox";
import JobDetails from "./JobDetails";
import axios from "axios";

function JobInformation({ passResponse }) {
  const [jobUrl, setJobUrl] = useState("");
  const [gptResponse, setgptResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const callGPT = async () => {
    try {
      setIsLoading(true);
      console.log("Sending Request", jobUrl);

      const result = await axios.post(
        "http://localhost:3002/jobdescription",
        { jobUrl },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      setgptResponse(result.data.response);
      passResponse(result.data.response);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (jobUrl) {
      console.log("Job URL: ", jobUrl);
      callGPT();
    }
  }, [jobUrl]);

  function handleFormData(data) {
    setJobUrl(data);
  }

  return (
    <div className="job-information">
      <URLBox getUrl={handleFormData} />
      {isLoading ? (
        <p>Loading job details...</p>
      ) : (
        <JobDetails response={gptResponse} />
      )}
    </div>
  );
}

export default JobInformation;
