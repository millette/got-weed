// use strict

// npm
const got = require('got')
const { JSDOM } = require('jsdom')

// self
const { name, version } = require('./package.json')

const gwClient = got.extend({
  baseUrl: 'https://www.sqdc.ca',
  headers: {
    'Accept-Language': 'fr-CA',
    'user-agent': `${name} v${version}`
  }
})

const contextRe = / data-context="(\{.+\})"/
const telRe = /^.*\D\d\D\s\d\D\d/

const knownSkus = [
  '628582000098',
  '628582000197',
  '628582000234',
  '628582000302',
  '628582000357',
  '628582000524',
  '628582000562',
  '629108001063',
  '629108006068',
  '629108009069',
  '629108011062',
  '629108013066',
  '629108015060',
  '629108017064',
  '629108022068',
  '629108026066',
  '629108034061',
  '629108037062',
  '629108500061',
  '629108501068',
  '629108502065',
  '629108503062',
  '629108504069',
  '629108505066',
  '629108506063',
  '629108507060',
  '688083001031',
  '688083001260',
  '688083002052',
  '688083002090',
  '688083002137',
  '688083002236',
  '688083002267',
  '694144000134',
  '694144000172',
  '694144000189',
  '694144000219',
  '694144000226',
  '694144000653',
  '694144000660',
  '694144000677',
  '694144000684',
  '694144000691',
  '694144001834',
  '694144001858',
  '697238111112',
  '697238111136',
  '697238111150',
  '697238111174',
  '697238111198',
  '697238111235',
  '697238111259',
  '697238111273',
  '697238111297',
  '697238111310',
  '697238111402',
  '697238111426',
  '697238111440',
  '697238111495',
  '697238111679',
  '826966000010',
  '826966000027',
  '826966000034',
  '826966000041',
  '826966000287',
  '826966000294',
  '826966000348',
  '826966000355'
]

const stocks = (skus) => gwClient('/api/inventory/findInventoryItems', {
  json: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest'
  },
  body: { skus: (skus && skus.length) ? skus : knownSkus }
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
  const { body } = await gwClient(`/${lang}-CA/${searchString[lang]}?keywords=*&sortDirection=asc&page=${p}`)
  const m1 = body.match(contextRe)
  // istanbul ignore if
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

  /*
  if (!cli || !cli.flags) {
    return products
  }
  */

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

  // istanbul ignore if
  if (!cli || !cli.flags || !cli.flags.quiet) {
    console.error(`${productsFixed.length} products found.`)
  }
  return productsFixed
}
products.description = 'List products'

const stores = async (cli) => {
  const { body } = await gwClient('/en-CA/Stores/Directory')
  const storesFound = Array.from(new JSDOM(body).window.document.querySelectorAll('.p-10'))
    .map(parseStore)

  // istanbul ignore if
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
    // istanbul ignore if
    if (!cli || !cli.flags || !cli.flags.quiet) {
      console.error('Warning, "fr" and "en" commands are DEPRECATED and will be removed.')
      console.error(`Use --language=${command} and --in-stock options instead with the "products" command.`)
    }
    // istanbul ignore if
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
module.exports.knownSkus = knownSkus
