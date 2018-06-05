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
const debug = require('debug')('wirelesser:wpa');
const events_1 = require("events");
const child_process_promise_1 = require("child-process-promise");
class WPA extends events_1.EventEmitter {
    constructor(iface = 'wlan0') {
        super();
        this.iface = iface;
    }
    exec(cmd, args) {
        return __awaiter(this, void 0, void 0, function* () {
            args = args || [];
            if (!Array.isArray(args)) {
                args = [args];
            }
            const c = ['wpa_cli', '-i', this.iface, cmd, ...args].join(' ');
            debug('<<<', c);
            const out = (yield child_process_promise_1.exec(c)).stdout.trim();
            debug('>>>', out);
            if (out === 'FAIL') {
                throw new Error('Command failed: ' + c);
            }
            return out;
        });
    }
    status() {
        return __awaiter(this, void 0, void 0, function* () {
            const status = {};
            const res = yield this.exec('status');
            const lines = res.split('\n');
            lines.filter(line => line.length > 3).forEach(line => {
                const parts = line.split('=').map(s => s.trim());
                status[parts[0]] = parts[1];
            });
            this.emit('status', status);
            return status;
        });
    }
    scan() {
        return __awaiter(this, void 0, void 0, function* () {
            let res = yield this.exec('scan');
            if (res !== 'OK') {
                throw new Error(res);
            }
            res = yield this.exec('scan_result');
            const lines = res.split('\n');
            lines.splice(0, 1);
            const hotspots = lines
                .map(line => line.split('\t'))
                .filter(record => record.length > 3)
                .map(record => ({
                bssid: record[0].trim(),
                freq: record[1].trim(),
                rssi: record[2].trim(),
                ssid: record[4].trim()
            }));
            this.emit('scanned', hotspots);
            return hotspots;
        });
    }
    addNetwork() {
        return this.exec('add_network').then(parseInt);
    }
    listNetworks() {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield this.exec('list_networks');
            const lines = res.split('\n');
            lines.splice(0, 1);
            const networks = lines
                .map(line => line.split('\t').map(s => s.trim()))
                .filter(record => record.length >= 3)
                .map(record => ({
                id: parseInt(record[0]),
                ssid: record[1],
                essid: record[2],
                flags: record[3],
            }));
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
        return this.exec('get_network', [networkId, name]);
    }
    enableNetwork(networkId) {
        return this.exec('enable_network', [networkId]);
    }
    disableNetwork(networkId) {
        return this.exec('disable_network', [networkId]);
    }
    selectNetwork(networkId) {
        return this.exec('select_network', [networkId]);
    }
    removeNetwork(networkId) {
        return this.exec('remove_network', [networkId]);
    }
    reloadConfiguration() {
        return this.exec('reconfigure');
    }
    saveConfiguration() {
        return this.exec('save_config');
    }
    disconnect() {
        return this.exec('disconnect');
    }
}
exports.WPA = WPA;
//# sourceMappingURL=wpa.js.map