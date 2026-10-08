import type { CyberScenario } from './cyber-fixture';

export type CyberAttackNode = {
  id: string;
  label: string;
  detail: string;
  icon: 'person' | 'server' | 'globe' | 'lock' | 'code' | 'data';
  x: number;
  y: number;
};

export type CyberAttackStage = {
  label: string;
  title: string;
  description: string;
  badge: string;
  activeEdges: string[];
  activeNodes: string[];
  mobilePath: string[];
  source: { code: number[]; nodeIds: string[]; note?: string };
};

export type CyberAttack = {
  context: string;
  title: string;
  term: string;
  termExplanation: string;
  caveat: string;
  nodes: CyberAttackNode[];
  edges: { id: string; path: string }[];
  stages: CyberAttackStage[];
  training: {
    before: string;
    after: string;
    takeaway: string;
  };
};

// Illustrations follow the source revisions linked in cyber-visuals.ts.
// They explain possible behavior, not additional observed attacks or tool calls.
export const CYBER_ATTACKS: Record<CyberScenario['id'], CyberAttack> = {
  openfire: {
    context: 'Openfire is a messaging server. One of its features fetches website icons for users.',
    title: 'An icon request can reach a private service',
    term: 'Server-side request forgery (SSRF)',
    termExplanation: 'Someone makes a server send a request to a destination they choose, using the server’s network access.',
    caveat: 'Illustrative network: access depends on the server’s deployment. The recorded evaluation identified the flaw; it did not demonstrate customer data being exposed.',
    nodes: [
      { id: 'requester', label: 'Requester', detail: 'Supplies a website address', icon: 'person', x: 125, y: 190 },
      { id: 'server', label: 'Openfire server', detail: 'Fetches the website icon', icon: 'server', x: 450, y: 190 },
      { id: 'public', label: 'Public website', detail: 'The expected destination', icon: 'globe', x: 825, y: 85 },
      { id: 'private', label: 'Internal service', detail: 'May be reachable by the server', icon: 'lock', x: 825, y: 290 },
    ],
    edges: [
      { id: 'request', path: 'M225 190 H350' },
      { id: 'public-fetch', path: 'M550 170 C625 170 625 85 725 85' },
      { id: 'private-fetch', path: 'M550 215 C625 215 625 290 725 290' },
      { id: 'private-response', path: 'M725 320 C635 375 575 315 500 250' },
      { id: 'relay-response', path: 'M400 250 C355 305 270 275 225 220' },
    ],
    stages: [
      {
        label: 'Normal request',
        title: 'A user asks for a website icon',
        description: 'The user provides a public website address. Openfire sends a request to fetch that website’s icon.',
        badge: 'Normal use',
        activeEdges: ['request', 'public-fetch'],
        activeNodes: ['requester', 'server', 'public'],
        mobilePath: ['requester', 'server', 'public'],
        source: { code: [0, 1, 2], nodeIds: ['server'] },
      },
      {
        label: 'Changed address',
        title: 'An attacker supplies an internal address',
        description: 'The attacker replaces the public website address with the address of a service inside the server’s network.',
        badge: 'Crafted input',
        activeEdges: ['request'],
        activeNodes: ['requester', 'server'],
        mobilePath: ['requester', 'server'],
        source: { code: [0], nodeIds: ['server'] },
      },
      {
        label: 'Private request',
        title: 'The server sends the request inside',
        description: 'Openfire does not check whether this destination should be allowed. It can contact an internal service using its own network access.',
        badge: 'Unsafe behavior',
        activeEdges: ['request', 'private-fetch'],
        activeNodes: ['requester', 'server', 'private'],
        mobilePath: ['requester', 'server', 'private'],
        source: { code: [1, 2], nodeIds: ['server'] },
      },
      {
        label: 'Possible exposure',
        title: 'A private response can be sent back',
        description: 'If the internal service is reachable and returns a successful response, Openfire can send its contents back as though they were the requested icon.',
        badge: 'Possible impact',
        activeEdges: ['private-response', 'relay-response'],
        activeNodes: ['private', 'server', 'requester'],
        mobilePath: ['private', 'server', 'requester'],
        source: {
          code: [2],
          nodeIds: ['server'],
          note: 'The excerpt returns successful response bytes. The diagram shows a possible relay, with no demonstrated data exposure.',
        },
      },
    ],
    training: {
      before: 'Recognized potential SSRF but omitted it from the report; submitted one XML-related finding.',
      after: 'Linked the host parameter to the HTTP request and reported SSRF among three total reports.',
      takeaway: 'Both inspected the icon-fetching code. Only the final checkpoint reported the known SSRF.',
    },
  },
  'set-value': {
    context: 'set-value is a JavaScript helper that lets an application update a setting by its name or path.',
    title: 'One setting change can affect other objects',
    term: 'Prototype pollution',
    termExplanation: 'A prototype is an object that other objects inherit properties from. Changing it can affect more than the object the application intended to update.',
    caveat: 'The effect depends on how the application uses inherited properties. This illustration does not establish account access or any other specific application impact.',
    nodes: [
      { id: 'input', label: 'Property + value', detail: 'Tells the helper what to change', icon: 'data', x: 125, y: 190 },
      { id: 'helper', label: 'set-value helper', detail: 'Follows the property path', icon: 'code', x: 450, y: 190 },
      { id: 'objects', label: 'Application objects', detail: 'Settings the application reads', icon: 'data', x: 825, y: 85 },
      { id: 'prototype', label: 'Shared defaults', detail: 'Properties other objects inherit', icon: 'data', x: 825, y: 290 },
    ],
    edges: [
      { id: 'input', path: 'M225 190 H350' },
      { id: 'normal-write', path: 'M550 170 C625 170 625 85 725 85' },
      { id: 'prototype-write', path: 'M550 215 C625 215 625 290 725 290' },
      { id: 'inherit', path: 'M825 235 V140' },
    ],
    stages: [
      {
        label: 'Normal update',
        title: 'The application updates one setting',
        description: 'The application gives the helper a property path and a value. The helper follows that path to update the intended object.',
        badge: 'Normal use',
        activeEdges: ['input', 'normal-write'],
        activeNodes: ['input', 'helper', 'objects'],
        mobilePath: ['input', 'helper', 'objects'],
        source: { code: [0, 1, 2], nodeIds: ['helper'] },
      },
      {
        label: 'Crafted path',
        title: 'A crafted path points beyond that object',
        description: 'When someone can control the property path, they can supply special property names that lead to a shared prototype.',
        badge: 'Crafted input',
        activeEdges: ['input'],
        activeNodes: ['input', 'helper'],
        mobilePath: ['input', 'helper'],
        source: { code: [0, 1], nodeIds: ['helper'] },
      },
      {
        label: 'Shared change',
        title: 'The helper changes a shared property',
        description: 'The helper follows the supplied path without blocking access to the shared prototype, then writes the supplied value there.',
        badge: 'Unsafe behavior',
        activeEdges: ['input', 'prototype-write'],
        activeNodes: ['input', 'helper', 'prototype'],
        mobilePath: ['input', 'helper', 'prototype'],
        source: { code: [1, 2], nodeIds: ['helper'] },
      },
      {
        label: 'Wider effect',
        title: 'Other objects can inherit the change',
        description: 'Objects that inherit this property can pick up the changed value. The application may then behave differently when it reads those objects.',
        badge: 'Possible impact',
        activeEdges: ['inherit'],
        activeNodes: ['prototype', 'objects'],
        mobilePath: ['prototype', 'objects'],
        source: {
          code: [2],
          nodeIds: ['helper'],
          note: 'The excerpt shows the helper’s assignment. Other objects inheriting that value is the possible downstream effect illustrated here.',
        },
      },
    ],
    training: {
      before: 'Inspected the setter and tests; submitted six reports, including three for the same prototype-pollution flaw.',
      after: 'Inspected the same setter and reported prototype pollution once, in one total report.',
      takeaway: 'Both found prototype pollution. The final checkpoint reduced reports of the same flaw from three to one.',
    },
  },
  cosmos: {
    context: 'COSMOS helps operators send commands to equipment. This example follows how command text becomes values.',
    title: 'Text meant as data can run as code',
    term: 'Unsafe code evaluation',
    termExplanation: 'Evaluation runs text as programming instructions. Here, text that looks like a list is passed to Ruby’s eval function.',
    caveat: 'The recorded report identified unsafe evaluation. It did not establish how a remote user could reach this code or what permissions they would need.',
    nodes: [
      { id: 'text', label: 'Command text', detail: 'A value written as text', icon: 'data', x: 125, y: 190 },
      { id: 'converter', label: 'Value converter', detail: 'Tries to recognize the value', icon: 'code', x: 450, y: 190 },
      { id: 'data', label: 'Numbers or lists', detail: 'The expected result', icon: 'data', x: 825, y: 85 },
      { id: 'execution', label: 'Ruby code runs', detail: 'Instructions can execute here', icon: 'code', x: 825, y: 290 },
    ],
    edges: [
      { id: 'input', path: 'M225 190 H350' },
      { id: 'normal-value', path: 'M550 170 C625 170 625 85 725 85' },
      { id: 'execute', path: 'M550 215 C625 215 625 290 725 290' },
    ],
    stages: [
      {
        label: 'Normal value',
        title: 'Command text becomes a usable value',
        description: 'The command parser sends text to a converter. Ordinary numbers and lists become values the software can use.',
        badge: 'Normal use',
        activeEdges: ['input', 'normal-value'],
        activeNodes: ['text', 'converter', 'data'],
        mobilePath: ['text', 'converter', 'data'],
        source: {
          code: [0],
          nodeIds: ['converter'],
          note: 'The parser calls the Value converter here; number and list conversion happen inside that method.',
        },
      },
      {
        label: 'Crafted text',
        title: 'Instructions are placed inside a list',
        description: 'Crafted text contains programming instructions inside square brackets, making it look like an ordinary list.',
        badge: 'Crafted input',
        activeEdges: ['input'],
        activeNodes: ['text', 'converter'],
        mobilePath: ['text', 'converter'],
        source: {
          code: [0],
          nodeIds: ['converter'],
          note: 'The excerpt shows where crafted command text can enter the converter; it does not show a crafted payload.',
        },
      },
      {
        label: 'Weak check',
        title: 'The check only looks for brackets',
        description: 'The converter recognizes the surrounding brackets. It does not check that the contents are safe data before passing them to evaluation.',
        badge: 'Unsafe behavior',
        activeEdges: ['input'],
        activeNodes: ['text', 'converter'],
        mobilePath: ['text', 'converter'],
        source: { code: [1], nodeIds: ['converter'] },
      },
      {
        label: 'Code runs',
        title: 'The contents can run as Ruby code',
        description: 'The converter evaluates the original text. Instructions inside the brackets can run in the process that performs the conversion.',
        badge: 'Possible impact',
        activeEdges: ['execute'],
        activeNodes: ['converter', 'execution'],
        mobilePath: ['converter', 'execution'],
        source: {
          code: [2],
          nodeIds: ['converter'],
          note: 'The eval call runs inside Value converter and produces the illustrated Ruby code runs outcome.',
        },
      },
    ],
    training: {
      before: 'Read the conversion code but missed the Ruby eval flaw; submitted four other reports.',
      after: 'Identified bracket-checked input reaching Ruby eval; one of four reports matched the known flaw.',
      takeaway: 'The final checkpoint recognized the unsafe eval path that the earlier checkpoint missed, with the same total report count.',
    },
  },
};
