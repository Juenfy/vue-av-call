基于vue3的音视频通话组件
=======================

[![NPM package][npm-img]][npm-url]
[![Build Size][build-size-img]][build-size-url]
[![NPM Downloads][npm-downloads-img]][npm-downloads-url]

<p align="center" style="display: flex">
    <a href="https://call.juenfy.cn"><img width="40%" src="https://raw.githubusercontent.com/Juenfy/resources/refs/heads/master/call/1734492014395.jpg"></a>
    <a href="https://call.juenfy.cn"><img width="40%" src="https://raw.githubusercontent.com/Juenfy/resources/refs/heads/master/call/1734492051485.jpg"></a>
</p>

1.支持语音通话.<br/>
2.支持视频通话.

PS:暂时只支持一对一通话

## Demo
### 如何运行demo?
```shell
git clone https://github.com/Juenfy/vue-av-call.git
cd vue-av-call
npm install
npm link
npm run start-websocket
cd demo
npm install
npm link vue-av-call
npm run dev
```

## 快速开始
### 如何安装?
```shell
npm i vue-av-call
```
### 如何启动websocket服务?
```shell
cd node_modules/vue-av-call
# 默认8080端口
npm run start-websocket
# 指定端口
npm run start-websocket -- port=2346
# 开启wss ca证书链非必传
npm run start-websocket -- cert=/path/to/cert key=/path/to/key ca=/path/to/ca
```

### 如何使用?

```js
//导入
import {AvCall} from "vue-av-call"
import * as call from "vue-av-call"
import "vue-av-call/dist/vue-av-call.css"

//拨打通话前的准备

//首先设置发起方的用户信息
call.setCallFrom({
    id: 1,
    nickanme: 'test001',
    avatar: 'https://api.multiavatar.com/1.png'
})

//再设置接收方的用户信息
call.setCallTo({
    id: 2,
    nickanme: 'test002',
    avatar: 'https://api.multiavatar.com/2.png'
})

//最后拨打语音或者视频电话
call.startCall(call.CALL_TYPE.AUDIO) //语音通话

call.startCall(call.CALL_TYPE.VIDEO) //视频通话
```
```html
<!-- template -->
<av-call></av-call>
```

## API 参考

### 初始化

| Props参数                        | 描述              |                            默认                             |
|--------------------------------|-----------------|:---------------------------------------------------------:|
| <b>wss</b>: <i>Boolean</i>     | 开启wss协议         |                          `false`                          |
| <b>port</b>: <i>Number</i>     | 指定连接端口          |                          `8080`                           |
| <b>timeout</b>: <i>Number</i>  | 设置超时未接听自动挂断，单位秒 |                           `30`                            |
| <b>ringtone</b>: <i>Object</i> | 自定义通话与挂断的铃声提示   | `{call:new Audio(call.mp3),hangup:new Audio(hangup.mp3)}` |
| <b>debug</b>: <i>Boolean</i>   | 浏览器会弹出一些错误信息    |                          `false`                          |

| Events事件            | 描述                 |       回调参数        |
|---------------------|--------------------|:-----------------:|
| <b>onOpen</b>       | Websocket 连接成功的回调  | `websocket event` |
| <b>onMessage</b>    | Websocket 接收到消息的回调 | `websocket event` |
| <b>onClose</b>      | Websocket 关闭连接的回调  | `websocket event` |
| <b>onCallOut</b>    | 拨打时回调              |    `see demo`     |
| <b>onCallIn</b>     | 来电时回调              |    `see demo`     |
| <b>onAnswerCall</b> | 接通电话时回调            |    `see demo`     |
| <b>onHangupCall</b> | 挂断电话时回调            |    `see demo`     |
| <b>onCallError</b>  | 通话过程中异常回调          |    `see demo`     |
| <b>onControl</b>    | 切换扬声器等开关按钮时回调      |    `see demo`     |

[npm-img]: https://img.shields.io/npm/v/vue-av-call
[npm-url]: https://npmjs.org/package/vue-av-call
[build-size-img]: https://img.shields.io/bundlephobia/minzip/vue-av-call
[build-size-url]: https://bundlephobia.com/result?p=vue-av-call
[npm-downloads-img]: https://img.shields.io/npm/dt/vue-av-call
[npm-downloads-url]: https://www.npmtrends.com/vue-av-call