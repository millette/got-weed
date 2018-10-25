// use strict

// npm
const got = require('got')
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const re = / data-context="(\{.+\})"/

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
  const m1 = body.match(re)
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

const show = (lang, booya) => {
  const it = booya.map(({
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

const available = (booya) => booya.reduce((a, { stocks, json }) => {
  const them = json.ProductSearchResults.SearchResults.filter((x) => stocks.indexOf(x.Sku) !== -1)
  return [...a, ...them]
}, [])

const getStores = async (lang) => {
  const { headers, body } = lang === 'en' ? await got(`https://www.sqdc.ca/en-CA/Stores/Directory`)
                                          : await got(`https://www.sqdc.ca/fr-CA/Magasins/Annuaire`)
  const dom = new JSDOM(body);
  const stores = Array.from(dom.window.document.querySelectorAll(".p-10")).map((s, i)=>{
    const StoreName = s.querySelector('h6').textContent
    const RawAddress = s.querySelector('address').textContent;
    const Tel = RawAddress.replace(/^.*\D\d\D\s\d\D\d/, '');
    const Address = RawAddress.replace(Tel, '');
    return {
      StoreName: StoreName,
      Address: Address,
      Tel: Tel,
    }
  })
  return await stores
}

const doit = async (cli) => {
  const input = cli && cli.input && cli.input[0].toLowerCase()
  let j
  if (
    (input !== 'fr') &&
    (input !== 'en') &&
    (input !== 'stores')
  ) {
    throw new Error('Argument required: "en" or "fr"')
  }
  if (input === 'fr' || input === 'en') {
    const lang = input;
    j = await getAllPages(lang)
    show(lang, available(j))
  } else if (input === 'stores') {
    const lang = cli.input[1] || 'fr'
    j = await getStores(lang)
    console.log(j)
  }
  return j
}

module.exports = doit
