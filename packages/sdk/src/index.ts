import { formatEther, formatUnits } from "viem";
import { createTransaction, fetchContracts, getPlatformLabel } from "./utils";
import {
  DecodedTransaction,
  ERCContract,
  EthTxnType,
  GetTxnCountByAddressParams,
  GetTxnsByAddressParams,
  NFTContract,
} from "./types";

export const getTxnCountByAddress = async (
  params: GetTxnCountByAddressParams
) => {
  const { walletAddress, moralisApiKey } = params;
  try {
    const [ethRes, polygonRes] = await Promise.all([
      fetch(
        `https://deep-index.moralis.io/api/v2.2/wallets/${walletAddress}/stats?chain=eth`,
        {
          headers: {
            "X-API-Key": moralisApiKey,
          },
        }
      ).then((res) => res.json()),
      fetch(
        `https://deep-index.moralis.io/api/v2.2/wallets/${walletAddress}/stats?chain=polygon`,
        {
          headers: {
            "X-API-Key": moralisApiKey,
          },
        }
      ).then((res) => res.json()),
    ]);

    return {
      eth: {
        count: ethRes.transactions.total,
      },
      polygon: {
        count: polygonRes.transactions.total,
      },
    };
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};

export const getTxnsByAddress = async (params: GetTxnsByAddressParams) => {
  const { chainId, walletAddress, moralisApiKey, cursor } = params;
  const BASE_URL = `https://deep-index.moralis.io/api/v2.2/${walletAddress}`;
  const HEADERS = {
    headers: {
      "X-API-Key": moralisApiKey,
    },
  };

  const allTransactionsResponse = await fetch(
    cursor
      ? `${BASE_URL}/verbose?chain=${chainId}&cursor=${cursor}`
      : `${BASE_URL}/verbose?chain=${chainId}`,
    HEADERS
  );

  const data = await allTransactionsResponse.json();
  const nextCursor = data.cursor;
  const allTransactions: DecodedTransaction[] = data.result;

  const uniqueAddresses = getUniqueAddresses(chainId, allTransactions);

  const { ercContracts, nftContracts } = await fetchContracts(uniqueAddresses);

  try {
    const transactions = allTransactions.map((txn) =>
      mapTransaction(txn, ercContracts, nftContracts)
    );
    console.dir(transactions);
    return { transactions, cursor: nextCursor };
  } catch (error) {
    throw error;
  }
};

const getUniqueAddresses = (
  chain: "eth" | "polygon",
  transactions: DecodedTransaction[]
) => {
  const addressSet = new Set();
  const uniqueAddresses = [];

  for (const txn of transactions) {
    const key = `${txn.to_address}-${1}`;
    if (!addressSet.has(key)) {
      addressSet.add(key);
      uniqueAddresses.push({
        chainId: chain === "eth" ? 1 : (137 as 1 | 137),
        address: txn.to_address,
      });
    }
  }

  return uniqueAddresses;
};

const mapTransaction = (
  txn: DecodedTransaction,
  ercContracts: ERCContract[],
  nftContracts: NFTContract[]
) => {
  const timestamp = Date.parse(txn.block_timestamp);
  const findContract = (address: string) =>
    ercContracts.find((contract) => contract.address === address) ||
    nftContracts.find((contract) => contract.address === address);
  const findParamValue = (name: string) =>
    txn.decoded_call?.params.find((param) => param.name.includes(name))?.value;
  const formatValue = (value: string, decimals = 18) =>
    formatUnits(BigInt(value), decimals);

  if (BigInt(txn.value) > BigInt(0) && txn.input === "0x") {
    return createTransaction(txn, timestamp, EthTxnType.transfer, {
      amount: formatEther(BigInt(txn.value)),
      transferType: "ETH",
    });
  }

  if (!txn.decoded_call) {
    return createTransaction(txn, timestamp, EthTxnType.raw, {
      value: formatEther(BigInt(txn.value)),
      input: txn.input,
    });
  }

  const contract = findContract(txn.to_address);
  const value = findParamValue("value") ?? txn.value;

  if (txn.decoded_call.signature.includes("transfer")) {
    return createTransaction(txn, timestamp, EthTxnType.transfer, {
      amount: formatValue(value, (contract as ERCContract)?.decimals),
      contractAddress: txn.to_address,
      tokenName: contract?.symbol ?? "",
      transferType:
        (contract as NFTContract)?.contractType === 721
          ? "ERC721"
          : (contract as NFTContract)?.contractType === 1155
          ? "ERC1155"
          : "ERC20",
    });
  }

  if (
    txn.decoded_call.signature.toLowerCase().includes("mint") ||
    txn.decoded_call.signature.toLowerCase().includes("purchase")
  ) {
    const tokenIds = txn.logs
      .filter((log) => log.decoded_event?.signature.includes("Transfer"))
      .map(
        (log) =>
          log.decoded_event.params?.find((param: any) =>
            param.name.includes("value")
          )?.value
      );

    return createTransaction(txn, timestamp, EthTxnType.mint, {
      amount: tokenIds.length.toString(),
      contractAddress: txn.to_address,
      collectionName: contract?.name ?? "",
      tokenType:
        (contract as NFTContract)?.contractType === 721 ? "ERC721" : "ERC1155",
      tokenId: tokenIds.join(","),
    });
  }

  if (txn.decoded_call.signature.includes("approve")) {
    return createTransaction(txn, timestamp, EthTxnType.approve, {
      amount: formatValue(value, (contract as ERCContract)?.decimals),
      contractAddress: txn.to_address,
      tokenName: contract?.symbol ?? "",
    });
  }

  if (txn.decoded_call.signature.toLowerCase().includes("swap")) {
    return createTransaction(txn, timestamp, EthTxnType.swap, {
      contractAddress: txn.to_address,
      platform: getPlatformLabel(txn.to_address_label),
    });
  }

  if (
    txn.decoded_call.signature.toLowerCase().includes("sendToL2") ||
    txn.decoded_call.signature.toLowerCase().includes("bridge")
  ) {
    const chainId = findParamValue("chainId");
    return createTransaction(txn, timestamp, EthTxnType.bridge, {
      amount: formatEther(BigInt(value)),
      contractAddress: txn.to_address,
      platform: getPlatformLabel(txn.to_address_label),
      chainId,
    });
  }

  return createTransaction(txn, timestamp, EthTxnType.contractCall, {
    signature: txn.decoded_call.signature,
    params: txn.decoded_call.params,
    value: formatEther(BigInt(txn.value)),
  });
};
