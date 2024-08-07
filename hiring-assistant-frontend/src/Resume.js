import "./Resume.css";

function Resume({ resume, index }) {
  console.log("RESUME HERE:", resume);

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
        <button> Start Interview</button>
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
