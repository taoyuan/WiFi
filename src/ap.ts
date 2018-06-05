'use strict';

import * as path from 'path';
import * as assert from 'assert';
import * as fs from 'fs';
import {spawn, ChildProcess} from 'child_process';
import {EventEmitter} from 'events';
import {promiseTimeout} from "./utils";

const CREATE_AP = path.join(__dirname, '..', 'create_ap', 'create_ap');

const DEFAULT_APNAME = 'MY_WIFI';

export interface APOptions {
  name?: string;
  gateway?: string;
  iface?: string;
  ifaceSharing?: string;
  password?: string;
}

/**
 * @class AP
 */
export class AP extends EventEmitter {

  private _ap: ChildProcess | null;
  private _started: boolean;
  private _killing: boolean;

  static create(nameOrOptions: string | APOptions, options: APOptions = {}) {
    assert(fs.existsSync(CREATE_AP), '"create_ap" has not been found in ' + CREATE_AP);

    let name: string = '';
    if (typeof nameOrOptions === 'string') {
      name = nameOrOptions;
    } else {
      options = nameOrOptions;
    }

    name = name || options.name || DEFAULT_APNAME;
    const iface = options.iface || 'wlan0';
    const gateway = options.gateway || '10.1.1.1';
    const {ifaceSharing, password} = options;

    const apopts: string[] = [];
    const apargs: string[] = [];

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
  constructor(ap: ChildProcess) {
    super();
    // assert(ap instanceof ChildProcess, 'Argument `ap` must be a ChildProcess. Using AP.create() to construct AP instance.');
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
    return promiseTimeout(new Promise(resolve => {
      if (!this._ap) {
        return resolve();
      }

      this.once('close', () => resolve);

      if (!this._killing) {
        this._killing = true;
        this._ap.kill(sig);
      }
    }), 5000).catch(() => this._close());
  }
}
