function enterGallery() {
  if (parent === window) {
    location.assign('/');
    return;
  }

  parent.postMessage({type: 'gtc-demo:enter-gallery'}, location.origin);
}

document.querySelector('#enter-gallery').addEventListener('click', enterGallery);
document.documentElement.dataset.howItLearnsReady = 'true';
