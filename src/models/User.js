const mongoose = require("mongoose");
const { hashPassword } = require("../utils/helpers");

const userSchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    tokensInvalidBefore: {
      type: Date,
      default: Date.now,
    },
    lastLogin: {
      type: Date,
    },
    lastIP: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index for email and account
userSchema.index({ email: 1, account: 1 }, { unique: true });
userSchema.index({ account: 1, isActive: 1, isDeleted: 1 });

// Pre-save middleware to hash password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    this.password = await hashPassword(this.password);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to invalidate all tokens
userSchema.methods.invalidateTokens = function () {
  this.tokensInvalidBefore = new Date();
  return this.save();
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.tokensInvalidBefore;
  return user;
};

module.exports = mongoose.model("User", userSchema);
