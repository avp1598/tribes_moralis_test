import { formatEther } from "viem";

export const getTxnCountByAddress = async ({
  chainId,
  walletAddress,
  moralisApiKey,
}: GetTxnCountByAddressParams) => {
  const res = await fetch(
    `https://deep-index.moralis.io/api/v2.2/wallets/${walletAddress}/stats?chain=${chainId}`,
    {
      headers: {
        "X-API-Key": moralisApiKey,
      },
    }
  );
  const response = await res.json();
  return {
    count: response.transactions.total,
    walletAddress,
  };
};

export const getTxnsByAddress = async ({
  chainId,
  walletAddress,
  moralisApiKey,
  cursor,
}: GetTxnsByAddressParams) => {
  console.log({ walletAddress, chainId });
  const API_LIMIT = 25;
  const BASE_URL = `https://deep-index.moralis.io/api/v2.2/${walletAddress}`;
  const HEADERS = {
    headers: {
      "X-API-Key": moralisApiKey,
    },
  };

  const allTransactionsResponse = await fetch(
    cursor
      ? `${BASE_URL}/verbose?chain=${chainId}&limit=50&cursor=${cursor}`
      : `${BASE_URL}/verbose?chain=${chainId}&limit=50`,
    HEADERS
  );

  const data = await allTransactionsResponse.json();
  const allTransactions: DecodedTransaction[] = data.result;

  const endBlock = allTransactions[0].block_number;
  const startBlock = allTransactions[allTransactions.length - 1].block_number;

  try {
    const [ercTransactionsResponse, nftTransactionsResponse] =
      await Promise.all([
        fetch(
          `${BASE_URL}/erc20/transfers?chain=eth&format=decimal&from_block=${startBlock}&to_block=${endBlock}&limit=${API_LIMIT}`,
          HEADERS
        ),
        fetch(
          `${BASE_URL}/nft/transfers?chain=eth&format=decimal&from_block=${startBlock}&to_block=${endBlock}&limit=${API_LIMIT}`,
          HEADERS
        ),
      ]);

    const erc20Data = await ercTransactionsResponse.json();
    const nftData = await nftTransactionsResponse.json();

    let ercCursor = erc20Data.cursor;
    let nftCursor = nftData.cursor;

    let ercTransactions: ERCTransaction[] = erc20Data.result || [];
    let nftTransactions: NFTTransaction[] = nftData.result || [];

    let ercStartBlock =
      ercTransactions[ercTransactions.length - 1].block_number;

    let nftStartBlock =
      nftTransactions[nftTransactions.length - 1].block_number;

    const returnObj: GetTxnsByAddressResponse = {
      transactions: [],
      cursor: "",
    };

    let contracts = 0;

    for (const txn of allTransactions) {
      if (
        txn.block_number < ercStartBlock &&
        ercTransactions.length === API_LIMIT
      ) {
        console.log("fetching erc20 transactions again");
        const erc20Response = await fetch(
            `${BASE_URL}/erc20/transfers?chain=eth&format=decimal&from_block=${startBlock}}&to_block=${endBlock}&limit=${API_LIMIT}&cursor=${ercCursor}`,
            HEADERS
          ),
          erc20Data = await erc20Response.json();
        ercStartBlock =
          erc20Data.result[erc20Data.result.length - 1].block_number;
        ercCursor = erc20Data.cursor;
        ercTransactions = erc20Data.result;
      }

      if (
        txn.block_number < nftStartBlock &&
        nftTransactions.length === API_LIMIT
      ) {
        const nftResponse = await fetch(
            `${BASE_URL}/nft/transfers?chain=eth&format=decimal&from_block=${startBlock}&to_block=${endBlock}&cursor=${nftCursor}&limit=${API_LIMIT}`,
            HEADERS
          ),
          nftData = await nftResponse.json();
        nftStartBlock = nftData.result[nftData.result.length - 1].block_number;
        nftCursor = nftData.cursor;
        nftTransactions = nftData.result;
      }
      if (txn.decoded_call?.signature.includes("transfer")) {
        const ercTxnIndex = ercTransactions.findIndex(
          (ercTxn) => ercTxn.transaction_hash === txn.hash
        );
        if (ercTxnIndex > -1) {
          returnObj.transactions.push({
            type: EthTxnType.transfer,
            id: txn.hash,
            from: txn.from_address,
            to: txn.to_address,
            timestamp: Date.parse(txn.block_timestamp),
            value: ercTransactions[ercTxnIndex].value_decimal,
            contractAddress: ercTransactions[ercTxnIndex].address,
            tokenName: ercTransactions[ercTxnIndex].token_name,
            transferType: "ERC20",
            tokenId: "",
            chainId: 1,
          });
          continue;
        }
      }

      const nftTxnIndex = nftTransactions.findIndex(
        (nftTxn) => nftTxn.transaction_hash === txn.hash
      );

      if (nftTxnIndex > -1) {
        returnObj.transactions.push({
          type: EthTxnType.transfer,
          id: txn.hash,
          from: txn.from_address,
          to: txn.to_address,
          timestamp: Date.parse(txn.block_timestamp),
          value: nftTransactions[nftTxnIndex].amount,
          contractAddress: nftTransactions[nftTxnIndex].token_address,
          tokenName: "",
          transferType: nftTransactions[nftTxnIndex].contract_type,
          tokenId: nftTransactions[nftTxnIndex].token_id,
          chainId: 1,
        });
        continue;
      }

      if (BigInt(txn.value) > BigInt(0) && txn.input === "0x") {
        returnObj.transactions.push({
          type: EthTxnType.transfer,
          id: txn.hash,
          from: txn.from_address,
          to: txn.to_address,
          timestamp: Date.parse(txn.block_timestamp),
          value: formatEther(BigInt(txn.value)),
          contractAddress: null,
          tokenName: null,
          transferType: "ETH",
          tokenId: null,
          chainId: 1,
        });
        continue;
      }

      returnObj.transactions.push({
        type: EthTxnType.contractCall,
        id: txn.hash,
        signature: txn.decoded_call?.signature || "",
        params: txn.decoded_call?.params || [],
        from: txn.from_address,
        to: txn.to_address,
        timestamp: Date.parse(txn.block_timestamp),
        value: formatEther(BigInt(txn.value)),
      });
      contracts++;
    }
    console.log({ contracts });

    returnObj.cursor = data.cursor;
    return returnObj;
  } catch (error) {
    throw error;
  }
};

// getTxnCountByAddress({
//   chainId: "eth",
//   walletAddress: "0x6304CE63F2EBf8C0Cc76b60d34Cc52a84aBB6057",
// });

// getTxnsByAddress({
//   chainId: "eth",
//   walletAddress: "0x6304CE63F2EBf8C0Cc76b60d34Cc52a84aBB6057",
// });

interface NFTTransaction {
  block_number: string;
  block_timestamp: string;
  block_hash: string;
  transaction_hash: string;
  transaction_index: number;
  log_index: number;
  value: string;
  contract_type: "ERC721" | "ERC1155";
  transaction_type: string;
  token_address: string;
  token_id: string;
  from_address: string;
  from_address_label: string;
  to_address: string;
  to_address_label: string;
  amount: string;
  verified: number;
  operator: string;
  possible_spam: boolean;
  verified_collection: boolean;
}

interface ERCTransaction {
  token_name: string;
  token_symbol: string;
  token_logo: string;
  token_decimals: string;
  from_address: string;
  from_address_label: string;
  to_address: string;
  to_address_label: string;
  address: string;
  block_hash: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
  transaction_index: number;
  log_index: number;
  value: string;
  possible_spam: boolean;
  value_decimal: string;
}

interface DecodedTransaction {
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
  contractCall = "contractCall",
}

type GetTxnCountByAddressParams = {
  chainId: "eth" | "polygon";
  walletAddress: string;
  moralisApiKey: string;
};

type GetTxnsByAddressParams = {
  chainId: "eth" | "polygon";
  walletAddress: string;
  moralisApiKey: string;
  cursor?: string;
};

type EthContractCallTxn = {
  type: EthTxnType.contractCall;
  id: string;
  signature: string; // method signature
  params: any[];
  from: string;
  to: string;
  timestamp: number;
  value: string;
};

type EthTransferTxn = {
  type: EthTxnType.transfer;
  id: string;
  from: string;
  to: string;
  timestamp: number;
  value: string;
  contractAddress: string | null; // null for ETH and non-null for ERC20, ERC721, etc.
  tokenName: string | null; // null for ETH and non-null for ERC20, ERC721, etc.
  transferType: "ERC20" | "ERC721" | "ERC1155" | "ETH";
  tokenId: string | null; // null for ETH and non-null for ERC20, ERC721, etc.
  chainId: EthChain;
};

type EThTransaction = EthTransferTxn | EthContractCallTxn;

type GetTxnsByAddressResponse = {
  transactions: EThTransaction[];
  cursor: string;
};
