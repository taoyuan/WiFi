/* eslint-disable prefer-arrow-callback */

'use strict';
const {assert} = require('chai');
require('./support');
const {WPA} = require('..');

describe('WPA Basic Tests', function () {
  describe('open', function () {
    it('should resolve after opened', function () {
      const wpa = new WPA('wlan0');
      return wpa.open().finally(() => wpa.close())
    });

    it('should emit an ready event', function (done) {
      const wpa = new WPA('wlan0');
      wpa.once('ready', done);
      wpa.open().finally(() => wpa.close())
    });
  });

  describe('functions', function () {
    const wpa = new WPA('wlan0');

    before(() => wpa.open());
    after(() => wpa.close());

    it('should list networks', function () {
      return wpa.listNetworks().then(networks => {
        assert.typeOf(networks, 'array');
      });
    });

    it('should get status', function () {
      return wpa.status().then(status => {
        assert.typeOf(status, 'object');
      });
    });

    it('should scan', function () {
      this.timeout(6000);
      return wpa.scan().then(networks => {
        assert.typeOf(networks, 'array');
      });
    });

    it('should emit a raw_msg event', function (done) {
      wpa.once('raw_msg', msg => {
        assert.typeOf(msg, 'string');
        done();
      });

      wpa.scan();
    });
  });
});
