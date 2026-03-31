import { Effect } from 'effect';
import { z } from 'zod';
import type { LLMResponse, LlmCognitionTask } from '@arcagentic/llm';
import { CharacterProfileSchema, type NpcGenerationRequest, type NpcGenerationResult } from '@arcagentic/schemas';
import { buildBackgroundRefinePrompt } from '../prompts/index.js';
import type { NpcGenDeps } from '../types.js';
import { buildResult, parseJsonResponse } from './shared.js';
import { poolOnlyStrategy } from './pool-only.js';

const BackgroundRefineOutputSchema = z.object({
  name: z.string().min(1),
  summary: z.string().min(1).max(500),
  occupation: z.string().min(1).optional(),
});

/**
 * Background-tier strategy that seeds from pools and refines with a fast LLM pass.
 */
export async function poolLlmRefineStrategy(
  request: NpcGenerationRequest,
  deps?: NpcGenDeps,
): Promise<NpcGenerationResult> {
  const draft = await poolOnlyStrategy({ ...request, tier: 'background' }, deps);

  if (!deps?.cognitionRouter) {
    return buildResult(
      CharacterProfileSchema.parse(draft.profile),
      request.tier,
      'background',
      'pool-llm-refine',
      true,
      draft.meta.generatedAt,
    );
  }

  try {
    const router = deps.cognitionRouter;
    const draftProfile = CharacterProfileSchema.parse(draft.profile);
    const messages = buildBackgroundRefinePrompt(draftProfile, request.context);
    const task: LlmCognitionTask = {
      type: 'fast',
      messages,
      options: {
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 300,
      },
    };
    const response: LLMResponse = await Effect.runPromise(router.execute(task));
    const parsed = BackgroundRefineOutputSchema.parse(parseJsonResponse(response.content));
    const refinedProfile = CharacterProfileSchema.parse({
      ...draftProfile,
      name: parsed.name,
      summary: parsed.summary,
      occupation: parsed.occupation ?? draftProfile.occupation,
    });

    return buildResult(
      refinedProfile,
      request.tier,
      'background',
      'pool-llm-refine',
      false,
    );
  } catch {
    return buildResult(
      CharacterProfileSchema.parse(draft.profile),
      request.tier,
      'background',
      'pool-llm-refine',
      true,
      draft.meta.generatedAt,
    );
  }
}
