'use strict';

const debug = require('debug')('wirelesser:monitor');
import {EventEmitter} from 'events';
import {ChildProcess, spawn} from 'child_process';

const EVENTS_MAP = {
  'CTRL-EVENT-SCAN-STARTED': 'scanning',
  'CTRL-EVENT-SCAN-RESULTS': 'scanned',
  'CTRL-EVENT-CONNECTED': 'connected',
  'CTRL-EVENT-DISCONNECTED': 'disconnected',
  'CTRL-EVENT-SSID-TEMP-DISABLED': 'invalidkey',
  'CTRL-EVENT-TERMINATING': 'terminating'
};

/**
 * @class Monitor
 * @extends EventEmitter
 */
export class Monitor extends EventEmitter {

  protected wpacli?: ChildProcess;

  constructor(public iface: string = 'wlan0') {
    super();
    this._setup();
  }

  _setup() {
    if (this.wpacli) {
      return;
    }
    const wpacli = this.wpacli = spawn('wpa_cli', ['-i', this.iface]);

    wpacli.stdout.on('data', data => {
      data = Buffer.isBuffer(data) ? data.toString('utf-8') : data;
      data.split(/[\n\r]/)
        .map(line => line.trim())
        .filter(line => line && line !== '>')
        .forEach(line => this._handle(line));
    });

    wpacli.stderr.on('data', data => {
      debug('error', data);
      this.emit('error', new Error(data.toString()));
    });

    wpacli.on('close', code => {
      this.removeAllListeners();
      debug('closed');
      this.emit('close', code);
    });

    wpacli.on('error', err => {
      debug('error', err);
      this.emit('error', err);
    });
  }

  close() {
    if (this.wpacli) {
      this.wpacli.kill();
    }
    this.wpacli = undefined;
  }

  /**
   * Message event handler
   * @param  {Buffer|String} data data received from wpa_ctrl
   */
  _handle(data: Buffer | string) {
    data = Buffer.isBuffer(data) ? data.toString('utf-8') : data;
    data = data.trim();
    this.emit('data', data);
    if (/<3>CTRL/.test(data)) {
      this._handleCtrlEvent(data.substr(3));
    }
  }

  /**
   * Control event handler
   * @param  {String} data control event data
   */
  _handleCtrlEvent(data: string) {
    const parts = data.split(/[ \t]/);
    const ctrl = parts[0].toUpperCase();
    // const args = _.fromPairs(parts.slice(1).map(part => part.split('=')));
    const args = parts.slice(1)
      .map(part => {
        return part.split('=');
      })
      .reduce((result, pair) => {
        if (pair && pair.length === 2) {
          result[pair[0]] = pair[1];
        }
        return result;
      }, {});
    this.emit('control', ctrl, args);
    const event = EVENTS_MAP[ctrl];
    if (event) {
      debug('event', event);
      this.emit(event, args);
    }
  }
}
