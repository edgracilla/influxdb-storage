/* global describe, it, before, after */
'use strict'

const amqp = require('amqplib')
const moment = require('moment')
const should = require('should')
const cp = require('child_process')

const ID = new Date().getTime()
const INPUT_PIPE = 'demo.pipe.storage'
const BROKER = 'amqp://guest:guest@127.0.0.1/'

let _app = null
let _conn = null
let _channel = null

let conf = {
  host: 'localhost',
  port: 8086,
  user: 'root',
  password: 'supersecret',
  connectionType: 'http',
  database: 'reekoh_db',
  series: 'reekoh_series',
  tagKeys: ''
}

let record = {
  id: ID,
  co2: '11%',
  temp: 23,
  quality: 11.25,
  readingTime: '2015-11-27T11:04:13.539Z',
  randomData: 'abcdefg',
  isNormal: 'true'
}

describe('Storage', function () {
  before('init', () => {
    process.env.BROKER = BROKER
    process.env.INPUT_PIPE = INPUT_PIPE
    process.env.CONFIG = JSON.stringify(conf)

    amqp.connect(BROKER).then((conn) => {
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

    _conn.close()
    _app.send({
      type: 'close'
    })

    setTimeout(function () {
      _app.kill('SIGKILL')
      done()
    }, 3000)
  })

  describe('#spawn', function () {
    it('should spawn a child process', function () {
      should.ok(_app = cp.fork(process.cwd()), 'Child process not spawned.')
    })
  })

  describe('#handShake', function () {
    it('should notify the parent process when ready within 5 seconds', function (done) {
      this.timeout(5000)

      _app.on('message', function (message) {
        if (message.type === 'ready') {
          done()
        }
      })
    })
  })

  describe('#data', function () {
    it('should process the data', function (done) {
      this.timeout(8000)

      _channel.sendToQueue(INPUT_PIPE, new Buffer(JSON.stringify(record)))

      _app.on('message', (msg) => {
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
        protocol: conf.connectionType, // optional, default 'http'
        username: conf.user,
        password: conf.password,
        database: conf.database
      })

      let query = 'SELECT * FROM "reekoh_series" WHERE id = ' + ID

      client.queryRaw(query, function (err, results) {
        if (err) return console.log(err)

        should.equal(record.co2, results[0].series[0].values[0][1], 'Data validation failed. Field: co2')
        should.equal(record.isNormal, results[0].series[0].values[0][3], 'Data validation failed. Field: isNormal')
        should.equal(record.quality, results[0].series[0].values[0][5], 'Data validation failed. Field: quality')
        should.equal(record.randomData, results[0].series[0].values[0][6], 'Data validation failed. Field: randomData')
        should.equal(moment(record.readingTime).format('YYYY-MM-DDTHH:mm:ss.SSSSZ'), moment(results[0].series[0].values[0][8]).format('YYYY-MM-DDTHH:mm:ss.SSSSZ'), 'Data validation failed. Field: readingTime')
        should.equal(record.temp, results[0].series[0].values[0][10], 'Data validation failed. Field: temp')

        done()
      })
    })
  })
})
