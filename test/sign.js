/* eslint-disable no-unused-expressions */
/* eslint-disable no-undef */
const { expect } = require("chai");
const { checkSignedByServer } = require('../utils/sign');
const uCommissionReportProof = require('../proofs/uCommissionReportProof');

describe("sign", () => {
    
    it('should be a true', async (done) => {
        const test = Object.create(uCommissionReportProof);
        test.publisherAmount = 1.244014939752289;        
        test.orderAmount = 9.873134442478488;
        test.currency = 'USD';
        const hash = '$2b$10$POrlMLJTK8p3AlOXSgDpf.i4JqKW61Pag6CWC59u3kEvaUwsgIrWm';
        const result = await checkSignedByServer(test,hash);
        expect(result).be.a.true;
        done();
    })

});
