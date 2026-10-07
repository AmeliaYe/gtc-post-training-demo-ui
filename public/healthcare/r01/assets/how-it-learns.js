function navigate(stage) {
  if (parent === window) {
    location.assign(`/?stage=${stage}`);
    return;
  }

  parent.postMessage({type: 'gtc-demo:navigate', stage}, location.origin);
}

document.querySelectorAll('[data-demo-stage]').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.demoStage)));
document.documentElement.dataset.howItLearnsReady = 'true';
