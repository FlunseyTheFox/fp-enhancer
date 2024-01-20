// content.js
chrome.storage.sync.get(['enableDarkTheme', 'enableAutoCaption'], function (data) {
    if (data.enableDarkTheme) {
        applyDarkTheme();
    }

    if (data.enableAutoCaption) {
        selectCaptionedOption();
    }
});

function applyDarkTheme() {
    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = chrome.runtime.getURL('dark-theme.css');
    document.head.appendChild(styleLink);
    console.log('Dark Theme applied.');
}

function selectCaptionedOption() {
    const captionedElement = document.querySelector('.AttachmentComponentNeue .title[title="Captioned"]');
    if (captionedElement) {
        // The other method didn't work so just do this, it works :)
        const event = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
        captionedElement.dispatchEvent(event);
        console.log('Captioned option selected.');
    }
}


// Listen for changes in the storage and reapply features
chrome.storage.onChanged.addListener(function (changes) {
    if (changes.enableDarkTheme && changes.enableDarkTheme.newValue) {
        applyDarkTheme();
    }

    if (changes.enableAutoCaption && changes.enableAutoCaption.newValue) {
        selectCaptionedOption();
    }
});

// Check for URL change every second
let lastUrl = window.location.href;
setInterval(function () {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        console.log('URL changed:', currentUrl);
        selectCaptionedOption(); // Reapply autocaption on URL change otherwise whent he user changes video it'll not trigger
    }
}, 1000);
