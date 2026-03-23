import { z } from 'zod';

export interface Tool<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema: z.ZodSchema<TInput>;
  execute: (input: TInput) => Promise<TOutput>;
}

export abstract class BaseTool<TInput = unknown, TOutput = unknown> implements Tool<TInput, TOutput> {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly inputSchema: z.ZodSchema<TInput>;

  abstract execute(input: TInput): Promise<TOutput>;

  protected formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}

export type ToolRegistry = Map<string, Tool>;

export function createToolRegistry(): ToolRegistry {
  return new Map<string, Tool>();
}

export function registerTool(registry: ToolRegistry, tool: Tool): void {
  registry.set(tool.name, tool);
}

export function getTool(registry: ToolRegistry, name: string): Tool | undefined {
  return registry.get(name);
}

export function getAllTools(registry: ToolRegistry): Tool[] {
  return Array.from(registry.values());
}

export function getToolDescriptions(registry: ToolRegistry): string {
  return getAllTools(registry)
    .map((tool) => `- ${tool.name}: ${tool.description}`)
    .join('\n');
}
