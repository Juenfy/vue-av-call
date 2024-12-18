import AvCall from "./components/avCall.vue"
import {ref} from "vue"

const CALL_STATUS = {
    IN: "callin",
    OUT: "callout",
    CLOSE: "close",
    CALLING: "calling"
}

const CALL_TYPE = {
    VIDEO: "video_call",
    AUDIO: "audio_call"
}

const isCall = ref(false)
const callType = ref(null)
const from = ref({
    id: null,
    nickname: null,
    avatar: null
})
const to = ref({
    id: null,
    nickname: null,
    avatar: null
})

const startCall = (type) => {
    if (!to.value?.id) {
        return alert("请先初始化接收方")
    }
    if (!from.value?.id) {
        return alert("请先初始化发起方")
    }
    isCall.value = true
    callType.value = type
}

const stopCall = () => {
    isCall.value = false
}

const setCallFrom = (callFrom) => {
    console.log("设置from", callFrom)
    from.value = callFrom
}

const setCallTo = (callTo) => {
    console.log("设置to", callTo)
    to.value = callTo
}

export {
    AvCall,
    CALL_STATUS,
    CALL_TYPE,
    isCall,
    callType,
    from,
    to,
    startCall,
    stopCall,
    setCallFrom,
    setCallTo
}