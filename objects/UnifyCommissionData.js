const UnifyCommissionData = {
  signed: {
    value: String,
    timestamp: Date
  },
  commissionId: String,
  dataSource: String,
  customId: String,
  date: Date,
  userCountry: String,
  merchantDetails: {
    id: String,
    name: String
  },
  transactionDetails: {
    commissionType: String,
    currency: String,
    currencyRate: Number,
    currencyPair: String,
    items: Number,
    orderAmount: Number,
    publisherAmount: Number,
    publisherAmountString: String,
    invoiceId: String,
    lastUpdated: Date,
    paymentStatus: String,
    status: String,
    withDrawStatus: String,
    transactionDate: Date
  }
};

module.exports = UnifyCommissionData;