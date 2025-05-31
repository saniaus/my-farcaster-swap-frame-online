import { Button, Frog } from 'frog';
import { devtools } from 'frog/dev';
import { serveStatic } from 'frog/serve-static';
import { Address, parseEther, formatEther, parseUnits } from 'viem';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

// Uniswap SDK Imports
import { CurrencyAmount, Token, TradeType, Percent } from '@uniswap/sdk-core';
import { AlphaRouter, SwapOptions, SwapType } from '@uniswap/smart-order-router';

// --- Konfigurasi Klien Viem ---
// Ini untuk berinteraksi dengan blockchain Base
// URL RPC akan diambil dari Environment Variable di Vercel
const publicClient = createPublicClient({
  chain: base, // Kita targetkan jaringan Base
  transport: http(process.env.BASE_RPC_URL as string), // Menggunakan URL RPC dari .env.local atau Vercel Env
});

// --- Alamat Smart Contract & Token di Base ---
// Anda HARUS MENGISI ALAMAT INI dengan yang benar untuk Base Mainnet!
// UNISWAP_V3_ROUTER_ADDRESS adalah alamat SwapRouter di Base
const UNISWAP_V3_ROUTER_ADDRESS: Address = '0x2626664c2602fd36Ea31bE86fE371395C01D2dF9'; // Contoh alamat Uniswap V3 SwapRouter di Base
// Pastikan ini adalah alamat WETH yang benar di Base
const WETH = new Token(base.id, '0x4200000000000000000000000000000000000006', 18, 'WETH', 'Wrapped Ether');
// Pastikan ini adalah alamat USDC yang benar di Base
const USDC = new Token(base.id, '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 6, 'USDC', 'USD Coin');

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

// Devtools hanya untuk development, tidak aktif di Vercel
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
// FRAME KEDUA: Preview Swap
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
  let calldata = '0x';
  let toAddress = UNISWAP_V3_ROUTER_ADDRESS;
  let value = '0';

  try {
    const amountInWei = parseUnits(inputAmount, WETH.decimals);
    const tokenInObj = WETH;
    const tokenOutObj = USDC;

    const router = new AlphaRouter({ chainId: base.id, provider: publicClient as any });

    const senderAddress = frameData?.address as Address;
    if (!senderAddress) {
      throw new Error("Could not get sender address from frame data.");
    }

    const swapOptions: SwapOptions = {
      recipient: senderAddress,
      slippageTolerance: new Percent(50, 10_000), // 0.5% slippage
      deadline: Math.floor(Date.now() / 1000) + 60 * 10, // 10 minutes from now
      type: SwapType.SWAP_ROUTER_02,
    };

    const amountInCurrency = CurrencyAmount.fromRawAmount(tokenInObj, amountInWei.toString());

    const route = await router.route(
      amountInCurrency,
      tokenOutObj,
      TradeType.EXACT_INPUT,
      swapOptions
    );

    if (route && route.route && route.methodParameters) {
      estimatedOutput = formatEther(route.amountOut.quotient.toString());
      calldata = route.methodParameters.calldata;
      toAddress = route.methodParameters.to;
      value = route.methodParameters.value;

      c.initialState.estimatedOutput = estimatedOutput;
      c.initialState.calldata = calldata;
      c.initialState.toAddress = toAddress;
      c.initialState.value = value;

      try {
        const gasLimit = await publicClient.estimateGas({
          account: senderAddress,
          to: toAddress,
          data: calldata as Address,
          value: BigInt(value),
        });
        gasEstimate = formatEther(gasLimit);
      } catch (gasError) {
        console.warn("Could not estimate gas:", gasError);
        gasEstimate = "N/A (check console)";
      }

    } else {
      throw new Error('No swap route found for these tokens/amounts.');
    }

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
    data: calldata as Address,
    value: BigInt(value),
  });
});

export const GET = app.fetch();
export const POST = app.fetch();