/*! noble-secp256k1 - MIT License (c) 2019 Paul Miller (paulmillr.com) */
const freeze = Object.freeze;
const P = 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn;
const N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
const Gx = 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n;
const Gy = 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n;
const secp256k1_CURVE = freeze({
    p: P,
    n: N,
    h: 1n,
    a: 0n,
    b: 7n,
    Gx,
    Gy,
});
const L = 32;
const isBytes = (a) => {
    return (a instanceof Uint8Array ||
        (ArrayBuffer.isView(a) &&
            a.constructor.name === 'Uint8Array' &&
            a.BYTES_PER_ELEMENT === 1));
};
const abytes = (value, length, title = '') => {
    if (isBytes(value) && (length === undefined || value.length === length))
        return value;
    const bytes = isBytes(value);
    const ofLen = length !== undefined ? ` of length ${length}` : '';
    const got = bytes ? `length=${value.length}` : `type=${typeof value}`;
    const message = (title ? `"${title}" ` : '') + 'expected Uint8Array' + ofLen + ', got ' + got;
    if (!bytes)
        throw new TypeError(message);
    throw new RangeError(message);
};
const cloneBytes = (value) => Uint8Array.from(value);
const snapshotBytes = (value, title, length) => cloneBytes(abytes(value, length, title));
const padh = (n, pad) => n.toString(16).padStart(pad, '0');
const bytesToHex = (bytes) => {
    let hex = '';
    for (const byte of abytes(bytes))
        hex += padh(byte, 2);
    return hex;
};
const hexToBytes = (hex) => {
    const e = 'hex invalid';
    if (typeof hex !== 'string')
        throw new TypeError(e);
    if (hex.length % 2 || !/^[\da-f]*$/i.test(hex))
        throw new RangeError(e);
    const array = new Uint8Array(hex.length / 2);
    for (let ai = 0, hi = 0; ai < array.length; ai++, hi += 2) {
        const n1 = hex.charCodeAt(hi);
        const n2 = hex.charCodeAt(hi + 1);
        array[ai] = ((n1 & 15) + (n1 >> 6) * 9) * 16 + (n2 & 15) + (n2 >> 6) * 9;
    }
    return array;
};
const subtle = () => {
    const s = globalThis?.crypto?.subtle;
    if (s)
        return s;
    throw new Error('crypto.subtle must be defined, consider polyfill');
};
const concatBytes = (...arrays) => {
    let sum = 0;
    for (const a of arrays)
        sum += abytes(a).length;
    const res = new Uint8Array(sum);
    let pad = 0;
    for (const a of arrays) {
        res.set(a, pad);
        pad += a.length;
    }
    return res;
};
const randomBytes = (len = L) => {
    const c = globalThis?.crypto;
    if (typeof c?.getRandomValues !== 'function')
        throw new Error('crypto.getRandomValues must be defined, consider polyfill');
    return c.getRandomValues(new Uint8Array(len));
};
const big = BigInt;
const arange = (n, min, max, msg = 'bad number: out of range') => {
    if (typeof n !== 'bigint')
        throw new TypeError(msg);
    if (min <= n && n < max)
        return n;
    throw new RangeError(msg);
};
const M = (a, b = P) => ((a %= b) >= 0n ? a : b + a);
const modN = (a) => M(a, N);
const invert = (number, modulo) => {
    if (number === 0n)
        throw new Error('invert: expected non-zero number');
    if (modulo <= 1n)
        throw new Error('invert: expected modulus > 1, got ' + modulo);
    let a = M(number, modulo);
    let b = modulo;
    let x = 0n, u = 1n;
    while (a !== 0n) {
        const q = b / a;
        const r = b - a * q;
        const m = x - u * q;
        b = a, a = r, x = u, u = m;
    }
    const gcd = b;
    if (gcd !== 1n)
        throw new Error('invert: does not exist');
    return M(x, modulo);
};
const _hash = (name) => {
    const fn = hashes[name];
    if (typeof fn !== 'function')
        throw new Error('hashes.' + name + ' not set');
    return fn;
};
const callHash = (name, a, b) => abytes(_hash(name)(a, b), L, 'digest');
const callHashAsync = async (name, a, b) => abytes(await _hash(name)(a, b), L, 'digest');
const hash = (msg) => callHash('sha256', abytes(msg, undefined, 'message'));
const apoint = (p) => {
    if (p instanceof Point)
        return p;
    throw new TypeError('Point expected');
};
const E_BADPOINT = 'bad point: not on curve';
const koblitz = (x) => M(M(x * x) * x + 7n);
const FpIsValid = (n) => arange(n, 0n, P);
const FpIsValidNot0 = (n) => arange(n, 1n, P);
const FnIsValidNot0 = (n) => arange(n, 1n, N);
const isEven = (y) => !(y & 1n);
const getPrefix = (y) => Uint8Array.of(isEven(y) ? 0x02 : 0x03);
const lift_x = (x) => {
    const c = koblitz(FpIsValidNot0(x));
    let r = 1n;
    for (let num = c, e = (P + 1n) / 4n; e > 0n; e >>= 1n) {
        if (e & 1n)
            r = (r * num) % P;
        num = (num * num) % P;
    }
    if (M(r * r) !== c)
        throw new Error('sqrt invalid');
    return new Point(x, isEven(r) ? r : M(-r), 1n);
};
class Point {
    static BASE;
    static ZERO;
    X;
    Y;
    Z;
    constructor(X, Y, Z) {
        this.X = FpIsValid(X);
        this.Y = FpIsValidNot0(Y);
        this.Z = FpIsValid(Z);
        freeze(this);
    }
    static CURVE() {
        return secp256k1_CURVE;
    }
    static fromAffine(ap) {
        const { x, y } = ap;
        return x === 0n && y === 0n ? I : new Point(x, y, 1n);
    }
    static fromBytes(bytes) {
        abytes(bytes);
        const length = bytes.length;
        const head = bytes[0];
        const x = sliceBytesNumBE(bytes, 1, 33);
        try {
            if (length === 33 && (head === 0x02 || head === 0x03)) {
                const p = lift_x(x);
                return head === 0x03 ? p.negate() : p;
            }
            if (length === 65 && head === 0x04)
                return new Point(x, sliceBytesNumBE(bytes, 33, 65), 1n).assertValidity();
        }
        catch (error) {
            throw new Error(E_BADPOINT);
        }
        throw new Error(E_BADPOINT);
    }
    static fromHex(hex) {
        return Point.fromBytes(hexToBytes(hex));
    }
    get x() {
        return this.toAffine().x;
    }
    get y() {
        return this.toAffine().y;
    }
    equals(other) {
        const { X: X1, Y: Y1, Z: Z1 } = this;
        const { X: X2, Y: Y2, Z: Z2 } = apoint(other);
        return M(X1 * Z2) === M(X2 * Z1) && M(Y1 * Z2) === M(Y2 * Z1);
    }
    is0() {
        return this.Z === 0n;
    }
    negate() {
        return new Point(this.X, M(-this.Y), this.Z);
    }
    double() {
        return this.add(this);
    }
    add(other) {
        const { X: X1, Y: Y1, Z: Z1 } = this;
        const { X: X2, Y: Y2, Z: Z2 } = apoint(other);
        const a = 0n;
        const b = 7n;
        let X3 = 0n, Y3 = 0n, Z3 = 0n;
        const b3 = M(b * 3n);
        let t0 = M(X1 * X2), t1 = M(Y1 * Y2), t2 = M(Z1 * Z2), t3 = M(X1 + Y1);
        let t4 = M(X2 + Y2);
        t3 = M(t3 * t4);
        t4 = M(t0 + t1);
        t3 = M(t3 - t4);
        t4 = M(X1 + Z1);
        let t5 = M(X2 + Z2);
        t4 = M(t4 * t5);
        t5 = M(t0 + t2);
        t4 = M(t4 - t5);
        t5 = M(Y1 + Z1);
        X3 = M(Y2 + Z2);
        t5 = M(t5 * X3);
        X3 = M(t1 + t2);
        t5 = M(t5 - X3);
        Z3 = M(a * t4);
        X3 = M(b3 * t2);
        Z3 = M(X3 + Z3);
        X3 = M(t1 - Z3);
        Z3 = M(t1 + Z3);
        Y3 = M(X3 * Z3);
        t1 = M(t0 + t0);
        t1 = M(t1 + t0);
        t2 = M(a * t2);
        t4 = M(b3 * t4);
        t1 = M(t1 + t2);
        t2 = M(t0 - t2);
        t2 = M(a * t2);
        t4 = M(t4 + t2);
        t0 = M(t1 * t4);
        Y3 = M(Y3 + t0);
        t0 = M(t5 * t4);
        X3 = M(t3 * X3);
        X3 = M(X3 - t0);
        t0 = M(t3 * t1);
        Z3 = M(t5 * Z3);
        Z3 = M(Z3 + t0);
        return new Point(X3, Y3, Z3);
    }
    subtract(other) {
        return this.add(apoint(other).negate());
    }
    multiply(n, safe = true) {
        if (!safe && n === 0n)
            return I;
        FnIsValidNot0(n);
        if (n === 1n)
            return this;
        if (this.equals(G))
            return wNAF(n).p;
        let p = I;
        let f = G;
        let d = this;
        for (let i = 0; safe ? i < 256 : n > 0n; i++) {
            if (n & 1n)
                p = p.add(d);
            else if (safe)
                f = f.add(d);
            d = d.double();
            n >>= 1n;
        }
        return p;
    }
    multiplyUnsafe(scalar) {
        return this.multiply(scalar, false);
    }
    toAffine() {
        const { X: x, Y: y, Z: z } = this;
        if (z === 0n)
            return { x: 0n, y: 0n };
        if (z === 1n)
            return { x, y };
        const iz = invert(z, P);
        if (M(z * iz) !== 1n)
            throw new Error('inverse invalid');
        return { x: M(x * iz), y: M(y * iz) };
    }
    assertValidity() {
        const { x, y } = this.toAffine();
        FpIsValidNot0(x);
        FpIsValidNot0(y);
        if (M(y * y) !== koblitz(x))
            throw new Error(E_BADPOINT);
        return this;
    }
    toBytes(isCompressed = true) {
        const { x, y } = this.assertValidity().toAffine();
        const x32b = numTo32b(x);
        if (isCompressed)
            return concatBytes(getPrefix(y), x32b);
        return concatBytes(Uint8Array.of(0x04), x32b, numTo32b(y));
    }
    toHex(isCompressed) {
        return bytesToHex(this.toBytes(isCompressed));
    }
}
const G = new Point(Gx, Gy, 1n);
const I = new Point(0n, 1n, 0n);
Point.BASE = G;
Point.ZERO = I;
const doubleScalarMulUns = (R, u1, u2) => {
    return G.multiply(u1, false).add(R.multiply(u2, false)).assertValidity();
};
const bytesToNumBE = (b) => big('0x' + (bytesToHex(b) || '0'));
const sliceBytesNumBE = (b, from, to) => bytesToNumBE(b.subarray(from, to));
const numTo32b = (num) => hexToBytes(padh(arange(num, 0n, 2n ** 256n), L * 2));
const secretKeyToScalar = (secretKey) => {
    const num = bytesToNumBE(abytes(secretKey, L, 'secret key'));
    return arange(num, 1n, N, 'invalid secret key: outside of range');
};
const highS = (n) => n > N >> 1n;
const getRecoveryBit = (x, y, r) => (x === r ? 0 : 2) | Number(y & 1n);
const getPublicKey = (privKey, isCompressed = true) => {
    return G.multiply(secretKeyToScalar(privKey)).toBytes(isCompressed);
};
const isValidSecretKey = (secretKey) => {
    try {
        return !!secretKeyToScalar(secretKey);
    }
    catch (error) {
        return false;
    }
};
const isValidPublicKey = (publicKey, isCompressed) => {
    try {
        const l = publicKey.length;
        if (isCompressed === true && l !== 33)
            return false;
        if (isCompressed === false && l !== 65)
            return false;
        return !!Point.fromBytes(publicKey);
    }
    catch (error) {
        return false;
    }
};
const assertRecoveryBit = (recovery) => {
    if (recovery != null && [0, 1, 2, 3].includes(recovery))
        return recovery;
    throw new Error('invalid recovery id');
};
const assertSigFormat = (format) => {
    if (format === 'der')
        throw new Error('Signature format "der" is not supported: switch to noble-curves');
    if (format != null && format !== SIG_COMPACT && format !== SIG_RECOVERED)
        throw new Error('Signature format must be one of: compact, recovered, der');
};
const assertSigLength = (sig, format = SIG_COMPACT) => {
    assertSigFormat(format);
    const bytes = abytes(sig, undefined, 'signature');
    const len = 64 + Number(format === SIG_RECOVERED);
    if (bytes.length !== len)
        throw new Error(`Signature format "${format}" expects Uint8Array with length ${len}`);
    return bytes;
};
class Signature {
    r;
    s;
    recovery;
    constructor(r, s, recovery) {
        this.r = FnIsValidNot0(r);
        this.s = FnIsValidNot0(s);
        if (recovery != null)
            this.recovery = assertRecoveryBit(recovery);
        freeze(this);
    }
    static fromBytes(b, format = SIG_COMPACT) {
        b = assertSigLength(b, format);
        let rec;
        if (format === SIG_RECOVERED) {
            rec = b[0];
            b = b.subarray(1);
        }
        const r = sliceBytesNumBE(b, 0, L);
        const s = sliceBytesNumBE(b, L, 64);
        return new Signature(r, s, rec);
    }
    addRecoveryBit(bit) {
        return new Signature(this.r, this.s, bit);
    }
    hasHighS() {
        return highS(this.s);
    }
    toBytes(format = SIG_COMPACT) {
        assertSigFormat(format);
        const { r, s, recovery } = this;
        const res = concatBytes(numTo32b(r), numTo32b(s));
        if (format === SIG_RECOVERED) {
            return concatBytes(Uint8Array.of(assertRecoveryBit(recovery)), res);
        }
        return res;
    }
}
const MAX_PREHASHED_BYTES = 8192;
const E_MSGBIG = 'input is too large';
const oversizedMsg = (bytes, prehash) => !prehash && bytes.length > MAX_PREHASHED_BYTES;
const bits2int = (bytes) => {
    if (oversizedMsg(bytes))
        throw new Error(E_MSGBIG);
    const delta = bytes.length * 8 - 256;
    const num = bytesToNumBE(bytes);
    return delta > 0 ? num >> big(delta) : num;
};
const bits2int_modN = (bytes) => modN(bits2int(abytes(bytes)));
const snapshotMsg = (message, prehash) => {
    const view = abytes(message, undefined, 'message');
    if (oversizedMsg(view, prehash))
        throw new Error(E_MSGBIG);
    return cloneBytes(view);
};
const SIG_COMPACT = 'compact';
const SIG_RECOVERED = 'recovered';
const _sha = 'SHA-256';
const hashes = {
    hmacSha256Async: async (key, message) => {
        const s = subtle();
        const k = await s.importKey('raw', key, { name: 'HMAC', hash: _sha }, false, ['sign']);
        return new Uint8Array(await s.sign('HMAC', k, message));
    },
    hmacSha256: undefined,
    sha256Async: async (msg) => new Uint8Array(await subtle().digest(_sha, msg)),
    sha256: undefined,
};
const prepMsg = (msg, prehash, async_) => {
    const message = abytes(msg, undefined, 'message');
    if (!prehash)
        return message;
    return async_ ? callHashAsync('sha256Async', message) : callHash('sha256', message);
};
const NULL = new Uint8Array(0);
const byte0 = Uint8Array.of(0x00);
const byte1 = Uint8Array.of(0x01);
const _drbgErr = 'drbg: tried max amount of iterations';
const hmacDrbg = (seed, pred) => {
    let v = new Uint8Array(L);
    let k = new Uint8Array(L);
    let i = 0;
    const reset = () => {
        v.fill(1);
        k.fill(0);
    };
    const h = (...b) => callHash('hmacSha256', k, concatBytes(v, ...b));
    const reseed = (seed = NULL) => {
        k = h(byte0, seed);
        v = h();
        if (seed.length === 0)
            return;
        k = h(byte1, seed);
        v = h();
    };
    const gen = () => {
        if (i++ >= 1000)
            throw new Error(_drbgErr);
        v = h();
        return v;
    };
    reset();
    reseed(seed);
    let res = undefined;
    while (!(res = pred(gen())))
        reseed();
    reset();
    return res;
};
const hmacDrbgAsync = async (seed, pred) => {
    let v = new Uint8Array(L);
    let k = new Uint8Array(L);
    let i = 0;
    const reset = () => {
        v.fill(1);
        k.fill(0);
    };
    const h = (...b) => callHashAsync('hmacSha256Async', k, concatBytes(v, ...b));
    const reseed = async (seed = NULL) => {
        k = await h(byte0, seed);
        v = await h();
        if (seed.length === 0)
            return;
        k = await h(byte1, seed);
        v = await h();
    };
    const gen = async () => {
        if (i++ >= 1000)
            throw new Error(_drbgErr);
        v = await h();
        return v;
    };
    reset();
    await reseed(seed);
    let res = undefined;
    while (!(res = pred(await gen())))
        await reseed();
    reset();
    return res;
};
const _sign = (messageHash, secretKey, opts, drbg) => {
    const [lowS, , format, extraEntropy] = opts;
    const h1i = bits2int_modN(messageHash);
    const d = secretKeyToScalar(secretKey);
    const seedArgs = [numTo32b(d), numTo32b(h1i)];
    if (extraEntropy != null && extraEntropy !== false) {
        seedArgs.push(abytes(extraEntropy === true ? randomBytes(L) : extraEntropy, undefined, 'extraEntropy'));
    }
    const k2sig = (kBytes) => {
        const k = bits2int(kBytes);
        if (!(1n <= k && k < N))
            return;
        const ik = invert(k, N);
        const q = G.multiply(k).toAffine();
        const r = modN(q.x);
        if (r === 0n)
            return;
        const s = modN(ik * (h1i + r * d));
        if (s === 0n)
            return;
        let recovery = getRecoveryBit(q.x, q.y, r);
        let normS = s;
        if (lowS && highS(s)) {
            normS = N - s;
            recovery ^= 1;
        }
        const sig = new Signature(r, normS, recovery);
        return sig.toBytes(format);
    };
    return drbg(concatBytes(...seedArgs), k2sig);
};
const _verify = (sig, messageHash, publicKey, opts) => {
    const [lowS, , format] = opts;
    if (sig instanceof Signature)
        throw new Error('Signature must be in Uint8Array, use .toBytes()');
    assertSigLength(sig, format);
    abytes(publicKey, undefined, 'publicKey');
    try {
        const { r, s, recovery } = Signature.fromBytes(sig, format);
        const h = bits2int_modN(messageHash);
        const Q = Point.fromBytes(publicKey);
        if (lowS && highS(s))
            return false;
        const is = invert(s, N);
        const { x, y } = doubleScalarMulUns(Q, modN(h * is), modN(r * is)).toAffine();
        if (modN(x) !== r)
            return false;
        return format !== SIG_RECOVERED || recovery === getRecoveryBit(x, y, r);
    }
    catch (error) {
        return false;
    }
};
const setDefaults = (opts, own = false) => {
    const e = opts.extraEntropy;
    return [
        opts.lowS ?? true,
        opts.prehash ?? true,
        opts.format ?? SIG_COMPACT,
        own && e != null && typeof e !== 'boolean' ? snapshotBytes(e, 'extraEntropy') : e,
    ];
};
const sign = (message, secretKey, opts = {}) => {
    const o = setDefaults(opts);
    assertSigFormat(o[2]);
    const msg = prepMsg(message, o[1], false);
    return _sign(msg, secretKey, o, hmacDrbg);
};
const signAsync = async (message, secretKey, opts = {}) => {
    const o = setDefaults(opts, true);
    assertSigFormat(o[2]);
    const msgBytes = snapshotMsg(message, o[1]);
    const secretBytes = snapshotBytes(secretKey, 'secret key', L);
    const msg = (await prepMsg(msgBytes, o[1], true));
    return _sign(msg, secretBytes, o, hmacDrbgAsync);
};
const verify = (signature, message, publicKey, opts = {}) => {
    const o = setDefaults(opts);
    const msg = prepMsg(message, o[1], false);
    return _verify(signature, msg, publicKey, o);
};
const verifyAsync = async (sig, message, publicKey, opts = {}) => {
    const o = setDefaults(opts);
    const sigView = assertSigLength(sig, o[2]);
    const msgView = abytes(message, undefined, 'message');
    const publicKeyView = abytes(publicKey, undefined, 'publicKey');
    if (oversizedMsg(msgView, o[1]) || (publicKeyView.length !== 33 && publicKeyView.length !== 65))
        return false;
    const sigBytes = cloneBytes(sigView);
    const msgBytes = cloneBytes(msgView);
    const publicKeyBytes = cloneBytes(publicKeyView);
    const msg = (await prepMsg(msgBytes, o[1], true));
    return _verify(sigBytes, msg, publicKeyBytes, o);
};
const _recover = (signature, messageHash, isCompressed) => {
    const { r, s, recovery: rec } = Signature.fromBytes(signature, 'recovered');
    const recovery = assertRecoveryBit(rec);
    const h = bits2int_modN(messageHash);
    const radj = recovery > 1 ? r + N : r;
    FpIsValidNot0(radj);
    const ir = invert(radj, N);
    const R = Point.fromBytes(concatBytes(getPrefix(big(recovery)), numTo32b(radj)));
    return doubleScalarMulUns(R, modN(-h * ir), modN(s * ir)).toBytes(isCompressed);
};
const recoverPublicKey = (signature, message, opts = {}) => {
    const msg = prepMsg(message, setDefaults(opts)[1], false);
    return _recover(signature, msg, opts.isCompressed ?? true);
};
const recoverPublicKeyAsync = async (signature, message, opts = {}) => {
    const prehash = setDefaults(opts)[1];
    const sigBytes = cloneBytes(assertSigLength(signature, SIG_RECOVERED));
    const msgBytes = snapshotMsg(message, prehash);
    const isCompressed = opts.isCompressed ?? true;
    const msg = (await prepMsg(msgBytes, prehash, true));
    return _recover(sigBytes, msg, isCompressed);
};
const getSharedSecret = (secretKeyA, publicKeyB, isCompressed = true) => {
    return Point.fromBytes(publicKeyB).multiply(secretKeyToScalar(secretKeyA)).toBytes(isCompressed);
};
const randomSecretKey = (seed) => {
    seed = seed === undefined ? randomBytes(48) : seed;
    abytes(seed);
    if (seed.length < 48 || seed.length > 1024)
        throw new RangeError('expected 48-1024b');
    const num = M(bytesToNumBE(seed), N - 1n);
    return numTo32b(num + 1n);
};
const createKeygen = (getPublicKey) => (seed) => {
    const secretKey = randomSecretKey(seed);
    return { secretKey, publicKey: getPublicKey(secretKey) };
};
const keygen = createKeygen(getPublicKey);
const etc = freeze({
    hexToBytes,
    bytesToHex,
    concatBytes,
    bytesToNumberBE: bytesToNumBE,
    numberToBytesBE: numTo32b,
    mod: M,
    invert,
    randomBytes,
    secretKeyToScalar,
    abytes,
});
const utils = freeze({
    isValidSecretKey,
    isValidPublicKey,
    randomSecretKey,
});
const getTag = (tag) => Uint8Array.from('BIP0340/' + tag, (c) => c.charCodeAt(0));
const taggedHash = (tag, ...messages) => {
    const tagH = callHash('sha256', getTag(tag));
    return callHash('sha256', concatBytes(tagH, tagH, ...messages));
};
const taggedHashAsync = (tag, ...messages) => callHashAsync('sha256Async', getTag(tag)).then((tagH) => callHashAsync('sha256Async', concatBytes(tagH, tagH, ...messages)));
const extpubSchnorr = (priv) => {
    const d_ = secretKeyToScalar(priv);
    const p = G.multiply(d_);
    const { x, y } = p.assertValidity().toAffine();
    const d = isEven(y) ? d_ : modN(-d_);
    const px = numTo32b(x);
    return { d, px };
};
const bytesModN = (bytes) => modN(bytesToNumBE(bytes));
const challenge = (...args) => bytesModN(taggedHash('challenge', ...args));
const challengeAsync = async (...args) => bytesModN(await taggedHashAsync('challenge', ...args));
const pubSchnorr = (secretKey) => {
    return extpubSchnorr(secretKey).px;
};
const keygenSchnorr = createKeygen(pubSchnorr);
const prepSigSchnorr = (message, secretKey, auxRand) => {
    const m = snapshotBytes(message, 'message');
    const { px, d } = extpubSchnorr(secretKey);
    return { m, px, d, a: abytes(auxRand, L) };
};
const extractK = (rand) => {
    const k_ = bytesModN(rand);
    if (k_ === 0n)
        throw new Error('sign failed: k is zero');
    const { px, d } = extpubSchnorr(numTo32b(k_));
    return { rx: px, k: d };
};
const createSigSchnorr = (k, px, e, d) => {
    return concatBytes(px, numTo32b(modN(k + e * d)));
};
const E_INVSIG = 'invalid signature produced';
const signSchnorr = (message, secretKey, auxRand = randomBytes(L)) => {
    const { m, px, d, a } = prepSigSchnorr(message, secretKey, auxRand);
    const t = numTo32b(d ^ bytesToNumBE(taggedHash('aux', a)));
    const { rx, k } = extractK(taggedHash('nonce', t, px, m));
    const sig = createSigSchnorr(k, rx, challenge(rx, px, m), d);
    if (!verifySchnorr(sig, m, px))
        throw new Error(E_INVSIG);
    return sig;
};
const signSchnorrAsync = async (message, secretKey, auxRand = randomBytes(L)) => {
    const { m, px, d, a } = prepSigSchnorr(message, secretKey, auxRand);
    const t = numTo32b(d ^ bytesToNumBE(await taggedHashAsync('aux', a)));
    const { rx, k } = extractK(await taggedHashAsync('nonce', t, px, m));
    const sig = createSigSchnorr(k, rx, await challengeAsync(rx, px, m), d);
    if (!(await verifySchnorrAsync(sig, m, px)))
        throw new Error(E_INVSIG);
    return sig;
};
const callSyncAsyncFn = (res, later) => {
    return res instanceof Promise ? res.then(later) : later(res);
};
const _verifSchnorr = (signature, message, publicKey, challengeFn) => {
    const sig = abytes(signature, 64, 'signature');
    const msg = abytes(message, undefined, 'message');
    const pub = abytes(publicKey, L, 'publicKey');
    let P_;
    let r;
    let s;
    let chalInput;
    try {
        const x = bytesToNumBE(pub);
        P_ = lift_x(x);
        r = FpIsValidNot0(sliceBytesNumBE(sig, 0, L));
        s = FnIsValidNot0(sliceBytesNumBE(sig, L, 64));
        chalInput = concatBytes(numTo32b(r), pub, msg);
    }
    catch (error) {
        return false;
    }
    return callSyncAsyncFn(challengeFn(chalInput), (e) => {
        try {
            const { x, y } = doubleScalarMulUns(P_, s, modN(-e)).toAffine();
            if (!isEven(y) || x !== r)
                return false;
            return true;
        }
        catch (error) {
            return false;
        }
    });
};
const verifySchnorr = (s, m, p) => _verifSchnorr(s, m, p, challenge);
const verifySchnorrAsync = async (s, m, p) => _verifSchnorr(s, m, p, challengeAsync);
const schnorr = freeze({
    keygen: keygenSchnorr,
    getPublicKey: pubSchnorr,
    sign: signSchnorr,
    verify: verifySchnorr,
    signAsync: signSchnorrAsync,
    verifyAsync: verifySchnorrAsync,
});
const precompute = () => {
    const points = [];
    let p = G;
    let b = p;
    for (let w = 0; w < 33; w++) {
        b = p;
        points.push(b);
        for (let i = 1; i < 128; i++) {
            b = b.add(p);
            points.push(b);
        }
        p = b.double();
    }
    return points;
};
let Gpows = undefined;
const ctneg = (cnd, p) => {
    const n = p.negate();
    return cnd ? n : p;
};
const wNAF = (n) => {
    const comp = Gpows || (Gpows = precompute());
    let p = I;
    let f = G;
    for (let w = 0; w < 33; w++) {
        let wbits = Number(n & 255n);
        n >>= 8n;
        if (wbits > 128) {
            wbits -= 256;
            n += 1n;
        }
        const off = w * 128;
        const offP = off + Math.abs(wbits) - 1;
        const isOddW = w % 2 !== 0;
        const isNeg = wbits < 0;
        if (wbits === 0) {
            f = f.add(ctneg(isOddW, comp[off]));
        }
        else {
            p = p.add(ctneg(isNeg, comp[offP]));
        }
    }
    if (n !== 0n)
        throw new Error('invalid wnaf');
    return { p, f };
};
export const __TEST = freeze({
    lift_x: lift_x,
    extractK: extractK,
});
export { etc, getPublicKey, getSharedSecret, hash, hashes, keygen, Point, recoverPublicKey, recoverPublicKeyAsync, schnorr, sign, signAsync, Signature, utils, verify, verifyAsync, };
