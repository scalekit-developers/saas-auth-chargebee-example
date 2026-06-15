export type PlanLimits = Record<string, number>;

export type PlanConfig = {
  itemPriceId: string;
  name: string;
  limits: PlanLimits;
  freeTrial?: { days: number };
};

export const PLANS: PlanConfig[] = [
  {
    itemPriceId:
      process.env.CHARGEBEE_PLAN_ITEM_PRICE_ID ?? 'growth-plan-monthly',
    name: 'Growth',
    limits: { seats: 25 },
    freeTrial: { days: 14 },
  },
];

export function getPlans(): PlanConfig[] {
  return PLANS;
}

export function getPlanByItemPriceId(
  itemPriceId: string
): PlanConfig | undefined {
  return PLANS.find((plan) => plan.itemPriceId === itemPriceId);
}