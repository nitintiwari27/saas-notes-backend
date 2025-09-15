const SUBSCRIPTION_PLANS = {
  FREE: "free",
  PRO: "pro",
};

const SUBSCRIPTION_LIMITS = {
  [SUBSCRIPTION_PLANS.FREE]: {
    maxNotes: 20,
  },
  [SUBSCRIPTION_PLANS.PRO]: {
    maxNotes: -1, // -1 means unlimited
  },
};

const ROLES = {
  ADMIN: "admin",
  MEMBER: "member",
};

const PERMISSIONS = {
  [ROLES.ADMIN]: [
    "notes:create",
    "notes:read",
    "notes:update",
    "notes:delete",
    "users:invite",
    "subscription:upgrade",
  ],
  [ROLES.MEMBER]: [
    "notes:create",
    "notes:read",
    "notes:update",
    "notes:delete",
  ],
};

const PAYMENT_STATUS = {
  PENDING: "pending",
  SUCCESS: "success",
  FAILED: "failed",
  REFUNDED: "refunded",
};

const INVOICE_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  OVERDUE: "overdue",
  CANCELLED: "cancelled",
};

module.exports = {
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_LIMITS,
  ROLES,
  PERMISSIONS,
  PAYMENT_STATUS,
  INVOICE_STATUS,
};
