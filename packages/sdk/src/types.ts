export interface DecodedTransaction {
  hash: string;
  none: string;
  transactionIndex: string;
  from_address: string;
  from_address_label: string;
  to_address: string;
  to_address_label: string;
  value: string;
  gas: string;
  gas_price: string;
  input: string;
  receipt_cumulative_gas_used: string;
  receipt_gas_used: string;
  receipt_contract_address: string;
  receipt_root: string;
  receipt_status: string;
  block_timestamp: string;
  block_number: string;
  block_hash: string;
  transfer_index: string[];
  logs: any[];
  decoded_call: {
    signature: string;
    label: string;
    type: string;
    params: any[];
  } | null;
}

export enum EthChain {
  ethereum = 1,
  polygon = 137,
}

export enum EthTxnType {
  transfer = "transfer",
  mint = "mint",
  swap = "swap",
  purchase = "purchase",
  approve = "approve",
  bridge = "bridge",
  contractCall = "contractCall",
  raw = "raw",
}

export type GetTxnCountByAddressParams = {
  walletAddress: string;
  moralisApiKey: string;
};

export type GetTxnsByAddressParams = {
  chainId: "eth" | "polygon";
  walletAddress: string;
  moralisApiKey: string;
  cursor?: string;
};

export type EthContractCallTxn = {
  type: EthTxnType.contractCall;
  id: string;
  signature: string; // method signature
  params: any[];
  from: string;
  to: string;
  timestamp: number;
  value: string;
};

export type EthTransferTxn = {
  type: EthTxnType.transfer;
  id: string;
  from: string;
  to: string;
  timestamp: number;
  amount: string;
  contractAddress: string | null;
  tokenName: string | null;
  transferType: "ERC20" | "ERC721" | "ERC1155" | "ETH";
  tokenId: string | null;
  chainId: EthChain;
};

export type EthRawTxn = {
  type: EthTxnType.raw;
  id: string;
  from: string;
  to: string;
  timestamp: number;
  value: string;
  input: string;
};

export type EthMintTxn = {
  type: EthTxnType.mint;
  id: string;
  from: string;
  to: string;
  timestamp: number;
  amount: string;
  contractAddress: string | null;
  collectionName: string | null;
  tokenType: "ERC721" | "ERC1155";
  tokenId: string;
  chainId: EthChain;
};

export type EthSwapTxn = {
  type: EthTxnType.swap;
  id: string;
  from: string;
  to: string;
  timestamp: number;
  contractAddress: string | null;
  platform: string;
};

export type EthApproveTxn = {
  type: EthTxnType.approve;
  id: string;
  from: string;
  timestamp: number;
  amount: string;
  contractAddress: string | null;
  tokenName: string | null;
};

export type EthBridgeTxn = {
  type: EthTxnType.bridge;
  id: string;
  from: string;
  to: string;
  timestamp: number;
  amount: string;
  contractAddress: string | null;
  tokenName: string | null;
  platform: string;
  chainId: EthChain;
};

export type EThTransaction =
  | EthTransferTxn
  | EthContractCallTxn
  | EthRawTxn
  | EthMintTxn
  | EthSwapTxn
  | EthApproveTxn
  | EthBridgeTxn;

export type GetTxnsByAddressResponse = {
  transactions: EThTransaction[];
  cursor: string;
};

export type ERCContract = {
  chainId: 1 | 137;
  image: string;
  symbol: string;
  decimals: number;
  address: string;
  id: string;
  name: string;
};

export type NFTContract = {
  chainId: 1 | 137;
  image: string;
  symbol: string;
  address: string;
  id: string;
  name: string;
  contractType: 721 | 1155;
};
