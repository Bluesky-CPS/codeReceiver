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
'use strict';

var redis = require("redis");
var fs = require('fs');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var bodyParser = require('body-parser');
var cors = require('cors');
var express = require('express');
var dns = require('dns');

var setting = {};
var rclient;
var corsOptions = {
	origin: '*'
};
var sauth = "default";
var _e = {
	rem: {
		result: 'result',
		error: 'error'
	}
};

function codeReceiver(){
	var self = this;
	EventEmitter.call(this);
	this.initSetting();
	rclient = redis.createClient(self.setting.redis.port, self.setting.redis.host);
}
function codeReceiver(settingArg){
	var self = this;
	EventEmitter.call(this);
	if(typeof settingArg !== 'undefined'){
		this.setting = settingArg;

		if(typeof this.setting.listenport === 'undefined'){
			this.setting["listenport"] = 8595;
		}

		if(typeof this.setting.redis === 'undefined'){
			this.setting["redis"] = {
				host: "127.0.0.1",
				port: 6379
			};
		}else if(typeof this.setting.redis.host === 'undefined'){
			this.setting.redis["host"] = "127.0.0.1";
		}else if(typeof this.setting.redis.port === 'undefined'){
			this.setting.redis["port"] = 6379;
		}
	}else{
		this.initSetting();
	}

	if(process.env.CODEREC_AUTH !== 'undefined'){
		this.sauth = process.env.CODEREC_AUTH;
		self.sauth = process.env.CODEREC_AUTH;
	}

	self.setting = this.setting;
	setting = this.setting;


	rclient = redis.createClient(self.setting.redis.port, self.setting.redis.host);
	
	if(this.sauth !== 'default' && this.auth !== 'undefined'){
		rclient.auth(this.sauth);
	}
}
util.inherits(codeReceiver, EventEmitter);

codeReceiver.prototype.initSetting = function(){
	var self = this;
	this.setting = {
		listenport: 8595,
		redis: {
			host: "127.0.0.1",
			port: 6379
		}
	};
	self.setting = this.setting;
	setting = this.setting;
}

function toCname(hostnames, accessIP){
	if(Array.isArray(hostnames)){
		var cname = hostnames;
		if(cname.length == 0){
			cname.push(accessIP);
		}
		return cname;
	}else{
		return accessIP;
	}
}

codeReceiver.prototype.listen = function(port){
	var self = this;
	var app = express();
	app.use(bodyParser());
	app.use(cors());
	var codeReceiver = app.listen(this.setting.listenport, function () {
		var host = codeReceiver.address().address;
		var port = codeReceiver.address().port;
		console.log('Code receiver running on http://%s:%s', host, port);
	});
	app.get('/', function(req, res){
		var self = this;
		var ip = req.connection.remoteAddress || req.socket.remoteAddress;
		var url = ip;

		/*dns.resolve4(url, function (err, addresses) {
			if (err){
				res.send("Internal server error.\r\n");
				throw err;
			}
			
			addresses.forEach(function (a) {
				dns.reverse(a, function (err, hostnames) {
					if (err) {
						res.send("Internal server error.\r\n");
						throw err;
					}

					var cname = toCname(hostnames, ip);

					res.send("codeReceiver is running now.<br><br><table><tr><td align='right'>YOUR IP:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td><td>" + ip + "</td></tr><tr><td align='right'>YOUR CNAME:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td><td>" + cname + "</td></tr></table>\r\n");
				});
			});
		});*/

		res.send("codeReceiver is running now.\r\n");
	});

	// NOTE[testing here]: 
	// curl -v http://0.0.0.0:8595/getcode?username=test
	// {"username","test", "codeList":["LyoqDQogKiB0ZXN0DQogKi8NCm9uTGVkKCJ4LngueC54IiwgIjIxIik7DQppZih0cnVlKXsNCiAgICBjb25zb2xlLmxvZygic3Nzc3Nzc3MiKTsNCn0NCm9mZkxlZCgieC54LngueCIsICIyMSIpOw==","b25MZWQoIngueC54LngiLCAiMjEiKTsNCmlmKHRydWUpew0KICAgIGNvbnNvbGUubG9nKCJzc3Nzc3NzcyIpOw0KfQ=="]}
	app.get('/getcode', cors(corsOptions), function (req, res, next) {
		var username = req.param('username');
		next();
	}, function(req, res){
		// Dohere (kentouchuu).
		/*var ip = req.connection.remoteAddress || req.socket.remoteAddress;
		var url = ip;
		dns.resolve4(url, function (err, addresses) {
			if (err){
				res.send("Internal server error.\r\n");
				throw err;
			}
		
			addresses.forEach(function (a) {
				dns.reverse(a, function (err, hostnames) {
					if (err) {
						res.send("Internal server error.\r\n");
						throw err;
					}
					var cname = toCname(hostnames, ip);
					console.log("accessIP: ", ip);
					console.log("cname: ", cname);
				});
			});
		});*/
		// Begin push the code to redis.
		var username = req.param('username');
		var redisClient = redis.createClient(self.setting.redis.port, self.setting.redis.host);
		if(self.sauth !== 'default' && self.auth !== 'undefined'){
			redisClient.auth(self.sauth);
		}
		redisClient.smembers(username, function(err, reply){
			var decodedArr = decode(reply);
			var decodedArrJSON = toJSONlistStr(decodedArr);
			var replyJSON = "{\"username\":\"" + username +"\", \"codeList\":" + decodedArrJSON + ", \"serverTimestamp\":\""+ getTimestamp() +"\"}";
			res.send(replyJSON + "\r\n");
		});
		//console.log("res.encodeReply: " , res.encodedReply);
		// End push the code to redis.
	});

	// NOTE[base64 encoded code sample list]
	//    b25MZWQoIngueC54LngiLCAiMjEiKTsNCmlmKHRydWUpew0KICAgIGNvbnNvbGUubG9nKCJzc3Nzc3NzcyIpOw0KfQ==
	//    LyoqDQogKiB0ZXN0DQogKi8NCm9uTGVkKCJ4LngueC54IiwgIjIxIik7DQppZih0cnVlKXsNCiAgICBjb25zb2xlLmxvZygic3Nzc3Nzc3MiKTsNCn0NCm9mZkxlZCgieC54LngueCIsICIyMSIpOw==
	// NOTE[testing here]: 
	//    b25MZWQoIngueC54LngiLCAiMjEiKTsNCmlmKHRydWUpew0KICAgIGNvbnNvbGUubG9nKCJzc3Nzc3NzcyIpOw0KfQ==
	//    LyoqDQogKiB0ZXN0DQogKi8NCm9uTGVkKCJ4LngueC54IiwgIjIxIik7DQppZih0cnVlKXsNCiAgICBjb25zb2xlLmxvZygic3Nzc3Nzc3MiKTsNCn0NCm9mZkxlZCgieC54LngueCIsICIyMSIpOw==
	//
	// curl -v -F "username=test" -F "ip=0.0.0.0:8595" -F "code=b25MZWQoIngueC54LngiLCAiMjEiKTsNCmlmKHRydWUpew0KICAgIGNvbnNvbGUubG9nKCJzc3Nzc3NzcyIpOw0KfQ==" http://0.0.0.0:8595/
	// curl -v -d "username=test" -d "ip=0.0.0.0:8595" -d "code=b25MZWQoIngueC54LngiLCAiMjEiKTsNCmlmKHRydWUpew0KICAgIGNvbnNvbGUubG9nKCJzc3Nzc3NzcyIpOw0KfQ==" http://0.0.0.0:8595/
	// curl -v -d "username=test" -d "ip=0.0.0.0:8595" -d "code=LyoqDQogKiB0ZXN0DQogKi8NCm9uTGVkKCJ4LngueC54IiwgIjIxIik7DQppZih0cnVlKXsNCiAgICBjb25zb2xlLmxvZygic3Nzc3Nzc3MiKTsNCn0NCm9mZkxlZCgieC54LngueCIsICIyMSIpOw==" http://0.0.0.0:8595/
//%3D
	app.post('/', cors(corsOptions), function(req, res, next){
		var code = req.body.code;
		var username = req.body.username;
		//console.log(code.toLoverCase().replace("%3d", "="));
		var redisClient = redis.createClient(self.setting.redis.port, self.setting.redis.host);
		if(self.sauth !== 'default' && self.auth !== 'undefined'){
			redisClient.auth(self.sauth);
		}
		var base64_code = new Buffer(code).toString('base64');
		
		console.log("username: " + username);
		console.log("Pushing the code details: " + getTimestamp() + "|" + base64_code);
		redisClient.sadd(username, getTimestamp() + "|" + base64_code, redis.print);
		res.setHeader("Access-Control-Allow-Origin", "*");
		res.send("push success!\r\n");
	});

	// NOTE:
	// curl -v -d "pushedTimestamp=[input the time here when test]" -d "username=test" -d "ip=0.0.0.0:8595" -d "code=LyoqDQogKiB0ZXN0DQogKi8NCm9uTGVkKCJ4LngueC54IiwgIjIxIik7DQppZih0cnVlKXsNCiAgICBjb25zb2xlLmxvZygic3Nzc3Nzc3MiKTsNCn0NCm9mZkxlZCgieC54LngueCIsICIyMSIpOw==" http://0.0.0.0:8595/rem
	app.post('/rem', cors(corsOptions), function(req, res, next){
		next();
	}, function(req, res){
		var code = req.body.code;
		var pushedTimestamp = req.body.pushedTimestamp;
		var username = req.body.username;
		var redisClient = redis.createClient(self.setting.redis.port, self.setting.redis.host);
		if(self.sauth !== 'default' && self.auth !== 'undefined'){
			redisClient.auth(self.sauth);
		}
		var base64_code = new Buffer(code).toString('base64');
		var result;
		console.log(code);
		res.setHeader("Access-Control-Allow-Origin", "*");

		if(typeof pushedTimestamp !== 'undefined'){
			redisClient.srem(username, pushedTimestamp + "|" + base64_code, function(err, reply){
				console.log("redis obj: ", reply);
				self.emit(_e.rem.result, reply);
			});
		}else{
			redisClient.srem(username, base64_code, function(err, reply){
				console.log("redis obj: ", reply);
				self.emit(_e.rem.result, reply);
			});
		}
		res.send("Delete success!\r\n");
	});
}

function toJSONlistStr(arrDat){
	var ret = "[]";
	if(typeof arrDat !== 'undefined' && arrDat !== null && Array.isArray(arrDat)){
		var lenArr = arrDat.length;
		ret = "[";
		for(var i = 0; i < lenArr; i++){
			if(isJSON(arrDat[i])){
				if(i < lenArr -1){
					ret += "{\"pushedTimestamp\":\"" + arrDat[i].pushedTimestamp + "\",\"code\":\"" + arrDat[i].code + "\"},";
				}else{
					ret += "{\"pushedTimestamp\":\"" + arrDat[i].pushedTimestamp + "\",\"code\":\"" + arrDat[i].code + "\"}";
				}
			}else{
				if(i < lenArr -1)
					ret += "{\"code\":\"" + arrDat[i] + "\"" + "},";
				else
					ret += "{\"code\":\"" + arrDat[i] + "\"}";
			}
		}
		ret += "]";
	}
	return ret;
}

function isJSON(jsondat){
	var ret = false;
	try{
		JSON.parse(jsondat);
		ret = true;
	}catch(e){
		ret = false;
	}
	ret |= (typeof jsondat == 'object' || typeof jsondat == 'Object');
	return ret;
}

function decode(arrDat){
	var ret = arrDat;
	if(typeof ret !== 'undefined' && ret !== null && Array.isArray(ret)){
		var datElement = 'undefined';
		var decodedStrBuf;
		var decodedDat;
		var splitedStrArr;
		for(var i = 0; i < ret.length; i++){
			splitedStrArr = ret[i].split("|");
			if(splitedStrArr.length > 1){
				datElement = splitedStrArr[1];
				decodedStrBuf = new Buffer(datElement, 'base64');
				decodedDat = decodedStrBuf.toString();
				ret[i] = {
					'pushedTimestamp': splitedStrArr[0], 
					'code':decodedDat
				};
			}else{
				datElement = ret[i];
				decodedStrBuf = new Buffer(datElement, 'base64');
				decodedDat = decodedStrBuf.toString();
				ret[i] = decodedDat;
			}
		}
		return ret;
	}else{
		return 'undefined';
	}
}

function getTimestamp(){
	var d = new Date();
	return d.getTime();
}
function isInteger(dat){
	var ret = false;
	try{
		var testint = parseInt(dat);
		ret = true;
	}catch(e){
		ret = false;
	}
	return ret;
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

module.exports = codeReceiver;
