import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import axios from "axios";

function Interview() {
  const { resumeId } = useParams();
  const location = useLocation();
  const { jobDescription } = location.state || {};

  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [resumePath, setResumePath] = useState("");

  useEffect(() => {
    const decoded = decodeURIComponent(resumeId);
    console.log("decoded", decoded);
    setResumePath(decoded);
    initiateInterview();
  }, [resumeId]);

  const initiateInterview = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:3002/initiate-interview",
        {
          jobDescription,
          resumePath: resumePath,
        }
      );

      setMessages([{ text: response.data.reply, sender: "ai" }]);
    } catch (error) {
      console.error("Error initiating interview:", error);
      setMessages([
        {
          text: "Sorry, there was an error starting the interview.",
          sender: "ai",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const newMessage = { text: inputMessage, sender: "user" };
    setMessages((prev) => [...prev, newMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await axios.post("http://localhost:3001/chat", {
        message: inputMessage,
      });

      setMessages((prev) => [
        ...prev,
        { text: response.data.reply, sender: "ai" },
      ]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          text: "Sorry, there was an error processing your message.",
          sender: "ai",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="interview-container">
      {/* <h1>Interview for {resumeData?.name || "Candidate"}</h1> */}
      <div className="chat-container">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.sender}`}>
            {message.text}
          </div>
        ))}
        {isLoading && <div className="message ai">AI is typing...</div>}
      </div>
      <div className="input-container">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type your message..."
        />
        <button onClick={sendMessage} disabled={isLoading}>
          Send
        </button>
      </div>
    </div>
  );
}

export default Interview;
