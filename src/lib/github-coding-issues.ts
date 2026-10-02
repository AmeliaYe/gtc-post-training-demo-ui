import "server-only";

import {
  BUNDLED_CODING_ISSUES,
  CODING_ISSUE_BINDINGS,
  CODING_ISSUE_REPOSITORY,
  type CodingIssue,
  type CodingIssueCatalog,
  type CodingIssueFallbackReason,
  type CodingIssueGitHubMetadata,
} from "./coding-issues";

export const GITHUB_CODING_ISSUES_ENDPOINT =
  "https://api.github.com/repos/jdebski-nvidia/agentic-gtc-demo/issues?state=open&labels=demo-fixture&per_page=100" as const;

const GITHUB_API_REPOSITORY_URL =
  "https://api.github.com/repos/jdebski-nvidia/agentic-gtc-demo";
const GITHUB_API_VERSION = "2026-03-10";
const FETCH_TIMEOUT_MS = 2_500;
const RESPONSE_MAX_BYTES = 256 * 1024;
const ISSUE_BODY_MAX_BYTES = 16 * 1024;
const LIVE_CACHE_TTL_MS = 60_000;
const TOKEN_MAX_LENGTH = 4_096;
const TITLE_MAX_LENGTH = 180;
const PROBLEM_MAX_LENGTH = 1_000;
const CRITERION_MAX_LENGTH = 280;
const CRITERIA_MAX_COUNT = 8;

const FIXTURE_NOTE = `> [!NOTE]
> This is an intentionally bounded demo fixture for Nemotron SWE Lab. The GitHub issue is real, but the affected project identity and defect are synthetic. Execution uses only the checked-in, isolated fixture.`;
const EXECUTION_BOUNDARY =
  "GitHub provides source and display metadata only. The server maps this issue to an immutable checked-in scenario; repository paths, commands, prompts, and runner policy are never accepted from issue content.";

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type GitHubCodingIssueOptions = {
  /** Explicit only: callers must not fall back to GITHUB_TOKEN or browser state. */
  token?: string;
  fetchImpl?: FetchLike;
  now?: () => Date;
};

type LiveCache = {
  expiresAtMs: number;
  catalog: CodingIssueCatalog;
};

let liveCache: LiveCache | null = null;
let liveRequest: Promise<CodingIssueCatalog> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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

function isValidToken(value: unknown): value is string {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= TOKEN_MAX_LENGTH &&
    value.trim() === value &&
    !hasUnsafeUnicode(value);
}

function isBoundedSingleLineText(value: unknown, maximum: number): value is string {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= maximum &&
    value.trim() === value &&
    !hasUnsafeUnicode(value);
}

function cloneIssue(issue: CodingIssue): CodingIssue {
  return {
    ...issue,
    labels: [...issue.labels],
    files: [...issue.files],
    acceptanceCriteria: [...issue.acceptanceCriteria],
    display: { ...issue.display },
    capabilities: { ...issue.capabilities },
    github: { ...issue.github, labels: [...issue.github.labels] },
  };
}

function cloneCatalog(catalog: CodingIssueCatalog): CodingIssueCatalog {
  return {
    ...catalog,
    source: { ...catalog.source },
    issues: catalog.issues.map(cloneIssue),
  };
}

function bundledCatalog(
  now: Date,
  fallbackReason: CodingIssueFallbackReason,
): CodingIssueCatalog {
  return {
    schemaVersion: 2,
    kind: "github-issue-list",
    source: {
      kind: "bundled-snapshot",
      repository: CODING_ISSUE_REPOSITORY.slug,
      label: CODING_ISSUE_REPOSITORY.label,
      fallbackReason,
    },
    fetchedAt: now.toISOString(),
    issues: BUNDLED_CODING_ISSUES.map(cloneIssue),
  };
}

function expectedFixtureMapping(issue: CodingIssue): string {
  return `- Scenario: \`${issue.scenarioId}\`
- Fixture ID: \`${issue.id}\`
- Fixture repository identity: \`${issue.repository}\`
- Implementation artifact: \`runner/tasks/${issue.scenarioId}/${issue.files[0]}\`
- Trusted tests: \`runner/tasks/${issue.scenarioId}/${issue.files[1]}\`
- Symbol: \`${issue.symbol}\``;
}

function parseIssueBody(
  value: unknown,
  issue: CodingIssue,
): { problem: string; acceptanceCriteria: string[] } {
  if (
    typeof value !== "string" ||
    new TextEncoder().encode(value).byteLength > ISSUE_BODY_MAX_BYTES
  ) throw new Error("GitHub issue body is invalid");

  const prefix = `${FIXTURE_NOTE}\n\n## Problem\n\n`;
  const criteriaMarker = "\n\n## Acceptance criteria\n\n";
  const suffix = `\n\n## Fixture mapping\n\n${expectedFixtureMapping(issue)}\n\n## Execution boundary\n\n${EXECUTION_BOUNDARY}\n`;
  if (!value.startsWith(prefix) || !value.endsWith(suffix)) {
    throw new Error("GitHub issue body boundary is invalid");
  }

  const presentation = value.slice(prefix.length, value.length - suffix.length);
  const markerIndex = presentation.indexOf(criteriaMarker);
  if (markerIndex < 0 || markerIndex !== presentation.lastIndexOf(criteriaMarker)) {
    throw new Error("GitHub issue presentation sections are invalid");
  }

  const problem = presentation.slice(0, markerIndex);
  if (!isBoundedSingleLineText(problem, PROBLEM_MAX_LENGTH)) {
    throw new Error("GitHub issue problem summary is invalid");
  }

  const criteriaBlock = presentation.slice(markerIndex + criteriaMarker.length);
  const lines = criteriaBlock.split("\n");
  if (lines.length < 1 || lines.length > CRITERIA_MAX_COUNT) {
    throw new Error("GitHub issue acceptance criteria are invalid");
  }

  const acceptanceCriteria = lines.map((line) => {
    const itemPrefix = "- [ ] ";
    if (!line.startsWith(itemPrefix)) {
      throw new Error("GitHub issue acceptance criterion is invalid");
    }
    const criterion = line.slice(itemPrefix.length);
    if (!isBoundedSingleLineText(criterion, CRITERION_MAX_LENGTH)) {
      throw new Error("GitHub issue acceptance criterion is invalid");
    }
    return criterion;
  });
  if (new Set(acceptanceCriteria).size !== acceptanceCriteria.length) {
    throw new Error("GitHub issue acceptance criteria are duplicated");
  }
  return { problem, acceptanceCriteria };
}

async function readBoundedJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    throw new Error("GitHub response media type is invalid");
  }

  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null) {
    const length = Number(declaredLength);
    if (!Number.isSafeInteger(length) || length < 0 || length > RESPONSE_MAX_BYTES) {
      throw new Error("GitHub response size is invalid");
    }
  }
  if (!response.body) throw new Error("GitHub response body is missing");

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > RESPONSE_MAX_BYTES) {
        throw new Error("GitHub response is too large");
      }
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel(error).catch(() => undefined);
    throw error;
  }

  const body = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body)) as unknown;
}

function normalizeLabels(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 20) {
    throw new Error("GitHub issue labels are invalid");
  }
  const labels = value.map((item) => {
    if (!isRecord(item) || !isBoundedSingleLineText(item.name, 50)) {
      throw new Error("GitHub issue label is invalid");
    }
    return item.name;
  });
  if (
    new Set(labels).size !== labels.length ||
    !labels.includes(CODING_ISSUE_REPOSITORY.label)
  ) throw new Error("GitHub issue label set is invalid");
  return labels;
}

function normalizeLiveIssue(value: unknown, expected: CodingIssue): CodingIssue {
  if (!isRecord(value) || "pull_request" in value) {
    throw new Error("GitHub catalog contains a non-issue item");
  }
  const binding = CODING_ISSUE_BINDINGS.find((item) => item.id === expected.id);
  if (!binding) throw new Error("Coding issue binding is missing");
  if (
    value.number !== binding.githubNumber ||
    value.html_url !== binding.githubUrl ||
    value.repository_url !== GITHUB_API_REPOSITORY_URL ||
    value.state !== "open" ||
    !isBoundedSingleLineText(value.title, TITLE_MAX_LENGTH)
  ) throw new Error("GitHub issue does not match its immutable binding");

  const presentation = parseIssueBody(value.body, expected);
  const labels = normalizeLabels(value.labels);
  if (!isRecord(value.user) || typeof value.user.login !== "string") {
    throw new Error("GitHub issue author is invalid");
  }
  const author = value.user.login;
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(author)) {
    throw new Error("GitHub issue author is invalid");
  }
  if (
    typeof value.updated_at !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value.updated_at) ||
    Number.isNaN(Date.parse(value.updated_at)) ||
    !Number.isSafeInteger(value.comments) ||
    Number(value.comments) < 0
  ) throw new Error("GitHub issue display metadata is invalid");

  const github: CodingIssueGitHubMetadata = {
    repository: CODING_ISSUE_REPOSITORY.slug,
    number: binding.githubNumber,
    url: binding.githubUrl,
    state: "open",
    labels,
    author,
    updatedAt: value.updated_at,
    commentCount: Number(value.comments),
  };

  return {
    ...cloneIssue(expected),
    title: value.title,
    body: presentation.problem,
    acceptanceCriteria: presentation.acceptanceCriteria,
    display: {
      author: github.author,
      updatedAt: github.updatedAt,
      commentCount: github.commentCount,
    },
    github,
  };
}

function normalizeCatalog(value: unknown, now: Date): CodingIssueCatalog {
  if (!Array.isArray(value) || value.length !== CODING_ISSUE_BINDINGS.length) {
    throw new Error("GitHub issue catalog is incomplete");
  }

  const byNumber = new Map<number, unknown>();
  for (const item of value) {
    if (!isRecord(item) || !Number.isSafeInteger(item.number)) {
      throw new Error("GitHub issue number is invalid");
    }
    const number = Number(item.number);
    if (!CODING_ISSUE_BINDINGS.some((binding) => binding.githubNumber === number)) {
      throw new Error("GitHub catalog contains an unallowlisted issue");
    }
    if (byNumber.has(number)) {
      throw new Error("GitHub catalog contains a duplicate issue");
    }
    byNumber.set(number, item);
  }

  const issues = BUNDLED_CODING_ISSUES.map((issue) => {
    const item = byNumber.get(issue.github.number);
    if (!item) throw new Error("GitHub catalog is missing an allowlisted issue");
    return normalizeLiveIssue(item, issue);
  });

  return {
    schemaVersion: 2,
    kind: "github-issue-list",
    source: {
      kind: "github-api",
      repository: CODING_ISSUE_REPOSITORY.slug,
      label: CODING_ISSUE_REPOSITORY.label,
      fallbackReason: null,
    },
    fetchedAt: now.toISOString(),
    issues,
  };
}

async function fetchLiveCatalog(
  token: string,
  fetchImpl: FetchLike,
  now: () => Date,
): Promise<CodingIssueCatalog> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetchImpl(GITHUB_CODING_ISSUES_ENDPOINT, {
      method: "GET",
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "user-agent": "gtc-post-training-demo-ui",
        "x-github-api-version": GITHUB_API_VERSION,
      },
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });
    if (response.status !== 200) throw new Error("GitHub request failed");
    return normalizeCatalog(await readBoundedJson(response), now());
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Returns the allowlisted read-only issue catalog. Live GitHub failures deliberately
 * degrade to a visibly identified bundled snapshot so the booth UI remains usable.
 */
export async function getCodingIssueCatalog(
  options: GitHubCodingIssueOptions = {},
): Promise<CodingIssueCatalog> {
  const now = options.now ?? (() => new Date());
  const token = options.token;
  if (!isValidToken(token)) {
    return bundledCatalog(now(), "token-unavailable");
  }

  const nowMs = now().getTime();
  if (liveCache && Number.isFinite(nowMs) && liveCache.expiresAtMs > nowMs) {
    return cloneCatalog(liveCache.catalog);
  }
  if (liveRequest) return cloneCatalog(await liveRequest);

  const fetchImpl = options.fetchImpl ?? fetch;
  liveRequest = (async () => {
    try {
      const catalog = await fetchLiveCatalog(token, fetchImpl, now);
      const cachedAt = now().getTime();
      if (Number.isFinite(cachedAt)) {
        liveCache = {
          expiresAtMs: cachedAt + LIVE_CACHE_TTL_MS,
          catalog: cloneCatalog(catalog),
        };
      }
      return catalog;
    } catch {
      return bundledCatalog(now(), "github-unavailable");
    } finally {
      liveRequest = null;
    }
  })();
  return cloneCatalog(await liveRequest);
}

export function resetCodingIssueCatalogCacheForTests(): void {
  liveCache = null;
  liveRequest = null;
}
