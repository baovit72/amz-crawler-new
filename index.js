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
function getQuery(url, pageNum) {
  const QUERY_URL = url + `&page=${pageNum}`;
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
  const responseJson = await utils.post(
    "https://www.amazon.com/gp/delivery/ajax/address-change.html",
    { ...headers },
    data
  );
  return responseJson.isValidAddress;
}

async function getProducts(
  topic,
  url,
  whitelist,
  blacklist,
  image_prefix,
  limit_page_number,
  headers
) {
  function parseProductsFromHtml(html) {
    const dom = utils.getDom(html);
    const products = dom.window.document.querySelectorAll(
      `*[cel_widget_id*='MAIN-SEARCH_RESULTS']`
    );
    const rs = [];
    products.forEach((product) =>
      rs.push({
        title: product.querySelector("span.a-text-normal").textContent,
        image: product.querySelector(".s-image").getAttribute("src"),
        url:
          "https://www.amazon.com" +
          product
            .querySelector(
              "*[data-component-type='s-product-image'] a.a-link-normal"
            )
            .getAttribute("href"),
      })
    );
    return rs;
  }

  let firstPageHtml = await utils.get(url, headers);
  let products = parseProductsFromHtml(firstPageHtml);
  const dom = utils.getDom(firstPageHtml);
  const paginationLis =
    dom.window.document.querySelectorAll(".a-pagination li");
  const pageNum = Math.min(
    +paginationLis[paginationLis.length - 2].textContent,
    limit_page_number
  );

  for (let i = 2; i <= pageNum; i++) {
    try {
      await utils.sleep(50);
      response = await utils.get(getQuery(url, i), headers);
      products.push(...parseProductsFromHtml(response));
      console.log("Fetching products at page " + i + "/" + pageNum);
    } catch (e) {
      console.log(e);
      console.log("Fetching products failed at page " + i);
    }
  }
  products = products
    .filter((product) => filterName(product.title, whitelist, blacklist))
    .filter((v, i, a) => a.findIndex((t) => t.image === v.image) === i);
  for (let j = 0; j < products.length; j++) {
    const { image } = products[j];
    const outputDir = `./${topic}/${image_prefix}`;

    fs.mkdirSync(outputDir, { recursive: true });
    try {
      const imageUrlParts = image.split("/");
      const fileName = image_prefix + imageUrlParts[imageUrlParts.length - 1];
      console.log("Downloading image at " + (j + 1) + "/" + products.length);
      if (fs.existsSync(`${outputDir}/${fileName}`)) {
        console.log("File existed !");
        continue;
      }
      await utils.download_image(image, `${outputDir}/${fileName}`);
    } catch (e) {
      console.log("Failed to download image with url " + image);
      console.log(e);
    }
  }
  return products;
}
async function run() {
  const iData = await utils.readCsv("./input.csv");
  // console.log(iData);
  for (let i = 0; i < iData.length; i++) {
    const item = iData[i];
    try {
      console.log("BEGIN WITH URL: ", item.url);
      const { cookieString, token } = await getCSRF();
      console.log("DONE GET COOKIES WITH VALUES: ", cookieString);
      const zipCsrfCode = (
        await getZipChangeCSRF(getCSRFHeaders(cookieString, token))
      ).token;
      console.log("DONE GET ZIPCODE CHANGE HEADERS WITH VALUES: ", zipCsrfCode);

      const params = new URLSearchParams();

      params.append("locationType", "LOCATION_INPUT");
      params.append("zipCode", item.zipcode);
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
      if (!isValidAddress && item.zcopt.toLowerCase() === "no") {
        console.log("ZIPCODE INVALID SKIPPING...", item.zipcode);
        continue;
      }
      const list = await getProducts(
        item.topic,
        item.url,
        item.whitelist,
        item.blacklist,
        item.image_prefix,
        item.page_number,
        {
          Cookie: cookieString,
        }
      );
      await utils.writeCsv("output.csv", list);
    } catch (error) {
      console.log(error);
    }
  }
}

run();
