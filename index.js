// use strict

// npm
const got = require('got')
const { JSDOM } = require('jsdom')

const contextRe = / data-context="(\{.+\})"/
const telRe = /^.*\D\d\D\s\d\D\d/

const stock = (skus) => got('https://www.sqdc.ca/api/inventory/findInventoryItems', {
  json: true,
  headers: {
    'Accept-Language': 'fr-CA',
    'X-Requested-With': 'XMLHttpRequest'
  },
  body: { skus }
}).then(({ body }) => body)

const searchString = {
  fr: 'Rechercher',
  en: 'Search'
}

// const getPage = async (lang, p = 1) => {
const getPage = async (cli, p = 1) => {
  const lang = cli.flags.language

  // const { headers, body } = await got(`https://www.sqdc.ca/${lang}-CA/${searchString[lang]}?keywords=*&sortDirection=asc&page=${p}`)
  const { body } = await got(`https://www.sqdc.ca/${lang}-CA/${searchString[lang]}?keywords=*&sortDirection=asc&page=${p}`)
  const m1 = body.match(contextRe)
  if (!m1 || !m1[1]) {
    throw new Error('Nothing here')
  }
  return JSON.parse(m1[1].replace(/&quot;/g, '"'))
  /*
  const json = JSON.parse(m1[1].replace(/&quot;/g, '"'))
  const stocks = await stock(json.ProductSearchResults.SearchResults.map(({ Sku }) => Sku))
  return {
    stocks,
    page: p,
    headers,
    nPages: json.ProductSearchResults.Pagination.TotalNumberOfPages,
    json
  }
  */
}

// const getAllPages = async (lang) => {
const getAllPages = async (cli) => {
  // const lang = cli.flags.language
  // const o = await getPage(lang)
  const o = await getPage(cli)
  // const { nPages } = o
  const nPages = o.ProductSearchResults.Pagination.TotalNumberOfPages
  let r
  const gp = []
  for (r = 1; r < nPages; ++r) {
    // gp.push(getPage(lang, r + 1))
    gp.push(getPage(cli, r + 1))
  }
  const z = await Promise.all(gp)
  z.push(o)
  return z.reduce((a, json) => [...a, ...json.ProductSearchResults.SearchResults], [])
}

/*
const available = (pages) => pages.reduce((a, { stocks, json }) => {
  const them = json.ProductSearchResults.SearchResults.filter((x) => stocks.indexOf(x.Sku) !== -1)
  return [...a, ...them]
}, [])
*/

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
  const productsFixed = json.map(({ Url, ...product }) => ({
    ...product,
    Url: `https://www.sqdc.ca${Url}`
  }))

  console.error(`${productsFixed.length} items found.`)
  return productsFixed
}
products.description = 'List products'

const stores = async () => {
  const { body } = await got('https://www.sqdc.ca/en-CA/Stores/Directory')
  const storesFound = Array.from(new JSDOM(body).window.document.querySelectorAll('.p-10'))
    .map(parseStore)

  console.error(`${storesFound.length} stores found.`)
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
    id: 'other',
  }
]

const isSupportedLocation = (l) => {
  l = l.toLowerCase()
  return !supportedLocations.find(({ id, aliases }) => [id, ...aliases].map((s) => s.toLowerCase()).indexOf(l) === -1)
}

const locations = () => supportedLocations.filter(({ support }) => support)
locations.description = 'List supported countries and provinces/states'

const implemented = {
  locations,
  products,
  stores
}

const doit = async (cli) => {
  const command = cli && cli.input && (cli.input.length === 1) && cli.input[0].toLowerCase()
  if (!command) {
    return
  }
  if (!implemented[command]) {
    const cmds = Object.keys(implemented).sort().map(JSON.stringify)
    const last = cmds.pop()
    const err = new Error(`Command must be one of ${cmds.join(', ')} or ${last}.`)
    err.unknown = command

    err.code = 1
    throw err
  }

  if (cli.flags && cli.flags.language) {
    cli.flags.language = cli.flags.language.slice(0, 2).toLowerCase()
  }

  return implemented[command](cli)
}

module.exports = doit
module.exports.implemented = implemented
