import logo from "./logo.svg";
import "./App.css";
import JobInformation from "./JobInformation.js";
import Candidates from "./Candidates.js";

function App() {
  return (
    <div className="App">
      <JobInformation />
      <Candidates />
    </div>
  );
}

export default App;
