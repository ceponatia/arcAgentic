/**
 * Shared LLM types and interfaces.
 */
import type { Operation } from 'fast-json-patch';
import type { ConversationMessageRole, MessageRole, ToolCall } from '@arcagentic/schemas';
/** Chat role for conversation messages (system, user, assistant) */
export type ChatRole = ConversationMessageRole;
/** Extended chat role including tool messages (for tool calling) */
export type ChatRoleWithTools = MessageRole;
/**
 * Chat message with tool calling support.
 */
export interface ChatMessageWithTools {
    role: ChatRoleWithTools;
    content?: string | null;
    /** Tool calls requested by the assistant */
    tool_calls?: ToolCall[];
    /** ID of the tool call this message responds to (role=tool) */
    tool_call_id?: string;
    /** Tool function name (role=tool) */
    name?: string;
}
/**
 * State patches organized by slice key.
 * Key is slice name (e.g., 'proximity', 'inventory'), value is JSON Patch operations.
 */
export type StatePatches = Record<string, Operation[]>;
export interface LlmGenerationOptions {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    timeoutMs?: number;
}
export interface LlmUsage {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
}
export interface LlmResponse {
    id?: string;
    role: ChatRole;
    content: string;
    model: string;
    createdAt: string;
    usage?: LlmUsage;
    openrouterMeta?: Record<string, unknown>;
    ollamaMeta?: Record<string, unknown>;
    toolsMeta?: Record<string, unknown>;
    embeddingVector?: number[];
}
export interface LlmProvider {
    generate(messages: {
        role: ChatRole;
        content: string;
    }[], model: string, options?: LlmGenerationOptions): Promise<LlmResponse | {
        ok: false;
        error: string | Record<string, unknown>;
    }>;
}
export interface OpenRouterChatResponse {
    message?: {
        role: 'assistant';
        content: string;
    };
    error?: string;
}
export interface OpenRouterToolResponse extends OpenRouterChatResponse {
    tool_calls?: ToolCall[];
    finish_reason?: string;
}
/**
 * Build provider options object, excluding undefined values.
 */
export declare function buildProviderOptions(opts?: LlmGenerationOptions): {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
};
//# sourceMappingURL=types.d.ts.map