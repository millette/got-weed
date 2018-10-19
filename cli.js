#!/usr/bin/env node

// use strict

// self
const cli = require('.')

cli(process.argv[2] || 'fr')
  .catch(console.error)