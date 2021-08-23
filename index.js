const axios = require("axios");
const utils = require("./utils");
const fs = require("fs");

function textToSlug(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "+");
}
function filterName(name, whitelist, blacklist) {
  function nameContaisWords(list) {
    const splittedList = list
      .split(",")
      .map((item) => item.trim().toLowerCase());
    return (
      splittedList.findIndex(
        (item) => item.length && name.toLowerCase().includes(item)
      ) >= 0
    );
  }
  const isWhitelisted = nameContaisWords(whitelist);
  const isBlacklisted = nameContaisWords(blacklist);
  console.log(name, isWhitelisted, isBlacklisted, whitelist, blacklist);
  return isWhitelisted || !isBlacklisted;
}
function getQuery(query, pageNum) {
  const QUERY_URL = `https://www.amazon.com/s?k=${query}&page=${pageNum}`;
  return QUERY_URL;
}

async function getCSRF() {
  const res = await utils.getResponse_GET("https://www.amazon.com/");
  const headers = res.headers;
  const data = res.data;
  const domParser = utils.getDomParser();
  console.log(
    domParser.parseFromString(data).getElementById("glowValidationToken")
  );
  const setCookies = headers["set-cookie"];
  return {
    cookieString: setCookies.map((cookie) => cookie.split(";")[0]).join(";"),
    token: domParser
      .parseFromString(data)
      .getElementById("glowValidationToken")
      .getAttribute("value"),
  };
}
async function run() {
  const cookieString = await getCSRF();
  console.log("DONE GET COOKIES WITH VALUES: ", cookieString);

  // const iData = await utils.readCsv("./input.csv");
  // for (let i = 0; i < iData.length; i++) {
  //   const item = iData[i];
  //   try {
  //     // const list = await getListOfProducts(
  //     //   item.keyword,
  //     //   item.whitelist,
  //     //   item.blacklist
  //     // );
  //     // await utils.writeCsv("./output/" + item.keyword + ".csv", list);
  //   } catch (error) {
  //     console.log(error);
  //   }
  // }
}

run();
