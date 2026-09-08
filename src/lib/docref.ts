const SUFFIX_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Generates a random alphanumeric suffix, e.g. "7KQM" (no lookalike characters). */
export function randomDocRefSuffix(len = 4): string {
  let out = ''
  const pool = SUFFIX_ALPHABET.length
  const values = new Uint32Array(len)
  crypto.getRandomValues(values)
  for (let i = 0; i < len; i++) {
    out += SUFFIX_ALPHABET[values[i] % pool]
  }
  return out
}

/** Builds a doc ref from a project code + suffix, e.g. AJM-032_Client\K1-DVR-7KQM */
export function buildDocRef(projectCode: string, suffix: string): string {
  return `${projectCode}-${suffix}`
}