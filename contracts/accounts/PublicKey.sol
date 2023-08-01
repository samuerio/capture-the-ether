pragma solidity ^0.4.21;

contract PublicKeyChallenge {
    address owner;
    bool public isComplete;

    function PublicKeyChallenge() public {
        owner = msg.sender;
    }

    function authenticate(bytes publicKey) public {
        require(address(keccak256(publicKey)) == owner);

        isComplete = true;
    }
}
