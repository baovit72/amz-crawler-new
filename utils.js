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
const getDom = (html) => {
  const jsdom = require("jsdom");
  const { JSDOM } = jsdom;
  return new JSDOM(html);
};

const get = (url, headers) => {
  return new Promise((resolve, reject) => {
    axios
      .get(url, {
        headers: {
          Referer: "https://www.amazon.com/",
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
          ...headers,
        },
      })
      .then((response) => resolve(response.data))
      .catch(reject);
  });
};
const post = (url, headers, data) => {
  return new Promise((resolve, reject) => {
    axios
      .post(url, data, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
          Accept: "*/*",
          "Content-Type": "application/x-www-form-urlencoded",
          ...headers,
        },
      })
      .then((response) => resolve(response.data))
      .catch(reject);
  });
};
const getHeaders_GET = (url) => {
  return new Promise((resolve, reject) => {
    axios
      .get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
        },
      })
      .then((response) => resolve(response.headers))
      .catch(reject);
  });
};
const getResponse_GET = (url) => {
  return new Promise((resolve, reject) => {
    axios
      .get(url, {
        headers: {
          Cookie: "",
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Mobile Safari/537.36",
        },
      })
      .then((response) => resolve(response))
      .catch(reject);
  });
};
const download_image = (url, image_path) =>
  axios({
    url,
    responseType: "stream",
  }).then(
    (response) =>
      new Promise((resolve, reject) => {
        response.data
          .pipe(fs.createWriteStream(image_path))
          .on("finish", () => resolve())
          .on("error", (e) => reject(e));
      })
  );
module.exports = {
  readCsv,
  writeCsv,
  getDomParser,
  sleep,
  deepClone,
  getAbsPath,
  pathExists,
  download_image,
  get,
  post,
  getHeaders_GET,
  getResponse_GET,
  getDom,
};
