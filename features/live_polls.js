// == Live Polls Feature ==
const POLL_GRACE_SECONDS = 7;
const POLL_STACK_GAP = 12;
const POLL_DEFAULT_OFFSET = 20;
const POLL_POPUP_CLASS = 'fp-enhancer-poll-popup';
const POLL_STYLES_ID = 'fp-enhancer-poll-styles';

let pollObserver = null;
let allPollsData = [];
let videoElement = null;
let pollTimeListener = null;
let userSettings = {};
let lastCheckTime = 0; // For debouncing navigation checks
let pollPositions = {}; // { [pollId]: { top, left } }
let pollTimeouts = {}; // { [pollId]: timeoutId }
let pollZIndex = 1000;

function popupIdForPoll(pollId) {
    return `fp-enhancer-poll-popup-${pollId}`;
}

function getPollPopup(pollId) {
    return document.getElementById(popupIdForPoll(pollId));
}

function getAllPollPopups() {
    return [...document.querySelectorAll(`.${POLL_POPUP_CLASS}`)];
}

function getPollTiming(poll) {
    const start = poll?.associated_posts?.floatplane?.start_seconds;
    const duration = (new Date(poll.end_date) - new Date(poll.start_date)) / 1000;
    if (typeof start !== 'number' || isNaN(duration) || duration <= 0) return null;
    return { start, duration, end: start + duration };
}

function clearPollTimeout(pollId) {
    if (pollTimeouts[pollId]) {
        clearTimeout(pollTimeouts[pollId]);
        delete pollTimeouts[pollId];
    }
}

function clearAllPollTimeouts() {
    Object.keys(pollTimeouts).forEach(clearPollTimeout);
}

function rememberPollPosition(popup) {
    if (!popup) return;
    const pollId = popup.dataset.pollId;
    if (!pollId) return;
    pollPositions[pollId] = { top: popup.offsetTop, left: popup.offsetLeft };
}

function removePollPopup(popup) {
    if (!popup) return;
    const pollId = popup.dataset.pollId;
    rememberPollPosition(popup);
    popup.remove();
    if (pollId) clearPollTimeout(pollId);
}

function schedulePollRemoval(pollId, delayMs) {
    clearPollTimeout(pollId);
    pollTimeouts[pollId] = setTimeout(() => {
        const popup = getPollPopup(pollId);
        if (popup) removePollPopup(popup);
        delete pollTimeouts[pollId];
    }, Math.max(0, delayMs));
}

function cleanup() {
    if (videoElement && pollTimeListener) {
        videoElement.removeEventListener('timeupdate', pollTimeListener);
    }
    getAllPollPopups().forEach(removePollPopup);
    clearAllPollTimeouts();

    allPollsData = [];
    videoElement = null;
    pollTimeListener = null;
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

function getVisiblePolls(currentTime) {
    const visible = [];
    for (const poll of allPollsData) {
        const timing = getPollTiming(poll);
        if (!timing) continue;

        const inActive = currentTime >= timing.start && currentTime < timing.end;
        const inGrace = currentTime >= timing.end && currentTime < timing.end + POLL_GRACE_SECONDS;
        if (!inActive && !inGrace) continue;

        const displayMode = poll.untracked ? 'final' : userSettings.pollDisplayMode;
        const modeText = (displayMode === 'realtime' && inActive) ? 'Recreation' : 'Final Results';
        visible.push({ poll, timing, displayMode, modeText, inActive, inGrace });
    }

    visible.sort((a, b) => {
        if (a.timing.start !== b.timing.start) return a.timing.start - b.timing.start;
        return String(a.poll.poll_id).localeCompare(String(b.poll.poll_id));
    });
    return visible;
}

function setupVideoListener() {
    if (pollTimeListener) videoElement.removeEventListener('timeupdate', pollTimeListener);

    pollTimeListener = () => {
        const currentTime = videoElement.currentTime;
        const visiblePolls = getVisiblePolls(currentTime);
        const visibleIds = new Set(visiblePolls.map(item => String(item.poll.poll_id)));

        for (const popup of getAllPollPopups()) {
            if (!visibleIds.has(String(popup.dataset.pollId))) {
                removePollPopup(popup);
            }
        }

        for (const item of visiblePolls) {
            const pollId = item.poll.poll_id;
            const popup = getPollPopup(pollId);
            const shouldRedisplay = !popup
                || popup.dataset.modeText !== item.modeText
                || popup.dataset.displayMode !== item.displayMode;

            if (shouldRedisplay) {
                console.log('FP Enhancer (Polls): Displaying popup for poll:', pollId, item.modeText);
                displayPollPopup(item.poll, item.modeText);
            }
            if (item.displayMode === 'realtime' && item.inActive) {
                updatePollPopup(item.poll, currentTime);
            }

            if (item.inActive) {
                clearPollTimeout(pollId);
            } else if (item.inGrace) {
                schedulePollRemoval(pollId, (item.timing.end + POLL_GRACE_SECONDS - currentTime) * 1000);
            }
        }
    };
    videoElement.addEventListener('timeupdate', pollTimeListener);
    pollTimeListener();
}

function ensurePollStyles() {
    if (document.getElementById(POLL_STYLES_ID)) return;
    const style = document.createElement('style');
    style.id = POLL_STYLES_ID;
    style.textContent = `.fp-poll-option{margin-bottom:12px;}.fp-poll-labels{display:flex;justify-content:space-between;margin-bottom:5px;font-size:14px;color:#eee;}.fp-poll-bar-bg{background-color:#555;border-radius:4px;overflow:hidden;height:20px;}.fp-poll-bar{background-color:#3b82f6;height:100%;transition:width .3s ease-out;}`;
    document.head.appendChild(style);
}

function getStackedPosition() {
    const popups = getAllPollPopups();
    if (popups.length === 0) {
        return { top: POLL_DEFAULT_OFFSET, right: POLL_DEFAULT_OFFSET };
    }
    let lowestBottom = POLL_DEFAULT_OFFSET;
    for (const el of popups) {
        lowestBottom = Math.max(lowestBottom, el.offsetTop + el.offsetHeight);
    }
    return { top: lowestBottom + POLL_STACK_GAP, right: POLL_DEFAULT_OFFSET };
}

function displayPollPopup(poll, modeText) {
    let videoContainer = document.querySelector('.av-player-control-wrapper');
    if (!videoContainer) {
        console.warn('FP Enhancer (Polls): .av-player-control-wrapper not found, using body.');
        videoContainer = document.body;
    }

    ensurePollStyles();

    const existingPopup = getPollPopup(poll.poll_id);
    let savedPosition = pollPositions[poll.poll_id];
    if (existingPopup) {
        savedPosition = { top: existingPopup.offsetTop, left: existingPopup.offsetLeft };
        pollPositions[poll.poll_id] = savedPosition;
        existingPopup.remove();
    }

    const effectiveDisplayMode = poll.untracked ? 'final' : userSettings.pollDisplayMode;
    const isRealtime = effectiveDisplayMode === 'realtime' && poll.details && modeText !== 'Final Results';
    const tally = isRealtime ? (poll.details.vote_history?.[0] || { counts: [], total_votes: 0 }) : poll.latest_tally;
    
    const optionsHtml = poll.options.map((option, index) => {
        const voteCount = tally.counts[index] || 0;
        const percentage = tally.total_votes > 0 ? (voteCount / tally.total_votes * 100) : 0;
        return `<div class="fp-poll-option" data-option-index="${index}">
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
    popup.id = popupIdForPoll(poll.poll_id);
    popup.className = POLL_POPUP_CLASS;
    popup.dataset.pollId = poll.poll_id;
    popup.dataset.displayMode = effectiveDisplayMode;
    popup.dataset.modeText = modeText;
    popup.style.cssText = `position: absolute; width: 320px; background-color: rgba(20,20,20,0.85); backdrop-filter: blur(10px); border-radius: 10px; color: white; z-index: ${++pollZIndex}; font-family: 'Segoe UI', sans-serif; box-shadow: 0 5px 15px rgba(0,0,0,0.5);`;
    
    if (savedPosition) {
        popup.style.top = `${savedPosition.top}px`;
        popup.style.left = `${savedPosition.left}px`;
    } else {
        const stacked = getStackedPosition();
        popup.style.top = `${stacked.top}px`;
        popup.style.right = `${stacked.right}px`;
    }

    popup.innerHTML = `
        <div class="fp-poll-popup-header" style="padding:10px 15px;background-color:rgba(0,0,0,.3);cursor:move;border-bottom:1px solid rgba(255,255,255,.2);"><h4 style="margin:0;font-size:16px;font-weight:500;">${titleHtml}</h4></div>
        <div style="padding:15px;">${optionsHtml}</div>
        ${disclaimerHtml}
        <div style="font-size:11px;display:flex;justify-content:space-between;align-items:center;gap:8px;color:#aaa;padding: ${disclaimerHtml ? '5px 15px 10px' : '0 15px 10px'};"><span style="color:#ccc;white-space:nowrap;">Floatplane Enhancer</span><span style="white-space:nowrap;">Data by <a href="https://pollsplane.com" target="_blank" style="color:#60a5fa;text-decoration:none;">Pollsplane</a></span></div>`;
    
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

    const popup = getPollPopup(poll.poll_id);
    if (!popup) {
        console.warn('FP Enhancer (Polls): Popup not found for update:', poll.poll_id);
        return;
    }

    poll.options.forEach((option, index) => {
        const voteCount = currentTally.counts[index] || 0;
        const percentage = currentTally.total_votes > 0 ? (voteCount / currentTally.total_votes * 100) : 0;
        const optionEl = popup.querySelector(`.fp-poll-option[data-option-index="${index}"]`);
        if (!optionEl) return;
        const percentageEl = optionEl.querySelector('.fp-poll-percentage');
        const barEl = optionEl.querySelector('.fp-poll-bar');
        if (percentageEl) percentageEl.textContent = `${percentage.toFixed(1)}% (${voteCount} votes)`;
        if (barEl) barEl.style.width = `${percentage}%`;
    });
}

function makeDraggable(element) {
    const header = element.querySelector(".fp-poll-popup-header");
    const dragMouseDown = e => {
        e.preventDefault();
        element.style.zIndex = String(++pollZIndex);
        let pos3 = e.clientX, pos4 = e.clientY;
        document.onmouseup = () => {
            document.onmouseup = document.onmousemove = null;
            pollPositions[element.dataset.pollId] = { top: element.offsetTop, left: element.offsetLeft };
        };
        document.onmousemove = e => {
            e.preventDefault();
            const pos1 = pos3 - e.clientX, pos2 = pos4 - e.clientY;
            pos3 = e.clientX; pos4 = e.clientY;
            element.style.top = `${element.offsetTop - pos2}px`;
            element.style.left = `${element.offsetLeft - pos1}px`;
            element.style.right = 'auto';
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
