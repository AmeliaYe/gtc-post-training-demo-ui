import {mountArchitecture} from './architecture-flow-r02.js';
const icon = name => `<img src="assets/beyond-request-${name}-r01.svg" width="18" height="18" alt="">`;
const details = (label, className = '') => {
  const element = document.createElement('details');
  element.className = `ef-details ${className}`;
  const summary = document.createElement('summary');
  summary.textContent = label;
  element.append(summary);
  return element;
};

document.body.classList.add('executive-feedback');
const opening = document.querySelector('.gym-opening');
opening.querySelector('.go-heading h1').textContent = 'AI Safety Starts with Model Specialization';
opening.querySelector('.go-premise').textContent = 'Give AI a place to practice and receive feedback.';
opening.querySelector('.ef-case-bridge').remove();
opening.querySelector('.go-controls').after(opening.querySelector('.ef-stack'));
opening.querySelector('.go-caption .go-evidence').innerHTML = `The Refill Case ${icon('arrow-right')}`;
const story = document.getElementById('storyReward');
story.querySelector('.sr-heading h1').textContent = 'Reward diligence in healthcare workflows';
story.querySelector('.sr-feedback-heading').innerHTML = '<span>Recorded behavior</span><span class="sr-sim-label">Before / after</span>';
const experiment = details('Explore rewards', 'ef-rewards');
story.querySelector('.sr-stage').after(experiment);
for (const selector of ['.sr-console', '.sr-lineup-head', '.sr-lineup', '.sr-lineup-caption', '.sr-playback', '.sr-disclosure']) {
  experiment.append(story.querySelector(selector));
}
experiment.addEventListener('toggle', () => {
  story.dataset.rewards = String(experiment.open);
  if (!experiment.open) {
    window.storyReward.stop();
    if (story.closest('[data-screen-panel]').classList.contains('active')) window.storyReward.start();
  }
});
const provenance = document.createElement('p');
provenance.className = 'ef-provenance';
provenance.textContent = 'Recorded simulations. Same case specification, independent conversations. Requests sent for clinician review, not prescriptions approved or dispensed.';
story.querySelector('.sr-stage').after(provenance);

const gym = document.querySelector('[data-screen-panel="gym-sim"]');
gym.querySelector('.copy-rail h1').textContent = 'Practice. Score. Update.';
const group = document.createElement('p');
group.className = 'ef-group-summary';
group.innerHTML = '<strong>1 starting case</strong><span>4 sampled attempts</span><span>1 group-relative update</span>';
gym.querySelector('.sim-arena').before(group);
if (document.body.classList.contains('press-flavor')) {
  const judging = details('Why this reward?');
  judging.addEventListener('click', event => event.stopPropagation());
  gym.querySelector('#verifierEvidence').before(judging);
  judging.append(gym.querySelector('#verifierEvidence'));
  gym.querySelector('.go-group thead th:last-child').textContent = 'Relative feedback';
  gym.querySelectorAll('.go-group tbody tr').forEach(row => {
    const label = document.createElement('span');
    label.className = 'ef-relative-label';
    label.textContent = row.classList.contains('positive') ? 'Above group' : 'Below group';
    row.querySelector('td:last-child').prepend(label);
  });
}
const policy = gym.querySelector('.go-policy');
const outcome = document.createElement('div');
outcome.className = 'ef-policy-outcome';
outcome.innerHTML = `<span>What learns?</span><h3>The assistant policy.</h3><p>NeMo RL updates Nemotron's weights from the scored conversations.</p><p>The simulated patient policy and environment stay fixed.</p>`;
policy.querySelector('.caption').after(outcome);
const validation = details('Separate checkpoint evaluation', 'ef-validation');
for (const selector of ['.go-validation-label', '#policyPanel', '#signalLog', '.go-source']) validation.append(policy.querySelector(selector));
validation.append(gym.querySelector('.sim-footer'));
validation.append(gym.querySelector('.copy-rail .metrics'));
// Keep evaluation separate from this recorded training group, including during autoplay.
validation.addEventListener('click', event => event.stopPropagation());
policy.append(validation);
const architecture = details('Workflow architecture', 'ef-architecture');
architecture.innerHTML += '<figure><img src="assets/healthcare-architecture-r03.png" alt="Codex and Agent Skills develop the workflow. Hermes connects the trainable Nemotron assistant to healthcare tasks, clinical tools and a fixed simulated patient in NeMo Gym. Verifier rewards feed NeMo RL GRPO updates back to the assistant policy."><figcaption>Workflow design. Recorded training and validation artifacts below come from separate runs.</figcaption></figure>';
gym.querySelector('.stage').after(architecture);
for (const [id, label, title] of [
  ['runRoundButton', 'Replay group', 'Replay the recorded rollout, scoring and update sequence'],
  ['trainStepButton', 'Replay update', 'Illustrate a policy update using recorded group feedback'],
  ['resetSimButton', '', 'Reset the recorded replay']
]) {
  const button = document.getElementById(id);
  button.innerHTML = id === 'resetSimButton' ? icon('rotate-ccw') : label;
  button.title = title;
  button.setAttribute('aria-label', title);
}

const benchmark = document.querySelector('[data-screen-panel="score-story"]');
const benchmarkDetails = details('Evaluation setup and rubric', 'ef-benchmark-details');
const primer = benchmark.querySelector('.pab-primer');
if (primer) { primer.before(benchmarkDetails); benchmarkDetails.append(primer); }
const benchmarkContext = document.createElement('div');
benchmarkContext.className = 'ef-benchmark-context';
for (const node of benchmark.querySelectorAll('.copy-rail>.rail-panel, .copy-rail>.metrics')) benchmarkContext.append(node);
benchmarkDetails.append(benchmarkContext);
benchmark.querySelector('.copy-rail h1').textContent = 'Measure gains. Keep regressions visible.';
benchmark.querySelector('.copy-rail .lede').textContent = '97 validation cases kept out of training. Baseline versus selected step 25. The refill example uses step 75; it is not the aggregate checkpoint.';

const cta = document.querySelector('[data-screen-panel="developer-cta"]');
cta.querySelector('.gs-heading h1').textContent = "Here's what you just saw, why it matters, and where you can go next.";
cta.querySelector('.gs-heading p').textContent = "A refill request submitted after safety questions and patient answers. Feedback rewards the required steps. Next, adapt the workflow to your tasks.";
const start = document.createElement('section');
start.className = 'ef-start';
const destination = 'https://docs.nvidia.com/nemo/rl/latest/design-docs/nemo-gym-integration.html';
start.innerHTML = `<a class="ef-qr" href="${destination}" target="_blank" rel="noopener noreferrer"><img src="assets/gym-rl-start-qr.png" alt="QR code: official NeMo Gym and NeMo RL integration guide" width="140" height="140"></a><div><p>Start with the workflow</p><h2>Connect your environment to NeMo RL.</h2><p>Bring your tasks, tools and verifier into the training loop.</p><a href="${destination}" target="_blank" rel="noopener noreferrer">Open the NeMo Gym + RL guide ${icon('arrow-right')}</a></div>`;
cta.querySelector('.gs-heading').after(start);
const recipe = cta.querySelector('a[href*="guides/nemotron-3-nano"]');
recipe.firstChild.textContent = 'Nemotron 3 Nano reference recipe ';
const setup = details('Setup smoke test');
const command = cta.querySelector('.gs-recipe');
const trainingSummary = document.createElement('div');
trainingSummary.className = 'gs-visual ef-training-summary';
trainingSummary.innerHTML = '<div><span>01</span><strong>Practice</strong><small>Tasks + tools in NeMo Gym</small></div><div><span>02</span><strong>Score</strong><small>Your verifier, your criteria</small></div><div><span>03</span><strong>Update</strong><small>GRPO in NeMo RL</small></div>';
command.before(trainingSummary);
cta.querySelector('.gs-training .gs-links').after(setup);
setup.append(command);
cta.querySelector('.gs-training .gs-caption').textContent = 'The reference recipe targets Nemotron 3 Nano on multiple nodes. Adapt model, data and compute; this is not the exact Lightning healthcare run.';
mountArchitecture(gym);
gym.querySelector('.af-heading h1').textContent = 'Run and evaluate a reinforcement-learning loop';
document.documentElement.dataset.feedbackReady = 'true';
