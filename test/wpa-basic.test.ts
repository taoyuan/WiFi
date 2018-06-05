import './support';

import {assert} from 'chai';
import {WPA} from '../src';

describe('WPA Basic Tests', function () {
  describe('functions', function () {
    const wpa = new WPA('wlan0');

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
  });
});
