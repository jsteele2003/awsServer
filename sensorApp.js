var express = require('express'),
app = express();
const { Pool } = require('pg');

// AWS RDS POSTGRESQL INSTANCE
var db_credentials = new Object();
db_credentials.user = 'jsteele';
db_credentials.host = process.env.AWSRDS_EP;
db_credentials.database = 'sensordb';
db_credentials.password = process.env.AWSRDS_PW;
db_credentials.port = 5432;

app.get('/', function(req, res) {
    // Connect to the AWS RDS Postgres database
    const client = new Pool(db_credentials);

    // SQL query
    var q = `SELECT
             count(*) as num_obs, 
             AVG(acc_x) as avg_x,
             AVG(acc_y) as avg_y,
             AVG(acc_z) as avg_z,
             FROM sensordata;`;
             
    client.connect();
    client.query(q, (qerr, qres) => {
        res.send(qres.rows);
        console.log(qres);
        console.log(qerr);
        console.log('responded to request');
    });
    client.end();
});

app.listen(3000, function() {
    console.log('Server listening...');
});