document.addEventListener('DOMContentLoaded', function () {
    const checkboxes = {
        enableDarkTheme: document.getElementById('enableDarkTheme'),
        enableDarkModeFixLinks: document.getElementById('enableDarkModeFixLinks'),
        enableBetaRedirect: document.getElementById('enableBetaRedirect'),
        enableCheckIfCreatorLive: document.getElementById('enableCheckIfCreatorLive'),
        enableVODPolls: document.getElementById('enableVODPolls'),
        enableAccessibilityFix: document.getElementById('enableAccessibilityFix'),
        enableRandomPostButton: document.getElementById('enableRandomPostButton')
    };
    const vodPollsSettingsBtn = document.getElementById('vodPollsSettingsBtn');
    const vodPollsFlyout = document.getElementById('vodPollsFlyout');
    const backFromPollsBtn = document.getElementById('backFromPolls');
    const pollDisplayModeRadios = document.querySelectorAll('input[name="pollDisplayMode"]');

    const randomPostSettingsBtn = document.getElementById('randomPostSettingsBtn');
    const randomPostFlyout = document.getElementById('randomPostFlyout');
    const backFromRandomPostBtn = document.getElementById('backFromRandomPost');
    const randomPostCreatorList = document.getElementById('randomPostCreatorList');
    const randomPostSelectAll = document.getElementById('randomPostSelectAll');
    const randomPostSemiShuffle = document.getElementById('randomPostSemiShuffle');

    const storage = chrome.storage.sync;

    const settingsToLoad = [...Object.keys(checkboxes), 'pollDisplayMode', 'randomPostDisabledCreators', 'randomPostSemiShuffle'];
    let disabledCreators = [];

    function updateRandomPostSettingsBtnState() {
        if (checkboxes.enableRandomPostButton) {
            const isEnabled = checkboxes.enableRandomPostButton.checked;
            randomPostSettingsBtn.disabled = !isEnabled;
            randomPostSettingsBtn.style.opacity = isEnabled ? '1' : '0.5';
            randomPostSettingsBtn.style.pointerEvents = isEnabled ? 'auto' : 'none';
        }
    }

    // Load preferences and update UI
    storage.get(settingsToLoad, function (data) {
        Object.keys(checkboxes).forEach(key => {
            if (checkboxes[key]) {
                checkboxes[key].checked = data[key] !== undefined ? data[key] : false;
            }
        });
        
        // Special defaults for certain features
        if (data.enableDarkTheme === undefined) checkboxes.enableDarkTheme.checked = true;
        if (data.enableCheckIfCreatorLive === undefined) checkboxes.enableCheckIfCreatorLive.checked = true;
        if (data.enableVODPolls === undefined) checkboxes.enableVODPolls.checked = true;
        if (data.enableAccessibilityFix === undefined) checkboxes.enableAccessibilityFix.checked = true;
        if (data.enableRandomPostButton === undefined) checkboxes.enableRandomPostButton.checked = false;

        randomPostSemiShuffle.checked = data.randomPostSemiShuffle !== undefined ? data.randomPostSemiShuffle : false;

        disabledCreators = data.randomPostDisabledCreators || [];
        updateRandomPostSettingsBtnState();

        if (checkboxes.enableDarkTheme.checked) {
            document.body.classList.add('dark-theme');
        }

        const pollMode = data.pollDisplayMode || 'realtime';
        document.querySelector(`input[name="pollDisplayMode"][value="${pollMode}"]`).checked = true;
    });

    randomPostSemiShuffle.addEventListener('change', (e) => {
        storage.set({ randomPostSemiShuffle: e.target.checked });
    });

    // Add event listeners for checkboxes
    Object.keys(checkboxes).forEach(key => {
        if (checkboxes[key]) {
            checkboxes[key].addEventListener('change', function (e) {
                if (key === 'enableDarkModeFixLinks' || key === 'enableBetaRedirect') {
                    if (e.target.checked && !confirm('This is an experimental feature and may cause unexpected behavior. Are you sure?')) {
                        e.target.checked = false;
                        return;
                    }
                }
                storage.set({ [key]: e.target.checked });

                if (key === 'enableDarkTheme') {
                     document.body.classList.toggle('dark-theme', e.target.checked);
                }
                if (key === 'enableRandomPostButton') {
                     updateRandomPostSettingsBtnState();
                     if (!e.target.checked) {
                         randomPostFlyout.classList.remove('visible');
                     }
                }
            });
        }
    });

    // Add event listeners for radio buttons
    pollDisplayModeRadios.forEach(radio => {
        radio.addEventListener('change', function (e) {
            if (e.target.checked) {
                storage.set({ pollDisplayMode: e.target.value });
            }
        });
    });

    function closeAllFlyouts() {
        vodPollsFlyout.classList.remove('visible');
        randomPostFlyout.classList.remove('visible');
    }

    // Flyout panel logic for VOD Polls
    vodPollsSettingsBtn.addEventListener('click', () => {
        closeAllFlyouts();
        vodPollsFlyout.classList.add('visible');
    });

    backFromPollsBtn.addEventListener('click', () => {
        vodPollsFlyout.classList.remove('visible');
    });

    // Flyout panel logic for Random Post
    randomPostSettingsBtn.addEventListener('click', () => {
        closeAllFlyouts();
        randomPostFlyout.classList.add('visible');
        loadCreatorList();
    });

    backFromRandomPostBtn.addEventListener('click', () => {
        randomPostFlyout.classList.remove('visible');
    });

    // Fetch utility helper
    async function fetchFromFloatplane(path) {
        try {
            const response = await fetch(`https://www.floatplane.com${path}`);
            if (response.ok) return await response.json();
        } catch (e) {
            console.warn("Fetch from www failed, trying beta:", e);
        }
        try {
            const response = await fetch(`https://beta.floatplane.com${path}`);
            if (response.ok) return await response.json();
        } catch (e) {
            console.error("Fetch from beta failed too:", e);
        }
        throw new Error("Could not connect to Floatplane API");
    }

    function getIconUrl(icon) {
        if (!icon || !icon.path) return '../icons/icon128.png';
        if (icon.path.startsWith('http') || icon.path.startsWith('data:')) {
            return icon.path;
        }
        return `https://www.floatplane.com${icon.path}`;
    }

    async function loadCreatorList() {
        randomPostCreatorList.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--icon-color);">Loading subscriptions...</div>';
        
        try {
            const subs = await fetchFromFloatplane('/api/v3/user/subscriptions');
            if (!Array.isArray(subs) || subs.length === 0) {
                randomPostCreatorList.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--icon-color);">No active subscriptions found.</div>';
                randomPostSelectAll.checked = false;
                randomPostSelectAll.disabled = true;
                return;
            }

            const creatorIds = subs.map(s => s.creator).filter(Boolean);
            if (creatorIds.length === 0) {
                randomPostCreatorList.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--icon-color);">No creators found in subscriptions.</div>';
                randomPostSelectAll.checked = false;
                randomPostSelectAll.disabled = true;
                return;
            }

            const queryParams = creatorIds.map(id => `creatorGUID=${encodeURIComponent(id)}`).join('&');
            const creatorsInfo = await fetchFromFloatplane(`/api/v2/creator/info?${queryParams}`);
            
            if (!Array.isArray(creatorsInfo) || creatorsInfo.length === 0) {
                randomPostCreatorList.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--icon-color);">Failed to load creator info.</div>';
                randomPostSelectAll.checked = false;
                randomPostSelectAll.disabled = true;
                return;
            }

            randomPostCreatorList.innerHTML = '';
            randomPostSelectAll.disabled = false;
            
            const allChecked = creatorsInfo.every(c => !disabledCreators.includes(c.id));
            randomPostSelectAll.checked = allChecked;

            creatorsInfo.forEach(creator => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'creator-item';

                const isChecked = !disabledCreators.includes(creator.id);
                const avatarUrl = getIconUrl(creator.icon);

                itemDiv.innerHTML = `
                    <img class="creator-avatar" src="${avatarUrl}" alt="${creator.title}">
                    <span class="creator-name">${creator.title}</span>
                    <input type="checkbox" class="creator-checkbox" data-id="${creator.id}" ${isChecked ? 'checked' : ''}>
                `;

                randomPostCreatorList.appendChild(itemDiv);

                const checkbox = itemDiv.querySelector('.creator-checkbox');
                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        disabledCreators = disabledCreators.filter(id => id !== creator.id);
                    } else {
                        if (!disabledCreators.includes(creator.id)) {
                            disabledCreators.push(creator.id);
                        }
                    }
                    storage.set({ randomPostDisabledCreators: disabledCreators });
                    
                    const checkboxes = randomPostCreatorList.querySelectorAll('.creator-checkbox');
                    const allAreChecked = Array.from(checkboxes).every(cb => cb.checked);
                    randomPostSelectAll.checked = allAreChecked;
                });
            });

        } catch (err) {
            console.error('Floatplane Enhancer: Error loading creator settings:', err);
            randomPostCreatorList.innerHTML = '<div style="text-align: center; padding: 20px; color: red; font-size: 12px;">Failed to load subscriptions. Make sure you are logged into Floatplane.</div>';
            randomPostSelectAll.checked = false;
            randomPostSelectAll.disabled = true;
        }
    }

    randomPostSelectAll.addEventListener('change', (e) => {
        const checkboxes = randomPostCreatorList.querySelectorAll('.creator-checkbox');
        if (e.target.checked) {
            checkboxes.forEach(cb => cb.checked = true);
            disabledCreators = [];
        } else {
            checkboxes.forEach(cb => cb.checked = false);
            disabledCreators = Array.from(checkboxes).map(cb => cb.dataset.id).filter(Boolean);
        }
        storage.set({ randomPostDisabledCreators: disabledCreators });
    });
});