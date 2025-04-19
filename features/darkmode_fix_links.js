// Floatplane changes the CSS so much that manually specifying the CSS is a chore and having to do constant updates is a pain
// Hopefully this should auto-detect properly and apply them even if changes happen

// Function to check if the current page is a post page
function isPostPage() {
    return window.location.pathname.match(/^\/post\/[a-zA-Z0-9]+$/);
}

// Function to check if the current page is a settings page
function isSettingsPage() {
    return window.location.pathname.startsWith('/settings/');
}

// Function to change link and user mention colors in comments and description
function updateLinkColors() {
    if (!isPostPage()) return;

    // Select links in the description and comments
    const links = document.querySelectorAll(
        'section[aria-label="Description"] div.text-selectable a, div.theme-dark div.text-selectable a'
    );

    // Select user mentions in the description and comments
    const mentions = document.querySelectorAll(
        'section[aria-label="Description"] div.text-selectable span.md-regex-user-mention, div.theme-dark div.text-selectable span.md-regex-user-mention'
    );

    // Apply styles to links
    links.forEach(link => {
        link.style.setProperty('color', '#00cddc', 'important');
        link.addEventListener('mouseover', () => {
            link.style.setProperty('color', '#00cddc', 'important');
        });
        link.addEventListener('mouseout', () => {
            link.style.setProperty('color', '#00cddc', 'important');
        });
    });

    // Apply styles to user mentions
    mentions.forEach(mention => {
        mention.style.setProperty('color', '#00cddc', 'important');
    });
}

// Function to apply color fixes to form elements on the settings page
function updateSettingsStyles() {
    if (!isSettingsPage()) return;

    // Select form elements within the <main> that is a sibling of <nav aria-label="Profile settings">
    const elements = document.querySelectorAll(
        'nav[aria-label="Profile settings"] ~ main input, ' +
        'nav[aria-label="Profile settings"] ~ main select, ' +
        'nav[aria-label="Profile settings"] ~ main textarea'
    );

    elements.forEach(el => {
        el.style.setProperty('color', '#fff', 'important');
        el.style.setProperty('background-color', '#000', 'important');
    });
}

// Run the functions when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    updateLinkColors();
    updateSettingsStyles();
});

// Initialize MutationObserver only if it hasn't been set up
if (!window.FloatplaneStyleObserverInitialized) {
    const FloatplaneStyleObserver = new MutationObserver(() => {
        updateLinkColors();
        updateSettingsStyles();
    });

    FloatplaneStyleObserver.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Mark the observer as initialized
    window.FloatplaneStyleObserverInitialized = true;
}