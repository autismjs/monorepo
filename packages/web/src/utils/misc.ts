export function userId(pubkey?: string) {
  if (!pubkey) return null;
  return '@' + ellipsify(pubkey);
}

export function userName(pubkey?: string) {
  if (!pubkey) return null;
  return ellipsify(pubkey);
}

export function ellipsify(pubkey?: string, start = 6, end = 4) {
  if (!pubkey) return null;
  return pubkey.slice(0, start) + '...' + pubkey.slice(-end);
}
