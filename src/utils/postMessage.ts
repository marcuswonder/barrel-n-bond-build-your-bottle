const TRUSTED_PARENT_ORIGINS: string[] = [
  'https://spiritsstudio.co.uk',
  'https://www.spiritsstudio.co.uk',
];

const LOCALHOST_ORIGIN_RE = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

const normalizeOrigin = (value: string | null | undefined): string | null => {
  const input = String(value || '').trim();
  if (!input) return null;
  try {
    const parsed = new URL(input);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.origin;
  } catch {
    return null;
  }
};

const isTrustedParentOrigin = (origin: string): boolean => {
  return TRUSTED_PARENT_ORIGINS.includes(origin) || LOCALHOST_ORIGIN_RE.test(origin);
};

export type ParentMessagingConfig = {
  parentTargetOrigin: string;
  trustedOrigins: Set<string>;
};

export const resolveParentMessagingConfig = (): ParentMessagingConfig => {
  const trustedOrigins = new Set<string>(TRUSTED_PARENT_ORIGINS);
  trustedOrigins.add(window.location.origin);

  const params = new URLSearchParams(window.location.search);

  const addTrustedOrigin = (value: string | null | undefined): string | null => {
    const origin = normalizeOrigin(value);
    if (!origin) return null;
    if (!isTrustedParentOrigin(origin)) return null;
    trustedOrigins.add(origin);
    return origin;
  };

  const requestedParentOrigin = addTrustedOrigin(params.get('parentOrigin'));
  const referrerOrigin = addTrustedOrigin(document.referrer);

  let parentTargetOrigin = window.location.origin;

  if (window.parent !== window) {
    if (requestedParentOrigin) {
      parentTargetOrigin = requestedParentOrigin;
    } else if (referrerOrigin) {
      parentTargetOrigin = referrerOrigin;
    } else {
      parentTargetOrigin = TRUSTED_PARENT_ORIGINS[0];
    }
  }

  return { parentTargetOrigin, trustedOrigins };
};
