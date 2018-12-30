const puppeteer = require('puppeteer')
const Promise = require('bluebird')
const fs = require('fs')
const writeFile = Promise.promisify(fs.writeFile)
const appendFile = Promise.promisify(fs.appendFile)

// Les paramètres du script
const filePath = 'output.csv'
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
  'cp',
  'ville',
  'departement',
  'pays'
]


async function main () {

  await writeFile(filePath, fields.join(';') + '\r\n', 'utf8')

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
  

  let lastPageDone = false
  while(!lastPageDone) {

    await new Promise(resolve => setTimeout(resolve, pause))
    const length = await page.evaluate(() => document.querySelectorAll('table tr').length) - 1
    console.log(`Found ${length} items in this page`)

    await Promise.resolve(Array.apply(null, Array(length)))
      .mapSeries(async (x, index) => {
        await Promise.all([ page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click(`table tr:nth-child(${ index + 1 }) td a`) ])
        const data = await page.evaluate(items => items.map(id => document.querySelector(`#${id}`).innerHTML), fields)
        console.log(`Inserted row for driver ${data[3]}`)
        await appendFile(filePath, data.join(';') + '\r\n', 'utf8')
        await Promise.all([ page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('.panel-body button') ])
      })

    const isLastPage = await page.evaluate(() => document.querySelector('.paginate_button.next').classList.contains('disabled'))
    if (!isLastPage) {
      await page.click('.paginate_button.next')
      await new Promise(resolve => setTimeout(resolve, pause))
    } else {
      lastPageDone = true
    }
  }

  await browser.close()
}

async function writeCSV (input) {

}

main()