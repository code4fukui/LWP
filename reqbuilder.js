const HUB_ID = 0;
export const createMessage = (buffer, messageType, size) => {
  const len = size + 3;
  buffer[0] = len;
  buffer[1] = HUB_ID;
  buffer[2] = messageType;
  return len;
};
export const createPortOutput = (buffer, portId, executeImmediately, sendFeedback, subCommand, size) => {
  const portOutputCommand = 0x81;
  const s = executeImmediately ? 16 : 0;
  const c = sendFeedback ? 1 : 0;
  buffer[3] = portId;
  buffer[4] = s + c;
  buffer[5] = subCommand;
  return createMessage(buffer, portOutputCommand, 3 + size);
};
export const createPortOutputStartPower = (portId, power) => { // power 0:float, 127:brake, 1-100, -1--100 pwm
  const startPower = 0x01;
  const buffer = new Uint8Array(6 + 1);
  buffer[6] = power;
  const res = createPortOutput(buffer, portId, true, false, startPower, 2);
  return buffer;
};
export const createPortOutputStartPower2 = (portId, power) => { // power 0:float, 127:brake, 1-100, -1--100 pwm
  const startPower2 = 0x02; // after set up virtual port
  const buffer = new Uint8Array(6 + 2);
  buffer[6] = power;
  buffer[7] = power;
  const res = createPortOutput(buffer, portId, true, false, startPower2, 2);
  return buffer;
};
// servo motor
export const createGotoAbsolutePosition = (portId, abspos, speed, maxpower) => {
  const gotoAbsolutePosition = 0xd;
  const sublen = 7;
  let idx = 6;
  const buffer = new Uint8Array(idx + sublen);
  buffer[idx++] = abspos & 0xff;
  buffer[idx++] = (abspos >> 8) & 0xff;
  buffer[idx++] = (abspos >> 16) & 0xff;
  buffer[idx++] = (abspos >> 24) & 0xff;
  buffer[idx++] = speed;
  buffer[idx++] = maxpower;
  const hold = true;
  const brake = false;
  buffer[idx++] = hold ? 126 : brake ? 127 : 0;
  const res = createPortOutput(buffer, portId, true, false, gotoAbsolutePosition, sublen);
  return buffer;
};
// RSSi?
export const createRequestRSSi = (portId, r, g, b) => {
  const subcmd = 0; // 何を送ってもRSSiが帰る
  const sublen = 3;
  let idx = 6;
  const buffer = new Uint8Array(idx + sublen);
  buffer[idx++] = r;
  buffer[idx++] = g;
  buffer[idx++] = b;
  const res = createPortOutput(buffer, portId, true, false, subcmd, sublen);
  return buffer;
};
// rgb light
export const createSetColor = (portId, color) => { // 0-10 0:off, 1:pink, 2:purple, 3:blue, 4:lightblue, 5:teal 6:green, 7:yellow, 8:orange, 9:red, 10:white
  const subcmd = 0x51;
  const sublen = 2;
  let idx = 6;
  const buffer = new Uint8Array(idx + sublen);
  buffer[idx++] = 0;
  buffer[idx++] = color;
  const res = createPortOutput(buffer, portId, true, false, subcmd, sublen);
  return buffer;
};
export const createSetRGB = (portId, r, g, b) => { // must set mode = 1
  const subcmd = 0x51;
  const sublen = 5;
  let idx = 6;
  const buffer = new Uint8Array(idx + sublen);
  buffer[idx++] = 0x02;
  buffer[idx++] = r;
  buffer[idx++] = g;
  buffer[idx++] = b;
  const res = createPortOutput(buffer, portId, true, false, subcmd, sublen);
  return buffer;
};
//
export const createPortInformationRequest = (portId, type) => {
  const mestype = 0x21;
  const sublen = 2;
  let idx = 3;
  const buffer = new Uint8Array(idx + sublen);
  buffer[idx++] = portId;
  buffer[idx++] = type;
  const res = createMessage(buffer, mestype, sublen);
  return buffer;
};
export const createPortModeInformationRequest = (portId, mode, type) => {
  const mestype = 0x22;
  const sublen = 3;
  let idx = 3;
  const buffer = new Uint8Array(idx + sublen);
  buffer[idx++] = portId;
  buffer[idx++] = mode;
  buffer[idx++] = type;
  const res = createMessage(buffer, mestype, sublen);
  return buffer;
};
//
export const createPortInputFormatSetup = (portId, mode, enabled = 1) => {
  const mestype = 0x41;
  const sublen = 7;
  let idx = 3;
  const buffer = new Uint8Array(idx + sublen);
  buffer[idx++] = portId;
  buffer[idx++] = mode;
  buffer[idx++] = 0; // data interval
  buffer[idx++] = 0; // data interval
  buffer[idx++] = 0; // data interval
  buffer[idx++] = 0; // data interval
  buffer[idx++] = enabled; // Notification enabled
  const res = createMessage(buffer, mestype, sublen);
  return buffer;
};
export const createHubActions = (type) => {
  const mestype = 0x02;
  const sublen = 1;
  let idx = 3;
  const buffer = new Uint8Array(idx + sublen);
  buffer[idx++] = type;
  const res = createMessage(buffer, mestype, sublen);
  return buffer;
};
export const createHubProperty = (prop) => {
  const mestype = 0x01;
  const sublen = 2;
  let idx = 3;
  const buffer = new Uint8Array(idx + sublen);
  buffer[idx++] = prop;
  buffer[idx++] = 0x05; // request update
  const res = createMessage(buffer, mestype, sublen);
  //console.log(buffer);
  return buffer;
};
