import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'connect4-app',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'analytics-group' });

let isConnected = false;

export async function setupKafka() {
  try {
    await producer.connect();
    await consumer.connect();
    
    await consumer.subscribe({ topic: 'game-events', fromBeginning: true });
    
    isConnected = true;
    console.log('Kafka connected');

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        if (message.value) {
            const event = JSON.parse(message.value.toString());
            console.log(`[Analytics] Received event:`, event);
        }
        // Here we would save to DB logic for analytics
      },
    });
  } catch (err: any) {
    console.warn('Failed to connect to Kafka, running in degraded mode (no analytics):', err.message);
  }
}

export async function sendGameEndEvent(gameData: any) {
  if (!isConnected) return;
  try {
    await producer.send({
      topic: 'game-events',
      messages: [
        { value: JSON.stringify({ type: 'GAME_END', ...gameData, timestamp: new Date() }) },
      ],
    });
  } catch (err) {
    console.error('Error sending Kafka event:', err);
  }
}
