"use strict";

/*
=========================================================
 Web3Swap MVP
 BNB Smart Chain Mainnet
 PancakeSwap V2
=========================================================
*/

const BSC_CHAIN_ID = "0x38";

const PANCAKE_ROUTER =
  "0x10ED43C718714eb63d5aA57B78B54704E256024E";

const USDT_ADDRESS =
  "0x55d398326f99059ff775485246999027B3197955";

const WBNB_ADDRESS =
  "0xBB4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";

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

/*
---------------------------------------------------------
 Provider
---------------------------------------------------------
*/

function getProvider() {

  if (typeof window.ethereum === "undefined") {

    alert(
      "لم يتم العثور على محفظة Web3."
    );

    return null;
  }

  return window.ethereum;
}

/*
---------------------------------------------------------
 Check BNB Mainnet
---------------------------------------------------------
*/

async function checkNetwork() {

  const provider = getProvider();

  if (!provider) return false;

  try {

    currentChainId =
      await provider.request({
        method: "eth_chainId"
      });

    if (currentChainId !== BSC_CHAIN_ID) {

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

    return false;
  }
}

/*
---------------------------------------------------------
 Get BNB Balance
---------------------------------------------------------
*/

async function updateBNBBalance(account) {

  const provider = getProvider();

  if (!provider || !account) return;

  try {

    const balance =
      await provider.request({
        method: "eth_getBalance",
        params: [
          account,
          "latest"
        ]
      });

    const balanceBNB =
      Number(
        BigInt(balance)
      ) /
      1e18;

    bnbBalance.innerText =
      "BNB " +
      balanceBNB.toFixed(4);

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

function shortAddress(address) {

  if (!address) return "";

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

  const provider = getProvider();

  if (!provider) return;

  try {

    const networkOK =
      await checkNetwork();

    if (!networkOK) return;

    const accounts =
      await provider.request({
        method: "eth_requestAccounts"
      });

    if (
      !accounts ||
      accounts.length === 0
    ) {

      return;
    }

    currentAccount =
      accounts[0];

    connectBtn.innerText =
      shortAddress(
        currentAccount
      );

    actionBtn.innerText =
      "Swap";

    await updateBNBBalance(
      currentAccount
    );

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
 Calculate Amount
---------------------------------------------------------
*/

function calculateSwap() {

  const value =
    parseFloat(
      payInput.value
    );

  if (
    Number.isNaN(value) ||
    value <= 0
  ) {

    receiveInput.value = "";

    return;
  }

  /*
    هذا سعر عرض MVP فقط.
    السعر الحقيقي سيتم أخذه من Router
    قبل تنفيذ المعاملة.
  */

  const displayRate = 600;

  if (
    swapDirection ===
    "BNB_USDT"
  ) {

    receiveInput.value =
      (value * displayRate)
      .toFixed(2);

  } else {

    receiveInput.value =
      (value / displayRate)
      .toFixed(6);
  }
}

/*
---------------------------------------------------------
 Swap Direction
---------------------------------------------------------
*/

function reverseSwap() {

  if (
    swapDirection ===
    "BNB_USDT"
  ) {

    swapDirection =
      "USDT_BNB";

  } else {

    swapDirection =
      "BNB_USDT";
  }

  calculateSwap();
}

/*
---------------------------------------------------------
 Prepare Real Swap
---------------------------------------------------------
*/

async function startSwap() {

  const provider = getProvider();

  if (!provider) return;

  /*
    First check network.
  */

  const networkOK =
    await checkNetwork();

  if (!networkOK) return;

  /*
    Wallet must be connected.
  */

  if (!currentAccount) {

    await handleWalletConnection();

    return;
  }

  /*
    Only BNB -> USDT is enabled
    in this MVP version.
  */

  if (
    swapDirection !==
    "BNB_USDT"
  ) {

    alert(
      "في نسخة MVP الحالية، الاتجاه المتاح هو BNB → USDT."
    );

    return;
  }

  const amount =
    parseFloat(
      payInput.value
    );

  if (
    Number.isNaN(amount) ||
    amount <= 0
  ) {

    alert(
      "أدخل كمية BNB صحيحة."
    );

    return;
  }

  /*
    Safety limit for the first test.
    Change later after successful testing.
  */

  if (amount > 0.01) {

    alert(
      "لأول اختبار على Mainnet، الحد الأقصى هو 0.01 BNB."
    );

    return;
  }

  /*
    Convert BNB to wei.
  */

  const weiAmount =
    BigInt(
      Math.floor(
        amount * 1e18
      )
    );

  /*
    Read current wallet balance.
  */

  const balance =
    await provider.request({
      method: "eth_getBalance",
      params: [
        currentAccount,
        "latest"
      ]
    });

  const balanceWei =
    BigInt(balance);

  /*
    Leave some BNB for gas.
  */

  const gasReserve =
    BigInt(
      "3000000000000000"
    );

  if (
    balanceWei <=
    weiAmount + gasReserve
  ) {

    alert(
      "رصيد BNB غير كافٍ لإجراء Swap ودفع رسوم الشبكة."
    );

    return;
  }

  /*
    IMPORTANT:
    We do NOT automatically execute the
    real PancakeSwap transaction yet.

    The next step is to obtain:
      getAmountsOut()
      amountOutMin
      deadline
    and then construct the Router transaction.
  */

  alert(
    "تم فحص المحفظة والشبكة والرصيد بنجاح.\n\n" +
    "Web3Swap جاهز للخطوة التالية:\n" +
    "قراءة السعر الحقيقي من PancakeSwap ثم تنفيذ Swap."
  );
}

/*
---------------------------------------------------------
 Events
---------------------------------------------------------
*/

if (payInput) {

  payInput.addEventListener(
    "input",
    calculateSwap
  );
}

if (connectBtn) {

  connectBtn.addEventListener(
    "click",
    handleWalletConnection
  );
}

if (actionBtn) {

  actionBtn.addEventListener(
    "click",
    startSwap
  );
}

if (reverseSwapBtn) {

  reverseSwapBtn.addEventListener(
    "click",
    reverseSwap
  );
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

  window.ethereum.on(
    "accountsChanged",
    async function(accounts) {

      if (
        !accounts ||
        accounts.length === 0
      ) {

        currentAccount = null;

        connectBtn.innerText =
          "ربط المحفظة";

        actionBtn.innerText =
          "ربط المحفظة للبدء";

        bnbBalance.innerText =
          "—";

        return;
      }

      currentAccount =
        accounts[0];

      connectBtn.innerText =
        shortAddress(
          currentAccount
        );

      actionBtn.innerText =
        "Swap";

      await updateBNBBalance(
        currentAccount
      );
    }
  );

  window.ethereum.on(
    "chainChanged",
    async function(chainId) {

      currentChainId =
        chainId;

      if (
        chainId !== BSC_CHAIN_ID
      ) {

        alert(
          "تم تغيير الشبكة. يرجى اختيار BNB Smart Chain Mainnet."
        );

        return;
      }

      if (currentAccount) {

        await updateBNBBalance(
          currentAccount
        );
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

  const provider = getProvider();

  if (!provider) return;

  try {

    const accounts =
      await provider.request({
        method: "eth_accounts"
      });

    const chainId =
      await provider.request({
        method: "eth_chainId"
      });

    currentChainId =
      chainId;

    if (
      accounts &&
      accounts.length > 0 &&
      chainId === BSC_CHAIN_ID
    ) {

      currentAccount =
        accounts[0];

      connectBtn.innerText =
        shortAddress(
          currentAccount
        );

      actionBtn.innerText =
        "Swap";

      await updateBNBBalance(
        currentAccount
      );
    }

  } catch (error) {

    console.error(
      "Initialization error:",
      error
    );
  }
}

initialize();
