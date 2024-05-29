/* eslint-disable no-unused-expressions */
/* eslint-disable no-undef */
const { expect } = require("chai");
const { isUnicodeDefault } = require('../utils/unicode');

describe("unicode", () => {
    
    it('should be a true', (done) => {
        const test ='text for test';
        const result = isUnicodeDefault(test);
        expect(result).be.a.true;
        done();
    })

    it('china test, should be a false', (done) => {
        const test ='荣华月饼';
        const result = isUnicodeDefault(test);
        expect(result).be.a.false;
        done();
    })

    it('null test, should be a false', (done) => {
        const test = null;
        const result = isUnicodeDefault(test);
        expect(result).be.a.false;
        done();
    })

});
