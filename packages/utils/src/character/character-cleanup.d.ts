import { type BodyMap } from '@arcagentic/schemas';
/**
 * Prunes a BodyMap by removing keys that are not valid for the given race and gender.
 * Uses the shared hierarchy logic to determine valid regions.
 *
 * @param body - The current body map
 * @param race - The character's race
 * @param gender - The character's gender
 * @returns A new BodyMap with invalid keys removed
 */
export declare const pruneBodyMap: (body: BodyMap, race: string, gender: string) => BodyMap;
//# sourceMappingURL=character-cleanup.d.ts.map