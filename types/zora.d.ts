import { BigNumber, Contract } from "ethers";

export interface CreateERC1155Input {
  contractAddress: string;
  contract: Contract;
  token: Token;
}

interface Component {
  royaltyMintSchedule: BigNumber;
  royaltyBPS: BigNumber;
  royaltyRecipient: string;
}

interface RoyaltyConfiguration {
  royaltyMintSchedule: BigNumber;
  royaltyBPS: BigNumber;
  royaltyRecipient: string;
}

interface Contract {
  name: string;
  uri: string;
  components: Component[];
  defaultRoyaltyConfiguration: RoyaltyConfiguration;
  defaultAdmin: string;
  setupActions: string[];
}

interface Token {
  tokenId: number;
  maxSupply: BigNumber;
  mintLimit: number;
  price: BigNumber;
  saleStart: BigNumber;
  saleEnd: BigNumber;
  tokenURI: string;
  royaltyBPS: number;
  royaltyRecipient: string;
  autoSupplyInterval: number;
}
