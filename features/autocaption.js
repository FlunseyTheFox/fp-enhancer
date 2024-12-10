let captionedSelected = false;
let lastUrl = window.location.href;

function isValidUrl() {
    const urlPattern = /^https:\/\/[^\/]+\/post\/[^\/]+$/;
    return urlPattern.test(window.location.href);
}

function isCaptionedAlreadySelected(captionedElement) {
    return captionedElement.classList.contains('_selected_1ckpo_77');
}

function findAndClickCaptioned() {
    if (!isValidUrl()) return;

    const attachmentList = document.querySelector('div[class*="_attachmentList"]');
    if (!attachmentList) return;

    const allDivElements = attachmentList.querySelectorAll('div[title]');
    let captionedElement = null;

    for (const element of allDivElements) {
        const titleText = element.getAttribute('title');
        if (titleText && titleText.startsWith('Captioned')) {
            captionedElement = element;
            break;
        }
    }

    if (captionedElement && !isCaptionedAlreadySelected(captionedElement)) {
        const event = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
        captionedElement.dispatchEvent(event);
        captionedSelected = true;
    }
}

function selectCaptionedOption() {
    if (!captionedSelected) {
        findAndClickCaptioned();
    }
}

function observePageChanges() {
    const observer = new MutationObserver(() => {
        if (isValidUrl() && !captionedSelected) {
            const attachmentList = document.querySelector('div[class*="_attachmentList"]');
            if (attachmentList) {
                selectCaptionedOption();
            }
        }
    });

    observer.observe(document.body, { 
        childList: true, 
        subtree: true,
        attributes: true
    });
}

window.addEventListener('load', () => {
    observePageChanges();

    setInterval(() => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            captionedSelected = false;
            if (isValidUrl()) {
                selectCaptionedOption();
            }
        }
    }, 1000);
});
