/* eslint-disable no-underscore-dangle */
/* eslint-disable no-unused-expressions */
/* eslint-disable no-undef */
const { expect } = require("chai");
const moment = require('moment');
const { saveUnifyCommissionReport } = require('../services/unifyCommissionReport');
const UnifyCommissionData = require('../objects/UnifyCommissionData');
const db = require('../models/index');
const apiDb = require('../models/apiDatabase');
// const ReferralData = require('../objects/Referral');

const {
    encrypt,
    decrypt
} = require('../utils/encrypt_decrypt');

describe("commission report", () => {

    let testResult = null;
    let user1Id = null;
    let user2Id = null;
    const cookieId = "43502c5b-a6b4-4e73-ac84-d22b240ftest";
    const referralId =  "test80610";
    const cookieId2 = "3502c5b-a6b4-4e73-ac84-d22b240ftest2";
    const referralId2 =  "test28061";
    const customIdWithReferral = `${cookieId}:${referralId}`;
    const customIdWithoutReferral = `${cookieId}:null`;

    const paidReportDataWithReferral = () => {
        const record = {
            "click_details": {
                "clicked_url": "https://www.bedbathandbeyond.ca/store/brand/oxo/2295?skimoffer=1651075",
                "custom_id": customIdWithReferral,
                "date": "2024-01-16 11:45:04",
                "normalized_page_referrer": null,
                "normalized_page_url": "xxx.com",
                "page_url": "https://xxx.com/",
                "platform": "Web",
                "user_agent": "",
                "user_country": "US"
            },
            "commission_id": 387934481,
            "merchant_details": {
                "advertiser_id": 28117,
                "advertiser_name": "Bed Bath and Beyond",
                "id": 460410,
                "merchant_id": 460410,
                "merchant_name": "Bed Bath & Beyond",
                "name": "Bed Bath & Beyond"
            },
            "publisher_domain_id": 1655937,
            "publisher_id": 185785,
            "transaction_details": {
                "aggregation_id": "3008560901",
                "basket": {
                    "commission_type": "CPA",
                    "currency": "EUR",
                    "items": 1,
                    "order_amount": 248.71766639999998,
                    "publisher_amount": 5.595860489999999
                },
                "invoice_id": null,
                "last_updated": "2024-01-17 16:37:12",
                "payment_status": "paid",
                "status": "active",
                "transaction_date": "2024-01-16 11:45:42"
            }
        };
        return {
            ...record,
            transactionDetails: {
                ...record.transaction_details,
                publisherAmountString: encrypt(`${record.transaction_details?.basket?.publisher_amount || 0}`)
            },
            customId: record.click_details.custom_id?.split(':')[0] || null,
            referralId: record.click_details.custom_id?.split(':')[1] || null,
            date: record.click_details.date,
            dataSource: 'fake_data',
            commissionId: record.commission_id    
        }
    }

    const paidReportDataWithoutReferral = () => {
        const record = {
            "click_details": {
                "clicked_url": "https://www.bedbathandbeyond.ca/store/brand/oxo/2295?skimoffer=1651075",
                "custom_id": customIdWithoutReferral,
                "date": "2024-01-16 11:45:04",
                "normalized_page_referrer": null,
                "normalized_page_url": "xxx.com",
                "page_url": "https://xxx.com/",
                "platform": "Web",
                "user_agent": "",
                "user_country": "US"
            },
            "commission_id": 387934481,
            "merchant_details": {
                "advertiser_id": 28117,
                "advertiser_name": "Bed Bath and Beyond",
                "id": 460410,
                "merchant_id": 460410,
                "merchant_name": "Bed Bath & Beyond",
                "name": "Bed Bath & Beyond"
            },
            "publisher_domain_id": 1655937,
            "publisher_id": 185785,
            "transaction_details": {
                "aggregation_id": "3008560901",
                "basket": {
                    "commission_type": "CPA",
                    "currency": "EUR",
                    "items": 1,
                    "order_amount": 248.71766639999998,
                    "publisher_amount": 5.595860489999999
                },
                "invoice_id": null,
                "last_updated": "2024-01-17 16:37:12",
                "payment_status": "paid",
                "status": "active",
                "transaction_date": "2024-01-16 11:45:42"
            }
        };
        return {
            ...record,
            transactionDetails: {
                ...record.transaction_details,
                publisherAmountString: encrypt(`${record.transaction_details?.basket?.publisher_amount || 0}`)
            },
            customId: record.click_details.custom_id?.split(':')[0] || null,
            referralId: record.click_details.custom_id?.split(':')[1] || null,
            date: record.click_details.date,
            dataSource: 'fake_data',
            commissionId: record.commission_id    
        }
    }

    const unpaidReportDataWithReferral = () => {
        const record = {
            "click_details": {
                "clicked_url": "https://www.bedbathandbeyond.ca/store/brand/oxo/2295?skimoffer=1651075",
                "custom_id": customIdWithReferral,
                "date": "2024-01-16 11:45:04",
                "normalized_page_referrer": null,
                "normalized_page_url": "xxx.com",
                "page_url": "https://xxx.com/",
                "platform": "Web",
                "user_agent": "",
                "user_country": "US"
            },
            "commission_id": 387934481,
            "merchant_details": {
                "advertiser_id": 28117,
                "advertiser_name": "Bed Bath and Beyond",
                "id": 460410,
                "merchant_id": 460410,
                "merchant_name": "Bed Bath & Beyond",
                "name": "Bed Bath & Beyond"
            },
            "publisher_domain_id": 1655937,
            "publisher_id": 185785,
            "transaction_details": {
                "aggregation_id": "3008560901",
                "basket": {
                    "commission_type": "CPA",
                    "currency": "EUR",
                    "items": 1,
                    "order_amount": 248.71766639999998,
                    "publisher_amount": 5.595860489999999
                },
                "invoice_id": null,
                "last_updated": "2024-01-17 16:37:12",
                "payment_status": "unpaid",
                "status": "active",
                "transaction_date": "2024-01-16 11:45:42"
            }
        };
        return {
            ...record,
            transactionDetails: {
                ...record.transaction_details,
                publisherAmountString: encrypt(`${record.transaction_details?.basket?.publisher_amount || 0}`)
            },
            customId: record.click_details.custom_id?.split(':')[0] || null,
            referralId: record.click_details.custom_id?.split(':')[1] || null,
            date: record.click_details.date,
            dataSource: 'fake_data',
            commissionId: record.commission_id    
        }
    }

    const unpaidReportDataWithoutReferral = () => {
        const record = {
            "click_details": {
                "clicked_url": "https://www.bedbathandbeyond.ca/store/brand/oxo/2295?skimoffer=1651075",
                "custom_id": customIdWithoutReferral,
                "date": "2024-01-16 11:45:04",
                "normalized_page_referrer": null,
                "normalized_page_url": "xxx.com",
                "page_url": "https://xxx.com/",
                "platform": "Web",
                "user_agent": "",
                "user_country": "US"
            },
            "commission_id": 387934481,
            "merchant_details": {
                "advertiser_id": 28117,
                "advertiser_name": "Bed Bath and Beyond",
                "id": 460410,
                "merchant_id": 460410,
                "merchant_name": "Bed Bath & Beyond",
                "name": "Bed Bath & Beyond"
            },
            "publisher_domain_id": 1655937,
            "publisher_id": 185785,
            "transaction_details": {
                "aggregation_id": "3008560901",
                "basket": {
                    "commission_type": "CPA",
                    "currency": "EUR",
                    "items": 1,
                    "order_amount": 248.71766639999998,
                    "publisher_amount": 5.595860489999999
                },
                "invoice_id": null,
                "last_updated": "2024-01-17 16:37:12",
                "payment_status": "unpaid",
                "status": "active",
                "transaction_date": "2024-01-16 11:45:42"
            }
        };
        return {
            ...record,
            transactionDetails: {
                ...record.transaction_details,
                publisherAmountString: encrypt(`${record.transaction_details?.basket?.publisher_amount || 0}`)
            },
            customId: record.click_details.custom_id?.split(':')[0] || null,
            referralId: record.click_details.custom_id?.split(':')[1] || null,
            date: record.click_details.date,
            dataSource: 'fake_data',
            commissionId: record.commission_id    
        }
    }

    const createUser = () => {
        return apiDb.apiDatabase.model('users', apiDb.models.Users.schema).insertMany([{
          externalProviderName: 'test1',
          externalId: 'test1',
          secret: 'test1',
          cookieId: [cookieId],
          userName: 'test1',
          walletAccount: null,
          referralId: referralId,
          email: 'test1@test.com',
          lastIp: ':00',
          firstName: 'Test1',
          referralCode: referralId2
        }, {
            externalProviderName: 'test2',
            externalId: 'test2',
            secret: 'test2',
            cookieId: [cookieId2],
            userName: 'test2',
            walletAccount: null,
            referralId: referralId2,
            email: 'test2@test.com',
            lastIp: ':00',
            firstName: 'Test2',
            referralCode: null
        }])        
    }

    before(async () => {
        await createUser();
        user1Id = await apiDb.apiDatabase.model('users', apiDb.models.Users.schema).findOne({externalId: 'test1'}).exec().then((r)=>r._id);
        user2Id = await apiDb.apiDatabase.model('users', apiDb.models.Users.schema).findOne({externalId: 'test2'}).exec().then((r)=>r._id);
    })

    after(async () => {
        await apiDb.apiDatabase.model('users', apiDb.models.Users.schema).deleteMany({_id: {$in:[user1Id, user2Id]}}).exec();
    })

    beforeEach(async () => {
        testResult = null;
    })

    afterEach(async () => {
        if(testResult) {
            await db.models.UnifyCommissionReport.deleteOne({dataSource: testResult.record.dataSource}).exec();
            await apiDb.apiDatabase.model('referrals', apiDb.models.Referrals.schema).deleteMany({
                referral: testResult.referral.referral
            }).exec();
        }
    })

    it('should be a user Id', (done) => {
        console.log(user1Id, user2Id)
        done();
    })

    it('should be a paid valid report with referral', (done) => {
        const report = paidReportDataWithReferral();
        saveUnifyCommissionReport(report).then((result) => {
            testResult = result;
            expect(testResult).to.be.an('object')
                .that.has.property('record')
                .that.have.deep.property('transactionDetails')
                .that.have.deep.property('paymentStatus', 'paid')
            ;
            done();
        });
    })

    it('should be a unpaid valid report with referral', (done) => {
        const unpaid = unpaidReportDataWithReferral();
        saveUnifyCommissionReport(unpaid).then((result) => {
            testResult = result;
            expect(testResult).to.be.an('object')
                .that.has.property('record')
                .that.have.deep.property('transactionDetails')
                .that.have.deep.property('paymentStatus', 'unpaid')
            ;
            done();
        });
    })

    // it('should be a change unpaid to paid valid report', (done) => {
    //     const unpaidDone = unPaidReportDataDone();
    //     saveUnifyCommissionReport(unpaidDone).then((result) => {
    //         testResult = result;
    //         expect(testResult).to.be.an('object')
    //             .that.has.property('record')
    //             .that.have.deep.property('transactionDetails')
    //             .that.have.deep.property('paymentStatus', 'paid')
    //         ;
    //         done();
    //     });
    // })

    // it('should be a exists true', (done) => {
    //     const unpaid = unPaidReportData();
    //     saveUnifyCommissionReport(unpaid).then((resultA) => {
    //         testResult = resultA;
    //         saveUnifyCommissionReport(unpaid).then((resultB) => {
    //             testResult = resultB;
    //             expect(testResult).to.be.an('object').that.has.own.property('isExists', true);
    //             done();
    //         });
    //     });
    // })

})