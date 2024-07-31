import "./JobInformation.css";
import { useState } from "react";
import URLBox from "./URLBox";
import JobDetails from "./JobDetails";

function JobInformation() {
  const [jobUrl, setJobUrl] = useState();

  function handleFormData(data) {
    setJobUrl(data);
  }

  return (
    <div className="job-information">
      <URLBox getUrl={handleFormData} />
      <JobDetails />
    </div>
  );
}

export default JobInformation;
