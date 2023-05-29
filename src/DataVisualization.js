import React, { useState, useEffect } from 'react';
import data from './pers_labels_history.json';
import './DataVisualization.css'; // Import the CSS file

const DataVisualization = () => {
  // Parse the JSON data

    const [jsonData, setJsonData] = useState(data);
    // State to track the collapsed state of user data

    const [collapsedItems, setCollapsedItems] = useState({});

    // use effect to set to false initially
    useEffect(() => {
      const initialCollapsedItems = {};
      Object.keys(jsonData).forEach((tweetId) => {
        initialCollapsedItems[tweetId] = true;
      });
      setCollapsedItems(initialCollapsedItems);
    }, [jsonData]);

    const handleValidation = (tweetId) => {
        setJsonData((prevState) => ({
          ...prevState,
          [tweetId]: {
            ...prevState[tweetId],
            isValidated: !prevState[tweetId].isValidated,
          },
        }));
      };
    const handleToggle = (tweetId) => {
        console.log('tweetId', tweetId);
      setCollapsedItems((prevState) => ({
        ...prevState,
        [tweetId]: !prevState[tweetId],
        }));
    };
  
    return (
      <div className="container">
        <div>
          <h1>Tweet Analysis</h1>
          {Object.keys(jsonData).map((tweetId) => {
            const tweet = jsonData[tweetId];
            const history = tweet.history;
            const tweetText = tweet.item.rawContent;
            const isCollapsed = collapsedItems[tweetId];
            const isValidated = tweet.isValidated || false;

            return (
                <div className="card" key={tweetId}>
                  <div className="card-header" onClick={() => handleToggle(tweetId)}>
                  <div className="validation-checkbox">
                      <label>
                        <input
                          type="checkbox"
                          checked={isValidated}
                          onChange={() => handleValidation(tweetId)}
                        />
                        Validated
                      </label>
                    </div>
                    <h2>Tweet ID: {tweetId}</h2>
                    <h3> {tweetText}</h3>
                  </div>
                  <div className={`card-body ${isCollapsed ? 'collapsed' : ''}`} style={{ display: isCollapsed ? 'none' : 'block' }}>
                    {history.map((item, index) => (
                      <div className={`item ${isValidated ? 'validated' : ''}`} key={index}>
                        <h3>Role: {item.role}</h3>
                        {item.role === 'user' && <p>User Data: {item.data}</p>}
                        {item.role === 'assistant' && (
                          <div>
                            <p>Parsed Output:</p>
                            <p>{JSON.stringify(item.parsedOutput, null, 2)}</p>
                          </div>
                        )}
                      </div>
                    ))}

                  </div>
                </div>
              );
          })}
        </div>
      </div>
    );
  };
  
  export default DataVisualization;
