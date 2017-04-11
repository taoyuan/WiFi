'use strict';

const PromiseA = require('bluebird');
const s = require('./support');
const {WPA, Monitor} = require('..');

if (s.ssid) {
  describe('WPA connect', () => {
    const wpa = new WPA('wlan0');
    const monitor = new Monitor('wlan0');

    beforeEach(() => {
      return wpa.listNetworks().map(n => wpa.removeNetwork(n.id));
    });

    it('should emit "invalidkey" event', function (done) {
      this.timeout(10000);
      monitor.once('invalidkey', () => done());

      addNetwork(wpa, s.ssid, 'invalid_key');
    });

    it('should emit "connected" event', function (done) {
      this.timeout(10000);
      monitor.once('connected', () => done());

      addNetwork(wpa, s.ssid, s.password);
    });

    it('should emit "disconnected" event', function (done) {
      this.timeout(10000);

      monitor.once('connected', () => {
        monitor.once('disconnected', () => done());
        wpa.disconnect();
      });

      addNetwork(wpa, s.ssid, s.password);
    });
  });
}

function addNetwork(wpa, ssid, password) {
  return wpa.addNetwork().then(id => {
    return PromiseA.mapSeries([
      () => wpa.setNetworkSettingString(id, 'ssid', ssid),
      () => wpa.setNetworkSettingString(id, 'psk', password),
      () => wpa.enableNetwork(id),
      () => wpa.selectNetwork(id),
    ], fn => fn());
  });
}
