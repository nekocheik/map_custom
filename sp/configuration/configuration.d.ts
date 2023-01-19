import { ApiNetworkProvider } from "@elrondnetwork/erdjs-network-providers";

export interface EnvironmentVariables {
  "project-type": string;
  client: string;
  "service-name": string;
  "sentry-key": string;
  "cors-url": string;
  db: { url: string };
  "jwt-secret": string;
  "elrond-api-params": string;
  "deadrare-api": string;
  "deadrare-api-params": string;
  "trustmarket-api": string;
  "redis-url": string;
  "redis-user": string;
  "redis-pass": string;
  "claim-sc": string;
  "redis-db": number;
  "nft-collection-name": string;
  "rotg-collection-name": string;
  "ltbox-collection-name": string;
  "tiket-collection-name": string;
  "asset-collection-name": string;
  env: string;
  port: number;
  "elrond-network-provider": ApiNetworkProvider;
  "pinata-api-key": string;
  "pinata-api-secret": string;
  "explorer-api-key": string;
}
