import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const htmlImage = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      background-color: #f9fafb;
      color: #111827;
      font-family: sans-serif;
    ">
      <h1 style="font-size: 24px; margin: 0;">Swap on Farcaster</h1>
      <p style="font-size: 16px; margin-top: 8px;">Start trading your tokens now</p>
    </div>
  `;

  return NextResponse.json({
    image: htmlImage,
    intents: [
      {
        label: "Swap",
        action: "https://example.com/swap"
      }
    ]
  });
}
