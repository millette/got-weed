'use strict'

// npm
const stringify = require('fast-json-stable-stringify')

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

try {
  fs.mkdirSync(cacheDir)
} catch (e) {
  // nop
}

const md5 = (s) => {
  const hash = crypto.createHash('md5')
  hash.update(stringify(s))
  return hash.digest('hex')
}

const caching = (fn, cacheName, ttl) => {
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
    const h1 = md5(u + o)
    const c2 = `${path.resolve(cacheDir, cacheName, h1)}.json`
    try {
      if (force) {
        throw new Error('force download')
      }
      const j = require(c2)
      console.log('cache hit')
      const el = Date.now() - j.metadata.now
      console.log('c2:', c2, cacheName, el)
      if (el > ttl) {
        const err = new Error('expired')
        err.hash = j.metadata.hash
        throw err
      }
      return j && j.data
    } catch (e) {
      console.log('cache miss', e.toString())
      const data = await fn(o)
      // const dataImp = await fn(pre(o))
      // const data = post(dataImp))

      const hash = md5(data)
      if (hash === e.hash) {
        console.log('no change, skip write')
        return data
      }

      const out = JSON.stringify({
        data,
        metadata: {
          path: u,
          now: Date.now(),
          hash,
          query: o
        }
      })
      console.log('writing')
      wf(c2, out)
      console.log(c2, out)
      return data
    }
  }
}

module.exports = caching
