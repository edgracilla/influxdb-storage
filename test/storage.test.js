/* global describe, it, before, after */
'use strict'

const cp = require('child_process')
const should = require('should')
const moment = require('moment')
const amqp = require('amqplib')

let _storage = null
let _channel = null
let _conn = {}

let conf = {
  host: 'localhost',
  port: 8086,
  user: 'root',
  password: 'supersecret',
  connection_type: 'http',
  database: 'reekoh_db',
  series: 'reekoh_series',
  tagKeys: ''
}

const ID = new Date().getTime()

let record = {
  id: ID,
  co2: '11%',
  temp: 23,
  quality: ID,
  reading_time: '2015-11-27T11:04:13.539Z',
  random_data: 'abcdefg',
  is_normal: 'true'
}

describe('Storage', function () {
  this.slow(5000)

  before('init', () => {
    process.env.INPUT_PIPE = 'demo.pipe.storage'
    process.env.BROKER = 'amqp://guest:guest@127.0.0.1/'
    process.env.CONFIG = JSON.stringify(conf)

    amqp.connect(process.env.BROKER).then((conn) => {
      _conn = conn
      return conn.createChannel()
    }).then((channel) => {
      _channel = channel
    }).catch((err) => {
      console.log(err)
    })
  })

  after('terminate child process', function (done) {
    this.timeout(5000)

    _storage.send({
      type: 'close'
    })

    setTimeout(function () {
      _storage.kill('SIGKILL')
      done()
    }, 3000)
  })

  describe('#spawn', function () {
    it('should spawn a child process', function () {
      should.ok(_storage = cp.fork(process.cwd()), 'Child process not spawned.')
    })
  })

  describe('#handShake', function () {
    it('should notify the parent process when ready within 5 seconds', function (done) {
      this.timeout(5000)

      _storage.on('message', function (message) {
        if (message.type === 'ready') {
          done()
        }
      })
    })
  })

  describe('#data', function () {
    it('should process the data', function (done) {
      this.timeout(8000)

      _channel.sendToQueue(process.env.INPUT_PIPE, new Buffer(JSON.stringify(record)))

      _storage.on('message', (msg) => {
        if (msg.type === 'processed') done()
      })
    })
  })

  describe('#data', function () {
    it('should have inserted the data', function (done) {
      this.timeout(20000)

      let influx = require('influx')

      let client = influx({
        host: conf.host,
        port: conf.port, // optional, default 8086
        protocol: conf.connection_type, // optional, default 'http'
        username: conf.user,
        password: conf.password,
        database: conf.database
      })

      let query = 'SELECT * FROM "reekoh_series" WHERE id = ' + ID

      client.queryRaw(query, function (err, results) {
        if (err) return console.log(err)

        should.equal(record.co2, results[0].series[0].values[0][1], 'Data validation failed. Field: co2')
        should.equal(record.is_normal, results[0].series[0].values[0][3], 'Data validation failed. Field: is_normal')
        should.equal(record.quality, results[0].series[0].values[0][4], 'Data validation failed. Field: quality')
        should.equal(record.random_data, results[0].series[0].values[0][5], 'Data validation failed. Field: random_data')
        should.equal(moment(record.reading_time).format('YYYY-MM-DDTHH:mm:ss.SSSSZ'), moment(results[0].series[0].values[0][6]).format('YYYY-MM-DDTHH:mm:ss.SSSSZ'), 'Data validation failed. Field: reading_time')
        should.equal(record.temp, results[0].series[0].values[0][7], 'Data validation failed. Field: temp')

        done()
      })
    })
  })
})
