const admin = require('firebase-admin')

const collectionName = 'intervals'

const getLastRecord = async () => {
  const snapshot = await admin
    .firestore()
    .collection(collectionName)
    .orderBy('startedAt', 'desc')
    .limit(1)
    .get()
  const document = snapshot.docs[0]
  if (!document) {
    return null
  }
  return document
}

// Messages
const startMessage = () => {
  return {
    text: '計測を開始しました'
  }
}

const invalidStartMessage = () => {
  return {
    text: ':x: まだ完了していないトラックがあります'
  }
}

const stopMessage = () => {
  return {
    text: '計測を完了しました'
  }
}

const invaildStopMessage = () => {
  return {
    text: ':x: 計測中のトラックがありません'
  }
}

// Actions
const start = async () => {
  const lastRecord = await getLastRecord()
  // 最後の記録があるのに、終わってないときは警告を出す
  if (lastRecord && !lastRecord.data().endedAt) {
    return invalidStartMessage()
  }
  const timestamp = new Date().getTime().toString()
  await admin
    .firestore()
    .collection(collectionName)
    .doc(timestamp)
    .set({
      startedAt: admin.firestore.FieldValue.serverTimestamp()
    })
  const message = startMessage()
  return message
}

const stop = async () => {
  const lastRecord = await getLastRecord()
  // 最後の記録があるのに、終わっているときは警告を出す
  if (lastRecord && lastRecord.data().endedAt) {
    return invaildStopMessage()
  }
  await lastRecord.ref.update({
    endedAt: admin.firestore.FieldValue.serverTimestamp()
  })
  const message = stopMessage()
  return message
}

module.exports = {
  start,
  stop
}
