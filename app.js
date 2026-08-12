(() => {
  "use strict";

  const connectBtn = document.getElementById("connectWallet");
  const swapBtn = document.getElementById("swapButton");
  const payAmount = document.getElementById("payAmount");
  const receiveAmount = document.getElementById("receiveAmount");
  const rateEl = document.getElementById("rate");
  const switchBtn = document.getElementById("switchTokens");

  let connected = false;
  let reversed = false;

  // Demo rate for the UI only. Real quotes will be connected later.
  const DEMO_RATE = 620;

  function updateQuote() {
    const amount = Number(payAmount.value || 0);
    receiveAmount.value = amount ? (reversed ? (amount / DEMO_RATE).toFixed(6) : (amount * DEMO_RATE).toFixed(4)) : "";
    rateEl.textContent = reversed ? `1 USDT ≈ ${(1 / DEMO_RATE).toFixed(6)} BNB` : `1 BNB ≈ ${DEMO_RATE} USDT`;
  }

  connectBtn.addEventListener("click", async () => {
    if (!window.ethereum) {
      alert("MetaMask was not detected. Please install a Web3 wallet.");
      return;
    }

    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      connected = true;
      connectBtn.textContent = "Wallet Connected";
      swapBtn.textContent = "Swap";
    } catch (error) {
      console.error(error);
    }
  });

  switchBtn.addEventListener("click", () => {
    reversed = !reversed;
    document.querySelectorAll(".token-select")[0].firstChild.textContent = reversed ? "USDT " : "BNB ";
    document.querySelectorAll(".token-select")[1].firstChild.textContent = reversed ? "BNB " : "USDT ";
    updateQuote();
  });

  payAmount.addEventListener("input", updateQuote);

  swapBtn.addEventListener("click", () => {
    if (!connected) {
      connectBtn.click();
      return;
    }
    alert("Swap execution will be connected after the wallet and BNB Smart Chain testnet integration.");
  });

  updateQuote();
})();
