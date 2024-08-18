import React, { useState, useEffect } from "react";
import "./Resume.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Resume({ resume, index, jobDescription }) {
  const [interviewExists, setInterviewExists] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkInterviewStatus();
  }, []);

  const checkInterviewStatus = async () => {
    setIsLoading(true);
    try {
      const resumePath = resume.metadata.source.split("/data")[1];
      const response = await axios.get(
        `http://localhost:3002/check-interview?resumePath=${encodeURIComponent(
          resumePath
        )}`
      );
      setInterviewExists(response.data.interviewConducted);
    } catch (error) {
      console.error("Error checking interview status:", error);
    } finally {
      console.log("Status Checked");
      setIsLoading(false);
    }
  };

  const generateInterviewUrl = (source) => {
    const filename = source.split("/data")[1];
    const urlFriendlyName = encodeURIComponent(filename);
    return "/interview/" + urlFriendlyName;
  };

  const handleButtonClick = () => {
    const interviewUrl = generateInterviewUrl(resume.metadata.source);
    console.log("Interview URL", interviewUrl);
    if (interviewExists) {
      // Navigate to view interview summary
      navigate(`/interview-summary/${interviewUrl.split("interview/")[1]}`, {
        state: { resumePath: resume.metadata.source },
      });
    } else {
      // Start new interview
      navigate(interviewUrl, { state: { jobDescription: jobDescription } });
    }
  };

  return (
    <div className="resume-card">
      <div className="resume-left">
        <a
          href={
            "http://localhost:3002/pdfs/" +
            resume.metadata.source.split("/data")[1]
          }
          target="_blank"
          rel="noopener noreferrer"
        >
          Resume: {index + 1}
        </a>
        <p>Resume Score: {resume.score.score}</p>
        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <button onClick={handleButtonClick}>
            {interviewExists ? "View Interview Summary" : "Start Interview"}
          </button>
        )}
      </div>
      <div className="resume-right">
        {Object.entries(resume.score.match).map(([key, value]) => (
          <div key={key}>
            <p>{key}</p>
            <p>{JSON.stringify(value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Resume;
