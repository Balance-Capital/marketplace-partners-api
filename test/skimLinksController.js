/* eslint-disable no-undef */
const { expect } = require("chai");
const { prepareToExportOffers } = require('../controllers/SkimLinksController');

describe("skimLinksController", () => {

    // after(()=>process.exit());

    it('should return an array', (done) => {
        prepareToExportOffers(1,0).then(result => {
            expect(result).to.be.an('array');
            done();
        });
    }).timeout(10000);

    it('should have property title', (done) => {
        prepareToExportOffers(1,0).then(result => {
            expect(result[0]).haveOwnProperty('title');
            done();
        });
    }).timeout(10000);
});