"use strict"
window.MyCrypto = (() => {
    var KS, HS;
    KS = getPrime(64);
    HS = getPrime(8);
    initKSHS(KS, 3);
    initKSHS(HS, 2);

    function initKSHS(k, p) {
        var buf = new ArrayBuffer(8);
        var vd = new DataView(buf);
        var n;
        for (var i = 0; i < k.length; i++) {
            vd.setFloat64(0, k[i] ** (1 / p));
            n = ((vd.getUint16(0) & 0x7FFF) >> 4) - 1023;
            k[i] = vd.getUint32(1) << 4 + n | (vd.getUint32(4) & 0x00FFFFFF) >> 20 - n;
        }
    }

    function paddingMsg(s) {
        var v8 = new TextEncoder().encode(s);
        var l = v8.byteLength * 8;
        var k = 512 - (l % 512);
        var buf = new ArrayBuffer((l + k) / 8);
        var vv8 = new Uint8Array(buf);
        vv8.set(v8);
        vv8[v8.byteLength] = 0x80;
        var dv = new DataView(buf);
        dv.setUint32(dv.byteLength - 4, l);
        return buf;
    }

    function getPrime(n) {
        var k = [];
        var i, j, l, n;
        i = 1;
        l = 2;
        k[0] = 2
        NEXT: while (i < n) {
            l = l + 1;
            for (j = 0; j < i; j++)
                if (l % k[j] === 0) continue NEXT;
            k[i] = l;
            i++;
        }
        return k;
    }

    function ror(x, n) { return x >>> n | x << (32 - n) }

    function SHA256(s) {
        var buf = new DataView(paddingMsg(s));
        var n = buf.byteLength;
        var hh = new Uint32Array(HS);
        var w = new Uint32Array(64);
        var a, b, c, d, e, f, g, h;
        var ch, t1, t2, maj;
        for (var i = 0; i < n; i += 64) {
            for (var j = 0; j < 16; j++) {
                w[j] = buf.getUint32(i + j * 4)
            }
            for (var j = 16; j < 64; j++) {
                var s0 = ror(w[j - 15], 7) ^ ror(w[j - 15], 18) ^ (w[j - 15] >>> 3);
                var s1 = ror(w[j - 2], 17) ^ ror(w[j - 2], 19) ^ (w[j - 2] >>> 10);
                w[j] = (w[j - 16] + s0 + w[j - 7] + s1) & 0xFFFFFFFF;
            }

            a = hh[0]; b = hh[1]; c = hh[2]; d = hh[3];
            e = hh[4]; f = hh[5]; g = hh[6]; h = hh[7];

            for (j = 0; j < 64; j++) {
                s1 = ror(e, 6) ^ ror(e, 11) ^ ror(e, 25);
                ch = (e & f) ^ ((~e) & g);
                t1 = (h + s1 + ch + KS[j] + w[j]) & 0xFFFFFFFF;
                s0 = ror(a, 2) ^ ror(a, 13) ^ ror(a, 22);
                maj = (a & b) ^ (a & c) ^ (b & c);
                t2 = (s0 + maj) & 0xFFFFFFFF;

                h = g; g = f; f = e; e = (d + t1) & 0xFFFFFFFF;
                d = c; c = b; b = a; a = (t1 + t2) & 0xFFFFFFFF;
            }
            hh[0] = (hh[0] + a) & 0xFFFFFFFF;
            hh[1] = (hh[1] + b) & 0xFFFFFFFF;
            hh[2] = (hh[2] + c) & 0xFFFFFFFF;
            hh[3] = (hh[3] + d) & 0xFFFFFFFF;
            hh[4] = (hh[4] + e) & 0xFFFFFFFF;
            hh[5] = (hh[5] + f) & 0xFFFFFFFF;
            hh[6] = (hh[6] + g) & 0xFFFFFFFF;
            hh[7] = (hh[7] + h) & 0xFFFFFFFF;
        }

        var dv = new DataView(hh.buffer);
        for (j = 0; j < 8; j++) {
            hh[j] = dv.getUint32(j * 4);
        }
        return hh.buffer;

    }
    function bufferTo8ByteArr(buf) {
        return new Uint8Array(buf);
    }
    function binToBase64(arr) {
        return btoa(String.fromCharCode(...arr));
    }
    function base64ToBin(s) {
        return Array.from(atob(s)).map(a => a.charCodeAt(0))
    }
    return {
        SHA256: SHA256,
        getPrime: getPrime,
        binToBase64: binToBase64,
        base64ToBin: base64ToBin,
        bufferTo8ByteArr: bufferTo8ByteArr
    }
})();



