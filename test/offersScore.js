/* eslint-disable no-undef */
const { expect } = require("chai");
const db = require('../models/index');

describe("scoreOffers", () => {
    
    it('should have property bestDiscount', (done) => {
        const storeId = '6076ccb1493c1566e73178f8';
        db.models.Stores.offersScoreFunction(storeId).then(result => {
            expect(result).to.have.own.property('bestDiscount');
            done();
        });
    })

});