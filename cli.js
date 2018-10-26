#!/usr/bin/env node

// use strict

// self
const gw = require('.')
const { commands } = gw
const { name } = require('./package.json')

// npm
const meow = require('meow')

const language = { type: 'string' }

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
    $ ${name} categories
    $ ${name} products --location=qc # also accepts qu(e|é)bec and sqdc

  ${['Commands', ...Object.keys(commands).sort().map((cmd) => `    ${cmd}\t\t${commands[cmd].description}`)].join('\n')}

  Options
    --category  -c\tFilter by category
    --details   -d\tMore detailled output (not implemented yet)
    --force     -f\tBypass cached files if any and force download (not implemented yet)
    --in-stock  -s\tIn stock only; in-stock=false for the reverse
    --language    \tLanguage (fr or en), defaults to $LANG or $LANGUAGE
    --location  -l\tSpecify location
    --quiet     -q\tQuiet
    --version\t\tOutput software version
    --help\t\tThis help text
`, {
  booleanDefault: undefined,
  flags: {
    language,
    location: {
      type: 'string',
      alias: 'l'
    },
    help: {
      type: 'boolean',
      alias: 'h'
    },
    version: {
      type: 'boolean',
      alias: 'v'
    },
    category: {
      type: 'string',
      alias: 'c'
    },
    force: {
      type: 'boolean',
      alias: 'f',
      default: false
    },
    details: {
      type: 'boolean',
      alias: 'd',
      default: false
    },
    quiet: {
      type: 'boolean',
      alias: 'q',
      default: false
    },
    sku: {
      type: 'string'
    },
    'in-stock': {
      type: 'boolean',
      alias: 's'
    },
    debug: {
      type: 'boolean',
      default: false
    }
  }
})

const jsoned = (j) => {
  if (!j) {
    cli.showHelp(0) // also exits
  }
  if (j && (j.length || Object.keys(j).length)) {
    console.log(JSON.stringify(j, null, '  '))
  } else {
    console.log('Nothing found.')
  }
}

gw(cli)
  .then(jsoned)
  .catch((e) => {
    if (cli && cli.flags && cli.flags.debug) {
      console.error(e)
    } else {
      console.error(e.toString())
    }
    const code = e.code || 127
    delete e.code
    if (Object.keys(e).length) {
      console.error(JSON.stringify(e))
    }
    cli.showHelp(code)
  })
