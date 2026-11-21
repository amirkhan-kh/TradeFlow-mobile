
function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

const DEV_SECRET = "dev-only-secret-change-me";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL", "postgres://tradeflow:tradeflow@localhost:5432/tradeflow"),
  jwtSecret: required("JWT_SECRET", DEV_SECRET),
  /** Encrypts integration credentials at rest. Changing it invalidates saved secrets. */
  secretKey: process.env.SECRET_KEY ?? process.env.JWT_SECRET ?? DEV_SECRET,
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  seedDemo: process.env.SEED_DEMO !== "false",
  adminUsername: process.env.ADMIN_USERNAME ?? "admin",
  adminPassword: process.env.ADMIN_PASSWORD ?? "admin123",
  cookieSecure: process.env.COOKIE_SECURE === "true",
  /** Mobile app versions for `GET /public/app-version`: below `min` the app blocks, below `latest` it suggests an update. */
  mobile: {
    android: { min: process.env.MOBILE_ANDROID_MIN ?? "1.0.0", latest: process.env.MOBILE_ANDROID_LATEST ?? "1.0.0" },
    ios: { min: process.env.MOBILE_IOS_MIN ?? "1.0.0", latest: process.env.MOBILE_IOS_LATEST ?? "1.0.0" },
  },
};

if (config.cookieSecure && (config.jwtSecret === DEV_SECRET || config.jwtSecret.length < 32)) {
  throw new Error("JWT_SECRET must be a random value of at least 32 characters when COOKIE_SECURE=true");
}
