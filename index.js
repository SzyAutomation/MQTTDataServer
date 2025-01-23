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
        const device_uuid = topic.split('/')[1]
        const sensor_type = topic.split('/')[3]

        var query = `
SELECT t1.device_id, t3.sensor_type_id FROM SzyWebApp.DeviceIndex AS t1 
LEFT JOIN SzyWebApp.DeviceData AS t2 
ON t1.device_id = t2.device_id
LEFT JOIN SzyWebApp.SensorTypeIndex AS t3
ON t2.sensor_type_id = t3.sensor_type_id AND t3.sensor_type = '${sensor_type}'
WHERE t1.device_uuid = '${device_uuid}'
`
        var response = await conn.query(query);
        if (response) {
            const device_id = response[0].device_id
            var sensor_type_id = response[0].sensor_type_id

            if (!sensor_type_id){
              var query = `SELECT sensor_type_id FROM SzyWebApp.SensorTypeIndex WHERE sensor_type = '${sensor_type}'`
              response = await conn.query(query);
              if(response){
                sensor_type_id = response[0].sensor_type_id
              } else {
                return
              }
            }

            var query = `UPDATE SzyWebApp.DeviceData SET value_float = ${payload}, last_update = NOW() WHERE device_id = ${device_id} and sensor_type_id = ${sensor_type_id}`
            var response = await conn.query(query);

            if (response.affectedRows==0){
              query = `INSERT INTO SzyWebApp.DeviceData
(device_id, sensor_type_id, value_float, last_update)
VALUES(${device_id}, ${sensor_type_id}, ${payload}, current_timestamp());`
              var response = await conn.query(query);
            }
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






