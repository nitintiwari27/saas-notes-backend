const mongoose = require("mongoose");
const { SUBSCRIPTION_PLANS } = require("../utils/constants");

const subscriptionSchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    razorpaySubscriptionId: {
      type: String,
      sparse: true, // Allows null values but enforces uniqueness when present
    },
    plan: {
      type: String,
      enum: Object.values(SUBSCRIPTION_PLANS),
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "cancelled", "expired"],
      default: "active",
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
subscriptionSchema.index({ account: 1, status: 1 });
subscriptionSchema.index({ razorpaySubscriptionId: 1 });
subscriptionSchema.index({ endDate: 1 });

// Method to cancel subscription
subscriptionSchema.methods.cancel = function () {
  this.status = "cancelled";
  this.cancelledAt = new Date();
  return this.save();
};

// Method to check if subscription is active
subscriptionSchema.methods.isActive = function () {
  if (this.status !== "active") return false;
  if (this.endDate && this.endDate < new Date()) return false;
  return true;
};

module.exports = mongoose.model("Subscription", subscriptionSchema);
