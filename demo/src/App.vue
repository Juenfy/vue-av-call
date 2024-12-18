<script setup>
import {AvCall} from "vue-av-call"
import * as call from "vue-av-call"
import "vue-av-call/dist/vue-av-call.css"
import {onMounted, ref} from "vue"

const userList = ref([])
const from = ref({
  id: null,
  nickname: null,
  avatar: null,
})

// 选择拨打的用户
const onSelect = (e) => {
  console.log(userList.value[e.target.value - 1])
  // 初始化接收方
  call.setCallTo(userList.value[e.target.value - 1])
}


// WebSocket事件
const onOpen = (e) => {
  console.log("onOpen", e)
}
const onMessage = (e) => {
  console.log("onMessage", e)
}
const onClose = (e) => {
  console.log("onClose", e)
}


// 拨打过程中的回调事件
const onCallIn = (e) => {
  //来电回调
  console.log("onCallIn", e)
}
const onCallOut = (e) => {
  //拨打回调
  console.log("onCallOut", e)
}
const onAnswerCall = (e) => {
  //接听电话回调
  console.log("onAnswerCall", e)
}
const onHangupCall = (e) => {
  //挂断回调
  console.log("onHangupCall", e)
}
const onIcecandidate = (e) => {
  //监听ice候选回调
  console.log("onIcecandidate", e)
}
const onCallError = (e) => {
  //异常回调
  console.log("onCallError", e)
}
const onControl = (e) => {
  //扬声器、麦克风等开关回调
  console.log("onControl", e)
}

onMounted(() => {
// 生成模拟用户
  for (let i = 1; i <= 20; i++) {
    userList.value.push({
      id: i,
      nickname: `测试用户${i}`,
      avatar: `https://api.multiavatar.com/${i}.png`
    })
  }
  // 随机登录一个
  const random = Math.floor(Math.random() * 20)
  from.value = userList.value[random]
  // 初始化发起方
  call.setCallFrom(from.value)
})
</script>

<template>
  <img :src="from.avatar" alt="from.nickname" style="width: 4rem;height: 4rem">
  <h4>{{ from.nickname }}</h4>
  <br/>
  <label>选择拨打用户</label>
  <select @change="onSelect">
    <option :value="user.id" v-for="user in userList" :key="user.id" :selected="user.id === 1">{{
        user.nickname
      }}
    </option>
  </select>
  <br/>
  <br/>
  <button type="button" @click="call.startCall(call.CALL_TYPE.AUDIO)">拨打语音通话</button>
  <br/><br/>
  <button type="button" @click="call.startCall(call.CALL_TYPE.VIDEO)">拨打视频通话</button>
  <av-call @onOpen="onOpen" @onMessage="onMessage" @onClose="onClose" @onCallIn="onCallIn" @onCallOut="onCallOut"
           @onAnswerCall="onAnswerCall" @onHangupCall="onHangupCall" @onIcecandidate="onIcecandidate"
           @onCallError="onCallError"
           @onControl="onControl"></av-call>
</template>

<style scoped>
</style>
