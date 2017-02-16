'use strict'

const validate = require('validate.js')

let constraints = {
  host: {
    presence: true
  },
  port: {
    presence: false
  },
  protocol: {
    presence: false
  },
  username: {
    presence: false
  },
  password: {
    presence: false
  },
  database: {
    presence: true
  },
  series: {
    presence: true
  },
  tag_keys: {
    presence: false
  }
}

module.exports.validate = (attribs) => {
  return validate(attribs, constraints)
}

