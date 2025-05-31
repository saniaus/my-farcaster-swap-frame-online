import { Button, Frog } from 'frog';
import { devtools } from 'frog/dev';
import { serveStatic } from 'frog/serve-static';
import { Address, Hex } from 'viem'; // Updated import for Hex
import { parseEther, formatEther, parseUnits, formatUnits } from 'viem/utils'; // Updated import for viem utilities
import { createPublicClient, http, PublicClient } from 'viem';
import { base } from 'viem/chains';

// Uniswap SDK Imports
import { CurrencyAmount, Token, TradeType, Percent } from '@uniswap/sdk-core';
import { Pool, Route as V3Route, computePoolAddress, FeeAmount } from '@uniswap/v3-sdk'; 

// ABI Uniswap V3 Router
const V3_ROUTER_ABI = [
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "tokenIn", type: "address" },
          { internalType: "address", name: "tokenOut", type: "address" },
          { internalType: "uint24", name: "fee", type: "uint24" },
          { internalType: "address", name: "recipient", type: "address" },
          { internalType: "uint256", name: "deadline", type: "uint256" },
          { internalType: "uint256", name: "amountIn", type: "uint256" },
          { internalType: "uint256", name: "amountOutMinimum", type: "uint256" },
          { internalType: "uint160", name: "sqrtPriceLimitX96", type: "uint160" },
        ],
        internalType: "struct ISwapRouter.ExactInputSingleParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "exactInputSingle",
    outputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  // ABI untuk Quoter V3 (untuk mendapatkan harga secara on-chain)
  {
    inputs: [
        { internalType: "address", name: "tokenIn", type: "address" },
        { internalType: "address", name: "tokenOut", type: "address" },
        { internalType: "uint24", name: "fee", type: "uint24" },
        { internalType: "uint256", name: "amountIn", type: "uint256" },
        { internalType: "uint160", name: "sqrtPriceLimitX96", type: "uint160" },
    ],
    name: "quoteExactInputSingle",
    outputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  }
] as const;

// --- Konfigurasi Klien Viem ---
const publicClient: PublicClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL as string),
});

// --- Alamat Smart Contract & Token di Base ---
const UNISWAP_V3_ROUTER_ADDRESS: Address = '0x2626664c2602fd36Ea31bE86fE371395C01D2dF9'; // Uniswap V3 SwapRouter di Base
const UNISWAP_V3_QUOTER_ADDRESS: Address = '0x3d0b2fB1802E08077c59124401831518f886B847'; // Uniswap V3 Quoter V2 di Base

const WETH = new Token(base.id, '0x4200000000000000000000000000000000000006', 18, 'WETH', 'Wrapped Ether');
const USDC = new Token(base.id, '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 6, 'USDC', 'USD Coin');

// Fees yang sering digunakan Uniswap V3
const FEES = [FeeAmount.LOW, FeeAmount.MEDIUM, FeeAmount.HIGH]; // 0.05%, 0.3%, 1%

// --- Inisialisasi Frog App ---
export const app = new Frog({
  basePath: '/api/frame',
  initialState: {
    inputAmount: '',
    tokenInAddress: WETH.address as Address,
    tokenOutAddress: USDC.address as Address,
    estimatedOutput: '0',
    calldata: '0x',
    toAddress: UNISWAP_V3_ROUTER_ADDRESS as Address,
    value: '0',
  },
});

if (process.env.NODE_ENV === 'development') {
  devtools(app, { serveStatic });
}

// ===================================
// FRAME PERTAMA: Input Jumlah Swap
// ===================================
app.frame('/', (c) => {
  const { inputText } = c;

  if (inputText) {
    c.initialState.inputAmount = inputText;
  }

  return c.res({
    image: (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        backgroundColor: '#1a1a1a',
        color: 'white',
        fontSize: 48,
        padding: 20
      }}>
        <p>Swap {WETH.symbol} for {USDC.symbol} on Base</p>
        <p>Enter amount of {WETH.symbol} to swap:</p>
        {c.initialState.inputAmount && (
          <p style={{ fontSize: 36, color: '#00ff00' }}>Amount: {c.initialState.inputAmount}</p>
        )}
      </div>
    ),
    intents: [
      <Button value="preview">Preview Swap</Button>,
      <Button.Reset>Reset</Button.Reset>,
    ],
    textInput: 'e.g., 0.05',
  });
});

// ===================================
// FRAME KEDUA: Preview Swap (Logika Manual)
// ===================================
app.frame('/preview', async (c) => {
  const { inputAmount, tokenInAddress, tokenOutAddress } = c.initialState;
  const { frameData } = c;

  if (!inputAmount) {
    return c.res({
      image: (
        <div style={{ display: 'flex', fontSize: 60, alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', backgroundColor: 'red', color: 'white' }}>
          Please enter an amount first!
        </div>
      ),
      intents: [
        <Button action="/">Back</Button>
      ]
    });
  }

  let estimatedOutput = '0';
  let gasEstimate = 'N/A';
  let calldata: Hex = '0x'; 
  let toAddress = UNISWAP_V3_ROUTER_ADDRESS;
  let value: Hex = '0x0'; 

  try {
    const amountInBigInt = parseUnits(inputAmount, WETH.decimals); 

    const tokenInObj = WETH;
    const tokenOutObj = USDC;

    const senderAddress = frameData?.address as Address;
    if (!senderAddress) {
      throw new Error("Could not get sender address from frame data.");
    }

    // --- Logika Estimasi Swap Manual (Menggunakan Quoter V3) ---
    let bestOutput = BigInt(0);
    let bestFee: FeeAmount | undefined;

    for (const fee of FEES) {
        try {
            const quoteResult = await publicClient.readContract({
                address: UNISWAP_V3_QUOTER_ADDRESS,
                abi: V3_ROUTER_ABI, 
                functionName: 'quoteExactInputSingle',
                args: [
                    tokenInObj.address,
                    tokenOutObj.address,
                    fee,
                    amountInBigInt,
                    BigInt(0) 
                ],
            });
            if (quoteResult && (quoteResult as bigint) > bestOutput) {
                bestOutput = quoteResult as bigint;
                bestFee = fee;
            }
        } catch (quoteError) {
            console.warn(`Could not get quote for fee ${fee}:`, quoteError);
        }
    }

    if (bestOutput === BigInt(0) || !bestFee) {
        throw new Error('No valid quote found for swap.');
    }

    estimatedOutput = formatUnits(bestOutput, tokenOutObj.decimals);


    // --- Buat Calldata untuk Transaksi Swap ---
    const params = {
      tokenIn: tokenInObj.address as Address,
      tokenOut: tokenOutObj.address as Address,
      fee: bestFee,
      recipient: senderAddress, 
      deadline: BigInt(Math.floor(Date.now() / 1000) + 60 * 10), 
      amountIn: amountInBigInt,
      amountOutMinimum: bestOutput * BigInt(9950) / BigInt(10000), 
      sqrtPriceLimitX96: BigInt(0), 
    };

    calldata = await publicClient.encodeFunctionData({
        abi: V3_ROUTER_ABI,
        functionName: 'exactInputSingle',
        args: [params as any], 
    });

    if (tokenInObj.isNative) { 
        value = amountInBigInt.toString() as Hex; 
    }


    // --- Estimasi Gas ---
    try {
        const gasLimit = await publicClient.estimateGas({
            account: senderAddress,
            to: toAddress,
            data: calldata,
            value: BigInt(value),
        });
        gasEstimate = formatEther(gasLimit);
    } catch (gasError) {
        console.warn("Could not estimate gas:", gasError);
        gasEstimate = "N/A (could not estimate)";
    }

    // Simpan data transaksi ke state Frame
    c.initialState.estimatedOutput = estimatedOutput;
    c.initialState.calldata = calldata;
    c.initialState.toAddress = toAddress;
    c.initialState.value = value; 

  } catch (error: any) {
    console.error('Error during swap estimation:', error);
    return c.res({
      image: (
        <div style={{ display: 'flex', fontSize: 40, alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', backgroundColor: 'red', color: 'white', padding: 20, textAlign: 'center' }}>
          Error: {error.message || 'Failed to estimate swap. Check amount or liquidity.'}
        </div>
      ),
      intents: [
        <Button action="/">Back</Button>
      ]
    });
  }

  return c.res({
    image: (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        backgroundColor: '#1a1a1a',
        color: 'white',
        fontSize: 48,
        padding: 20
      }}>
        <p>Swap Summary:</p>
        <p>Input: {inputAmount} {WETH.symbol}</p>
        <p>Output: ≈ {estimatedOutput} {USDC.symbol}</p>
        <p>Est. Gas: {gasEstimate} ETH</p>
        <p style={{ fontSize: 24, color: '#aaa' }}>Slippage Tolerance: 0.5%</p>
      </div>
    ),
    intents: [
      <Button.Transaction target="/tx">Confirm Swap</Button.Transaction>,
      <Button action="/">Back</Button>,
    ],
  });
});

// ===================================
// TRANSACTION ENDPOINT: Membangun Data Transaksi
// ===================================
app.transaction('/tx', (c) => {
  const { toAddress, calldata, value } = c.initialState;

  if (!toAddress || calldata === '0x') {
    return c.error({ message: 'Transaction data not found in state.' });
  }

  return c.send({
    chainId: `eip155:${base.id}`,
    to: toAddress as Address,
    data: calldata as Hex, 
    value: BigInt(value as string), 
  });
});

export const GET = app.fetch();
export const POST = app.fetch();