import "./JobInformation.css";
import { useEffect, useState } from "react";
import URLBox from "./URLBox";
import JobDetails from "./JobDetails";
import axios from "axios";

function JobInformation() {
  const [jobUrl, setJobUrl] = useState("");
  const [gptResponse, setgptResponse] = useState("");

  const callGPT = async () => {
    try {
      console.log("Sending Request", jobUrl);
      if (jobUrl != "") {
        const result = await axios.post(
          "http://localhost:3002/jobdescription",
          { jobUrl },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        //   setResponse(result.data.response);
        setgptResponse(result.data.response);
      }
    } catch (error) {
      console.error("Error:", error);
      // setJobUrl("An error occurred while processing your request.");
    }
  };

  // function receiveResponse() {
  //   // const tags = gptResponse.split("</p>");

  // }

  // useEffect(receiveResponse, [gptResponse]);

  useEffect(() => {
    console.log("Job URL: ", jobUrl);
    callGPT();
  }, [jobUrl]);

  function handleFormData(data) {
    setJobUrl(data);
  }

  return (
    <div className="job-information">
      <URLBox getUrl={handleFormData} />
      <p>{jobUrl}</p>
      <JobDetails response={gptResponse} />
    </div>
  );
}

export default JobInformation;
