export const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <style>
    .bg { fill: #10130f; }
    .sheet { fill: #fbfcfa; }
    .fold { fill: #d9ded2; }
    .accent { fill: #0f7b63; }
    .ink { fill: #10130f; }
    .line { stroke: #0f7b63; stroke-width: 4.5; stroke-linecap: round; fill: none; }
    .spark { fill: #f2c46d; }
    @media (prefers-color-scheme: dark) {
      .bg { fill: #070907; }
      .sheet { fill: #d5f7d8; }
      .fold { fill: #92bd97; }
      .accent { fill: #58c2a7; }
      .line { stroke: #58c2a7; }
      .spark { fill: #f0d36c; }
    }
  </style>
  <rect class="bg" width="64" height="64" rx="14"/>
  <path class="sheet" d="M18 10h20l10 10v34H18z"/>
  <path class="fold" d="M38 10v11h10z"/>
  <rect class="accent" x="22" y="30" width="22" height="15" rx="4"/>
  <path class="line" d="M19 22c-6 0-10 4-10 10s4 10 10 10h4"/>
  <path class="line" d="M45 22c6 0 10 4 10 10s-4 10-10 10h-4"/>
  <text class="ink" x="33" y="41" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="12" font-weight="900" letter-spacing="-.5">MD</text>
  <path class="spark" d="M50 8l2.4 5.5L58 16l-5.6 2.5L50 24l-2.4-5.5L42 16l5.6-2.5z"/>
</svg>`;
