import { NextResponse } from 'next/server';
import { requireSession, SessionError } from '@/lib/auth/require-session';
import { getPlans } from '@/lib/billing/plans';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const ctx = await requireSession();
    return NextResponse.json({
      user: { id: ctx.userId, email: ctx.email },
      organizationId: ctx.organizationId,
      roles: ctx.roles,
      permissions: ctx.permissions,
      plans: getPlans().map((plan) => ({
        itemPriceId: plan.itemPriceId,
        name: plan.name,
        limits: plan.limits,
        freeTrial: plan.freeTrial,
      })),
    });
  } catch (error) {
    if (error instanceof SessionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[api/session]', error);
    return NextResponse.json({ error: 'Session error' }, { status: 500 });
  }
}