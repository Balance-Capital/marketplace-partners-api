const mongoose = require('mongoose'); 

const { Schema } = mongoose;

const Wallets = new Schema(
  {
    walletAddress: {
      type: String
    },
    walletName: {
      type: String
    },
    lastAddress: {
      type: String,
      default: null
    },
    default: {
      type: Boolean,
      default: true
    },
    lastIp: {
      type: String
    },
    userId: {
      type: String
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

Wallets.index({ userId: 1});
Wallets.index({ walletAddress: 1}, {unique: true});

const model = mongoose.model('Wallets', Wallets);
module.exports = model;