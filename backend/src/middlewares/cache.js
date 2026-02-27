const redis = require('../config/redis');

/**
 * Get current version for a resource/entity
 * @param {string} resource - Resource name (e.g., 'products', 'stock')
 */
const getVersion = async (resource) => {
    const version = await redis.get(`version:${resource}`);
    return version || '1';
};

/**
 * Increment version for a resource (Invalidates all keys for this resource)
 * @param {string} resource - Resource name
 */
const incrementVersion = async (resource) => {
    const newVersion = await redis.incr(`version:${resource}`);
    return newVersion;
};

/**
 * Middleware to cache GET requests using Version keys
 * Key format: cache:v{version}:{originalUrl}
 */
const cacheMiddleware = (resource, duration = 300) => {
    return async (req, res, next) => {
        // Skip caching for non-GET requests or if we want to bypass cache
        if (req.method !== 'GET' || req.query.nocache) {
            return next();
        }

        try {
            const version = await getVersion(resource);
            const key = `cache:${resource}:v${version}:${req.originalUrl || req.url}`;

            const cachedResponse = await redis.get(key);

            if (cachedResponse) {
                return res.json(JSON.parse(cachedResponse));
            }

            // Override res.json to store the response in Redis
            const originalJson = res.json;
            res.json = (body) => {
                // Only cache successful responses
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    redis.set(key, JSON.stringify(body), 'EX', duration).catch((err) => {
                        console.error('Redis cache set error:', err);
                    });
                }
                originalJson.call(res, body);
            };

            next();
        } catch (error) {
            console.error('Redis cache error:', error);
            next();
        }
    };
};

/**
 * Utility to clear cache by pattern (Deprecated, use incrementVersion)
 */
const clearCache = async (pattern) => {
    // kept for backward compatibility or hard resets
    try {
        const stream = redis.scanStream({
            match: pattern,
            count: 100
        });

        stream.on('data', (keys) => {
            if (keys.length) {
                const pipeline = redis.pipeline();
                keys.forEach((key) => {
                    pipeline.del(key);
                });
                pipeline.exec();
            }
        });
    } catch (error) {
        console.error('Clear cache error:', error);
    }
};

module.exports = {
    cacheMiddleware,
    clearCache,
    getVersion,
    incrementVersion
};
