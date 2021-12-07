const axios = require('axios');
const utils = require('./utils');
const fs = require('fs');

function textToSlug(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '+');
}
function filterName(name, whitelist, blacklist) {
  function nameContaisWords(list, isWhitelist) {
    const splittedList = list
      .split(',')
      .map((item) => item.trim().toLowerCase());
    if (!splittedList.length) return isWhitelist;
    return (
      splittedList.findIndex(
        (item) => item.length && name.toLowerCase().includes(item)
      ) >= 0
    );
  }
  const isWhitelisted = nameContaisWords(whitelist, true);
  const isBlacklisted = nameContaisWords(blacklist, false);

  if (isBlacklisted) return false;
  if (isWhitelisted) return true;
  return false;
}
function getQuery(url, pageNum) {
  const QUERY_URL = url + `&page=${pageNum}`;
  return QUERY_URL;
}
const domParser = utils.getDomParser();
async function getCSRF() {
  const res = await utils.getResponse_GET('https://www.amazon.com/');
  let headers = res.headers;
  let data = res.data;
  let setCookies = headers['set-cookie'];
  const Cookie_0 = setCookies.map((cookie) => cookie.split(';')[0]).join(';');

  console.log(
    'posting ',
    `https://www.amazon.com${
      /(\/ah\/ajax\/counter\?.+?)\"/gm.exec(
        res.data.replace(/\r|\n|\r\n/gm, '')
      )[1]
    }`
  );
  const res_2 = await utils.post(
    `https://www.amazon.com${
      /(\/ah\/ajax\/counter\?.+?)\"/gm.exec(
        res.data.replace(/\r|\n|\r\n/gm, '')
      )[1]
    }`,
    { cookie: Cookie_0 },
    {},
    true
  );
  console.log(res_2.status);
  const Cookie_2 = res_2.headers['set-cookie']
    .map((cookie) => cookie.split(';')[0])
    .join(';');
  const res_1 = await utils.get(
    `https://www.amazon.com/portal-migration/hz/glow/get-rendered-toaster?pageType=Gateway&aisTransitionState=in&rancorLocationSource=IP_GEOLOCATION&_=${new Date().getTime()}`,
    { cookie: Cookie_0 + Cookie_2 },
    true
  );

  const Cookie_1 = res_1.headers['set-cookie']
    .map((cookie) => cookie.split(';')[0])
    .join(';');

  return {
    cookieString:
      Cookie_0 +
      ';' +
      Cookie_2 +
      ';' +
      Cookie_1.replace('ubid-main', 'test-main'),
    token: domParser
      .parseFromString(data)
      .getElementById('glowValidationToken')
      .getAttribute('value'),
  };
}
function getCSRFHeaders(cookieString, token) {
  return {
    Cookie: cookieString,
    'anti-csrftoken-a2z': token,
  };
}
async function getZipChangeCSRF(headers) {
  const rex = new RegExp(/CSRF_TOKEN : "(.+?)"/);
  const html = await utils.get_ChangePopup(headers);
  console.log(html);
  // console.log(rex.exec(html));
  console.log(headers);
  return {
    token: rex.exec(html)[1],
  };
}

async function changeZip(headers, data) {
  const responseJson = await utils.post(
    'https://www.amazon.com/gp/delivery/ajax/address-change.html',
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
    products.forEach((product) => {
      try {
        rs.push({
          title: product.querySelector('span.a-text-normal').textContent,
          image: product.querySelector('.s-image').getAttribute('src'),
          url:
            'https://www.amazon.com' +
            product
              .querySelector(
                "*[data-component-type='s-product-image'] a.a-link-normal"
              )
              .getAttribute('href'),
        });
      } catch {}
    });
    return rs;
  }
  console.log(url);
  let firstPageHtml = await utils.get(url, headers);

  await utils.writeCsv(`./debug.csv`, [{ firstPageHtml }]);
  let products = parseProductsFromHtml(firstPageHtml);
  const dom = utils.getDom(firstPageHtml);
  const paginationLis =
    dom.window.document.querySelectorAll('.a-pagination li');
  if (paginationLis.length === 0) {
    console.log('NO RESULT');
    return [];
  }
  const pageNum = Math.min(
    +paginationLis[paginationLis.length - 2].textContent,
    limit_page_number
  );
  console.log('pageNum', pageNum);
  let offset = 1;
  const rexRs = /page=(\d+)/.exec(url);
  if (rexRs && rexRs[1]) {
    offset = +rexRs[1];
  }
  console.log('Fetching products at page ' + offset + '/' + pageNum);
  for (let i = 1; i < pageNum; i++) {
    try {
      await utils.sleep(50);
      response = await utils.get(
        getQuery(url.replace(/(&|\?)page=\d+/gm, ''), offset + i),
        headers
      );
      products.push(...parseProductsFromHtml(response));
      console.log('Fetching products at page ' + (i + offset) + '/' + pageNum);
    } catch (e) {
      console.log(e);
      console.log('Fetching products failed at page ' + (i + offset));
    }
  }
  products = products
    .filter((product) => filterName(product.title, whitelist, blacklist))
    .filter((v, i, a) => a.findIndex((t) => t.image === v.image) === i);
  for (let j = 0; j < products.length; j++) {
    const { image } = products[j];
    const outputDir = `./output/${topic}/${image_prefix}`;

    fs.mkdirSync(outputDir, { recursive: true });
    try {
      const imageUrlParts = image.split('/');
      const fileName = image_prefix + imageUrlParts[imageUrlParts.length - 1];
      console.log('Downloading image at ' + (j + 1) + '/' + products.length);
      if (fs.existsSync(`${outputDir}/${fileName}`)) {
        console.log('File existed !');
        continue;
      }
      await utils.download_image(image, `${outputDir}/${fileName}`);
    } catch (e) {
      console.log('Failed to download image with url ' + image);
      console.log(e);
    }
  }
  return products;
}
async function run() {
  const iData = await utils.readCsv('./input.csv');
  // console.log(iData);

  for (let i = 0; i < iData.length; i++) {
    const item = iData[i];
    try {
      console.log(
        '----------------------------------------*------------------*--------------------------------'
      );
      // console.log("BEGIN WITH URL: ", item.url);
      // const { cookieString, token } = await getCSRF();
      // console.log("DONE GET COOKIES WITH VALUES: ", cookieString);
      // const zipCsrfCode = (
      //   await getZipChangeCSRF(getCSRFHeaders(cookieString, token))
      // ).token;

      // console.log("DONE GET ZIPCODE CHANGE HEADERS WITH VALUES: ", zipCsrfCode);

      // const params = new URLSearchParams();

      // params.append("locationType", "LOCATION_INPUT");
      // params.append("zipCode", item.zipcode);
      // params.append("storeContext", "generic");
      // params.append("deviceType", "web");
      // params.append("pageType", "Search");
      // params.append("actionSource", "glow");
      // params.append("almBrandId", "undefined");
      // params.append("awesome", true);

      // const isValidAddress = await changeZip(
      //   {
      //     "Content-Type": "application/x-www-form-urlencoded",
      //     ...getCSRFHeaders(cookieString, zipCsrfCode),
      //   },
      //   params
      // );
      // console.log("DONE CHANGE ZIP WITH RESULT: ", isValidAddress);
      // if (!isValidAddress && item.zcopt.toLowerCase() === "no") {
      //   console.log("ZIPCODE INVALID SKIPPING...", item.zipcode);
      //   continue;
      // }
      const list = await getProducts(
        item.topic,
        item.url,
        item.whitelist,
        item.blacklist,
        item.image_prefix,
        item.page_number,
        {
          // Cookie: cookieString,
        }
      );
      console.log(list);
      await utils.writeCsv(
        `./output/${item.topic}/${item.image_prefix}/output.csv`,
        list
      );
    } catch (error) {
      console.log(error);
    }
  }
}

run();
