'use strict';

const debug = require('debug')('wirelesser:wpa');
const EventEmitter = require('eventemitter2').EventEmitter2;
const {exec} = require('child-process-promise');
const PromiseA = require('bluebird');

class WPA extends EventEmitter {

  constructor(iface) {
    super({wildcard: true, maxListeners: 20});
    this.iface = iface || 'wlan0';
  }

  exec(cmd, args) {
    args = args || [];
    if (!Array.isArray(args)) {
      args = [args];
    }
    const c = ['wpa_cli', '-i', this.iface, cmd, ...args].join(' ');
    debug('<<<', c);
    return PromiseA.resolve(exec(c)).then(result => result.stdout.trim()).then(out => {
      debug('>>>', out);
      if (out === 'FAIL') {
        throw new Error('Command failed: ' + c)
      }
      return out;
    })
  }

  /**
   * Request for status
   */
  status() {
    // return this.sendCmd(COMMANDS.STATUS).then(res => {
    return this.exec('status').then(res => {
      const status = {};
      const lines = res.split('\n');
      lines.filter(line => line.length > 3).forEach(line => {
        const parts = line.split('=').map(s => s.trim());
        status[parts[0]] = parts[1];
      });
      return status;
    }).then(status => {
      this.emit('status', status);
      return status;
    });
  }

  /**
   * Scan for wifi AP
   */
  scan() {
    // return this.sendCmd(COMMANDS.SCAN)
    return this.exec('scan')
      .then(res => {
        if (res === 'OK') {
          return this.exec('scan_result');
        }
        throw new Error(res);
      })
      .then(res => {
        const lines = res.split('\n');
        lines.splice(0, 1);
        return lines
          .map(line => line.split('\t'))
          .filter(record => record.length > 3)
          .map(record => ({
            bssid: record[0].trim(),
            freq: record[1].trim(),
            rssi: record[2].trim(),
            ssid: record[4].trim()
          }));
      })
      .then(networks => {
        this.emit('scanned', networks);
        return networks;
      });
  }

  /**
   * Add new network
   */
  addNetwork() {
    return this.exec('add_network').then(parseInt);
  }

  /**
   * Request to list networks
   */
  listNetworks() {
    // return this.sendCmd(COMMANDS.LIST_NETWORK)
    return this.exec('list_networks').then(res => {
        const lines = res.split('\n');
        lines.splice(0, 1);
        return lines
          .map(line => line.split('\t').map(s => s.trim()))
          .filter(record => record.length === 4)
          .map(record => ({
            id: record[0],
            ssid: record[1],
            essid: record[2],
            flags: record[3],
          }));
      }).then(networks => {
        this.emit('networks', networks);
        return networks;
      });
  }

  setNetworkSetting(networkId, name, value) {
    return this.exec('set_network', [networkId, name, value]);
  }

  setNetworkSettingString(networkId, name, value) {
    value = `'"${value}"'`;
    return this.setNetworkSetting(networkId, name, value);
  }

  getNetworkSetting(networkId, name) {
    // return this.sendCmd(`GET_NETWORK ${networkId} ${name}`);
    return this.exec('get_network', [networkId, name]);
  }

  /**
   * Enable configured network
   * @param  {string} networkId network id recieved from list networks
   */
  enableNetwork(networkId) {
    // return this.sendCmd(`ENABLE_NETWORK ${networkId}`);
    return this.exec('enable_network', [networkId]);
  }

  /**
   * Disable configured network
   * @param  {string} networkId networkId network id received from list networks
   */
  disableNetwork(networkId) {
    // return this.sendCmd(`DISABLE_NETWORK ${networkId}`);
    return this.exec('disable_network', [networkId]);
  }

  /**
   * Select network to connect
   * @param  {String} networkId networkId network id received from list networks
   */
  selectNetwork(networkId) {
    // return this.sendCmd(`SELECT_NETWORK ${networkId}`);
    return this.exec('select_network', [networkId]);
  }

  /**
   * Remove network to connect
   * @param  {String} networkId networkId network id received from list networks
   */
  removeNetwork(networkId) {
    // return this.sendCmd(`REMOVE_NETWORK ${networkId}`);
    return this.exec('remove_network', [networkId]);
  }

  reloadConfiguration() {
    // this.sendCmd(`RECONFIGURE`);
    return this.exec('reconfigure');
  }

  saveConfiguration() {
    // return this.sendCmd(`SAVE_CONFIG`);
    return this.exec('save_config');
  }

  /**
   * Disconnect from AP
   */
  disconnect() {
    // return this.sendCmd('DISCONNECT');
    return this.exec('disconnect');
  }

  // --------------------------------------
  // TODO: P2P communication
  // --------------------------------------

}

module.exports = WPA;
