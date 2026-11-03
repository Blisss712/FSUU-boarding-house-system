/**
 * Curfew policy utilities
 * Balay Urios (Serjon) - FSUU Student Housing Hub
 *
 * A pad either enforces a gate curfew (digital curfew exemption passes are
 * available to its boarders) or it does not. The landlord chooses this while
 * publishing/editing the pad, and the choice is stored on the pad itself inside
 * the `rules` JSONB array with an explicit marker entry:
 *
 *   { title: 'No Curfew', desc: '...', curfew: false }
 *
 * Pads published before this option existed carry no marker and keep the
 * curfew pass feature (the historical behaviour).
 */

export function padHasCurfew(property) {
  const rules = Array.isArray(property?.rules) ? property.rules : [];
  return !rules.some(
    (rule) => rule && typeof rule === 'object' && !Array.isArray(rule) && rule.curfew === false
  );
}
