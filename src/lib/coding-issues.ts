export const CODING_SCENARIO_IDS = [
  "asyncio-gather-cancel-v1",
  "oauth-proxy-callback-v1",
  "cuda-capability-dedupe-v1",
] as const;

export type CodingScenarioId = (typeof CODING_SCENARIO_IDS)[number];

export const CODING_ISSUE_IDS = ["DEMO-1842", "DEMO-1911", "DEMO-2048"] as const;
export type CodingIssueId = (typeof CODING_ISSUE_IDS)[number];

export const CODING_ISSUE_REPOSITORY = {
  slug: "jdebski-nvidia/agentic-gtc-demo",
  url: "https://github.com/jdebski-nvidia/agentic-gtc-demo",
  label: "demo-fixture",
} as const;

export type CodingIssueFallbackReason =
  | "token-unavailable"
  | "github-unavailable";

export type CodingIssueGitHubMetadata = {
  repository: typeof CODING_ISSUE_REPOSITORY.slug;
  number: number;
  url: string;
  state: "open";
  labels: readonly string[];
  author: string;
  updatedAt: string;
  commentCount: number;
};

export type CodingIssue = {
  id: CodingIssueId;
  /** Stable synthetic issue number used by the isolated fixture. */
  number: number;
  scenarioId: CodingScenarioId;
  state: "open";
  title: string;
  /** Synthetic repository identity used inside the isolated runner. */
  repository: string;
  labels: readonly string[];
  files: readonly string[];
  symbol: string;
  body: string;
  acceptanceCriteria: readonly string[];
  display: {
    author: string;
    updatedAt: string;
    commentCount: number;
  };
  capabilities: {
    realComparison: true;
    simulation: true;
  };
  /** Read-only presentation provenance. It never configures execution. */
  github: CodingIssueGitHubMetadata;
};

export type CodingIssueCatalog = {
  schemaVersion: 2;
  kind: "github-issue-list";
  source: {
    kind: "github-api" | "bundled-snapshot";
    repository: typeof CODING_ISSUE_REPOSITORY.slug;
    label: typeof CODING_ISSUE_REPOSITORY.label;
    fallbackReason: CodingIssueFallbackReason | null;
  };
  fetchedAt: string;
  issues: readonly CodingIssue[];
};

export const CODING_ISSUE_BINDINGS = [
  {
    id: "DEMO-1842",
    scenarioId: "asyncio-gather-cancel-v1",
    githubNumber: 16,
    githubUrl: `${CODING_ISSUE_REPOSITORY.url}/issues/16`,
  },
  {
    id: "DEMO-1911",
    scenarioId: "oauth-proxy-callback-v1",
    githubNumber: 17,
    githubUrl: `${CODING_ISSUE_REPOSITORY.url}/issues/17`,
  },
  {
    id: "DEMO-2048",
    scenarioId: "cuda-capability-dedupe-v1",
    githubNumber: 18,
    githubUrl: `${CODING_ISSUE_REPOSITORY.url}/issues/18`,
  },
] as const satisfies readonly {
  id: CodingIssueId;
  scenarioId: CodingScenarioId;
  githubNumber: number;
  githubUrl: string;
}[];

export const BUNDLED_CODING_ISSUES = [
  {
    id: "DEMO-1842",
    number: 1842,
    scenarioId: "asyncio-gather-cancel-v1",
    state: "open",
    title: "Stabilize asyncio cancellation propagation",
    repository: "acme/py-runtime",
    labels: ["asyncio", "correctness", "mock"],
    files: ["src/py_runtime/task_group.py", "tests/test_task_group.py"],
    symbol: "wait_for_children",
    body: "Parent cancellation can be swallowed while child cleanup runs, leaving callers waiting on a task group that should unwind.",
    acceptanceCriteria: [
      "Propagate cancellation after every child task has been cancelled and awaited.",
      "Preserve the existing aggregation behavior for non-cancellation child failures.",
    ],
    display: {
      author: "jdebski-nvidia",
      updatedAt: "2026-09-23T14:16:46Z",
      commentCount: 0,
    },
    capabilities: { realComparison: true, simulation: true },
    github: {
      repository: "jdebski-nvidia/agentic-gtc-demo",
      number: 16,
      url: "https://github.com/jdebski-nvidia/agentic-gtc-demo/issues/16",
      state: "open",
      labels: ["bug", "demo-fixture", "correctness", "asyncio"],
      author: "jdebski-nvidia",
      updatedAt: "2026-09-23T14:16:46Z",
      commentCount: 0,
    },
  },
  {
    id: "DEMO-1911",
    number: 1911,
    scenarioId: "oauth-proxy-callback-v1",
    state: "open",
    title: "Honor proxy headers in OAuth callback",
    repository: "acme/cloud-console",
    labels: ["oauth", "proxy", "mock"],
    files: ["src/cloud_console/auth/oauth.py", "tests/test_proxy_auth.py"],
    symbol: "build_callback_url",
    body: "OAuth redirects use the internal scheme and host behind a trusted reverse proxy, producing callback URLs that the identity provider rejects.",
    acceptanceCriteria: [
      "Use forwarded scheme and host only when the request came through a configured trusted proxy.",
      "Ignore spoofed forwarded headers from untrusted clients.",
    ],
    display: {
      author: "jdebski-nvidia",
      updatedAt: "2026-09-23T14:17:15Z",
      commentCount: 0,
    },
    capabilities: { realComparison: true, simulation: true },
    github: {
      repository: "jdebski-nvidia/agentic-gtc-demo",
      number: 17,
      url: "https://github.com/jdebski-nvidia/agentic-gtc-demo/issues/17",
      state: "open",
      labels: ["bug", "demo-fixture", "proxy", "oauth"],
      author: "jdebski-nvidia",
      updatedAt: "2026-09-23T14:17:15Z",
      commentCount: 0,
    },
  },
  {
    id: "DEMO-2048",
    number: 2048,
    scenarioId: "cuda-capability-dedupe-v1",
    state: "open",
    title: "Deduplicate CUDA capability probes",
    repository: "acme/accelerator-kit",
    labels: ["cuda", "performance", "mock"],
    files: ["src/accelerator_kit/capabilities.py", "tests/test_capabilities.py"],
    symbol: "get_capabilities",
    body: "Concurrent initialization paths launch duplicate CUDA capability probes for the same device, adding latency and unnecessary driver traffic.",
    acceptanceCriteria: [
      "Coalesce concurrent capability requests into one in-flight probe per CUDA device.",
      "Retry failed or cancelled probes, but retain a successful result when waiter cancellation races with delivery.",
    ],
    display: {
      author: "jdebski-nvidia",
      updatedAt: "2026-09-23T14:17:27Z",
      commentCount: 0,
    },
    capabilities: { realComparison: true, simulation: true },
    github: {
      repository: "jdebski-nvidia/agentic-gtc-demo",
      number: 18,
      url: "https://github.com/jdebski-nvidia/agentic-gtc-demo/issues/18",
      state: "open",
      labels: ["bug", "demo-fixture", "performance", "cuda"],
      author: "jdebski-nvidia",
      updatedAt: "2026-09-23T14:17:27Z",
      commentCount: 0,
    },
  },
] as const satisfies readonly CodingIssue[];

export const DEFAULT_CODING_ISSUE: CodingIssue = BUNDLED_CODING_ISSUES[0];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

function isIsoDateTime(value: unknown): value is string {
  return typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) &&
    !Number.isNaN(Date.parse(value));
}

const UNICODE_FORMAT_CHARACTER = /\p{Cf}/u;

function hasUnsafeUnicode(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint < 32 ||
      (codePoint >= 127 && codePoint <= 159) ||
      codePoint === 0x2028 ||
      codePoint === 0x2029 ||
      UNICODE_FORMAT_CHARACTER.test(character);
  });
}

function isBoundedSingleLineText(value: unknown, maximumLength: number): value is string {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= maximumLength &&
    value.trim() === value &&
    !hasUnsafeUnicode(value);
}

function isAcceptanceCriteria(value: unknown): value is readonly string[] {
  return Array.isArray(value) &&
    value.length > 0 &&
    value.length <= 8 &&
    value.every((item) => isBoundedSingleLineText(item, 280)) &&
    new Set(value).size === value.length;
}

function isLiveGitHubLabels(value: unknown): value is readonly string[] {
  return Array.isArray(value) &&
    value.length > 0 &&
    value.length <= 20 &&
    value.every((label) => isBoundedSingleLineText(label, 50)) &&
    new Set(value).size === value.length &&
    value.includes(CODING_ISSUE_REPOSITORY.label);
}

function githubMetadataMatches(
  value: unknown,
  expected: CodingIssue,
  allowLiveMetadata: boolean,
): value is CodingIssueGitHubMetadata {
  if (!isRecord(value) || !hasExactKeys(value, [
    "repository",
    "number",
    "url",
    "state",
    "labels",
    "author",
    "updatedAt",
    "commentCount",
  ])) return false;

  return value.repository === expected.github.repository &&
    value.number === expected.github.number &&
    value.url === expected.github.url &&
    value.state === "open" &&
    (allowLiveMetadata
      ? isLiveGitHubLabels(value.labels)
      : JSON.stringify(value.labels) === JSON.stringify(expected.github.labels)) &&
    typeof value.author === "string" &&
    /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(value.author) &&
    isIsoDateTime(value.updatedAt) &&
    Number.isSafeInteger(value.commentCount) &&
    Number(value.commentCount) >= 0;
}

function issueMatches(
  value: unknown,
  expected: CodingIssue,
  allowLivePresentation: boolean,
): value is CodingIssue {
  if (!isRecord(value) || !hasExactKeys(value, [
    "id",
    "number",
    "scenarioId",
    "state",
    "title",
    "repository",
    "labels",
    "files",
    "symbol",
    "body",
    "acceptanceCriteria",
    "display",
    "capabilities",
    "github",
  ])) return false;

  if (
    value.id !== expected.id ||
    value.number !== expected.number ||
    value.scenarioId !== expected.scenarioId ||
    value.state !== "open" ||
    value.repository !== expected.repository ||
    JSON.stringify(value.labels) !== JSON.stringify(expected.labels) ||
    JSON.stringify(value.files) !== JSON.stringify(expected.files) ||
    value.symbol !== expected.symbol ||
    !isRecord(value.capabilities) ||
    !hasExactKeys(value.capabilities, ["realComparison", "simulation"]) ||
    value.capabilities.realComparison !== true ||
    value.capabilities.simulation !== true ||
    !isRecord(value.display) ||
    !hasExactKeys(value.display, ["author", "updatedAt", "commentCount"]) ||
    !githubMetadataMatches(value.github, expected, allowLivePresentation)
  ) return false;

  const presentationMatches = allowLivePresentation
    ? isBoundedSingleLineText(value.title, 180) &&
      isBoundedSingleLineText(value.body, 1_000) &&
      isAcceptanceCriteria(value.acceptanceCriteria)
    : value.title === expected.title &&
      value.body === expected.body &&
      JSON.stringify(value.acceptanceCriteria) === JSON.stringify(expected.acceptanceCriteria);

  return presentationMatches &&
    value.display.author === value.github.author &&
    value.display.updatedAt === value.github.updatedAt &&
    value.display.commentCount === value.github.commentCount;
}

/** Strictly validates the browser-visible catalog before the UI consumes it. */
export function isCodingIssueCatalog(value: unknown): value is CodingIssueCatalog {
  if (!isRecord(value) || !hasExactKeys(value, [
    "schemaVersion",
    "kind",
    "source",
    "fetchedAt",
    "issues",
  ])) return false;

  if (
    value.schemaVersion !== 2 ||
    value.kind !== "github-issue-list" ||
    !isRecord(value.source) ||
    !hasExactKeys(value.source, ["kind", "repository", "label", "fallbackReason"]) ||
    value.source.repository !== CODING_ISSUE_REPOSITORY.slug ||
    value.source.label !== CODING_ISSUE_REPOSITORY.label ||
    !isIsoDateTime(value.fetchedAt) ||
    !Array.isArray(value.issues) ||
    value.issues.length !== BUNDLED_CODING_ISSUES.length
  ) return false;

  const live = value.source.kind === "github-api" &&
    value.source.fallbackReason === null;
  const bundled = value.source.kind === "bundled-snapshot" &&
    ["token-unavailable", "github-unavailable"].includes(
      String(value.source.fallbackReason),
    );
  if (!live && !bundled) return false;

  if (!value.issues.every((issue, index) =>
    issueMatches(issue, BUNDLED_CODING_ISSUES[index], live)
  )) return false;

  return !bundled ||
    JSON.stringify(value.issues) === JSON.stringify(BUNDLED_CODING_ISSUES);
}

export function parseCodingIssueCatalog(value: unknown): CodingIssueCatalog {
  if (!isCodingIssueCatalog(value)) {
    throw new Error("Coding issue catalog response is invalid");
  }
  return value;
}
