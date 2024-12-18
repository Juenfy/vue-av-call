The audio and video call component for vue3
=======================

[![NPM package][npm-img]][npm-url]
[![Build Size][build-size-img]][build-size-url]
[![NPM Downloads][npm-downloads-img]][npm-downloads-url]

<p align="center" style="display: flex">
    <a href="https://call.juenfy.cn"><img width="80%" src="https://raw.githubusercontent.com/Juenfy/resources/refs/heads/master/call/1734492014395.jpg"></a>
    <a href="https://call.juenfy.cn"><img width="80%" src="https://raw.githubusercontent.com/Juenfy/resources/refs/heads/master/call/1734492051485.jpg"></a>
</p>

1.Audio call support.<br/>
2.Video call support.

PS:Only support call by one to one

## Demo
### How to run the demo?
```shell
git clone https://github.com/Juenfy/vue-av-call.git
cd vue-av-call
npm install
#创建软链符号
npm link
npm run start-websocket
cd demo
npm install
npm link vue-av-call
npm run dev
```

## Quick start
### How to install?
```shell
npm i vue-av-call
```
### How to start websocket server?
```shell
cd node_modules/vue-av-call
# run in default port 8080
npm run start-websocket
# run in other port
npm run start-websocket -- port=2346
# run in wss. ca is not required.
npm run start-websocket -- cert=/path/to/cert key=/path/to/key ca=/path/to/ca
```

### How to use?

```js
//import
import {AvCall} from "vue-av-call"
import * as call from "vue-av-call"
import "vue-av-call/dist/vue-av-call.css"

//Preparation before the call

//Set call from at first.
call.setCallFrom({
    id: 1,
    nickanme: 'test001',
    avatar: 'https://api.multiavatar.com/1.png'
})

//Set call to secondly.
call.setCallTo({
    id: 2,
    nickanme: 'test002',
    avatar: 'https://api.multiavatar.com/2.png'
})

//Call by audio or video type finally.
call.startCall(call.CALL_TYPE.AUDIO)
//or
call.startCall(call.CALL_TYPE.VIDEO)
```
```html
<!-- template -->
<av-call></av-call>
```

## API reference

### Initialisation

| Props                          | Description                                                      |                          Default                          |
|--------------------------------|------------------------------------------------------------------|:---------------------------------------------------------:|
| <b>wss</b>: <i>Boolean</i>     | Connect websocket by wss.                                        |                          `false`                          |
| <b>port</b>: <i>Number</i>     | Set the port to connect websocket.                               |                          `8080`                           |
| <b>timeout</b>: <i>Number</i>  | Set the seconds to auto hang up if no one answers after timeout. |                           `30`                            |
| <b>ringtone</b>: <i>Object</i> | Set the ring tone of call and hang up.                           | `{call:new Audio(call.mp3),hangup:new Audio(hangup.mp3)}` |
| <b>debug</b>: <i>Boolean</i>   | Alert message when something error.                              |                          `false`                          |

| Events           | Description                                              |  Callback params  |
|------------------|----------------------------------------------------------|:-----------------:|
| <b>onOpen</b>    | Websocket onopen callback.                               | `websocket event` |
| <b>onMessage</b> | Websocket onmessage callback.                            | `websocket event` |
| <b>onClose</b>   | Websocket onclose callback.                              | `websocket event` |
| <b>onCallOut</b> | Callback when i start to call someone.                   |    `see demo`     |
| <b>onCallIn</b>  | Callback when someone start to call me.                  |    `see demo`     |
| <b>onAnswerCall</b>  | Callback when we answer the phone.                       |    `see demo`     |
| <b>onHangupCall</b>  | Callback when we hang up the phone.                      |    `see demo`     |
| <b>onCallError</b>  | Callback when something error during the call.           |    `see demo`     |
| <b>onControl</b>  | Callback when we switch it such as the speaker or other. |    `see demo`     |

[npm-img]: https://img.shields.io/npm/v/vue-av-call
[npm-url]: https://npmjs.org/package/vue-av-call
[build-size-img]: https://img.shields.io/bundlephobia/minzip/vue-av-call
[build-size-url]: https://bundlephobia.com/result?p=vue-av-call
[npm-downloads-img]: https://img.shields.io/npm/dt/vue-av-call
[npm-downloads-url]: https://www.npmtrends.com/vue-av-call