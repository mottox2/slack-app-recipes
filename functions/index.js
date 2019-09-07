const functions = require('firebase-functions')
const getChannelRanking = require('./src/channel-ranking')

exports.channelRanking = functions.https.onRequest(async (req, res) => {
  const rankingMessage = await getChannelRanking()
  res.send(rankingMessage)
})
