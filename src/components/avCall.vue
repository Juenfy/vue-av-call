<script setup>
import {onMounted, onUnmounted, ref, watch} from "vue"
import {CALL_STATUS, CALL_TYPE, callType, stopCall, isCall, from, to, setCallTo, setCallFrom} from "../index.js"
import {durationFormat} from "../utils/helper.js"
import callAudio from "../assets/ringtone/call.mp3"
import hangupAudio from "../assets/ringtone/hangup.mp3"

// api参数
const props = defineProps({
  //wss
  wss: {
    type: Boolean,
    default: false
  },
  //指定ws端口
  port: {
    type: Number,
    default: 8080
  },
  //超时自动挂断
  timeout: {
    type: Number,
    default: 30
  },
  //铃声
  ringtone: {
    type: Object,
    default: {
      call: new Audio(callAudio),
      hangup: new Audio(hangupAudio)
    }
  },
  debug: {
    type: Boolean,
    default: true
  }
})
// api事件
const emit = defineEmits(["onOpen", "onMessage", "onClose", "onCallIn", "onCallOut", "onAnswerCall", "onHangupCall", "onIcecandidate", "onCallError", "onControl"])
const ws = ref(null)
const showCall = ref(false)
const callStatus = ref(CALL_STATUS.CLOSE)
const callDuration = ref(0)
const interval = ref(null)
const remoteAudio = ref(null)
const isRemoteAudioPlaying = ref(false)
const localVideoPos = ref({x: 10, y: 10}) // 本地视频初始位置
const mouseDownStartPos = ref({x: 0, y: 0})  // 鼠标按下时的位置
const isLocalVideoDragging = ref(false)  // 是否正在拖拽本地视频
const localVideo = ref(null)
const remoteVideo = ref(null)
const isRemoteVideoPlaying = ref(false)
const controlBtn = ref({
  camera: true,
  microphone: true,
  speaker: true,
  blur: false
})
const stream = ref(null)  // 本地视频流
const remoteStream = ref(null)  // 远程视频流
const peerConnection = ref(null)
const iceCandidateQueue = ref([])
// 配置 STUN/TURN 服务器
const configuration = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302"
    }
  ]
}

// 发起方拨打通话界面
const callOut = async () => {
  if (callStatus.value !== CALL_STATUS.CLOSE) {
    emit("onCallError", {
      type: callType.value,
      from: from.value,
      to: to.value,
      action: "error",
      error: "busy",
      message: "您正在通话中，请挂断后再拨打！"
    })
    props.debug && alert("您正在通话中，请挂断后再拨打！")
  }
  callDuration.value = 0
  controlBtn.value.camera = callType.value === CALL_TYPE.VIDEO
  // 获取本地媒体流
  try {
    stream.value = await navigator.mediaDevices.getUserMedia({
      video: callType.value === CALL_TYPE.VIDEO,
      audio: true
    })
    if (callType.value === CALL_TYPE.VIDEO) {
      localVideo.value.srcObject = stream.value
    }
    // 初始化 PeerConnection
    peerConnection.value = new RTCPeerConnection(configuration)

    // 添加本地媒体流到PeerConnection
    stream.value.getTracks().forEach((track) => {
      peerConnection.value.addTrack(track, stream.value)
    })

    // 捕获远端流
    peerConnection.value.ontrack = (event) => {
      remoteStream.value = event.streams[0]
      if (callType.value === CALL_TYPE.VIDEO) {
        remoteVideo.value.srcObject = remoteStream.value
        if (!isRemoteVideoPlaying.value) {
          remoteVideo.value.play()
          isRemoteVideoPlaying.value = true
        }
      } else {
        remoteAudio.value.srcObject = remoteStream.value
        if (!isRemoteAudioPlaying.value) {
          remoteAudio.value.play()
          isRemoteAudioPlaying.value = true
        }
      }
    }

    // 创建 offer
    const offer = await peerConnection.value.createOffer()
    await peerConnection.value.setLocalDescription(offer)

    // 监听ICE候选
    peerConnection.value.onicecandidate = async (event) => {
      if (event.candidate) {
        const candidateData = {
          type: callType.value,
          from: from.value,
          to: to.value,
          content: "监听ICE候选",
          action: "ice-candidate",
          candidate: event.candidate
        }
        await sendMsg(candidateData)
        emit("onIcecandidate", candidateData)
      }
    }

    // 发起方拉起通话界面，等待接收方接听
    const callOutData = {
      type: callType.value,
      from: from.value,
      to: to.value,
      content: "发起方发起通话",
      action: "offer",
      offer: offer
    }
    await sendMsg(callOutData)
    showCall.value = true
    callStatus.value = CALL_STATUS.OUT
    await playRingTone()
    emit("onCallOut", callOutData)
    // 30秒内未接听，挂断
    setTimeout(() => {
      if (callStatus.value === CALL_STATUS.OUT) {
        hangupCall("timeout", "无人接听")
      }
    }, props.timeout * 1000)
  } catch (error) {
    closeThem()
    console.error("获取本地媒体流失败:", error)
    emit("onCallError", {
      type: callType.value,
      from: from.value,
      to: from.value,
      action: "error",
      error: "stream_error",
      message: "获取本地媒体流失败:" + error
    })
    props.debug && alert("获取本地媒体流失败:" + error)
  }
}

// 接收方拉起来电界面
const callIn = async (data) => {
  if (callStatus.value !== CALL_STATUS.CLOSE) {
    await sendMsg({
      type: callType.value,
      from: from.value,
      to: data.from,
      action: "error",
      error: "busy",
      message: "对方正在通话中，请稍后再拨打！"
    })
    return
  }
  callDuration.value = 0
  await setCallTo(data.from)
  if (!from.value) {
    await setCallFrom(data.to)
  }
  from.value.offer = data.offer
  callType.value = data.type
  showCall.value = true
  callStatus.value = CALL_STATUS.IN
  await playRingTone()
  const callInData = {
    type: callType.value,
    from: from.value,
    to: to.value,
    content: "接收方拉起通话",
    action: "handle-offer"
  }
  emit("onCallIn", callInData)
}

// 主动挂断通话
const hangupCall = async (action, content) => {
  const data = {
    type: callType.value,
    from: from.value,
    to: to.value,
    content: callDuration.value > 0 ? "通话时长 " + durationFormat(callDuration.value) : content,
    duration: callDuration.value,
    action: action
  }
  await sendMsg(data)
  closeThem()
  await pauseRingTone(true)
  emit("onHangupCall", data)
}

// 被动挂断通话
const handleHangup = async (action, content) => {
  closeThem()
  await pauseRingTone(true)
  const data = {
    type: callType.value,
    from: from.value,
    to: to.value,
    content: callDuration.value > 0 ? "通话时长 " + durationFormat(callDuration.value) : content,
    duration: callDuration.value,
    action: "handle-" + action
  }
  emit("onHangupCall", data)
}

// 挂断通话处理
const closeThem = () => {
  showCall.value = false
  callStatus.value = CALL_STATUS.CLOSE
  controlBtn.value.camera = false
  controlBtn.value.microphone = true
  controlBtn.value.speaker = true
  console.log("关闭通话：", showCall.value, callStatus.value)
  stopCall()
  if (peerConnection.value) {
    peerConnection.value.close()
    peerConnection.value = null
  }
  if (stream.value) {
    const tracks = stream.value.getTracks()
    tracks.forEach((track) => track.stop())
  }
  if (localVideo.value)
    localVideo.value.srcObject = null
  if (remoteVideo.value)
    remoteVideo.value.srcObject = null
  if (remoteAudio.value)
    remoteAudio.value.srcObject = null
  if (interval.value) {
    clearInterval(interval.value)
    interval.value = null
  }
  callDuration.value = 0
  iceCandidateQueue.value = []
}

// 接收方同意接听
const answerCall = async () => {
  // 获取本地媒体流
  try {
    stream.value = await navigator.mediaDevices.getUserMedia({
      video: callType.value === CALL_TYPE.VIDEO,
      audio: true
    })
    if (callType.value === CALL_TYPE.VIDEO) {
      localVideo.value.srcObject = stream.value
    }
    // 初始化 PeerConnection
    peerConnection.value = new RTCPeerConnection(configuration)

    // 添加本地媒体流到PeerConnection
    stream.value.getTracks().forEach((track) => {
      peerConnection.value.addTrack(track, stream.value)
    })

    // 捕获远端流
    peerConnection.value.ontrack = (event) => {
      remoteStream.value = event.streams[0]
      if (callType.value === CALL_TYPE.VIDEO) {
        remoteVideo.value.srcObject = remoteStream.value
      } else {
        remoteAudio.value.srcObject = remoteStream.value
      }
    }

    await peerConnection.value.setRemoteDescription(new RTCSessionDescription(from.value.offer))

    // 创建 answer
    const answer = await peerConnection.value.createAnswer()
    await peerConnection.value.setLocalDescription(answer)

    // 监听ICE候选
    peerConnection.value.onicecandidate = async (event) => {
      if (event.candidate) {
        const candidateData = {
          type: callType.value,
          from: from.value,
          to: to.value,
          content: "监听ICE候选",
          action: "ice-candidate",
          candidate: event.candidate
        }
        await sendMsg(candidateData)
        emit("onIcecandidate", candidateData)
      }
    }

    for (const candidate of iceCandidateQueue.value) {
      await peerConnection.value.addIceCandidate(candidate)
    }

    iceCandidateQueue.value = []

    // 发送 answer 给发起方
    const answerCallData = {
      type: callType.value,
      from: from.value,
      to: to.value,
      content: "正在通话中",
      action: "answer",
      answer: answer
    }
    await sendMsg(answerCallData)
    callStatus.value = CALL_STATUS.CALLING
    await pauseRingTone()
    interval.value = setInterval(() => {
      ++callDuration.value
    }, 1000)
    emit("onAnswerCall", answerCallData)
  } catch (error) {
    await hangupCall("reject", "已拒绝接听")
    console.error("获取本地媒体流失败:", error)
    emit("onCallError", {
      type: callType.value,
      from: from.value,
      to: from.value,
      action: "error",
      error: "stream_error",
      message: "获取本地媒体流失败:" + error
    })
    props.debug && alert("获取本地媒体流失败:" + error)
  }
}

// 发起方处理接收到的answer
const handleAnswer = async (answer) => {
  from.value.answer = answer
  callStatus.value = CALL_STATUS.CALLING
  await peerConnection.value.setRemoteDescription(new RTCSessionDescription(answer))
  for (const candidate of iceCandidateQueue.value) {
    await peerConnection.value.addIceCandidate(candidate)
  }

  iceCandidateQueue.value = []
  await pauseRingTone()
  interval.value = setInterval(() => {
    ++callDuration.value
  }, 1000)
  const answerCallData = {
    type: callType.value,
    from: from.value,
    to: to.value,
    content: "正在通话中",
    action: "handle-answer"
  }
  emit("onAnswerCall", answerCallData)
}

// 处理新的 ICE 候选
const handleNewICECandidate = async (candidate) => {
  const iceCandidate = new RTCIceCandidate(candidate)
  if (peerConnection.value?.signalingState === "have-remote-offer" || peerConnection.value?.signalingState === "stable") {
    await peerConnection.value.addIceCandidate(iceCandidate)
  } else {
    iceCandidateQueue.value.push(iceCandidate)
  }
}

// 播放铃声
const playRingTone = async () => {
  props.ringtone.call.loop = true
  props.ringtone.call.play()
}
// 停止播放铃声
const pauseRingTone = async (stop = false) => {
  props.ringtone.call.loop = false
  props.ringtone.call.pause()
  if (stop) props.ringtone.hangup.play()
}

// 摄像头、扬声器、麦克风开关控制
const controls = (type) => {
  let value = false
  let callback = false
  switch (type) {
    case "camera":
      if (callType.value === CALL_TYPE.VIDEO) {
        const videoTrack = stream.value.getVideoTracks()[0]
        if (videoTrack) {
          value = controlBtn.value.camera = !controlBtn.value.camera
          videoTrack.enabled = controlBtn.value.camera // 通过 enabled 属性开关摄像头
          if (controlBtn.value.camera) {
            videoTrack.start()// 开启视频流
            localVideo.value.srcObject = stream.value
          } else {
            videoTrack.stop()// 停止视频流并释放资源
            localVideo.value.srcObject = null
          }
          callback = true
        }
      }
      break
    case "speaker":
      value = controlBtn.value.speaker = !controlBtn.value.speaker
      if (callType.value === CALL_TYPE.VIDEO) {
        remoteVideo.value.muted = controlBtn.value.speaker
      } else {
        remoteAudio.value.volume = controlBtn.value.speaker ? 1 : 0
      }
      callback = true
      break
    case "microphone":
      const audioTrack = stream.value.getAudioTracks()[0]
      if (audioTrack) {
        value = controlBtn.value.microphone = !controlBtn.value.microphone
        audioTrack.enabled = controlBtn.value.microphone // 通过 enabled 属性开关麦克风
        callback = true
      }
      break
    default:
      value = controlBtn.value.blur = !controlBtn.value.blur
      callback = true
      break
  }
  emit("onControl", {
    type: type,
    value: value
  })
}

// 连接websocket
const startWebsocket = async () => {
  if (!ws.value) {
    const url = props.wss ? `wss://localhost:${props.port}` : `ws://localhost:${props.port}`
    if ("WebSocket" in window) {
      console.log("当前浏览器支持 WebSocket")
      ws.value = new WebSocket(url)
    } else if ("MozWebSocket" in window) {
      console.log("当前浏览器支持 MozWebSocket")
      ws.value = new MozWebSocket(url)
    } else {
      console.error("当前浏览器不支持 WebSocket")
      props.debug && alert("当前浏览器不支持 WebSocket")
    }
  }

  if (ws.value) {
    ws.value.onopen = (e) => {
      console.log("连接成功", e)
      emit("onOpen", e)
      // 连接成功 绑定用户ID
      sendMsg({
        type: "bind",
        from: from.value
      })
    }
    ws.value.onmessage = async (e) => {
      emit("onMessage", e)
      const data = JSON.parse(e.data)
      console.log("收到消息", data)
      const action = data?.action
      switch (action) {
        case "error":
          if (showCall.value) {
            closeThem()
            emit("onCallError", data)
            props.debug && alert(data?.message)
          }
          break
        case "offer":
          await callIn(data)
          break
        case "answer":
          await handleAnswer(data?.answer)
          break
        case "ice-candidate":
          await handleNewICECandidate(data?.candidate)
          break
        case "timeout":
          await handleHangup(action, "您未接听")
          break
        case "reject":
          await handleHangup(action, "对方已拒绝")
          break
        case "hangup":
          await handleHangup(action, "已挂断")
          break

      }
    }
    ws.value.onclose = (e) => {
      console.log("关闭连接", e)
      emit("onClose", e)
    }
  }
}

// 发送消息封装
const sendMsg = async (message) => {
  if (ws.value) {
    message = typeof message === "string" ? message : JSON.stringify(message)
    await ws.value.send(message)
  }
}

// 本地视频拖拽移动
const onMouseDown = (event) => {
  isLocalVideoDragging.value = true
  if (event?.touches?.length > 0)
    event = event.touches[0]
  // 记录鼠标按下时的偏移位置
  mouseDownStartPos.value.x = event.clientX - localVideoPos.value.x
  mouseDownStartPos.value.y = event.clientY - localVideoPos.value.y

  // 添加 mousemove 和 mouseup 事件监听器
  document.addEventListener('touchmove', onMouseMove)
  document.addEventListener('touchend', onMouseUp)
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)

}
// 鼠标移动时
const onMouseMove = (event) => {
  if (isLocalVideoDragging.value) {
    // 更新 div 的位置
    if (event?.touches?.length > 0)
      event = event.touches[0]
    localVideoPos.value.x = event.clientX - mouseDownStartPos.value.x
    localVideoPos.value.y = event.clientY - mouseDownStartPos.value.y
  }
}

// 鼠标松开时停止拖拽
const onMouseUp = () => {
  isLocalVideoDragging.value = false
  // 移除事件监听器
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
  document.removeEventListener('touchmove', onMouseMove)
  document.removeEventListener('touchend', onMouseUp)
}

// 监听拨打电话
watch(isCall, (val) => {
  if (val && ws.value) {
    callOut()
  }
})

// 监听初始化发起方
watch(() => from.value, (newVal, oldVal) => {
  if (newVal?.id !== oldVal?.id && !ws.value)
    startWebsocket()
})

onMounted(() => {
  console.log("AvCall is Mounted!")
})

onUnmounted(() => {
  if (ws.value)
    ws.value.close()
})
</script>

<template>
  <div :class="'av-call'+ (showCall ? ' av-call-active' : '')" v-if="showCall">
    <div class="overlay blur-lg"></div>
    <div :class="'common-call ' + 'common-call-' + callType">
      <div :class="'call ' + 'call-' + callStatus">
        <div class="user"
             v-if="(callType !== CALL_TYPE.VIDEO) || (callStatus !== CALL_STATUS.CALLING && callType === CALL_TYPE.VIDEO)">
          <img class="avatar" :src="to.avatar" :alt="to.nickname"/>
          <div class="nickname">{{ to.nickname }}</div>
          <div class="status">
            <span v-if="callStatus === CALL_STATUS.OUT">等待对方接听</span>
            <span v-else-if="callStatus === CALL_STATUS.IN">邀请你通话</span>
            <span v-else-if="callStatus === CALL_STATUS.CALLING">通话中</span>
          </div>
        </div>

        <div class="operation callin" v-if="callStatus === CALL_STATUS.IN">
          <button class="btn btn-large btn-round btn-danger"
                  @click="hangupCall('reject', '已拒绝接听')">
            <img src="../assets/close.png" alt="reject"/>
          </button>
          <button class="btn btn-large btn-round btn-primary"
                  @click="answerCall">
            <img src="../assets/phone.png" alt="answer"/>
          </button>
        </div>
        <div
            :class="'operation callout-calling ' + (callStatus === CALL_STATUS.CALLING && callType === CALL_TYPE.VIDEO ? 'blur-sm' : '')"
            v-else>
          <div class="top" v-if="callStatus === CALL_STATUS.CALLING">
            <span>{{ durationFormat(callDuration) }}</span>
            <span>已接通</span>
          </div>
          <div class="center" v-if="callStatus === CALL_STATUS.CALLING">
            <div :class="'microphone ' + (controlBtn.microphone ? 'open' : '')"
                 @click="controls('microphone')">
              <button class="btn btn-round">
                <img src="../assets/microphone-open.png" alt="microphone-open" v-show="controlBtn.microphone"/>
                <img src="../assets/microphone.png" alt="microphone" v-show="!controlBtn.microphone"/>
              </button>
              <span>麦克风</span>
              <span>已{{ controlBtn.microphone ? '打开' : '关闭' }}</span>
            </div>
            <div :class="'speaker ' + (controlBtn.speaker ? 'open' : '')" @click="controls('speaker')">
              <button class="btn btn-round">
                <img src="../assets/speaker-open.png" alt="speaker-open" v-show="controlBtn.speaker"/>
                <img src="../assets/speaker.png" alt="speaker" v-show="!controlBtn.speaker"/>
              </button>
              <span>扬声器</span>
              <span>已{{ controlBtn.speaker ? '打开' : '关闭' }}</span>
            </div>
            <div :class="'blur ' + (controlBtn.blur ? 'open' : '')" @click="controls('blur')"
                 v-if="callType === CALL_TYPE.VIDEO">
              <button class="btn btn-round">
                <img src="../assets/blur-open.png" alt="blur-open" v-show="controlBtn.blur"/>
                <img src="../assets/blur.png" alt="blur" v-show="!controlBtn.blur"/>
              </button>
              <span>背景模糊</span>
              <span>已{{ controlBtn.blur ? '打开' : '关闭' }}</span>
            </div>
            <div :class="'camera ' + (controlBtn.camera ? 'open' : '')" @click="controls('camera')"
                 v-if="callType === CALL_TYPE.VIDEO">
              <button class="btn btn-round">
                <img src="../assets/camera-open.png" alt="camera-open" v-show="controlBtn.camera"/>
                <img src="../assets/camera.png" alt="camera" v-show="!controlBtn.camera"/>
              </button>
              <span>摄像头</span>
              <span>已{{ controlBtn.camera ? '打开' : '关闭' }}</span>
            </div>
          </div>
          <div class="bottom">
            <button class="btn btn-large btn-round btn-danger"
                    @click="hangupCall('hangup', '已挂断')">
              <img src="../assets/close.png" alt="hangup"/>
            </button>
          </div>
        </div>
        <div class="local-box" v-if="controlBtn.camera && callType === CALL_TYPE.VIDEO"
             :style="{ left: `${localVideoPos.x}px`, top: `${localVideoPos.y}px` }" @mousedown="onMouseDown"
             @touchstart="onMouseDown">
          <video class="local" autoplay muted ref="localVideo"></video>
        </div>
      </div>
      <div class="video" v-if="callType === CALL_TYPE.VIDEO">
        <video class="remote" autoplay ref="remoteVideo" v-if="callStatus === CALL_STATUS.CALLING"></video>
        <div :class="'blur ' + (controlBtn.blur ? 'blur-md' : '')"></div>
      </div>
      <audio autoplay ref="remoteAudio" v-if="callType === CALL_TYPE.AUDIO"></audio>
    </div>
  </div>
</template>

<style lang="scss">
@import "../assets/style";
</style>