"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    DATABASE_URL: zod_1.z.string().url(),
    JWT_SECRET: zod_1.z.string().min(32),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32),
    JWT_EXPIRES_IN: zod_1.z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().default('7d'),
    PORT: zod_1.z.string().default('3002').transform(Number),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    BCRYPT_ROUNDS: zod_1.z.string().default('12').transform(Number),
    RATE_LIMIT_WINDOW_MS: zod_1.z.string().default('900000').transform(Number),
    RATE_LIMIT_MAX: zod_1.z.string().default('200').transform(Number),
    CORS_ORIGIN: zod_1.z.string().default('http://localhost:3000'),
});
function parseEnv() {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        const errors = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
        throw new Error(`Invalid environment variables:\n${errors.join('\n')}`);
    }
    return result.data;
}
exports.env = parseEnv();
//# sourceMappingURL=env.js.map