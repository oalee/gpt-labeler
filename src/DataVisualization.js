import React, { useState, useEffect, useRef } from 'react';
import socketIOClient from 'socket.io-client';
import './DataVisualization.css'; // Import the CSS file
import socket from './socket';

const DataVisualization = () => {
    // Parse the JSON data
    // const [socket, setSocket] = useState(null);

    const socketRef = useRef(null);
    const [jsonData, setJsonData] = useState({});

    useEffect(() => {
        let isMounted = true;
        // Connect to the server
        if (!socketRef.current) {
            console.log('Connecting to the server');
            let s = socket
            socketRef.current = s;
            // Get the initial history data from the server
            socketRef.current.emit('getHistory');
            console.log('getHistory');

            // socket.emit('customMessage', 'getHistory');
            socketRef.current.on('history', (data) => {
                console.log('history', data);
                setJsonData(data);
            });

            // Clean up the socket connection on component unmount
            return () => {
                isMounted = false;
                if (isMounted) {
                    socketRef.current.disconnect();
                    socketRef.current = null;
                }
            };
        }
    }, []);
    // useEffect(() => {
    //     if (socketRef.current && Object.keys(jsonData).length > 0) {
    //         console.log('sending js', socketRef.current, Object.keys(jsonData).length);
    //         // Send the custom message event
    //         socket.emit('customMessage', 'message');
    //         // Save history to the server
    //         socket.emit('saveHistory', jsonData);
    //     }
    // }, [jsonData]);

    const startTask = () => {
        socketRef.current.emit('startTask');
    };

    const stopTask = () => {
        socketRef.current.emit('stopTask');
    };

    const sendCustomMessage = (message) => {
        socketRef.current.emit('customMessage', message);
    };
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
        let value = !jsonData[tweetId].isValidated;
        // // new history
        // let hst = jsonData
        // hst[tweetId].isValidated = value;

        socketRef.current.emit('customMessage', {
            message: 'validated',
            value: value,
            tweetId: tweetId,
        });

    };


    // use effect to check data, ignore initial render
    useEffect(() => {
        if (Object.keys(jsonData).length > 0) {
            console.log('sending js', socketRef.current, Object.keys(jsonData).length);
            // Send the custom message event

            // Save history to the server
            socketRef.current.emit('saveHistory', jsonData);
        }
    }, [jsonData]);

    const handleToggle = (tweetId) => {
        console.log('tweetId', tweetId);


        // send message to server


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
                            <div className={`card-body ${isCollapsed ? 'collapsed' : ''}`} style={{ display: isCollapsed ? 'none' : 'flex' , justifyContent:"center"}}>
                                {history.map((item, index) => (
                                    <div className={`item ${isValidated ? 'validated' : ''}`} key={index}>
                                        <h3>Role: {item.role}</h3>
                                        {item.role === 'user' && <p>{item.data}</p>}
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
