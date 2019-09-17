const { PubSub } = require('@google-cloud/pubsub')

const publish = async data => {
  const pubsub = new PubSub()
  const messageData = data
  console.log(messageData)
  const messageBuffer = Buffer.from(JSON.stringify(messageData), 'utf8')
  const topic = pubsub.topic('slack-task')
  console.log(messageBuffer)
  await topic.publish(messageBuffer)
}

module.exports = {
  publish
}

if (require.main === module) {
  publish({
    type: 'timer-start',
    payload: {
      response_url:
        'https://hooks.slack.com/commands/T03B6P05P/751365676625/LysHcnAETET1hqkEkjBhy8cT'
    }
  })
}
