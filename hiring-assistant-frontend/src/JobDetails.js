import { useState, useEffect } from "react";
import "./JobDetails.css";

function JobDetails({ response }) {
  const [responseObject, setResponseObject] = useState({});

  useEffect(() => {
    try {
      const parsedResponse = JSON.parse(response);
      setResponseObject(parsedResponse);
      console.log(parsedResponse);
    } catch (e) {
      console.error("Error parsing JSON:", e);
    }
  }, [response]);
  const hasDetails = Object.keys(responseObject).length !== 0;
  return (
    <div className="job-details">
      {hasDetails && (
        <h2> Below are the job details in the URL you pasted. </h2>
      )}
      {Object.entries(responseObject).map(([key, value]) => (
        <p className={"subsection"}>
          {" "}
          <strong>{key}: </strong>
          {value}
        </p>
      ))}
    </div>
  );
}

export default JobDetails;
