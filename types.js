import { fix0 } from "https://js.sabae.cc/fix0.js";

// https://lego.github.io/lego-ble-wireless-protocol-docs/index.html#sys-typ

const types = {
  0x0001: "Motor",
  0x0002: "System Train Motor",
  0x0005: "Button",
  0x0008:	"LED Light",
  0x0014:	"Voltage",
  0x0015: "Current",
  0x0016:	"Piezo Tone (Sound)",
  0x0017:	"RGB Light",
  0x0022:	"External Tilt Sensor",
  0x0023:	"Motion Sensor",
  0x0025:	"Vision Sensor",
  0x0026:	"External Motor with Tacho",
  0x0027:	"Internal Motor with Tacho",
  0x0028:	"Internal Tilt",
  // add
  0x002e: "External Motor with Technic",
  0x0039: "Internal Accelerometer",
  0x003a: "Internal Rotation Sensor",
  0x003b: "Internal Angular Rate Sensor",
  0x0036: "Internal Gesture Sensor",
  0x003c: "Internal Temperature",
};

export const getDevID = (id) => {
  return "0x" + fix0(id.toString(16), 4);
};
export const getDevName = (id) => {
  const name = types[id];
  if (name === undefined) {
    return getDevID(id) + " (unknown)";
  }
  return name;
};
