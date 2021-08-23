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

const get = (url, headers) => {
  return new Promise((resolve, reject) => {
    axios
      .get(url, {
        headers: {
          "User-Agent": "PostmanRuntime/7.28.2",
          ...headers,
        },
      })
      .then((response) => resolve(response.data))
      .catch(reject);
  });
};
const post = (url, headers, data) => {
  console.log("axios data ", headers);

  return new Promise((resolve, reject) => {
    axios
      .post(url, data, {
        headers: {
          "User-Agent": "PostmanRuntime/7.28.2",
          Accept: "*/*",
          "Content-Type": "application/x-www-form-urlencoded",
          ...headers,
        },
      })
      .then((response) => console.log(response))
      .catch(reject);
  });
};
const getHeaders_GET = (url) => {
  return new Promise((resolve, reject) => {
    axios
      .get(url, { headers: { "User-Agent": "PostmanRuntime/7.28.2" } })
      .then((response) => resolve(response.headers))
      .catch(reject);
  });
};
const getResponse_GET = (url) => {
  return new Promise((resolve, reject) => {
    axios
      .get(url, { headers: { "User-Agent": "PostmanRuntime/7.28.2" } })
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
};
