/*
 * Just a sample code to test the storage plugin.
 * Kindly write your own unit tests for your own plugin.
 */
'use strict';


var cp       = require('child_process'),
	assert   = require('assert'),
	should   = require('should'),
	moment   = require('moment'),
	storage;


var HOST 	        = 'gigawatt-calvinklein-42.c.influxdb.com',
	USER 	        = 'influxdb',
	PASSWORD        = '5b956a12e730283f',
	PORT 	        = 8086,
	CONNECTION_TYPE = 'https',
	DATABASE        = 'reekoh_db',
	SERIES          = 'reekoh_series',
	TAG_KEYS        = '',
	ID  	        = new Date().getTime();


var record = {
	id: ID,
	co2: '11%',
	temp: 23,
	quality: ID,
	reading_time: '2015-11-27T11:04:13.539Z',
	random_data: 'abcdefg',
	is_normal: 'true'
};


describe('Storage', function () {
	this.slow(5000);

	after('terminate child process', function () {
		storage.send({
			type: 'close'
		});

		setTimeout(function () {
			storage.kill('SIGKILL');
		}, 3000);
	});

	describe('#spawn', function () {
		it('should spawn a child process', function () {
			assert.ok(storage = cp.fork(process.cwd()), 'Child process not spawned.');
		});
	});

	describe('#handShake', function () {
		it('should notify the parent process when ready within 5 seconds', function (done) {
			this.timeout(5000);

			storage.on('message', function (message) {
				if (message.type === 'ready')
					done();
			});

			storage.send({
				type: 'ready',
				data: {
					options: {
						host	          : HOST,
						port              : PORT,
						user	          : USER,
						password          : PASSWORD,
						connection_type   : CONNECTION_TYPE,
						database          : DATABASE,
						series        	  : SERIES,
						tagKeys		      : TAG_KEYS
					}
				}
			}, function (error) {
				assert.ifError(error);
			});
		});
	});

	describe('#data', function () {
		it('should process the data', function (done) {
			storage.send({
				type: 'data',
				data: record
			}, done);
		});
	});

	describe('#data', function () {
		it('should have inserted the data', function (done) {
			this.timeout(20000);

			var influx = require('influx');

			var client = influx({
				host : HOST,
				port : PORT, // optional, default 8086
				protocol : CONNECTION_TYPE, // optional, default 'http'
				username : USER,
				password : PASSWORD,
				database : DATABASE
			});

			var query = 'SELECT * FROM "reekoh_series" WHERE id = ' + ID;
			client.queryRaw(query, function(err, results) {

				should.equal(record.co2, results[0].series[0].values[0][1], 'Data validation failed. Field: co2');
				should.equal(record.is_normal, results[0].series[0].values[0][3], 'Data validation failed. Field: is_normal');
				should.equal(record.quality, results[0].series[0].values[0][4], 'Data validation failed. Field: quality');
				should.equal(record.random_data, results[0].series[0].values[0][5], 'Data validation failed. Field: random_data');
				should.equal(moment(record.reading_time).format('YYYY-MM-DDTHH:mm:ss.SSSSZ'),
					moment(results[0].series[0].values[0][6]).format('YYYY-MM-DDTHH:mm:ss.SSSSZ'),  'Data validation failed. Field: reading_time');
				should.equal(record.temp, results[0].series[0].values[0][7], 'Data validation failed. Field: temp');

				done();
			});


		});
	});

});