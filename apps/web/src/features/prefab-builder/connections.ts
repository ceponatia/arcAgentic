import type {
  LocationV2 as Location,
  LocationPortV2 as LocationPort,
  PrefabLocationInstance,
  PrefabConnection,
  ConnectionDirection,
} from '@arcagentic/schemas';
import type { XYPosition } from '@xyflow/react';
import { calculateDirection, toExitDirection, getOppositeExitDirection } from './types.js';
import { generateLocalId } from '@arcagentic/utils';

function generateId(prefix: string): string {
  return generateLocalId(prefix);
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export interface AddConnectionResult {
  instances: PrefabLocationInstance[];
  connections: PrefabConnection[];
}

export function computeAddConnection(
  prefabId: string | null,
  instances: PrefabLocationInstance[],
  connections: PrefabConnection[],
  locations: Map<string, Location>,
  fromInstanceId: string,
  fromPortId: string,
  toInstanceId: string,
  toPortId: string,
  direction: ConnectionDirection
): AddConnectionResult {
  // Check if connection already exists
  const exists = connections.some(
    (c) =>
      (c.fromInstanceId === fromInstanceId && c.toInstanceId === toInstanceId) ||
      (c.fromInstanceId === toInstanceId && c.toInstanceId === fromInstanceId)
  );

  if (exists) return { instances, connections };

  // Get the exit direction (cardinal) from the connection direction
  const exitDir = toExitDirection(direction);
  const oppositeExitDir = exitDir ? getOppositeExitDirection(exitDir) : undefined;

  // Find instances and locations to get names for the exit labels
  const fromInstance = instances.find((i) => i.id === fromInstanceId);
  const toInstance = instances.find((i) => i.id === toInstanceId);
  const fromLocation = fromInstance ? locations.get(fromInstance.locationId) : undefined;
  const toLocation = toInstance ? locations.get(toInstance.locationId) : undefined;

  // Auto-create exits on both instances
  if (fromInstance && toInstance) {
    const fromExitId = generateId('exit');
    const toExitId = generateId('exit');

    // Create exit on "from" instance pointing to "to" instance
    const fromExit: LocationPort = {
      id: fromExitId,
      name: exitDir ? capitalize(exitDir) : `To ${toLocation?.name ?? 'Unknown'}`,
      direction: exitDir,
      targetInstanceId: toInstanceId,
      targetPortId: toExitId,
      locked: false,
    };

    // Create exit on "to" instance pointing back to "from" instance
    const toExit: LocationPort = {
      id: toExitId,
      name: oppositeExitDir
        ? capitalize(oppositeExitDir)
        : `To ${fromLocation?.name ?? 'Unknown'}`,
      direction: oppositeExitDir,
      targetInstanceId: fromInstanceId,
      targetPortId: fromExitId,
      locked: false,
    };

    // Update instances with new exits
    const updatedInstances = instances.map((inst) => {
      if (inst.id === fromInstanceId) {
        return { ...inst, ports: [...(inst.ports ?? []), fromExit] };
      }
      if (inst.id === toInstanceId) {
        return { ...inst, ports: [...(inst.ports ?? []), toExit] };
      }
      return inst;
    });

    const connection: PrefabConnection = {
      id: generateId('conn'),
      prefabId: prefabId ?? '',
      fromInstanceId,
      fromPortId: fromExitId,
      toInstanceId,
      toPortId: toExitId,
      direction,
      bidirectional: true,
      locked: false,
    };

    return {
      instances: updatedInstances,
      connections: [...connections, connection],
    };
  }

  // Fallback: just create the connection without auto-exits
  const connection: PrefabConnection = {
    id: generateId('conn'),
    prefabId: prefabId ?? '',
    fromInstanceId,
    fromPortId,
    toInstanceId,
    toPortId,
    direction,
    bidirectional: true,
    locked: false,
  };

  return {
    instances,
    connections: [...connections, connection],
  };
}

export interface RemoveConnectionResult {
  instances: PrefabLocationInstance[];
  connections: PrefabConnection[];
}

export function computeRemoveConnection(
  connectionId: string,
  instances: PrefabLocationInstance[],
  connections: PrefabConnection[]
): RemoveConnectionResult {
  const connection = connections.find((c) => c.id === connectionId);

  // Also remove the associated exits from both instances
  let updatedInstances = instances;
  if (connection) {
    updatedInstances = instances.map((inst) => {
      if (inst.id === connection.fromInstanceId || inst.id === connection.toInstanceId) {
        // Remove exits that target the other side of this connection
        const otherInstanceId =
          inst.id === connection.fromInstanceId
            ? connection.toInstanceId
            : connection.fromInstanceId;
        return {
          ...inst,
          ports: (inst.ports ?? []).filter((p) => p.targetInstanceId !== otherInstanceId),
        };
      }
      return inst;
    });
  }

  return {
    instances: updatedInstances,
    connections: connections.filter((c) => c.id !== connectionId),
  };
}

export function computeUpdateConnection(
  connectionId: string,
  connections: PrefabConnection[],
  updates: Partial<PrefabConnection>
): PrefabConnection[] {
  return connections.map((c) => (c.id === connectionId ? { ...c, ...updates } : c));
}

export interface AutoLinkParams {
  instanceId: string;
  position: XYPosition;
  instances: PrefabLocationInstance[];
  connections: PrefabConnection[];
  locations: Map<string, Location>;
  prefabId: string | null;
}

export function computeAutoLinkByPosition(params: AutoLinkParams): AddConnectionResult {
  const { instanceId, position, instances, connections, locations, prefabId } = params;
  const newInstance = instances.find((i) => i.id === instanceId);
  if (!newInstance) return { instances, connections };

  let currentInstances = instances;
  let currentConnections = connections;

  // Find nearby instances (within threshold)
  const threshold = 200; // pixels

  for (const other of instances) {
    if (other.id === instanceId) continue;

    const otherPos = {
      x: other.position.x * 1000,
      y: other.position.y * 1000,
    };

    const dx = Math.abs(position.x - otherPos.x);
    const dy = Math.abs(position.y - otherPos.y);
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < threshold) {
      // Check if connection already exists
      const exists = currentConnections.some(
        (c) =>
          (c.fromInstanceId === instanceId && c.toInstanceId === other.id) ||
          (c.fromInstanceId === other.id && c.toInstanceId === instanceId)
      );

      if (!exists) {
        const direction = calculateDirection(position, otherPos);
        const result = computeAddConnection(
          prefabId,
          currentInstances,
          currentConnections,
          locations,
          instanceId,
          'default',
          other.id,
          'default',
          direction
        );
        currentInstances = result.instances;
        currentConnections = result.connections;
      }
    }
  }

  return { instances: currentInstances, connections: currentConnections };
}

export function computeCompleteConnection(
  pendingConnection: { fromInstanceId: string; fromPortId: string; fromPosition: XYPosition },
  toInstanceId: string,
  toPortId: string,
  instances: PrefabLocationInstance[],
  connections: PrefabConnection[],
  locations: Map<string, Location>,
  prefabId: string | null
): AddConnectionResult {
  const fromInst = instances.find((i) => i.id === pendingConnection.fromInstanceId);
  const toInst = instances.find((i) => i.id === toInstanceId);

  if (fromInst && toInst) {
    const fromPos = {
      x: fromInst.position.x * 1000,
      y: fromInst.position.y * 1000,
    };
    const toPos = {
      x: toInst.position.x * 1000,
      y: toInst.position.y * 1000,
    };

    const direction = calculateDirection(fromPos, toPos);
    return computeAddConnection(
      prefabId,
      instances,
      connections,
      locations,
      pendingConnection.fromInstanceId,
      pendingConnection.fromPortId,
      toInstanceId,
      toPortId,
      direction
    );
  }

  return { instances, connections };
}
