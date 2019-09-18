const admin = require('firebase-admin')
const { publish } = require('./pubsub')
const axios = require('axios')

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

// Commands
const TIMER_START = 'timer-start'
const TIMER_STOP = 'timer-stop'

const commands = async (req, res) => {
  const { text, response_url } = req.body
  const [subCommand, ...args] = text.split(' ')
  switch (subCommand) {
    case 'start':
      await publish({
        type: TIMER_START,
        payload: { response_url }
      })
      res.status(200).end()
      break
    case 'stop':
      await publish({
        type: TIMER_STOP,
        payload: { response_url }
      })
      res.status(200).end()
      break
    case '':
      res.status(200).json({ text: 'Subcommand is not found' })
      break
    default:
      res.status(200).json({ text: `${subCommand} is not a valid command.` })
      return
  }
}

// Messages
const startMessage = () => {
  return { text: ':clock1: 計測を開始しました' }
}

const invalidStartMessage = () => {
  return { text: ':x: まだ完了していないトラックがあります' }
}

const stopMessage = () => {
  return { text: ':clock1: 計測を完了しました' }
}

const invaildStopMessage = () => {
  return { text: ':x: 計測中のトラックがありません' }
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

const stop = async ({ response_url }) => {
  const lastRecord = await getLastRecord()
  // 最後の記録があるのに、終わっているときは警告を出す
  if (lastRecord && lastRecord.data().endedAt) {
    return invaildStopMessage()
  }
  // const res = await axios.post(response_url, message)
  // console.log(Object.keys(res))
  // console.log(res.data)
  await lastRecord.ref.update({
    endedAt: admin.firestore.FieldValue.serverTimestamp()
  })
  const message = stopMessage()
  return message
}

module.exports = {
  commands,
  start,
  stop,
  TIMER_START,
  TIMER_STOP
}

if (require.main === module) {
  admin.initializeApp()
  stop({
    response_url: 'https://hooks.slack.com/commands/T03B6P05P/756257995505/7X07ZYyJjyzcKJxrquIXjg0K'
  })
}
