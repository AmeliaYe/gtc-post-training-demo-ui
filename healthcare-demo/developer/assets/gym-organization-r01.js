(() => {
  const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const signed = value => `${value >= 0 ? '+' : ''}${value.toFixed(3)}`;

  function mount(root, group) {
    root.classList.add('gym-organized');
    const press = document.body.classList.contains('press-flavor');
    const arena = root.querySelector('.sim-arena');
    const [gym, optimizer, policy] = arena.children;
    const environment = root.querySelector('#gymNode');
    const verifier = root.querySelector('#verifyNode');
    const update = root.querySelector('#rlNode');
    const stack = root.querySelector('#rolloutStack');
    let selected = group.rollouts[0].id;

    gym.classList.remove('drillable');
    gym.removeAttribute('data-drill');
    gym.removeAttribute('title');
    gym.classList.add('go-gym');
    gym.setAttribute('aria-label', 'NeMo Gym: environment, rollouts and verifier');
    gym.querySelector('.caption').textContent = 'Run the case. Verify the behavior.';
    environment.innerHTML = '<span>Environment</span><strong>Rollout sandbox</strong><p>Simulated patient, clinic tools, independent state.</p>';
    gym.insertBefore(environment, stack);
    const caseLabel = document.createElement('p');
    caseLabel.className = 'go-case-label';
    caseLabel.textContent = 'Migraine medication request / 4 sampled conversations';
    gym.insertBefore(caseLabel, stack);
    gym.append(verifier);
    verifier.innerHTML = `<span>Verifier</span><strong>Behavior verifier</strong>
      <p id="verifierSummary"></p><div class="verifier-evidence" id="verifierEvidence"></div>
      <div class="reward-meter"><div class="reward-fill" id="rewardFill"></div></div>`;

    optimizer.classList.remove('gym-core');
    optimizer.classList.add('go-optimizer');
    optimizer.setAttribute('aria-label', 'NeMo RL: group-relative optimization');
    const heading = document.createElement('div');
    heading.className = 'go-heading';
    heading.innerHTML = '<h2>NeMo RL</h2><p class="caption">Compare attempts. Update the policy.</p>';
    optimizer.prepend(heading);
    const comparison = document.createElement('div');
    comparison.className = 'go-comparison';
    // Advantages are read from the optimizer artifact, not recomputed from rounded rewards.
    const maxAdvantage = Math.max(...group.rollouts.map(row => Math.abs(row.advantage)));
    comparison.innerHTML = `<h3>Four rewards. One group-relative update.</h3>
      <table class="go-group"><thead><tr><th scope="col">Attempt</th><th scope="col">Reward</th><th scope="col">Advantage</th></tr></thead><tbody>
        ${group.rollouts.map(row => `<tr data-advantage-row="${escape(row.id)}" class="${row.advantage >= 0 ? 'positive' : 'negative'}">
          <th scope="row">${press ? escape(row.id) : `<button type="button" data-drill="rollout" data-rollout="${escape(row.id)}" title="Inspect ${escape(row.id)} trace and judging rationale">${escape(row.id)}</button>`}</th>
          <td>${row.reward.toFixed(3)}</td><td><span class="go-advantage-number">${signed(row.advantage)}</span>
          <span class="go-advantage-track" aria-hidden="true"><i style="--magnitude:${Math.abs(row.advantage) / maxAdvantage * 50}%"></i></span></td></tr>`).join('')}
      </tbody></table>
      <p class="go-relative-note">Relative to the group, not a safety verdict.</p>`;
    optimizer.insertBefore(comparison, update);
    update.innerHTML = '<span>Optimizer</span><strong>GRPO policy update</strong><p>Scored trajectories and relative advantages drive the policy gradient.</p>';
    const directions = document.createElement('div');
    directions.className = 'go-directions';
    directions.innerHTML = '<span class="positive">+ Reinforce</span><span class="negative">- Discourage</span>';
    update.append(directions);
    const groupSource = document.createElement('p');
    groupSource.className = 'go-source';
    groupSource.textContent = `Rollout group: September 16 / step ${group.source.step}`;
    optimizer.append(groupSource);

    policy.classList.add('go-policy');
    policy.setAttribute('aria-label', 'Nemotron policy and held-out validation');
    const validation = document.createElement('p');
    validation.className = 'go-validation-label';
    validation.innerHTML = 'Held-out validation <strong id="goPolicyStep">Step 0</strong>';
    policy.insertBefore(validation, root.querySelector('#policyPanel'));
    const policySource = document.createElement('p');
    policySource.className = 'go-source';
    policySource.textContent = 'Checkpoint metrics: separate September 19 run';
    policy.append(policySource);
    const loop = document.createElement('div');
    loop.className = 'go-loop';
    loop.innerHTML = '<img src="assets/beyond-request-arrow-right-r01.svg" width="20" height="20" alt=""><span>Updated policy returns to NeMo Gym</span><span class="go-loop-line" aria-hidden="true"></span>';
    arena.after(loop);
    const railPanels = root.querySelectorAll('.copy-rail .rail-panel');
    railPanels[0].querySelector('h3').textContent = 'Practice. Score. Update.';
    railPanels[0].querySelector('p').textContent = 'NeMo Gym runs and verifies the interaction. NeMo RL turns the feedback into a policy update. The updated policy returns for more practice.';
    railPanels[1].querySelector('h3').textContent = 'Recorded evidence';
    railPanels[1].querySelector('p').textContent = 'September 16 rollout group; separate September 19 validation checkpoints. Mechanism replay, not a live training job.';
    root.querySelector('.lede').textContent = 'One starting case, sampled four times with the same policy. NeMo Gym runs and scores the conversations; NeMo RL learns from the differences.';

    for (const node of [environment, verifier, update, policy]) {
      node.title = `Inspect ${node === policy ? 'policy checkpoint' : node.querySelector('strong').textContent}`;
      if (!press) { node.tabIndex = 0; node.setAttribute('role', 'button'); node.setAttribute('aria-label', node.title); }
    }
    root.addEventListener('keydown', event => {
      if (press || !['Enter', ' '].includes(event.key)) return;
      const target = event.target.closest('[data-drill]');
      if (!target || target.tagName === 'BUTTON' || !root.contains(target)) return;
      event.preventDefault();
      target.click();
    });

    function select(id = selected) {
      const row = group.rollouts.find(item => item.id === id) || group.rollouts[0];
      selected = row.id;
      const featured = row.judging.featured_axes.map(axis => [axis, row.judging.rubric[axis]]);
      const primary = [...featured].sort((a, b) => a[1].score - b[1].score)[0];
      root.querySelector('#verifierSummary').textContent = row.behavior.summary;
      const explanation = primary[1].explanation;
      const excerpt = explanation.length > 220 ? `${explanation.slice(0, 220).replace(/\s+\S*$/, '')}...` : explanation;
      root.querySelector('#verifierEvidence').innerHTML = `<div class="go-verifier-reward"><b>${escape(row.id)} / scalar reward</b><strong>${row.reward.toFixed(3)}</strong></div>
        ${featured.map(([axis, result]) => `<div class="verifier-axis-row"><span>${escape(axis.replaceAll('_', ' '))}</span><strong>${Number(result.score).toFixed(1)} / 5</strong></div>`).join('')}
        <p><b>Jury excerpt:</b> ${escape(excerpt)}</p>`;
      root.querySelector('#rewardFill').style.setProperty('--reward', `${row.reward * 100}%`);
      root.querySelectorAll('[data-advantage-row]').forEach(node => {
        const active = node.dataset.advantageRow === selected;
        node.classList.toggle('inspected', active);
        node.querySelector('button')?.setAttribute('aria-pressed', String(active));
      });
      stack.querySelectorAll('[data-rollout]').forEach(node => {
        node.classList.toggle('inspected', node.dataset.rollout === selected);
        node.setAttribute('aria-pressed', String(node.dataset.rollout === selected));
      });
      return selected;
    }

    function rollouts(activeIndex) {
      stack.querySelectorAll('[data-rollout]').forEach(node => {
        const row = group.rollouts.find(item => item.id === node.dataset.rollout);
        const turns = row.trace.filter(event => event.role === 'assistant').length;
        node.querySelector('span').textContent = `${turns} assistant turns`;
        node.title = `Inspect ${row.id}: ${row.behavior.summary}`;
        if (!press) { node.tabIndex = 0; node.setAttribute('role', 'button'); }
      });
      select(activeIndex >= 0 ? group.rollouts[activeIndex].id : selected);
    }

    function phase(id) {
      root.dataset.phase = ({gymNode: 'rollout', verifyNode: 'verify', rlNode: 'optimize'})[id] || 'ready';
      gym.classList.toggle('go-active', id === 'gymNode' || id === 'verifyNode');
      optimizer.classList.toggle('go-active', id === 'rlNode');
      policy.classList.toggle('go-updated', id === 'rlNode');
      loop.classList.toggle('active', id === 'rlNode');
    }

    function checkpoint(step) { root.querySelector('#goPolicyStep').textContent = `Step ${step}`; }
    select();
    return { select, rollouts, phase, checkpoint };
  }
  window.GymOrganization = { mount };
})();
