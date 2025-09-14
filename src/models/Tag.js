const mongoose = require("mongoose");

const tagSchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    tagName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 50,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index for account and tag name
tagSchema.index({ account: 1, tagName: 1 }, { unique: true });

// Static method to find or create tag
tagSchema.statics.findOrCreate = async function (account, tagName) {
  const normalizedTagName = tagName.toLowerCase().trim();

  let tag = await this.findOne({
    account,
    tagName: normalizedTagName,
  });

  if (!tag) {
    tag = await this.create({
      account,
      tagName: normalizedTagName,
    });
  }

  return tag;
};

module.exports = mongoose.model("Tag", tagSchema);
