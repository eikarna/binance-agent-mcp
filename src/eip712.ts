import { keccak_256 } from "@noble/hashes/sha3.js";
import * as secp256k1 from "@noble/secp256k1";

// EIP-712 standard structures
export interface EIP712Domain {
	name: string;
	version: string;
	chainId: number;
	verifyingContract: string;
}

export interface EIP712TypeProperty {
	name: string;
	type: string;
}

export interface EIP712Types {
	EIP712Domain: EIP712TypeProperty[];
	[additionalProperties: string]: EIP712TypeProperty[];
}

export interface EIP712Message {
	[key: string]: any;
}

export interface EIP712TypedData {
	types: EIP712Types;
	primaryType: string;
	domain: EIP712Domain;
	message: EIP712Message;
}

// ABI encoding helpers (minimal)
function encodeType(primaryType: string, types: EIP712Types): string {
	// Collect types recursively
	const typeSet = new Set<string>();
	const collect = (type: string) => {
		if (typeSet.has(type)) return;
		if (types[type] === undefined) return;
		typeSet.add(type);
		for (const field of types[type]) {
			const baseType = field.type.replace(/\[.*\]/g, "");
			collect(baseType);
		}
	};
	collect(primaryType);

	// Sort custom types alphabetically (primary type first)
	const deps = Array.from(typeSet)
		.filter((t) => t !== primaryType)
		.sort();
	const sortedTypes = [primaryType, ...deps];

	// Encode
	let encoded = "";
	for (const type of sortedTypes) {
		const fields = types[type].map((f) => `${f.type} ${f.name}`).join(",");
		encoded += `${type}(${fields})`;
	}
	return encoded;
}

function typeHash(primaryType: string, types: EIP712Types): Uint8Array {
	return keccak_256(new TextEncoder().encode(encodeType(primaryType, types)));
}

// Convert numbers/strings to 32-byte arrays per ABI spec
function encodeDataValue(type: string, value: any): Uint8Array {
	// Strings and bytes are hashed
	if (type === "string" || type === "bytes") {
		if (typeof value === "string") {
			const bytes =
				type === "bytes" && value.startsWith("0x")
					? hexToBytes(value)
					: new TextEncoder().encode(value);
			return keccak_256(bytes);
		}
		return keccak_256(value);
	}

	// Address: pad to 32 bytes
	if (type === "address") {
		const clean = value.replace(/^0x/i, "").padStart(64, "0");
		return hexToBytes(clean);
	}

	// Uint/int: pad to 32 bytes
	if (type.startsWith("uint") || type.startsWith("int")) {
		let hex = BigInt(value).toString(16);
		// Pad to 64 chars (32 bytes)
		hex = hex.padStart(64, "0");
		return hexToBytes(hex);
	}

	// Boolean
	if (type === "bool") {
		return new Uint8Array(32).map((_, i) => (i === 31 ? (value ? 1 : 0) : 0));
	}

	// Arrays (unsupported in this minimal impl but could be added)
	if (type.endsWith("]")) {
		throw new Error(`Array types not implemented: ${type}`);
	}

	// Structs (hash recursively)
	throw new Error(`Nested structs not implemented: ${type}`);
}

function encodeData(
	primaryType: string,
	data: any,
	types: EIP712Types,
): Uint8Array {
	const parts: Uint8Array[] = [];

	// 1. Hash of the type
	parts.push(typeHash(primaryType, types));

	// 2. Encoded data fields
	const typeFields = types[primaryType];
	for (const field of typeFields) {
		const value = data[field.name];

		// Check if field type is a custom struct type
		if (types[field.type]) {
			// Hash struct recursively
			parts.push(keccak_256(encodeData(field.type, value, types)));
		} else {
			// Atomic type
			parts.push(encodeDataValue(field.type, value));
		}
	}

	// Concatenate parts
	const totalLength = parts.reduce((acc, p) => acc + p.length, 0);
	const concatenated = new Uint8Array(totalLength);
	let offset = 0;
	for (const p of parts) {
		concatenated.set(p, offset);
		offset += p.length;
	}

	return concatenated;
}

function hashStruct(
	primaryType: string,
	data: any,
	types: EIP712Types,
): Uint8Array {
	return keccak_256(encodeData(primaryType, data, types));
}

// Convert hex string to Uint8Array
export function hexToBytes(hex: string): Uint8Array {
	const cleanHex = hex.replace(/^0x/i, "");
	if (cleanHex.length % 2 !== 0) throw new Error("Invalid hex length");

	const bytes = new Uint8Array(cleanHex.length / 2);
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
	}
	return bytes;
}

// Convert Uint8Array to hex string
export function bytesToHex(bytes: Uint8Array): string {
	return (
		"0x" +
		Array.from(bytes)
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("")
	);
}

/**
 * Generate EIP-712 payload digest for signing/verification
 */
export function hashEIP712Message(typedData: EIP712TypedData): Uint8Array {
	const domainHash = hashStruct(
		"EIP712Domain",
		typedData.domain,
		typedData.types,
	);
	const messageHash = hashStruct(
		typedData.primaryType,
		typedData.message,
		typedData.types,
	);

	// \x19\x01 + domainHash + messageHash
	const prefix = new Uint8Array([0x19, 0x01]);
	const digest = new Uint8Array(
		prefix.length + domainHash.length + messageHash.length,
	);

	digest.set(prefix, 0);
	digest.set(domainHash, prefix.length);
	digest.set(messageHash, prefix.length + domainHash.length);

	return keccak_256(digest);
}

/**
 * Recover the signer address from an EIP-712 typed signature
 */
export function recoverAddress(
	typedData: EIP712TypedData,
	signatureHex: string,
): string {
	const digest = hashEIP712Message(typedData);

	// Parse signature (r, s, v)
	const sigBytes = hexToBytes(signatureHex);
	if (sigBytes.length !== 65) {
		throw new Error(`Invalid signature length: ${sigBytes.length}`);
	}

	const r = bytesToHex(sigBytes.slice(0, 32));
	const s = bytesToHex(sigBytes.slice(32, 64));
	let v = sigBytes[64];

	// EIP-155 adjustment if needed
	if (v >= 27) v -= 27;

	// Recover public key (uncompressed)
	const signature = new secp256k1.Signature(
		BigInt(r),
		BigInt(s),
		v,
	).addRecoveryBit(v);

	const pubKeyPoint = secp256k1.recoverPublicKey(
		signature.toBytes("recovered"),
		digest,
		{ prehash: false, isCompressed: false },
	);

	// Generate Ethereum address from uncompressed pubkey (hash of [1:])
	const pubKeyBytes = pubKeyPoint.slice(1);
	const pubKeyHash = keccak_256(pubKeyBytes);
	const addressBytes = pubKeyHash.slice(12);

	return bytesToHex(addressBytes);
}

/**
 * Verify if the signature was generated by the expected signer
 */
export function verifySignature(
	typedData: EIP712TypedData,
	signatureHex: string,
	expectedSignerAddress: string,
): boolean {
	try {
		const recovered = recoverAddress(typedData, signatureHex);
		return recovered.toLowerCase() === expectedSignerAddress.toLowerCase();
	} catch (err) {
		console.error("Signature verification failed:", err);
		return false;
	}
}
