import type {
  LocationV2 as Location,
  LocationPortV2 as LocationPort,
  PrefabLocationInstance,
  PrefabConnection,
  PrefabEntryPoint,
  ConnectionDirection,
} from '@arcagentic/schemas';
import { API_BASE_URL } from '../../config.js';
import { generateLocalId } from '@arcagentic/utils';

const API_BASE = API_BASE_URL;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function generateId(prefix: string): string {
  return generateLocalId(prefix);
}

export interface LoadPrefabResult {
  prefabId: string;
  prefabName: string;
  prefabDescription: string;
  prefabCategory: string;
  instances: PrefabLocationInstance[];
  connections: PrefabConnection[];
  entryPoints: PrefabEntryPoint[];
  locations: Map<string, Location>;
}

export async function fetchPrefabData(prefabId: string): Promise<LoadPrefabResult> {
  const res = await fetch(`${API_BASE}/location-prefabs/${prefabId}`);
  const data = (await res.json()) as unknown;

  if (!isRecord(data)) {
    throw new Error('Invalid response loading prefab');
  }

  const ok = data['ok'] === true;
  const prefabRaw = data['prefab'];
  if (!ok || !isRecord(prefabRaw)) {
    throw new Error(getString(data['error']) ?? 'Failed to load prefab');
  }

  const prefabName = getString(prefabRaw['name']) ?? '';
  const prefabDescription = getString(prefabRaw['description']);
  const prefabCategory = getString(prefabRaw['category']);

  const legacyNodes = Array.isArray(prefabRaw['nodes'])
    ? (prefabRaw['nodes'] as Location[])
    : [];

  // For now, handle legacy format - nodes stored inline
  const instances: PrefabLocationInstance[] = legacyNodes.map(
    (
      node: Location & {
        position?: { x: number; y: number };
        parentId?: string | null;
        depth?: number;
        ports?: LocationPort[];
      },
      index: number
    ) => ({
      id: generateId('inst'),
      prefabId,
      locationId: node.id,
      position: node.position ?? {
        x: (index % 4) * 0.2 + 0.1,
        y: Math.floor(index / 4) * 0.2 + 0.1,
      },
      parentInstanceId: null,
      depth: node.depth ?? 0,
      ports: node.ports ?? [],
      overrides: {},
    })
  );

  // Store locations in the map
  const locationsMap = new Map<string, Location>();
  legacyNodes.forEach((node: Location) => {
    locationsMap.set(node.id, node);
  });

  const legacyConnectionsRaw = Array.isArray(prefabRaw['connections'])
    ? (prefabRaw['connections'] as unknown[])
    : [];

  // Convert legacy connections
  const connections: PrefabConnection[] = legacyConnectionsRaw.filter(isRecord).map((conn) => {
    const connId = getString(conn['id']) ?? generateId('conn');
    const fromLocationId = getString(conn['fromLocationId']) ?? '';
    const toLocationId = getString(conn['toLocationId']) ?? '';

    const fromInst = instances.find((i) => i.locationId === fromLocationId);
    const toInst = instances.find((i) => i.locationId === toLocationId);
    return {
      id: connId,
      prefabId,
      fromInstanceId: fromInst?.id ?? '',
      fromPortId: 'default',
      toInstanceId: toInst?.id ?? '',
      toPortId: 'default',
      direction: 'horizontal' as ConnectionDirection,
      bidirectional: true,
      locked: false,
    };
  });

  const entryPointsRaw = Array.isArray(prefabRaw['entryPoints'])
    ? (prefabRaw['entryPoints'] as unknown[])
    : [];
  const legacyEntryPoints = entryPointsRaw.filter((ep): ep is string => typeof ep === 'string');

  // Convert entry points
  const entryPoints: PrefabEntryPoint[] = legacyEntryPoints.map((ep, index: number) => {
    const targetInst = instances.find((i) => i.locationId === ep) ?? instances[0];
    return {
      id: generateId('entry'),
      prefabId,
      targetInstanceId: targetInst?.id ?? '',
      targetPortId: 'default',
      name: `Entry ${index + 1}`,
      position: { x: 0.05, y: 0.1 + index * 0.1 },
    };
  });

  return {
    prefabId,
    prefabName,
    prefabDescription: prefabDescription ?? '',
    prefabCategory: prefabCategory ?? '',
    instances,
    connections,
    entryPoints,
    locations: locationsMap,
  };
}

export interface LoadLocationsResult {
  availableLocations: Location[];
  templateLocations: Location[];
  locations: Map<string, Location>;
}

export async function fetchLocationsData(
  currentLocations: Map<string, Location>
): Promise<LoadLocationsResult> {
  const res = await fetch(`${API_BASE}/locations`);
  const data = (await res.json()) as unknown;

  if (!isRecord(data)) {
    throw new Error('Invalid response loading locations');
  }

  if (data['ok'] === true && Array.isArray(data['locations'])) {
    const all = data['locations'] as Location[];
    const templates = all.filter((l) => l.isTemplate);
    const available = all.filter((l) => !l.isTemplate);

    // Add to locations map
    const locationsMap = new Map(currentLocations);
    all.forEach((loc) => locationsMap.set(loc.id, loc));

    return {
      availableLocations: available,
      templateLocations: templates,
      locations: locationsMap,
    };
  }

  // If locations endpoint doesn't exist yet, use empty arrays
  throw new Error('No locations found');
}

export interface SavePrefabParams {
  prefabId: string | null;
  prefabName: string;
  prefabDescription: string;
  prefabCategory: string;
  instances: PrefabLocationInstance[];
  connections: PrefabConnection[];
  entryPoints: PrefabEntryPoint[];
  locations: Map<string, Location>;
}

export interface SavePrefabResult {
  prefabId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  error?: string;
}

export async function savePrefabData(params: SavePrefabParams): Promise<SavePrefabResult> {
  const {
    prefabId,
    prefabName,
    prefabDescription,
    prefabCategory,
    instances,
    connections,
    entryPoints,
    locations,
  } = params;

  // Convert to legacy format for now
  const nodes = instances.map((inst) => {
    const loc = locations.get(inst.locationId);
    return {
      id: inst.locationId,
      name: loc?.name ?? 'Unknown',
      type: loc?.type ?? 'room',
      parentId: null,
      depth: inst.depth,
      position: inst.position,
      ports: inst.ports,
      summary: loc?.summary,
      description: loc?.description,
      tags: loc?.tags,
      properties: loc?.properties,
    };
  });

  const legacyConnections = connections.map((conn) => ({
    id: conn.id,
    fromLocationId: instances.find((i) => i.id === conn.fromInstanceId)?.locationId ?? '',
    toLocationId: instances.find((i) => i.id === conn.toInstanceId)?.locationId ?? '',
  }));

  const legacyEntryPoints = entryPoints
    .map((ep) => instances.find((i) => i.id === ep.targetInstanceId)?.locationId)
    .filter((id): id is string => !!id);

  const body = {
    name: prefabName.trim(),
    description: prefabDescription.trim() || undefined,
    category: prefabCategory.trim() || undefined,
    nodes,
    connections: legacyConnections,
    entryPoints: legacyEntryPoints.length > 0 ? legacyEntryPoints : ['default'],
  };

  const url = prefabId
    ? `${API_BASE}/location-prefabs/${prefabId}`
    : `${API_BASE}/location-prefabs`;

  const res = await fetch(url, {
    method: prefabId ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as unknown;

  if (isRecord(data) && data['ok'] === true) {
    return {
      prefabId:
        (isRecord(data['prefab']) ? getString(data['prefab']['id']) : undefined) ?? prefabId,
      isDirty: false,
      isSaving: false,
    };
  }

  const error = isRecord(data) ? getString(data['error']) : undefined;
  return {
    prefabId,
    isDirty: true,
    isSaving: false,
    error: error ?? 'Failed to save prefab',
  };
}
