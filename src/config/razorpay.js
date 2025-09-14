const Razorpay = require("razorpay");
const crypto = require("crypto");

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Create Razorpay order
 */
const createOrder = async (amount, currency = "INR", receipt) => {
  try {
    const options = {
      amount: Math.round(amount * 100), // Amount in paise
      currency,
      receipt,
      payment_capture: 1, // Auto capture payment
    };

    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error("Razorpay create order error:", error);
    throw new Error("Failed to create payment order");
  }
};

/**
 * Verify Razorpay payment signature
 */
const verifyPaymentSignature = (orderId, paymentId, signature) => {
  try {
    const body = orderId + "|" + paymentId;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    return expectedSignature === signature;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
};

/**
 * Get payment details from Razorpay
 */
const getPaymentDetails = async (paymentId) => {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error("Razorpay get payment error:", error);
    throw new Error("Failed to fetch payment details");
  }
};

/**
 * Create subscription plan on Razorpay
 */
const createSubscriptionPlan = async (planData) => {
  try {
    const plan = await razorpay.plans.create(planData);
    return plan;
  } catch (error) {
    console.error("Razorpay create plan error:", error);
    throw new Error("Failed to create subscription plan");
  }
};

/**
 * Create subscription on Razorpay
 */
const createSubscription = async (subscriptionData) => {
  try {
    const subscription = await razorpay.subscriptions.create(subscriptionData);
    return subscription;
  } catch (error) {
    console.error("Razorpay create subscription error:", error);
    throw new Error("Failed to create subscription");
  }
};

/**
 * Cancel subscription on Razorpay
 */
const cancelSubscription = async (subscriptionId, cancelAtCycleEnd = false) => {
  try {
    const subscription = await razorpay.subscriptions.cancel(
      subscriptionId,
      cancelAtCycleEnd
    );
    return subscription;
  } catch (error) {
    console.error("Razorpay cancel subscription error:", error);
    throw new Error("Failed to cancel subscription");
  }
};

/**
 * Create refund
 */
const createRefund = async (paymentId, amount, notes = {}) => {
  try {
    const refund = await razorpay.payments.refund(paymentId, {
      amount: Math.round(amount * 100), // Amount in paise
      notes,
    });
    return refund;
  } catch (error) {
    console.error("Razorpay refund error:", error);
    throw new Error("Failed to create refund");
  }
};

module.exports = {
  razorpay,
  createOrder,
  verifyPaymentSignature,
  getPaymentDetails,
  createSubscriptionPlan,
  createSubscription,
  cancelSubscription,
  createRefund,
};
