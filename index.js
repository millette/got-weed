'use strict'

// self
const caching = require('./lib/cache')

const LONG_TTL = 60 * 60 * 24
const SHORT_TTL = 60 * 5

const contextRe = / data-context="(\{.+\})"/

const knownCategories = {
  fr: ['fleurs-sechees', 'pilules', 'moulu', 'preroules', 'huiles', 'atomiseurs-oraux'],
  en: ['dried-flowers', 'pills', 'ground', 'pre-rolled', 'oils', 'oral-sprays']
}

const specsCached = caching(true, 'specs', SHORT_TTL)

const specs = async (cli) => {
  const { Groups: [{ Attributes }] } = await specsCached(
    {
      u: '/api/product/specifications',
      o: {
        productId: `${cli.flags.sku}-P`,
        variantId: cli.flags.sku
      }
    },
    cli.flags.force
  )
  const ret = {}
  Attributes.forEach(({ PropertyName, Title, Value }) => {
    ret[PropertyName] = { Title, Value }
  })
  return ret
}

specs.description = 'Details about a product, use the --sku option to specify.'

const categories = (cli) => knownCategories[(cli && cli.flags && cli.flags.language) || 'en']
categories.description = 'List supported categories'

const stocksCached = caching(true, 'stocks', SHORT_TTL)

const stocks = (skus, force) => stocksCached({ u: '/api/inventory/findInventoryItems', o: { skus } }, force)

const pricesCached = caching(true, 'prices', LONG_TTL)

const prices = async (products, force) => {
  const { ProductPrices } = await pricesCached({ u: '/api/product/calculatePrices', o: { products } }, force)
  return ProductPrices
}

const searchString = {
  fr: 'Rechercher',
  en: 'Search'
}

const gwClient = caching(false, 'page', SHORT_TTL)

const getCategoryPage = async (cli, p) => {
  const lang = (cli && cli.flags && cli.flags.language) || 'en'
  const cats = categories(cli)
  const category = cats.indexOf(cli && cli.flags && cli.flags.category) !== -1 && cli.flags.category.toLowerCase()
  const u = category
    ? `/${lang}-CA/${category}?page=${p}`
    : `/${lang}-CA/${searchString[lang]}?keywords=*&sortDirection=asc&page=${p}`
  return gwClient({ u }, cli.flags.force)
}

const getPage = async (cli, p) => {
  const body = await getCategoryPage(cli, p)
  const m1 = body.match(contextRe)
  // istanbul ignore if
  if (!m1 || !m1[1]) {
    throw new Error('Nothing here')
  }
  const ret = JSON.parse(m1[1].replace(/&quot;/g, '"'))
  if (cli && cli.flags && cli.flags.details) {
    const pp = await prices(ret.ProductSearchResults.SearchResults.map(({ ProductId }) => ProductId), cli.flags.force)
    ret.ProductSearchResults.SearchResults = ret.ProductSearchResults.SearchResults.map((x, i) => ({ ...x, priceDetails: pp[i] }))
  }
  return ret
}

const getAllPages = async (cli) => {
  const o = await getPage(cli, 1)
  const nPages = o.ProductSearchResults.Pagination.TotalNumberOfPages
  let r
  const gp = []
  for (r = 1; r < nPages; ++r) {
    gp.push(getPage(cli, r + 1))
  }
  const z = await Promise.all(gp)
  z.push(o)
  const products = z.reduce((a, json) => [...a, ...json.ProductSearchResults.SearchResults], [])
  if (cli && cli.flags && cli.flags.inStock !== undefined) {
    const filter = cli.flags.inStock
      ? ({ IsOutOfStock }) => !IsOutOfStock
      : ({ IsOutOfStock }) => IsOutOfStock
    return products.filter(filter)
  }
  return products
}

const products = async (cli) => {
  const products = await getAllPages(cli)
  const productsFixed = products.map(({ Url, ...product }) => ({
    ...product,
    Url: `https://www.sqdc.ca${Url}`
  }))

  // istanbul ignore if
  if (!cli || !cli.flags || !cli.flags.quiet) {
    if (productsFixed.length) {
      console.error(`${productsFixed.length} products found.`)
    }
  }
  return productsFixed
}
products.description = 'List products'

const storesCached = caching(true, 'stores', LONG_TTL)

const stores = async (cli) => {
  const { Stores } = await storesCached(
    {
      u: '/api/storelocator/markers',
      o: {
        mapBounds: {
          southWest: { lat: 33.57484558618131, lng: -112.53508260000001 },
          northEast: { lat: 54.67163141409002, lng: -29.91789510000001 }
        },
        pageSize: 100
      }
    },
    cli.flags.force
  )

  // istanbul ignore if
  if (!cli || !cli.flags || !cli.flags.quiet) {
    if (Stores.length) {
      console.error(`${Stores.length} stores found.`)
    }
  }
  return Stores
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

const locations = () => supportedLocations.filter(({ support }) => support)
locations.description = 'List supported countries and provinces/states'

const isSupportedLocation = (l) => {
  l = l.toLowerCase()
  return locations()
    .find(
      ({ id, aliases }) => [id, ...aliases]
        .map(
          (s) => s.toLowerCase()
        )
        .indexOf(l) !== -1
    )
}

const commands = {
  categories,
  locations,
  products,
  specs,
  stores
}

const doit = async (cli) => {
  let command = cli && cli.input && (cli.input.length === 1) && cli.input[0].toLowerCase()
  if (!command) {
    return
  }

  if (cli && cli.flags) {
    if (cli.flags.language) {
      if (!knownCategories[cli.flags.language]) {
        cli.flags.language = 'en'
        // istanbul ignore if
        if (!cli.flags.quiet) {
          console.error(`Specified language is not supported, using ${cli.flags.language} instead.`)
        }
      }
      cli.flags.language = cli.flags.language.toLowerCase().slice(0, 2)
    }
    if (cli.flags.location) {
      const sup = isSupportedLocation(cli.flags.location)
      if (sup) {
        cli.flags.location = sup.id
      } else {
        cli.flags.location = 'sqdc'
        // istanbul ignore if
        if (!cli.flags.quiet) {
          console.error(`Specified location is not supported, using ${cli.flags.location} instead.`)
        }
      }
    }
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

  return commands[command](cli)
}

module.exports = doit
module.exports.commands = commands
module.exports.stocks = stocks
