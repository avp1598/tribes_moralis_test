import {
  DecodedTransaction,
  ERCContract,
  EthTxnType,
  NFTContract,
} from "./types";

export const getPlatformLabel = (label: string) => {
  if (!label) return "unknown";
  if (label.includes("1inch")) {
    return "1inch";
  }
  if (label.includes("Uniswap")) {
    return "uniswap";
  }
  if (label.includes("SushiSwap")) {
    return "sushiswap";
  }
  if (label.includes("Balancer")) {
    return "balancer";
  }
  if (label.includes("Curve")) {
    return "curve";
  }
  if (label.includes("Hop")) {
    return "hop";
  }
  return "unknown";
};

export async function fetchContracts(
  addresses: {
    chainId: 1 | 137;
    address: string;
  }[]
) {
  const [ercContractsResponse, nftContractsResponse] = await Promise.all([
    fetch("https://app.tribes.xyz/api/v1/eth/getERC20s", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ addresses }),
    }),
    fetch("https://app.tribes.xyz/api/v1/eth/getEthNFTs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ addresses }),
    }),
  ]);

  const ercContracts: ERCContract[] = await ercContractsResponse.json();
  const nftContracts: NFTContract[] = await nftContractsResponse.json();

  return {
    ercContracts,
    nftContracts,
  };
}

export function createTransaction(
  txn: DecodedTransaction,
  timestamp: number,
  type: EthTxnType,
  extraProps: any
) {
  return {
    type,
    id: txn.hash,
    from: txn.from_address,
    to: txn.to_address,
    timestamp,
    chainId: 1,
    ...extraProps,
  };
}
