import Redis from 'ioredis';
import { db, users } from '@workspace/db-{{dashCase name}}';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379/1';
const streamKey = 'str:zitadel:events';
const consumerGroup = 'group:{{dashCase name}}-service';
const consumerName = `consumer:${Math.random().toString(36).substring(7)}`;

// We export a singleton redis client for publishing (e.g. from Platform API)
export const redis = new Redis(redisUrl);

export async function setupConsumer() {
  const consumeClient = new Redis(redisUrl);

  // Ensure consumer group exists
  try {
    await consumeClient.xgroup('CREATE', streamKey, consumerGroup, '0', 'MKSTREAM');
    console.log(`[Redis] Consumer group ${consumerGroup} initialized.`);
  } catch (err: any) {
    if (!err.message.includes('BUSYGROUP')) {
      console.error('[Redis] Failed to create consumer group', err);
    }
  }

  console.log(`[Redis] ${consumerName} listening for identity events...`);

  // Infinite polling loop for XREADGROUP
  while (true) {
    try {
      // Block for 5000ms waiting for new messages
      const result = await consumeClient.xreadgroup(
        'GROUP', consumerGroup, consumerName,
        'BLOCK', 5000,
        'STREAMS', streamKey, '>'
      );

      if (result) {
        const stream = result[0];
        const messages = stream[1];

        for (const message of messages) {
          const [messageId, fields] = message;

          let type = '';
          let payloadStr = '';
          for (let i = 0; i < fields.length; i += 2) {
            if (fields[i] === 'type') type = fields[i+1];
            if (fields[i] === 'payload') payloadStr = fields[i+1];
          }

          if (payloadStr) {
            const data = JSON.parse(payloadStr);
            await processIdentityEvent(type, data);
          }

          // Acknowledge processing
          await consumeClient.xack(streamKey, consumerGroup, messageId);
        }
      }
    } catch (err) {
      console.error('[Redis] Stream reading error:', err);
      // Wait before retrying to prevent hot looping on failure
      await new Promise(res => setTimeout(res, 2000));
    }
  }
}

async function processIdentityEvent(type: string, data: any) {
  try {
    if (type === 'user.registered' || type === 'user.updated') {
      // Upsert logic to handle both creation and updates
      await db.insert(users).values({
        zitadelId: data.zitadelId,
        email: data.email,
        name: data.name,
      }).onConflictDoUpdate({
        target: users.zitadelId,
        set: { email: data.email, name: data.name, updatedAt: new Date() }
      });
      console.log(`[Sync] Processed ${type} for user: ${data.email}`);
    }
  } catch (error) {
    console.error(`[Sync] Failed to process ${type}:`, error);
  }
}
