import { readFileSync } from "fs";
import * as yaml from "js-yaml";
import { join } from "path";
import { ApiNetworkProvider } from "@elrondnetwork/erdjs-network-providers";
import { EnvironmentVariables } from "./configuration.d";
const YAML_CONFIG_FILENAME = "../../config.yaml";

export default () => {
  const config = yaml.load(
    readFileSync(join(__dirname, YAML_CONFIG_FILENAME), "utf8")
  ) as Record<string, any>;

  const env = process.env.NODE_ENV;
  const port = Number(process.env.PORT);

  const databaseName = `${config["service-name"]}-${env.substring(0, 4)}`;
  if (!config[env]["elrond-api"])
    throw new Error(
      "Cannot read properties of undefined (reading 'elrond-api')"
    );
  const elrondNetworkProvider = new ApiNetworkProvider(
    config[env]["elrond-api"],
    {
      timeout: 10000,
    }
  );
  const parsedConfig: EnvironmentVariables = {
    "project-type": config["project-type"],
    client: config["client"],
    "service-name": config["service-name"],
    "sentry-key": config["sentry-key"],
    "redis-url": config["redis-url"],
    "redis-user": config["redis-user"],
    "redis-pass": config["redis-pass"],
    "redis-db": env === "production" ? 0 : 0,
    "elrond-network-provider": elrondNetworkProvider,
    "elrond-api-params": config[env]["elrond-api-params"],
    "claim-sc": config[env]["claim-sc"],
    "rotg-collection-name": config[env]["rotg-collection-name"],
    "ltbox-collection-name": config[env]["ltbox-collection-name"],
    "tiket-collection-name": config[env]["tiket-collection-name"],
    "asset-collection-name": config[env]["asset-collection-name"],
    "nft-collection-name": config[env]["nft-collection-name"],
    "deadrare-api": config["deadrare-api"],
    "deadrare-api-params": config["deadrare-api-params"],
    "trustmarket-api": config["trustmarket-api"],
    db: { url: config[env].db.url.replace("{databaseName}", databaseName) },
    "cors-url": config[env]["cors-url"],
    "jwt-secret": config[env]["jwt-secret"],
    env,
    port,
    "pinata-api-key": config[env]["pinata-api-key"],
    "pinata-api-secret": config[env]["pinata-api-secret"],
    "explorer-api-key": config[env]["explorer-api-key"],
  };

  Object.keys(parsedConfig).forEach((k) => {
    if (parsedConfig[k] === undefined)
      throw new Error(`Cannot read properties of undefined (reading '${k}')`);
  });
  return parsedConfig;
};
