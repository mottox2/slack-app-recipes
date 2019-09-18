const functions = require('firebase-functions')
const axios = require('axios')

const { publish } = require('./src/pubsub')

const channelRanking = require('./src/channel-ranking')
const commandTracker = require('./src/command-tracker')

const admin = require('firebase-admin')
admin.initializeApp()

exports.channelRanking = functions.pubsub.schedule('every 24 hours').onRun(async context => {
  await channelRanking.run()
})

exports.commands = functions.https.onRequest(async (req, res) => {
  const body = req.body
  const command = body.command

  switch (command) {
    case '/tracker':
      commandTracker.commands(req, res)
      break
    default:
      res.status(200).json({
        text: `${command} is not a valid command.`
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

exports.run = functions.pubsub.topic('slack-task').onPublish(async message => {
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
    case commandTracker.TIMER_START:
      result = await commandTracker.start(payload)
      await respond(payload.response_url, result)
      break
    case commandTracker.TIMER_STOP:
      result = await commandTracker.stop(payload)
      await respond(payload.response_url, result)
      break
  }
})
