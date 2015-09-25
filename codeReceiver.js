/**
 * codeReceiver.js
 * 
 * The code receiver server is to receiving the code to save at redis.
 * The server is a backend system of bluesky. 
 * 
 * Author: Praween AMONTAMAVUT (Hayakawa Laboratory)
 * E-mail: praween@hykwlab.org
 * Create date: 2015-09-24
 * NOTE: Planning to add the deploying feature with auth here. (Need fix again.)
 */

var redisPort = 6379;
var redisHost = "127.0.0.1";
var redis = require("redis");
var client = redis.createClient(redisPort, redisHost);
var fs = require('fs');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var bodyParser = require('body-parser');
var express = require('express');

var app = express();
app.use(bodyParser());

app.get('/', function(req, res){
	res.send("ROOT\r\n");
});

// NOTE[testing here]: 
// curl -v http://0.0.0.0:8595/getcode?username=test
// {"username","test", "codeList":["LyoqDQogKiB0ZXN0DQogKi8NCm9uTGVkKCJ4LngueC54IiwgIjIxIik7DQppZih0cnVlKXsNCiAgICBjb25zb2xlLmxvZygic3Nzc3Nzc3MiKTsNCn0NCm9mZkxlZCgieC54LngueCIsICIyMSIpOw==","b25MZWQoIngueC54LngiLCAiMjEiKTsNCmlmKHRydWUpew0KICAgIGNvbnNvbGUubG9nKCJzc3Nzc3NzcyIpOw0KfQ=="]}
app.get('/getcode', function (req, res, next) {
	var username = req.param('username');
	next();
}, function(req, res){
	var username = req.param('username');
	var redisClient = redis.createClient();
	redisClient.smembers(username, function(err, reply){
		var decodedArr = decode(reply);
		var decodedArrJSON = toJSONlistStr(decodedArr);
		console.log(decodedArrJSON);
		var replyJSON = "{\"username\",\"" + username +"\", \"codeList\":" + decodedArrJSON + "}";
		res.send(replyJSON + "\r\n");
		console.log(decodedArr);
	});
	console.log(res.encodedReply);
});

//NOTE[base64 encoded code sample list]
//    b25MZWQoIngueC54LngiLCAiMjEiKTsNCmlmKHRydWUpew0KICAgIGNvbnNvbGUubG9nKCJzc3Nzc3NzcyIpOw0KfQ==
//    LyoqDQogKiB0ZXN0DQogKi8NCm9uTGVkKCJ4LngueC54IiwgIjIxIik7DQppZih0cnVlKXsNCiAgICBjb25zb2xlLmxvZygic3Nzc3Nzc3MiKTsNCn0NCm9mZkxlZCgieC54LngueCIsICIyMSIpOw==
// NOTE[testing here]: 
//    b25MZWQoIngueC54LngiLCAiMjEiKTsNCmlmKHRydWUpew0KICAgIGNvbnNvbGUubG9nKCJzc3Nzc3NzcyIpOw0KfQ==
//    LyoqDQogKiB0ZXN0DQogKi8NCm9uTGVkKCJ4LngueC54IiwgIjIxIik7DQppZih0cnVlKXsNCiAgICBjb25zb2xlLmxvZygic3Nzc3Nzc3MiKTsNCn0NCm9mZkxlZCgieC54LngueCIsICIyMSIpOw==
//
// curl -v -F "username=test" -F "ip=0.0.0.0:8595" -F "code=b25MZWQoIngueC54LngiLCAiMjEiKTsNCmlmKHRydWUpew0KICAgIGNvbnNvbGUubG9nKCJzc3Nzc3NzcyIpOw0KfQ==" http://0.0.0.0:8595/
// curl -v -d "username=test" -d "ip=0.0.0.0:8595" -d "code=b25MZWQoIngueC54LngiLCAiMjEiKTsNCmlmKHRydWUpew0KICAgIGNvbnNvbGUubG9nKCJzc3Nzc3NzcyIpOw0KfQ==" http://0.0.0.0:8595/
// curl -v -d "username=test" -d "ip=0.0.0.0:8595" -d "code=LyoqDQogKiB0ZXN0DQogKi8NCm9uTGVkKCJ4LngueC54IiwgIjIxIik7DQppZih0cnVlKXsNCiAgICBjb25zb2xlLmxvZygic3Nzc3Nzc3MiKTsNCn0NCm9mZkxlZCgieC54LngueCIsICIyMSIpOw==" http://0.0.0.0:8595/
app.post('/', function(req, res){
	var code = req.body.code;
	var username = req.body.username;
	var redisClient = redis.createClient();
	var base64_code = new Buffer(code).toString('base64');
	
	console.log("username: " + username);
	console.log("Pushing the code details: " + base64_code);
	redisClient.sadd(username, base64_code, redis.print);
	res.send("push success!\r\n");
});

function toJSONlistStr(arrDat){
	var ret = "[]";
	if(typeof arrDat !== 'undefined' && arrDat !== null && Array.isArray(arrDat)){
		var lenArr = arrDat.length;
		ret = "[";
		for(var i = 0; i < lenArr; i++){
			if(i < lenArr -1)
				ret += "\"" + arrDat[i] + "\"" + ",";
			else
				ret += "\"" + arrDat[i] + "\"";
		}
		ret += "]";
	}
	return ret;
}

function decode(arrDat){
	var ret = arrDat;
	if(typeof ret !== 'undefined' && ret !== null && Array.isArray(ret)){
		var datElement = 'undefined';
		var decodedStrBuf;
		var decodedDat;
		for(var i = 0; i < ret.length; i++){
			datElement = ret[i];
			decodedStrBuf = new Buffer(datElement, 'base64');
			decodedDat = decodedStrBuf.toString();
			ret[i] = decodedDat;
		}
		return ret;
	}else{
		return 'undefined';
	}
}

var codeReceiver = app.listen(8595, function () {
	var host = codeReceiver.address().address;
	var port = codeReceiver.address().port;
	console.log('Code reciver running on http://%s:%s', host, port);
});





function getTimestamp(){
	var d = new Date();
	return d.getTime();
}
function base64_str_encoder(str){
	return new Buffer(str).toString('base64');
}
function base64_encode(file) {
	var binary = fs.readFileSync(file);
	return new Buffer(binary).toString('base64');
}
function base64_decode(base64str, file) {
	var binary = new Buffer(base64str, 'base64');
	fs.writeFileSync(file, binary);
}