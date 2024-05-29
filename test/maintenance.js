/* eslint-disable no-undef */
const { expect } = require("chai");
const { getDomain } = require('../utils/maintenance');

describe("change subdomain to domain", () => {
    
    it('should be a pure domain', (done) => {
        const test = [
            'computers.woot.com',
            'old.computers.com.pl',
            'www.vodka.ru',
            'good.vodka.life', 
            'good.vodka.co.com', 
            'super.vodka.com'
        ];
        const check = [
            'woot.com',
            'computers.com.pl',
            'vodka.ru',
            'vodka.life', 
            'vodka.co.com', 
            'vodka.com'
        ];
        for(let index=0;index<test.length;index+=1){
            const result = getDomain(test[index]); 
            expect(result).eq(check[index]);            
        };
        done();
    })

});