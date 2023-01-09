import { getDevID, getDevName } from "./types.js";
import * as reqb from "./reqbuilder.js";
import { sleep } from "https://js.sabae.cc/sleep.js";

// https://lego.github.io/lego-ble-wireless-protocol-docs/
// https://googlechrome.github.io/samples/web-bluetooth/notifications.html

export class LWP {
  data = {};
  callbacks = [];
  getPort(portId) {
    if (!this.data.ports) {
      this.data.ports = {};
    }
    if (!this.data.ports[portId]) {
      this.data.ports[portId] = {};
    }
    return this.data.ports[portId];
  }
  getMode(port, nmode) {
    if (!port.modes) {
      port.modes = [];
    }
    if (!port.modes[nmode]) {
      port.modes[nmode] = {};
    }
    return port.modes[nmode];
  }
  addDataListener(callback) {
    this.callbacks.push(callback);
  }
  removeDataListener(callback) {
    for (let i = 0; i < this.callbacks.lengh; i++) {
      if (this.callbacks[i] == callback) {
        this.callbacks.splice(1, i);
        return;
      }
    }
  }
  _dispatchData() {
    this.callbacks.forEach(c => c(this.data));
  }
  async connect(options = {}) {
    const uuidService = "00001623-1212-efde-1623-785feabcd123"; // "c5f50001-8280-46da-89f4-6d8051e4aeef";
    const uuidCharacteristic = "00001624-1212-efde-1623-785feabcd123";
    //const manufacturerData = [{ companyIdentifier: 0xffff }];
    const device = await navigator.bluetooth.requestDevice({
      filters: [
        //{ name: "Technic Hub" },
        { services: [uuidService] }, // for all of LEGO series
        //{ manufacturerData },
      ],
      // acceptAllDevices: true,
      optionalServices: [uuidService],
    });
    console.log(device, device.name);
    device.addEventListener("advertisementreceived", (event) => {
      const b = Base64.decode(event.device.id);
      const sid = new TextDecoder().decode(b);
      console.log(sid);
      console.log('Advertisement received.');
      console.log('  Device Name: ' + event.device.name);
      console.log('  Device ID: ' + event.device.id, sid);
      console.log('  RSSI: ' + event.rssi);
      console.log('  TX Power: ' + event.txPower);
      console.log('  UUIDs: ' + event.uuids);
      //console.log(event);
      event.manufacturerthis.data.forEach((valueDataView, key) => {
        console.log('Manufacturer', key, valueDataView);
      });
      event.servicethis.data.forEach((valueDataView, key) => {
        console.log('Service', key, valueDataView);
      });

      this.data.name = event.device.name.trim();
      //this.data.id = sid;
      this.data.id = event.device.id;
      this.data.rssi = event.rssi;
      this.data.txPower = event.txPower;
      this.data.uuids = event.uuids;
      this._dispatchData();
    });
    //await device.watchAdvertisements();

    const server = await device.gatt.connect();
    this.server = server;
    console.log("server", server);
    //const services = await server.getPrimaryServices();
    //console.log(services);
    const service = await server.getPrimaryService(uuidService);
    console.log(service);
    const ch = await service.getCharacteristic(uuidCharacteristic);
    // Write without response, Notify
    console.log(ch);

    await ch.startNotifications();
    const parseUploadStream = (e) => {
      const v = new Uint8Array(e.target.value.buffer);
      // len, hubid(0), messagetype()
      // https://lego.github.io/lego-ble-wireless-protocol-docs/index.html#hub-attached-i-o
      // 5,  0, 4, 0, 0, disconnect A, messagetype(4=Hub Attached I/O)
      // 5,  0, 4, 1, 0, disconnect B
      // 15, 0, 4, 1, 1, 46, 0, 0, 16, 0, 0, 0, 16, 0, 0: connect B motor
      //           portid 1=B,
      //              attach=1, detach=0
      //                 0x002e ?? motor? List NOT guaranteed up to date! https://lego.github.io/lego-ble-wireless-protocol-docs/index.html#io-typ
      //                        hardware version
      //                                     software version

      /* Technic Hub https://lego.github.io/lego-ble-wireless-protocol-docs/index.html#hub-attached-i-o
      connected 0 0x2e - motor (not listed) :POWER(-100 100) PCT(%)
      connected 1 0x2e - motor (not listed) :POWER(-100 100)
      connected 50 0x17 - RGB Light :COL O(0 10)
      connected 59 0x15 - Current :CUR L(0 4095) mA
      connected 60 0x14 - Voltage :VLT L(0 4095) mV
      connected 61 0x3c - :TEMP(-900 900) DEG (ちょっと高め)
      connected 96 0x3c - :TEMP(-900 900) DEG (更にちょっと高め)
      connected 97 0x39 - :GRV(-32768 32768) mG, ACCELEROMETER ? https://github.com/nathankellenicki/node-poweredup/blob/master/src/hubs/technicmediumhub.ts
      connected 98 0x3a - :ROT(-28571.419921875 28571.419921875) DPS, GYRO_SENSOR ?
      connected 99 0x3b - :POS(min-max:-180-180) DEG, TILT_SENSOR ?
      connected 100 0x36 - :GEST(min-max:0-4)
      */
      const datalen = v[0];

      const buf2bin = (idx, len) => new Uint8Array(event.target.value.buffer, idx, len === undefined ? datalen - idx : len);
      const buf2s = (idx, len) => {
        const s = new TextDecoder().decode(buf2bin(idx, len));
        const n = s.indexOf("\u0000");
        return n >= 0 ? s.substring(0, n) : s;
      };
      const buf2hex = (idx, len) => {
        const b = buf2bin(idx, len);
        const s = [];
        for (const n of b) {
          s.push((n < 0x10 ? "0" : "") +  n.toString(16));
        }
        return s.join(":");
      };
      const buf2float = (idx, len) => {
        const b = new Uint8Array(len * 4);
        for (let i = 0; i < b.length; i++) {
          b[i] = v[i + idx];
        }
        return new Float32Array(b.buffer);
      };

      const hubid = v[1];
      const mestype = v[2];
      if (mestype == 1) {
        const prop = v[3];
        const op = v[4];
        if (prop == 1) {
          this.data.name = buf2s(5, datalen - 5).trim();
        } else if (prop == 2) {
          this.data.hubbtn = v[5];
        } else if (prop == 3) {
          // firm ver int32
        } else if (prop == 4) {
          // hard ver int32
        } else if (prop == 5) {
          this.data.rssi = v[5];
        } else if (prop == 6) {
          this.data.battery = v[5];
        } else if (prop == 7) {
          this.data.batterytype = v[5];
        } else if (prop == 8) {
          this.data.manuname = buf2s(5, datalen - 5);
        } else if (prop == 9) {
          this.data.radiover = buf2s(5, datalen - 5);
        } else if (prop == 0xa) {
          this.data.lwpver = v[5] | (v[6] << 8);
        } else if (prop == 0xb) {
          this.data.system = v[5] >> 5;
          this.data.desc = v[5] & 31;
        } else if (prop == 0xc) {
          this.data.lastnet = v[5];
        } else if (prop == 0xd) {
          this.data.mac1 = buf2hex(5, datalen - 5);
        } else if (prop == 0xe) {
          this.data.mac2 = buf2hex(5, datalen - 5);
        } else if (prop == 0xf) {
          this.data.netfamily = v[5];
        } else {
          throw new Error("unknown prop: " + prop);
        }
        return;
      } else if (mestype == 4) {
        const portId = v[3];
        const port = this.getPort(portId);
        const comtype = v[4];
        if (comtype == 0) { // disconnect
          console.log("disconnected", portId);
          this.data.ports[portId] = {};
          return;
        } else if (comtype == 1) {
          const devid = v[5] | (v[6] << 8);
          port.devid = getDevID(devid);
          port.devname = getDevName(devid);
          console.log("connected", portId, port.devid);
          return;
        }
      } else if (mestype == 2) { // Hub Action
        const actiontype = v[3];
        if (actiontype == 0x30) { // switch off
          this.data = {};
          return;
        } else if (actiontype == 0x31) { // disconnect
          this.data = {};
          return;
        }
        console.log("Hub Action", actiontype);
        return;
      } else if (mestype == 5) { // RSSi
        const rssi = (new Int8Array(event.target.value.buffer))[3];
        console.log("RSSi", rssi);
        return;
      } else if (mestype == 0x43) { // 0x43 - port information
        const portId = v[3];
        const port = this.getPort(portId);
        const type = v[4];
        if (type == 1) {
          const output = !!(v[5] & 1);
          const input = !!(v[5] & 2);
          port.logicalcombi = !!(v[5] & 4);
          port.logicalsync = !!(v[5] & 8);
          port.cntmode = v[6];
          const inputmode = v[7] | (v[8] << 8);
          const outputmode = v[9] | (v[10] << 8);
          for (let i = 0; i < port.cntmode; i++) {
            const mode = this.getMode(port, i);
            mode.input = !!(inputmode & (1 << i));
            mode.output = !!(outputmode & (1 << i));
          }
          //console.log({ output, input, logicalcombi, logicalsync, cntmode, inputmode, outputmode });
          return;
        }
      } else if (mestype == 0x44) { // 0x44 - response of motor port request https://lego.github.io/lego-ble-wireless-protocol-docs/index.html#port-mode-information
        const portId = v[3];
        const port = this.getPort(portId);
        const nmode = v[4];
        const mode = this.getMode(port, nmode);
        const infotype = v[5]; // 0:NAME, 1:RAW, 2:PCT, 3:SI, 4:SYMBOL, 5:MAPPING, 0x80:VALUE FORMAT
        if (infotype == 0) {
          mode.name = buf2s(6);
          //console.log("info0", portId, mode, name);
          return;
        } else if (infotype == 1) {
          const f = buf2float(6, 2);
          mode.min = f[0];
          mode.max = f[1];
          //console.log("info1", portId, mode);
          return;
        } else if (infotype == 4) {
          mode.symbol = buf2s(6);
          //console.log("info5 Symbol", portId, mode, name);
          return;
        }
        console.log("infotype", infotype);
      } else if (mestype == 0x45) { // 0x45 port input
        const portId = v[3];
        const port = this.getPort(portId);
        const nmode = port.currentmode; // because can't get
        const mode = this.getMode(port, nmode);
        const n2i = (n) => n > 32767 ? n - 65536 : n;
        const b2i = (n) => n > 127 ? n - 256 : n;
        if (datalen == 5) {
          mode.value = b2i(v[4]);
          //console.log("port value", portId, n);
          return;
        } else if (datalen == 6) {
          mode.value = n2i(v[4] | (v[5] << 8));
          //console.log("port value", portId, n);
          return;
        } else if (datalen == 8) {
          mode.value = v[4] | (v[5] << 8) | (v[6] << 16) | (v[7] << 24);
          //console.log("port value", portId, n, "or float");
          return;
        } else if (datalen == 10) { // ACCELEROMETER, GYRO_SENSOR, TILT_SENSOR
          const x = n2i(v[4] | (v[5] << 8));
          const y = n2i(v[6] | (v[7] << 8));
          const z = n2i(v[8] | (v[9] << 8));
          mode.value = { x, y, z };
          //console.log("port value", portId, x, y, z);
          return;
        } else if (datalen == 7) { // uint8 x 3
          mode.value = [v[4], v[5], v[6]];
          return;
        } else if (datalen == 20) { // 16byte
        }
        console.log("datalen", datalen);
      } else if (mestype == 0x47) {
        const portId = v[3];
        const port = this.getPort(portId);
        const nmode = v[4];
        const mode = this.getMode(port, nmode);
        const delta = 0; // v[5] v[6] v[7] v[8]
        mode.notify = !!v[9];
        return;
      }
      throw new Error("unknown mestype: " + mestype.toString(16));
    };
    ch.addEventListener("characteristicvaluechanged", (e) => {
      parseUploadStream(e);
      this._dispatchData();
    });
    this.ch = ch;

      // auto collect
    const collectAll = async () => {
      await sleep(2000);
      for (const portId in this.data.ports) {
        await this.write(reqb.createPortInformationRequest(portId, 1));
      }
      await sleep(1000);
      for (const portId in this.data.ports) {
        const port = this.data.ports[portId];
        for (let i = 0; i < port.cntmode; i++) {
          await this.write(reqb.createPortModeInformationRequest(portId, i, 0)); // name
          await this.write(reqb.createPortModeInformationRequest(portId, i, 1)); // min/max
          await this.write(reqb.createPortModeInformationRequest(portId, i, 4)); // symbol
        }      
      }
    };
    const autoCollect = options.autoCollect ?? true;
    if (autoCollect) {
      collectAll();
    }
  }
  disconnect() {
    this.server.disconnect();
  }
  async write(bin) {
    await this.ch.writeValueWithResponse(bin);
  }
  async startPortInput(portId, nmode, start = true) {
    const port = this.getPort(portId);
    port.currentmode = nmode;
    await this.write(reqb.createPortInputFormatSetup(portId, nmode, true));
  }
  async stopPortInput(portId, nmode) {
    await this.startPortInput(portId, nmode, false);
  }
}
