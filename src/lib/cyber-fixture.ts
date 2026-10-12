export type CyberFinding = {
  title: string;
  path: string | null;
  count: number;
  referenceMatch: 'matched' | 'not-matched' | 'unassessed';
};

export type CyberRun = {
  findingsCount: number;
  matchedCount: number;
  referenceTotal: number;
  findings: CyberFinding[];
};

export type CyberScenario = {
  id: 'openfire' | 'set-value' | 'cosmos';
  title: string;
  repo: string;
  url: string;
  cve: string;
  focus: 'recall' | 'focus';
  summary: string;
  reference: { title: string; path: string };
  before: CyberRun;
  after: CyberRun;
};

// October 2026 periodic evaluation, policy steps 5 and 200, attempt 1 of 4.
// Findings are condensed editorial summaries of recorded reports.
// Counts come from the verifier; unassessed reports are not false positives.
export const CYBER_SCENARIOS: CyberScenario[] = [
  {
    id: 'openfire',
    title: 'Unsafe web request (SSRF): missed → found',
    repo: 'igniterealtime/Openfire',
    url: 'https://github.com/igniterealtime/Openfire/tree/83f653f8d0601ff3667e1c5cf3ac18834f0d4a24',
    cve: 'CVE-2019-18394',
    focus: 'recall',
    summary:
      'Both checkpoints read this file. The final checkpoint linked the supplied address to the server’s HTTP request and reported the SSRF.',
    reference: {
      title: 'Server-side request forgery in icon fetching',
      path: 'xmppserver/src/main/java/org/jivesoftware/util/FaviconServlet.java',
    },
    before: {
      findingsCount: 1,
      matchedCount: 0,
      referenceTotal: 1,
      findings: [
        {
          title: 'XML entity expansion',
          path: 'xmppserver/src/main/java/org/jivesoftware/util/XMLProperties.java',
          count: 1,
          referenceMatch: 'not-matched',
        },
      ],
    },
    after: {
      findingsCount: 3,
      matchedCount: 1,
      referenceTotal: 1,
      findings: [
        {
          title: 'Server-side request forgery in icon fetching',
          path: 'xmppserver/src/main/java/org/jivesoftware/util/FaviconServlet.java',
          count: 1,
          referenceMatch: 'matched',
        },
        {
          title: 'Other XML-related findings',
          path: null,
          count: 2,
          referenceMatch: 'not-matched',
        },
      ],
    },
  },
  {
    id: 'set-value',
    title: 'Three reports of one flaw → one report',
    repo: 'jonschlinkert/set-value',
    url: 'https://github.com/jonschlinkert/set-value/tree/7bd5011d82e583305a191a9a062abfe177ec29ad',
    cve: 'CVE-2019-10747',
    focus: 'focus',
    summary:
      'The earlier checkpoint submitted six reports, including three for the same prototype-pollution flaw. The final checkpoint reported that flaw once.',
    reference: {
      title: 'Prototype pollution in nested property assignment',
      path: 'index.js',
    },
    before: {
      findingsCount: 6,
      matchedCount: 1,
      referenceTotal: 1,
      findings: [
        {
          title: 'Prototype-pollution variants',
          path: 'index.js',
          count: 3,
          referenceMatch: 'matched',
        },
        {
          title: 'Additional submitted findings',
          path: null,
          count: 3,
          referenceMatch: 'unassessed',
        },
      ],
    },
    after: {
      findingsCount: 1,
      matchedCount: 1,
      referenceTotal: 1,
      findings: [
        {
          title: 'Prototype pollution in nested property assignment',
          path: 'index.js',
          count: 1,
          referenceMatch: 'matched',
        },
      ],
    },
  },
  {
    id: 'cosmos',
    title: 'Text executed as code: missed → found',
    repo: 'OpenC3/cosmos',
    url: 'https://github.com/OpenC3/cosmos/tree/24ca2102180a28d9bb83a7251497865b50e0cc55',
    cve: 'CVE-2025-68271',
    focus: 'recall',
    summary:
      'Both checkpoints read the conversion code. The final checkpoint found that list-like text could execute Ruby code; the earlier checkpoint missed it.',
    reference: {
      title: 'Unsafe string evaluation in value conversion',
      path: 'openc3/lib/openc3/core_ext/string.rb',
    },
    before: {
      findingsCount: 4,
      matchedCount: 0,
      referenceTotal: 1,
      findings: [
        {
          title: 'Other data-handling and Windows findings',
          path: null,
          count: 4,
          referenceMatch: 'not-matched',
        },
      ],
    },
    after: {
      findingsCount: 4,
      matchedCount: 1,
      referenceTotal: 1,
      findings: [
        {
          title: 'Unsafe string evaluation in value conversion',
          path: 'openc3/lib/openc3/core_ext/string.rb',
          count: 1,
          referenceMatch: 'matched',
        },
        {
          title: 'Additional submitted findings',
          path: null,
          count: 3,
          referenceMatch: 'unassessed',
        },
      ],
    },
  },
];

// dfbench run comparison supplied by the user on October 2, 2026.
// The step-180 benchmark result is separate from the selected step-200 trajectories.
export const DFBENCH_RESULT = {
  before: { model: 'nemotron35-lightning-fireworks-fp4', recall: 16.8 },
  after: { model: 'nemotron35-lightning-step180', recall: 26.5 },
};
