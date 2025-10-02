const ftp = require("basic-ftp");
const puppeteer = require('puppeteer');
const fs = require("fs");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: {
      width: 1280,
      height: 720
    }
  });
  const page = await browser.newPage();

  await page.goto('https://www.onparticipe.fr/c/theoTourDeFrance');
  await page.waitForTimeout(3000);

  const screenshotPath = 'capture-zone.png';

  await page.screenshot({
    path: screenshotPath,
    clip: {
      x: 505,
      y: 170,
      width: 655,
      height: 360
    }
  });

  await browser.close();

  // Vérifie que la capture a bien été écrite sur le disque
  if (fs.existsSync(screenshotPath)) {
    await upload(screenshotPath);
  } else {
    console.error("Capture non trouvée, l'envoi FTP est annulé.");
  }

})();

async function upload(filePath) {
  const client = new ftp.Client();
  try {
    await client.access({
      host: "ftp.cluster021.hosting.ovh.net",
      user: "chauviu",
      password: "Hubert0585",
    });
    console.log("Connexion FTP réussie");
    await client.cd("theo");

    const list = await client.list();
    console.log("Contenu du dossier FTP :", list);

    await client.remove("cagnotte.png"); // Peut être ignoré si le fichier n'existe pas encore

    await client.uploadFrom(filePath, "cagnotte.png");
    console.log("Image envoyée !");
  } catch (err) {
    console.error("Erreur FTP :", err);
  }
  client.close();
}
