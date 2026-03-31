import type { ToolDefinition } from '@arcagentic/schemas';

import { GET_SENSORY_DETAIL_TOOL } from './definitions/core/get-sensory-detail.js';
import { GET_NPC_MEMORY_TOOL } from './definitions/relationship/get-npc-memory.js';
import { UPDATE_RELATIONSHIP_TOOL } from './definitions/relationship/update-relationship.js';

export * from './registry.js';

/**
 * Returns the curated Tier 1 tool set for NPC runtime cognition.
 * These tools have verified service handlers and are safe for the agentic loop.
 */
export function getCognitionTools(): ToolDefinition[] {
	return [GET_SENSORY_DETAIL_TOOL, GET_NPC_MEMORY_TOOL, UPDATE_RELATIONSHIP_TOOL];
}

// Re-export all tool definitions
export * from './definitions/core/get-sensory-detail.js';
export * from './definitions/core/update-proximity.js';
export * from './definitions/environment/examine-object.js';
export * from './definitions/environment/navigate-player.js';
export * from './definitions/hygiene/get-hygiene-sensory.js';
export * from './definitions/hygiene/update-npc-hygiene.js';
export * from './definitions/inventory/use-item.js';
export * from './definitions/location/get-location-info.js';
export * from './definitions/location/move-to-location.js';
export * from './definitions/relationship/get-npc-memory.js';
export * from './definitions/relationship/update-relationship.js';
export * from './definitions/schedule/assign-npc-location.js';
export * from './definitions/schedule/generate-npc-schedule.js';
export * from './definitions/schedule/get-schedule-resolution.js';
export * from './definitions/time/advance-time.js';
