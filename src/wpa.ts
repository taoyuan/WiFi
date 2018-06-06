'use strict';

const debug = require('debug')('wirelesser:wpa');
import {EventEmitter} from 'events';
import {exec} from 'child-process-promise';

export interface Hotspot {
  bssid: string;
  freq: string;
  rssi: string;
  ssid: string;
}

export interface Network {
  id: number;
  ssid: string;
  essid: string;
  flags: string;
}

export interface WpaStatus {
  wpa_state: string;
  uuid: string;
  address: string;
  p2p_device_address: string;
  id?: number,
  ip_address?: string;
  bssid?: string;
  freq?: string | number;
  ssid?: string;
  mode?: string;
  pairwise_cipher?: string;
  group_cipher?: string;
  key_mgmt?: string;
  [name: string]: any;
}

export class WPA extends EventEmitter {

  constructor(public iface: string = 'wlan0') {
    super();
  }

  async exec(cmd: string, args?: string[] | string): Promise<string> {
    args = args || [];
    if (!Array.isArray(args)) {
      args = [args];
    }
    const c = ['wpa_cli', '-i', this.iface, cmd, ...args].join(' ');
    debug('<<<', c);
    const out = (await exec(c)).stdout.trim();
    debug('>>>', out);
    if (out === 'FAIL') {
      throw new Error('Command failed: ' + c);
    }
    return out;
  }

  /**
   * Request for status
   */
  async status(): Promise<WpaStatus> {
    const status = {};
    const res = await this.exec('status');
    const lines = res.split('\n');
    lines.filter(line => line.length > 3).forEach(line => {
      const parts = line.split('=').map(s => s.trim());
      status[parts[0]] = parts[0] === 'id' ? parseInt(parts[1]) : parts[1];
    });
    this.emit('status', status);
    return <WpaStatus> status;
  }

  /**
   * Scan for wifi AP
   */
  async scan(): Promise<Hotspot[]> {
    // return this.sendCmd(COMMANDS.SCAN)
    let res = await this.exec('scan');
    if (res !== 'OK') {
      throw new Error(res);
    }
    res = await this.exec('scan_result');

    const lines = res.split('\n');
    lines.splice(0, 1);
    const hotspots: Hotspot[] = lines
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
  }

  /**
   * Add new network
   */
  addNetwork(): Promise<number> {
    return this.exec('add_network').then(parseInt);
  }

  /**
   * Request to list networks
   */
  async listNetworks(): Promise<Network[]> {
    // return this.sendCmd(COMMANDS.LIST_NETWORK)
    const res = await this.exec('list_networks');
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
  }

  setNetworkSetting(networkId, name, value): Promise<string> {
    return this.exec('set_network', [networkId, name, value]);
  }

  setNetworkSettingString(networkId, name, value): Promise<string> {
    value = `'"${value}"'`;
    return this.setNetworkSetting(networkId, name, value);
  }

  getNetworkSetting(networkId, name): Promise<string> {
    // return this.sendCmd(`GET_NETWORK ${networkId} ${name}`);
    return this.exec('get_network', [networkId, name]);
  }

  /**
   * Enable configured network
   * @param  {string} networkId network id recieved from list networks
   */
  enableNetwork(networkId): Promise<string> {
    // return this.sendCmd(`ENABLE_NETWORK ${networkId}`);
    return this.exec('enable_network', [networkId]);
  }

  /**
   * Disable configured network
   * @param  {string} networkId networkId network id received from list networks
   */
  disableNetwork(networkId): Promise<string>  {
    // return this.sendCmd(`DISABLE_NETWORK ${networkId}`);
    return this.exec('disable_network', [networkId]);
  }

  /**
   * Select network to connect
   * @param  {String} networkId networkId network id received from list networks
   */
  selectNetwork(networkId): Promise<string>  {
    // return this.sendCmd(`SELECT_NETWORK ${networkId}`);
    return this.exec('select_network', [networkId]);
  }

  /**
   * Remove network to connect
   * @param  {String} networkId networkId network id received from list networks
   */
  removeNetwork(networkId): Promise<string>  {
    // return this.sendCmd(`REMOVE_NETWORK ${networkId}`);
    return this.exec('remove_network', [networkId]);
  }

  reloadConfiguration(): Promise<string>  {
    // this.sendCmd(`RECONFIGURE`);
    return this.exec('reconfigure');
  }

  saveConfiguration(): Promise<string>  {
    // return this.sendCmd(`SAVE_CONFIG`);
    return this.exec('save_config');
  }

  /**
   * Disconnect from AP
   */
  disconnect(): Promise<string>  {
    // return this.sendCmd('DISCONNECT');
    return this.exec('disconnect');
  }

  // --------------------------------------
  // TODO: P2P communication
  // --------------------------------------
}
