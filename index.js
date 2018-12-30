const puppeteer = require('puppeteer')
const Promise = require('bluebird')

// Les paramètres du script
const region = 6
const pause = 2000
const fields = [
  'nomDenomination',
  'nomCommercial',
  'siren',
  'numInscription',
  'dateFinValidite',
  'typePersonne',
  'formeJuridique',
  'libCompletFormeJuridique',
  'nomFamille',
  'prenom',
  'codePostal',
  'ville',
  'departement',
  'pays'
]


async function main () {

  // Instanciation du navigateur avec puppeteer
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 300,
    args: ['--window-size=1920,1040']
  })
  const page = await browser.newPage()
  page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36')
  page.setViewport({ width: 1920, height: 1040 })
  page.setDefaultNavigationTimeout(10000)

  // Chargement de la page correspondant à la région
  await page.goto(`https://registre-vtc.developpement-durable.gouv.fr/public/recherche-geographique/${region}/lister`)
  await page.select('select[name="tableListeResultat_length"]', '100')
  await new Promise(resolve => setTimeout(resolve, pause))
  const length = await page.evaluate(() => document.querySelectorAll('table tr').length)

  // Parcours des liens un par un
  await Promise.resolve(Array.apply(null, Array(length - 1)))
    .mapSeries(async (x, index) => {
      await Promise.all([ page.waitForNavigation(), page.click(`table tr:nth-child(${ index + 1 }) td a`) ])
      const data = await page.evaluate(items => {
        return items.reduce((result, id) => {
          result[id] = document.querySelector(`#${id}`).innerHTML
          return result
        }, {})
      }, fields)
      console.log(data)
      await page.click('.panel-body button')
      await new Promise(resolve => setTimeout(resolve, pause))
    })

  await browser.close()
}

main()