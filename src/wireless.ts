/* eslint-disable camelcase */
'use strict';

const debug = require('debug')('wirelesser:wireless');
import {exec} from 'child-process-promise';
import * as iwlist from 'wireless-tools/iwlist';
import * as ifconfig from 'wireless-tools/ifconfig';
import {Hotspot, Network, WPA} from './wpa';
import {promiseFromCallback, toLower, wait} from "./utils";

export class Wireless extends WPA {
  constructor(iface: string = 'wlan0') {
    super(iface);
  }

  async connected(): Promise<boolean> {
    const status = await this.status();
    const state = toLower(status.wpa_state);
    if (state === 'connected' || state === 'completed') {
      return true;
    }
    return false;
  }

  /**
   * Result could be one of: 'station' or 'ap'
   */
  async mode(): Promise<string> {
    const status = await this.status();
    if (toLower(status.wpa_state) === 'disconnected' && status.ip_address) {
      return 'ap';
    }
    return 'station';
  }

  async scan(): Promise<Hotspot[]> {
    const networks = await promiseFromCallback(cb => iwlist.scan(this.iface, cb));
    debug(`Found ${networks.length} wireless networks at ${this.iface}`);
    this.emit('scan_result', networks);
    return networks;
  }

  /**
   * List network interfaces on system
   */
  listInterfaces() {
    return promiseFromCallback(cb => ifconfig.status(cb));
  }

  async findNetworkBySsid(ssid): Promise<Network | undefined> {
    const networks = await this.listNetworks();
    return networks.find(n => n.ssid === ssid);
  }

  // eslint-disable-next-line no-unused-vars
  connect(ssid, password, options?) {
    return this.addOrUpdateNetwork(ssid, password, options);
  }

  async addOrUpdateNetwork(ssid: string, password: string, options?) {
    options = options || {};
    const {auth} = options;
    const data: any = {ssid, psk: password};
    if (password) {
      data.key_mgmt = 'WPA-PSK';
    } else {
      data.key_mgmt = 'NONE';
      if (auth === 'WEP' || (password && !auth)) {
        data.wep_tx_keyidx = 0;
        data.wep_key0 = password;
      }
    }
    data.scan_ssid = 1;

    const keys = Object.keys(data);
    debug('connect', data);

    const network = await this.findNetworkBySsid(ssid);
    const id = network ? network.id : await this.addNetwork();

    for (let key of keys) {
      if (['ssid', 'psk'].includes(key)) {
        await this.setNetworkSettingString(id, key, data[key]);
      } else {
        await this.setNetworkSetting(id, key, data[key]);
      }
    }

    await this.enableNetwork(id);
    await this.selectNetwork(id);
    return await this.saveConfiguration();
  }

  async removeNetwork(id: number | string) {
    if (typeof id === 'string') {
      const n = await this.findNetworkBySsid(id);
      id = n ? n.id : -1;
    }
    return id >= 0 ? super.removeNetwork(id) : 'FAIL';
  }

  async enableNetwork(id: number | string) {
    if (typeof id === 'string') {
      const n = await this.findNetworkBySsid(id);
      id = n ? n.id : -1;
    }
    return id >= 0 ? super.enableNetwork(id) : 'FAIL';
  }

  async disableNetwork(id: number | string) {
    if (typeof id === 'string') {
      const n = await this.findNetworkBySsid(id);
      id = n ? n.id : -1;
    }
    return id >= 0 ? super.disableNetwork(id) : 'FAIL';
  }

  async selectNetwork(id: number | string) {
    if (typeof id === 'string') {
      const n = await this.findNetworkBySsid(id);
      id = n ? n.id : -1;
    }
    return id >= 0 ? super.selectNetwork(id) : 'FAIL';
  }

  async detect() {
    function check(result) {
      const {stdout} = result;

      if (stdout.indexOf('802.11') >= 0) {
        return '802.11';
      } else if (stdout.toUpperCase().indexOf('WLAN') >= 0) {
        return 'WLAN';
      }
      return false;
    }

    const possibles = ['lsusb', 'iwconfig'];
    const commands: string[] = [];
    for (const cmd in possibles) {
      if (await which(cmd)) commands.push(cmd);
    }

    const data = await new Promise(resolve => {
      let index = 0;

      function next() {
        const cmd = commands[index++];
        if (!cmd) {
          return resolve();
        }
        exec(cmd)
          .then(check)
          .then(found => {
            if (found) return resolve({device: found});
            next();
          })
          .catch(next);
      }

      next();
    });

    this.emit('detect', data);
    return data;
  }

  async up() {
    debug('ifup...');
    await exec(`ifconfig ${this.iface} up`);
    debug('ifup successful');
    this.emit('ifup');
  }

  async down() {
    debug('ifdown...');
    await exec(`ifconfig ${this.iface} down`);
    debug('ifdown successful');
    this.emit('ifdown');
  }

  async reboot(delay = 1000) {
    debug('ifreboot...');
    await this.down();
    await wait(delay);
    await this.up();
    debug('ifreboot successful');
    this.emit('ifreboot');
  }
}

function which(cmd) {
  try {
    return Boolean(exec(`which ${cmd}`).stdout);
  } catch (e) {
    return false;
  }
}
