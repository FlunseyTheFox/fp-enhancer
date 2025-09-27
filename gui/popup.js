document.addEventListener('DOMContentLoaded', function () {
    const checkboxes = {
        enableDarkTheme: document.getElementById('enableDarkTheme'),
        enableDarkModeFixLinks: document.getElementById('enableDarkModeFixLinks'),
        enableBetaRedirect: document.getElementById('enableBetaRedirect'),
        enableCheckIfCreatorLive: document.getElementById('enableCheckIfCreatorLive'),
        enableVODPolls: document.getElementById('enableVODPolls')
    };
    const vodPollsSettingsBtn = document.getElementById('vodPollsSettingsBtn');
    const vodPollsFlyout = document.getElementById('vodPollsFlyout');
    const backFromPollsBtn = document.getElementById('backFromPolls');
    const pollDisplayModeRadios = document.querySelectorAll('input[name="pollDisplayMode"]');

    const storage = chrome.storage.sync;

    const settingsToLoad = [...Object.keys(checkboxes), 'pollDisplayMode'];

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

        if (checkboxes.enableDarkTheme.checked) {
            document.body.classList.add('dark-theme');
        }

        const pollMode = data.pollDisplayMode || 'final';
        document.querySelector(`input[name="pollDisplayMode"][value="${pollMode}"]`).checked = true;
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

    // Flyout panel logic
    vodPollsSettingsBtn.addEventListener('click', () => {
        vodPollsFlyout.classList.add('visible');
    });

    backFromPollsBtn.addEventListener('click', () => {
        vodPollsFlyout.classList.remove('visible');
    });
});