import {createGymScene} from '../gym-opening-r02/scene.js';
import {REP_SECONDS, smooth} from '../gym-opening-r02/motion.js';

const CYCLE_SECONDS = 16;
const icon = name => `<img src="assets/beyond-request-${name}-r01.svg" alt="" width="18" height="18">`;
const panel = document.querySelector('[data-screen-panel="break-ice"]');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const hero = document.createElement('section');

hero.className = 'gym-opening r02 r03';
hero.id = 'practice-gym';
hero.setAttribute('aria-label', 'A robot improves its lifting technique through practice and coach feedback');
hero.innerHTML = `
  <div class="go-heading">
    <div>
      <h1>Build domain-specialized AI on NVIDIA DGX Station—with full control over data and cost.</h1>
    </div>
    <button class="go-evidence" data-gym-action="evidence">Continue ${icon('arrow-right')}</button>
  </div>
  <div class="go-stage">
    <img class="go-backdrop" src="assets/gym-opening-r02/training-room.png" alt="Two coaches observe a robot practicing in a gym" fetchpriority="high">
    <div class="go-score" data-quality="low" aria-live="polite">
      <p>Coach score</p>
      <strong><span data-gym="score">24</span><small>/ 100</small></strong>
      <span class="go-score-state" data-gym="score-state">Low</span>
    </div>
  </div>
`;

document.getElementById('gymOpeningMount').replaceWith(hero);

const field = name => hero.querySelector(`[data-gym="${name}"]`);
let elapsed = reduced.matches ? 11 : 0;
let clock = elapsed;
let skill = 0;
let playing = !reduced.matches;
let active = panel.classList.contains('active');
let visible = true;
let last = 0;
let raf = 0;
let scene;

try {
  scene = createGymScene(hero.querySelector('.go-stage'));
} catch (error) {
  playing = false;
  hero.querySelector('.go-stage').insertAdjacentHTML('beforeend', '<p class="go-no-webgl">The animated gym needs WebGL.</p>');
  console.warn('Gym scene unavailable:', error.message);
}

function canRun() {
  return playing && visible && active && !document.hidden;
}

function render() {
  skill = smooth((elapsed - 3) / 6);
  const score = Math.round(24 + skill * 72);
  const quality = skill > .84 ? 'high' : skill > .18 ? 'improving' : 'low';

  field('score').textContent = String(score);
  field('score-state').textContent = quality === 'high' ? 'High' : quality === 'improving' ? 'Improving' : 'Low';
  hero.querySelector('.go-score').dataset.quality = quality;
  hero.dataset.phase = quality;
  scene?.render(clock, skill);
}

function schedule() {
  if (canRun() && !raf) raf = requestAnimationFrame(tick);
}

function tick(now) {
  raf = 0;
  if (!canRun()) {
    last = 0;
    return;
  }

  const dt = last ? Math.min((now - last) / 1000, .08) : 0;
  last = now;
  elapsed += dt;
  clock += dt;

  if (elapsed >= CYCLE_SECONDS) {
    elapsed = 0;
    clock = Math.ceil(clock / REP_SECONDS) * REP_SECONDS;
  }

  render();
  schedule();
}

function seek(time, run = false) {
  elapsed = Math.min(CYCLE_SECONDS, Math.max(0, time));
  clock = elapsed;
  playing = run;
  last = 0;
  cancelAnimationFrame(raf);
  raf = 0;
  render();
  schedule();
}

function evidence() {
  playing = false;
  cancelAnimationFrame(raf);
  raf = 0;

  if (parent === window) {
    location.assign('/');
    return;
  }

  parent.postMessage({type: 'gtc-demo:enter'}, location.origin);
}

hero.querySelector('[data-gym-action="evidence"]').addEventListener('click', evidence);

new IntersectionObserver(entries => {
  visible = entries[0].isIntersecting;
  if (!visible) {
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  } else {
    schedule();
  }
}, {threshold: .1}).observe(hero);

new MutationObserver(() => {
  active = panel.classList.contains('active');
  if (!active) {
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  } else {
    render();
    schedule();
  }
}).observe(panel, {attributes: true, attributeFilter: ['class']});

document.addEventListener('visibilitychange', () => {
  last = 0;
  if (document.hidden) {
    cancelAnimationFrame(raf);
    raf = 0;
  } else {
    schedule();
  }
});

reduced.addEventListener('change', () => {
  if (reduced.matches) {
    playing = false;
    elapsed = 11;
    clock = 11;
    render();
  }
});

window.gymOpening = {
  seek: time => seek(time),
  getState: () => ({elapsed, clock, skill, playing, active, visible, phase: hero.dataset.phase, scene: scene?.state()}),
  sampleMotion: (time, blend) => {
    scene?.render(time, blend);
    const state = scene?.state();
    render();
    return state;
  }
};

render();
schedule();
