import logo from "./logo.svg";
import "./App.css";
import JobInformation from "./JobInformation.js";
import Candidates from "./Candidates.js";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { useState } from "react";
import HomeScreen from "./HomeScreen.js";
import Interview from "./Interview.js";
import InterviewSummary from "./InterviewSummary.js";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/interview/:resumeId" element={<Interview />} />
        <Route
          path="/interview-summary/:resumePath"
          element={<InterviewSummary />}
        />
      </Routes>
    </Router>
  );
}

export default App;
