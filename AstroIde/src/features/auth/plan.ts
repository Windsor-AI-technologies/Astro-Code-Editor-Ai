// ══════════════════════════════════════════════
// Plan & Feature Gating
// ══════════════════════════════════════════════

export type PlanId = "free" | "pro" | "acrylic" | "mica";

export interface UserPlan {
  id: PlanId;
  label: string;
  perlAddon: boolean;
}

// Features that require a paid plan
export const LOCKED_FEATURES: Record<string, PlanId> = {
  agent: "pro",
  electronics: "pro",
  analytics: "pro",
};

// Perl is independent addon
export const PERL_REQUIRED = true;

export function getUserPlan(): UserPlan {
  try {
    const stored = localStorage.getItem("astro-user-plan");
    if (stored) return JSON.parse(stored);
  } catch {}
  return { id: "free", label: "Free", perlAddon: false };
}

export function setUserPlan(plan: UserPlan) {
  localStorage.setItem("astro-user-plan", JSON.stringify(plan));
}

export function canAccessFeature(feature: string): boolean {
  const plan = getUserPlan();
  const required = LOCKED_FEATURES[feature];
  if (!required) return true; // Not locked

  const planOrder: PlanId[] = ["free", "pro", "acrylic", "mica"];
  return planOrder.indexOf(plan.id) >= planOrder.indexOf(required);
}

export function canAccessPerl(): boolean {
  return getUserPlan().perlAddon;
}
