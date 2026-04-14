const mongoose = require("mongoose");

const passwordResetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "UserProfile",
    },

    token: {
      type: String,
      required: true,
      unique: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    used: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// optional: auto-delete expired tokens
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports =
  mongoose.models.PasswordResetToken ||
  mongoose.model("PasswordResetToken", passwordResetSchema);