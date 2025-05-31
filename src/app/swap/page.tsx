// src/app/swap/page.tsx
'use client';

import { useState } from 'react';
import { ethers } from 'ethers'; // Library ethers untuk interaksi blockchain

export default function SwapPage() {
  const [fromToken, setFromToken] = useState('');
  const [toToken, setToToken] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('');

  const handleSwap = async () => {
    try {
      setStatus('Swapping...');

      // --- PENTING: TAMBAHKAN LOGIKA SWAP UNISWAP DI SINI ---
      // Ini adalah bagian kunci yang harus Anda implementasikan.
      // Anda perlu:
      // 1. Dapatkan Uniswap Router Address untuk jaringan yang relevan.
      // 2. Dapatkan ABI Uniswap Router.
      // 3. Buat instance kontrak Uniswap Router.
      // 4. Lakukan perhitungan harga dan rute swap.
      // 5. Panggil fungsi swap (misalnya, swapExactTokensForTokens) di kontrak Uniswap Router.

      // Contoh Dummy (ini tidak melakukan swap nyata):
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      console.log("Wallet connected:", await signer.getAddress());

      // >>> LOGIKA UNISWAP NYATA AKAN DIMULAI DI SINI <<<
      // Misalnya:
      // const uniswapRouterAddress = "0x..."; // Alamat router Uniswap di jaringan yang dipilih
      // const uniswapRouterAbi = [...]; // ABI router
      // const uniswapRouter = new ethers.Contract(uniswapRouterAddress, uniswapRouterAbi, signer);
      // const amountInWei = ethers.parseUnits(amount, 18); // Sesuaikan desimal token
      // const path = [fromToken, toToken]; // Contoh path swap
      // const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 menit dari sekarang
      // const tx = await uniswapRouter.swapExactTokensForTokens(
      //   amountInWei,
      //   0, // amountOutMin (gunakan slippage tolerance yang tepat)
      //   path,
      //   await signer.getAddress(),
      //   deadline
      // );
      // await tx.wait(); // Tunggu transaksi selesai

      setStatus('Swap berhasil disimulasikan. Lanjutkan dengan implementasi Uniswap.');
      // setStatus('Swap berhasil! Tx Hash: ' + tx.hash); // Jika swap nyata berhasil
    } catch (err) {
      setStatus('Error: ' + (err as Error).message);
      console.error("Swap Error:", err);
    }
  };

  return (
    <div className="p-4" style={{ fontFamily: 'Arial, sans-serif' }}>
      <h1 className="text-xl font-bold mb-4">Farcaster DEX Swap</h1>
      <p className="mb-4">Halaman ini adalah untuk melakukan swap setelah Anda dialihkan dari Farcaster Frame.</p>
      <input
        className="block border p-2 mb-2 w-full"
        value={fromToken}
        onChange={e => setFromToken(e.target.value)}
        placeholder="From Token Address (misal: WETH)"
        style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
      />
      <input
        className="block border p-2 mb-2 w-full"
        value={toToken}
        onChange={e => setToToken(e.target.value)}
        placeholder="To Token Address (misal: USDC)"
        style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
      />
      <input
        type="number" // Pastikan input number
        className="block border p-2 mb-2 w-full"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        placeholder="Jumlah"
        style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
      />
      <button
        onClick={handleSwap}
        className="bg-blue-600 text-white px-4 py-2 rounded"
        style={{ backgroundColor: '#007bff', color: 'white', padding: '10px 15px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
      >
        Swap
      </button>
      {status && <p className="mt-4 text-sm" style={{ marginTop: '16px', fontSize: '0.9em', color: '#333' }}>{status}</p>}
    </div>
  );
}
