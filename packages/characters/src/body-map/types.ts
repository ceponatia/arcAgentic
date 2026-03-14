import type { BodyMap, BodyRegion, BodyRegionData } from '@arcagentic/schemas';
import type { CharacterId } from '../types.js';

export interface BodyMapRepository {
  getBodyMap(characterId: CharacterId): Promise<BodyMap | null>;
  upsertBodyRegion(
    characterId: CharacterId,
    region: BodyRegion,
    data: BodyRegionData
  ): Promise<BodyMap>;
}

export interface BodyMapServiceDeps {
  repository: BodyMapRepository;
}
