(() => {
  window.addEventListener('load', () => {
    const tab = document.querySelector('.view-tabs .tab.active');
    if (tab?.getClientRects().length) tab.scrollIntoView({block: 'nearest', inline: 'nearest', behavior: 'instant'});
  });
  const button = document.querySelector('.gs-copy');
  if (!button) return;
  let timer;
  button.addEventListener('click', async () => {
    const text = document.getElementById('gs-command').textContent;
    const status = document.getElementById('gs-copy-status');
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = 'Copied';
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(document.getElementById('gs-command'));
      selection.removeAllRanges();
      selection.addRange(range);
      status.textContent = document.execCommand('copy') ? 'Copied' : 'Select & copy';
    }
    clearTimeout(timer);
    timer = window.setTimeout(() => { status.textContent = ''; }, 2500);
  });
})();
