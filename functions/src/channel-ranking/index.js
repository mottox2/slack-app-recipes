const { WebClient } = require('@slack/web-api')
const functions = require('firebase-functions')

const sleep = msec => new Promise(resolve => setTimeout(resolve, msec))

const recipeListMessage = sortedChannels => {
  return {
    text: sortedChannels.map(c => `${c.name}: ${c.count}`).join('\n')
  }
}

const run = async () => {
  const token = functions.config().slack.token
  const client = new WebClient(token)

  const { channels } = await client.conversations
    .list({
      limit: 10, // max to 1000
      exclude_archived: true,
      types: 'public_channel'
    })
    .catch(e => {
      console.error(JSON.stringify(e, null, 2))
      throw e
    })

  const channelsWithCount = []
  for (let i = 0; i < channels.length; i++) {
    const channel = channels[i]
    const { id, name } = channel
    if (['general', 'random'].includes(name)) {
      console.log(`[skip] ${name}`)
      continue
    }
    /* eslint-disable-next-line */
    await sleep(2000)
    /* eslint-disable-next-line */
    const { messages } = await client.channels
      .history({
        channel: id,
        count: 10 // max to 1000
      })
      .catch(e => {
        throw e
      })

    const count = messages.filter(message => {
      return message.ts > new Date(new Date() - 1000 * 60 * 60 * 24 * 28) / 1000
    }).length
    channelsWithCount.push({
      id,
      name,
      count
    })
    console.log(`${id}: ${name} => ${count}`)
  }

  const sortedChannels = channelsWithCount.sort((channel1, channel2) => channel2.count - channel1.count)
  console.log(sortedChannels)
  return recipeListMessage(sortedChannels)
}

module.exports = {
  run
}

if (process.mainModule && process.mainModule.filename === __filename) {
  run()
}
