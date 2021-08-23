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
const domParser = utils.getDomParser();
async function getCSRF() {
  const res = await utils.getResponse_GET("https://www.amazon.com/");
  const headers = res.headers;
  const data = res.data;
  const setCookies = headers["set-cookie"];
  return {
    cookieString: setCookies.map((cookie) => cookie.split(";")[0]).join(";"),
    token: domParser
      .parseFromString(data)
      .getElementById("glowValidationToken")
      .getAttribute("value"),
  };
}
function getCSRFHeaders(cookieString, token) {
  return {
    Cookie: cookieString,
    "anti-csrftoken-a2z": token,
  };
}
async function getZipChangeCSRF(headers) {
  const rex = new RegExp(/CSRF_TOKEN : "(.+?)"/);
  const html = await utils.get(
    "https://www.amazon.com/gp/glow/get-address-selections.html?deviceType=desktop&pageType=Gateway&storeContext=NoStoreName&actionSource=desktop-modal",
    {
      ...headers,
    }
  );
  return {
    token: rex.exec(html)[1],
  };
}
async function changeZip(headers, data) {
  console.log(headers, data);
  const responseJson = await utils.post(
    "https://www.amazon.com/gp/delivery/ajax/address-change.html",
    { ...headers },
    data
  );
  console.log(responseJson);
  return responseJson.isValidAddress;
}
async function run() {
  const { cookieString, token } = await getCSRF();
  console.log("DONE GET COOKIES WITH VALUES: ", cookieString);
  const zipCsrfCode = (
    await getZipChangeCSRF(getCSRFHeaders(cookieString, token))
  ).token;
  console.log("DONE GET ZIPCODE CHANGE HEADERS WITH VALUES: ", zipCsrfCode);

  const params = new URLSearchParams();

  params.append("locationType", "LOCATION_INPUT");
  params.append("zipCode", "35801");
  params.append("storeContext", "generic");
  params.append("deviceType", "web");
  params.append("pageType", "Search");
  params.append("actionSource", "glow");
  params.append("almBrandId", "undefined");
  params.append("awesome", true);

  const isValidAddress = await changeZip(
    {
      "Content-Type": "application/x-www-form-urlencoded",
      ...getCSRFHeaders(cookieString, zipCsrfCode),
    },
    params
  );
  console.log("DONE CHANGE ZIP WITH RESULT: ", isValidAddress);
  cónt i
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
