const mongoose = require('mongoose'); 
const moment = require('moment');
const { 
  BALANCE_OPERATION_DEPOSIT, 
  BALANCE_OPERATION_WITHDRAW, 
  BALANCE_CURRENCY_USD, 
  ROLE_USER
} = require('../../constants/user');

const { Schema } = mongoose;

const Users = new Schema(
  {
    role: {
      type: Array,
      default: [ROLE_USER]
    },
    externalProviderName: {
      type: String,
      default: null
    },
    externalId: {
      type: String,
      default: null
    },
    firstName: {
      type: String,
      default: null
    },
    lastName: {
      type: String,
      default: null
    },
    avatar: {
      type: String,
      default: null
    },
    email: {
      type: String,
      default: null
    },
    userName: {
      type: String,
      required: true      
    },
    secret: {
      type: String,
      required: true      
    },
    cookieId: {
      type: Array,
      required: true
    },
    tokenValidDate: {
      type: Date,
      default: null
    },
    token: {
      type: String,
      default: null
    },
    lastIp: {
      type: String,
      default: null
    },
    walletAccount: {
      type: String,
      default: null
    },
    balance: {
      type: Number,
      default: 0
    },
    balanceSymbol: {
      type: String,
      default: BALANCE_CURRENCY_USD
    },    
    balanceHistory: {
      type: [{
        operationType: {
          type: String,
          default: null
        },
        operationDate: {
          type: Date,
          default: null
        },
        operationAmount: {
          type: Number,
          default: null
        },
        balanceBeforeOperationAmount: {
          type: Number,
          default: null
        },
        operationSymbol: {
          type: String,
          default: null
        }
      }]
    },
    referralId: {
      type: String
    },
    referralCode: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

Users.index({ userName: 1 },{unique: true});
Users.index({ cookieId: 1 },{unique: true});
Users.index({ referralId: 1 },{unique: true});

const getBalance = async function getBalance(userId) {
  const balance = await this.findOne({_id:userId}, {balance: 1}).exec();
  return balance.balance;
};

const changeBalance = async function changeBalance(amountOperation, userId, operationType, operationDate) {
  if(!operationType || !amountOperation || !userId || !operationDate) return null;
  const balanceBeforeOperationAmount = await this
    .findOne({_id:userId}, {balance:1})
    .then((result) => result && result.balance || 0);

  const balanceBefore = parseFloat(balanceBeforeOperationAmount).toPrecision(4) || 0;
  let operationAmount = parseFloat(amountOperation).toPrecision(4) || 0;
  let balanceAmount = 0;

  switch (operationType) {
    case BALANCE_OPERATION_DEPOSIT: balanceAmount = parseFloat(balanceBefore) + parseFloat(operationAmount); break;
    case BALANCE_OPERATION_WITHDRAW: balanceAmount = parseFloat(balanceBefore) > 0 
      ? parseFloat(balanceBefore) - parseFloat(operationAmount)
      : parseFloat(balanceBefore); break;
    default: operationAmount = parseFloat(balanceBefore);
  };

  const operationSymbol = BALANCE_CURRENCY_USD;

  const balanceHistory = {
      operationType,
      operationDate: moment(operationDate),
      operationAmount,
      balanceBeforeOperationAmount: parseFloat(balanceBefore),
      operationSymbol
  };

  await this.updateOne(
    {_id:userId}, 
    {
      $set: {
        balance: parseFloat(balanceAmount)
      },
      $push:{balanceHistory}
    });
  
  return parseFloat(balanceAmount);
};

const updateUserData = (userData) => {
  this.updateOne({_id: userData.id}, {
    firstName: userData.firstName,
    lastName: userData.lastName,
    avatar: userData.avatar
  }).exec();
};

Users.statics.getBalance = getBalance;
Users.statics.changeBalance = changeBalance;
Users.statics.updateUserData = updateUserData;
const model = mongoose.model('Users', Users);
module.exports = model;