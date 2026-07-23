import { Logger } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';

const logger = new Logger('AppCacheModule');

export const AppCacheModule = NestCacheModule.registerAsync({
  isGlobal: true,
  useFactory: async () => {
    const redisUrl = process.env.REDIS_URL?.trim();
    if (!redisUrl) {
      logger.log('REDIS_URL unset — using in-memory cache store');
      return { ttl: 30_000 };
    }

    const store = createKeyv(redisUrl, {
      namespace: 'raffia-weave',
      throwOnConnectError: false,
    });
    store.on('error', (error: unknown) => {
      logger.error({
        msg: 'Redis cache store error',
        error: error instanceof Error ? error.message : String(error),
      });
    });

    logger.log('Cache store: Redis via REDIS_URL');
    return {
      stores: [store],
      ttl: 30_000,
    };
  },
});
