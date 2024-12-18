const WebSocket = require("ws")
const https = require("https")
const fs = require("fs")
const args = process.argv.slice(2)
let port = 8080
let httpsOptions = {}
let httpsServer = null
let params = {}

// 解构入参
args.forEach((arg) => {
    if (arg.trim().indexOf("=") !== -1) {
        const [key, value] = arg.trim().split("=")
        params[key] = value
    }
})

// 端口
if (params?.port) port = parseInt(params.port)
if (port === "NaN") port = 8080

// 读取 SSL 证书和私钥
if (params?.cert && params?.key) {
    httpsOptions.cert = fs.readFileSync(params.cert)
    httpsOptions.key = fs.readFileSync(params.key)
    if (params?.ca) httpsOptions.ca = fs.readFileSync(params.ca)
    httpsServer = https.createServer(httpsOptions)
}

let webSocketOptions = {server: httpsServer}

if (!params?.cert || !params?.key) {
    webSocketOptions.port = port
}


// 创建 WebSocket 服务器，并传递 HTTPS 服务器实例
const wss = new WebSocket.Server(webSocketOptions)

// 存储客户端
const clients = new Map()
const clientIds = new Map()
const userIds = new Map()

// 处理 WebSocket 连接
wss.on("connection", (ws) => {
    // 为每个客户端分配唯一的 ID (例如使用时间戳)
    const clientId = Date.now() + Math.random().toString(36).substr(2, 9)
    clients.set(clientId, ws)
    console.log(`Client connected with ID: ${clientId}`)

    // 监听客户端发送的消息
    ws.on("message", (message) => {
        const data = JSON.parse(message)
        const type = data?.type
        console.log(`Message from user:${data.from?.id} client:${clientId}: ${message}`)
        switch (type) {
            case "bind":
                if (data?.from?.id) {
                    //用户ID、客户端ID双向绑定
                    clientIds.set(data.from.id, clientId)
                    userIds.set(clientId, data.from.id)
                    sendMessageToUid(data.from.id, {
                        type: "bind", action: "bind", user_id: data.from.id, client_id: clientId, message: "绑定成功"
                    })
                }
                break
            case "audio_call":
            case "video_call":
                if (data?.to?.id) {
                    if (!sendMessageToUid(data?.to?.id, data)) {
                        sendMessageToUid(data?.from?.id, {
                            type: type,
                            from: data?.to,
                            to: data?.to,
                            action: "error",
                            error: "offline",
                            message: "对方离线中，请稍后再拨打！"
                        })
                    }
                }
                break
        }
    })

    // 处理客户端断开连接
    ws.on("close", () => {
        //断开连接释放资源
        clients.delete(clientId)
        const userId = userIds.get(clientId)
        clientIds.delete(userId)
        userIds.delete(clientId)
        console.log(`Client with ID ${clientId} User with ID ${userId} disconnected`)
    })
})

// 通过用户ID获取客户端
const getClientByUserId = (id) => {
    const clientId = clientIds.get(id)
    return clientId ? [clients.get(clientId), clientId] : [null, clientId]
}

// 发送消息给指定用户
const sendMessageToUid = (id, message) => {
    const [targetClient, targetClientId] = getClientByUserId(id)
    if (targetClient && targetClient.readyState === WebSocket.OPEN) {
        const sendMsg = typeof message === "string" ? message : JSON.stringify(message)
        targetClient.send(sendMsg)
        console.log(`Send message to user:${id} client${targetClientId}: ${sendMsg}`)
        return true
    } else {
        console.log(`User with ID ${id} not connected`)
        return false
    }
}

if (httpsServer) {
    // 启动 HTTPS 服务器
    httpsServer.listen(port, () => {
        console.log(`WebSocket server started on wss://localhost:${port}`)
    })
} else {
    console.log(`WebSocket server started on ws://localhost:${port}`)
}