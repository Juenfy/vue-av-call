function zeroize(num) {
    return (String(num).length === 1 ? "0" : "") + num
}

const durationFormat = (duration) => {
    let h = Math.floor(duration / 3600)
    let m = Math.floor((duration - h * 3600) / 60)
    let s = duration - h * 3600 - m * 60
    return zeroize(h) + ":" + zeroize(m) + ":" + zeroize(s)
}

export {
    durationFormat
}