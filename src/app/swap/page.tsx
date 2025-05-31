// src/app/swap/page.tsx
'use client';

import React, { useState } from 'react'; // <--- TAMBAHKAN 'React,' di sini
import { ethers } from 'ethers'; 

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

      // Pastikan window.ethereum tersedia (misalnya, MetaMask terinstal)
      if (typeof window.ethereum === 'undefined') {
        throw new Error("MetaMask or other Ethereum wallet not detected. Please install one.");
      }

      // Gunakan type assertion untuk memberitahu TypeScript bahwa window.ethereum adalah provider
      // (Ini untuk kepatuhan TypeScript, pada runtime Anda tetap harus yakin itu ada)
      const provider = new ethers.BrowserProvider(window.ethereum as ethers.Eip1193Provider); // <--- TAMBAHKAN 'as ethers.Eip1193Provider'
      const signer = await provider.getSigner();
      console.log("Wallet connected:", await signer.getAddress());

      setStatus('Swap berhasil disimulasikan. Lanjutkan dengan implementasi Uniswap.');
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
        type="number" 
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
