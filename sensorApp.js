var express = require('express'),
app = express();
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
// var MongoClient = require('mongodb').MongoClient;
var url = process.env.cluster;

var map1 = fs.readFileSync("./data/index1.html");
var map3 = fs.readFileSync("./data/index3.html");

app.get('/', function(req, res) {
    // Connect to the AWS RDS Postgres database
    const client = new Pool(db_credentials);

    // SQL query
    var q = `SELECT
             count(*) as num_obs, 
             AVG(acc_x) as avg_x,
             AVG(acc_y) as avg_y,
             AVG(acc_z) as avg_z
             FROM sensordata;`;
             
    client.connect();
    client.query(q, (qerr, qres) => {
        console.log(res);
        res.send(qres.rows);
        console.log('responded to request');
    });
    client.end();
});

app.get('/aa', function(req, res) {

    MongoClient.connect(url, function(err, db) {
        if (err) {return console.dir(err);}
        
        var dateTimeNow = new Date();
        var today = dateTimeNow.getDay();
        var tomorrow;
        if (today == 6) {tomorrow = 0;}
        else {tomorrow = today + 1}
        var hour = dateTimeNow.getHours();

        var collection = db.collection(collName);
    
        collection.aggregate([ // start of aggregation pipeline
            // match by day and time
            { $match : 
                { $or : [
                    { $and: [
                        { dayQuery : 2 } , { hourQuery : { $gte: 19 } }
                    ]},
                    { $and: [
                        { dayQuery : 3 } , { hourQuery : { $lte: 4 } }
                    ]}
                ]}
            },
            
            // group by meeting group
            { $group : { _id : {
                latLong : "$latLong",
                meetingName : "$meetingName",
                meetingAddress1 : "$meetingAddress1",
                meetingAddress2 : "$meetingAddress2",
                borough : "$borough",
                meetingDetails : "$meetingDetails",
                meetingWheelchair : "$meetingWheelchair",
                },
                    meetingDay : { $push : "$day" },
                    meetingStartTime : { $push : "$startTime" }, 
                    meetingType : { $push : "$meetingType" }
            }
            },
            
            // group meeting groups by latLong
            {
                $group : { _id : { 
                    latLong : "$_id.latLong"},
                    meetingGroups : { $push : {groupInfo : "$_id", meetingDay : "$meetingDay", meetingStartTime : "$meetingStartTime", meetingType : "$meetingType" }}
                }
            }
        
            ]).toArray(function(err, docs) { // end of aggregation pipeline
            if (err) {console.log(err)}
            
            else {
                res.writeHead(200, {'content-type': 'text/html'});
                res.write(map1);
                res.write(JSON.stringify(docs));
                res.end(map3);
            }
            db.close();
        });
    });
    
});
console.log(process.env.PORT);
app.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function() {
    console.log('Server listening...');
});