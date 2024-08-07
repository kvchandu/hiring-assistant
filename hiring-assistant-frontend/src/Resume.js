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

        <button> Start Interview</button>
      </div>
      <div className="resume-right">
        <h5>Matching sections from Resume</h5>
        <ul>
          {resume.matches.map((match) => (
            <li>{match}</li>
          ))}
        </ul>
      </div>
      {/* <br /> */}
    </div>
  );
}

export default Resume;
