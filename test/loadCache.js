/* eslint-disable no-console */
/* eslint-disable no-undef */
const { expect } = require("chai");
const { fork } = require('child_process');
const { loadCache } = require('../services/loadCache');

const {
  SIGNAL_PING
} = require('../constants/threads');

describe("loadCacheTest", () => {

  it("should return promise info", (done) => {
    const MESSAGE_RESOLVE = 'cache warming up done'
    loadCache(1).then(result => {
      expect(result).to.equal(MESSAGE_RESOLVE);
      done();
    })
  }).timeout(10000);

  it("should return fork", (done) => {
    const testFork = fork('services/loadCache.js');
    testFork.send(SIGNAL_PING);
    testFork.on('message', (msg) =>{console.log(msg)});
    done();
  }).timeout(10000);

});