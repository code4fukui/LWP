# LWP

LEGO Wireless Protocol のJavaScript/WebBluetoothライブラリです。

## デモ

- [LWPデバッガー](https://code4fukui.github.io/LWP/debugger.html)
- [BLEによるカラーピッカー](https://code4fukui.github.io/LWP/colorpicker.html)

## 主な機能

- LEGO製品とのBluetoothによる通信
- ポート制御(モーター、LEDなど)
- センサー値の取得

## 必要環境

- WebBluetoothをサポートするブラウザ

## 使い方

LWPクラスをインポートし、`connect()`メソッドでデバイスに接続します。
ポートの制御や値の取得は、LWPクラスのメソッドを呼び出して行います。

```javascript
import { LWP } from "./LWP.js";

const lwp = new LWP();
await lwp.connect();

// モーターの制御
lwp.write(reqb.createPortOutputStartPower(portId, power));

// センサー値の取得
lwp.startPortInput(portId, mode, enabled);
lwp.addDataListener((data) => {
  console.log(data.ports[portId].modes[mode].value);
});
```

## ライセンス

MIT License