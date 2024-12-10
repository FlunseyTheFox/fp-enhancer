// Function to convert timestamps in a comment
function convertTimestamps(commentText) {
  const timestampRegex = /\b(\d{1,2}:\d{2}(:\d{2})?)\b/g;

  // Check if the comment has already been modified
  if (!commentText.classList.contains('timestamps-converted')) {
    const modifiedComment = commentText.innerHTML.replace(timestampRegex, (match) => {
      return `<a href="#" class="timestamp-link" data-timestamp="${match}">${match}</a>`;
    });

    commentText.innerHTML = modifiedComment;

    // Add a class to mark the comment as converted
    commentText.classList.add('timestamps-converted');
  }
}

// Function to handle click events on timestamp links
function handleTimestampClick(event) {
  event.preventDefault();
  const timestamp = event.target.dataset.timestamp;

  // Function to wait for the video element to load
  const waitForVideoLoad = (callback) => {
    const checkVideoLoad = () => {
      const video =
        document.querySelector('#avplayer-html5-f8b50311-729f-4444-a82c-7aa67fc397bf') ||
        document.querySelector('._video_6vv3x_1');

      if (video && video.readyState >= 2) {
        callback(video);
      } else {
        setTimeout(checkVideoLoad, 100);
      }
    };

    checkVideoLoad();
  };

  // Wait for the video to load and then seek to the timestamp
  waitForVideoLoad((video) => {
    // Convert the timestamp to seconds
    const parts = timestamp.split(':');
    const timeInSeconds = parts.reduce(
      (acc, val, index) => acc + parseInt(val) * Math.pow(60, parts.length - 1 - index),
      0
    );

    // Seek to the specific time in the video
    video.currentTime = timeInSeconds;

    // Play the video if paused
    if (video.paused) {
      video.play();
    }
  });
}

// Function to handle mutations and apply the conversion
function handleMutations(mutationsList) {
  mutationsList.forEach((mutation) => {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      // Check if the added nodes contain comments
      const comments = document.querySelectorAll('.text-selectable p');

      // Apply the conversion to new comments
      comments.forEach((commentText) => {
        convertTimestamps(commentText);
      });
    }
  });
}

// Use MutationObserver to listen for changes in the DOM
const observer = new MutationObserver(handleMutations);
observer.observe(document.body, { subtree: true, childList: true });

// Initial conversion when the page loads
document.addEventListener('DOMContentLoaded', () => {
  // Apply the conversion to existing comments
  const existingComments = document.querySelectorAll('.text-selectable p');
  existingComments.forEach((commentText) => {
    convertTimestamps(commentText);
  });
});

// Delegate click events on the document body to handle timestamp links
document.body.addEventListener('click', (event) => {
  const timestampLink = event.target.closest('.timestamp-link');
  if (timestampLink) {
    handleTimestampClick(event);
  }
});

// Handle video change event
document.addEventListener('DOMContentLoaded', () => {
  const observer = new MutationObserver((mutationsList) => {
    mutationsList.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
        const videoChangeEvent = new Event('videoChange');
        document.dispatchEvent(videoChangeEvent);
      }
    });
  });

  const videoContainer = document.querySelector('._container_1peps_1');
  if (videoContainer) {
    observer.observe(videoContainer, { subtree: true, childList: true, attributes: true });
  }
});
