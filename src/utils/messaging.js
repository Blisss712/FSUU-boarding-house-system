/**
 * src/utils/messaging.js
 * Small helpers shared by the in-app messaging entry points.
 */

/**
 * A starter message for a board listing. The composer opens pre-filled (never
 * auto-sent) so a student can ask about vacancy and a visit in one tap.
 */
export function landlordIntroDraft(padName) {
  const name = String(padName || '').trim();
  if (!name) {
    return 'Hi! I am interested in one of your boarding houses. Is a room still available?';
  }
  return `Hi! I am interested in boarding at ${name}. Is a room still available, and could I schedule a visit?`;
}
