"use strict";

/*
=========================================================
 Web3Swap MVP
 BNB Smart Chain Mainnet
 PancakeSwap V2
 REAL BNB → USDT SWAP
=========================================================
*/

const BSC_CHAIN_ID = "0x38";

/*
---------------------------------------------------------
 PancakeSwap V2 Router
---------------------------------------------------------
*/
const PANCAKE_ROUTER =
  "0x10ED43C718714eb63d5aA57B78B54704E256024E";

/*
---------------------------------------------------------
 BSC Mainnet Tokens
---------------------------------------------------------
*/

// USDT BEP-20
const USDT_ADDRESS =
  "0x55d398326f99059ff775485246999027B3197955";

// WBNB
const WBNB_ADDRESS =
  "0xBB4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";

/*
---------------------------------------------------------
 Settings
---------------------------------------------------------
*/

// Maximum amount for first Mainnet testing
const MAX_TEST_BNB = 0.01;

// Slippage tolerance
// 0.5 = 0.5%
const SLIPPAGE_PERCENT = 0.5;

// Transaction deadline
// 20 minutes
const DEADLINE_MINUTES = 20;

/*
---------------------------------------------------------
 Router ABI
---------------------------------------------------------
*/

const PANCAKE_ROUTER_ABI = [

  /*
  getAmountsOut
  */

  {
    name: "getAmountsOut",

    type: "function",

    stateMutability: "view",

    inputs: [

      {
        name: "amountIn",
        type: "uint256"
      },

      {
        name: "path",
        type: "address[]"
      }

    ],

    outputs: [

      {
        name: "amounts",
        type: "uint256[]"
      }

    ]
  },

  /*
  swapExactETHForTokens
  */

  {
    name: "swapExactETHForTokens",

    type: "function",

    stateMutability: "payable",

    inputs: [

      {
        name: "amountOutMin",
        type: "uint256"
      },

      {
        name: "path",
        type: "address[]"
      },

      {
        name: "to",
        type: "address"
      },

      {
        name: "deadline",
        type: "uint256"
      }

    ],

    outputs: [

      {
        name: "amounts",
        type: "uint256[]"
      }

    ]
  }

];

/*
---------------------------------------------------------
 ERC-20 ABI
---------------------------------------------------------
*/

const ERC20_ABI = [

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

/*
---------------------------------------------------------
 Elements
---------------------------------------------------------
*/

const payInput =
  document.getElementById("payAmount");

const receiveInput =
  document.getElementById("receiveAmount");

const connectBtn =
  document.getElementById("connectWalletBtn");

const actionBtn =
  document.getElementById("actionBtn");

const bnbBalance =
  document.getElementById("bnbBalance");

const reverseSwapBtn =
  document.getElementById("reverseSwapBtn");

/*
---------------------------------------------------------
 State
---------------------------------------------------------
*/

let currentAccount = null;

let currentChainId = null;

let swapDirection = "BNB_USDT";

let quoteInProgress = false;

/*
---------------------------------------------------------
 Provider
---------------------------------------------------------
*/

function getProvider() {

  if (
    typeof window.ethereum ===
    "undefined"
  ) {

    alert(
      "لم يتم العثور على محفظة Web3 مثل MetaMask أو Trust Wallet."
    );

    return null;
  }

  return window.ethereum;
}

/*
---------------------------------------------------------
 Check BSC Mainnet
---------------------------------------------------------
*/

async function checkNetwork() {

  const provider =
    getProvider();

  if (!provider) {
    return false;
  }

  try {

    currentChainId =
      await provider.request({
        method: "eth_chainId"
      });

    if (
      currentChainId !==
      BSC_CHAIN_ID
    ) {

      alert(
        "يرجى اختيار BNB Smart Chain Mainnet في محفظتك."
      );

      return false;
    }

    return true;

  } catch (error) {

    console.error(
      "Network check error:",
      error
    );

    alert(
      "تعذر التحقق من شبكة BNB Smart Chain."
    );

    return false;
  }
}

/*
---------------------------------------------------------
 Format BNB Balance
---------------------------------------------------------
*/

function formatBNBFromWei(
  weiHex
) {

  try {

    const wei =
      BigInt(weiHex);

    const whole =
      wei /
      BigInt("1000000000000000000");

    const fraction =
      wei %
      BigInt("1000000000000000000");

    const fractionText =
      fraction
        .toString()
        .padStart(18, "0")
        .slice(0, 4);

    return (
      whole.toString() +
      "." +
      fractionText
    );

  } catch (error) {

    return "0.0000";
  }
}

/*
---------------------------------------------------------
 Get BNB Balance
---------------------------------------------------------
*/

async function updateBNBBalance(
  account
) {

  const provider =
    getProvider();

  if (
    !provider ||
    !account ||
    !bnbBalance
  ) {

    return;
  }

  try {

    const balance =
      await provider.request({

        method:
          "eth_getBalance",

        params: [
          account,
          "latest"
        ]

      });

    bnbBalance.innerText =
      "BNB " +
      formatBNBFromWei(
        balance
      );

  } catch (error) {

    console.error(
      "Balance error:",
      error
    );

    bnbBalance.innerText =
      "تعذر قراءة الرصيد";
  }
}

/*
---------------------------------------------------------
 Short Address
---------------------------------------------------------
*/

function shortAddress(
  address
) {

  if (!address) {
    return "";
  }

  return (
    address.substring(0, 6) +
    "..." +
    address.substring(
      address.length - 4
    )
  );
}

/*
---------------------------------------------------------
 Connect Wallet
---------------------------------------------------------
*/

async function handleWalletConnection() {

  const provider =
    getProvider();

  if (!provider) {
    return;
  }

  try {

    /*
    First verify BSC Mainnet.
    */

    const networkOK =
      await checkNetwork();

    if (!networkOK) {
      return;
    }

    /*
    Request wallet.
    */

    const accounts =
      await provider.request({

        method:
          "eth_requestAccounts"

      });

    if (
      !accounts ||
      accounts.length === 0
    ) {

      return;
    }

    currentAccount =
      accounts[0];

    if (connectBtn) {

      connectBtn.innerText =
        shortAddress(
          currentAccount
        );
    }

    if (actionBtn) {

      actionBtn.innerText =
        "Swap";
    }

    await updateBNBBalance(
      currentAccount
    );

    /*
    If there is already an amount,
    immediately obtain real quote.
    */

    await calculateSwap();

  } catch (error) {

    console.error(
      "Wallet connection error:",
      error
    );

    if (
      error &&
      error.code === 4001
    ) {

      alert(
        "تم رفض اتصال المحفظة."
      );

    } else {

      alert(
        "حدث خطأ أثناء الاتصال بالمحفظة."
      );
    }
  }
}

/*
---------------------------------------------------------
 Convert decimal BNB to Wei
---------------------------------------------------------
*/

function bnbToWei(
  amount
) {

  const value =
    String(amount);

  if (
    !/^\d+(\.\d+)?$/.test(value)
  ) {

    throw new Error(
      "Invalid BNB amount"
    );
  }

  const parts =
    value.split(".");

  const whole =
    parts[0];

  let decimals =
    parts[1] || "";

  if (
    decimals.length > 18
  ) {

    throw new Error(
      "BNB amount has more than 18 decimals."
    );
  }

  decimals =
    decimals
      .padEnd(18, "0");

  return BigInt(
    whole + decimals
  );
}

/*
---------------------------------------------------------
 Format USDT
---------------------------------------------------------
*/

function formatUSDT(
  amountWei
) {

  const value =
    BigInt(amountWei);

  const decimals =
    BigInt(18);

  const whole =
    value /
    BigInt(10) ** decimals;

  const fraction =
    value %
    (BigInt(10) ** decimals);

  const fractionText =
    fraction
      .toString()
      .padStart(18, "0")
      .slice(0, 2);

  return (
    whole.toString() +
    "." +
    fractionText
  );
}

/*
---------------------------------------------------------
 Calculate amountOutMin
---------------------------------------------------------
*/

function calculateMinimumOutput(
  quotedAmount
) {

  /*
    Example:

    Quote = 600 USDT

    Slippage = 0.5%

    Minimum =
    600 × 99.5%
  */

  const quote =
    BigInt(quotedAmount);

  const slippageBps =
    BigInt(
      Math.round(
        SLIPPAGE_PERCENT * 100
      )
    );

  const denominator =
    BigInt(10000);

  return (
    quote *
    (
      denominator -
      slippageBps
    )
  ) /
  denominator;
}

/*
---------------------------------------------------------
 Get Real PancakeSwap Quote
---------------------------------------------------------
*/

async function getRealQuote(
  amountWei
) {

  const provider =
    getProvider();

  if (
    !provider ||
    !amountWei ||
    amountWei <= 0n
  ) {

    return null;
  }

  try {

    /*
    Create contract interface manually
    using eth_call.
    */

    const iface =
      encodeGetAmountsOutCall(
        amountWei
      );

    const result =
      await provider.request({

        method:
          "eth_call",

        params: [

          {
            to:
              PANCAKE_ROUTER,

            data:
              iface
          },

          "latest"

        ]

      });

    const amounts =
      decodeUintArray(
        result
      );

    if (
      amounts.length < 2
    ) {

      throw new Error(
        "Invalid PancakeSwap quote."
      );
    }

    return amounts;

  } catch (error) {

    console.error(
      "Quote error:",
      error
    );

    throw new Error(
      "تعذر الحصول على السعر الحقيقي من PancakeSwap. تأكد من وجود سيولة لزوج BNB/USDT."
    );
  }
}

/*
---------------------------------------------------------
 ABI Encoder: getAmountsOut
---------------------------------------------------------
*/

function encodeGetAmountsOutCall(
  amountWei
) {

  /*
    Function selector:

    getAmountsOut(uint256,address[])
  */

  const selector =
    "d06ca61f";

  /*
    ABI layout:

    amountIn
    offset to address array
    array length
    address WBNB
    address USDT
  */

  const amount =
    amountWei
      .toString(16)
      .padStart(64, "0");

  const offset =
    BigInt(64)
      .toString(16)
      .padStart(64, "0");

  const length =
    BigInt(2)
      .toString(16)
      .padStart(64, "0");

  const wbnb =
    WBNB_ADDRESS
      .replace("0x", "")
      .toLowerCase()
      .padStart(64, "0");

  const usdt =
    USDT_ADDRESS
      .replace("0x", "")
      .toLowerCase()
      .padStart(64, "0");

  return (
    "0x" +
    selector +
    amount +
    offset +
    length +
    wbnb +
    usdt
  );
}

/*
---------------------------------------------------------
 Decode uint256[]
---------------------------------------------------------
*/

function decodeUintArray(
  hex
) {

  if (
    !hex ||
    hex === "0x"
  ) {

    throw new Error(
      "Empty RPC response."
    );
  }

  const clean =
    hex.replace(
      "0x",
      ""
    );

  /*
    Dynamic array return format:

    offset
    length
    values...
  */

  const offset =
    Number(
      BigInt(
        "0x" +
        clean.slice(0, 64)
      )
    );

  const offsetHex =
    offset * 2;

  const length =
    Number(
      BigInt(
        "0x" +
        clean.slice(
          offsetHex,
          offsetHex + 64
        )
      )
    );

  const values = [];

  let position =
    offsetHex + 64;

  for (
    let i = 0;
    i < length;
    i++
  ) {

    const value =
      BigInt(
        "0x" +
        clean.slice(
          position,
          position + 64
        )
      );

    values.push(value);

    position += 64;
  }

  return values;
}

/*
---------------------------------------------------------
 Calculate Real Swap
---------------------------------------------------------
*/

async function calculateSwap() {

  if (
    !payInput ||
    !receiveInput
  ) {

    return;
  }

  const value =
    payInput.value.trim();

  if (
    value === ""
  ) {

    receiveInput.value = "";

    return;
  }

  const amount =
    Number(value);

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {

    receiveInput.value = "";

    return;
  }

  /*
  Only BNB → USDT is enabled.
  */

  if (
    swapDirection !==
    "BNB_USDT"
  ) {

    receiveInput.value =
      "غير متاح حاليًا";

    return;
  }

  /*
  Prevent multiple quote requests.
  */

  if (quoteInProgress) {
    return;
  }

  try {

    quoteInProgress = true;

    receiveInput.value =
      "جاري الحصول على السعر...";

    const amountWei =
      bnbToWei(
        value
      );

    const amounts =
      await getRealQuote(
        amountWei
      );

    const outputWei =
      amounts[
        amounts.length - 1
      ];

    receiveInput.value =
      formatUSDT(
        outputWei
      );

  } catch (error) {

    console.error(
      "Calculate swap error:",
      error
    );

    receiveInput.value =
      "تعذر الحصول على السعر";

  } finally {

    quoteInProgress = false;
  }
}

/*
---------------------------------------------------------
 Reverse Swap
---------------------------------------------------------
*/

function reverseSwap() {

  /*
    The reverse direction is intentionally
    disabled in this MVP.
  */

  alert(
    "النسخة الحالية تدعم BNB → USDT فقط. سيتم إضافة USDT → BNB في الخطوة التالية."
  );
}

/*
---------------------------------------------------------
 Build swap transaction
---------------------------------------------------------
*/

function encodeSwapExactETHForTokens(
  amountOutMin,
  path,
  to,
  deadline
) {

  /*
    Function:

    swapExactETHForTokens(
      uint256,
      address[],
      address,
      uint256
    )

    Selector:
    7ff36ab5
  */

  const selector =
    "7ff36ab5";

  /*
    ABI head:

    amountOutMin
    offset path
    to
    deadline
  */

  const amountMin =
    BigInt(amountOutMin)
      .toString(16)
      .padStart(64, "0");

  const pathOffset =
    BigInt(128)
      .toString(16)
      .padStart(64, "0");

  const recipient =
    to
      .replace("0x", "")
      .toLowerCase()
      .padStart(64, "0");

  const deadlineHex =
    BigInt(deadline)
      .toString(16)
      .padStart(64, "0");

  /*
    Path:
    length = 2

    WBNB
    USDT
  */

  const pathLength =
    BigInt(path.length)
      .toString(16)
      .padStart(64, "0");

  let pathData =
    "";

  for (
    const address of path
  ) {

    pathData +=
      address
        .replace("0x", "")
        .toLowerCase()
        .padStart(64, "0");
  }

  return (
    "0x" +
    selector +
    amountMin +
    pathOffset +
    recipient +
    deadlineHex +
    pathLength +
    pathData
  );
}

/*
---------------------------------------------------------
 Start REAL Swap
---------------------------------------------------------
*/

async function startSwap() {

  const provider =
    getProvider();

  if (!provider) {
    return;
  }

  /*
  Check Mainnet.
  */

  const networkOK =
    await checkNetwork();

  if (!networkOK) {
    return;
  }

  /*
  Wallet must be connected.
  */

  if (!currentAccount) {

    await handleWalletConnection();

    return;
  }

  /*
  Only BNB → USDT.
  */

  if (
    swapDirection !==
    "BNB_USDT"
  ) {

    alert(
      "الاتجاه المتاح حاليًا هو BNB → USDT."
    );

    return;
  }

  /*
  Read amount.
  */

  const value =
    payInput.value.trim();

  const amount =
    Number(value);

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {

    alert(
      "أدخل كمية BNB صحيحة."
    );

    return;
  }

  /*
  Safety limit.
  */

  if (
    amount >
    MAX_TEST_BNB
  ) {

    alert(
      "لأول اختبار على Mainnet، الحد الأقصى هو " +
      MAX_TEST_BNB +
      " BNB."
    );

    return;
  }

  /*
  Convert to Wei.
  */

  let amountWei;

  try {

    amountWei =
      bnbToWei(
        value
      );

  } catch (error) {

    alert(
      "كمية BNB غير صحيحة."
    );

    return;
  }

  /*
  Read current balance.
  */

  let balanceWei;

  try {

    const balance =
      await provider.request({

        method:
          "eth_getBalance",

        params: [
          currentAccount,
          "latest"
        ]

      });

    balanceWei =
      BigInt(balance);

  } catch (error) {

    console.error(
      "Balance error:",
      error
    );

    alert(
      "تعذر قراءة رصيد BNB."
    );

    return;
  }

  /*
  Reserve BNB for gas.

  0.003 BNB reserve.
  */

  const gasReserve =
    bnbToWei(
      "0.003"
    );

  if (
    balanceWei <=
    amountWei +
    gasReserve
  ) {

    alert(
      "رصيد BNB غير كافٍ. اترك كمية إضافية لرسوم الشبكة."
    );

    return;
  }

  /*
  Get REAL PancakeSwap quote.
  */

  let amounts;

  try {

    actionBtn.innerText =
      "جاري قراءة السعر...";

    actionBtn.disabled =
      true;

    amounts =
      await getRealQuote(
        amountWei
      );

  } catch (error) {

    console.error(
      error
    );

    alert(
      error.message ||
      "تعذر الحصول على السعر الحقيقي."
    );

    actionBtn.disabled =
      false;

    actionBtn.innerText =
      "Swap";

    return;
  }

  const quotedOutput =
    amounts[
      amounts.length - 1
    ];

  /*
  Calculate minimum acceptable output
  using 0.5% slippage.
  */

  const amountOutMin =
    calculateMinimumOutput(
      quotedOutput
    );

  /*
  Deadline:
  current time + 20 minutes.
  */

  const deadline =
    Math.floor(
      Date.now() / 1000
    ) +
    DEADLINE_MINUTES *
    60;

  /*
  Swap path:

  BNB
   ↓
  WBNB
   ↓
  USDT
  */

  const path = [

    WBNB_ADDRESS,

    USDT_ADDRESS

  ];

  /*
  Create transaction data.
  */

  const data =
    encodeSwapExactETHForTokens(
      amountOutMin,
      path,
      currentAccount,
      deadline
    );

  /*
  Transaction.

  IMPORTANT:
  The BNB itself is sent as "value".
  PancakeSwap receives the BNB,
  wraps it into WBNB and swaps it.
  */

  const transaction = {

    from:
      currentAccount,

    to:
      PANCAKE_ROUTER,

    value:
      "0x" +
      amountWei
        .toString(16),

    data:
      data

  };

  try {

    actionBtn.innerText =
      "افتح المحفظة للتأكيد...";

    /*
    Wallet confirmation.
    */

    const txHash =
      await provider.request({

        method:
          "eth_sendTransaction",

        params: [
          transaction
        ]

      });

    console.log(
      "Swap transaction:",
      txHash
    );

    /*
    Show transaction.
    */

    alert(
      "تم إرسال معاملة Swap بنجاح.\n\n" +
      "Transaction Hash:\n" +
      txHash
    );

    /*
    Open BscScan.
    */

    window.open(
      "https://bscscan.com/tx/" +
      txHash,
      "_blank"
    );

    /*
    Update UI.
    */

    actionBtn.innerText =
      "تم إرسال Swap";

    /*
    Refresh balance after a short delay.
    */

    setTimeout(
      async function() {

        await updateBNBBalance(
          currentAccount
        );

        actionBtn.innerText =
          "Swap";

      },
      5000
    );

  } catch (error) {

    console.error(
      "Swap transaction error:",
      error
    );

    if (
      error &&
      error.code === 4001
    ) {

      alert(
        "تم إلغاء المعاملة من المحفظة."
      );

    } else {

      alert(
        "فشلت معاملة Swap:\n\n" +
        (
          error.message ||
          "خطأ غير معروف"
        )
      );
    }

    actionBtn.innerText =
      "Swap";

  } finally {

    actionBtn.disabled =
      false;
  }
}

/*
---------------------------------------------------------
 Wallet Events
---------------------------------------------------------
*/

if (
  typeof window.ethereum !==
  "undefined"
) {

  /*
  Account changed
  */

  window.ethereum.on(
    "accountsChanged",

    async function(accounts) {

      if (
        !accounts ||
        accounts.length === 0
      ) {

        currentAccount =
          null;

        if (connectBtn) {

          connectBtn.innerText =
            "ربط المحفظة";
        }

        if (actionBtn) {

          actionBtn.innerText =
            "ربط المحفظة للبدء";
        }

        if (bnbBalance) {

          bnbBalance.innerText =
            "—";
        }

        if (receiveInput) {

          receiveInput.value =
            "";
        }

        return;
      }

      currentAccount =
        accounts[0];

      if (connectBtn) {

        connectBtn.innerText =
          shortAddress(
            currentAccount
          );
      }

      if (actionBtn) {

        actionBtn.innerText =
          "Swap";
      }

      await updateBNBBalance(
        currentAccount
      );

      await calculateSwap();
    }
  );

  /*
  Chain changed
  */

  window.ethereum.on(
    "chainChanged",

    async function(chainId) {

      currentChainId =
        chainId;

      if (
        chainId !==
        BSC_CHAIN_ID
      ) {

        if (actionBtn) {

          actionBtn.disabled =
            true;
        }

        alert(
          "تم تغيير الشبكة. يرجى العودة إلى BNB Smart Chain Mainnet."
        );

        return;
      }

      if (actionBtn) {

        actionBtn.disabled =
          false;
      }

      if (currentAccount) {

        await updateBNBBalance(
          currentAccount
        );

        await calculateSwap();
      }
    }
  );
}

/*
---------------------------------------------------------
 Initial State
---------------------------------------------------------
*/

async function initialize() {

  const provider =
    getProvider();

  if (!provider) {
    return;
  }

  try {

    const accounts =
      await provider.request({

        method:
          "eth_accounts"

      });

    const chainId =
      await provider.request({

        method:
          "eth_chainId"

      });

    currentChainId =
      chainId;

    /*
    Existing wallet connection.
    */

    if (
      accounts &&
      accounts.length > 0 &&
      chainId ===
      BSC_CHAIN_ID
    ) {

      currentAccount =
        accounts[0];

      if (connectBtn) {

        connectBtn.innerText =
          shortAddress(
            currentAccount
          );
      }

      if (actionBtn) {

        actionBtn.innerText =
          "Swap";
      }

      await updateBNBBalance(
        currentAccount
      );

      await calculateSwap();

    } else {

      if (actionBtn) {

        actionBtn.innerText =
          "ربط المحفظة للبدء";
      }
    }

  } catch (error) {

    console.error(
      "Initialization error:",
      error
    );
  }
}

/*
---------------------------------------------------------
 Input Event
---------------------------------------------------------
*/

if (payInput) {

  payInput.addEventListener(
    "input",
    calculateSwap
  );
}

/*
---------------------------------------------------------
 Connect Event
---------------------------------------------------------
*/

if (connectBtn) {

  connectBtn.addEventListener(
    "click",
    handleWalletConnection
  );
}

/*
---------------------------------------------------------
 Swap Event
---------------------------------------------------------
*/

if (actionBtn) {

  actionBtn.addEventListener(
    "click",
    startSwap
  );
}

/*
---------------------------------------------------------
 Reverse Event
---------------------------------------------------------
*/

if (reverseSwapBtn) {

  reverseSwapBtn.addEventListener(
    "click",
    reverseSwap
  );
}

/*
---------------------------------------------------------
 Start
---------------------------------------------------------
*/

initialize();
