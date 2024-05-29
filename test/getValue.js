/* eslint-disable no-undef */
const { expect } = require("chai");
const { parserCJredirectUrl, parserOfferValue, parserShortTitle, parserRedirectUrl, parserCJImage } = require('../utils/getValue');

describe("getValue", () => {
    it('should be url', (done) => {
        const test = '<a href="https://www.anrdoezrs.net/click-100360718-11809153-1561039502000"><img src="https://www.ftjcfx.com/image-100360718-11809153-1561039502000" width="728" height="90" alt="" border="0"/></a>';
        const result = parserCJImage(test);        
        expect(result).contain('http');
        done();
    })
});

describe("parserOfferValue function", () => {

    it('should be value equal 1000', (done) => {
        const test = 'Save up to $1,000 off if you bay Instantly when you buy an IVY CLIQ Instant Camera Printer';
        const result = parserOfferValue(test,'$');
        expect(result.value).to.equal(1000); 
        done();   
    })
    
    it('should be null if percentage 100%', (done) => {
        const test = 'Save up to 100% off if you bay Instantly when you buy an IVY CLIQ Instant Camera Printer';
        const result = parserOfferValue(test);
        expect(result.value).to.equal(null); 
        expect(result.valueType).to.equal('percentage'); 
        done();   
    })

    it('should be percentage value', (done) => {
        const test = '60% OFF Prints, $20 Posters & Enlargements w/ code GOBIGGER60 + Same Day Order Pickup!';
        const result = parserOfferValue(test);        
        expect(result.value).to.equal(60);    
        done();
    })

    it('should be currency value', (done) => {
        const test = 'Save up to $70 off Instantly when you buy an IVY CLIQ Instant Camera Printer';
        const result = parserOfferValue(test,'$');
        expect(result.value).to.equal(70);  
        done();  
    })

    it('should be 70', (done) => {
        const test = 'Shop Comfort Bras + Free Shipping Over 70.';
        const result = parserOfferValue(test);        
        expect(result.value).to.equal(70);   
        done();
    })

    it('should be null', (done) => {
        const test = 'Shop Comfort Bras + Free Shipping Over 0.';
        const result = parserOfferValue(test);        
        expect(result.value).to.equal(null);   
        done();
    })

    it('should be currency type', (done) => {
        const test = 'Save up to $70 off If spend $100 Instantly when you buy an IVY CLIQ Instant Camera Printer';
        const result = parserOfferValue(test,'$');
        expect(result.valueType).to.equal('currency'); 
        done();   
    })

    it('should have euro symbol', (done) => {
        const test = 'Save up to €70 off Instantly when you buy an IVY CLIQ Instant Camera Printer';
        const result = parserOfferValue(test,'€');
        expect(result.currencySymbol).to.equal('€'); 
        done();   
    })

    it('should have usd symbol', (done) => {
        const test = 'Save up to $70 off id you spend $100 Instantly when you buy an IVY CLIQ Instant Camera Printer';
        const result = parserOfferValue(test,'$');
        expect(result.currencySymbol).to.equal('$'); 
        done();   
    })

});

describe("parserShortTitle function", () => {
    
    it('should have max 7 words', (done) => {
        const test = [
            'Get 25% Off Select Items plus 20% Off Sale! Offer Valid 3/28/2021 - 4/5/2021!',
            'Save $40 on JBL Tune 600 BT Headphones!',
            'Sign Up For SMS And Enjoy $10 Off Your Order Of $100 or more!',
            'Shop 250 or more New Spring Arrivals plus Free Shipping On Orders $50 or more With Code: FREESHIP',
            'Get Extra 8% discount for Video Games Products on Tomtop.com',
            'Save $50 off orders $500 or more at Dr. Fuhrman with code LS50OFF500! Shop now!',
            'Shop Gifts Under $200 plus Free Shipping On Orders $50 or more With Code: FREESHIP',
            'Cutters | Take an Extra 10% Off Outlet!',
            'K-Supreme Plus Brewer Now Only $189.99 at Keurig! Valid 3/28-4/4!',
            'Buy More Save More! Save $4 off 2 Boxes of with code TRYMORE28 at Keurig, Valid from 3/30-4/4!',
            'Get Hosting for $1.00*/mo with GoDaddy!'
        ];
        test.forEach(item => {
            const result = parserShortTitle(item);  
            expect(result.split(' ')).to.have.lengthOf.below(8);  
        });
        done();
    })

    it('should have xcust chain', (done) => {
        const id = '1';
        const templateUrl='https://go.skimresources.com?id={ourId}&xs=1&url={encodedOfferUrl}&xcust={sessionId}';
        const url = 'https://www.woot.com/wootoff?skimoffer=1218016';
        const sessionId='1';
        const result = parserRedirectUrl(templateUrl, id, url, sessionId);   
        expect(result).to.include(`xcust=${sessionId}`);    
        done();
    })

});