const mongoose = require("mongoose");
const { INVOICE_STATUS } = require("../utils/constants");

const invoiceSchema = new mongoose.Schema(
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
    razorpayInvoiceId: {
      type: String,
      unique: true,
      sparse: true,
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
      enum: Object.values(INVOICE_STATUS),
      default: INVOICE_STATUS.PENDING,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    paidAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
invoiceSchema.index({ account: 1, status: 1 });
invoiceSchema.index({ razorpayInvoiceId: 1 });
invoiceSchema.index({ dueDate: 1 });
invoiceSchema.index({ issuedAt: -1 });

// Method to mark as paid
invoiceSchema.methods.markAsPaid = function () {
  this.status = INVOICE_STATUS.PAID;
  this.paidAt = new Date();
  return this.save();
};

module.exports = mongoose.model("Invoice", invoiceSchema);
