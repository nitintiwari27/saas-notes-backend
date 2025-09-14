const {
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_LIMITS,
} = require("../utils/constants");
const { sendError } = require("../utils/helpers");

/**
 * Middleware to check if user can create more notes based on subscription plan
 */
const checkNoteLimit = async (req, res, next) => {
  try {
    if (!req.account) {
      return sendError(res, 400, "Account context required");
    }

    const account = req.account;

    // Pro plan has unlimited notes
    if (account.plan === SUBSCRIPTION_PLANS.PRO) {
      return next();
    }

    // For free plan, check the limit
    const limit = SUBSCRIPTION_LIMITS[account.plan];
    if (!limit) {
      return sendError(res, 500, "Invalid subscription plan");
    }

    // Check if current note count exceeds the limit
    if (account.noteCount >= limit.maxNotes) {
      return sendError(res, 403, {
        message: "Note limit exceeded for your current plan",
        details: {
          currentPlan: account.plan,
          noteCount: account.noteCount,
          maxNotes: limit.maxNotes,
          upgradeRequired: true,
        },
      });
    }

    next();
  } catch (error) {
    console.error("Note limit check error:", error);
    return sendError(res, 500, "Failed to check note limit");
  }
};

/**
 * Middleware to validate subscription plan
 */
const validateSubscriptionPlan = (req, res, next) => {
  const { plan } = req.body;

  if (plan && !Object.values(SUBSCRIPTION_PLANS).includes(plan)) {
    return sendError(res, 400, "Invalid subscription plan");
  }

  next();
};

/**
 * Middleware to check if account can be upgraded
 */
const checkUpgradeEligibility = async (req, res, next) => {
  try {
    if (!req.account && !req.tenant) {
      return sendError(res, 400, "Account context required");
    }

    const account = req.account || req.tenant;

    // Check if already on pro plan
    if (account.plan === SUBSCRIPTION_PLANS.PRO) {
      return sendError(res, 400, "Account is already on Pro plan");
    }

    // Check if account is active
    if (!account.isActive || account.isDeleted) {
      return sendError(res, 403, "Account must be active to upgrade");
    }

    next();
  } catch (error) {
    console.error("Upgrade eligibility check error:", error);
    return sendError(res, 500, "Failed to check upgrade eligibility");
  }
};

/**
 * Middleware to get subscription limits for current account
 */
const attachSubscriptionInfo = (req, res, next) => {
  if (!req.account) {
    return sendError(res, 400, "Account context required");
  }

  const account = req.account;
  const limits = SUBSCRIPTION_LIMITS[account.plan];

  req.subscriptionInfo = {
    plan: account.plan,
    limits: limits,
    usage: {
      noteCount: account.noteCount,
      maxNotes: limits ? limits.maxNotes : 0,
    },
    canCreateNote:
      account.plan === SUBSCRIPTION_PLANS.PRO ||
      (limits && account.noteCount < limits.maxNotes),
  };

  next();
};

module.exports = {
  checkNoteLimit,
  validateSubscriptionPlan,
  checkUpgradeEligibility,
  attachSubscriptionInfo,
};
