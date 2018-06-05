'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const debug = require('debug')('wirelesser:wireless');
const child_process_promise_1 = require("child-process-promise");
const iwlist = require("wireless-tools/iwlist");
const ifconfig = require("wireless-tools/ifconfig");
const wpa_1 = require("./wpa");
const utils_1 = require("./utils");
class Wireless extends wpa_1.WPA {
    constructor(iface = 'wlan0') {
        super(iface);
    }
    state() {
        return __awaiter(this, void 0, void 0, function* () {
            const status = yield this.status();
            const state = utils_1.toLower(status.wpa_state);
            if (state === 'connected' || state === 'completed') {
                return 'connected';
            }
            return 'disconnected';
        });
    }
    mode() {
        return __awaiter(this, void 0, void 0, function* () {
            const status = yield this.status();
            if (utils_1.toLower(status.wpa_state) === 'disconnected' && status.ip_address) {
                return 'ap';
            }
            return 'station';
        });
    }
    scan() {
        return __awaiter(this, void 0, void 0, function* () {
            const networks = yield utils_1.promiseFromCallback(cb => iwlist.scan(this.iface, cb));
            debug(`Found ${networks.length} wireless networks at ${this.iface}`);
            this.emit('scan_result', networks);
            return networks;
        });
    }
    listInterfaces() {
        return utils_1.promiseFromCallback(cb => ifconfig.status(cb));
    }
    findNetworkBySsid(ssid) {
        return __awaiter(this, void 0, void 0, function* () {
            const networks = yield this.listNetworks();
            return networks.find(n => n.ssid === ssid);
        });
    }
    connect(ssid, password, options) {
        return this.addOrUpdateNetwork(ssid, password, options);
    }
    addOrUpdateNetwork(ssid, password, options) {
        return __awaiter(this, void 0, void 0, function* () {
            options = options || {};
            const { auth } = options;
            const data = { ssid, psk: password };
            if (password) {
                data.key_mgmt = 'WPA-PSK';
            }
            else {
                data.key_mgmt = 'NONE';
                if (auth === 'WEP' || (password && !auth)) {
                    data.wep_tx_keyidx = 0;
                    data.wep_key0 = password;
                }
            }
            data.scan_ssid = 1;
            const keys = Object.keys(data);
            debug('connect', data);
            const network = yield this.findNetworkBySsid(ssid);
            const id = network ? network.id : yield this.addNetwork();
            for (let key of keys) {
                if (['ssid', 'psk'].includes(key)) {
                    yield this.setNetworkSettingString(id, key, data[key]);
                }
                else {
                    yield this.setNetworkSetting(id, key, data[key]);
                }
            }
            yield this.enableNetwork(id);
            yield this.selectNetwork(id);
            return yield this.saveConfiguration();
        });
    }
    removeNetwork(id) {
        const _super = name => super[name];
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof id === 'string') {
                const n = yield this.findNetworkBySsid(id);
                id = n ? n.id : -1;
            }
            return id >= 0 ? _super("removeNetwork").call(this, id) : 'FAIL';
        });
    }
    enableNetwork(id) {
        const _super = name => super[name];
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof id === 'string') {
                const n = yield this.findNetworkBySsid(id);
                id = n ? n.id : -1;
            }
            return id >= 0 ? _super("enableNetwork").call(this, id) : 'FAIL';
        });
    }
    disableNetwork(id) {
        const _super = name => super[name];
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof id === 'string') {
                const n = yield this.findNetworkBySsid(id);
                id = n ? n.id : -1;
            }
            return id >= 0 ? _super("disableNetwork").call(this, id) : 'FAIL';
        });
    }
    selectNetwork(id) {
        const _super = name => super[name];
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof id === 'string') {
                const n = yield this.findNetworkBySsid(id);
                id = n ? n.id : -1;
            }
            return id >= 0 ? _super("selectNetwork").call(this, id) : 'FAIL';
        });
    }
    detect() {
        return __awaiter(this, void 0, void 0, function* () {
            function check(result) {
                const { stdout } = result;
                if (stdout.indexOf('802.11') >= 0) {
                    return '802.11';
                }
                else if (stdout.toUpperCase().indexOf('WLAN') >= 0) {
                    return 'WLAN';
                }
                return false;
            }
            const possibles = ['lsusb', 'iwconfig'];
            const commands = [];
            for (const cmd in possibles) {
                if (yield which(cmd))
                    commands.push(cmd);
            }
            const data = yield new Promise(resolve => {
                let index = 0;
                function next() {
                    const cmd = commands[index++];
                    if (!cmd) {
                        return resolve();
                    }
                    child_process_promise_1.exec(cmd)
                        .then(check)
                        .then(found => {
                        if (found)
                            return resolve({ device: found });
                        next();
                    })
                        .catch(next);
                }
                next();
            });
            this.emit('detect', data);
            return data;
        });
    }
    up() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('ifup...');
            yield child_process_promise_1.exec(`ifconfig ${this.iface} up`);
            debug('ifup successful');
            this.emit('ifup');
        });
    }
    down() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('ifdown...');
            yield child_process_promise_1.exec(`ifconfig ${this.iface} down`);
            debug('ifdown successful');
            this.emit('ifdown');
        });
    }
    reboot(delay = 1000) {
        return __awaiter(this, void 0, void 0, function* () {
            debug('ifreboot...');
            yield this.down();
            yield utils_1.wait(delay);
            yield this.up();
            debug('ifreboot successful');
            this.emit('ifreboot');
        });
    }
}
exports.Wireless = Wireless;
function which(cmd) {
    try {
        return Boolean(child_process_promise_1.exec(`which ${cmd}`).stdout);
    }
    catch (e) {
        return false;
    }
}
//# sourceMappingURL=wireless.js.map