const SENSITIVE_KEYS = [
  'password',
  'accesstoken',
  'refreshtoken',
  'token',
  'authorization',
  'apikey',
  'api_key',
  'secret',
  'privatekey',
  'private_key',
  'servicerolekey',
  'creditcard',
  'cardnumber',
  'cvv',
  'ssn',
];

const MASKED_VALUE = '***MASKED***';

export function maskSensitiveData<T>(data: T, depth = 0): T {
  if (depth > 10) return data;

  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    const maskedArray: unknown[] = data.map((item: unknown) =>
      maskSensitiveData(item, depth + 1),
    );
    return maskedArray as T;
  }

  if (typeof data === 'object') {
    const masked: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(
      data as Record<string, unknown>,
    )) {
      const lowerKey = key.toLowerCase();

      if (SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive))) {
        masked[key] = MASKED_VALUE;
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = maskSensitiveData(value, depth + 1);
      } else {
        masked[key] = value;
      }
    }

    return masked as T;
  }

  return data;
}

export function maskAuthorizationHeader(
  headers: Record<string, unknown>,
): Record<string, unknown> {
  const masked = { ...headers };
  if (masked.authorization && typeof masked.authorization === 'string') {
    const parts = masked.authorization.split(' ');
    if (parts.length === 2) {
      masked.authorization = `${parts[0]} ***MASKED***`;
    } else {
      masked.authorization = MASKED_VALUE;
    }
  }
  return masked;
}
