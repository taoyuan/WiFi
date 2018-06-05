'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const debug = require('debug')('wirelesser:monitor');
const events_1 = require("events");
const child_process_1 = require("child_process");
const EVENTS_MAP = {
    'CTRL-EVENT-SCAN-STARTED': 'scanning',
    'CTRL-EVENT-SCAN-RESULTS': 'scanned',
    'CTRL-EVENT-CONNECTED': 'connected',
    'CTRL-EVENT-DISCONNECTED': 'disconnected',
    'CTRL-EVENT-SSID-TEMP-DISABLED': 'invalidkey',
    'CTRL-EVENT-TERMINATING': 'terminating'
};
class Monitor extends events_1.EventEmitter {
    constructor(iface = 'wlan0') {
        super();
        this.iface = iface;
        this._setup();
    }
    _setup() {
        if (this.wpacli) {
            return;
        }
        const wpacli = this.wpacli = child_process_1.spawn('wpa_cli', ['-i', this.iface]);
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
    _handle(data) {
        data = Buffer.isBuffer(data) ? data.toString('utf-8') : data;
        data = data.trim();
        this.emit('data', data);
        if (/<3>CTRL/.test(data)) {
            this._handleCtrlEvent(data.substr(3));
        }
    }
    _handleCtrlEvent(data) {
        const parts = data.split(/[ \t]/);
        const ctrl = parts[0].toUpperCase();
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
exports.Monitor = Monitor;
//# sourceMappingURL=monitor.js.map