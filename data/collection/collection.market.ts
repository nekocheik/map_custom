import axios from 'axios';
import { CollectionDocument } from './schemas/collection.schema';
import { Model } from 'mongoose';

import * as cheerio from 'cheerio';
import { sleep } from './collection.helpers';

const SMART_CONTRACTS = {
  deadrare: 'erd1qqqqqqqqqqqqqpgqd9rvv2n378e27jcts8vfwynpx0gfl5ufz6hqhfy0u0',
  frameit: 'erd1qqqqqqqqqqqqqpgq705fxpfrjne0tl3ece0rrspykq88mynn4kxs2cg43s',
  xoxno: 'erd1qqqqqqqqqqqqqpgq6wegs2xkypfpync8mn2sa5cmpqjlvrhwz5nqgepyg8',
  elrond: 'erd1qqqqqqqqqqqqqpgqra34kjj9zu6jvdldag72dyknnrh2ts9aj0wqp4acqh',
};

const getDeadrarePrice = async function (identifier) {
  const deadrarePage = await axios.get('https://deadrare.io/nft/' + identifier);
  const cheerioData = cheerio.load(deadrarePage.data);
  const nextData = cheerioData('#__NEXT_DATA__').html();
  const parsedNextData = JSON.parse(nextData);
  const deadrareData = parsedNextData?.props?.pageProps?.apolloState;
  if (!deadrareData) {
    throw new Error('Unable to get deadrare data');
  }
  const auctionKey = Object.keys(deadrareData).filter(
    (n) =>
      !n.startsWith('Cached') &&
      !n.startsWith('SaleField') &&
      !n.startsWith('Listing') &&
      !n.startsWith('NFTField') &&
      n !== 'ROOT_QUERY',
  );
  if (auctionKey.length > 1) {
    throw new Error('Unable to find auction key');
  }
  const price = deadrareData[auctionKey[0]]?.price;
  if (!price) {
    throw new Error('Unable to get auction price');
  }
  return price;
};

const getFrameitPrice = async function (identifier) {
  const frameitApi = await axios.get(
    'https://api.frameit.gg/api/v1/activity?TokenIdentifier=' + identifier,
  );
  const frameitData = frameitApi.data.data[0];
  if (frameitData.action === 'Listing') {
    return frameitData.paymentAmount.amount;
  }
  throw new Error('NFT is not listed');
};

const getXoxnoPrice = async function (identifier) {
  const graphQuery = {
    operationName: 'assetHistory',
    variables: {
      filters: {
        identifier,
      },
      pagination: {
        first: 1,
        timestamp: null,
      },
    },
    query:
      'query assetHistory($filters: AssetHistoryFilter!, $pagination: HistoryPagination) {\n  assetHistory(filters: $filters, pagination: $pagination) {\n    edges {\n      __typename\n      cursor\n      node {\n        action\n        actionDate\n        address\n        account {\n          address\n          herotag\n          profile\n          __typename\n        }\n        itemCount\n        price {\n          amount\n          timestamp\n          token\n          usdAmount\n          __typename\n        }\n        senderAddress\n        senderAccount {\n          address\n          herotag\n          profile\n          __typename\n        }\n        transactionHash\n        __typename\n      }\n    }\n    pageData {\n      count\n      __typename\n    }\n    pageInfo {\n      endCursor\n      hasNextPage\n      __typename\n    }\n    __typename\n  }\n}\n',
  };
  const graphApi = await axios.post(
    'https://nfts-graph.elrond.com/graphql',
    graphQuery,
  );
  const transactionHash =
    graphApi?.data?.data?.assetHistory?.edges[0]?.node?.transactionHash;
  if (!transactionHash) throw new Error('Unable to get nft last transaction');
  const elrondApi = await axios.get(
    'https://api.elrond.com/transactions/' + transactionHash,
  );
  const elrondTransaction = elrondApi.data;
  if (elrondTransaction.function === 'listing') {
    const buff = Buffer.from(elrondTransaction.data, 'base64');
    const auctionTokenData = buff.toString('utf-8').split('@');
    // check if EGLD (45474c44)
    if (auctionTokenData.length > 9 && auctionTokenData[9] === '45474c44') {
      if (auctionTokenData[6] === auctionTokenData[7]) {
        return parseInt(auctionTokenData[6], 16);
      } else {
        console.log(identifier + ': auction/' + elrondTransaction.function);
      }
    } else if (
      // check if LKMEX
      auctionTokenData.length > 9 &&
      auctionTokenData[9] === '4c4b4d45582d616162393130'
    ) {
      return parseInt(auctionTokenData[6], 16);
    }
  } else if (elrondTransaction.function === 'buyGuardian') {
    return 20000000000000000000;
  } else {
    console.log(identifier + ': ' + elrondTransaction.function);
  }
  throw new Error('NFT is not listed on xoxno');
};

const getNftPrice = async function (
  marketName: 'deadrare' | 'frameit' | 'xoxno' | 'elrond',
  identifier,
) {
  let price;
  switch (marketName) {
    case 'deadrare':
      price = await getDeadrarePrice(identifier);
      break;
    case 'frameit':
      price = await getFrameitPrice(identifier);
      break;
    case 'xoxno':
      price = await getXoxnoPrice(identifier);
      break;
    case 'elrond':
      price = await getXoxnoPrice(identifier);
      break;
  }
  return price / Math.pow(10, 18);
};

export const scrapMarkets = async function (
  collectionModel: Model<CollectionDocument>,
  collectionName: 'ROTG-fc7c99' | 'GUARDIAN-3d6635',
  egldRate: number,
  timestamp: number,
) {
  await scrapOneMarket(
    'deadrare',
    collectionName,
    collectionModel,
    egldRate,
    timestamp,
  );
  await scrapOneMarket(
    'frameit',
    collectionName,
    collectionModel,
    egldRate,
    timestamp,
  );
  await scrapOneMarket(
    'xoxno',
    collectionName,
    collectionModel,
    egldRate,
    timestamp,
  );
  await scrapOneMarket(
    'elrond',
    collectionName,
    collectionModel,
    egldRate,
    timestamp,
  );
};

const getIdsOfNFTsInMarket = async function (
  marketName,
  collection,
  from,
  size,
) {
  const nfts = await axios.get(
    'https://api.elrond.com/accounts/' +
      SMART_CONTRACTS[marketName] +
      '/nfts?from=' +
      from +
      '&size=' +
      size +
      '&collections=' +
      collection,
  );
  return nfts.data.map((x) => x.nonce);
};

const scrapOneMarket = async function (
  marketName: 'deadrare' | 'frameit' | 'xoxno' | 'elrond',
  collection: 'ROTG-fc7c99' | 'GUARDIAN-3d6635',
  collectionModel: Model<CollectionDocument>,
  egldRate: number,
  timestamp: number,
) {
  let from = 0;
  const size = 100;
  let nftsScrapped = false;
  while (!nftsScrapped) {
    const nftsIds = await getIdsOfNFTsInMarket(
      marketName,
      collection,
      from,
      size,
    );
    from += size;
    if (nftsIds.length == 0) {
      nftsScrapped = true;
      break;
    }

    // update timestamp for in-market nfts
    await collectionModel.updateMany(
      { collectionName: collection, id: { $in: nftsIds } },
      { timestamp },
    );
    // get newly entered nfts
    const newNFTs = await collectionModel.find({
      collectionName: collection,
      id: { $in: nftsIds },
      market: { $exists: false },
    });

    const updateObject = [];
    for (const nft of newNFTs) {
      // update db with price of newly added nft
      let price;
      try {
        price = await getNftPrice(marketName, nft.identifier);
      } catch (e) {
        continue;
      }
      const market = {
        source: marketName,
        identifier: nft.identifier,
        type: 'buy',
        bid: null,
        token: 'EGLD',
        price,
        currentUsd: egldRate ? +(egldRate * price).toFixed(2) : null,
      };
      console.log(market);
      updateObject.push({
        updateOne: {
          filter: { collectionName: collection, id: nft.id },
          update: {
            market,
          },
        },
      });
      await sleep(500);
    }
    await collectionModel.bulkWrite(updateObject);
  }
};
