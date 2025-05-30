// Function to convert timestamps in a comment
function convertTimestamps(commentText) {
  const timestampRegex = /\b(\d{1,2}:\d{2}(:\d{2})?)\b/g;

  if (!commentText.classList.contains('timestamps-converted')) {
    const modifiedComment = commentText.innerHTML.replace(timestampRegex, (match) => {
      return `<a href="#" class="timestamp-link" data-timestamp="${match}">${match}</a>`;
    });

    commentText.innerHTML = modifiedComment;
    commentText.classList.add('timestamps-converted');
  }
}

// Handle click on timestamps
function handleTimestampClick(event) {
  event.preventDefault();
  const timestamp = event.target.dataset.timestamp;

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
    const parts = timestamp.split(':');
    const timeInSeconds = parts.reduce(
      (acc, val, index) => acc + parseInt(val) * Math.pow(60, parts.length - 1 - index),
      0
    );

    video.currentTime = timeInSeconds;

    if (video.paused) {
      video.play();
    }
  });
}

// Function to handle mutations and apply the conversion
function handleMutations(mutationsList) {
  mutationsList.forEach((mutation) => {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      const comments = document.querySelectorAll('.text-selectable p');

      comments.forEach((commentText) => {
        convertTimestamps(commentText);
      });
    }
  });
}

const timestampObserver = new MutationObserver(handleMutations);
timestampObserver.observe(document.body, { subtree: true, childList: true });

document.addEventListener('DOMContentLoaded', () => {
  const existingComments = document.querySelectorAll('.text-selectable p');
  existingComments.forEach((commentText) => {
    convertTimestamps(commentText);
  });
});

// Handle click on timestamps
document.body.addEventListener('click', (event) => {
  const timestampLink = event.target.closest('.timestamp-link');
  if (timestampLink) {
    handleTimestampClick(event);
  }
});

// Handle video change event
document.addEventListener('DOMContentLoaded', () => {
  const timestampObserver = new MutationObserver((mutationsList) => {
    mutationsList.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
        const videoChangeEvent = new Event('videoChange');
        document.dispatchEvent(videoChangeEvent);
      }
    });
  });

  const videoContainer = document.querySelector('._container_1peps_1');
  if (videoContainer) {
    timestampObserver.observe(videoContainer, { subtree: true, childList: true, attributes: true });
  }
});