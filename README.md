# got-weed
[![Build Status](https://travis-ci.org/millette/got-weed.svg?branch=master)](https://travis-ci.org/millette/got-weed)
[![Coverage Status](https://coveralls.io/repos/github/millette/got-weed/badge.svg?branch=master)](https://coveralls.io/github/millette/got-weed?branch=master)
> Find out what products are currently in stock at SQDC.

## Install
If you have node v8.12.0 or above, you can install the cli with:

```sh
$ npm install --global got-weed
```

If you prefer, you can download a binary from [release pages](https://github.com/millette/got-weed/releases) which bundles node with this project for GNU/Linux, Windows and MacOS.

## Usage
```
$ got-weed <command> [options]

Usage Examples
  $ got-weed products --language=fr
  $ got-weed products --in-stock=yes --language=en
  $ got-weed products --in-stock --language=en
  $ got-weed products --in-stock=no --language=en
  $ got-weed stores
  $ got-weed locations
  $ got-weed products --location=qc # also accepts qu(e|é)bec and sqdc

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
```

## License
AGPL-v3 © 2018 [Robin Millette](http://robin.millette.info)
