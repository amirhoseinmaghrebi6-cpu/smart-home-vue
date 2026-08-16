// backend/src/services/mqttService.js
const mqtt = require('mqtt');
const { Device, DeviceAccess } = require('../models');

const pendingPairings = new Map();
const syncPendingDevices = new Set();

// âœ… MQTT Retry Configuration with Exponential Backoff
const MQTT_RETRY_CONFIG = {
  maxRetries: 5,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  factor: 2 // Exponential backoff factor
};

const MQTT_CONFIG = {
  host: process.env.MQTT_BROKER || process.env.MQTT_URL || 'mqtt://localhost:1883',
  options: {
    clientId: `smart-home-backend-${Math.random().toString(16).slice(2, 8)}`,
    clean: true,
    connectTimeout: 10000,
    reconnectPeriod: 5000,
    username: process.env.MQTT_USER || undefined,
    password: process.env.MQTT_PASSWORD || undefined,
    // âœ… Enhanced connection options
    rejectUnauthorized: false, // Set to true in production with proper certs
    protocolVersion: 4
  }
};

let client = null;
let isConnected = false;
let reconnectAttempts = 0;
let connectionHealthCheckInterval = null;

// âœ… Health check for MQTT connection
function startConnectionHealthCheck() {
  if (connectionHealthCheckInterval) clearInterval(connectionHealthCheckInterval);
  
  connectionHealthCheckInterval = setInterval(() => {
    if (client && !client.connected && isConnected) {
      console.warn('âš ï¸ MQTT connection health check failed - client disconnected');
      isConnected = false;
      reconnectAttempts = 0;
    }
  }, 30000); // Check every 30 seconds
}

async function connect() {
  return new Promise((resolve, reject) => {
    try {
      client = mqtt.connect(MQTT_CONFIG.host, MQTT_CONFIG.options);

      client.on('connect', () => {
        console.log('ðŸ”— Connected to Mosquitto MQTT Broker');
        isConnected = true;
        reconnectAttempts = 0; // Reset on successful connection
        
        client.subscribe('sh/+/status', (err) => {
          if (err) console.error('âŒ Failed to subscribe to sh/+/status:', err);
          else console.log('ðŸ“¡ Subscribed to sh/+/status');
        });
        
        client.subscribe('sh/+/pair', (err) => {
          if (err) console.error('âŒ Failed to subscribe to sh/+/pair:', err);
          else console.log('ðŸ“¡ Subscribed to sh/+/pair');
        });

        client.subscribe('sh/+/sync', (err) => {
          if (err) console.error('âŒ Failed to subscribe to sh/+/sync:', err);
          else console.log('ðŸ“¡ Subscribed to sh/+/sync');
        });
        
        // âœ… Start health check after successful connection
        startConnectionHealthCheck();
        
        resolve();
      });

      client.on('error', (err) => {
        console.error('âŒ MQTT connection error:', err);
        isConnected = false;
        // Don't reject here - let reconnection handle it
      });

      client.on('offline', () => {
        console.warn('âš ï¸ MQTT client offline');
        isConnected = false;
      });

      client.on('reconnect', () => {
        reconnectAttempts++;
        const delay = Math.min(
          MQTT_RETRY_CONFIG.initialDelay * Math.pow(MQTT_RETRY_CONFIG.factor, reconnectAttempts - 1),
          MQTT_RETRY_CONFIG.maxDelay
        );
        console.log(`ðŸ”„ Reconnecting to MQTT broker... (Attempt ${reconnectAttempts}/${MQTT_RETRY_CONFIG.maxRetries}, next retry in ${delay}ms)`);
        
        if (reconnectAttempts >= MQTT_RETRY_CONFIG.maxRetries) {
          console.error('âŒ Max MQTT reconnection attempts reached. Please check broker status.');
          // Reset counter after max retries
          reconnectAttempts = 0;
        }
      });

      client.on('close', () => {
        console.log('ðŸ”Œ MQTT connection closed');
        isConnected = false;
      });

      client.on('message', async (topic, message) => {
        try {
          const payload = JSON.parse(message.toString());
          await handleMessage(topic, payload);
        } catch (err) {
          console.error('âŒ Error processing MQTT message:', err);
        }
      });

    } catch (err) {
      console.error('âŒ Failed to initialize MQTT client:', err);
      reject(err);
    }
  });
}

function parseBool(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

async function handleMessage(topic, payload) {
  const match = topic.match(/^sh\/([^/]+)\/(.+)$/);
  if (!match) return;
  
  const espDeviceId = match[1];
  const messageType = match[2];

  console.log(`ðŸ“¨ Received ${messageType} from ESP ${espDeviceId}:`, payload);

  if (messageType === 'sync' && payload.action === 'request_state') {
    console.log(`ðŸ”„ Sync request received from ESP ${espDeviceId}`);
    
    syncPendingDevices.add(espDeviceId);

    const devices = await Device.findAll({ where: { pairedDeviceId: espDeviceId } });
    
    if (devices.length > 0) {
      const device = devices[0];
      const responsePayload = { action: 'state_sync', channels: {} };

      let channels = device.channels || [];
      if (!Array.isArray(channels) || channels.length === 0) {
        const count = device.type === 'switch3' ? 3 : device.type === 'switch2' ? 2 : 1;
        channels = Array.from({ length: count }, (_, i) => ({
          id: i, label: '', status: device.status || false
        }));
      }

      channels.forEach((ch, idx) => {
        responsePayload.channels[`ch${idx+1}`] = !!ch.status;
      });

      const responseTopic = `sh/${espDeviceId}/sync/response`;
      client.publish(responseTopic, JSON.stringify(responsePayload), { qos: 1 });
      
      console.log(`âœ… Sent state sync (Source of Truth) to ${espDeviceId}:`, responsePayload);
    }

    setTimeout(() => {
      syncPendingDevices.delete(espDeviceId);
      console.log(`âœ… Sync period ended for ${espDeviceId}`);
    }, 8000);
    return;
  }

  if (messageType === 'status') {
    await handleDeviceStatus(espDeviceId, payload);
  } else if (messageType === 'pair') {
    await handlePairingRequest(espDeviceId, payload);
  }
}

async function handleDeviceStatus(espDeviceId, data) {
  try {
    const devices = await Device.findAll({ where: { pairedDeviceId: espDeviceId } });
    if (!devices.length) return;

    const online = parseBool(data.online);

    // âœ… â† â† â† Ø­ÛŒØ§ØªÛŒ: Ù‡Ù…ÛŒØ´Ù‡ emit Ú©Ù† (Ø­ØªÛŒ Ø§Ú¯Ø± Ø¯Ø± sync period Ù‡Ø³ØªÛŒÙ…)
    try {
      const io = require('../app').get('socketio');
      if (io) {
        io.emit('device:status:update', {
          deviceId: devices[0].id,
          espDeviceId,
          channels: { 
            ch1: parseBool(data.ch1), 
            ch2: parseBool(data.ch2), 
            ch3: parseBool(data.ch3) 
          },
          online,
          timestamp: new Date().toISOString()
        });
        console.log(`ðŸ“¡ Real-time update sent to frontend for device ${devices[0].id}`);
      }
    } catch (e) {
      console.log(`âš ï¸ Socket emit failed: ${e.message}`);
    }

    // âœ… Ø­Ø§Ù„Ø§ Ú†Ú© Ú©Ù† Ø¢ÛŒØ§ Ø¯Ø± sync period Ù‡Ø³ØªÛŒÙ…
    if (syncPendingDevices.has(espDeviceId)) {
      console.log(`â­ï¸ Ignoring DB update from ${espDeviceId} during sync`);
      return;
    }

    for (const device of devices) {
      const chIndex = device.channelIndex;
      const chKey = `ch${chIndex + 1}`;
      const chStatusFromESP = parseBool(data[chKey]);

      let channels = device.channels || [];
      if (!Array.isArray(channels) || channels.length === 0) {
        const count = device.type === 'switch3' ? 3 : device.type === 'switch2' ? 2 : 1;
        channels = Array.from({ length: count }, (_, i) => ({
          id: i, label: '', status: device.status || false
        }));
      }

      const currentStatus = channels[chIndex]?.status ?? device.status;

      // âœ… ÙÙ‚Ø· Ø§Ú¯Ø± Ø¢Ù†Ù„Ø§ÛŒÙ† Ø§Ø³Øª Ùˆ ØªØºÛŒÛŒØ± ÙˆØ§Ù‚Ø¹ÛŒ Ø¯Ø§Ø±Ø¯ØŒ Ø¢Ù¾Ø¯ÛŒØª Ú©Ù†
      if (online && currentStatus !== chStatusFromESP) {
        const newChannels = [...channels];
        if (chIndex !== undefined) {
          if (!newChannels[chIndex]) {
            newChannels[chIndex] = { id: chIndex, label: '', status: chStatusFromESP };
          } else {
            newChannels[chIndex] = { ...newChannels[chIndex], status: chStatusFromESP };
          }
        }

        await Device.update(
          {
            status: chStatusFromESP,
            channels: newChannels,
            online: true,
            lastSeen: new Date()
          },
          { where: { id: device.id } }
        );

        console.log(`âœ… Real change from ESP: device ${device.id} ch${chIndex+1}=${chStatusFromESP}`);
      } else if (device.online !== online) {
        await Device.update(
          { online: online, lastSeen: new Date() },
          { where: { id: device.id } }
        );
        console.log(`ðŸ“¡ Only online updated for ${device.id}: ${online}`);
      }
    }

  } catch (err) {
    console.error(`âŒ Failed to sync status for ESP ${espDeviceId}:`, err);
  }
}

async function handlePairingRequest(espDeviceId, data) {
  try {
    console.log(`ðŸ” Pairing request from ESP ${espDeviceId}:`, data);
    
    pendingPairings.set(espDeviceId, {
      ...data,
      requestedAt: new Date(),
      status: 'pending'
    });
    
    const responseTopic = `sh/${espDeviceId}/pair/response`;
    const payload = JSON.stringify({
      success: true,
      message: 'Pairing request received. Waiting for user confirmation in app.',
      timestamp: new Date().toISOString()
    });
    client.publish(responseTopic, payload, { qos: 1 });
    
    console.log(`ðŸ“¤ Sent pairing response to ${responseTopic}`);
  } catch (err) {
    console.error(`âŒ Failed to process pairing for ESP ${espDeviceId}:`, err);
  }
}

function getPendingPairings() {
  const now = new Date();
  const result = [];
  
  for (const [espId, req] of pendingPairings.entries()) {
    if (now - req.requestedAt < 5 * 60 * 1000) {
      result.push({ espId, ...req });
    } else {
      pendingPairings.delete(espId);
    }
  }
  return result;
}

async function confirmPairing(espDeviceId, virtualDeviceData) {
  try {
    const { Device, DeviceAccess, Sequelize } = require('../models');
    const crypto = require('crypto');

    const pending = pendingPairings.get(espDeviceId);
    if (!pending) throw new Error('Pairing request not found');

    const { userId, name, type, icon, spaceId, channelIndex } = virtualDeviceData;
    if (!userId) throw new Error('userId Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª');
    if (!spaceId) throw new Error('spaceId Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª');

    const existingByEsp = await Device.findOne({
      where: { pairedDeviceId: espDeviceId }
    });

    if (existingByEsp) {
      console.log(`ðŸ”„ Sharing existing device ${existingByEsp.id} with user ${userId}`);
      
      await DeviceAccess.findOrCreate({
        where: { deviceId: existingByEsp.id, userId },
        defaults: { role: 'editor' }
      });
      
      const { Op } = Sequelize;
      const unpairedDevice = await Device.findOne({
        where: { 
          userId, 
          spaceId, 
          pairedDeviceId: null,
          type: type || 'switch1',
          createdAt: { [Op.gte]: new Date(Date.now() - 10 * 60 * 1000) }
        },
        order: [['createdAt', 'DESC']]
      });
      
      if (unpairedDevice && unpairedDevice.id !== existingByEsp.id) {
        console.log(`ðŸ—‘ï¸ Deleting unpaired duplicate device ${unpairedDevice.id}`);
        await DeviceAccess.destroy({ where: { deviceId: unpairedDevice.id } });
        await unpairedDevice.destroy();
      }
      
      pendingPairings.delete(espDeviceId);

      const responseTopic = `sh/${espDeviceId}/pair/response`;
      client.publish(
        responseTopic,
        JSON.stringify({
          success: true,
          virtualDeviceId: existingByEsp.id,
          shared: true,
          timestamp: new Date().toISOString()
        }),
        { qos: 1 }
      );

      console.log(`âœ… Pairing confirmed (shared): ${espDeviceId} -> ${existingByEsp.id}`);
      return { success: true, device: existingByEsp, shared: true };
    }
    
    console.log(`ðŸ” Searching unpaired device for userId: ${userId}, spaceId: ${spaceId}`);
    const existingUnpaired = await Device.findOne({
      where: { userId, spaceId, pairedDeviceId: null },
      order: [['createdAt', 'DESC']]
    });
    
    let device;
    
    if (existingUnpaired) {
      console.log(`ðŸ”„ Linking existing unpaired device ${existingUnpaired.id} to ESP ${espDeviceId}`);
      
      await existingUnpaired.update({
        pairedDeviceId: espDeviceId,
        pairedAt: new Date(),
        channelIndex: channelIndex ?? existingUnpaired.channelIndex,
        lastSeen: new Date()
      });
      
      const verified = await Device.findByPk(existingUnpaired.id, { attributes: ['id', 'pairedDeviceId'] });
      console.log(`âœ… Verified pairedDeviceId after update: ${verified?.pairedDeviceId}`);
      
      if (verified?.pairedDeviceId !== espDeviceId) {
        console.error(`âŒ CRITICAL: pairedDeviceId update FAILED!`);
        throw new Error('Failed to update pairedDeviceId in database');
      }
      
      device = existingUnpaired;
    } else {
      const serverGeneratedId = crypto.randomUUID();
      device = await Device.create({
        id: serverGeneratedId,
        userId,
        name: name || `Device-${espDeviceId.slice(0, 4)}`,
        type: type || 'switch1',
        icon: icon || 'ðŸ”˜',
        spaceId,
        pairedDeviceId: espDeviceId,
        channelIndex: channelIndex ?? 0,
        status: false,
        lastSeen: new Date(),
        timezone: 'Asia/Tehran'
      });
      console.log(`ðŸ†• Created new device ${device.id} with pairedDeviceId=${espDeviceId}`);
    }

    await DeviceAccess.findOrCreate({
      where: { deviceId: device.id, userId },
      defaults: { role: 'owner' }
    });
    
    pendingPairings.delete(espDeviceId);

    const responseTopic = `sh/${espDeviceId}/pair/response`;
    client.publish(
      responseTopic,
      JSON.stringify({
        success: true,
        virtualDeviceId: device.id,
        shared: false,
        timestamp: new Date().toISOString()
      }),
      { qos: 1 }
    );

    console.log(`âœ… Pairing confirmed: ${espDeviceId} -> ${device.id}`);
    return { success: true, device, shared: false };

  } catch (err) {
    console.error('âŒ Failed to confirm pairing:', err);
    throw err;
  }
}

// ==================== ðŸ”‘ Ø§Ø±Ø³Ø§Ù„ ÙØ±Ù…Ø§Ù† â€” Ø¨Ø§ Device.update() Ù…Ø³ØªÙ‚ÛŒÙ… ====================
async function sendCommand(virtualDeviceId, channelIndex, state) {
  try {
    console.log(`ðŸ” sendCommand called: virtualDeviceId=${virtualDeviceId}, channel=${channelIndex}, state=${state}`);
    
    const device = await Device.findByPk(virtualDeviceId);
    if (!device) {
      console.error(`âŒ Device ${virtualDeviceId} NOT FOUND`);
      return false;
    }

    const chIdx = channelIndex !== undefined ? channelIndex : (device.channelIndex ?? 0);
    
    let channels = device.channels || [];
    if (!Array.isArray(channels) || channels.length === 0) {
      const count = device.type === 'switch3' ? 3 : device.type === 'switch2' ? 2 : 1;
      channels = Array.from({ length: count }, (_, i) => ({
        id: i, label: '', status: device.status || false
      }));
    }
    
    const newChannels = [...channels];
    if (!newChannels[chIdx]) {
      newChannels[chIdx] = { id: chIdx, label: '', status: state };
    } else {
      newChannels[chIdx] = { ...newChannels[chIdx], status: state };
    }

    // âœ… â† â† â† Ø­ÛŒØ§ØªÛŒ: Device.update() Ù…Ø³ØªÙ‚ÛŒÙ… â€” ØªØ¶Ù…ÛŒÙ† Ù…ÛŒâ€ŒÚ©Ù†Ø¯ SQL UPDATE Ø§Ø¬Ø±Ø§ Ù…ÛŒâ€ŒØ´ÙˆØ¯!
    await Device.update(
      {
        status: state,
        channels: newChannels,
        lastSeen: new Date()
      },
      { where: { id: virtualDeviceId } }
    );

    // âœ… ØªØ£ÛŒÛŒØ¯: Ø¯ÙˆØ¨Ø§Ø±Ù‡ Ø§Ø² Ø¯ÛŒØªØ§Ø¨ÛŒØ³ Ø¨Ø®ÙˆØ§Ù† ØªØ§ Ù…Ø·Ù…Ø¦Ù† Ø´ÙˆÛŒ
    const verified = await Device.findByPk(virtualDeviceId, { attributes: ['channels', 'status'] });
    console.log(`âœ… DB Update VERIFIED: channels[0]=${verified?.channels?.[0]?.status}, status=${verified?.status}`);

    if (!device.pairedDeviceId) {
      console.error(`âŒ Device ${virtualDeviceId} has no pairedDeviceId`);
      return false;
    }

    const espDeviceId = device.pairedDeviceId;
    const topic = `sh/${espDeviceId}/cmd`;
    const payload = JSON.stringify({
      id: device.id,
      channel: chIdx,
      state,
      timestamp: new Date().toISOString()
    });

    return new Promise((resolve, reject) => {
      client.publish(topic, payload, { qos: 1 }, (err) => {
        if (err) reject(err);
        else {
          console.log(`âœ… MQTT command published`);
          resolve(true);
        }
      });
    });

  } catch (err) {
    console.error(`âŒ Failed to send command:`, err);
    throw err;
  }
}

async function toggleDevice(virtualDeviceId, options = {}) {
  const { action, channelIndex } = options;
  const state = action === 'on' ? true : action === 'off' ? false : null;
  if (state === null) return false;
  return await sendCommand(virtualDeviceId, channelIndex, state);
}

async function executeScenario(virtualDeviceId, scenario) {
  const { action, channelIndex } = scenario;
  const state = action === 'on';
  await toggleDevice(virtualDeviceId, { action, channelIndex });
  console.log(`ðŸŽ¬ Executed scenario on device ${virtualDeviceId}:`, { action, channelIndex });
}

function disconnect() {
  // âœ… Stop health check interval
  if (connectionHealthCheckInterval) {
    clearInterval(connectionHealthCheckInterval);
    connectionHealthCheckInterval = null;
  }
  
  if (client) {
    client.end(true, () => {
      console.log('ðŸ”Œ MQTT client disconnected');
      isConnected = false;
      reconnectAttempts = 0;
      client = null;
    });
  }
}

async function checkAndExecuteScenarios() {
  let client;
  try {
    const { Scenario, Device, User, Sequelize } = require('../models');
    const { Op } = Sequelize;

    // Ù‚ÙÙ„ Ú©Ø±Ø¯Ù† Ø§Ø¬Ø±Ø§ Ø¨Ø±Ø§ÛŒ Ø¬Ù„ÙˆÚ¯ÛŒØ±ÛŒ Ø§Ø² Race Condition
    if (checkAndExecuteScenarios._isRunning) {
      console.warn('âš ï¸ Scenario scheduler already running, skipping this round');
      return;
    }
    checkAndExecuteScenarios._isRunning = true;

    const scenarios = await Scenario.findAll({
      where: { enabled: true },
      include: [{
        model: Device,
        as: 'device',
        required: true,
        include: [{ model: User, as: 'user', required: true }]
      }]
    });

    const now = new Date();
    const executedThisRound = new Set();
    const executionPromises = [];

    for (const scenario of scenarios) {
      try {
        const device = scenario.device;
        const user = device?.user;
        if (!device || !user) continue;

        if (executedThisRound.has(scenario.id)) continue;

        const deviceTz = device.timezone || 'Asia/Tehran';
        let shouldExecute = false;

        if (scenario.type === 'once') {
          if (scenario.datetime && !scenario.executed) {
            const scenarioTime = new Date(scenario.datetime);
            if (now >= scenarioTime) {
              shouldExecute = true;
              // Ø¢Ù¾Ø¯ÛŒØª ÙˆØ¶Ø¹ÛŒØª Ø§Ø¬Ø±Ø§ Ø¨Ù‡ ØµÙˆØ±Øª Ø§ØªÙ…ÛŒÚ©
              await Scenario.update(
                { executed: true },
                { 
                  where: { id: scenario.id, executed: false },
                  limit: 1
                }
              );
              
              // ØªØ£ÛŒÛŒØ¯ Ø¢Ù¾Ø¯ÛŒØª
              const updated = await Scenario.findByPk(scenario.id);
              if (updated?.executed) {
                executedThisRound.add(scenario.id);
              } else {
                console.warn(`âš ï¸ Scenario ${scenario.id} was already executed by another process`);
                continue;
              }
            }
          }
        }
        else if (scenario.type === 'recurring') {
          const nowInDeviceTz = new Date().toLocaleString('en-US', { timeZone: deviceTz });
          const timeParts = nowInDeviceTz.split(' ');
          const [nowHour, nowMinute] = timeParts[1]?.split(':').map(Number) || [0, 0];
          const nowDay = new Date().getDay();

          if (scenario.time) {
            const [scHour, scMinute] = scenario.time.split(':').map(Number);
            const isTimeMatch = (nowHour === scHour && nowMinute === scMinute);
            const isDayMatch = !scenario.days?.length || scenario.days.includes(nowDay);

            if (isTimeMatch && isDayMatch) {
              shouldExecute = true;
            }
          }
        }

        if (shouldExecute) {
          // Ø¬Ù…Ø¹â€ŒØ¢ÙˆØ±ÛŒ PromiseÙ‡Ø§ Ø¨Ø±Ø§ÛŒ Ø§Ø¬Ø±Ø§ÛŒ Ù…ÙˆØ§Ø²ÛŒ Ø§ÛŒÙ…Ù†
          executionPromises.push(
            sendCommand(device.id, scenario.channelIndex, scenario.action === 'on')
              .then(() => console.log(`âœ… Scenario ${scenario.id} executed successfully`))
              .catch(err => console.error(`âŒ Scenario ${scenario.id} failed:`, err))
          );
        }
      } catch (err) {
        console.error(`âŒ Error processing scenario ${scenario?.id}:`, err);
      }
    }

    // Ø§Ù†ØªØ¸Ø§Ø± Ø¨Ø±Ø§ÛŒ ØªÚ©Ù…ÛŒÙ„ ØªÙ…Ø§Ù… Ø¹Ù…Ù„ÛŒØ§Øª Ø§Ø¬Ø±Ø§ÛŒÛŒ
    if (executionPromises.length > 0) {
      await Promise.allSettled(executionPromises);
      console.log(`ðŸ“Š Executed ${executionPromises.length} scenario(s) this round`);
    }

  } catch (err) {
    console.error('âŒ Error in checkAndExecuteScenarios:', err);
  } finally {
    checkAndExecuteScenarios._isRunning = false;
  }
}

let scenarioInterval = null;

function startScenarioScheduler() {
  if (scenarioInterval) clearInterval(scenarioInterval);
  scenarioInterval = setInterval(checkAndExecuteScenarios, 30 * 1000);
  console.log('âœ… Scenario scheduler started (checks every 30s)');
}

function stopScenarioScheduler() {
  if (scenarioInterval) {
    clearInterval(scenarioInterval);
    scenarioInterval = null;
  }
}

async function cleanupExpiredScenarios() {
  try {
    const { Scenario } = require('../models');
    const now = new Date();
    
    const deleted = await Scenario.destroy({
      where: {
        type: 'once',
        executed: true,
        datetime: { [require('sequelize').Op.lt]: now }
      }
    });
    
    if (deleted > 0) {
      console.log(`ðŸ—‘ï¸ Cleaned up ${deleted} expired scenario(s)`);
    }
  } catch (err) {
    console.error('âŒ Error cleaning up scenarios:', err);
  }
}

let cleanupInterval = null;

function startScenarioCleanup() {
  if (cleanupInterval) clearInterval(cleanupInterval);
  cleanupInterval = setInterval(cleanupExpiredScenarios, 60 * 60 * 1000);
  console.log('âœ… Scenario cleanup scheduler started (runs every hour)');
}

function stopScenarioCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

// âœ… Graceful Shutdown Handler for MQTT Service
async function gracefulShutdown() {
  console.log('ðŸ›‘ MQTT Service: Starting graceful shutdown...');
  
  // Stop all schedulers first
  stopScenarioScheduler();
  stopScenarioCleanup();
  
  // Clear health check interval
  if (connectionHealthCheckInterval) {
    clearInterval(connectionHealthCheckInterval);
    connectionHealthCheckInterval = null;
  }
  
  // Disconnect MQTT client if connected
  if (client) {
    return new Promise((resolve) => {
      console.log('ðŸ”Œ Disconnecting MQTT client...');
      client.end(true, {}, () => {
        console.log('âœ… MQTT client disconnected successfully');
        client = null;
        isConnected = false;
        resolve();
      });
    });
  }
  
  console.log('âœ… MQTT Service shutdown complete');
}

module.exports = {
  connect,
  disconnect,
  sendCommand,
  toggleDevice,
  executeScenario,
  getClient: () => client,
  isConnected: () => isConnected,
  handleDeviceStatus,
  handlePairingRequest,
  getPendingPairings,
  confirmPairing,
  startScenarioScheduler,
  stopScenarioScheduler,
  startScenarioCleanup,
  stopScenarioCleanup,
  gracefulShutdown,
  // âœ… Export health check functions for testing and monitoring
  getReconnectAttempts: () => reconnectAttempts,
  isConnectionHealthy: () => client?.connected || false
};
