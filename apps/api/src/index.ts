import { Hono } from "hono";
import { EthChain, getTxnCountByAddress, getTxnsByAddress } from "sdk";
import { HTTPException } from "hono/http-exception";
import { env } from "hono/adapter";

const app = new Hono();

app.get("/", (c) => c.text("Hello Cloudflare Workers!"));

app.get("/getTransactions", async (c) => {
  const { MORALIS_API_KEY } = env<{ MORALIS_API_KEY: string }>(c);

  const chain = c.req.query("chain") || "eth";
  const address = c.req.query("address");
  const cursor = c.req.query("cursor");

  if (!address) {
    throw new HTTPException(400, {
      message: "address is required",
    });
  }

  const res = await getTxnsByAddress({
    chainId: chain as any,
    walletAddress: address,
    cursor: cursor,
    moralisApiKey: MORALIS_API_KEY,
  });
  console.log(res);
  return c.json(res);
});

app.get("/getTransactionCount", async (c) => {
  const { MORALIS_API_KEY } = env<{ MORALIS_API_KEY: string }>(c);

  const chain = c.req.query("chain") || "eth";
  const address = c.req.query("address");

  if (!address) {
    throw new HTTPException(400, {
      message: "address is required",
    });
  }

  const res = await getTxnCountByAddress({
    chainId: chain as any,
    walletAddress: address,
    moralisApiKey: MORALIS_API_KEY,
  });
  console.log(res);
  return c.json(res);
});

export default app;
