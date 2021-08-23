const axios = require("axios");
const utils = require("./utils");
const fs = require("fs");
function getFullProductInfo(article) {
  const url = `www.spreadshirt.com/shop/design/-D${article.id}?sellable=${article.sellableId}`;
  const image = `https://image.spreadshirtmedia.com/image-server/v1/mp/compositions/${article.imageId}/views/1,width=378,height=378,appearanceId=2,backgroundColor=000000,noPt=true.webp`;
  const { name, ptName } = article;
  return {
    name,
    ptName,
    url,
    image: `=IMAGE("${image}")`,
    imagePath: `${article.id}.jpg`,
  };
}
function textToSlug(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-");
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
  const QUERY_URL = `https://www.spreadshirt.com/shopData/pageData/shop/clothing/t-shirts/${query}/?page=${pageNum}&locale=us_US&color=4`;
  return QUERY_URL;
}
async function getListOfProducts(keyword, whitelist, blacklist) {
  const query = textToSlug(keyword);
  let response = await utils.getJson(getQuery(query, 1));
  let { pageCount, articles } = response.listData;
  console.log(pageCount);
  for (let i = 2; i <= pageCount; i++) {
    try {
      await utils.sleep(50);
      response = await utils.getJson(getQuery(query, i));
      articles.push(...response.listData.articles);
      console.log(
        "Fetching articles with keyword " +
          keyword +
          " at " +
          i +
          "/" +
          pageCount
      );
    } catch {
      console.log(
        "Fetching articles with keyword " + keyword + " failed at page " + i
      );
    }
  }
  articles = articles.filter((article) =>
    filterName(article.name, whitelist, blacklist)
  );
  for (let j = 0; j < articles.length; j++) {
    const { id, imageId } = articles[j];
    fs.mkdirSync(`./output/${query}`, { recursive: true });
    try {
      console.log(
        "Downloading image with keyword " +
          keyword +
          " at " +
          (j + 1) +
          "/" +
          articles.length
      );
      if (fs.existsSync(`./output/${query}/${id}.jpg`)) {
        console.log("File existed !");
        continue;
      }
      await utils.download_image(
        `https://image.spreadshirtmedia.com/image-server/v1/mp/compositions/${imageId}/views/1,width=378,height=378,appearanceId=2,backgroundColor=000000,noPt=true.webp`,
        `./output/${query}/${id}.webp`
      );
    } catch (e) {
      console.log("Failed to download image with id " + id);
      console.log(e);
    }
  }
  return articles.map((article) => getFullProductInfo(article));
}
async function run() {
  const iData = await utils.readCsv("./input.csv");
  for (let i = 0; i < iData.length; i++) {
    const item = iData[i];
    try {
      const list = await getListOfProducts(
        item.keyword,
        item.whitelist,
        item.blacklist
      );
      await utils.writeCsv("./output/" + item.keyword + ".csv", list);
    } catch (error) {
      console.log(error);
    }
  }
}

run();
