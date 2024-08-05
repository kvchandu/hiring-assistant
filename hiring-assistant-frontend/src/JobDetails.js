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

  return (
    <div className="job-details">
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
