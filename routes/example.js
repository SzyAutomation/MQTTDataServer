




module.exports = (app, pool) => {
    
    
    async function getSensorValues(props) {
        let conn;
        try {
            var deviceId = 'tag_id'
            if (props){
                deviceId = props.device_id;
            }
            
            
            conn = await pool.getConnection();
            
            const rows = await conn.query(`SELECT * FROM TempHomeData WHERE tag_id = ${deviceId}`);
            
            //console.log(rows); //[ {val: 1}, meta: ... ]
            return(rows)
        } catch (err) {
            throw err;
        } finally {
            if (conn) conn.end();
        }
    }
    
    
    
    app.get('/api/getsensordata', async (req, res) => {

        var deviceQuery = null;
        
        if (Object.keys(req.query).length){
            deviceQuery = req.query;
        }
    
        const results = await getSensorValues(deviceQuery);
        res.json(results);
    });
};