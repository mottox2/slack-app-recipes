const functions = require('firebase-functions')
const getChannelRanking = require('./src/channel-ranking')
const { commands } = require('./src/lunch-slot')
const axios = require('axios')

const { PubSub } = require('@google-cloud/pubsub')

const admin = require('firebase-admin')
admin.initializeApp()

exports.channelRanking = functions.https.onRequest(async (req, res) => {
  const rankingMessage = await getChannelRanking()
  res.send(rankingMessage)
})

exports.commands = functions.https.onRequest(async (req, res) => {
  const body = req.body
  const { text, response_url } = body
  const [subCommand, ...args] = text.split(' ')
  switch (subCommand) {
    case 'add':
      publish({
        type: REGISTER,
        payload: {
          response_url,
          name: args.join('')
        }
      })
      break
    default:
      res.status(200).end({
        text: `${subCommand} is not a valid command.`
      })
      return
  }
  res.status(200).end()
})

const REGISTER = 'slot-add'

const publish = async data => {
  const pubsub = new PubSub()
  const messageData = data
  console.log(messageData)
  const messageBuffer = Buffer.from(JSON.stringify(messageData), 'utf8')
  const topic = pubsub.topic('slack-task')
  console.log(messageBuffer)
  await topic.publish(messageBuffer)
}

exports.runTask = functions.pubsub.topic('slack-task').onPublish(async message => {
  let data = null
  try {
    data = message.json
  } catch (e) {
    console.error('PubSub message was not JSON', e)
  }

  switch (data.type) {
    case REGISTER:
      await admin
        .firestore()
        .collection('restaurants')
        .add({ name: data.payload.name })
      break
  }

  if (data.response_url) {
    axios.post(data.response_url, {
      text: 'success'
    })
  }
})

exports.publish = functions.https.onRequest(async (req, res) => {
  const body = req.body
  await publish({
    response_url: body.response_url
  })
  res.status(200).end()
})
