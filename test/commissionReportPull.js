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
const { encrypt } = require('../utils/encrypt_decrypt');
const reportData = require('./data/commission.json');
const { SKIM_LINKS } = require('../constants/partnersName');

describe("commission report pull", () => {
    let commission = [];

    beforeEach(async () => {
        commission = await Promise.all( reportData?.commissions?.map((item) => saveUnifyCommissionReport({
            ...item, 
            transactionDetails: {
              ...item.transaction_details,
              publisherAmountString: encrypt(`${item.transaction_details?.basket?.publisher_amount || 0}`)
            },
            customId: item.click_details.custom_id?.split(':')[0] || null,
            referralId: item.click_details.custom_id?.split(':')[1] || null,
            date: item.click_details.date,
            dataSource: SKIM_LINKS,
            commissionId: item.commission_id
          })));
    });

    it('should be a paid valid report', (done) => {
        this.timeout(15000);
        const item = commission[0];
        saveUnifyCommissionReport(item).then((testResult) => {
            expect(testResult).to.be.an('object')
                .that.has.property('record')
                .that.have.deep.property('transactionDetails')
                .that.have.deep.property('paymentStatus', 'paid')
            ;
            done();
        });    
    })
})
