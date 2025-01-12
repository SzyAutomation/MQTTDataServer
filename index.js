const mqtt = require('mqtt');
const mariadb = require('mariadb');
const keys = require('./config/keys');

// Database connection
const pool = mariadb.createPool({
    host: keys.dBHost, 
    user: keys.dBUser, 
    password: keys.dBPassword,
    database: keys.dBName,
    connectionLimit: 5
});

// MQTT connection
const clientId = 'SzyWebServer';
const options = {
  clientId,
  clean: true,
  connectTimeout: 4000,
  username: keys.mqttUsername,
  password: keys.mqttPassword,
  reconnectPeriod: 1000,
}

const protocol = 'tcp';
const port = keys.mqttPort;
const host = keys.mqttHost;

let connectUrl = `${protocol}://${host}:${port}`

const client = mqtt.connect(connectUrl, options)

const topic = '#'
const payload = 'Test Payload'
const qos = 0


client.on('connect', () => {
  console.log(`${protocol}: Connected`)

  // subscribe topic
  client.subscribe(topic, { qos }, (error) => {
    if (error) {
      console.log('subscribe error:', error)
      return
    }
    console.log(`${protocol}: Subscribe to topic '${topic}'`)
    // publish message
    /*
    client.publish(topic, payload, { qos }, (error) => {
      if (error) {
        console.error(error)
      }
    })
    */
  })
})



async function logValue(topic, payload) {
    let conn;
    try {
        
        conn = await pool.getConnection();
        
        correctTopic = '[Nathans]' + topic;

        var query = `SELECT tag_id FROM IgnitionDB.TempHomeData WHERE tag_path = '${correctTopic}'`;
        var response = await conn.query(query);

        if (response) {
            var query = `UPDATE TempHomeData SET value = ${payload}, t_stamp = NOW() WHERE tag_id = '${response[0].tag_id}'`
            var response = await conn.query(query);
            //console.log(response)
        } else {
            var query = `INSERT INTO TempHomeData (tag_path, value, t_stamp) VALUES ('${correctTopic}', ${payload}, NOW())`
            var response = await conn.query(query);
            //console.log(response)
        }

        conn.end();

    } catch (err) {
        throw err;
    }
};



client.on('reconnect', (error) => {
    console.log(`Reconnecting(${protocol}):`, error)
});

client.on('error', (error) => {
    console.log(`Cannot connect(${protocol}):`, error)
});

client.on('message', async (topic, payload) => {
    console.log('Received Message:', topic, payload.toString());

    logValue(topic, payload.toString());



});






