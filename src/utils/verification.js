/**
 * src/utils/verification.js
 * Which listings count as "Urios Verified".
 *
 * The listing-level audit flag lives in `properties.badges.isUriosVerified` and
 * is what every surface already renders (feed card rosette, map pin, checklist
 * tags, the Audit Portal's verified counter). Keep one definition so the feed
 * toggle, the counts and the badges can never disagree.
 *
 * Truthiness (not `=== true`) matches how those surfaces test the flag, so a
 * pad that shows the rosette can never be missing from the Verified tab — even
 * on legacy rows where an older schema stored `1` instead of a boolean.
 */
export function isListingVerified(property) {
  return Boolean(property?.badges?.isUriosVerified);
}

/** Counts used by the Explore feed's verification toggle. */
export function countListingsByVerification(properties = []) {
  const list = Array.isArray(properties) ? properties : [];
  const verified = list.filter(isListingVerified).length;
  return { all: list.length, verified };
}
