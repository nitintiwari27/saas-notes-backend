const mongoose = require("mongoose");
const { PAYMENT_STATUS } = require("../utils/constants");

const paymentSchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
    },
    razorpayPaymentId: {
      type: String,
      unique: true,
      sparse: true,
    },
    razorpayOrderId: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },
    method: {
      type: String, // card, netbanking, wallet, upi, etc.
    },
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
    },
    errorCode: {
      type: String,
    },
    errorDescription: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
paymentSchema.index({ account: 1, status: 1 });
paymentSchema.index({ razorpayPaymentId: 1 });
paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Payment", paymentSchema);
