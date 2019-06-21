'use strict'

const ky = require('ky-universal').default
const errcode = require('err-code')
const debug = require('debug')
const { dohBinary, keyToBase32 } = require('./utils')

const log = debug('ipfs:ipns:dns-datastore')
log.error = debug('ipfs:ipns:dns-datastore:error')

// DNS datastore aims to mimic the same encoding as routing when storing records
// to the local datastore
class DNSDataStore {
  constructor (repo) {
    this._repo = repo
  }

  /**
   * Put a value to the local datastore indexed by the received key properly encoded.
   * @param {Buffer} key identifier of the value.
   * @param {Buffer} value value to be stored.
   * @param {function(Error)} callback
   * @returns {void}
   */
  put (key, value, callback) {
    if (key.toString().startsWith('/pk/')) {
      return callback()
    }
    if (!Buffer.isBuffer(key)) {
      return callback(errcode(new Error('DNS datastore key must be a buffer'), 'ERR_INVALID_KEY'))
    }
    if (!Buffer.isBuffer(value)) {
      return callback(errcode(new Error(`DNS datastore value must be a buffer`), 'ERR_INVALID_VALUE'))
    }

    let keyStr
    try {
      keyStr = keyToBase32(key)
    } catch (err) {
      log.error(err)
      return callback(err)
    }

    ky.put(
      'https://ipns.dev',
      {
        json: {
          key: keyStr,
          record: value.toString('base64'),
          subdomain: true
        }
      })
      .then(data => {
        log(`publish key: ${keyStr}`)
        setImmediate(() => callback())
      })
      .catch(err => {
        log.error(err)
        setImmediate(() => callback(err))
      })
  }

  /**
   * Get a value from the local datastore indexed by the received key properly encoded.
   * @param {Buffer} key identifier of the value to be obtained.
   * @param {function(Error, Buffer)} callback
   * @returns {void}
   */
  get (key, callback) {
    if (!Buffer.isBuffer(key)) {
      return callback(errcode(new Error(`DNS datastore key must be a buffer`), 'ERR_INVALID_KEY'))
    }
    // https://dns.google.com/experimental
    // https://cloudflare-dns.com/dns-query
    // https://mozilla.cloudflare-dns.com/dns-query
    dohBinary('https://cloudflare-dns.com/dns-query', 'dns.ipns.dev', key, callback)
  }
}

module.exports = DNSDataStore
