import type { ToolDefinition } from '@arcagentic/schemas';
import type { ChatRole, LlmGenerationOptions, LlmResponse, ChatMessageWithTools, OpenRouterChatResponse, OpenRouterToolResponse } from './types.js';
interface ChatMessage {
    role: ChatRole;
    content: string;
}
interface ProviderPreferences {
    order?: string[];
    allow_fallbacks?: boolean;
}
interface ChatWithOpenRouterOptions {
    apiKey: string;
    model: string;
    messages: ChatMessage[];
    timeoutMs?: number;
    options?: {
        temperature?: number;
        top_p?: number;
        max_tokens?: number;
    };
    provider?: ProviderPreferences;
}
/**
 * Options for tool-calling chat requests.
 */
interface ChatWithToolsOptions {
    apiKey: string;
    model: string;
    messages: ChatMessageWithTools[];
    tools?: ToolDefinition[];
    /** How the model should choose tools: 'auto' | 'none' | 'required' */
    tool_choice?: 'auto' | 'none' | 'required';
    timeoutMs?: number;
    options?: {
        temperature?: number;
        top_p?: number;
        max_tokens?: number;
    };
}
/**
 * Send a chat completion request to OpenRouter
 */
export declare function chatWithOpenRouter(opts: ChatWithOpenRouterOptions): Promise<OpenRouterChatResponse>;
/**
 * Send a chat completion request to OpenRouter with tool calling support.
 */
export declare function chatWithOpenRouterTools(opts: ChatWithToolsOptions): Promise<OpenRouterToolResponse>;
export declare function generateWithOpenRouter(params: {
    apiKey: string;
    model: string;
    messages: {
        role: ChatRole;
        content: string;
    }[];
}, options?: LlmGenerationOptions): Promise<LlmResponse | {
    ok: false;
    error: string | Record<string, unknown>;
}>;
export {};
//# sourceMappingURL=openrouter.d.ts.map