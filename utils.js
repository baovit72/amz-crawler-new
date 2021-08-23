const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const ObjectsToCsv = require("objects-to-csv");

const getAbsPath = (path) => {
  return path.resolve(path);
};
const pathExists = (path) => {
  return fs.existsSync(path);
};
const readCsv = (path) => {
  return new Promise((resolve, reject) => {
    const results = [];
    try {
      fs.createReadStream(path)
        .pipe(csv())
        .on("data", (data) => results.push(data))
        .on("end", () => {
          resolve(results.filter((item) => Object.keys(item).length));
        });
    } catch (error) {
      reject(error);
    }
  });
};
const writeCsv = (path, data) => {
  const csv = new ObjectsToCsv(data);
  return csv.toDisk(path);
};

const getPuppeteerBrowser = (headless) => {
  const headlessConfig = headless || false;
  const puppeteer = require("puppeteer-extra");
  const StealthPlugin = require("puppeteer-extra-plugin-stealth");
  puppeteer.use(StealthPlugin());
  const AdblockerPlugin = require("puppeteer-extra-plugin-adblocker");
  puppeteer.use(AdblockerPlugin({ blockTrackers: true }));
  return puppeteer.launch({
    headless: headlessConfig,
    ignoreHTTPSErrors: true,
    slowMo: 0,
    args: [
      "--window-size=1400,900",
      "--remote-debugging-port=9222",
      "--remote-debugging-address=0.0.0.0", // You know what your doing?
      "--disable-gpu",
      "--disable-features=IsolateOrigins,site-per-process",
      "--blink-settings=imagesEnabled=true",
    ],
  });
};
const deepClone = (object) => {
  return JSON.parse(JSON.stringify(object));
};
const sleep = (ms) => {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms);
  });
};
const getDomParser = () => {
  var DomParser = require("dom-parser");
  return new DomParser();
};
const getJson = (url)=>{
  return new Promise((resolve, reject) => {
    axios.get(url).then((response=>resolve(response.data))).catch(reject)
  })
}
const download_image = (url, image_path) =>
  axios({
    url,
    responseType: 'stream',
  }).then(
    response =>
      new Promise((resolve, reject) => {
        response.data
          .pipe(fs.createWriteStream(image_path))
          .on('finish', () => resolve())
          .on('error', e => reject(e));
      }),
  );
module.exports = {
  readCsv,
  writeCsv,
  getPuppeteerBrowser,
  getDomParser,
  sleep,
  deepClone,
  getAbsPath,
  pathExists,
  getJson,
  download_image
};
