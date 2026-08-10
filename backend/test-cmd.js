// backend/test-cmd.js
const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
  console.log('✅ Connected to broker');
  
  const topic = 'sh/14BA84/cmd';
  const payload = JSON.stringify({ channel: 0, state: true });
  
  client.publish(topic, payload, { qos: 1 }, (err) => {
    if (err) console.error('❌ Publish failed:', err);
    else console.log(`📤 Command sent to ${topic}:`, payload);
    
    setTimeout(() => client.end(), 1000);
  });
});