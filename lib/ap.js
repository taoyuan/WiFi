'use strict';

// const debug = require('debug')('sap');
const path = require('path');
const assert = require('assert');
const fs = require('fs');
const {spawn, ChildProcess} = require('child_process');
const EventEmitter = require('eventemitter2').EventEmitter2;
const PromiseA = require('bluebird');

const CREATE_AP = path.join(__dirname, '..', 'create_ap', 'create_ap');

/**
 * @class AP
 */
class AP extends EventEmitter {

  /**
   * Construct an AP instance
   *
   * @param {String|Object} name ap name or options
   * @param {Object} [options]
   * @return {AP}
   */
  static create(name, options) {
    assert(fs.existsSync(CREATE_AP), '"create_ap" has not been found in ' + CREATE_AP);

    if (typeof name !== 'string') {
      options = name;
      name = null;
    }
    options = Object.assign({
      name,
      iface: 'wlan0',
      gateway: '10.1.1.1',
    }, options);

    name = options.name;
    const {gateway, iface, ifaceSharing, password} = options;

    const apopts = [];
    const apargs = [];

    // apopts.push('--no-virt');

    if (gateway) {
      apopts.push(...['-g', gateway]);
    }

    // wifi-interface
    apargs.push(iface);
    if (ifaceSharing) {
      // interface-with-internet
      apargs.push(ifaceSharing);
    } else {
      // disable internet sharing
      apopts.push('-n');
    }
    // access-point-name
    apargs.push(name);
    // passphrase
    if (password) {
      apargs.push(password);
    }

    // TODO: support more options ?

    return new AP(spawn('bash', [CREATE_AP].concat(apopts).concat(apargs)));
  }

  /**
   *
   * @param {ChildProcess} ap
   */
  constructor(ap) {
    super();
    assert(ap instanceof ChildProcess, 'Argument `ap` must be a ChildProcess. Using AP.create() to construct AP instance.');
    this._ap = ap;

    ap.on('error', err => this.emit('error', err));

    ap.stdout.on('data', data => this._handleStatusData(data));
    ap.stderr.on('data', data => this._handleErrorData(data));
  }

  get active() {
    return this._started && !this._killing;
  }

  _handleStatusData(data) {
    if (Buffer.isBuffer(data)) {
      data = data.toString('utf-8');
    }
    this.emit('stdout', data);
    if (/AP-ENABLED/.test(data)) {
      this._started = true;
      this.emit('started');
    }
    if (this._killing) {
      if (/done/.test(data)) {
        this._close();
      }
    }
  }

  _handleErrorData(data) {
    if (Buffer.isBuffer(data)) {
      data = data.toString('utf-8');
    }
    this.emit('stderr', data);
  }

  _close() {
    if (this._ap) {
      this._started = false;
      this._killing = false;
      this._ap = null;
      this.emit('close');
    }
  }

  close(sig = 'SIGINT') {
    return new PromiseA(resolve => {
      if (!this._ap) {
        return resolve();
      }

      this.once('close', () => resolve);

      if (!this._killing) {
        this._killing = true;
        this._ap.kill(sig);
      }
    }).timeout(5000).catch(() => this._close());
  }
}

module.exports = AP;
