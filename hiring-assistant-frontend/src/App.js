import logo from "./logo.svg";
import "./App.css";
import JobInformation from "./JobInformation.js";
import Candidates from "./Candidates.js";
import { useState } from "react";

function App() {
  const [gptResponse, setgptResponse] = useState("");
  return (
    <div className="App">
      <JobInformation passResponse={setgptResponse} />
      <Candidates gptResponse={gptResponse} />
    </div>
  );
}

export default App;
