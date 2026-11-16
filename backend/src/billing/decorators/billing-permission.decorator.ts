import { SetMetadata } from '@nestjs/common';
import { BillingPermission } from '../billing-permissions.policy.js';

export const BILLING_PERMISSIONS_KEY = 'billing_permissions';

/**
 * Decorator to require one or more BillingPermissions on a controller class or method.
 */
export const RequireBillingPermissions = (...permissions: BillingPermission[]) =>
  SetMetadata(BILLING_PERMISSIONS_KEY, permissions);

