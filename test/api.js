/* eslint-disable no-unused-expressions */
/* eslint-disable no-undef */
const chai = require("chai");
const chaiHttp = require('chai-http');

const API_URL = 'http://localhost:300';

chai.use(chaiHttp);

describe('Offers API', () => {

    it("should return status 200", (done) => {
        chai.request(API_URL)
        .post('/offers')
        .send([])
        .end( (err, res) => {
            chai.expect(res).to.have.status(200);
            done();
         });          
    });  

    it("should return status 400", (done) => {
        chai.request(API_URL)
        .post('/offers')
        .end((err, res) => {
            chai.expect(res).to.have.status(400);
            done()
        })
    });

})