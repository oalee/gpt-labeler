import React, { useState, useEffect, useRef, useCallback } from 'react';
import socketIOClient from 'socket.io-client';
import './DataVisualization.css'; // Import the CSS file
import socket from './socket';
import debounce from 'lodash/debounce';
import { filter } from 'lodash';


const DataVisualization = () => {
    // Parse the JSON data
    // const [socket, setSocket] = useState(null);

    const socketRef = useRef(null);
    const [jsonData, setJsonData] = useState({});
    const [collapsedItems, setCollapsedItems] = useState({});
    const [manualInstruction, setManualInstruction] = useState('');
    const [manualCorrection, setManualCorrection] = useState('');
    const manualInstructionRef = useRef({});
    const manualCorrectionRef = useRef({});
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10); // Set the number of items per page
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = Object.keys(jsonData).slice(indexOfFirstItem, indexOfLastItem);

    const [serverStatus, setServerStatus] = useState({
        status: 'disconnected',
        isTaskRunning: false,
        promptQueueLength: 0,
        rateLimitError: false,
        error: null,
        rateLimitTime: 0,
    });

    // use effect to set to false initially
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

            socketRef.current.on('serverStatus', (data) => {
                console.log('serverStatus', data);
                // data is missing status, add it
                data.status = 'connected';
                setServerStatus(data);
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


    useEffect(() => {
        const initialCollapsedItems = collapsedItems;
        Object.keys(jsonData).forEach((tweetId) => {
            initialCollapsedItems[tweetId] = initialCollapsedItems[tweetId] | true;
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
    // useEffect(() => {
    //     if (Object.keys(jsonData).length > 0) {
    //         console.log('sending js', socketRef.current, Object.keys(jsonData).length);
    //         // Send the custom message event

    //         // Save history to the server
    //         socketRef.current.emit('saveHistory', jsonData);
    //     }
    // }, [jsonData]);

    const handleToggle = (tweetId) => {
        console.log('tweetId', tweetId);


        // send message to server


        setCollapsedItems((prevState) => ({
            ...prevState,
            [tweetId]: !prevState[tweetId],
        }));

    };



    const handleResendInstruction = () => {
        // Resend instruction logic
    };

    const sendManualCorrection = () => {
        // Send manual correction logic
    };

    const sendManualInstruction = (tweetId) => {
        // Send manual correction logic

        let msg = {
            tweetId: tweetId,
            manualInstruction: manualInstructionRef[tweetId],
        }

        console.log('sendManualInstruction', msg);

        socketRef.current.emit('sendManualInstruction', {
            ...msg
        });

    };

    const handleChange = debounce((value) => {
        setManualInstruction(value);
    }, 400);


    const totalPages = Math.ceil(Object.keys(jsonData).length / itemsPerPage);
    return (
        <div className="container">
            <div className="overlay">
                <div className="server-status">
                    {/* <h3>Server Status:</h3> */}
                    <p>Status: {serverStatus.status}</p>
                    <p>Is Task Running: {serverStatus.isTaskRunning.toString()}</p>
                    <p>Prompt Queue Length: {serverStatus.promptQueueLength}</p>
                    <p>Rate Limit Error: {serverStatus.rateLimitError.toString()}</p>
                    <p>Error: {JSON.stringify(serverStatus.error)}</p>
                    <p>Rate Limit Time: {serverStatus.rateLimitTime}</p>
                </div>
            </div>
            <div>
            <div className="pagination">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>
                    Previous
                </button>
                <span>{currentPage}</span> / <span>{totalPages}</span>
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>
                    Next
                </button>
            </div>
                <h1>Label Analysis</h1>
                <div className="button-group">
                    <button disabled={serverStatus.isTaskRunning} onClick={
                        () => {
                            socketRef.current.emit('startTask')
                        }
                    }>Start Task</button>
                    <button onClick={
                        () => {
                            socketRef.current.emit('addSampleQueue')
                        }
                    }>Add Sample Queue</button>
                </div>
                {currentItems.map((tweetId) => {
                    const tweet = jsonData[tweetId];
                    const history = tweet.history;
                    const tweetText = tweet.item.rawContent;
                    const isCollapsed = collapsedItems[tweetId];
                    const isValidated = tweet.isValidated || false;

                    // last Item response from assistant
                    const lastItem = filter(history, { role: 'assistant' }).pop();

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
                            <div className={`card-body ${isCollapsed ? 'collapsed' : ''}`} style={{ display: isCollapsed ? 'none' : 'flex', justifyContent: "center" }}>
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
                                <button onClick={handleResendInstruction}>Resend Instruction</button>

                                <div>
                                    <textarea
                                        type="text"
                                        placeholder="Manual Instruction"
                                        style={{ height: '100px' }}
                                        onChange={(e) => (manualInstructionRef[tweetId] = e.target.value)}
                                    />
                                    <button onClick={
                                        () => {
                                            sendManualInstruction(tweetId)
                                        }
                                    }>Manual Instruction</button>
                                </div>

                                <div>

                                    <textarea
                                        type="text"
                                        defaultValue={JSON.stringify(lastItem.parsedOutput, null, 2)}
                                        placeholder="Manual Correction"

                                    />
                                    <button onClick={sendManualCorrection}>Manual Correction</button>
                                </div>
                            </div>

                        </div>
                    );
                })}
            </div>
        
        </div>
    );
};

export default DataVisualization;
