const mongoose = require("mongoose");
const { SUBSCRIPTION_PLANS } = require("../utils/constants");

const accountSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    plan: {
      type: String,
      enum: Object.values(SUBSCRIPTION_PLANS),
      default: SUBSCRIPTION_PLANS.FREE,
    },
    limit: {
      type: Number,
      default: 3, // Free plan limit
    },
    noteCount: {
      type: Number,
      default: 0,
    },
    currentSubscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
// accountSchema.index({ slug: 1 });
accountSchema.index({ slug: 1 }, { unique: true });
accountSchema.index({ isActive: 1, isDeleted: 1 });

// Virtual to check if account can create more notes
accountSchema.virtual("canCreateNote").get(function () {
  if (this.plan === SUBSCRIPTION_PLANS.PRO) return true;
  return this.noteCount < this.limit;
});

// Method to increment note count
accountSchema.methods.incrementNoteCount = function () {
  this.noteCount += 1;
  return this.save();
};

// Method to decrement note count
accountSchema.methods.decrementNoteCount = function () {
  if (this.noteCount > 0) {
    this.noteCount -= 1;
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to upgrade subscription
accountSchema.methods.upgradeToPro = function () {
  this.plan = SUBSCRIPTION_PLANS.PRO;
  this.limit = -1; // Unlimited
  return this.save();
};

module.exports = mongoose.model("Account", accountSchema);
