#!/usr/bin/env node

// use strict

// self
const gw = require('.')
const { name } = require('./package.json')

// npm
const meow = require('meow')

const language = {
  type: 'string',
  alias: 'l'
}

if (process.env.LANG || process.env.LANGUAGE) {
  language.default = (process.env.LANG || process.env.LANGUAGE).slice(0, 2).toLowerCase()
}

const cli = meow(`
  Usage
    $ ${name} <command> [options]

  Usage Examples
    $ ${name} products --language=fr
    $ ${name} products --in-stock=yes --language=en
    $ ${name} products --in-stock --language=en
    $ ${name} products --in-stock=no --language=en
    $ ${name} stores
    $ ${name} locations
    $ ${name} products --location=qc # also accepts qu(e|é)bec and sqdc

  Commands
    products        List products
    stores          List local stores
    locations       List supported countries and provinces/states

  Options
    --in-stock  -s  In stock only; in-stock=false for the reverse
    --language  -l  Language (fr or en), defaults to $LANG or $LANGUAGE
    --force     -f  Bypass cached files if any and force download
    --details   -d  More detailled output
    --version       Output software version
    --help          This help text
`, {
  flags: {
    language,
    help: {
      type: 'boolean',
      alias: 'h'
    },
    version: {
      type: 'boolean',
      alias: 'v'
    },
    force: {
      type: 'boolean',
      alias: 'f'
    },
    details: {
      type: 'boolean',
      alias: 'd'
    },
    'in-stock': {
      type: 'boolean',
      alias: 's'
    }
  }
})

gw(cli)
  .catch(console.error)
