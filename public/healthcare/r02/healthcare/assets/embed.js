// Same-origin sizing keeps the narrative in the host's scroll flow.
if (document.documentElement.classList.contains('embedded') && parent !== window) {
  let pending = 0;
  function reportSize() {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => {
      const height = Math.ceil(document.querySelector('main').getBoundingClientRect().bottom + scrollY);
      parent.postMessage({ type: 'healthcare-demo:resize', height }, location.origin);
    });
  }
  const observer = new ResizeObserver(reportSize);
  observer.observe(document.querySelector('main'));
  observer.observe(document.querySelector('.view-tabs'));
  window.addEventListener('load', reportSize);
  reportSize();
}
