/* eslint-disable camelcase */
'use strict';

const debug = require('debug')('wirelesser:wireless');
const PromiseA = require('bluebird');
const EventEmitter = require('eventemitter2').EventEmitter2;
const {exec} = require('child-process-promise');
const iwlist = require('wireless-tools/iwlist');
const ifconfig = require('wireless-tools/ifconfig');

const utils = require('./utils');
const WPA = require('./wpa');

/**
 *
 */
class Wireless extends EventEmitter {

  constructor(iface) {
    super({wildcard: true});
    iface = iface || 'wlan0';
    this.iface = iface;
    this.wpa = new WPA(iface);

    const that = this;
    this.wpa.on('*', function () {
      that.emit(this.event, ...arguments);
    });
  }

  open() {
    return this.wpa.open();
  }

  close() {
    return this.wpa.close();
  }

  status() {
    return this.wpa.status();
  }

  state() {
    return this.wpa.status().then(status => {
      const state = utils.toLower(status.wpa_state);
      if (state === 'connected' || state === 'completed') {
        return 'connected';
      }
      return 'disconnected';
    });
  }

  /**
   * Result could be one of: 'station' or 'ap'
   */
  mode() {
    return this.wpa.status().then(status => {
      if (utils.toLower(status.wpa_state) === 'disconnected' && status.ip_address) {
        return 'ap';
      }
      return 'station';
    });
  }

  scan() {
    return new PromiseA.fromCallback(cb => iwlist.scan(this.iface, cb)).then(networks => {
      debug(`Found ${networks.length} wireless networks at ${this.iface}`);
      this.emit('scan_result', networks);
      return networks;
    });
  }

  /**
   * List network interfaces on system
   */
  listInterfaces() {
    return PromiseA.fromCallback(cb => ifconfig.status(cb));
  }

  listNetworks() {
    return this.wpa.listNetworks();
  }

  findNetworkBySsid(ssid) {
    return this.listNetworks().then(networks => networks.find(n => n.ssid === ssid));
  }

  // eslint-disable-next-line no-unused-vars
  connect(ssid, password, options) {
    return this.addOrUpdateNetwork(...arguments);
  }

  disconnect() {
    return this.wpa.disconnect();
  }

  addOrUpdateNetwork(ssid, password, options) {
    options = options || {};
    const {auth} = options;
    const data = {ssid, psk: password};
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

    const wpa = this.wpa;
    const keys = Object.keys(data);
    const quotedSsid = `"${ssid}"`;
    debug('connect', data);
    return this.findNetworkBySsid(ssid)
      .then(network => network ? network.id : wpa.addNetwork())
      .then(id => {
        return PromiseA.mapSeries(keys, key => {
          if (['ssid', 'psk'].includes(key)) {
            return wpa.setNetworkSettingString(id, key, data[key]);
          }
          return wpa.setNetworkSetting(id, key, data[key]);
        })
          .then(() => wpa.enableNetwork(id))
          .then(() => wpa.selectNetwork(id))
          .then(() => wpa.saveConfiguration());
      })
      .then(networks => networks.find(n => n.ssid === ssid || n.ssid === quotedSsid));
  }

  removeNetwork(ssid) {
    return this.findNetworkBySsid(ssid).then(n => n && this.wpa.removeNetwork(n.id));
  }

  enableNetworks(ssid) {
    return this.findNetworkBySsid(ssid).then(n => n && this.wpa.enableNetwork(n.id));
  }

  disableNetwork(ssid) {
    return this.findNetworkBySsid(ssid).then(n => n && this.wpa.disableNetwork(n.id));
  }

  selectNetwork(ssid) {
    return this.findNetworkBySsid(ssid).then(n => n && this.wpa.selectNetwork(n.id));
  }

  reloadConfiguration() {
    return this.wpa.reloadConfiguration();
  }

  saveConfiguration() {
    return this.wpa.saveConfiguration();
  }

  detect() {
    function check(result) {
      const {stdout} = result;

      if (stdout.indexOf('802.11') >= 0) {
        return '802.11';
      } else if (stdout.toUpperCase().indexOf('WLAN') >= 0) {
        return 'WLAN';
      }
      return false;
    }

    return PromiseA.filter(['lsusb', 'iwconfig'], which).then(commands => {
      return new PromiseA((resolve) => {
        let index = 0;

        function next() {
          const cmd = commands[index++];
          if (!cmd) {
            return resolve(null);
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
    }).then(data => {
      this.emit('detect', data);
      return data;
    });
  }

  up() {
    debug('ifup...');
    return PromiseA.try(() => exec(`ifup ${this.iface} up`))
      .then(() => {
        debug('ifup successful');
        this.emit('ifup');
      });
  }

  down() {
    debug('ifdown...');
    return PromiseA.try(() => exec(`ifdown ${this.iface} down`))
      .then(() => {
        debug('ifdown successful');
        this.emit('ifdown');
      });
  }

  reboot(delay = 1000) {
    debug('ifreboot...');
    return this.down(this.iface)
      .delay(delay)
      .then(() => this.up(this.iface)).then(() => {
        debug('ifreboot successful');
        this.emit('ifreboot');
      });
  }
}

function which(cmd) {
  return exec(`which ${cmd}`).then(result => result.stdout).catch(() => false);
}

module.exports = Wireless;
