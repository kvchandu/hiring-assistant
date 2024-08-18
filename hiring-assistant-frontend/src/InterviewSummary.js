import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import axios from "axios";

function InterviewSummary() {
  const [summary, setSummary] = useState(null);
  const { resumePath } = useParams();
  const location = useLocation();
  const fullResumePath = location.state?.resumePath;

  useEffect(() => {
    fetchInterviewSummary();
  }, []);

  const fetchInterviewSummary = async () => {
    try {
      const response = await axios.get(
        `http://localhost:3002/get-interview-summary?resumePath=${encodeURIComponent(
          fullResumePath
        )}`
      );
      setSummary(response.data.summary);
    } catch (error) {
      console.error("Error fetching interview summary:", error);
    }
  };

  if (!summary) return <div>Loading...</div>;

  return (
    <div>
      <h1>Interview Summary</h1>
      {summary.map((message, index) => (
        <div key={index}>
          <p>
            <strong>{message.role}:</strong> {message.content}
          </p>
        </div>
      ))}
    </div>
  );
}

export default InterviewSummary;
