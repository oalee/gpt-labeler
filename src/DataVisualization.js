import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
    const [addedSampleQueue, setAddedSampleQueue] = useState(false);
    const [filterType, setFilterType] = useState('all');
    // filter all means all data, we have all, validated, and unvalidated
    // filter validated means only show validated data

    // we need to filter jsonData
    const handleFilterChange = (event) => {
        setFilterType(event.target.value);
    };

    // Apply the filter based on filterType
    const filteredItems = useMemo(() => {
        return Object.fromEntries(
            Object.entries(jsonData).filter(([tweetId, item]) => {
                if (filterType === 'all') {
                    return true;
                } else if (filterType === 'validated') {
                    return item.history.some((historyItem) => historyItem.isValidated === true);
                } else if (filterType === 'unvalidated') {
                    return !item.history.some((historyItem) => historyItem.isValidated === true);
                }
                return true;
            })
        );
    }, [jsonData, filterType]);
    // const currentItems = Object.keys(jsonData).slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(Object.keys(filteredItems).length / itemsPerPage);

    const currentItems = Object.keys(filteredItems)
        .slice(indexOfFirstItem, indexOfLastItem);

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

        socketRef.current.emit('validate', {
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





    const sendManualCorrection = (tweetId) => {

        let value = manualCorrectionRef[tweetId].value;
        // first check if it's valid json

        try {
            let json = JSON.parse(value);

            // if it's valid json, then send it to the server
            let msg = {
                tweetId: tweetId,
                manualCorrection: json,
            }

            console.log('sendManualCorrection', msg);

            socketRef.current.emit('sendManualCorrection', {
                ...msg
            });
        }
        catch (e) {
            alert('Invalid JSON');
            return;
        }
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



    // have validated in their history (not null)

    // jsonData is dict
    // Object.keys(jsonData).length
    const totalValidated = Object.keys(jsonData).filter((tweetId) => {
        return jsonData[tweetId].history.filter((historyItem) => historyItem.isValidated === true).length > 0
    }).length;

    const totalJobsQueued = Object.keys(jsonData).filter((tweetId) => {
        return jsonData[tweetId].jobs && jsonData[tweetId].jobs.filter((job) => job.done === false).length > 0
    }).length;
    // const totalJobsQueued = jsonData.filter((item) => {
    //    return item.jobs && item.jobs.filter((job) => job.done === false).length > 0
    // }).length; 

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
            <p style={{ margin: 10 }} > Total Validated :  {totalValidated}</p>
            <p style={{ margin: 10 }} > Total Instruction Queued :  {totalJobsQueued}</p>

            <div className="filter-container">
                <label htmlFor="filter">Filter:</label>
                <select id="filter"style={{margin:10, fontSize:20}} value={filterType} onChange={handleFilterChange}>
                    <option value="all">All</option>
                    <option value="validated">Validated</option>
                    <option value="unvalidated">Unvalidated</option>
                </select>
            </div>
            <div>
                <div className="buttonGroup">
                <button style={{ margin: 5 }} disabled={currentPage  == 1} onClick={() => setCurrentPage(1)}>
                        First
                    </button>
                    {/* back 10 */}
                    <button style={{ margin: 0 }} disabled={currentPage < 10} onClick={() => setCurrentPage(currentPage - 10)}>
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
                    <button style={{ margin: 5 }} disabled={currentPage == totalPages } onClick={() => setCurrentPage(totalPages)}>
                        Last
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

                    // console.log('selectedItem', selectedItem);

                    const lastItem = filter(history, { role: 'assistant' }).pop();

                    if (selectedItem === undefined) {
                        selectedItem = lastItem;
                    }

                    // if tweet has jobs, and the the job is not done, we already have manualInstruction
                    let alreadyHasManualInstructionItem = tweet.jobs && tweet.jobs.length > 0 && tweet.jobs.filter((item) => item.done === false).length > 0;

                    let manualPlaceholder = alreadyHasManualInstructionItem ? tweet.jobs.filter(item => item.done === false)[0].manualInstruction : '';

                    // console.log("jobs", alreadyHasManualInstructionItem, tweet.jobs)

                    return (
                        <div className="card" key={tweetId}>
                            {/* if validated, then card-header should have greenish backround, set in csv as card-header-validated */}

                            <div className={`card-header${isValidated ? '-validated' : ''}`}

                                onClick={() => handleToggle(tweetId)}>

                                {/* if already has manual instruction, then write this and show a progress indicator */}
                                {alreadyHasManualInstructionItem && <div > <h1>Instruction in Queue</h1> <div id="loading"></div></div>}

                                <h2>Tweet ID: {tweetId}</h2>
                                <h3> {tweetText}</h3>
                            </div>
                            <div className={`card-body ${isCollapsed ? 'collapsed' : ''}`} style={{ display: isCollapsed ? 'none' : 'flex', justifyContent: "center" }}>
                                {history.map((item, index) => (
                                    // differenciate betwen validated and not validated
                                    <div className={`item${item.isValidated ? '-validated' : ''}`} key={index}>

                                        <h3>Role: {item.role ? item.role : item.type}</h3>
                                        {item.type === 'user' && <p>{item.data ? item.data : item.text}</p>}
                                        {item.role === 'user' && <p>{item.data ? item.data : item.text}</p>}
                                        {item.type === 'manualCorrection' &&
                                            (
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
                                            )
                                        }
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
                                        placeholder={"Manual Instruction"}
                                        defaultValue={manualPlaceholder}
                                        style={{ height: '100px' }}
                                        onChange={(e) => (manualInstructionRef[tweetId] = e.target.value)}
                                    />
                                    <button onClick={
                                        () => {
                                            sendManualInstruction(tweetId)
                                        }
                                    }>{alreadyHasManualInstructionItem ? 'Modify Manual Instruction' : 'Send Manual Instruction'}</button>
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
                                    <button onClick={(e) => {
                                        sendManualCorrection(tweetId)
                                    }}>Send Manual Correction</button>
                                </div>
                            </div>

                        </div>
                    );
                })}
            </div>
            <div className="buttonGroup">
                {/* back 10 */}
                <button style={{ margin: 0 }} disabled={currentPage < 10} onClick={() => setCurrentPage(currentPage - 10)}>
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
                <button style={{ margin: 0 }} disabled={currentPage > totalPages - 10} onClick={() => setCurrentPage(currentPage + 10)}>
                    + 10
                </button>
            </div>
        </div>
    );
};

export default DataVisualization;
