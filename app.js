'use strict'

const influx = require('influx')
const reekoh = require('reekoh')
const config = require('./config.js')
const _plugin = new reekoh.plugins.Storage()

const async = require('async')
const isPlainObject = require('lodash.isplainobject')

let opt = {}
let client = null

let sendData = (data, callback) => {
  let tags = {}

  let writePoint = () => {
    if (!data.time) data.time = Date.now()

    client.writePoint(opt.series, data, tags, [], (writeError) => {
      if (!writeError) {
        _plugin.log(JSON.stringify({
          title: 'Record Successfully inserted to InfluxDB.',
          data: data
        }))
      }

      callback(writeError)
    })
  }

  if (opt.tag_keys) {
    async.each(opt.tag_keys, (tag, done) => {
      if (data[tag]) {
        tags[tag] = data[tag]
        delete data[tag]
      }

      done()
    }, writePoint)
  } else {
    writePoint()
  }
}

_plugin.on('data', (data) => {
  if (isPlainObject(data)) {
    sendData(data, (error) => {
      if (error) {
        _plugin.logException(error)
      }

      process.send({ type: 'processed' })
    })
  } else if (Array.isArray(data)) {
    async.each(data, (datum, done) => {
      sendData(datum, done)
    }, (error) => {
      if (error) _plugin.logException(error)
    })
  } else {
    _plugin.logException(new Error(`Invalid data received. Data must be a valid Array/JSON Object or a collection of objects. Data: ${data}`))
  }
})

_plugin.once('ready', () => {
  let err = config.validate(_plugin.config)
  if (err) return console.error('Config Validation Error: \n', err)

  opt = _plugin.config

  client = influx({
    host: opt.host,
    port: opt.port || 8086,
    protocol: opt.protocol || 'http',
    username: opt.username,
    password: opt.password,
    database: opt.database
  })

  opt.tag_keys = `${opt.tag_keys}`.replace(/\s/g, '').split(',')

  _plugin.log('InfluxDB has been initialized.')
  process.send({ type: 'ready' })
})
