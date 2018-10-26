// npm
import test from 'ava'

// self
import gw, { commands, stocks } from '.'

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

test('three commands', (t) => {
  t.deepEqual(Object.keys(commands).sort(), ['locations', 'products', 'stores'])
})

test('get stores', async (t) => {
  const { length } = await gw({ input: ['stores'], flags: { quiet: true } })
  t.is(length, 12)
})

test('get locations', async (t) => {
  const x = await gw({ input: ['locations'] })
  t.is(x.length, 1)
  t.is(x[0].id, 'sqdc')
})

test('get products fr in stock (deprecated)', async (t) => {
  const { length } = await gw({ input: ['fr'], flags: { quiet: true } })
  t.truthy(length > 5)
  t.truthy(length <= knownSkus.length)
})

test('get products', async (t) => {
  const x = await gw({ input: ['products'], flags: { quiet: true } })
  t.is(x.length, 68)
  const skus = x.map(({ Sku }) => Sku).sort()
  t.deepEqual(skus, knownSkus)
})

test('get products in stock', async (t) => {
  const { length } = await gw({ input: ['products'], flags: { quiet: true, inStock: true } })
  t.truthy(length > 5)
  t.truthy(length <= knownSkus.length)
})

test('get products not in stock', async (t) => {
  const { length } = await gw({ input: ['products'], flags: { quiet: true, inStock: false } })
  t.truthy(length > 5)
  t.truthy(length <= knownSkus.length)
})

test('get skus', async (t) => {
  const { length } = await stocks(knownSkus)
  t.truthy(length > 5)
  t.truthy(length <= knownSkus.length)
})

test('nothing (help)', async (t) => {
  const x = await gw()
  t.falsy(x)
})

test('cli (fail)', (t) => t.throwsAsync(gw({ input: ['jo'] }), 'Command must be one of "locations", "products" or "stores".'))
