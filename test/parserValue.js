/* eslint-disable no-undef */
const { expect } = require("chai");
const { parserSeoUrl } = require('../utils/parserValue');

describe("parserValue functions", () => {
    
    it('should not contain signs like @><?', (done) => {
        const test = '6-A:84:0-=0-?@>4C:BK-D8@';
        const result = parserSeoUrl(test);        
        expect(result).not.contains(['@','>','<','?']);    
        done();
    })

});