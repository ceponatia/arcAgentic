import { createLogger, type Logger } from '@arcagentic/logger';
import { WireWorldEventSchema, type WorldEvent } from '@arcagentic/schemas';
import { pubRedis, subRedis } from '../core/redis-client.js';

export type EventHandler = (event: WorldEvent) => void | Promise<void>;

const createBusLogger = createLogger as (pkg: string, subsystem?: string) => Logger;
const log = createBusLogger('bus', 'redis-pubsub');

export class RedisPubSubAdapter {
  private readonly channel = 'world-events';
  private handlers = new Set<EventHandler>();
  private isSubscribed = false;

  async publish(event: WorldEvent): Promise<void> {
    await pubRedis.publish(this.channel, JSON.stringify(event));
  }

  async subscribe(handler: EventHandler): Promise<void> {
    this.handlers.add(handler);

    if (!this.isSubscribed) {
      await subRedis.subscribe(this.channel);
      subRedis.on('message', (channel, message) => {
        if (channel === this.channel) {
          try {
            const event = WireWorldEventSchema.parse(JSON.parse(message));
            for (const h of this.handlers) {
              const result = h(event);
              if (result instanceof Promise) {
                result.catch((err: Error) => log.error({ err }, 'event handler failed'));
              }
            }
          } catch (err) {
            log.error({ err, channel }, 'failed to parse redis event message');
          }
        }
      });
      this.isSubscribed = true;
    }
  }

  unsubscribe(handler: EventHandler): void {
    this.handlers.delete(handler);
  }
}

export const redisPubSub = new RedisPubSubAdapter();
