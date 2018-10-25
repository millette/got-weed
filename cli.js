#!/usr/bin/env node

// use strict

// self
const gw = require('.')
const { name } = require('./package.json')
// npm
const meow = require('meow')

const cli = meow(`
    Usage
      $ ${name} <input> <options>

    Usage Examples
      $ got-weed fr
      $ got-weed en
      $ got-weed stores fr
      $ got-weed stores en

    Options
      --version   Output software version
      --help      This help text
`)

gw(cli)
  .catch(console.error)
