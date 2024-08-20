let captionedSelected = false; // Track if the captioned option has been selected
let lastUrl = window.location.href; // Track the last URL

// Function to check if the URL matches the specified format
function isValidUrl() {
    // Define a regular expression to match URLs of the format: https://<any-domain>/post/<some-random-stuff>
    // This is fine due to the manifest only allowing the extension to run on the specified domain defined in "host_permissions"
    const urlPattern = /^https:\/\/[^\/]+\/post\/[^\/]+$/;
    return urlPattern.test(window.location.href);
}

// Function to search for and click the captioned option
function findAndClickCaptioned() {
    // Check if the current URL is a Post page or something else
    if (!isValidUrl()) {
        return;
    }

    // Query the attachment list container using a more generic selector
    const attachmentList = document.querySelector('div[class*="_attachmentList"]');
    
    if (!attachmentList) {
        console.log('Attachment list not found.');
        return;
    }

    // Query all div elements with a title attribute within the attachment list
    const allDivElements = attachmentList.querySelectorAll('div[title]');
    let captionedElement = null;

    for (const element of allDivElements) {
        const titleText = element.getAttribute('title');
        // Check if the title starts with 'Captioned'
        if (titleText && titleText.startsWith('Captioned')) {
            captionedElement = element;
            break;
        }
    }

    if (captionedElement) {
        // Create and dispatch a click event
        const event = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
        captionedElement.dispatchEvent(event);
        console.log('Captioned option selected.');
        captionedSelected = true; // Mark that the captioned option has been selected
    } else {
        console.log('Captioned option not found yet.');
    }
}

// Function to select the captioned option within the attachment list if the URL matches the specified format
function selectCaptionedOption() {
    // Only check if the captioned option has not been selected yet
    if (!captionedSelected) {
        // Add a 1-2 second delay before attempting to find and click the captioned option
        // Sometimes it may be delayed to show up
        setTimeout(() => {
            findAndClickCaptioned();
        }, 1000 + Math.random() * 1000); // Random delay between 1 and 2 seconds
    }
}

// Function to observe changes in URL or content
function observePageChanges() {
    // Create a MutationObserver to watch for changes in the URL or page content
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList' || mutation.type === 'subtree') {
                // Check if the URL matches the required format
                if (isValidUrl() && !captionedSelected) {
                    // Call the function to select the captioned option
                    selectCaptionedOption();
                }
            }
        }
    });

    // Observe changes in the document body
    observer.observe(document.body, { childList: true, subtree: true });
}

// Start observing changes
observePageChanges();

// Check for URL change every second
setInterval(function () {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        console.log('URL changed:', currentUrl);
        // Reset captionedSelected flag for new posts
        captionedSelected = false;
        // Only start checking if the URL is valid and the captioned option has not been selected
        if (isValidUrl()) {
            selectCaptionedOption();
        }
    }
}, 1000);
