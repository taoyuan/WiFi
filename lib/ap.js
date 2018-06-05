'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const assert = require("assert");
const fs = require("fs");
const child_process_1 = require("child_process");
const events_1 = require("events");
const utils_1 = require("./utils");
const CREATE_AP = path.join(__dirname, '..', 'create_ap', 'create_ap');
const DEFAULT_APNAME = 'MY_WIFI';
class AP extends events_1.EventEmitter {
    static create(nameOrOptions, options = {}) {
        assert(fs.existsSync(CREATE_AP), '"create_ap" has not been found in ' + CREATE_AP);
        let name = '';
        if (typeof nameOrOptions === 'string') {
            name = nameOrOptions;
        }
        else {
            options = nameOrOptions;
        }
        name = name || options.name || DEFAULT_APNAME;
        const iface = options.iface || 'wlan0';
        const gateway = options.gateway || '10.1.1.1';
        const { ifaceSharing, password } = options;
        const apopts = [];
        const apargs = [];
        if (gateway) {
            apopts.push(...['-g', gateway]);
        }
        apargs.push(iface);
        if (ifaceSharing) {
            apargs.push(ifaceSharing);
        }
        else {
            apopts.push('-n');
        }
        apargs.push(name);
        if (password) {
            apargs.push(password);
        }
        return new AP(child_process_1.spawn('bash', [CREATE_AP].concat(apopts).concat(apargs)));
    }
    constructor(ap) {
        super();
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
        return utils_1.promiseTimeout(new Promise(resolve => {
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
exports.AP = AP;
//# sourceMappingURL=ap.js.map