export type AgentName =
  | 'Nemotron Planner'
  | 'Shared Coding Model'
  | 'Trusted Test Runner';
export type StageStatus = 'complete' | 'active' | 'queued';

type StageId =
  | 'read'
  | 'scan'
  | 'trace'
  | 'locate'
  | 'patch'
  | 'test'
  | 'repair'
  | 'verify';

type StageBlueprint = {
  id: StageId;
  label: string;
  agent: AgentName;
  startsAt: number;
};

type ScenarioStage = {
  detail: string;
  tool: string;
};

export type DemoStage = {
  id: StageId;
  label: string;
  detail: string;
  tool: string;
  agent: AgentName;
  simulated: true;
  status: StageStatus;
  atSeconds: number;
};

export type ModelRun = {
  id: 'base' | 'trained';
  name: string;
  eyebrow: string;
  status: 'running' | 'complete';
  elapsedSeconds: number;
  totalSeconds: number;
  progress: number;
  toolCalls: number;
  failures: number;
  currentStage: string;
  stages: DemoStage[];
};

const stageFixture: Record<StageId, ScenarioStage> = {
  read: {
    detail: 'Extract the cancellation contract and regression boundary',
    tool: 'mock-github.issue:DEMO-1842',
  },
  scan: {
    detail: 'Map task wrappers, exception branches, and async utilities',
    tool: 'pycharm.search:CancelledError',
  },
  trace: {
    detail: 'Trace cancellation through wait_for_children and its callers',
    tool: 'pycharm.callHierarchy:wait_for_children',
  },
  locate: {
    detail: 'Locate the cancellation boundary directly',
    tool: 'pycharm.findUsages:wait_for_children',
  },
  patch: {
    detail: 'Preserve cancellation across child-task cleanup',
    tool: 'pycharm.patch:src/py_runtime/task_group.py',
  },
  test: {
    detail: 'Run the focused asyncio cancellation regression',
    tool: 'pytest:tests/test_task_group.py',
  },
  repair: {
    detail: 'Narrow the exception branch without swallowing cancellation',
    tool: 'pycharm.patch:except-scope',
  },
  verify: {
    detail: 'Inspect the task-group diff and final focused test result',
    tool: 'pycharm.diff:src/py_runtime/task_group.py',
  },
};

const baseStages: StageBlueprint[] = [
  { id: 'read', label: 'Read issue', agent: 'Nemotron Planner', startsAt: 0 },
  { id: 'scan', label: 'Scan repository', agent: 'Nemotron Planner', startsAt: 4.2 },
  { id: 'trace', label: 'Trace call sites', agent: 'Nemotron Planner', startsAt: 12.4 },
  { id: 'patch', label: 'Implement fix', agent: 'Shared Coding Model', startsAt: 21.3 },
  { id: 'test', label: 'Run test suite', agent: 'Trusted Test Runner', startsAt: 31.2 },
  { id: 'repair', label: 'Repair regression', agent: 'Shared Coding Model', startsAt: 38.8 },
  { id: 'verify', label: 'Validate', agent: 'Trusted Test Runner', startsAt: 46.1 },
];

const trainedStages: StageBlueprint[] = [
  { id: 'read', label: 'Read issue', agent: 'Nemotron Planner', startsAt: 0 },
  { id: 'locate', label: 'Targeted search', agent: 'Nemotron Planner', startsAt: 2.8 },
  { id: 'patch', label: 'Implement fix', agent: 'Shared Coding Model', startsAt: 7.4 },
  { id: 'test', label: 'Focused tests', agent: 'Trusted Test Runner', startsAt: 14.1 },
  { id: 'verify', label: 'Validate', agent: 'Trusted Test Runner', startsAt: 21.4 },
];

export const CODING_BASE_TOTAL_SECONDS = 52;

export function modelState(id: 'base' | 'trained', elapsed: number): ModelRun {
  const isTrained = id === 'trained';
  const blueprints = isTrained ? trainedStages : baseStages;
  const totalSeconds = isTrained ? 27 : CODING_BASE_TOTAL_SECONDS;
  const cappedElapsed = Math.min(totalSeconds, Math.max(0, elapsed));
  const activeIndex = Math.min(
    blueprints.length - 1,
    blueprints.reduce(
      (latest, stage, index) => (elapsed >= stage.startsAt ? index : latest),
      0,
    ),
  );
  const complete = elapsed >= totalSeconds;
  const stages: DemoStage[] = blueprints.map((stage, index) => ({
    id: stage.id,
    label: stage.label,
    detail: stageFixture[stage.id].detail,
    tool: stageFixture[stage.id].tool,
    agent: stage.agent,
    simulated: true,
    status:
      complete || index < activeIndex
        ? 'complete'
        : index === activeIndex
          ? 'active'
          : 'queued',
    atSeconds: stage.startsAt,
  }));
  const callsPerStage = isTrained ? [1, 2, 2, 2, 1] : [1, 3, 3, 2, 2, 2, 1];
  const toolCalls = stages.reduce(
    (total, stage, index) =>
      total +
      (stage.status === 'complete' || stage.status === 'active'
        ? callsPerStage[index]
        : 0),
    0,
  );

  return {
    id,
    name: isTrained ? 'SWE mock checkpoint · r17' : 'Nemotron Lightning 3.5',
    eyebrow: isTrained ? 'Post-trained' : 'Base model',
    status: complete ? 'complete' : 'running',
    elapsedSeconds: Number(cappedElapsed.toFixed(1)),
    totalSeconds: Number(totalSeconds.toFixed(1)),
    progress: Number(Math.min(100, (cappedElapsed / totalSeconds) * 100).toFixed(1)),
    toolCalls,
    failures: isTrained ? 0 : elapsed >= baseStages[5].startsAt ? 1 : 0,
    currentStage: complete ? 'Verified resolution' : blueprints[activeIndex].label,
    stages,
  };
}

export function formatSeconds(seconds: number) {
  return `${seconds.toFixed(1)}s`;
}
