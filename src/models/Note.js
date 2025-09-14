const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 10000,
    },
    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tag",
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
noteSchema.index({ account: 1, isDeleted: 1 });
noteSchema.index({ account: 1, user: 1, isDeleted: 1 });
noteSchema.index({ account: 1, tags: 1, isDeleted: 1 });
noteSchema.index({ createdAt: -1 });

// Text search index for title and description
noteSchema.index(
  {
    title: "text",
    description: "text",
  },
  {
    weights: { title: 10, description: 5 },
  }
);

module.exports = mongoose.model("Note", noteSchema);
