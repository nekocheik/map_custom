import { Injectable } from "@nestjs/common";
import { MergeDemand, MergeDemandStatus } from "./models";
import {
  ApiNetworkProvider,
  ContractQueryResponse,
  ProxyNetworkProvider,
} from "@elrondnetwork/erdjs-network-providers";
import {
  AbiRegistry,
  Address,
  ContractCallPayloadBuilder,
  ContractFunction,
  ResultsParser,
  SmartContract,
  SmartContractAbi,
  StringValue,
  Transaction,
  TransactionPayload,
  TransactionVersion,
  U16Value,
  Struct,
} from "@elrondnetwork/erdjs";
import { UserSecretKey, UserSigner } from "@elrondnetwork/erdjs-walletcore";
import { readFileSync } from "fs";
import { LoggerService } from "./logger.service";

@Injectable()
export class BlockchainService {
  private readonly apiProvider: ApiNetworkProvider;
  private readonly proxyProvider: ProxyNetworkProvider;
  private readonly senderAddress: Address;
  private readonly contractAddress: Address;
  private readonly contract: SmartContract;
  private chainId: string;
  private readonly pem: string;

  constructor(private readonly logger: LoggerService) {
    this.chainId = process.env.NODE_ENV !== "develop" ? "D" : "1";
    const apiEndpoind =
      process.env.NODE_ENV !== "production"
        ? "https://devnet-api.elrond.com"
        : "https://api.elrond.com";
    const proxyEndpoind =
      process.env.NODE_ENV !== "production"
        ? "https://devnet-gataway.elrond.com"
        : "https://gateway.elrond.com";

    this.apiProvider = new ApiNetworkProvider(apiEndpoind);
    this.proxyProvider = new ProxyNetworkProvider(proxyEndpoind);

    this.senderAddress = new Address(
      "erd17djfwed563cry53thgytxg5nftvl9vkec4yvrgveu905zeq6erqqkr7cmy"
    );
    this.contractAddress = new Address(
      "erd1qqqqqqqqqqqqqpgquydu7pkz2su5yedyadudhnwx0ex30ewferqqz6af7n"
    );
    //erd1qqqqqqqqqqqqqpgqtvkv2z6h7cqh40nhva4se4r28gv5dglxnqjsputz0e
    this.pem = readFileSync("./wallets/gwenael2.pem", "utf-8");

    const abi_buffer = readFileSync(`./data/mock_abi.json`, "utf-8");
    const abi = JSON.parse(abi_buffer);
    const abiRegistry = AbiRegistry.create(abi);
    this.contract = new SmartContract({
      address: this.contractAddress,
      abi: new SmartContractAbi(abiRegistry),
    });
  }

  async getMergeDemandData(guardianId: number): Promise<MergeDemand> {
    const funcName = "getMergeData";
    const query = this.contract.createQuery({
      func: new ContractFunction(funcName),
      args: [new U16Value(guardianId)],
      caller: this.senderAddress,
    });

    let queryResponse: ContractQueryResponse;
    try {
      queryResponse = await this.apiProvider.queryContract(query);
    } catch (e) {
      this.logger.log(e);
      return;
    }

    let endpointDefinition = this.contract.getEndpoint(funcName);
    let { firstValue } = new ResultsParser().parseQueryResponse(
      queryResponse,
      endpointDefinition
    );

    const res: MergeDemand = {
      guardianId: Number(firstValue.valueOf().guardian_id.valueOf()),
      status: MergeDemandStatus[firstValue.valueOf().status.name],
      armorId: firstValue.valueOf().armor_id.toString(),
      weaponId: firstValue.valueOf().weapon_id.toString(),
      backgroundId: firstValue.valueOf().background_id.toString(),
      crownId: firstValue.valueOf().crown_id.toString(),
    };

    return res;
  }

  async setCid(guardianId: number, mediaCid: string, metadataCid: string) {
    const funcName = "setCids";
    const account = await this.apiProvider.getAccount(this.senderAddress);

    let tx = this.contract.methods
      .setCids([guardianId, mediaCid, metadataCid])
      .withNonce(account.nonce)
      .withGasLimit(3000000)
      .withChainID(this.chainId)
      .buildTransaction();

    UserSigner.fromPem(this.pem).sign(tx);
    await this.apiProvider.sendTransaction(tx);
  }
}
