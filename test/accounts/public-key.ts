import crypto, {sign} from "crypto";
import {ethers} from "hardhat";
import {BigNumber, Contract, Signer} from "ethers";
import {expect} from "chai";
import {formatEtherscanTx} from "../utils/format";
import {HDNode} from "ethers/lib/utils";

let accounts: Signer[];
let eoa: Signer;
let attacker: Contract;
let contract: Contract; // challenge contract
let tx: any;
let deployTxHash: any;

before(async () => {
    accounts = await ethers.getSigners();
    [eoa] = accounts;
    const challengeFactory = await ethers.getContractFactory(
        "PublicKeyChallenge"
    );
    contract = await challengeFactory.deploy();
    deployTxHash = contract.deployTransaction.hash;
    await eoa.provider!.waitForTransaction(contract.deployTransaction.hash);
});

it("solves the challenge", async function () {
    // addresses are the last 20 bytes of hashing the public key
    // but transactions are signed with the address' public key
    // so if we see a transaction from this account we can recover the public key
    // from the message and the signature using ecrecover
    // https://ethereum.stackexchange.com/questions/13778/get-public-key-of-any-ethereum-account

    // const owner = `0x92b28647ae1f3264661f72fb2eb9625a89d88a31`;
    // pick the only outgoing tx
    // https://ropsten.etherscan.io/tx/0xabc467bedd1d17462fcc7942d0af7874d6f8bdefee2b299c9168a216d3ff0edb
    // const firstTxHash = `0xabc467bedd1d17462fcc7942d0af7874d6f8bdefee2b299c9168a216d3ff0edb`;
    const firstTx = await eoa.provider!.getTransaction(deployTxHash);
    expect(firstTx).not.to.be.undefined;
    console.log(`firstTx`, JSON.stringify(firstTx, null, 4));

    // the txHash is the keccak256 of the SIGNED transaction
    const txData = {
        type: firstTx.type,
        maxPriorityFeePerGas: firstTx.maxPriorityFeePerGas,
        maxFeePerGas: firstTx.maxFeePerGas,
        gasLimit: firstTx.gasLimit,
        value: firstTx.value,
        nonce: firstTx.nonce,
        data: firstTx.data,
        to: firstTx.to,
        chainId: firstTx.chainId,
    };
    const signingData = ethers.utils.serializeTransaction(txData);
    console.log(`signingData`, signingData);

    const msgHash = ethers.utils.keccak256(signingData);
    console.log(`msgHash`, msgHash);

    const signature = {r: firstTx.r!, s: firstTx.s!, v: firstTx.v!};
    let rawPublicKey = ethers.utils.recoverPublicKey(msgHash, signature);
    const compressedPublicKey = ethers.utils.computePublicKey(rawPublicKey, true);
    // need to strip of the 0x04 prefix indicating that it's a raw public key
    expect(rawPublicKey.slice(2, 4), "not a raw public key").to.equal(`04`);
    rawPublicKey = `0x${rawPublicKey.slice(4)}`;
    console.log(`Recovered public key ${rawPublicKey}, ${compressedPublicKey}`);

    ethers.utils.computeAddress
    tx = await contract.authenticate(rawPublicKey);
    await tx.wait();

    const isComplete = await contract.isComplete();
    expect(isComplete).to.be.true;
});
