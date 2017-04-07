'use strict';

const PromiseA = require('bluebird');
const s = require('./support');
const {WPA} = require('..');

describe('WPA connect', () => {
  const wpa = new WPA('wlan0');

  before(() => wpa.open());
  after(() => wpa.close());

  it('should emit wifi_invalidkey event', function (done) {
    this.timeout(10000);
    wpa.once('wifi_invalidkey', done);

    wpa.addNetwork().then(id => {
      return PromiseA.mapSeries([
        () => wpa.setNetworkSettingString(id, 'ssid', s.ssid),
        () => wpa.setNetworkSettingString(id, 'psk', 'invalid_key'),
        () => wpa.selectNetwork(id)
      ], fn => fn());
    });
  });

  it('should emit wifi_connected event', function (done) {
    this.timeout(10000);
    wpa.once('wifi_connected', done);

    wpa.addNetwork().then(id => {
      return PromiseA.mapSeries([
        () => wpa.setNetworkSettingString(id, 'ssid', s.ssid),
        () => wpa.setNetworkSettingString(id, 'psk', s.password),
        () => wpa.enableNetwork(id),
        () => wpa.selectNetwork(id),
      ], fn => fn());
    });
  });

  it('should emit wifi_disconnected', function (done) {
    this.timeout(10000);
    wpa.once('wifi_disconnected', done);
    wpa.disconnect();
  });
});
