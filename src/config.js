function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

module.exports = {
  JWT_SECRET: requireEnv("JWT_SECRET"),
  DATABASE_URL: requireEnv("DATABASE_URL"),

/*
  AWS_ACCESS_KEY_ID: requireEnv("AWS_ACCESS_KEY_ID"),
  AWS_SECRET_ACCESS_KEY: requireEnv("AWS_SECRET_ACCESS_KEY"),
  AWS_REGION: process.env.AWS_REGION || "us-east-1",
  S3_BUCKET_NAME: requireEnv("S3_BUCKET_NAME"),
*/
  NODE_ENV: process.env.NODE_ENV || "development",
};
