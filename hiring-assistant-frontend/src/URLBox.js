import "./URLBox.css";
import { useState } from "react";

function URLBox({ getUrl }) {
  const [url, setUrl] = useState("");
  function handleSubmit(e) {
    e.preventDefault();
    console.log("Form Submitted");
    getUrl(url);
  }

  function onChangeHandler(event) {
    setUrl(event.target.value);
  }

  return (
    <div className="url-box-container">
      <form onSubmit={handleSubmit}>
        <input
          className="url-text-box"
          type="text"
          value={url}
          onChange={onChangeHandler}
        ></input>
        <input
          className="submit-button"
          type="Submit"
          defaultValue="Get Job Information"
        ></input>
      </form>
    </div>
  );
}

export default URLBox;
