import React, { useState, useEffect, useRef, useCallback } from 'react';
import socketIOClient from 'socket.io-client';
import './DataVisualization.css'; // Import the CSS file
import socket from './socket';
import debounce from 'lodash/debounce';
import { filter, last } from 'lodash';


const DataVisualization = () => {
    // Parse the JSON data
    // const [socket, setSocket] = useState(null);

    const socketRef = useRef(null);
    const [jsonData, setJsonData] = useState({});
    const [collapsedItems, setCollapsedItems] = useState({});
    const [manualInstruction, setManualInstruction] = useState('');
    const [manualCorrectionValues, setManualCorrectionValues] = useState({});
    const manualInstructionRef = useRef({});
    const manualCorrectionRef = useRef({});
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10); // Set the number of items per page
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = Object.keys(jsonData).slice(indexOfFirstItem, indexOfLastItem);
    const [addedSampleQueue, setAddedSampleQueue] = useState(false);

    const [serverStatus, setServerStatus] = useState({
        status: 'disconnected',
        isTaskRunning: false,
        promptQueueLength: 0,
        rateLimitError: false,
        error: null,
        rateLimitTime: 0,
        currentState: 'idle'
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

            socketRef.current.on('addedSampleQueue', (data) => {
                console.log('addedSampleQueue', data);
                // should be true
                setAddedSampleQueue(data);
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


    // useEffect(() => {
    //     const initialCollapsedItems = collapsedItems;
    //     Object.keys(jsonData).forEach((tweetId) => {
    //         initialCollapsedItems[tweetId] = initialCollapsedItems[tweetId] | true;
    //     });
    //     setCollapsedItems(initialCollapsedItems);
    // }, [jsonData]);



    const handleValidation = (tweetId, historyItem) => {
        let prevHistory = jsonData[tweetId].history;
        // set historyItem (same id) to handle change validation (defualt is false and null)
        // prevHistory
        jsonData[tweetId].history = prevHistory.map((item) => {
            if (item.id === historyItem.id) {
                // default null
                if (item.isValidated === null) {
                    item.isValidated = true;
                } else {
                    item.isValidated = !item.isValidated;
                }
            }
            return item;
        });;
        setJsonData({ ...jsonData });

        // // new history
        // let hst = jsonData
        // hst[tweetId].isValidated = value;

        socketRef.current.emit('customMessage', {
            message: 'validated',

            tweetId: tweetId,
            historyItem: historyItem,
        });

    };


    const handleSelection = (tweetId, historyItem) => {
        let prevHistory = jsonData[tweetId].history;

        // set historyItem (same id) to handle change validation (defualt is false and null)
        // prevHistory
        jsonData[tweetId].history = prevHistory.map((item) => {
            if (item.id === historyItem.id) {
                // default null
                if (item.isSelected === null) {
                    item.isSelected = true;
                } else {
                    item.isSelected = !item.isSelected;
                }
            } else {
                item.isSelected = false;
            }
            return item;
        });;

        manualCorrectionRef[tweetId].value = JSON.stringify(historyItem.parsedOutput, null, 2);
        setJsonData({ ...jsonData });
    };


    const handleToggle = (tweetId) => {
        console.log('tweetId', tweetId);


        // send message to server
        let prevCollapsed = collapsedItems[tweetId]
        // if it's undefined, set to false
        if (prevCollapsed === undefined) {
            prevCollapsed = true;
        }
        // console.log('prevCollapsed', prevCollapsed, !prevCollapsed);


        setCollapsedItems((prevState) => ({
            ...prevState,
            [tweetId]: !prevCollapsed,
        }));

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
                    <p>Current State: {serverStatus.currentState}</p>
                </div>
            </div>
            <h1 style={{ margin: 10 }}> Data Labler</h1>
            <p style={{ margin: 10 }} > Total :  {Object.keys(jsonData).length}</p>
            <div>
                <div className="buttonGroup">
                    {/* back 10 */}
                    <button style={{ margin: 0 }} disabled={currentPage < 11} onClick={() => setCurrentPage(currentPage - 10)}>
                        - 10
                    </button>
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>
                        Previous
                    </button>
                    <span>{currentPage}</span> / <span>{totalPages}</span>
                    <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>
                        Next
                    </button>
                    {/* forward 10 */}
                    <button style={{ margin: 0 }} disabled={currentPage > totalPages - 11} onClick={() => setCurrentPage(currentPage + 10)}>
                        + 10
                    </button>
                </div>
                {/* <h1>Label Analysis</h1> */}
                <div className="buttonGroup">
                    <button disabled={serverStatus.isTaskRunning} onClick={
                        () => {
                            socketRef.current.emit('startTask')
                        }
                    }>Start Task</button>
                    <button disabled={addedSampleQueue} onClick={
                        () => {
                            socketRef.current.emit('addSampleQueue')
                        }
                    }>Add Sample Queue</button>
                    <button disabled={!serverStatus.isTaskRunning} onClick={
                        () => {
                            socketRef.current.emit('stopTask')
                        }
                    }>Stop Task</button>
                </div>
                {currentItems.map((tweetId) => {
                    const tweet = jsonData[tweetId];
                    const history = tweet.history;
                    const tweetText = tweet.item.rawContent;
                    // default to true if not set
                    var isCollapsed = collapsedItems[tweetId]
                    isCollapsed = isCollapsed === undefined ? true : isCollapsed;


                    // validatet comes from item in history that has "validated" as "true" default is false (and not set)
                    const isValidated = history.filter((item) => item.isValidated === true).length > 0;
                    // const isValidated = tweet.isValidated || false;

                    // last Item response from assistant
                    // see if history has selected item
                    var selectedItem = history.filter((item) => item.isSelected === true).pop();

                    console.log('selectedItem', selectedItem);

                    const lastItem = filter(history, { role: 'assistant' }).pop();

                    if (selectedItem === undefined) {
                        selectedItem = lastItem;
                    }

                    return (
                        <div className="card" key={tweetId}>
                            {/* if validated, then card-header should have greenish backround, set in csv as card-header-validated */}

                            <div className={`card-header${isValidated ? '-validated' : ''}`}

                                onClick={() => handleToggle(tweetId)}>

                                <h2>Tweet ID: {tweetId}</h2>
                                <h3> {tweetText}</h3>
                            </div>
                            <div className={`card-body ${isCollapsed ? 'collapsed' : ''}`} style={{ display: isCollapsed ? 'none' : 'flex', justifyContent: "center" }}>
                                {history.map((item, index) => (
                                    // differenciate betwen validated and not validated
                                    <div className={`item${item.isValidated ?'-validated': ''}`} key={index}>

                                        <h3>Role: {item.role}</h3>
                                        {item.role === 'user' && <p>{item.data}</p>}
                                        {item.role === 'assistant' && (


                                            <div style={{
                                            }}  >
                                                {item.parsedOutput &&
                                                    <div className="validation-checkbox" style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        justifyContent: 'center',
                                                    }}>
                                                        <label>
                                                            <input
                                                                type="checkbox"
                                                                checked={item.isValidated}
                                                                onChange={() => handleValidation(tweetId, item)}
                                                            />
                                                            Validated
                                                        </label>
                                                        <label>
                                                            <input
                                                                type="checkbox"
                                                                checked={item.isSelected}
                                                                onChange={() => handleSelection(tweetId, item)}
                                                            />
                                                            Selected For Manual Correction
                                                        </label>                                                </div>

                                                }

                                                {/* if has item.parsedOutput, show that otherwise, item.text */}

                                                <p> {item.parsedOutput ? 'Parsed Output:' : 'Text:'}  </p>
                                                <p>{item.parsedOutput ? JSON.stringify(item.parsedOutput, null, 4) : item.text}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {/* <button onClick={handleResendInstruction}>Resend Instruction</button> */}

                                <div className='buttonGroup'>
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
                                    }>Send Manual Instruction</button>
                                </div>

                                <div className='buttonGroup'>

                                    <textarea
                                        type="text"
                                        defaultValue={JSON.stringify(selectedItem.parsedOutput, null, 2)}
                                        onChange={(e) => (manualCorrectionValues[tweetId] = e.target.value)}
                                        ref={
                                            (el) => {
                                                manualCorrectionRef[tweetId] = el;
                                                // if (el) {
                                                //     el.value = JSON.stringify(selectedItem.parsedOutput, null, 2);
                                                // }
                                            }

                                        }
                                    // value={manualCorrectionRef[tweetId]}
                                    // we want to dynamically update the value of the textarea to reflect the latest parsedOutput to become the default value


                                    // value={JSON.stringify(selectedItem.parsedOutput, null, 2)}
                                    // placeholder={JSON.stringify(selectedItem, null, 2)}

                                    />
                                    <button onClick={sendManualCorrection}>Send Manual Correction</button>
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
