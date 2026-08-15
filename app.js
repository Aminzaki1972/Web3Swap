/* =========================================================
   Web3Swap MVP
   app.js — REAL BNB/USDT QUOTE
   BNB Smart Chain
   ========================================================= */

const WEB3SWAP = {
  chainId: "0x38",
  rpcUrl: "https://bsc-dataseed.binance.org/",
  explorer: "https://bscscan.com",

  pair: "0x16b9a82891338f9ba80e2d6970fdda79d1eb0dae",

  usdt: "0x55d398326f99059ff775485246999027b3197955",

  wbnb: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",

  feeNumerator: 9975n,
  feeDenominator: 10000n
};


const tokens = {

  BNB: {
    symbol: "BNB",
    name: "BNB",
    cls: "bnb",
    decimals: 18
  },

  USDT: {
    symbol: "USDT",
    name: "Tether USD",
    cls: "usdt",
    decimals: 18,
    address: WEB3SWAP.usdt
  },

  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    cls: "usdc",
    decimals: 18
  },

  WBNB: {
    symbol: "WBNB",
    name: "Wrapped BNB",
    cls: "wbnb",
    decimals: 18,
    address: WEB3SWAP.wbnb
  }

};


const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [
      {
        name: "account",
        type: "address"
      }
    ],
    outputs: [
      {
        name: "",
        type: "uint256"
      }
    ]
  },

  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint8"
      }
    ]
  }
];


const PAIR_ABI = [
  {
    name: "getReserves",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "reserve0",
        type: "uint112"
      },
      {
        name: "reserve1",
        type: "uint112"
      },
      {
        name: "blockTimestampLast",
        type: "uint32"
      }
    ]
  },

  {
    name: "token0",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address"
      }
    ]
  },

  {
    name: "token1",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address"
      }
    ]
  }
];


let selecting = "pay";

let paySymbol = "BNB";

let receiveSymbol = "USDT";

let connected = false;

let account = null;

let quoteTimer = null;


/* =========================================================
   Helper
   ========================================================= */

const $ = (id) => document.getElementById(id);


function shortAddress(address) {

  if (!address) {
    return "";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;

}


function showToast(message) {

  const toast = $("toast");

  if (!toast) {
    return;
  }

  toast.textContent = message;

  toast.classList.remove("hidden");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {

    toast.classList.add("hidden");

  }, 3000);

}


function renderTokenButton(buttonId, symbol) {

  const token = tokens[symbol];

  if (!token || !$(buttonId)) {
    return;
  }

  let icon = "◆";

  if (symbol === "USDT") {
    icon = "₮";
  }

  if (symbol === "USDC") {
    icon = "$";
  }

  $(buttonId).innerHTML = `
    <span class="token-icon ${token.cls}">
      ${icon}
    </span>

    <span>
      ${symbol}
    </span>

    <span class="chevron">
      ⌄
    </span>
  `;

  $(buttonId).dataset.token = symbol;

}


/* =========================================================
   Token selector
   ========================================================= */

function openTokenModal(side) {

  selecting = side;

  const modal = $("tokenModal");

  const list = $("tokenList");

  if (!modal || !list) {
    return;
  }

  modal.classList.remove("hidden");

  list.innerHTML = Object.values(tokens)
    .map((token) => {

      let icon = "◆";

      if (token.symbol === "USDT") {
        icon = "₮";
      }

      if (token.symbol === "USDC") {
        icon = "$";
      }

      return `
        <button
          class="token-option"
          data-symbol="${token.symbol}"
        >

          <span
            class="token-icon ${token.cls}"
          >
            ${icon}
          </span>

          <span>

            <strong>
              ${token.symbol}
            </strong>

            <br>

            <small>
              ${token.name}
            </small>

          </span>

          <small>
            BNB Chain
          </small>

        </button>
      `;

    })
    .join("");


  document
    .querySelectorAll(".token-option")
    .forEach((button) => {

      button.onclick = () => {

        const symbol =
          button.dataset.symbol;

        if (selecting === "pay") {

          paySymbol = symbol;

        } else {

          receiveSymbol = symbol;

        }

        renderTokenButton(
          selecting === "pay"
            ? "payToken"
            : "receiveToken",
          symbol
        );

        modal.classList.add("hidden");

        updateQuote();

      };

    });

}


/* =========================================================
   BNB Smart Chain
   ========================================================= */

async function switchToBSC() {

  if (!window.ethereum) {
    return false;
  }

  try {

    const currentChain =
      await window.ethereum.request({
        method: "eth_chainId"
      });


    if (
      currentChain.toLowerCase() ===
      WEB3SWAP.chainId
    ) {

      return true;

    }


    try {

      await window.ethereum.request({

        method:
          "wallet_switchEthereumChain",

        params: [
          {
            chainId:
              WEB3SWAP.chainId
          }
        ]

      });

    } catch (switchError) {

      if (switchError.code === 4902) {

        await window.ethereum.request({

          method:
            "wallet_addEthereumChain",

          params: [
            {
              chainId:
                WEB3SWAP.chainId,

              chainName:
                "BNB Smart Chain",

              nativeCurrency: {
                name: "BNB",
                symbol: "BNB",
                decimals: 18
              },

              rpcUrls: [
                WEB3SWAP.rpcUrl
              ],

              blockExplorerUrls: [
                WEB3SWAP.explorer
              ]

            }
          ]

        });

      } else {

        throw switchError;

      }

    }

    return true;

  } catch (error) {

    console.error(
      "BSC switch error:",
      error
    );

    showToast(
      "Please switch your wallet to BNB Smart Chain."
    );

    return false;

  }

}


/* =========================================================
   Connect wallet
   ========================================================= */

async function connectWallet() {

  if (!window.ethereum) {

    showToast(
      "No Web3 wallet detected. Open Web3Swap inside MetaMask or another EVM wallet."
    );

    return;

  }


  try {

    const accounts =
      await window.ethereum.request({

        method:
          "eth_requestAccounts"

      });


    if (
      !accounts ||
      !accounts.length
    ) {

      showToast(
        "No wallet account was selected."
      );

      return;

    }


    const onBSC =
      await switchToBSC();


    if (!onBSC) {
      return;
    }


    account =
      accounts[0];

    connected =
      true;


    $("connectWallet").textContent =
      shortAddress(account);


    $("swapBtn").textContent =
      "Enter amount";


    $("walletStatus").textContent =
      `Connected: ${shortAddress(account)}`;


    await refreshBalances();

    await updateQuote();


    showToast(
      "Wallet connected to BNB Smart Chain."
    );

  } catch (error) {

    console.error(
      "Wallet connection error:",
      error
    );

    showToast(
      "Wallet connection was cancelled or failed."
    );

  }

}


/* =========================================================
   RPC
   ========================================================= */

async function rpcCall(
  method,
  params = []
) {

  const response =
    await fetch(
      WEB3SWAP.rpcUrl,
      {

        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({

          jsonrpc: "2.0",

          id: Date.now(),

          method,

          params

        })

      }
    );


  if (!response.ok) {

    throw new Error(
      `RPC HTTP ${response.status}`
    );

  }


  const data =
    await response.json();


  if (data.error) {

    throw new Error(
      data.error.message ||
      "RPC error"
    );

  }


  return data.result;

}


/* =========================================================
   ABI helpers
   ========================================================= */

function encodeAddress(address) {

  return address
    .toLowerCase()
    .replace(/^0x/, "")
    .padStart(64, "0");

}


function encodeBalanceOf(address) {

  return (
    "0x70a08231" +
    encodeAddress(address)
  );

}


function encodeGetReserves() {

  return "0x0902f1ac";

}


function encodeToken0() {

  return "0x0dfe1681";

}


function encodeToken1() {

  return "0xd21220a7";

}


/* =========================================================
   Units
   ========================================================= */

function formatUnits(
  value,
  decimals,
  maxDecimals = 6
) {

  const negative =
    value < 0n;

  const abs =
    negative
      ? -value
      : value;


  const base =
    10n ** BigInt(decimals);


  const whole =
    abs / base;


  const fraction =
    abs % base;


  if (fraction === 0n) {

    return `${
      negative ? "-" : ""
    }${whole}`;

  }


  let fractionText =
    fraction
      .toString()
      .padStart(
        decimals,
        "0"
      );


  fractionText =
    fractionText
      .slice(
        0,
        maxDecimals
      )
      .replace(
        /0+$/,
        ""
      );


  return `${
    negative ? "-" : ""
  }${whole}.${fractionText}`;

}


function parseUnits(
  value,
  decimals
) {

  const cleaned =
    String(value)
      .trim()
      .replace(/,/g, "");


  if (
    !/^\d*\.?\d+$/.test(
      cleaned
    )
  ) {

    throw new Error(
      "Invalid amount"
    );

  }


  const [
    whole = "0",
    fraction = ""
  ] =
    cleaned.split(".");


  const padded =
    (
      fraction +
      "0".repeat(decimals)
    )
      .slice(
        0,
        decimals
      );


  return (
    BigInt(
      whole || "0"
    ) *
      (
        10n **
        BigInt(decimals)
      )
  ) +
    BigInt(
      padded || "0"
    );

}


/* =========================================================
   Balances
   ========================================================= */

async function getNativeBalance(
  address
) {

  const hex =
    await rpcCall(
      "eth_getBalance",
      [
        address,
        "latest"
      ]
    );

  return BigInt(hex);

}


async function getERC20Balance(
  tokenAddress,
  address
) {

  const data =
    await rpcCall(
      "eth_call",
      [
        {
          to:
            tokenAddress,

          data:
            encodeBalanceOf(
              address
            )
        },

        "latest"
      ]
    );


  return BigInt(data);

}


async function refreshBalances() {

  if (
    !connected ||
    !account
  ) {

    return;

  }


  try {

    if (
      paySymbol === "BNB"
    ) {

      const balance =
        await getNativeBalance(
          account
        );


      $("payBalance").textContent =
        `Balance: ${
          formatUnits(
            balance,
            18,
            5
          )
        } BNB`;

    }

    else if (
      tokens[paySymbol] &&
      tokens[paySymbol].address
    ) {

      const balance =
        await getERC20Balance(
          tokens[paySymbol].address,
          account
        );


      $("payBalance").textContent =
        `Balance: ${
          formatUnits(
            balance,
            tokens[paySymbol].decimals,
            5
          )
        } ${paySymbol}`;

    }


    if (
      receiveSymbol === "BNB"
    ) {

      const balance =
        await getNativeBalance(
          account
        );


      $("receiveBalance").textContent =
        `Balance: ${
          formatUnits(
            balance,
            18,
            5
          )
        } BNB`;

    }

    else if (
      tokens[receiveSymbol] &&
      tokens[receiveSymbol].address
    ) {

      const balance =
        await getERC20Balance(
          tokens[receiveSymbol].address,
          account
        );


      $("receiveBalance").textContent =
        `Balance: ${
          formatUnits(
            balance,
            tokens[receiveSymbol].decimals,
            5
          )
        } ${receiveSymbol}`;

    }

  } catch (error) {

    console.error(
      "Balance error:",
      error
    );

    $("payBalance").textContent =
      "Balance: unavailable";

    $("receiveBalance").textContent =
      "Balance: unavailable";

  }

}


/* =========================================================
   PancakeSwap V2 reserves
   ========================================================= */

async function getPairReserves() {

  const [
    reservesHex,
    token0,
    token1
  ] =
    await Promise.all([

      rpcCall(
        "eth_call",
        [
          {
            to:
              WEB3SWAP.pair,

            data:
              encodeGetReserves()
          },

          "latest"
        ]
      ),

      rpcCall(
        "eth_call",
        [
          {
            to:
              WEB3SWAP.pair,

            data:
              encodeToken0()
          },

          "latest"
        ]
      ),

      rpcCall(
        "eth_call",
        [
          {
            to:
              WEB3SWAP.pair,

            data:
              encodeToken1()
          },

          "latest"
        ]
      )

    ]);


  const reserve0 =
    BigInt(
      "0x" +
      reservesHex.slice(
        2,
        66
      )
    );


  const reserve1 =
    BigInt(
      "0x" +
      reservesHex.slice(
        66,
        130
      )
    );


  return {

    reserve0,

    reserve1,

    token0:
      "0x" +
      token0.slice(-40),

    token1:
      "0x" +
      token1.slice(-40)

  };

}


/* =========================================================
   Amount out calculation
   ========================================================= */

function calculateAmountOut(
  amountIn,
  reserveIn,
  reserveOut
) {

  if (
    amountIn <= 0n
  ) {

    return 0n;

  }


  if (
    reserveIn <= 0n ||
    reserveOut <= 0n
  ) {

    return 0n;

  }


  const amountInWithFee =
    amountIn *
    WEB3SWAP.feeNumerator;


  return (
    amountInWithFee *
    reserveOut
  ) /
  (
    reserveIn *
    WEB3SWAP.feeDenominator +
    amountInWithFee
  );

}


/* =========================================================
   BNB -> USDT quote
   ========================================================= */

async function getBNBToUSDTQuote(
  amountInBNB
) {

  const amountIn =
    parseUnits(
      amountInBNB,
      18
    );


  const pair =
    await getPairReserves();


  const token0 =
    pair.token0.toLowerCase();


  const token1 =
    pair.token1.toLowerCase();


  const wbnb =
    WEB3SWAP.wbnb.toLowerCase();


  const usdt =
    WEB3SWAP.usdt.toLowerCase();


  let reserveWBNB;

  let reserveUSDT;


  if (
    token0 === wbnb &&
    token1 === usdt
  ) {

    reserveWBNB =
      pair.reserve0;

    reserveUSDT =
      pair.reserve1;

  }

  else if (
    token0 === usdt &&
    token1 === wbnb
  ) {

    reserveUSDT =
      pair.reserve0;

    reserveWBNB =
      pair.reserve1;

  }

  else {

    throw new Error(
      "Unexpected WBNB/USDT pair tokens."
    );

  }


  const amountOut =
    calculateAmountOut(
      amountIn,
      reserveWBNB,
      reserveUSDT
    );


  return {

    amountIn,

    amountOut,

    reserveWBNB,

    reserveUSDT

  };

}


/* =========================================================
   Quote
   ========================================================= */

async function updateQuote() {

  clearTimeout(
    quoteTimer
  );


  quoteTimer =
    setTimeout(
      async () => {

        const amountText =
          $("payAmount")
            .value
            .trim();


        if (!connected) {

          $("rateText").textContent =
            "Connect wallet to get a real quote";

          $("receiveAmount").value =
            "";

          $("swapBtn").textContent =
            "Connect Wallet";

          return;

        }


        if (
          !amountText ||
          Number(amountText) <= 0
        ) {

          $("rateText").textContent =
            "Enter an amount to get a live quote";

          $("receiveAmount").value =
            "";

          $("swapBtn").textContent =
            "Enter amount";

          return;

        }


        if (
          paySymbol === "BNB" &&
          receiveSymbol === "USDT"
        ) {

          try {

            $("rateText").textContent =
              "Fetching live BNB/USDT price…";


            $("receiveAmount").value =
              "";


            $("swapBtn").disabled =
              true;


            $("swapBtn").textContent =
              "Getting quote…";


            const quote =
              await getBNBToUSDTQuote(
                amountText
              );


            const output =
              formatUnits(
                quote.amountOut,
                18,
                6
              );


            const inputNumber =
              Number(
                amountText
              );


            const outputNumber =
              Number(
                output
              );


            const rate =
              inputNumber > 0
                ? outputNumber /
                  inputNumber
                : 0;


            $("receiveAmount").value =
              output;


            $("rateText").textContent =
              `1 BNB ≈ ${
                rate.toFixed(4)
              } USDT`;


            $("swapBtn").textContent =
              "Swap";


            $("swapBtn").disabled =
              false;


            refreshBalances();


          } catch (error) {

            console.error(
              "Quote error:",
              error
            );


            $("receiveAmount").value =
              "";


            $("rateText").textContent =
              "Live quote unavailable";


            $("swapBtn").textContent =
              "Try again";


            $("swapBtn").disabled =
              false;


            showToast(
              "Could not read the live BNB/USDT pool."
            );

          }


          return;

        }


        $("receiveAmount").value =
          "";


        $("rateText").textContent =
          "Live routing for this pair will be added next.";


        $("swapBtn").textContent =
          "Swap";


        $("swapBtn").disabled =
          false;

      },

      250
    );

}


/* =========================================================
   Swap
   ========================================================= */

async function handleSwap() {

  if (!connected) {

    await connectWallet();

    return;

  }


  const amount =
    $("payAmount")
      .value
      .trim();


  if (
    !amount ||
    Number(amount) <= 0
  ) {

    showToast(
      "Enter an amount first."
    );

    return;

  }


  showToast(
    "Live quote is working. Real swap execution will be added next."
  );

}


/* =========================================================
   Flip
   ========================================================= */

function flipTokens() {

  [
    paySymbol,
    receiveSymbol
  ] =
  [
    receiveSymbol,
    paySymbol
  ];


  renderTokenButton(
    "payToken",
    paySymbol
  );


  renderTokenButton(
    "receiveToken",
    receiveSymbol
  );


  if (connected) {

    refreshBalances();

  }


  updateQuote();

}


/* =========================================================
   Wallet events
   ========================================================= */

function setupWalletEvents() {

  if (!window.ethereum) {

    return;

  }


  window.ethereum.on(
    "accountsChanged",
    async (accounts) => {

      if (
        !accounts ||
        !accounts.length
      ) {

        connected =
          false;

        account =
          null;


        $("connectWallet").textContent =
          "Connect Wallet";


        $("swapBtn").textContent =
          "Connect Wallet";


        $("walletStatus").textContent =
          "Wallet not connected";


        $("payBalance").textContent =
          "Balance: —";


        $("receiveBalance").textContent =
          "Balance: —";


        $("receiveAmount").value =
          "";


        $("rateText").textContent =
          "Connect wallet to get a real quote";


        return;

      }


      account =
        accounts[0];

      connected =
        true;


      $("connectWallet").textContent =
        shortAddress(account);


      $("walletStatus").textContent =
        `Connected: ${shortAddress(account)}`;


      await refreshBalances();

      updateQuote();

    }
  );


  window.ethereum.on(
    "chainChanged",
    () => {

      window.location.reload();

    }
  );

}


/* =========================================================
   Events
   ========================================================= */

if ($("connectWallet")) {

  $("connectWallet").onclick =
    connectWallet;

}


if ($("swapBtn")) {

  $("swapBtn").onclick =
    handleSwap;

}


if ($("payAmount")) {

  $("payAmount").addEventListener(
    "input",
    updateQuote
  );

}


if ($("payToken")) {

  $("payToken").onclick =
    () => openTokenModal("pay");

}


if ($("receiveToken")) {

  $("receiveToken").onclick =
    () => openTokenModal("receive");

}


if ($("flipBtn")) {

  $("flipBtn").onclick =
    flipTokens;

}


if ($("closeModal")) {

  $("closeModal").onclick =
    () => {

      $("tokenModal")
        .classList
        .add("hidden");

    };

}


if ($("tokenModal")) {

  $("tokenModal").addEventListener(
    "click",
    (event) => {

      if (
        event.target.id ===
        "tokenModal"
      ) {

        $("tokenModal")
          .classList
          .add("hidden");

      }

    }
  );

}


if ($("slippageBtn")) {

  $("slippageBtn").onclick =
    () => {

      showToast(
        "Current slippage setting: 0.50%"
      );

    };

}


if ($("settingsBtn")) {

  $("settingsBtn").onclick =
    () => {

      showToast(
        "Advanced swap settings will be added later."
      );

    };

}


/* =========================================================
   Start
   ========================================================= */

renderTokenButton(
  "payToken",
  paySymbol
);


renderTokenButton(
  "receiveToken",
  receiveSymbol
);


setupWalletEvents();
