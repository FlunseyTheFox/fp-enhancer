// Floatplane changes the CSS so much that manually specifying the CSS is a chore and having to do constant updates is a pain
// Hopefully this should auto-detect properly and apply them even if changes happen

// Function to check if the current page is a post page
function isPostPage() {
    return window.location.pathname.match(/^\/post\/[a-zA-Z0-9]+$/);
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

// Run the function when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', updateLinkColors);

// Observe for dynamic content changes (e.g., AJAX-loaded comments)
const LinkColorObserver = new MutationObserver(updateLinkColors);
LinkColorObserver.observe(document.body, {
    childList: true,
    subtree: true
});