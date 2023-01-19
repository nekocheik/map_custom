import { ApiNetworkProvider } from '@elrondnetwork/erdjs-network-providers/out';
import axios from 'axios';

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const erdDoGetGeneric = async (networkProvider, uri, count = 1) => {
  try {
    const data = await networkProvider.doGetGeneric(uri);
    return data;
  } catch (e) {
    if (count > 3) throw new Error(e);
    else {
      await sleep(1000);
      return erdDoGetGeneric(networkProvider, uri, count + 1);
    }
  }
};

export const erdDoPostGeneric = async (
  networkProvider,
  uri,
  body,
  count = 1,
) => {
  try {
    const data = await networkProvider.doPostGeneric(uri, body);
    return data;
  } catch (e) {
    if (count > 3) throw new Error(e);
    else {
      await sleep(1000);
      return erdDoGetGeneric(networkProvider, uri, count + 1);
    }
  }
};

export const processElrondNFTs = async (
  networkProvider: ApiNetworkProvider,
  uriType: 'collections' | 'accounts',
  uriName: string,
  processFunction: (nftList: any[]) => void,
) => {
  try {
    const nftCount = await erdDoGetGeneric(
      networkProvider,
      uriType + '/' + uriName + '/nfts/count',
    );
    const n = 1;
    const size = 100;
    const maxIteration = Math.ceil(nftCount / (size * n));
    for (let i = 0; i < maxIteration; i++) {
      const endpoints = Array.from(
        { length: n },
        (_, index) =>
          'https://devnet-api.elrond.com/' +
          uriType +
          '/' +
          uriName +
          '/nfts?from=' +
          (index + i * n) * size +
          '&size=' +
          size,
      );
      const parallelData = await axios.all(
        endpoints.map((endpoint) => {
          return axios.get(endpoint);
        }),
      );
      console.log('go');
      for (const data of parallelData) {
        if (data.status === 200) {
          await processFunction(data.data);
        } else {
          console.log('ELROND ERROR');
        }
      }
      console.log(i + ' - data scrapped');
      await sleep(3000);
    }
  } catch (e) {
    console.error(e);
  }
};
