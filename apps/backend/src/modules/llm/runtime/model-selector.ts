export interface ModelOption {
  provider: string;
  model: string;
  priority: number;
  costPerMToken: number;
  supportedTasks: string[];
}

const MODEL_OPTIONS: ModelOption[] = [
  {
    provider: 'volcengine',
    model: 'deepseek-v3-2-251201',
    priority: 1,
    costPerMToken: 0.27,
    supportedTasks: ['*'],
  },
  {
    provider: 'deepseek',
    model: 'deepseek-chat',
    priority: 2,
    costPerMToken: 0.14,
    supportedTasks: ['*'],
  },
  {
    provider: 'openrouter',
    model: 'deepseek/deepseek-chat',
    priority: 3,
    costPerMToken: 0.14,
    supportedTasks: ['*'],
  },
  {
    provider: 'ollama',
    model: 'deepseek-r1:8b',
    priority: 4,
    costPerMToken: 0,
    supportedTasks: ['*'],
  },
];

export class ModelSelector {
  static selectModel(
    task?: string,
    availableProviders?: string[],
    preferredProvider?: string,
  ): ModelOption | null {
    let candidates = [...MODEL_OPTIONS];

    if (preferredProvider) {
      const preferred = candidates.find((c) => c.provider === preferredProvider);
      if (preferred) return preferred;
    }

    if (availableProviders && availableProviders.length > 0) {
      candidates = candidates.filter((c) => availableProviders.includes(c.provider));
    }

    if (task) {
      const taskSpecific = candidates.filter(
        (c) => c.supportedTasks.includes(task) || c.supportedTasks.includes('*'),
      );
      if (taskSpecific.length > 0) candidates = taskSpecific;
    }

    candidates.sort((a, b) => a.priority - b.priority);
    return candidates[0] || null;
  }

  static getAllModels(): ModelOption[] {
    return [...MODEL_OPTIONS];
  }
}
