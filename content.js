// Immediately apply the dark theme when the script loads
applyDarkTheme();

function applyDarkTheme() {
    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = chrome.runtime.getURL('dark-theme.css');
    document.head.appendChild(styleLink);
}

function selectCaptionedOption() {
    const captionedElement = document.querySelector('.AttachmentComponentNeue .title[title="Captioned"]');
    if (captionedElement) {
        captionedElement.click();
        console.log('Captioned option selected.');
    }
}

let lastUrl = window.location.href;

function checkUrlChange() {
    let currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        console.log('URL changed:', currentUrl);
        setTimeout(() => {
            selectCaptionedOption();
            applyDarkTheme(); // Reapply dark theme on URL change
        }, 2000); // Adjust delay as necessary
    }
}

// Check for URL change every second
setInterval(checkUrlChange, 1000);
