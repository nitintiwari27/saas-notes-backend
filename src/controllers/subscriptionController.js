const Account = require("../models/Account");
const Subscription = require("../models/Subscription");
const Payment = require("../models/Payment");
const Invoice = require("../models/Invoice");
const {
  createOrder,
  verifyPaymentSignature,
  getPaymentDetails,
} = require("../config/razorpay");
const {
  sendResponse,
  sendError,
  generateRandomString,
} = require("../utils/helpers");
const { SUBSCRIPTION_PLANS, PAYMENT_STATUS } = require("../utils/constants");

/**
 * Get current subscription details
 * GET /subscription
 */
const getSubscription = async (req, res) => {
  try {
    const account = req.account;

    // Get current subscription
    const subscription = await Subscription.findOne({
      account: account._id,
      status: "active",
    });

    sendResponse(
      res,
      200,
      true,
      "Subscription details retrieved successfully",
      {
        account: {
          id: account._id,
          slug: account.slug,
          plan: account.plan,
          noteCount: account.noteCount,
          limit: account.limit,
          canCreateNote: account.canCreateNote,
        },
        subscription: subscription
          ? {
              id: subscription._id,
              plan: subscription.plan,
              status: subscription.status,
              startDate: subscription.startDate,
              endDate: subscription.endDate,
            }
          : null,
      }
    );
  } catch (error) {
    console.error("Get subscription error:", error);
    sendError(res, 500, "Failed to retrieve subscription details");
  }
};

/**
 * Upgrade tenant subscription to Pro
 * POST /tenants/:slug/upgrade
 */
const upgradeSubscription = async (req, res) => {
  try {
    const account = req.tenant; // From validateTenantSlug middleware
    const { paymentMethod = "razorpay" } = req.body;

    // Pro plan pricing (in INR)
    const proMonthlyPrice = 999; // ₹999 per month

    // Create payment order
    const receipt = `upgrade_${account.slug}_${generateRandomString(8)}`;
    const order = await createOrder(proMonthlyPrice, "INR", receipt);

    // Create payment record
    const payment = new Payment({
      account: account._id,
      razorpayOrderId: order.id,
      amount: proMonthlyPrice,
      currency: "INR",
      status: PAYMENT_STATUS.PENDING,
      method: paymentMethod,
    });

    await payment.save();

    sendResponse(res, 200, true, "Payment order created successfully", {
      orderId: order.id,
      amount: proMonthlyPrice,
      currency: "INR",
      receipt: receipt,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      paymentId: payment._id,
      order,
    });
  } catch (error) {
    console.error("Upgrade subscription error:", error);
    sendError(res, 500, "Failed to initiate subscription upgrade");
  }
};

/**
 * Verify payment and complete upgrade
 * POST /subscription/verify-payment
 */
const verifyPaymentAndUpgrade = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      paymentId,
    } = req.body;

    const account = req.account;

    // Validate required fields
    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !paymentId
    ) {
      return sendError(res, 400, "Missing required payment verification data");
    }

    // Find payment record
    const payment = await Payment.findOne({
      _id: paymentId,
      account: account._id,
      razorpayOrderId: razorpay_order_id,
      status: PAYMENT_STATUS.PENDING,
    });

    if (!payment) {
      return sendError(res, 404, "Payment record not found");
    }

    // Verify signature
    const isValidSignature = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValidSignature) {
      // Update payment status to failed
      payment.status = PAYMENT_STATUS.FAILED;
      payment.errorDescription = "Invalid payment signature";
      await payment.save();

      return sendError(res, 400, "Payment verification failed");
    }

    // Get payment details from Razorpay
    const paymentDetails = await getPaymentDetails(razorpay_payment_id);

    // Update payment record
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.status = PAYMENT_STATUS.SUCCESS;
    payment.method = paymentDetails.method;
    await payment.save();

    // Cancel existing subscription if any
    const existingSubscription = await Subscription.findOne({
      account: account._id,
      status: "active",
    });

    if (existingSubscription) {
      existingSubscription.status = "cancelled";
      existingSubscription.cancelledAt = new Date();
      await existingSubscription.save();
    }

    // Create new Pro subscription
    const subscription = new Subscription({
      account: account._id,
      plan: SUBSCRIPTION_PLANS.PRO,
      status: "active",
      startDate: new Date(),
      // For one-time payment, we'll set it for 1 year
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });

    await subscription.save();

    // Update payment with subscription reference
    payment.subscription = subscription._id;
    await payment.save();

    // Upgrade account immediately
    await account.upgradeToPro();
    account.currentSubscription = subscription._id;
    await account.save();

    sendResponse(res, 200, true, "Subscription upgraded successfully", {
      account: {
        id: account._id,
        slug: account.slug,
        plan: account.plan,
        limit: account.limit,
        noteCount: account.noteCount,
      },
      subscription: {
        id: subscription._id,
        plan: subscription.plan,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
      },
      payment: {
        id: payment._id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
      },
    });
  } catch (error) {
    console.error("Verify payment and upgrade error:", error);
    sendError(res, 500, "Failed to verify payment and upgrade subscription");
  }
};

/**
 * Get payment history
 * GET /subscription/payments
 */
const getPaymentHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const account = req.account;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Payment.countDocuments({ account: account._id });
    const totalPages = Math.ceil(total / parseInt(limit));

    // Fetch payments with pagination
    const payments = await Payment.find({ account: account._id })
      .populate("subscription")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    // Format response
    const formattedPayments = payments.map((payment) => ({
      id: payment._id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
      razorpayPaymentId: payment.razorpayPaymentId,
      subscription: payment.subscription
        ? {
            id: payment.subscription._id,
            plan: payment.subscription.plan,
          }
        : null,
      createdAt: payment.createdAt,
      errorCode: payment.errorCode,
      errorDescription: payment.errorDescription,
    }));

    sendResponse(res, 200, true, "Payment history retrieved successfully", {
      payments: formattedPayments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: totalPages,
      },
    });
  } catch (error) {
    console.error("Get payment history error:", error);
    sendError(res, 500, "Failed to retrieve payment history");
  }
};

/**
 * Cancel subscription
 * POST /subscription/cancel
 */
const cancelSubscription = async (req, res) => {
  try {
    const account = req.account;

    // Find active subscription
    const subscription = await Subscription.findOne({
      account: account._id,
      status: "active",
    });

    if (!subscription) {
      return sendError(res, 404, "No active subscription found");
    }

    // Cancel subscription
    await subscription.cancel();

    // Note: In a real application, you might want to keep Pro features until the end date
    // For this implementation, we'll downgrade immediately
    account.plan = SUBSCRIPTION_PLANS.FREE;
    account.limit = 3;
    account.currentSubscription = null;
    await account.save();

    sendResponse(res, 200, true, "Subscription cancelled successfully", {
      account: {
        id: account._id,
        slug: account.slug,
        plan: account.plan,
        limit: account.limit,
        noteCount: account.noteCount,
      },
      subscription: {
        id: subscription._id,
        status: subscription.status,
        cancelledAt: subscription.cancelledAt,
      },
    });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    sendError(res, 500, "Failed to cancel subscription");
  }
};

/**
 * Get subscription plans and pricing
 * GET /subscription/plans
 */
const getSubscriptionPlans = async (req, res) => {
  try {
    const plans = [
      {
        id: SUBSCRIPTION_PLANS.FREE,
        name: "Free Plan",
        price: 0,
        currency: "INR",
        interval: "month",
        features: ["Up to 3 notes", "Basic note management", "Tag support"],
        limits: {
          maxNotes: 3,
        },
      },
      {
        id: SUBSCRIPTION_PLANS.PRO,
        name: "Pro Plan",
        price: 999,
        currency: "INR",
        interval: "month",
        features: [
          "Unlimited notes",
          "Advanced note management",
          "Tag support",
          "Search functionality",
          "Priority support",
        ],
        limits: {
          maxNotes: -1, // unlimited
        },
      },
    ];

    sendResponse(res, 200, true, "Subscription plans retrieved successfully", {
      plans,
    });
  } catch (error) {
    console.error("Get subscription plans error:", error);
    sendError(res, 500, "Failed to retrieve subscription plans");
  }
};

module.exports = {
  getSubscription,
  upgradeSubscription,
  verifyPaymentAndUpgrade,
  getPaymentHistory,
  cancelSubscription,
  getSubscriptionPlans,
};
