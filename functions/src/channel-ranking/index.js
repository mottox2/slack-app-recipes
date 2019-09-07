const { WebClient } = require('@slack/web-api')
const functions = require('firebase-functions')

const sleep = msec => new Promise(resolve => setTimeout(resolve, msec))

const recipeListMessage = sortedChannels => {
  return {
    text: sortedChannels.map(c => `${c.name}: ${c.count}`).join('\n')
  }
}

const main = async () => {
  const token = process.env.SLACK_TOKEN || functions.config().slack.token
  const client = new WebClient(token)

  const conversations = await client.conversations
    .list({
      limit: 10, // max to 1000
      exclude_archived: true,
      exclude_members: true,
      types: 'public_channel'
    })
    .catch(e => {
      console.error(JSON.stringify(e, null, 2))
      throw e
    })
  const channels = conversations.channels

  const channleCounts = []
  for (let i = 0; i < channels.length; i++) {
    const channel = channels[i]
    if (['general', 'random'].includes(channel.name)) {
      console.log(`[skip] ${channel.name}`)
      continue
    }
    const { id, name } = channel
    /* eslint-disable-next-line */
    await sleep(1000)
    /* eslint-disable-next-line */
    const res = await client.channels
      .history({
        channel: id,
        count: 10
      })
      .catch(e => {
        throw e
      })

    const count = res.messages.filter(message => {
      return message.ts > new Date(new Date() - 1000 * 60 * 60 * 24 * 28) / 1000
    }).length
    channleCounts.push({
      id,
      name,
      count
    })
    console.log(`${id}: ${name} => ${count}`)
  }

  const sortedChannels = channleCounts.sort((channel1, channel2) => channel2.count - channel1.count)
  console.log(sortedChannels)
  return recipeListMessage(sortedChannels)
}

module.exports = main

if (process.mainModule && process.mainModule.filename === __filename) {
  console.log(functions.config())
  console.log(main())
}
