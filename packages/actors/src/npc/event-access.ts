import { isRecord, type WorldEvent } from '@arcagentic/schemas';

export function getWorldEventPayload(event: WorldEvent): Record<string, unknown> | undefined {
  const descriptor = Object.getOwnPropertyDescriptor(event, 'payload');
  if (!descriptor) {
    return undefined;
  }

  const payload: unknown = descriptor.value;
  return isRecord(payload) ? payload : undefined;
}

export function getStringField(value: unknown, field: string): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  if (!Object.prototype.hasOwnProperty.call(value, field)) {
    return undefined;
  }

  const descriptor = Object.getOwnPropertyDescriptor(value, field);
  if (!descriptor) {
    return undefined;
  }

  const fieldValue: unknown = descriptor.value;
  return typeof fieldValue === 'string' ? fieldValue : undefined;
}