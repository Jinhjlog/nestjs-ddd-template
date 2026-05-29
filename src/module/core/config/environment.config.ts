export type EnvironmentConfig = {
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
    connectionLimit: number;
    url: string;
  };
  jwt: {
    accessSecret: string;
    accessTokenExpiresIn: number;
  };
  adminJwt: {
    accessSecret: string;
    accessTokenExpiresIn: number;
  };
  logger: {
    level: 'debug' | 'info' | 'warn' | 'error';
    directory: string;
    maxFiles: string;
    maxSize: string;
  };
};

function validateEnvVariables(config: EnvironmentConfig) {
  const missingVariables: string[] = [];

  if (!config.database.host) missingVariables.push('DB_HOST');
  if (!config.database.user) missingVariables.push('DB_USER');
  if (!config.database.password) missingVariables.push('DB_PASSWORD');
  if (!config.database.name) missingVariables.push('DB_NAME');
  if (!config.database.url) missingVariables.push('DATABASE_URL');
  if (!config.jwt.accessSecret) missingVariables.push('JWT_ACCESS_SECRET');
  if (!config.adminJwt.accessSecret)
    missingVariables.push('ADMIN_JWT_ACCESS_SECRET');

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing environment variables: ${missingVariables.join(', ')}`,
    );
  }
}

export default (): EnvironmentConfig => {
  const config: EnvironmentConfig = {
    database: {
      host: process.env.DB_HOST || '',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || '',
      password: process.env.DB_PASSWORD || '',
      name: process.env.DB_NAME || '',
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
      url: process.env.DATABASE_URL || '',
    },
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET || '',
      accessTokenExpiresIn: parseInt(
        process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '3600',
        10,
      ),
    },
    adminJwt: {
      accessSecret: process.env.ADMIN_JWT_ACCESS_SECRET || '',
      accessTokenExpiresIn: parseInt(
        process.env.ADMIN_JWT_ACCESS_TOKEN_EXPIRES_IN || '3600',
        10,
      ),
    },
    logger: {
      level:
        (process.env.LOG_LEVEL as EnvironmentConfig['logger']['level']) ||
        (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
      directory: process.env.LOG_DIRECTORY || 'logs',
      maxFiles: process.env.LOG_MAX_FILES || '30d',
      maxSize: process.env.LOG_MAX_SIZE || '20m',
    },
  };

  validateEnvVariables(config);

  return config;
};
