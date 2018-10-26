// use strict

// npm
const got = require('got')
const { JSDOM } = require('jsdom')

const contextRe = / data-context="(\{.+\})"/
const telRe = /^.*\D\d\D\s\d\D\d/

const stocks = (skus) => got('https://www.sqdc.ca/api/inventory/findInventoryItems', {
  json: true,
  headers: {
    'Accept-Language': 'fr-CA',
    'X-Requested-With': 'XMLHttpRequest'
  },
  body: { skus }
}).then(({ body }) => body)

/*
const available = (pages) => pages.reduce((a, { stocks, json }) => {
  const them = json.ProductSearchResults.SearchResults.filter((x) => stocks.indexOf(x.Sku) !== -1)
  return [...a, ...them]
}, [])
*/

const searchString = {
  fr: 'Rechercher',
  en: 'Search'
}

const getPage = async (cli, p = 1) => {
  const lang = (cli && cli.flags && cli.flags.language) || 'en'
  const { body } = await got(`https://www.sqdc.ca/${lang}-CA/${searchString[lang]}?keywords=*&sortDirection=asc&page=${p}`)
  const m1 = body.match(contextRe)
  if (!m1 || !m1[1]) {
    throw new Error('Nothing here')
  }
  return JSON.parse(m1[1].replace(/&quot;/g, '"'))
}

const getAllPages = async (cli) => {
  const o = await getPage(cli)
  const nPages = o.ProductSearchResults.Pagination.TotalNumberOfPages
  let r
  const gp = []
  for (r = 1; r < nPages; ++r) {
    gp.push(getPage(cli, r + 1))
  }
  const z = await Promise.all(gp)
  z.push(o)
  const products = z.reduce((a, json) => [...a, ...json.ProductSearchResults.SearchResults], [])

  if (!cli || !cli.flags) {
    return products
  }

  if (cli.flags.inStock) {
    return products.filter(({ IsOutOfStock }) => !IsOutOfStock)
  }

  if (cli.flags.inStock === false) {
    return products.filter(({ IsOutOfStock }) => IsOutOfStock)
  }

  return products
}

const parseStore = (s) => {
  const rawAddress = s.querySelector('address').textContent
  const tel = rawAddress.replace(telRe, '')
  return {
    storeName: s.querySelector('h6').textContent,
    address: rawAddress.replace(tel, ''),
    tel
  }
}

const products = async (cli) => {
  const products = await getAllPages(cli)
  const productsFixed = products.map(({ Url, ...product }) => ({
    ...product,
    Url: `https://www.sqdc.ca${Url}`
  }))

  if (!cli || !cli.flags || !cli.flags.quiet) {
    console.error(`${productsFixed.length} products found.`)
  }
  return productsFixed
}
products.description = 'List products'

const stores = async (cli) => {
  const { body } = await got('https://www.sqdc.ca/en-CA/Stores/Directory')
  const storesFound = Array.from(new JSDOM(body).window.document.querySelectorAll('.p-10'))
    .map(parseStore)

  if (!cli || !cli.flags || !cli.flags.quiet) {
    console.error(`${storesFound.length} stores found.`)
  }
  return storesFound
}
stores.description = 'List local stores'

const supportedLocations = [
  {
    id: 'sqdc',
    aliases: ['qc', 'québec', 'quebec'],
    url: 'https://www.sqdc.ca/',
    province: 'Québec',
    country: 'Canada',
    support: 'full'
  },
  {
    id: 'ocs',
    aliases: ['on', 'ontario'],
    url: 'https://ocs.ca/',
    province: 'Ontario',
    country: 'Canada'
  },
  {
    id: 'aglc',
    aliases: ['al', 'alberta'],
    url: 'https://aglc.ca/cannabisab',
    province: 'Alberta',
    country: 'Canada'
  },
  {
    id: 'mynslc',
    aliases: ['ns', 'nova-scotia'],
    url: 'https://cannabis.mynslc.com/',
    province: 'Nova Scotia',
    country: 'Canada'
  }
]

/*
const isSupportedLocation = (l) => {
  l = l.toLowerCase()
  return !supportedLocations.find(({ id, aliases }) => [id, ...aliases].map((s) => s.toLowerCase()).indexOf(l) === -1)
}
*/

const locations = () => supportedLocations.filter(({ support }) => support)
locations.description = 'List supported countries and provinces/states'

const commands = {
  locations,
  products,
  stores
}

const doit = async (cli) => {
  let command = cli && cli.input && (cli.input.length === 1) && cli.input[0].toLowerCase()
  if (!command) {
    return
  }

  if ((command === 'fr') || (command === 'en')) {
    console.error('Warning, "fr" and "en" commands are DEPRECATED and will be removed.')
    console.error(`Use --language=${command} and --in-stock options instead with the "products" command.`)
    if (!cli.flags) {
      cli.flags = {}
    }
    cli.flags.language = command
    cli.flags.inStock = true
    command = 'products'
  }

  if (!commands[command]) {
    const cmds = Object.keys(commands).sort().map(JSON.stringify)
    const last = cmds.pop()
    const err = new Error(`Command must be one of ${cmds.join(', ')} or ${last}.`)
    err.unknown = command
    err.code = 1
    throw err
  }

  if (cli.flags && cli.flags.language) {
    cli.flags.language = cli.flags.language.slice(0, 2).toLowerCase()
  }

  return commands[command](cli)
}

module.exports = doit
module.exports.commands = commands
module.exports.stocks = stocks
