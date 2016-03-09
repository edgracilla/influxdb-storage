'use strict';

var platform = require('./platform'),
	isPlainObject = require('lodash.isplainobject'),
	isArray = require('lodash.isarray'),
	async = require('async'),
	opt, client;

let sendData = (data) => {
	var tags = {};

	if (opt.tagKeys){
		var tagList = opt.tagKeys.split(',');

		for (var i = 0; tagList.length > i; i++) {
			if (data[tagList[i]]) {
				tags[tagList[i]] = data[tagList[i]];
				delete data[tagList[i]];
			}

		}
	}

	client.writePoint(opt.series, data, tags, [], function(err) {
		if (err) {
			console.error('Error inserting record on InfluxDB.', err);
			platform.handleException(err);
		} else {
			platform.log(JSON.stringify({
				title: 'Record Successfully inserted to InfluxDB.',
				data: data
			}));
		}
	});
};

platform.on('data', function (data) {
	if(isPlainObject(data)){
		sendData(data);
	}
	else if(isArray(data)){
		async.each(data, function(datum){
			sendData(datum);
		});
	}
	else
		platform.handleException(new Error(`Invalid data received. Data must be a valid Array/JSON Object or a collection of objects. Data: ${data}`));
});

/**
 * Emitted when the platform shuts down the plugin. The Storage should perform cleanup of the resources on this event.
 */
platform.once('close', function () {
	let d = require('domain').create();

	d.once('error', function (error) {
		console.error(error);
		platform.handleException(error);
		platform.notifyClose();
		d.exit();
	});

	d.run(function () {
		// TODO: Release all resources and close connections etc.
		platform.notifyClose(); // Notify the platform that resources have been released.
		d.exit();
	});
});

/**
 * Emitted when the platform bootstraps the plugin. The plugin should listen once and execute its init process.
 * Afterwards, platform.notifyReady() should be called to notify the platform that the init process is done.
 * @param {object} options The options or configuration injected by the platform to the plugin.
 */
platform.once('ready', function (options) {

	var influx = require('influx');

	client = influx({
		host : options.host,
		port : options.port, // optional, default 8086
		protocol : options.connection_type, // optional, default 'http'
		username : options.user,
		password : options.password,
		database : options.database
	});

	// TODO: Initialize the connection to your database here.
	opt = options;
	platform.notifyReady();
	platform.log('InfluxDB has been initialized.');
});