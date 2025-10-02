const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const ftp = require('basic-ftp');

// === Identifiants FTP (idéalement à mettre dans un fichier .env) ===
const FTP_CONFIG = {
  host: "ftp.cluster021.hosting.ovh.net",
  user: "chauviu",
  password: "Hubert0585"
};

// === Lancement principal ===
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: {
      width: 1280,
      height: 720
    }
  });
  const page = await browser.newPage();

  try {
    console.log("Chargement de la page de la cagnotte...");
    await page.goto('https://www.onparticipe.fr/c/theoTourDeFrance', {
      waitUntil: 'networkidle2',
      timeout: 0
    });

    const montant = await waitForFinalMontant(page, '#kitty-block-amount-value');
    if (!montant) throw new Error("Montant introuvable.");

    const valeurComplete = `${montant.replace(/\s/g, '')} / 3969€`;
    console.log("💰 Montant à injecter :", valeurComplete);

    const htmlPath = 'C:/doc_iut/tourdefrance/index.html';
    const screenshotPath = 'capture-zone.png';

    await updateHTML(valeurComplete, htmlPath);

    // Attente pour s'assurer que la page est bien rendue avant capture
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: screenshotPath,
      clip: {
        x: 505,
        y: 170,
        width: 655,
        height: 360
      }
    });

    console.log("📸 Capture enregistrée :", screenshotPath);

    await uploadFiles(htmlPath, screenshotPath);

  } catch (err) {
    console.error("❌ Erreur :", err.message);
  } finally {
    await browser.close();
  }
})();

// === Fonction pour attendre que le montant ne change plus ===
async function waitForFinalMontant(page, selector, timeout = 15000, interval = 500) {
  let lastText = "";
  let stableCount = 0;
  const maxStableCount = 3;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const currentText = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el ? el.innerText.trim() : null;
    }, selector);

    if (!currentText) continue;

    if (currentText === lastText) {
      stableCount++;
      if (stableCount >= maxStableCount) return currentText;
    } else {
      stableCount = 0;
      lastText = currentText;
    }

    await page.waitForTimeout(interval);
  }

  throw new Error("Montant non stable dans le délai imparti.");
}

// === Mise à jour de l’HTML avec le montant ===
async function updateHTML(newValue, filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const updated = content.replace(/<span>\d+€ \/ \d+€<\/span>/, `<span>${newValue}</span>`);
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log("✅ HTML mis à jour !");
}

// === Envoi FTP des fichiers ===
async function uploadFiles(htmlPath, imagePath) {
  const client = new ftp.Client();
  try {
    await client.access(FTP_CONFIG);

    console.log("🔌 Connexion FTP réussie");
    await client.cd("theo");

    try {
      await client.remove("cagnotte.png");
    } catch {}

    await client.uploadFrom(imagePath, "cagnotte.png");
    console.log("🖼️ Image envoyée : cagnotte.png");

    await client.uploadFrom(htmlPath, "index.html");
    console.log("📤 Fichier index.html envoyé !");
  } catch (err) {
    console.error("❌ Erreur FTP :", err.message);
  } finally {
    client.close();
  }
}
