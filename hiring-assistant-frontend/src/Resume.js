import "./Resume.css";
import { useNavigate } from "react-router-dom";

function Resume({ resume, index, jobDescription }) {
  console.log("RESUME HERE:", resume);
  const navigate = useNavigate();

  const generateInterviewUrl = (source) => {
    // Extract the unique part of the source (assuming it's the filename)
    const filename = source.split("/data")[1];
    // Create a URL-friendly string
    const urlFriendlyName = encodeURIComponent(filename);
    return "/interview/" + urlFriendlyName;
  };

  const handleStartInterview = () => {
    const interviewUrl = generateInterviewUrl(resume.metadata.source);
    navigate(interviewUrl, { state: { jobDescription: jobDescription } });
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
        >
          Resume: {index + 1}
        </a>
        <p>Resume Score: {resume.score.score}</p>
        <button onClick={handleStartInterview}> Start Interview</button>
      </div>
      <div className="resume-right">
        {Object.entries(resume.score.match).map(([key, value]) => (
          <div>
            <p>{key}</p>
            <p>{JSON.stringify(value)}</p>
          </div>
        ))}
      </div>
      {/* <br /> */}
    </div>
  );
}

export default Resume;
