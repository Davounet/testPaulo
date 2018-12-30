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
  const browser = await puppeteer.launch({ args: ['--window-size=1920,1040'] })
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
    const idList = await page.evaluate(() => {
      const ids = [].slice.call(document.querySelectorAll('a.btn-xs'))
        .map(a => a.href)
        .map(u => u.split('/')[5])
      return ids
    })
    
    await Promise.resolve(idList)
      .map(async identifier => {

        const local = await browser.newPage()
        local.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36')
        local.setViewport({ width: 1920, height: 1040 })
        local.setDefaultNavigationTimeout(10000)

        await local.goto(`https://registre-vtc.developpement-durable.gouv.fr/public/exploitant/${identifier}/detailler`)
        const data = await local.evaluate(items => items.map(id => document.querySelector(`#${id}`).innerHTML), fields)
        console.log(`Inserted row for driver ${data[3]}`)
        await appendFile(filePath, data.join(';') + '\r\n', 'utf8')
        await local.close()

      }, { concurrency: 5 })

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


main()