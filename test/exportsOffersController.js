/* eslint-disable no-undef */
const { expect } = require("chai");
const { prepareUnifyCollection } = require('../controllers/ExportsOffersController');
  
describe("exportOffersController", () => {

  after(()=>process.exit());

  it('should return an array', (done) => {

    const otherParams = [
      { apiName: 'skimLinks', limit: 1, offset: 1 },
      { apiName: 'eBay', limit: 1, offset: 0 },
      { apiName: 'commissionJunction', limit: 1, offset: 1 }
    ];
    
    const id = '6062f0b5d4432d00092c8260';

    prepareUnifyCollection(otherParams, id).then(result => {
      expect(result).to.be.an('array');
      done();
    });
        
  }).timeout(10000);

});