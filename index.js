'use strict'

// npm
// const got = require('got')

// self
// const { name, version } = require('./package.json')
const caching = require('./lib/cache')

const LONG_TTL = 60 * 60 * 24
const SHORT_TTL = 60 * 5

/*
const gwClient = got.extend({
  baseUrl: 'https://www.sqdc.ca',
  headers: {
    'Accept-Language': 'fr-CA',
    'user-agent': `${name} v${version}`
  }
})

const gwClientJson = gwClient.extend({
  json: true,
  headers: { 'X-Requested-With': 'XMLHttpRequest' }
})
*/

const contextRe = / data-context="(\{.+\})"/

/*
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
*/

const knownCategories = {
  fr: ['fleurs-sechees', 'pilules', 'moulu', 'preroules', 'huiles', 'atomiseurs-oraux'],
  en: ['dried-flowers', 'pills', 'ground', 'pre-rolled', 'oils', 'oral-sprays']
}

/*
const specsImp = async (body) => {
  // RYM
  const { body: { Groups: [{ Attributes }] } } = await gwClientJson('/api/product/specifications', {
    body
  })

  const ret = {}
  Attributes.forEach(({ PropertyName, Title, Value }) => {
    ret[PropertyName] = { Title, Value }
  })
  return ret
}
*/

// const cSpecs = caching(specsImp, 'specs-v1', LONG_TTL)

// const specs = (cli) => cSpecs({
/*
const specs = (cli) => specsImp({
  productId: `${cli.flags.sku}-P`,
  variantId: cli.flags.sku
})
*/

const specsCached = caching(true, 'specs', SHORT_TTL)

// RYM want cache
const specs = async (cli) => {
  const { Groups: [{ Attributes }] } = await specsCached(
    {
      u: '/api/product/specifications',
      o: {
        productId: `${cli.flags.sku}-P`,
        variantId: cli.flags.sku
      }
    }
  )

  /*
  const { body: { Groups: [{ Attributes }] } } = await gwClientJson('/api/product/specifications', {
    body: {
      productId: `${cli.flags.sku}-P`,
      variantId: cli.flags.sku
    }
  })
  */

  const ret = {}
  Attributes.forEach(({ PropertyName, Title, Value }) => {
    ret[PropertyName] = { Title, Value }
  })
  return ret
}

/*
specsImp({
  productId: `${cli.flags.sku}-P`,
  variantId: cli.flags.sku
})
*/
specs.description = 'Details about a product, use the --sku option to specify.'

const categories = (cli) => knownCategories[(cli && cli.flags && cli.flags.language) || 'en']
categories.description = 'List supported categories'

const stocksCached = caching(true, 'stocks', SHORT_TTL)

// RYM want cache
const stocks = (skus) => stocksCached({ u: '/api/inventory/findInventoryItems', o: { skus } })
/*
const stocks = (skus) => gwClientJson('/api/inventory/findInventoryItems', {
  body: { skus }
  // body: { skus: (skus && skus.length) ? skus : knownSkus }
}).then(({ body }) => body)
*/

// const stocks = caching(stocksImp, 'stocks-v1', SHORT_TTL)

/*
const pricesImp2 = async (u, body, transform) => {
  // const { body } = await gwClientJson(u, { body })
  // return transform(body)
  const res = await gwClientJson(u, { body })
  return transform(res.body)
}

const pricesImp = caching(pricesImp2, 'pricesImp2', 30)

const prices = async (products) => pricesImp(
  '/api/product/calculatePrices',
  { products },
  (body) => body.ProductPrices
)
*/

/*
const gwClientJsonToCache = async (u, before, after) => {
  const { body } = await gwClientJson('/api/product/calculatePrices', {
    body: { products }
  })
}

const oy = gwClientJsonToCache(
  '/api/product/calculatePrices',
  (products) => ({ body: { products } }),
  (res) => res.body.ProductPrices
)

const prices = async (products) => {
*/

const pricesCached = caching(true, 'prices', LONG_TTL)

// RYM want cache

const prices = async (products) => {
  const { ProductPrices } = await pricesCached({ u: '/api/product/calculatePrices', o: { products } })
  return ProductPrices
}

/*
const prices = async (products) => {
  const { body } = await gwClientJson('/api/product/calculatePrices', {
    body: { products }
  })
  const { ProductPrices } = body
  return ProductPrices
}
*/

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

const gwClient = caching(false, 'page', SHORT_TTL)

// RYM want cache
const getCategoryPage = async (cli, p) => {
  const lang = (cli && cli.flags && cli.flags.language) || 'en'
  const cats = categories(cli)
  const category = cats.indexOf(cli && cli.flags && cli.flags.category) !== -1 && cli.flags.category.toLowerCase()
  const u = category
    ? `/${lang}-CA/${category}?page=${p}`
    : `/${lang}-CA/${searchString[lang]}?keywords=*&sortDirection=asc&page=${p}`
  // return gwClient(u).then(({ body }) => body)
  return gwClient({ u })
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
    const pp = await prices(ret.ProductSearchResults.SearchResults.map(({ ProductId }) => ProductId))
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
    }
  )

  // istanbul ignore if
  if (!cli || !cli.flags || !cli.flags.quiet) {
    if (Stores.length) {
      console.error(`${Stores.length} stores found.`)
    }
  }
  return Stores
}

// RYM want cache
/*
const stores = async (cli) => {
  const { body: { Stores } } = await gwClientJson('/api/storelocator/markers', {
    body: {
      mapBounds: {
        southWest: { lat: 33.57484558618131, lng: -112.53508260000001 },
        northEast: { lat: 54.67163141409002, lng: -29.91789510000001 }
      },
      pageSize: 100
    }
  })
  // istanbul ignore if
  if (!cli || !cli.flags || !cli.flags.quiet) {
    if (Stores.length) {
      console.error(`${Stores.length} stores found.`)
    }
  }
  return Stores
}
*/
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
// module.exports.knownSkus = knownSkus
