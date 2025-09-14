const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    roleName: {
      type: String,
      required: true,
      enum: ["admin", "member"],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for account and role combination
roleSchema.index({ account: 1, roleName: 1 });

module.exports = mongoose.model("Role", roleSchema);
