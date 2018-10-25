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

const stockString = {
  fr: 'items en stock',
  en: 'items in stock'
}

const getPage = async (lang, p = 1) => {
  const { headers, body } = await got(`https://www.sqdc.ca/${lang}-CA/${searchString[lang]}?keywords=*&sortDirection=asc&page=${p}`)
  const m1 = body.match(contextRe)
  if (!m1 || !m1[1]) {
    throw new Error('Nothing here')
  }
  const json = JSON.parse(m1[1].replace(/&quot;/g, '"'))
  const stocks = await stock(json.ProductSearchResults.SearchResults.map(({ Sku }) => Sku))
  return {
    stocks,
    page: p,
    headers,
    nPages: json.ProductSearchResults.Pagination.TotalNumberOfPages,
    json
  }
}

const getAllPages = async (lang) => {
  const o = await getPage(lang)
  const { nPages } = o
  let r
  const gp = []
  for (r = 1; r < nPages; ++r) {
    gp.push(getPage(lang, r + 1))
  }
  const z = await Promise.all(gp)
  z.push(o)
  return z
}

const show = (lang, products) => {
  const it = products.map(({
    ProductId,
    Sku,
    FullDisplayName,
    Brand,
    Description,
    Url,
    Pricing: { DisplayPrice },
    CategoryId,
    AromaDetailed
  }) => ({
    ProductId,
    Sku,
    FullDisplayName,
    Brand,
    Description,
    Url: `https://www.sqdc.ca${Url}`,
    DisplayPrice,
    CategoryId,
    AromaDetailed: AromaDetailed && AromaDetailed.join(', ')
  }))
  console.log(JSON.stringify(it, null, '  '))
  console.log(`${it.length} ${stockString[lang]}`)
}

const available = (pages) => pages.reduce((a, { stocks, json }) => {
  const them = json.ProductSearchResults.SearchResults.filter((x) => stocks.indexOf(x.Sku) !== -1)
  return [...a, ...them]
}, [])

const parseStore = (s) => {
  const rawAddress = s.querySelector('address').textContent
  const tel = rawAddress.replace(telRe, '')
  return {
    storeName: s.querySelector('h6').textContent,
    address: rawAddress.replace(tel, ''),
    tel
  }
}

const getStores = async () => {
  const { body } = await got('https://www.sqdc.ca/en-CA/Stores/Directory')
  return Array.from(new JSDOM(body).window.document.querySelectorAll('.p-10'))
    .map(parseStore)
}

const doit = async (cli) => {
  if (cli.input.length !== 1) {
    cli.showHelp()
  }

  const input = cli && cli.input && cli.input[0] && cli.input[0].toLowerCase()
  let j
  if (
    (input !== 'fr') &&
    (input !== 'en') &&
    (input !== 'stores')
  ) {
    throw new Error('Argument required: "stores", "en" or "fr"')
  }
  if (input === 'fr' || input === 'en') {
    j = await getAllPages(input)
    show(input, available(j))
  } else if (input === 'stores') {
    j = await getStores()
    console.log(JSON.stringify(j, null, '  '))
  }
  return j
}

module.exports = doit
