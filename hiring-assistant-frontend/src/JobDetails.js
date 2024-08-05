import { useState } from "react";

function JobDetails({ response }) {
  const [responseObject, setResponseObject] = useState({});

  try {
    const responseObject = JSON.parse(response);
  } catch (e) {}

  return <p>{response}</p>;
}

export default JobDetails;
