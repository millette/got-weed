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

const caching = (g, fn, ttl) => {
  try {
    fs.mkdirSync(path.resolve(cacheDir, fn))
  } catch (e) {
    // nop
  }
  ttl *= 1000
  // return async (x, o, force) => {
  return async (o, force) => {
    const hash = crypto.createHash('md5')
    hash.update(stringify(o))
    const c2 = `${path.resolve(cacheDir, fn, hash.digest('hex'))}.json`
    try {
      if (force) {
        throw new Error('force download')
      }
      const j = require(c2)
      console.log('cache hit')
      const el = Date.now() - j.metadata.now
      // console.log('c2:', c2, fn, x, el)
      console.log('c2:', c2, fn, el)
      if (el > ttl) {
        const err = new Error('expired')
        err.hash = j.metadata.hash
        throw err
      }
      return j && j.data
    } catch (e) {
      console.log('cache miss', e.toString())
      // const data = await g(x)
      const data = await g(o)
      const hash2 = crypto.createHash('md5')
      hash2.update(stringify(data))
      const h2 = hash2.digest('hex')
      if (h2 === e.hash) {
        console.log('no change, skip write')
        return data
      }

      const out = JSON.stringify({
        data,
        metadata: {
          now: Date.now(),
          // name: x,
          hash: h2,
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
