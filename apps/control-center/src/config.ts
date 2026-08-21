export interface ControlCenterConfig {
  port: number;
  allowedOrigins: string[];
  superAdminKeys: string[];
}

function splitCsv(value: string | undefined, fallback: string[]): string[] {
  if (!value) {
    return fallback;
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function loadConfig(): ControlCenterConfig {
  const port = Number(process.env.CC_PORT || 4400);
  if (Number.isNaN(port) || port <= 0) {
    throw new Error('Invalid CC_PORT value');
  }

  const allowedOrigins = splitCsv(process.env.CC_ALLOWED_ORIGINS, ['http://localhost:4400']);
  const superAdminKeys = splitCsv(process.env.CC_SUPER_ADMIN_KEYS, ['owner-local-key']);

  if (superAdminKeys.length === 0) {
    throw new Error('CC_SUPER_ADMIN_KEYS must define at least one key');
  }

  return {
    port,
    allowedOrigins,
    superAdminKeys,
  };
}
