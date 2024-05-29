/* eslint-disable no-undef */
const { expect } = require('chai');
const {
  prepareToExportOffers,
  auth,
  getOffers
} = require('../controllers/EbayController');

describe('eBayController', () => {
  
  // after(() => process.exit());

  let offersParams;
  const TIMEOUT = 10000;

  before(()=>{
    offersParams = {
      clientId: 'EnticeBV-couponap-PRD-bfa91919d-7d369faf',
      clientSecret: 'PRD-fa91919d19fa-bd2b-4aaf-8e89-bf97',
      devid: '7a05d4b0-4938-4a0e-be48-21143004e8c0',
      redirectUri: '-- redirect uri ---',
      limit: 10,
      offset: 0,
      sortBy: 'id',
      url: 'https://api.ebay.com/buy/deal/v1/deal_item',
      token: null,
      scope: [
        // 'https://api.ebay.com/oauth/api_scope',
        'https://api.ebay.com/oauth/api_scope/buy.deal'
        // 'https://api.ebay.com/oauth/api_scope/buy.product.feed'
        // 'https://api.ebay.com/oauth/api_scope/buy.item.bulk'
      ]
    };  
  });

  it('should return login token', (done) => {
    auth(offersParams).then((result) => {
      expect(result).contains('v^1.1#');
      done();
    });
  }).timeout(TIMEOUT);

  it('should wrong login token', (done) => {
    const tempOffersParams = offersParams.clientId;
    offersParams.clientId = null;
    auth(offersParams).then((result) => {
      expect(result).contains('error');
      done();
      offersParams.clientId = tempOffersParams;
    });
  }).timeout(TIMEOUT);

  it('should return array and have properties origin and partnerSource', (done) => {
    prepareToExportOffers(1,0).then(result=>{
      expect(result).to.be.an('array');
      expect(result[0]).haveOwnProperty('origin', 'ebay.com');
      expect(result[0]).haveOwnProperty('partnerSource','eBay');
      done();
    });
  }).timeout(TIMEOUT);

  it('should return offers and be an array', (done) => {
    const queryParams = {
      country: 'US'
    };
    auth(offersParams).then((token) => {
      offersParams.token = token;
      getOffers(offersParams, queryParams).then((offers) => {
        expect(offers.dealItems).to.be.an('array');
        done();
      });
    });
  }).timeout(TIMEOUT);

//   it('should start run and download offers', (done) => {
//     run().then((result) => {
//       done();
//     });
//   }).timeout(TIMEOUT);

});
