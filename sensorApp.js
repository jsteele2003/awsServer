var express = require('express'),
app = express(), assert = require('assert');
const { Pool } = require('pg');
var fs = require('fs');

// AWS RDS POSTGRESQL INSTANCE
var db_credentials = new Object();
db_credentials.user = 'jsteele';
db_credentials.host = process.env.AWSRDS_EP;
db_credentials.database = 'sensordb';
db_credentials.password = process.env.AWSRDS_PW;
db_credentials.port = 5432;

// Mongo
var collName = 'meetings';
var MongoClient = require('mongodb').MongoClient;
var url = process.env.cluster;
console.log(url);

var map1 = fs.readFileSync("./data/index1.txt");
var map3 = fs.readFileSync("./data/index3.txt");

app.get('/', function(req, res) {
    // Connect to the AWS RDS Postgres database
    const client = new Pool(db_credentials);

    // SQL query
    var q = `SELECT EXTRACT(DOW FROM time AT TIME ZONE 'America/New_York') as sensorday, 
             EXTRACT(HOUR FROM time AT TIME ZONE 'America/New_York') as sensorhour, 
             EXTRACT(WEEK FROM time AT TIME ZONE 'America/New_York') as sensorweek, 
             count(*) as num_obs, 
             max(light) as max_light, 
             avg(light) as avg_light,
             max(temp) as max_temp, 
             avg(temp) as avg_temp
             FROM sensordata 
             GROUP BY sensorweek, sensorday, sensorhour;`;
             
    client.connect();
    client.query(q, (qerr, qres) => {
        if(qerr){
        console.log(qerr);
        }else{
        res.send(qres.rows);
        console.log('responded to request');
        }
    });
    client.end();
});

app.get('/aa', function(req, res) {
    console.log('reached get');
    MongoClient.connect(url, function(err, database) {
        if (err) {
            return console.dir(err);}
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = database.db('joe');
        console.log(collName);
    
        var dateTimeNow = new Date();
        var today = dateTimeNow.getDay();
        var tomorrow;
        if (today == 6) {tomorrow = 0;}
        else {tomorrow = today + 1}
        var hour = dateTimeNow.getHours();

        var collection = db.collection(collName);
        console.log(collection);
    
        collection.aggregate([ // start of aggregation pipeline
            // match by day and time
            {  $group : { _id :{
                          address : "$address",
                          latLong : "$latLong",
                          meetingName : "$meetingName",
                          meetingDetails : "$meetingDetails",
                          wheelchairAccess : "$wheelchairAccess"
                        },
                        day : { $push : "$day" },
                        time : { $push : "$time" }, 
                        type : { $push : "$meetingType" }
                  }
                 },
                 { $group : { _id :{
                    address : "$_id.address",
                    latLong : '$_id.latLong',
                     wheelchairAccess : '$_id.wheelchairAccess'
                 },
                    groups : {
                        $push : { group: "$_id.meetingName", day : "$day", time : "$time", type : '$type'},
                    }
                 }
                 },
                  ]).toArray(function(err, docs) { // end of aggregation pipeline
            if (err) {console.log(err)}
            
            else {
                res.writeHead(200, {'content-type': 'text/html'});
                res.write(map1);
                res.write(JSON.stringify(docs));
                res.end(map3);
            }
            database.close();
        });
    });
    
});
app.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function() {
    console.log('Server listening...');
});