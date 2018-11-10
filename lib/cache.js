'use strict'

// self
const { name, version } = require('../package.json')

// npm
const stringify = require('fast-json-stable-stringify')
const got = require('got')

// core
const path = require('path')
const fs = require('fs')
const os = require('os')
const { promisify } = require('util')
const crypto = require('crypto')

// const rf = promisify(fs.readFile)
const wf = promisify(fs.writeFile)

const tmpDir = os.tmpdir()
const cacheDir = path.resolve(tmpDir, 'booya')

const gwClient = got.extend({
  baseUrl: 'https://www.sqdc.ca',
  headers: {
    'Accept-Language': 'fr-CA',
    'User-Agent': `${name} v${version}`
  }
})

const gwClientJson = gwClient.extend({
  json: true,
  headers: { 'X-Requested-With': 'XMLHttpRequest' }
})

try {
  fs.mkdirSync(cacheDir)
} catch (e) {
  // nop
}

const md5 = (o) => {
  const hash = crypto.createHash('md5')
  hash.update(stringify(o))
  return hash.digest('hex')
}

// const caching = (fn, cacheName, ttl) => {
const caching = (json, cacheName, ttl) => {
// const caching = (cutKey, fn, cacheName, ttl) => {
// const caching = (fn, cacheName, options) => {
  /*
  if (!options) {
    options = {}
  }
  */

  // options.ttl = ttl || 60
  // options.post = post || (x) => x

  try {
    fs.mkdirSync(path.resolve(cacheDir, cacheName))
  } catch (e) {
    // nop
  }
  ttl *= 1000
  return async ({ u, o }, force) => {
    const h1 = md5({ u, o })
    const c2 = `${path.resolve(cacheDir, cacheName, h1)}.json`
    try {
      if (force) {
        throw new Error('force download')
      }
      const j = require(c2)
      // console.log('cache hit')
      const el = Date.now() - j.metadata.now
      // console.log('c2:', c2, cacheName, el)
      if (el > ttl) {
        const err = new Error('expired')
        err.hash = j.metadata.hash
        throw err
      }
      return j && j.body
    } catch (e) {
      // console.log('cache miss', e.toString())

      const fn = json ? gwClientJson : gwClient
      const { body } = await fn(u, json ? { body: o } : undefined)
      // const dataImp = await fn(pre(o))
      // const data = post(dataImp))

      const hash = md5(json ? body : { body })
      if (hash === e.hash) {
        // console.log('no change, skip write')
        return body
      }

      const out = JSON.stringify({
        body,
        metadata: {
          path: u,
          now: Date.now(),
          hash,
          query: o
        }
      })
      // console.log('writing')
      wf(c2, out)
      // console.log(c2, out)
      return body
    }
  }
}

module.exports = caching
