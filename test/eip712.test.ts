import { expect, test, describe } from "bun:test";
import { 
  hashEIP712Message, 
  recoverAddress, 
  verifySignature, 
  EIP712TypedData 
} from "../src/eip712";

// Fixture generated from real Ethers.js EIP-712 signing
describe("EIP-712 Verification", () => {
  
  // Standard EIP-712 test fixture (Mail example from EIP-712)
  const mailTypedData: EIP712TypedData = {
    domain: {
      name: "Ether Mail",
      version: "1",
      chainId: 1,
      verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"
    },
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" }
      ],
      Person: [
        { name: "name", type: "string" },
        { name: "wallet", type: "address" }
      ],
      Mail: [
        { name: "from", type: "Person" },
        { name: "to", type: "Person" },
        { name: "contents", type: "string" }
      ]
    },
    primaryType: "Mail",
    message: {
      from: {
        name: "Cow",
        wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826"
      },
      to: {
        name: "Bob",
        wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB"
      },
      contents: "Hello, Bob!"
    }
  };

  // 0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826 signed this payload
  // Generated using ethers.Wallet(privateKey).signTypedData(...)
  const validSignature = "0x4355c47d63924e8a72e509b65029052eb6c299d53a04e167c5775fd466751c9d07299936d304c153f6443dfa05f40ff007d72911b6f72307f996231605b915621c";
  const expectedSigner = "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826";

  test("calculates correct digest hash", () => {
    // EIP-712 test digest
    const digest = hashEIP712Message(mailTypedData);
    const digestHex = "0x" + Array.from(digest).map(b => b.toString(16).padStart(2, '0')).join("");
    expect(digestHex).toBe("0xbe609aee343fb3c4b28e1df9e632fca64fcfaede20f02e86244efddf30957bd2");
  });

  test("recovers correct address from signature", () => {
    const address = recoverAddress(mailTypedData, validSignature);
    expect(address.toLowerCase()).toBe(expectedSigner.toLowerCase());
  });

  test("verifies valid signature successfully", () => {
    const isValid = verifySignature(mailTypedData, validSignature, expectedSigner);
    expect(isValid).toBe(true);
  });

  test("rejects invalid signature", () => {
    const badSignature = validSignature.replace("1c9d", "9999");
    const isValid = verifySignature(mailTypedData, badSignature, expectedSigner);
    expect(isValid).toBe(false);
  });
  
  test("rejects mismatched signer", () => {
    const wrongSigner = "0x0000000000000000000000000000000000000001";
    const isValid = verifySignature(mailTypedData, validSignature, wrongSigner);
    expect(isValid).toBe(false);
  });

});
