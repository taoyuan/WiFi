'use strict';

import {password, ssid} from "./support";
import {WPA, Monitor} from '../src';

describe('WPA connect', () => {
  if (!ssid) {
    console.warn('* No ssid configured, skipping WPA tests.');
    return;
  }

  const wpa = new WPA('wlan0');
  const monitor = new Monitor('wlan0');

  beforeEach(async () => {
    const networks = await wpa.listNetworks();
    for (const n of networks) {
      await wpa.removeNetwork(n.id)
    }
  });

  it('should emit "invalidkey" event', async function (done) {
    this.timeout(10000);
    monitor.once('invalidkey', () => done());

    await addNetwork(wpa, ssid, 'invalid_key');
  });

  it('should emit "connected" event', async function (done) {
    this.timeout(10000);
    monitor.once('connected', () => done());

    await addNetwork(wpa, ssid, password);
  });

  it('should emit "disconnected" event', async function (done) {
    this.timeout(10000);

    monitor.once('connected', async () => {
      monitor.once('disconnected', () => done());
      await wpa.disconnect();
    });

    await addNetwork(wpa, ssid, password);
  });
});

async function addNetwork(wpa, ssid, password) {
  const id = await wpa.addNetwork();
  await wpa.setNetworkSettingString(id, 'ssid', ssid);
  await wpa.setNetworkSettingString(id, 'psk', password);
  await wpa.enableNetwork(id);
  await wpa.selectNetwork(id);
}
