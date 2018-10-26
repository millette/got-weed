#!/usr/bin/env node

// use strict

// self
const gw = require('.')
const { commands } = gw
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

  ${['Commands', ...Object.keys(commands).sort().map((cmd) => `    ${cmd}\t\t${commands[cmd].description}`)].join('\n')}

  Options
    --details   -d\tMore detailled output (not implemented yet)
    --force     -f\tBypass cached files if any and force download (not implemented yet)
    --in-stock  -s\tIn stock only; in-stock=false for the reverse
    --language  -l\tLanguage (fr or en), defaults to $LANG or $LANGUAGE
    --quiet     -q\tQuiet
    --version\t\tOutput software version
    --help\t\tThis help text
`, {
  booleanDefault: undefined,
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
    quiet: {
      type: 'boolean',
      alias: 'q'
    },
    'in-stock': {
      type: 'boolean',
      alias: 's'
    }
  }
})

const jsoned = (j) => {
  if (!j) {
    cli.showHelp(0) // also exits
  }
  console.log(JSON.stringify(j, null, '  '))
}

gw(cli)
  .then(jsoned)
  .catch((e) => {
    console.error(e.toString())
    const code = e.code || 127
    delete e.code
    if (Object.keys(e).length) {
      console.error(JSON.stringify(e))
    }
    cli.showHelp(code)
  })
