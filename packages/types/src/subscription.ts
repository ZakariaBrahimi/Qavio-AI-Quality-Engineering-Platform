import type { Id, Timestamp } from './common';

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled';

export interface Subscription {
  id: Id;
  organizationId: Id;
  plan: string;
  status: SubscriptionStatus;
  seats: number;
  provider: string | null;
  providerSubscriptionId: string | null;
  currentPeriodStart: Timestamp | null;
  currentPeriodEnd: Timestamp | null;
  createdAt: Timestamp;
}
