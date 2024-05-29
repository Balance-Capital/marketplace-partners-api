/* eslint-disable consistent-return */
/* eslint-disable no-underscore-dangle */
/* eslint-disable prefer-destructuring */
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const moment = require('moment');
const os = require('os');
const { ObjectId } = require('bson');

const db = require('../models/index');
const apiDb = require('../models/apiDatabase');
const UnifyCommissionData = require('../objects/UnifyCommissionData');
const ReferralData = require('../objects/Referral');

const {
    REFERRALS_STATUS_PENDING,
    REFERRALS_STATUS_DONE
} = require('../constants/referralsStatus');

const {
    TRANSACTION_STATUS_NO_ACTIVE,
    TRANSACTION_STATUS_ACTIVE,
    WITHDRAW_STATUS_OFF,
    PAYMENT_STATUS_PAID,
    PAYMENT_STATUS_UNPAID
} = require('../constants/salesReport')

const {
    BALANCE_OPERATION_DEPOSIT
} = require('../constants/user');

const {
    encrypt,
    decrypt
} = require('../utils/encrypt_decrypt');

const {
    signByServer,
    signByUser
} = require('../utils/sign');

const uCommissionReportProof = require('../proofs/uCommissionReportProof');
const referralsCommissionReportProof = require('../proofs/referralsCommissionReportProof');
const { getCurrentRate } = require("./currencyConverter");

const intermediateFingerprint = process.env.FINGERPRINT || null;

const logger = require("./logger");

const addPaidTransaction = async ({publisherAmountString, cookieId}) => {
    try {
        const amountOperation = +decrypt(publisherAmountString); 
        const userId = await apiDb.apiDatabase.model('Users', apiDb.models.Users.schema).findOne({
            cookieId
        }).then((user) => user?._id || null); 
        if(!userId) return null;
        const operationType = BALANCE_OPERATION_DEPOSIT;
        const operationDate = moment().toDate();
        apiDb.apiDatabase.model('Users', apiDb.models.Users.schema).changeBalance(
            amountOperation,
            userId,
            operationType,
            operationDate
        );     
    } catch (err) {
        logger.warning(`[unifyCommissionReport] addPaidTransaction issue ${err?.message}`, err, publisherAmountString, cookieId);
    }
};

const addPaidReferral = async ({amountString, referralId}) => {
    try {
        const amountOperation = +decrypt(amountString); 
        const userId = await apiDb.apiDatabase.model('Users', apiDb.models.Users.schema).findOne({
            referralId
        }).then((user) => user?._id || null); 
        if(!userId) return null;
        const operationType = BALANCE_OPERATION_DEPOSIT;
        const operationDate = moment().toDate();
        apiDb.apiDatabase.model('Users', apiDb.models.Users.schema).changeBalance(
            amountOperation,
            userId,
            operationType,
            operationDate
        );    
    } catch(err) {
        logger.warning(`[unifyCommissionReport] addPaidReferral issue ${err?.message}`, err, amountString, referralId);
    }
};

const ifReferral = async(data, record, reportId) => {
    if(!data || !record || !reportId) return null;
    let referral = null;
    try {
        referral = Object.create(ReferralData);
        if(data.referralId) {
            referral.transactionDate = moment(data.transaction_details.transaction_date).toISOString();
            referral.referral = data.referralId;
            referral.status = data.transaction_details.payment_status ===  PAYMENT_STATUS_PAID ? REFERRALS_STATUS_DONE : REFERRALS_STATUS_PENDING;
            const commission = (record.transactionDetails.publisherAmount * process.env.REFERRAL_COMMISSION_AMOUNT || 10)/100;
            referral.refBonus = commission;
            referral.refBonusString = encrypt(referral.refBonus.toString());
            const publisherAmount = record.transactionDetails.publisherAmount - commission;
            // eslint-disable-next-line operator-assignment, no-param-reassign
            record.transactionDetails = {
                ...record.transactionDetails,
                publisherAmount,
                publisherAmountString : encrypt(publisherAmount.toString())                
            };

            referral.transactionId = reportId.toString();
            referral.currency = record.transactionDetails.currency;
            
            const exists = await apiDb.apiDatabase.model('referrals', apiDb.models.Referrals.schema)
                .findOne({transactionId: referral.transactionId}).then((report) => report || null);
            if(exists) return {...exists, exists: true};                   

            // sign proof record
            const proof = Object.create(referralsCommissionReportProof);
            proof.currency = referral.currency;
            proof.refBonus = referral.refBonus;
            proof.transactionId = referral.transactionId;
            proof.createdAt = data.date;

            const signedByServer = await signByServer(proof);
            const signedByUser = await signByUser(proof, intermediateFingerprint);
            referral.signed = [{
                timestamp: moment().toDate(),
                value: signedByServer,
                name: os.hostname()
            },{
                timestamp: moment().toDate(),
                value: signedByUser,
                name: 'intermediate'
            }];

            return await apiDb.apiDatabase.model('referrals', apiDb.models.Referrals.schema)
                .insertMany([referral],{upset:true,ordered:false}).then(async() => {
                    await db.models.UnifyCommissionReport.updateOne({_id: new ObjectId(reportId.toString())}, record).exec();
                    return {...referral, exists: false};               
                }
            );
        };
    } catch(err) {
        logger.warning(`[unifyCommissionReport] ifReferral issue ${err?.message}`, err, data, record, reportId);
    } finally {
        // eslint-disable-next-line no-unsafe-finally
        return referral;
    }
};

const updateRecord = async (oldRecord, newRecord) => {
    try {
        const updatedRecord = oldRecord;
        if( (updatedRecord.transactionDetails.paymentStatus !== newRecord.transaction_details.payment_status) 
            && (newRecord.transaction_details.payment_status !== PAYMENT_STATUS_UNPAID && updatedRecord.transactionDetails.paymentStatus !== PAYMENT_STATUS_PAID) ) {
    
            updatedRecord.transactionDetails.status = newRecord.transaction_details.status;
            updatedRecord.transactionDetails.paymentStatus = newRecord.transaction_details.payment_status;
            await db.models.UnifyCommissionReport.findOneAndUpdate({_id:updatedRecord._id}, updatedRecord);
    
            if(newRecord.transaction_details.payment_status === PAYMENT_STATUS_PAID) {
    
                const publisherAmountString = +decrypt(await db.models.UnifyCommissionReport.findOne({_id: updatedRecord._id}).then((report) => report.transactionDetails.publisherAmountString));
    
                const referral = await apiDb.apiDatabase.model('referral', apiDb.models.Referrals.schema).findOne({
                    referralId: newRecord.referralId,
                    transactionId: updatedRecord._id
                }).exec().then((result) => result);
                
                if(referral) {
                    await apiDb.apiDatabase.model('referral', apiDb.models.Referrals.schema).updateOne({_id: referral._id}, {
                        status: REFERRALS_STATUS_DONE
                    })
        
                    await addPaidReferral({
                        amountString: referral.refBonusString,
                        referralId: newRecord.referralId
                    });        
                }
    
                await addPaidTransaction({
                    publisherAmountString:encrypt(publisherAmountString.toString()), 
                    cookieId: newRecord.customId
                });   
                
            }
        }    
    } catch(err) {
        logger.warning(`[unifyCommissionReport] updateRecord issue ${err?.message}`, err, oldRecord, newRecord);
    }
};

// REFACTOR: make transaction
const saveUnifyCommissionReport = async (data) => {
    let record = null;
    let referral = null;
    let isExists = null;
    try {
        const query = {
            commissionId: data.commission_id || null
        };    
        record = await db.models.UnifyCommissionReport.findOne(query).exec();
        if(record) {
            await updateRecord(record, data);
            isExists = true;
        } else {
            // convert if currency other than usd
            const transactionCurrency = data.transaction_details.basket.currency.toLowerCase();
            const rate = await getCurrentRate(transactionCurrency);

            const currency = transactionCurrency === 'usd' 
                ? data.transaction_details.basket.currency
                : 'USD';
            const orderAmount = transactionCurrency === 'usd' 
                ? data.transaction_details.basket.order_amount
                : data.transaction_details.basket.order_amount * rate;
            const publisherAmount = transactionCurrency === 'usd' 
                ? data.transaction_details.basket.publisher_amount
                : data.transaction_details.basket.publisher_amount * rate;
            const currencyRate = transactionCurrency === 'usd'
                ? undefined
                : rate;
            const currencyPair = transactionCurrency === 'usd'
                ? undefined
                : data.transaction_details.basket.currency;

            isExists = false;
            record = Object.create(UnifyCommissionData);
            record.commissionId = data.commissionId;
            record.customId = data.customId;
            record.dataSource = data.dataSource;
            record.date = moment(data.date).toDate();
            record.userCountry = data.click_details.user_country || null;
            record.merchantDetails = { 
                id : data.merchant_details.id, 
                name : data.merchant_details.name 
            };
            record.transactionDetails = {
                commissionType : data.transaction_details?.basket?.commission_type,
                currency,
                currencyRate,
                currencyPair,
                invoiceId : data.transaction_details.invoice_id,
                items : data.transaction_details.basket.items,
                lastUpdated : moment(data.transaction_details.last_updated).toDate(),
                orderAmount,
                paymentStatus : data.transaction_details.payment_status === PAYMENT_STATUS_PAID ? PAYMENT_STATUS_PAID : PAYMENT_STATUS_UNPAID,
                publisherAmount,
                publisherAmountString : encrypt(publisherAmount.toString()),
                status : data.transaction_details.status === TRANSACTION_STATUS_ACTIVE ? TRANSACTION_STATUS_ACTIVE : TRANSACTION_STATUS_NO_ACTIVE,
                transactionDate : moment(data.transaction_details.transaction_date).toDate(),
                withDrawStatus : WITHDRAW_STATUS_OFF
            };

            const reportId = await db.models.UnifyCommissionReport.insertMany(record,{upset:true,ordered:false}).then(r=>r[0]._id);
            
            if(data.referralId && data.referralId !== 'null') {
                referral = await ifReferral(data, record, reportId);
            };
            
            if(record.transactionDetails.paymentStatus === PAYMENT_STATUS_PAID) {
                const publisherAmountString = await db.models.UnifyCommissionReport.findOne({_id: new ObjectId(reportId)}).then((report) => report.transactionDetails.publisherAmountString);
                await addPaidTransaction({
                    publisherAmountString, 
                    cookieId: record.customId
                })

                if(data.referralId && data.referralId !== 'null' && referral) {
                    await addPaidReferral({
                        amountString: referral.refBonusString, 
                        referralId: data.referralId
                    });    
                }
            };

            // sign record, make a proof
            const signData = await db.models.UnifyCommissionReport.findOne({_id: new ObjectId(reportId)},{transactionDetails:1}).exec();
            
            const proof = Object.create(uCommissionReportProof);
            proof.orderAmount = signData?.transactionDetails?.orderAmount;
            proof.publisherAmount = signData?.transactionDetails?.publisherAmount;
            proof.currency = signData?.transactionDetails?.currency;
            proof.createdAt = moment(data.date).toDate();

            const signedByServer = await signByServer(proof);
            const signedByUser = await signByUser(proof, intermediateFingerprint);
            const signed = [{
                value: signedByServer,
                timestamp: moment().toDate(),
                name: os.hostname()
            },{
                timestamp: moment().toDate(),
                value: signedByUser,
                name: 'intermediate'
            }];
            await db.models.UnifyCommissionReport.updateOne({_id: new ObjectId(reportId)},{signed}).exec();
        };
    } catch(err) {
        logger.warning(`[unifyCommissionReport] saveUnifyCommissionReport ${err?.message}`, err, data);
    } finally {
        // eslint-disable-next-line no-unsafe-finally
        return {record, referral, isExists};
    }
}

module.exports = {
    saveUnifyCommissionReport
}