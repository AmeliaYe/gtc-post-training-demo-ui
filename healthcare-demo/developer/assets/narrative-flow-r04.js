window.NarrativeFlow = (() => {
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const order = ['break-ice','refill-case','why-rl','gym-sim','trace-microscope','score-story','developer-cta'];
  const names = ['Introduction','The Refill Case','Why Post-Train','How to Post-Train','Case Trace','Benchmarks','Get Started'];
  const arrow = '<img src="assets/beyond-request-arrow-right-r01.svg" alt="" width="16" height="16">';
  const cases = {
    'adult-validation-0035': {
      title: 'Both sent the request. Only one asked first.',
      context: 'Refill / safety before submission',
      explanation: 'The medication record was available in both episodes. The difference was whether the assistant asked safety questions and waited for the patient before submitting.',
      before: ['Read record','Submit request'],
      after: ['Read record','Ask safety questions','Patient answers','Submit request'],
      axis: 'clinical_safety', label: 'Safety', other: 'task_completion', otherLabel: 'Task completion',
      rewardTitle: "Don't just reward sending the request. Reward the steps that should come first.",
      rewardGoal: "For this refill, that means asking safety questions and waiting for the patient's answer before submitting for review.",
      refinement: 'The later reply still needs refinement: unsupported turnaround claims and alcohol advice remain.'
    },
    'adult-validation-0021': {
      title: 'Not mentioned is not the same as checked.',
      context: 'Symptoms / asking about warning signs',
      explanation: 'The baseline reasons from warning signs the patient has not reported. The later episode adds targeted questions; the patient then asks for an in-person visit.',
      before: ['No targeted questions','Give home-care advice'],
      after: ['Ask warning-sign questions','Patient requests visit','Book visit'],
      axis: 'triage_quality', label: 'Triage', other: 'clinical_helpfulness', otherLabel: 'Helpfulness',
      rewardTitle: "Don't just reward an answer. Reward the questions that should come first.",
      rewardGoal: 'For these symptoms, that means asking about warning signs before offering reassurance.',
      refinement: 'The later reply still gives advice before answers, and names a clinician the booking tool does not confirm.'
    }
  };

  function mount({story, evidence}) {
    const root = document.querySelector('[data-screen-panel="why-rl"]');
    const go = screen => document.querySelector(`.view-tabs [data-screen="${screen}"]`).click();
    const footer = (previous,next) => `<footer class="nf-footer"><button type="button" class="nf-back" data-narrative-go="${previous}" aria-label="Back to ${names[order.indexOf(previous)]}">${arrow}<span>${names[order.indexOf(previous)]}</span></button><button type="button" class="nf-next" data-narrative-go="${next}">${names[order.indexOf(next)]}${arrow}</button></footer>`;
    function renderWhy() {
      const id = story.getState().caseId;
      const item = cases[id], record = evidence.cases.find(c => c.id === id);
      root.dataset.caseId = id;
      const sequence = side => item[side].map((label,i) => `${i?arrow:''}<span class="nf-action">${escape(label)}</span>`).join('');
      root.innerHTML = `
        <header class="nf-heading"><p class="nf-eyebrow">Nemotron / Why post-train?</p><h1>Train for the steps that completion misses.</h1><p>The gym rewards technique. The agent's feedback must also recognize how the task was completed.</p></header>
        <section class="nf-observation" aria-labelledby="nf-case-title">
          <div class="nf-case-heading"><div><p class="nf-eyebrow">${escape(item.context)}</p><h2 id="nf-case-title">${escape(item.title)}</h2></div><button type="button" class="nf-source" data-narrative-case="${id}">Inspect this case ${arrow}</button></div>
          <div class="nf-evidence-grid"><div class="nf-sequences"><div class="nf-sequence nf-before"><strong>Baseline</strong><div>${sequence('before')}</div></div><div class="nf-sequence nf-after"><strong>GRPO step ${record.step}</strong><div>${sequence('after')}</div></div></div>
          <table class="nf-scores"><caption>Recorded judge means / 5</caption><thead><tr><th>Axis</th><th>Baseline</th><th>Step ${record.step}</th></tr></thead><tbody>${[[item.other,item.otherLabel],[item.axis,item.label]].map(([key,label])=>`<tr><th>${label}</th><td>${record.before.axes[key]}</td><td>${record.after.axes[key]}</td></tr>`).join('')}</tbody></table></div>
          <p class="nf-observed-note">${escape(item.explanation)}</p>
          <p class="nf-caveat">Independent conversations under the same case specification. ${escape(item.refinement)}</p>
        </section>
        <section class="nf-methods" aria-labelledby="nf-methods-title"><div class="nf-section-heading"><h2 id="nf-methods-title">Context helps. Practice changes the model.</h2></div>
          <div class="nf-method-columns"><section class="nf-method-group"><div class="nf-group-heading"><h3>At the moment of a request</h3></div><p>Instructions, patient records and tools help the agent respond. They do not update the model's weights.</p></section>
          <section class="nf-method-group nf-training"><div class="nf-group-heading"><h3>Through post-training</h3></div><p>Examples or feedback update the model. Here, GRPO uses scored practice conversations to reinforce better behavior.</p></section></div>
        </section>
        <section class="nf-bridge"><h2>Ask. Wait. Then act.</h2><p>${escape(item.rewardGoal)}</p></section>
        <details class="nf-evidence-notes"><summary>Evidence notes</summary><p>This comparison does not show that reinforcement learning works better than prompting, retrieval or supervised fine-tuning. Those approaches can also help.</p><p>Introduction illustrates the gym analogy. The Refill Case uses recorded conversations. How to Post-Train illustrates the architecture and opens recorded GRPO evidence; none runs a live training job.</p></details>
        ${footer('refill-case','gym-sim')}`;
    }
    renderWhy();
    order.forEach((screen,index)=>{document.querySelector(`.view-tabs [data-screen="${screen}"] .tab-index`).textContent=String(index+1);});
    for(const screen of ['refill-case','gym-sim','trace-microscope','score-story']) {
      const index=order.indexOf(screen);
      document.querySelector(`[data-screen-panel="${screen}"]`).insertAdjacentHTML('beforeend',footer(order[index-1],order[index+1]));
    }
    document.querySelector('.view-tabs').addEventListener('click',event=>{
      const button=event.target.closest('[data-screen]');
      if(!button)return;
      if(button.dataset.screen==='why-rl')renderWhy();
      button.scrollIntoView({block:'nearest',inline:'nearest'});
    });
    document.addEventListener('click',event=>{
      const button=event.target.closest('[data-narrative-go], [data-narrative-case]');
      if(!button)return;
      if(button.dataset.narrativeCase) {
        go('trace-microscope');
        const index=evidence.cases.findIndex(c=>c.id===button.dataset.narrativeCase);
        document.querySelector(`.ct-cases [data-case="${index}"]`).click();
      } else go(button.dataset.narrativeGo);
      window.scrollTo({top:0,behavior:'instant'});
    });
    const routes={'#introduction':'break-ice','#story':'refill-case','#refill-case':'refill-case','#why-post-train':'why-rl','#how-to-post-train':'gym-sim','#gym-run':'gym-sim','#case-trace':'trace-microscope','#benchmarks':'score-story','#get-started':'developer-cta'};
    document.querySelector('.view-tabs').addEventListener('click',event=>{
      const id=event.target.closest('[data-screen]')?.dataset.screen;
      const hash=Object.keys(routes).find(key=>routes[key]===id&&key!=='#story');
      if(hash)history.replaceState(null,'',hash);
    });
    const followHash=()=>{if(routes[location.hash])go(routes[location.hash]);};
    window.addEventListener('hashchange',followHash);
    followHash();
    return {refresh:renderWhy,order:[...order]};
  }
  return {mount};
})();
