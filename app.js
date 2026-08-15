/* =========================================================
   Web3Swap MVP
   app.js
   BNB Smart Chain Mainnet
   BNB -> USDT
   PancakeSwap V2
   ========================================================= */

"use strict";

/* =========================================================
   CONFIG
========================================================= */

const CONFIG = {

    CHAIN_ID: 56,
    CHAIN_ID_HEX: "0x38",

    NETWORK_NAME: "BNB Smart Chain",

    RPC_URL:
        "https://bsc-dataseed.bnbchain.org",

    EXPLORER:
        "https://bscscan.com/tx/",

    ROUTER:
        "0x10ED43C718714eb63d5aA57B78B54704E256024E",

    WBNB:
        "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",

    USDT:
        "0x55d398326f99059fF775485246999027B3197955",

    USDT_DECIMALS: 18,

    SLIPPAGE:
        0.005,

    DEADLINE_MINUTES:
        20

};


/* =========================================================
   GLOBALS
========================================================= */

let provider = null;
let signer = null;
let userAddress = null;

let ethersLoaded = false;


/* =========================================================
   DOM
========================================================= */

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


/* =========================================================
   LOAD ETHERS
========================================================= */

async function loadEthers() {

    if (window.ethers) {

        ethersLoaded = true;

        return true;
    }


    return new Promise((resolve, reject) => {

        const script =
            document.createElement("script");

        script.src =
            "https://cdn.jsdelivr.net/npm/ethers@6.15.0/dist/ethers.umd.min.js";

        script.onload = function () {

            if (window.ethers) {

                ethersLoaded = true;

                resolve(true);

            } else {

                reject(
                    new Error(
                        "Ethers library failed to load."
                    )
                );

            }

        };

        script.onerror = function () {

            reject(
                new Error(
                    "Could not load ethers library."
                )
            );

        };

        document.head.appendChild(script);

    });

}


/* =========================================================
   CHECK WALLET
========================================================= */

function walletAvailable() {

    return (
        typeof window.ethereum !==
        "undefined"
    );

}


/* =========================================================
   FORMAT ADDRESS
========================================================= */

function shortAddress(address) {

    if (!address) {

        return "—";

    }

    return (
        address.substring(0, 6) +
        "..." +
        address.substring(
            address.length - 4
        )
    );

}


/* =========================================================
   CHECK NETWORK
========================================================= */

async function getChainId() {

    const chainId =
        await window.ethereum.request({
            method: "eth_chainId"
        });

    return parseInt(
        chainId,
        16
    );

}


/* =========================================================
   SWITCH TO BNB MAINNET
========================================================= */

async function switchToBNB() {

    try {

        await window.ethereum.request({

            method:
                "wallet_switchEthereumChain",

            params: [
                {
                    chainId:
                        CONFIG.CHAIN_ID_HEX
                }
            ]

        });

    } catch (error) {

        /*
         * 4902 = network not added
         */

        if (
            error &&
            error.code === 4902
        ) {

            await window.ethereum.request({

                method:
                    "wallet_addEthereumChain",

                params: [

                    {

                        chainId:
                            CONFIG.CHAIN_ID_HEX,

                        chainName:
                            CONFIG.NETWORK_NAME,

                        nativeCurrency: {

                            name:
                                "BNB",

                            symbol:
                                "BNB",

                            decimals:
                                18

                        },

                        rpcUrls: [
                            CONFIG.RPC_URL
                        ],

                        blockExplorerUrls: [
                            "https://bscscan.com"
                        ]

                    }

                ]

            });

        } else {

            throw error;

        }

    }

}


/* =========================================================
   CREATE PROVIDER
========================================================= */

async function createProvider() {

    if (!walletAvailable()) {

        throw new Error(
            "لم يتم العثور على محفظة Web3."
        );

    }


    await loadEthers();


    provider =
        new ethers.BrowserProvider(
            window.ethereum
        );


    signer =
        await provider.getSigner();


    userAddress =
        await signer.getAddress();


    return true;

}


/* =========================================================
   GET BNB BALANCE
========================================================= */

async function updateBNBBalance() {

    try {

        if (
            !provider ||
            !userAddress
        ) {

            return;

        }


        const balance =
            await provider.getBalance(
                userAddress
            );


        const formatted =
            ethers.formatEther(
                balance
            );


        bnbBalance.innerText =
            Number(formatted)
                .toFixed(4) +
            " BNB";

    } catch (error) {

        console.error(
            "Balance error:",
            error
        );

        bnbBalance.innerText =
            "—";

    }

}


/* =========================================================
   PANCAKESWAP ROUTER ABI
========================================================= */

const ROUTER_ABI = [

    "function WETH() external pure returns (address)",

    "function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts)",

    "function swapExactETHForTokens(uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external payable returns (uint256[] memory amounts)"

];


/* =========================================================
   UPDATE QUOTE
========================================================= */

async function updateQuote() {

    const value =
        payInput.value.trim();


    if (!value) {

        receiveInput.value =
            "";

        return;

    }


    let amount;

    try {

        amount =
            ethers.parseEther(
                value
            );

    } catch {

        receiveInput.value =
            "";

        return;

    }


    if (
        amount <= 0n
    ) {

        receiveInput.value =
            "";

        return;

    }


    try {

        if (!provider) {

            return;

        }


        const router =
            new ethers.Contract(

                CONFIG.ROUTER,

                ROUTER_ABI,

                provider

            );


        const path = [

            CONFIG.WBNB,

            CONFIG.USDT

        ];


        const amounts =
            await router.getAmountsOut(
                amount,
                path
            );


        const output =
            amounts[
                amounts.length - 1
            ];


        const formatted =
            ethers.formatUnits(
                output,
                CONFIG.USDT_DECIMALS
            );


        receiveInput.value =
            Number(formatted)
                .toFixed(2);


        updateRateDisplay(
            Number(formatted) /
            Number(value)
        );


    } catch (error) {

        console.error(
            "Quote error:",
            error
        );


        receiveInput.value =
            "";


        showMessage(
            "تعذر الحصول على سعر حالي من PancakeSwap. قد تكون السيولة أو الاتصال بالشبكة غير متاح حاليًا.",
            "error"
        );

    }

}


/* =========================================================
   UPDATE DISPLAYED RATE
========================================================= */

function updateRateDisplay(rate) {

    const rows =
        document.querySelectorAll(
            ".details-row"
        );


    rows.forEach(
        function (row) {

            const text =
                row.innerText;

            if (
                text.includes(
                    "سعر الصرف"
                )
            ) {

                const valueElement =
                    row.querySelector(
                        ".val"
                    );


                if (valueElement) {

                    valueElement.innerText =
                        "1 BNB ≈ " +
                        rate.toFixed(2) +
                        " USDT";

                }

            }

        }
    );

}


/* =========================================================
   WALLET CONNECTION
========================================================= */

async function handleWalletConnection() {

    if (!walletAvailable()) {

        showMessage(
            "لم يتم العثور على محفظة Web3. افتح الموقع من متصفح المحفظة مثل MetaMask أو Trust Wallet.",
            "error"
        );

        return;

    }


    try {

        connectBtn.disabled =
            true;

        connectBtn.innerText =
            "جارٍ الاتصال...";


        await loadEthers();


        /*
         * Request account
         */

        const accounts =
            await window.ethereum.request({

                method:
                    "eth_requestAccounts"

            });


        if (
            !accounts ||
            accounts.length === 0
        ) {

            throw new Error(
                "لم يتم اختيار حساب."
            );

        }


        /*
         * Check network
         */

        let chainId =
            await getChainId();


        if (
            chainId !==
            CONFIG.CHAIN_ID
        ) {

            showMessage(
                "المحفظة ليست على BNB Smart Chain. سيتم طلب التحويل إلى BNB Mainnet.",
                "warning"
            );


            await switchToBNB();


            chainId =
                await getChainId();


            if (
                chainId !==
                CONFIG.CHAIN_ID
            ) {

                throw new Error(
                    "يجب استخدام BNB Smart Chain Mainnet."
                );

            }

        }


        /*
         * Provider
         */

        await createProvider();


        /*
         * UI
         */

        connectBtn.innerText =
            shortAddress(
                userAddress
            );


        connectBtn.disabled =
            false;


        actionBtn.innerText =
            "Swap";


        actionBtn.disabled =
            false;


        bnbBalance.innerText =
            "جارٍ التحميل...";


        await updateBNBBalance();


        await updateQuote();


        showMessage(
            "تم ربط المحفظة على BNB Smart Chain Mainnet بنجاح.",
            "success"
        );


    } catch (error) {

        console.error(
            "Wallet connection error:",
            error
        );


        connectBtn.disabled =
            false;

        connectBtn.innerText =
            "ربط المحفظة";


        if (
            error &&
            error.code === 4001
        ) {

            showMessage(
                "تم رفض اتصال المحفظة.",
                "error"
            );

        } else {

            showMessage(
                error.message ||
                "حدث خطأ أثناء ربط المحفظة.",
                "error"
            );

        }

    }

}


/* =========================================================
   EXECUTE REAL SWAP
========================================================= */

async function executeSwap() {

    if (!walletAvailable()) {

        await handleWalletConnection();

        return;

    }


    if (!signer) {

        await handleWalletConnection();

        if (!signer) {

            return;

        }

    }


    try {

        /*
         * Make absolutely sure
         * we are on BNB Mainnet
         */

        const chainId =
            await getChainId();


        if (
            chainId !==
            CONFIG.CHAIN_ID
        ) {

            await switchToBNB();

            const newChainId =
                await getChainId();


            if (
                newChainId !==
                CONFIG.CHAIN_ID
            ) {

                throw new Error(
                    "يرجى تحويل المحفظة إلى BNB Smart Chain Mainnet."
                );

            }


            await createProvider();

        }


        /*
         * Input
         */

        const input =
            payInput.value.trim();


        if (!input) {

            throw new Error(
                "أدخل كمية BNB أولًا."
            );

        }


        const amountIn =
            ethers.parseEther(
                input
            );


        if (
            amountIn <= 0n
        ) {

            throw new Error(
                "يجب أن تكون كمية BNB أكبر من صفر."
            );

        }


        /*
         * Current wallet balance
         */

        const balance =
            await provider.getBalance(
                userAddress
            );


        if (
            amountIn >= balance
        ) {

            throw new Error(
                "رصيد BNB غير كافٍ. اترك كمية كافية لدفع رسوم الشبكة."
            );

        }


        /*
         * Router
         */

        const router =
            new ethers.Contract(

                CONFIG.ROUTER,

                ROUTER_ABI,

                signer

            );


        /*
         * Path:
         *
         * BNB
         * ↓
         * WBNB
         * ↓
         * USDT
         */

        const path = [

            CONFIG.WBNB,

            CONFIG.USDT

        ];


        /*
         * Get fresh quote
         */

        showMessage(
            "جاري الحصول على السعر الحالي...",
            "info"
        );


        const amounts =
            await router.getAmountsOut(

                amountIn,

                path

            );


        const expectedOut =
            amounts[
                amounts.length - 1
            ];


        /*
         * 0.50% slippage
         */

        const slippageNumerator =
            995n;

        const slippageDenominator =
            1000n;


        const amountOutMin =
            (
                expectedOut *
                slippageNumerator
            ) /
            slippageDenominator;


        /*
         * Deadline
         */

        const deadline =
            Math.floor(
                Date.now() / 1000
            ) +
            (
                CONFIG.DEADLINE_MINUTES *
                60
            );


        /*
         * Show confirmation
         */

        const expectedFormatted =
            ethers.formatUnits(
                expectedOut,
                CONFIG.USDT_DECIMALS
            );


        const minimumFormatted =
            ethers.formatUnits(
                amountOutMin,
                CONFIG.USDT_DECIMALS
            );


        const confirmation =
            confirm(

                "تأكيد Swap\n\n" +

                "المبلغ: " +
                input +
                " BNB\n\n" +

                "المتوقع تقريبًا: " +
                Number(
                    expectedFormatted
                ).toFixed(2) +
                " USDT\n\n" +

                "الحد الأدنى بعد الانزلاق: " +
                Number(
                    minimumFormatted
                ).toFixed(2) +
                " USDT\n\n" +

                "Slippage: 0.50%\n\n" +

                "سيتم فتح محفظتك لتأكيد المعاملة."

            );


        if (!confirmation) {

            showMessage(
                "تم إلغاء العملية.",
                "warning"
            );

            return;

        }


        /*
         * Disable button
         */

        actionBtn.disabled =
            true;

        actionBtn.innerText =
            "جارٍ تنفيذ Swap...";


        /*
         * REAL TRANSACTION
         */

        const tx =
            await router.swapExactETHForTokens(

                amountOutMin,

                path,

                userAddress,

                deadline,

                {

                    value:
                        amountIn

                }

            );


        showMessage(
            "تم إرسال المعاملة إلى الشبكة. انتظر التأكيد...",
            "info"
        );


        /*
         * Wait for confirmation
         */

        const receipt =
            await tx.wait();


        /*
         * Success
         */

        const txUrl =
            CONFIG.EXPLORER +
            receipt.hash;


        showMessage(

            "تم تنفيذ Swap بنجاح!\n\n" +
            "المعاملة:\n" +
            tx.hash +
            "\n\n" +
            "يمكنك فتحها على BscScan.",

            "success",

            txUrl

        );


        /*
         * Refresh
         */

        await updateBNBBalance();

        await updateQuote();


    } catch (error) {

        console.error(
            "Swap error:",
            error
        );


        if (
            error &&
            error.code === 4001
        ) {

            showMessage(
                "تم رفض المعاملة من المحفظة.",
                "warning"
            );

        } else {

            let message =
                "فشل تنفيذ Swap.";


            if (
                error &&
                error.reason
            ) {

                message =
                    error.reason;

            } else if (
                error &&
                error.shortMessage
            ) {

                message =
                    error.shortMessage;

            } else if (
                error &&
                error.message
            ) {

                message =
                    error.message;

            }


            showMessage(
                message,
                "error"
            );

        }

    } finally {

        actionBtn.disabled =
            false;

        actionBtn.innerText =
            "Swap";

    }

}


/* =========================================================
   MESSAGE BOX
========================================================= */

function showMessage(
    message,
    type,
    link
) {

    let box =
        document.getElementById(
            "web3swapMessage"
        );


    if (!box) {

        box =
            document.createElement(
                "div"
            );


        box.id =
            "web3swapMessage";


        box.style.cssText = `

            position: fixed;
            left: 15px;
            right: 15px;
            bottom: 20px;
            z-index: 99999;

            padding: 14px 16px;

            border-radius: 12px;

            background: rgba(5,11,24,0.96);

            border: 1px solid rgba(96,165,250,0.35);

            color: white;

            font-size: 14px;

            line-height: 1.7;

            text-align: center;

            box-shadow: 0 15px 40px rgba(0,0,0,0.45);

            backdrop-filter: blur(15px);

        `;


        document.body.appendChild(
            box
        );

    }


    box.innerHTML =
        message.replace(
            /\n/g,
            "<br>"
        );


    if (link) {

        box.innerHTML +=
            `<br><br>
            <a
                href="${link}"
                target="_blank"
                rel="noopener noreferrer"
                style="
                    color:#60a5fa;
                    font-weight:700;
                "
            >
                فتح المعاملة على BscScan
            </a>`;

    }


    box.style.display =
        "block";


    clearTimeout(
        box._timer
    );


    box._timer =
        setTimeout(
            function () {

                box.style.display =
                    "none";

            },
            8000
        );

}


/* =========================================================
   INPUT EVENT
========================================================= */

payInput.addEventListener(
    "input",
    async function () {

        if (
            window.ethers &&
            provider
        ) {

            await updateQuote();

        }

    }
);


/* =========================================================
   CONNECT BUTTON
========================================================= */

connectBtn.addEventListener(
    "click",
    handleWalletConnection
);


/* =========================================================
   SWAP BUTTON
========================================================= */

actionBtn.addEventListener(
    "click",
    executeSwap
);


/* =========================================================
   REVERSE BUTTON
========================================================= */

reverseSwapBtn.addEventListener(
    "click",
    function () {

        this.style.transform =
            "rotate(180deg)";


        setTimeout(
            () => {

                this.style.transform =
                    "rotate(0deg)";

            },
            300
        );

    }
);


/* =========================================================
   ACCOUNT CHANGED
========================================================= */

if (
    typeof window.ethereum !==
    "undefined"
) {

    window.ethereum.on(
        "accountsChanged",
        async function (
            accounts
        ) {

            if (
                !accounts ||
                accounts.length === 0
            ) {

                provider = null;

                signer = null;

                userAddress = null;


                connectBtn.innerText =
                    "ربط المحفظة";


                actionBtn.innerText =
                    "ربط المحفظة للبدء";


                bnbBalance.innerText =
                    "—";


                receiveInput.value =
                    "";


                return;

            }


            try {

                await createProvider();

                connectBtn.innerText =
                    shortAddress(
                        userAddress
                    );

                await updateBNBBalance();

                await updateQuote();

            } catch (error) {

                console.error(
                    error
                );

            }

        }
    );


    /* =====================================================
       CHAIN CHANGED
    ===================================================== */

    window.ethereum.on(
        "chainChanged",
        async function () {

            provider = null;

            signer = null;


            try {

                const chainId =
                    await getChainId();


                if (
                    chainId !==
                    CONFIG.CHAIN_ID
                ) {

                    showMessage(
                        "المحفظة ليست على BNB Smart Chain Mainnet.",
                        "warning"
                    );


                    actionBtn.disabled =
                        true;


                    return;

                }


                await createProvider();


                actionBtn.disabled =
                    false;


                connectBtn.innerText =
                    shortAddress(
                        userAddress
                    );


                await updateBNBBalance();

                await updateQuote();

            } catch (error) {

                console.error(
                    error
                );

            }

        }
    );

}


/* =========================================================
   INITIAL STATE
========================================================= */

actionBtn.disabled =
    false;


console.log(
    "Web3Swap initialized."
);


console.log(
    "Network: BNB Smart Chain Mainnet"
);


console.log(
    "Chain ID:",
    CONFIG.CHAIN_ID
);


console.log(
    "PancakeSwap Router:",
    CONFIG.ROUTER
);


console.log(
    "USDT:",
    CONFIG.USDT
);
