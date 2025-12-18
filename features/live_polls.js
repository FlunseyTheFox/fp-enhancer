// == Live Polls Feature ==
let pollObserver = null;
let lastActivePoll = null;
let pollTimeout = null;
let allPollsData = [];
let videoElement = null;
let pollTimeListener = null;
let userSettings = {};
let lastPollPosition = null; // { top: number, left: number }
let lastCheckTime = 0; // For debouncing navigation checks

function cleanup() {
    if (videoElement && pollTimeListener) {
        videoElement.removeEventListener('timeupdate', pollTimeListener);
    }
    const pollPopup = document.getElementById('fp-enhancer-poll-popup');
    if (pollPopup) {
        lastPollPosition = { top: pollPopup.offsetTop, left: pollPopup.offsetLeft };
        pollPopup.remove();
    }
    if (pollTimeout) {
        clearTimeout(pollTimeout);
        pollTimeout = null;
    }

    allPollsData = [];
    videoElement = null;
    pollTimeListener = null;
    lastActivePoll = null;
    if (pollObserver) pollObserver.disconnect();
}

function checkVODStatus(floatplaneId, callback) {
    let attempts = 0;
    const maxAttempts = 20; // 10 seconds
    const interval = setInterval(() => {
        const isVOD = document.title.includes("VOD") || document.querySelector('video') !== null;
        if (isVOD || ++attempts > maxAttempts) {
            clearInterval(interval);
            if (isVOD) {
                console.log(`FP Enhancer (Polls): VOD detected for ID ${floatplaneId}`);
                callback(true);
            } else {
                console.error('FP Enhancer (Polls): Failed to detect VOD after 10 seconds.');
                callback(false);
            }
        }
    }, 500);
}

function fetchAndSetupPolls() {
    const now = Date.now();
    if (now - lastCheckTime < 1000) return; // Debounce: wait 1s between checks
    lastCheckTime = now;

    const currentPath = window.location.pathname;
    console.debug(`FP Enhancer (Polls): Checking path: ${currentPath}`);

    const postRegex = /^\/post\/([a-zA-Z0-9]+)/;
    const match = currentPath.match(postRegex);

    if (match) {
        cleanup(); // Clean up before checking new page
        const floatplaneId = match[1];
        checkVODStatus(floatplaneId, (isVOD) => {
            if (isVOD) {
                const apiUrl = `https://api.pollsplane.com/api/polls?floatplane_id=${floatplaneId}`;
                fetch(apiUrl)
                    .then(response => response.json())
                    .then(data => {
                        if (data?.data?.length > 0) {
                            const validPolls = data.data.filter(p =>
                                p?.associated_posts?.floatplane && typeof p.associated_posts.floatplane.start_seconds === 'number'
                            );
                            if (validPolls.length > 0) {
                                allPollsData = validPolls;
                                if (userSettings.pollDisplayMode === 'realtime') {
                                    fetchAllPollDetails();
                                } else {
                                    waitForVideoElement();
                                }
                            } else {
                                console.log('FP Enhancer (Polls): No polls with valid start time.');
                            }
                        } else {
                            console.log('FP Enhancer (Polls): No polls found.');
                        }
                    })
                    .catch(error => console.error('FP Enhancer (Polls): Error fetching poll list:', error));
            }
        });
    } else {
        console.debug(`FP Enhancer (Polls): Not a post page. Path: ${currentPath}`);
    }
}

function fetchAllPollDetails() {
    const detailPromises = allPollsData
        .filter(poll => !poll.untracked)
        .map(poll =>
            fetch(`https://api.pollsplane.com/api/poll/${poll.poll_id}`)
            .then(res => res.json())
            .then(detail => {
                const correspondingPoll = allPollsData.find(p => p.poll_id === detail.data.poll_id);
                if (correspondingPoll) correspondingPoll.details = detail.data;
            })
            .catch(error => console.error(`FP Enhancer (Polls): Error fetching details for poll ${poll.poll_id}:`, error))
        );
    Promise.all(detailPromises).then(waitForVideoElement);
}

function waitForVideoElement() {
    let attempts = 0;
    const maxAttempts = 40;
    const interval = setInterval(() => {
        videoElement = document.querySelector('video');
        if (videoElement) {
            clearInterval(interval);
            console.debug('FP Enhancer (Polls): Video element found.');
            setupVideoListener();
        } else if (++attempts > maxAttempts) {
            clearInterval(interval);
            console.error('FP Enhancer (Polls): Could not find video element after 20 seconds.');
        }
    }, 500);
}

function setupVideoListener() {
    if (pollTimeListener) videoElement.removeEventListener('timeupdate', pollTimeListener);

    pollTimeListener = () => {
        const currentTime = videoElement.currentTime;
        const pollPopup = document.getElementById('fp-enhancer-poll-popup');
        let activePoll = allPollsData.find(p => {
            const start = p.associated_posts.floatplane.start_seconds;
            const duration = (new Date(p.end_date) - new Date(p.start_date)) / 1000;
            if (isNaN(duration) || duration <= 0) return false;
            return currentTime >= start && currentTime < (start + duration);
        });

        if (activePoll) {
            if (pollTimeout) {
                clearTimeout(pollTimeout);
                pollTimeout = null;
            }
            const currentDisplayMode = activePoll.untracked ? 'final' : userSettings.pollDisplayMode;
            const shouldRedisplay = !pollPopup || pollPopup.dataset.pollId !== activePoll.poll_id || pollPopup.dataset.displayMode !== currentDisplayMode;
            if (shouldRedisplay) {
                console.log('FP Enhancer (Polls): Displaying popup for poll:', activePoll.poll_id);
                displayPollPopup(activePoll, currentDisplayMode === 'realtime' ? 'Recreation' : 'Final Results');
            }
            if (currentDisplayMode === 'realtime') {
                updatePollPopup(activePoll, currentTime);
            }
            lastActivePoll = { poll: activePoll, endTime: activePoll.associated_posts.floatplane.start_seconds + (new Date(activePoll.end_date) - new Date(activePoll.start_date)) / 1000 };
        } else if (lastActivePoll && currentTime < lastActivePoll.endTime + 7 && pollPopup) {
            if (userSettings.pollDisplayMode === 'realtime' && !lastActivePoll.poll.untracked) {
                const header = pollPopup.querySelector('#fp-poll-popup-header h4');
                if (header && !header.textContent.includes('Final Results')) {
                    console.log('FP Enhancer (Polls): Showing final results for poll:', lastActivePoll.poll.poll_id);
                    displayPollPopup(lastActivePoll.poll, 'Final Results');
                }
            }
            if (!pollTimeout) {
                pollTimeout = setTimeout(() => {
                    if (pollPopup) pollPopup.remove();
                    lastActivePoll = null;
                    pollTimeout = null;
                }, (lastActivePoll.endTime + 7 - currentTime) * 1000);
            }
        } else if (pollPopup) {
            pollPopup.remove();
            lastActivePoll = null;
            if (pollTimeout) {
                clearTimeout(pollTimeout);
                pollTimeout = null;
            }
        }
    };
    videoElement.addEventListener('timeupdate', pollTimeListener);
    pollTimeListener();
}

function displayPollPopup(poll, modeText) {
    let videoContainer = document.querySelector('.av-player-control-wrapper');
    if (!videoContainer) {
        console.warn('FP Enhancer (Polls): .av-player-control-wrapper not found, using body.');
        videoContainer = document.body;
    }
    
    const existingPopup = document.getElementById('fp-enhancer-poll-popup');
    if (existingPopup) {
        lastPollPosition = { top: existingPopup.offsetTop, left: existingPopup.offsetLeft };
        existingPopup.remove();
    }

    const effectiveDisplayMode = poll.untracked ? 'final' : userSettings.pollDisplayMode;
    const isRealtime = effectiveDisplayMode === 'realtime' && poll.details && modeText !== 'Final Results';
    const tally = isRealtime ? (poll.details.vote_history?.[0] || { counts: [], total_votes: 0 }) : poll.latest_tally;
    
    const optionsHtml = poll.options.map((option, index) => {
        const voteCount = tally.counts[index] || 0;
        const percentage = tally.total_votes > 0 ? (voteCount / tally.total_votes * 100) : 0;
        return `<div id="fp-poll-option-${index}" class="fp-poll-option">
                    <div class="fp-poll-labels"><span>${option}</span><span class="fp-poll-percentage">${percentage.toFixed(1)}% (${voteCount} votes)</span></div>
                    <div class="fp-poll-bar-bg"><div class="fp-poll-bar" style="width: ${percentage}%;"></div></div>
                </div>`;
    }).join('');

    const titleHtml = `${poll.title} <span style="color: #bbb; font-weight: 400; font-size: 14px;">(${modeText})</span>`;

    const disclaimerHtml = poll.untracked ? `
        <div style="font-size: 11px; text-align: left; color: #ffcc00; padding: 10px 15px; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 5px;">
            Note: This is an untracked/backlogged poll. Only final results are available.
        </div>` : '';
    
    const popup = document.createElement('div');
    popup.id = 'fp-enhancer-poll-popup';
    popup.dataset.pollId = poll.poll_id;
    popup.dataset.displayMode = effectiveDisplayMode;
    popup.style.cssText = `position: absolute; width: 320px; background-color: rgba(20,20,20,0.85); backdrop-filter: blur(10px); border-radius: 10px; color: white; z-index: 1000; font-family: 'Segoe UI', sans-serif; box-shadow: 0 5px 15px rgba(0,0,0,0.5);`;
    
    if (lastPollPosition) {
        popup.style.top = `${lastPollPosition.top}px`;
        popup.style.left = `${lastPollPosition.left}px`;
    } else {
        popup.style.top = '20px';
        popup.style.right = '20px';
    }

    popup.innerHTML = `
        <style>.fp-poll-option{margin-bottom:12px;}.fp-poll-labels{display:flex;justify-content:space-between;margin-bottom:5px;font-size:14px;color:#eee;}.fp-poll-bar-bg{background-color:#555;border-radius:4px;overflow:hidden;height:20px;}.fp-poll-bar{background-color:#3b82f6;height:100%;transition:width .3s ease-out;}</style>
        <div id="fp-poll-popup-header" style="padding:10px 15px;background-color:rgba(0,0,0,.3);cursor:move;border-bottom:1px solid rgba(255,255,255,.2);"><h4 style="margin:0;font-size:16px;font-weight:500;">${titleHtml}</h4></div>
        <div style="padding:15px;">${optionsHtml}</div>
        ${disclaimerHtml}
        <div style="font-size:11px;text-align:right;color:#aaa;padding: ${disclaimerHtml ? '5px 15px 10px' : '0 15px 10px'};">Data provided by <a href="https://pollsplane.com" target="_blank" style="color:#60a5fa;text-decoration:none;">Pollsplane</a></div>`;
    
    videoContainer.appendChild(popup);
    console.log('FP Enhancer (Polls): Popup appended for poll:', poll.poll_id);
    makeDraggable(popup);
}

function updatePollPopup(poll, videoTime) {
    const pollTimeOffset = videoTime - poll.associated_posts.floatplane.start_seconds;
    if (!poll.details?.vote_history) {
        console.warn('FP Enhancer (Polls): No vote history for poll:', poll.poll_id);
        return;
    }

    const currentTally = poll.details.vote_history.reduce((prev, curr) => 
        curr.time_offset_seconds <= pollTimeOffset ? curr : prev, { counts: [], total_votes: 0 });

    const popup = document.getElementById('fp-enhancer-poll-popup');
    if (!popup) {
        console.warn('FP Enhancer (Polls): Popup not found for update:', poll.poll_id);
        return;
    }

    poll.options.forEach((option, index) => {
        const voteCount = currentTally.counts[index] || 0;
        const percentage = currentTally.total_votes > 0 ? (voteCount / currentTally.total_votes * 100) : 0;
        const percentageEl = popup.querySelector(`#fp-poll-option-${index} .fp-poll-percentage`);
        const barEl = popup.querySelector(`#fp-poll-option-${index} .fp-poll-bar`);
        if (percentageEl) percentageEl.textContent = `${percentage.toFixed(1)}% (${voteCount} votes)`;
        if (barEl) barEl.style.width = `${percentage}%`;
    });
}

function makeDraggable(element) {
    const header = element.querySelector("#fp-poll-popup-header");
    const dragMouseDown = e => {
        e.preventDefault();
        let pos3 = e.clientX, pos4 = e.clientY;
        document.onmouseup = () => {
            document.onmouseup = document.onmousemove = null;
            lastPollPosition = { top: element.offsetTop, left: element.offsetLeft };
        };
        document.onmousemove = e => {
            e.preventDefault();
            const pos1 = pos3 - e.clientX, pos2 = pos4 - e.clientY;
            pos3 = e.clientX; pos4 = e.clientY;
            element.style.top = `${element.offsetTop - pos2}px`;
            element.style.left = `${element.offsetLeft - pos1}px`;
        };
    };
    if (header) header.onmousedown = dragMouseDown;
}

function initializeFeature(settings) {
    // Parse the JSON string to get the settings object
    userSettings = typeof settings === 'string' ? JSON.parse(settings) : settings;
    fetchAndSetupPolls();

    if (!pollObserver) {
        pollObserver = new MutationObserver(() => {
            console.debug('FP Enhancer (Polls): DOM change detected, checking for VOD.');
            fetchAndSetupPolls();
        });
        pollObserver.observe(document.body, { childList: true, subtree: true });
    }

    // Listen for SPA navigation events
    window.addEventListener('popstate', () => {
        console.debug('FP Enhancer (Polls): popstate event, checking for VOD.');
        fetchAndSetupPolls();
    });

    // Override history.pushState to detect SPA navigation
    const originalPushState = history.pushState;
    history.pushState = function(state, unused, url) {
        originalPushState.apply(this, arguments);
        console.debug('FP Enhancer (Polls): pushState event, checking for VOD:', url);
        fetchAndSetupPolls();
    };
}

document.addEventListener('fp-polls-init', e => initializeFeature(e.detail));
document.addEventListener('fp-polls-teardown', cleanup);