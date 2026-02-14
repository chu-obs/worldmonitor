export interface GuardedTask {
  name: string;
  task: () => Promise<void> | void;
}

interface RunGuardedTasksOptions {
  inFlight: Set<string>;
  tasks: GuardedTask[];
  onTaskError?: (name: string, error: unknown) => void;
}

async function runGuardedTask(inFlight: Set<string>, task: GuardedTask): Promise<void> {
  if (inFlight.has(task.name)) return;
  inFlight.add(task.name);
  try {
    await Promise.resolve(task.task());
  } finally {
    inFlight.delete(task.name);
  }
}

export async function runGuardedTasks(options: RunGuardedTasksOptions): Promise<void> {
  const settled = await Promise.allSettled(
    options.tasks.map(task => runGuardedTask(options.inFlight, task))
  );

  settled.forEach((result, idx) => {
    if (result.status === 'rejected') {
      options.onTaskError?.(options.tasks[idx]?.name || 'unknown', result.reason);
    }
  });
}
