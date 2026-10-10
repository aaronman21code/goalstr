/*! noble-secp256k1 - MIT License (c) 2019 Paul Miller (paulmillr.com) */
export type Bytes = Uint8Array;
export type TypedArg<T> = T extends BigInt64Array ? BigInt64Array : T extends BigUint64Array ? BigUint64Array : T extends Float32Array ? Float32Array : T extends Float64Array ? Float64Array : T extends Int16Array ? Int16Array : T extends Int32Array ? Int32Array : T extends Int8Array ? Int8Array : T extends Uint16Array ? Uint16Array : T extends Uint32Array ? Uint32Array : T extends Uint8ClampedArray ? Uint8ClampedArray : T extends Uint8Array ? Uint8Array : never;
export type TypedRet<T> = T extends BigInt64Array ? ReturnType<typeof BigInt64Array.of> : T extends BigUint64Array ? ReturnType<typeof BigUint64Array.of> : T extends Float32Array ? ReturnType<typeof Float32Array.of> : T extends Float64Array ? ReturnType<typeof Float64Array.of> : T extends Int16Array ? ReturnType<typeof Int16Array.of> : T extends Int32Array ? ReturnType<typeof Int32Array.of> : T extends Int8Array ? ReturnType<typeof Int8Array.of> : T extends Uint16Array ? ReturnType<typeof Uint16Array.of> : T extends Uint32Array ? ReturnType<typeof Uint32Array.of> : T extends Uint8ClampedArray ? ReturnType<typeof Uint8ClampedArray.of> : T extends Uint8Array ? ReturnType<typeof Uint8Array.of> : never;
export type TArg<T> = T | ([TypedArg<T>] extends [never] ? T extends (...args: infer A) => infer R ? ((...args: {
    [K in keyof A]: TRet<A[K]>;
}) => TArg<R>) & {
    [K in keyof T]: T[K] extends (...args: any) => any ? T[K] : TArg<T[K]>;
} : T extends [infer A, ...infer R] ? [TArg<A>, ...{
    [K in keyof R]: TArg<R[K]>;
}] : T extends readonly [infer A, ...infer R] ? readonly [TArg<A>, ...{
    [K in keyof R]: TArg<R[K]>;
}] : T extends (infer A)[] ? TArg<A>[] : T extends readonly (infer A)[] ? readonly TArg<A>[] : T extends Promise<infer A> ? Promise<TArg<A>> : T extends object ? {
    [K in keyof T]: TArg<T[K]>;
} : T : TypedArg<T>);
export type TRet<T> = T extends unknown ? T & ([TypedRet<T>] extends [never] ? T extends (...args: infer A) => infer R ? ((...args: {
    [K in keyof A]: TArg<A[K]>;
}) => TRet<R>) & {
    [K in keyof T]: T[K] extends (...args: any) => any ? T[K] : TRet<T[K]>;
} : T extends [infer A, ...infer R] ? [TRet<A>, ...{
    [K in keyof R]: TRet<R[K]>;
}] : T extends readonly [infer A, ...infer R] ? readonly [TRet<A>, ...{
    [K in keyof R]: TRet<R[K]>;
}] : T extends (infer A)[] ? TRet<A>[] : T extends readonly (infer A)[] ? readonly TRet<A>[] : T extends Promise<infer A> ? Promise<TRet<A>> : T extends object ? {
    [K in keyof T]: TRet<T[K]>;
} : T : TypedRet<T>) : never;
export type RecoveredSignature = Signature & {
    recovery: number;
};
export type WeierstrassOpts<T> = Readonly<{
    p: bigint;
    n: bigint;
    h: bigint;
    a: T;
    b: T;
    Gx: T;
    Gy: T;
}>;
declare const abytes: (value: TArg<Uint8Array>, length?: number, title?: string) => TRet<Uint8Array>;
declare const invert: (number: bigint, modulo: bigint) => bigint;
declare const hash: (msg: TArg<Uint8Array>) => TRet<Uint8Array>;
export type AffinePoint = {
    x: bigint;
    y: bigint;
};
declare class Point {
    static BASE: Point;
    static ZERO: Point;
    readonly X: bigint;
    readonly Y: bigint;
    readonly Z: bigint;
    constructor(X: bigint, Y: bigint, Z: bigint);
    static CURVE(): WeierstrassOpts<bigint>;
    static fromAffine(ap: AffinePoint): Point;
    static fromBytes(bytes: TArg<Uint8Array>): Point;
    static fromHex(hex: string): Point;
    get x(): bigint;
    get y(): bigint;
    equals(other: Point): boolean;
    is0(): boolean;
    negate(): Point;
    double(): Point;
    add(other: Point): Point;
    subtract(other: Point): Point;
    multiply(n: bigint, safe?: boolean): Point;
    multiplyUnsafe(scalar: bigint): Point;
    toAffine(): AffinePoint;
    assertValidity(): Point;
    toBytes(isCompressed?: boolean): TRet<Uint8Array>;
    toHex(isCompressed?: boolean): string;
}
declare const secretKeyToScalar: (secretKey: TArg<Uint8Array>) => bigint;
declare const getPublicKey: (privKey: TArg<Uint8Array>, isCompressed?: boolean) => TRet<Uint8Array>;
declare const isValidSecretKey: (secretKey: TArg<Uint8Array>) => boolean;
declare const isValidPublicKey: (publicKey: TArg<Uint8Array>, isCompressed?: boolean) => boolean;
declare class Signature {
    readonly r: bigint;
    readonly s: bigint;
    readonly recovery?: number;
    constructor(r: bigint, s: bigint, recovery?: number);
    static fromBytes(b: TArg<Uint8Array>, format?: ECDSASignatureFormat): Signature;
    addRecoveryBit(bit: number): RecoveredSignature;
    hasHighS(): boolean;
    toBytes(format?: ECDSASignatureFormat): TRet<Uint8Array>;
}
export type ECDSAExtraEntropy = boolean | Uint8Array;
export type ECDSASignatureFormat = 'compact' | 'recovered' | 'der';
export type ECDSARecoverOpts = {
    prehash?: boolean;
    isCompressed?: boolean;
};
export type ECDSAVerifyOpts = {
    prehash?: boolean;
    lowS?: boolean;
    format?: ECDSASignatureFormat;
};
export type ECDSASignOpts = {
    prehash?: boolean;
    lowS?: boolean;
    format?: ECDSASignatureFormat;
    extraEntropy?: ECDSAExtraEntropy;
};
declare const hashes: {
    hmacSha256Async: (key: TArg<Uint8Array>, message: TArg<Uint8Array>) => Promise<TRet<Uint8Array>>;
    hmacSha256: undefined | ((key: TArg<Uint8Array>, message: TArg<Uint8Array>) => TRet<Uint8Array>);
    sha256Async: (msg: TArg<Uint8Array>) => Promise<TRet<Uint8Array>>;
    sha256: undefined | ((message: TArg<Uint8Array>) => TRet<Uint8Array>);
};
declare const sign: (message: TArg<Uint8Array>, secretKey: TArg<Uint8Array>, opts?: TArg<ECDSASignOpts>) => TRet<Uint8Array>;
declare const signAsync: (message: TArg<Uint8Array>, secretKey: TArg<Uint8Array>, opts?: TArg<ECDSASignOpts>) => Promise<TRet<Uint8Array>>;
declare const verify: (signature: TArg<Uint8Array>, message: TArg<Uint8Array>, publicKey: TArg<Uint8Array>, opts?: TArg<ECDSAVerifyOpts>) => boolean;
declare const verifyAsync: (sig: TArg<Uint8Array>, message: TArg<Uint8Array>, publicKey: TArg<Uint8Array>, opts?: TArg<ECDSAVerifyOpts>) => Promise<boolean>;
declare const recoverPublicKey: (signature: TArg<Uint8Array>, message: TArg<Uint8Array>, opts?: TArg<ECDSARecoverOpts>) => TRet<Uint8Array>;
declare const recoverPublicKeyAsync: (signature: TArg<Uint8Array>, message: TArg<Uint8Array>, opts?: TArg<ECDSARecoverOpts>) => Promise<TRet<Uint8Array>>;
declare const getSharedSecret: (secretKeyA: TArg<Uint8Array>, publicKeyB: TArg<Uint8Array>, isCompressed?: boolean) => TRet<Uint8Array>;
declare const randomSecretKey: (seed?: TArg<Uint8Array>) => TRet<Uint8Array>;
type KeysSecPub = {
    secretKey: Uint8Array;
    publicKey: Uint8Array;
};
type KeygenFn = (seed?: TArg<Uint8Array>) => TRet<KeysSecPub>;
declare const keygen: KeygenFn;
declare const etc: {
    hexToBytes: (hex: string) => TRet<Uint8Array>;
    bytesToHex: (bytes: TArg<Uint8Array>) => string;
    concatBytes: (...arrs: TArg<Uint8Array[]>) => TRet<Uint8Array>;
    bytesToNumberBE: (a: TArg<Uint8Array>) => bigint;
    numberToBytesBE: (n: bigint) => TRet<Uint8Array>;
    mod: (a: bigint, md?: bigint) => bigint;
    invert: typeof invert;
    randomBytes: (len?: number) => TRet<Uint8Array>;
    secretKeyToScalar: typeof secretKeyToScalar;
    abytes: typeof abytes;
};
declare const utils: {
    isValidSecretKey: typeof isValidSecretKey;
    isValidPublicKey: typeof isValidPublicKey;
    randomSecretKey: typeof randomSecretKey;
};
declare const pubSchnorr: (secretKey: TArg<Uint8Array>) => TRet<Uint8Array>;
declare const keygenSchnorr: KeygenFn;
declare const signSchnorr: (message: TArg<Uint8Array>, secretKey: TArg<Uint8Array>, auxRand?: TArg<Uint8Array>) => TRet<Uint8Array>;
declare const signSchnorrAsync: (message: TArg<Uint8Array>, secretKey: TArg<Uint8Array>, auxRand?: TArg<Uint8Array>) => Promise<TRet<Uint8Array>>;
declare const verifySchnorr: (s: TArg<Uint8Array>, m: TArg<Uint8Array>, p: TArg<Uint8Array>) => boolean;
declare const verifySchnorrAsync: (s: TArg<Uint8Array>, m: TArg<Uint8Array>, p: TArg<Uint8Array>) => Promise<boolean>;
declare const schnorr: {
    keygen: typeof keygenSchnorr;
    getPublicKey: typeof pubSchnorr;
    sign: typeof signSchnorr;
    verify: typeof verifySchnorr;
    signAsync: typeof signSchnorrAsync;
    verifyAsync: typeof verifySchnorrAsync;
};
export declare const __TEST: TRet<{
    lift_x: (x: bigint) => Point;
    extractK: (rand: TArg<Uint8Array>) => TRet<{
        rx: Uint8Array;
        k: bigint;
    }>;
}>;
export { etc, getPublicKey, getSharedSecret, hash, hashes, keygen, Point, recoverPublicKey, recoverPublicKeyAsync, schnorr, sign, signAsync, Signature, utils, verify, verifyAsync, };
