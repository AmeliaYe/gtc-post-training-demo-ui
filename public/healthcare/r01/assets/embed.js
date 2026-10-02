// Same-origin sizing keeps the four-page narrative in the host's scroll flow.
let pending = 0;
function reportSize() {
  cancelAnimationFrame(pending);
  pending = requestAnimationFrame(() => {
    const main = document.querySelector('main');
    const nav = document.querySelector('.view-tabs');
    const height = Math.ceil(main.getBoundingClientRect().height + nav.getBoundingClientRect().height);
    parent.postMessage({ type: 'healthcare-demo:resize', height }, location.origin);
  });
}
const observer = new ResizeObserver(reportSize);
observer.observe(document.querySelector('main'));
observer.observe(document.querySelector('.view-tabs'));
window.addEventListener('load', reportSize);
reportSize();
