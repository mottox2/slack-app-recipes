const functions = require('firebase-functions')
const getChannelRanking = require('./src/channel-ranking')
const axios = require('axios')

const { start, stop } = require('./src/timer')
const { publish } = require('./src/pubsub')

const admin = require('firebase-admin')
admin.initializeApp()

exports.channelRanking = functions.https.onRequest(async (req, res) => {
  const rankingMessage = await getChannelRanking()
  res.send(rankingMessage)
})

const TIMER_START = 'timer-start'
const TIMER_END = 'timer-end'

exports.commands = functions.https.onRequest(async (req, res) => {
  const body = req.body
  const { text, response_url } = body
  const [subCommand, ...args] = text.split(' ')
  switch (subCommand) {
    case 'start':
      await publish({
        type: TIMER_START,
        payload: { response_url }
      })
      break
    case 'stop':
      await publish({
        type: TIMER_END,
        payload: { response_url }
      })
      break
    default:
      res.status(200).json({
        text: `${subCommand} is not a valid command.`
      })
      return
  }
  res.status(200).end()
})

const respond = async (response_url, message) => {
  console.log(response_url, message)
  if (!response_url) {
    return
  }
  await axios.post(response_url, message)
}

exports.runTask = functions.pubsub.topic('slack-task').onPublish(async message => {
  let data = null
  try {
    data = message.json
  } catch (e) {
    console.error('PubSub message was not JSON', e)
  }
  const { type, payload } = data
  console.log(type)
  let result = {}
  switch (type) {
    case TIMER_START:
      result = await start(payload)
      await respond(payload.response_url, result)
      break
    case TIMER_END:
      result = await stop(payload)
      await respond(payload.response_url, result)
      break
  }
})

exports.publish = functions.https.onRequest(async (req, res) => {
  const body = req.body
  await publish({
    response_url: body.response_url
  })
  res.status(200).end()
})
