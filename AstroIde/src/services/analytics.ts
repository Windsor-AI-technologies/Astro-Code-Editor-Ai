import posthog from 'posthog-js';

// ── Identify user after login ──
export function identifyUser(userId: string, email: string, plan: string) {
  posthog.identify(userId, { email, plan });
}

// ── Track mode switches ──
export function trackModeSwitch(mode: string) {
  posthog.capture('mode_switched', { mode });
}

// ── Track upgrade wall shown ──
export function trackUpgradeWall(feature: string) {
  posthog.capture('upgrade_wall_shown', { feature });
}

// ── Track Perl activated ──
export function trackPerlActivated() {
  posthog.capture('perl_activated');
}

// ── Track file opened ──
export function trackFileOpened(extension: string) {
  posthog.capture('file_opened', { extension });
}

// ── Track AI message sent ──
export function trackAIMessage(model: string, mode: string) {
  posthog.capture('ai_message_sent', { model, mode });
}

// ── Track app opened ──
export function trackAppOpened(plan: string) {
  posthog.capture('app_opened', { plan });
}
