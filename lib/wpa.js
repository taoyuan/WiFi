'use strict';

const debug = require('debug')('wpa');
const fs = require('fs-extra');
const unix = require('unix-dgram');
const EventEmitter = require('eventemitter2').EventEmitter2;
const csp = require('js-csp');
const PromiseA = require('bluebird');

/*
 WPA commands
 */
const COMMANDS = {
  ATTACH: 'ATTACH',
  SCAN: 'SCAN',
  SCAN_RESULT: 'SCAN_RESULTS',
  ADD_NETWORK: 'ADD_NETWORK',
  LIST_NETWORK: 'LIST_NETWORKS',
  STATUS: 'STATUS',
};

class WPA extends EventEmitter {

  constructor(iface) {
    super({wildcard: true, maxListeners: 20});
    this.iface = iface || 'wlan0';
  }

  /**
   * Connect to wpa control interface
   */
  open() {
    return new PromiseA(resolve => {
      if (this._ready) {
        return resolve();
      }

      if (this._opening) {
        return this.once('open', resolve);
      }

      this._opening = true;
      this._channel = csp.chan();

      this._lockname = '/tmp/wpa_ctrl' + process.pid;
      const client = this.client = unix.createSocket('unix_dgram');

      client.on('message', msg => this._handleMessage(msg));
      client.on('error', err => this._handleError(err));
      client.on('congestion', err => this._handleCongestion(err));

      client.once('connect', () => {
        debug('[wpa] connected to wpa, binding path');
        client.bind(this._lockname);
      });
      client.once('listening', () => {
        debug('[wpa] listening');
        this._ready = true;
        this._opening = false;
        this.emit('open');
        this.emit('ready');
        this.sendCmd(COMMANDS.ATTACH);
        resolve();
      });

      client.connect(`/var/run/wpa_supplicant/${this.iface}`);
    });
  }

  close() {
    if (this._ready) {
      this._ready = false;
      this.client.close();
      fs.removeSync(this._lockname);
      this.emit('close');
    }
  }

  /**
   * Message event handler
   * @param  {Buffer|String} msg message received from wpa_ctrl
   */
  _handleMessage(msg) {
    msg = Buffer.isBuffer(msg) ? msg.toString() : msg;
    this.emit('raw_msg', msg);
    if (/<3>/.test(msg)) {
      this._handleCtrlEvent(msg);
    } else {
      csp.putAsync(this._channel, msg);
    }
  }

  /**
   * Control event handler
   * @param  {String} msg control event messages
   */
  _handleCtrlEvent(msg) {
    const s = msg.substr(3);
    const ctrl = s.split(/[ \t]/, 1)[0].toUpperCase();
    // TODO decode arguments like: https://github.com/theojulienne/go-wireless/blob/master/wpactl/wpactl.go#L85
    this.emit('ctrl', ctrl, msg);
    switch (ctrl) {
      case 'CTRL-EVENT-SCAN-STARTED':
        this.emit('scanning');
        break;
      case 'CTRL-EVENT-SCAN-RESULTS':
        csp.putAsync(this._channel, msg);
        break;
      case 'CTRL-EVENT-CONNECTED':
        this.emit('connected');
        break;
      case 'CTRL-EVENT-DISCONNECTED':
        this.emit('disconnected');
        break;
      case 'CTRL-EVENT-SSID-TEMP-DISABLED':
        this.emit('invalidkey');
        break;
    }
  }

  /**
   * Error event handler
   * @param  {String} err error message
   */
  _handleError(err) {
    this.emit('error', err);
  }

  /**
   * Congestion event handler
   * @param  {String} err congestion error message
   */
  _handleCongestion(err) {
    console.log('congestion', err);
    this.emit('congestion', err);
    /* The server is not accepting data */
  }

  /**
   * Send request to wpa_cli
   * @param  {String} cmd wpa_cli commands
   */
  sendCmd(cmd) {
    debug('<<<', cmd);
    this.client.send(new Buffer(cmd));
    return new PromiseA(resolve => csp.takeAsync(this._channel, resolve))
      .then(res => {
        if (typeof res === 'string') {
          res = res.trim();
        }
        return res;
      });
  }

  /**
   * Request for status
   */
  status() {
    return this.sendCmd(COMMANDS.STATUS).then(res => {
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
    return this.sendCmd(COMMANDS.SCAN)
      .then(res => {
        res = res.trim();
        if (res === 'OK') {
          // Take CTRL-EVENT-SCAN-RESULTS
          return new PromiseA(resolve => csp.takeAsync(this._channel, resolve)).timeout(5000);
        }

        if (!/CTRL-EVENT-SCAN-RESULTS/.test(res)) {
          throw new Error('`scan` fail with response: ' + res);
        }
      })
      .then(() => this.sendCmd(COMMANDS.SCAN_RESULT))
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
    return this.sendCmd(COMMANDS.ADD_NETWORK).then(parseInt);
  }

  /**
   * Request to list networks
   */
  listNetworks() {
    return this.sendCmd(COMMANDS.LIST_NETWORK)
      .then(res => {
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
      })
      .then(networks => {
        this.emit('networks', networks);
        return networks;
      });
  }

  setNetworkSetting(networkId, name, value) {
    return this.sendCmd(`SET_NETWORK ${networkId} ${name} ${value}`);
  }

  setNetworkSettingString(networkId, name, value) {
    if (value[0] !== '"') {
      value = `"${value}"`;
    }
    return this.setNetworkSetting(networkId, name, value);
  }

  getNetworkSetting(networkId, name) {
    return this.sendCmd(`GET_NETWORK ${networkId} ${name}`);
  }

  /**
   * Enable configured network
   * @param  {string} networkId network id recieved from list networks
   */
  enableNetwork(networkId) {
    return this.sendCmd(`ENABLE_NETWORK ${networkId}`);
  }

  /**
   * Disable configured network
   * @param  {string} networkId networkId network id received from list networks
   */
  disableNetwork(networkId) {
    return this.sendCmd(`DISABLE_NETWORK ${networkId}`);
  }

  /**
   * Select network to connect
   * @param  {String} networkId networkId network id received from list networks
   */
  selectNetwork(networkId) {
    return this.sendCmd(`SELECT_NETWORK ${networkId}`);
  }

  /**
   * Remove network to connect
   * @param  {String} networkId networkId network id received from list networks
   */
  removeNetwork(networkId) {
    return this.sendCmd(`REMOVE_NETWORK ${networkId}`);
  }

  reloadConfiguration() {
    this.sendCmd(`RECONFIGURE`);
  }

  saveConfiguration() {
    return this.sendCmd(`SAVE_CONFIG`);
  }

  /**
   * Disconnect from AP
   */
  disconnect() {
    return this.sendCmd('DISCONNECT');
  }

  // --------------------------------------
  // TODO: P2P communication
  // --------------------------------------

}

module.exports = WPA;
