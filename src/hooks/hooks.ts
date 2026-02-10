/**
 * Hook Handler Type Definitions
 *
 * Defines the types used by custom hooks in this project.
 * These hooks follow the OpenClaw Hook API.
 */

/**
 * The event object passed to each hook handler.
 */
export interface HookEvent {
  /** Event category (e.g., "gateway", "command", "session") */
  type: string;
  /** Specific action within the category (e.g., "startup", "new") */
  action: string;
  /** Mutable array of messages to inject into the conversation */
  messages: string[];
  /** Event metadata */
  meta?: Record<string, unknown>;
}

/**
 * A hook handler function.
 */
export type HookHandler = (event: HookEvent) => Promise<void> | void;
