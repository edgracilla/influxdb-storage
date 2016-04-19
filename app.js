'use strict';

var async         = require('async'),
	isArray       = require('lodash.isarray'),
	platform      = require('./platform'),
	isPlainObject = require('lodash.isplainobject'),
	opt, client;

let sendData = function (data, callback) {
	let tags = {};

	let writePoint = function () {
		if (!data.time) data.time = Date.now();

		client.writePoint(opt.series, data, tags, [], (writeError) => {
			if (!writeError) {
				platform.log(JSON.stringify({
					title: 'Record Successfully inserted to InfluxDB.',
					data: data
				}));
			}

			callback(writeError);
		});
	};

	if (opt.tag_keys) {
		async.each(opt.tag_keys, (tag, done) => {
			if (data[tag]) {
				tags[tag] = data[tag];
				delete data[tag];
			}

			done();
		}, writePoint);
	}
	else
		writePoint();
};

platform.on('data', function (data) {
	if (isPlainObject(data)) {
		sendData(data, (error) => {
			if (error) platform.handleException(error);
		});
	}
	else if (isArray(data)) {
		async.each(data, (datum, done) => {
			sendData(datum, done);
		}, (error) => {
			if (error) platform.handleException(error);
		});
	}
	else
		platform.handleException(new Error(`Invalid data received. Data must be a valid Array/JSON Object or a collection of objects. Data: ${data}`));
});

/**
 * Emitted when the platform shuts down the plugin. The Storage should perform cleanup of the resources on this event.
 */
platform.once('close', function () {
	platform.notifyClose();
});

/**
 * Emitted when the platform bootstraps the plugin. The plugin should listen once and execute its init process.
 * Afterwards, platform.notifyReady() should be called to notify the platform that the init process is done.
 * @param {object} options The options or configuration injected by the platform to the plugin.
 */
platform.once('ready', function (options) {
	var influx = require('influx');

	client = influx(options);

	opt.tag_keys = `${opt.tag_keys}`.replace(/\s/g, '').split(',');

	// TODO: Initialize the connection to your database here.
	opt = options;
	platform.notifyReady();
	platform.log('InfluxDB has been initialized.');
});