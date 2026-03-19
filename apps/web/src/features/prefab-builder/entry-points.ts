/**
 * Location Prefab Builder - Entry Point Actions
 * Factory for entry-point management actions used by the store.
 */
import type { PrefabEntryPoint } from '@arcagentic/schemas';
import type { XYPosition } from '@xyflow/react';
import type { PrefabBuilderStore } from './types.js';
import { generateLocalId } from '@arcagentic/utils';

type SetState = (
  partial:
    | Partial<PrefabBuilderStore>
    | ((state: PrefabBuilderStore) => Partial<PrefabBuilderStore>),
) => void;

type GetState = () => PrefabBuilderStore;

/** Factory for entry-point management store actions. */
export function createEntryPointActions(
  set: SetState,
  get: GetState,
): Pick<
  PrefabBuilderStore,
  'addEntryPoint' | 'removeEntryPoint' | 'updateEntryPointPosition' | 'connectEntryPoint'
> {
  return {
    addEntryPoint: (name: string, position: XYPosition) => {
      const { prefabId, entryPoints } = get();
      const entryPointId = generateLocalId('entry');

      const normalizedPosition = {
        x: Math.max(0, Math.min(1, position.x / 1000)),
        y: Math.max(0, Math.min(1, position.y / 1000)),
      };

      const entryPoint: PrefabEntryPoint = {
        id: entryPointId,
        prefabId: prefabId ?? '',
        targetInstanceId: '',
        targetPortId: 'default',
        name,
        position: normalizedPosition,
      };

      set({
        entryPoints: [...entryPoints, entryPoint],
        isDirty: true,
      });

      return entryPointId;
    },

    removeEntryPoint: (entryPointId: string) => {
      const { entryPoints } = get();
      set({
        entryPoints: entryPoints.filter((e) => e.id !== entryPointId),
        selectedNodeId: get().selectedNodeId === entryPointId ? null : get().selectedNodeId,
        isDirty: true,
      });
    },

    updateEntryPointPosition: (entryPointId: string, position: XYPosition) => {
      const { entryPoints } = get();

      const normalizedPosition = {
        x: Math.max(0, Math.min(1, position.x / 1000)),
        y: Math.max(0, Math.min(1, position.y / 1000)),
      };

      set({
        entryPoints: entryPoints.map((e) =>
          e.id === entryPointId ? { ...e, position: normalizedPosition } : e
        ),
        isDirty: true,
      });
    },

    connectEntryPoint: (entryPointId: string, targetInstanceId: string, targetPortId: string) => {
      const { entryPoints } = get();
      set({
        entryPoints: entryPoints.map((e) =>
          e.id === entryPointId ? { ...e, targetInstanceId, targetPortId } : e
        ),
        isDirty: true,
      });
    },
  };
}
