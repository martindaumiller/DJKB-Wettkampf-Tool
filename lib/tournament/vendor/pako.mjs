/* pako 1.0.11, MIT AND Zlib. Bundled from upstream; see pako-LICENSE.txt and pako-zlib-LICENSE.txt. */
var I = (e, i) => () => (i || e((i = { exports: {} }).exports, i), i.exports);

// .sites-runtime/mail-pako/source/package/lib/utils/common.js
var V = I((B) => {
  "use strict";
  var Ai = typeof Uint8Array !== "undefined" && typeof Uint16Array !== "undefined" && typeof Int32Array !== "undefined";
  function Di(e, i) {
    return Object.prototype.hasOwnProperty.call(e, i);
  }
  B.assign = function(e) {
    var i = Array.prototype.slice.call(arguments, 1);
    while (i.length) {
      var t = i.shift();
      if (!t) {
        continue;
      }
      if (typeof t !== "object") {
        throw new TypeError(t + "must be non-object");
      }
      for (var a in t) {
        if (Di(t, a)) {
          e[a] = t[a];
        }
      }
    }
    return e;
  };
  B.shrinkBuf = function(e, i) {
    if (e.length === i) {
      return e;
    }
    if (e.subarray) {
      return e.subarray(0, i);
    }
    e.length = i;
    return e;
  };
  var Zi = {
    arraySet: function(e, i, t, a, r) {
      if (i.subarray && e.subarray) {
        e.set(i.subarray(t, t + a), r);
        return;
      }
      for (var n = 0; n < a; n++) {
        e[r + n] = i[t + n];
      }
    },
    // Join array of chunks to single array.
    flattenChunks: function(e) {
      var i, t, a, r, n, _;
      a = 0;
      for (i = 0, t = e.length; i < t; i++) {
        a += e[i].length;
      }
      _ = new Uint8Array(a);
      r = 0;
      for (i = 0, t = e.length; i < t; i++) {
        n = e[i];
        _.set(n, r);
        r += n.length;
      }
      return _;
    }
  };
  var Ri = {
    arraySet: function(e, i, t, a, r) {
      for (var n = 0; n < a; n++) {
        e[r + n] = i[t + n];
      }
    },
    // Join array of chunks to single array.
    flattenChunks: function(e) {
      return [].concat.apply([], e);
    }
  };
  B.setTyped = function(e) {
    if (e) {
      B.Buf8 = Uint8Array;
      B.Buf16 = Uint16Array;
      B.Buf32 = Int32Array;
      B.assign(B, Zi);
    } else {
      B.Buf8 = Array;
      B.Buf16 = Array;
      B.Buf32 = Array;
      B.assign(B, Ri);
    }
  };
  B.setTyped(Ai);
});

// .sites-runtime/mail-pako/source/package/lib/zlib/trees.js
var oa = I((be) => {
  "use strict";
  var Ni = V();
  var Oi = 4;
  var Kt = 0;
  var Pt = 1;
  var Ii = 2;
  function se(e) {
    var i = e.length;
    while (--i >= 0) {
      e[i] = 0;
    }
  }
  var Bi = 0;
  var Wt = 1;
  var Ci = 2;
  var Li = 3;
  var Fi = 258;
  var ut = 29;
  var De = 256;
  var ze = De + 1 + ut;
  var ce = 30;
  var vt = 19;
  var Vt = 2 * ze + 1;
  var fe = 15;
  var ft = 16;
  var Mi = 7;
  var ct = 256;
  var Jt = 16;
  var Qt = 17;
  var $t = 18;
  var ot = (
    /* extra bits for each length code */
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0]
  );
  var Ye = (
    /* extra bits for each distance code */
    [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13]
  );
  var Hi = (
    /* extra bits for each bit length code */
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7]
  );
  var ea = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
  var Ui = 512;
  var J = new Array((ze + 2) * 2);
  se(J);
  var ye = new Array(ce * 2);
  se(ye);
  var me = new Array(Ui);
  se(me);
  var Te = new Array(Fi - Li + 1);
  se(Te);
  var st = new Array(ut);
  se(st);
  var Xe = new Array(ce);
  se(Xe);
  function lt(e, i, t, a, r) {
    this.static_tree = e;
    this.extra_bits = i;
    this.extra_base = t;
    this.elems = a;
    this.max_length = r;
    this.has_stree = e && e.length;
  }
  var ta;
  var aa;
  var ia;
  function _t(e, i) {
    this.dyn_tree = e;
    this.max_code = 0;
    this.stat_desc = i;
  }
  function ra(e) {
    return e < 256 ? me[e] : me[256 + (e >>> 7)];
  }
  function Ae(e, i) {
    e.pending_buf[e.pending++] = i & 255;
    e.pending_buf[e.pending++] = i >>> 8 & 255;
  }
  function L(e, i, t) {
    if (e.bi_valid > ft - t) {
      e.bi_buf |= i << e.bi_valid & 65535;
      Ae(e, e.bi_buf);
      e.bi_buf = i >> ft - e.bi_valid;
      e.bi_valid += t - ft;
    } else {
      e.bi_buf |= i << e.bi_valid & 65535;
      e.bi_valid += t;
    }
  }
  function X(e, i, t) {
    L(
      e,
      t[i * 2],
      t[i * 2 + 1]
      /*.Len*/
    );
  }
  function na(e, i) {
    var t = 0;
    do {
      t |= e & 1;
      e >>>= 1;
      t <<= 1;
    } while (--i > 0);
    return t >>> 1;
  }
  function Ki(e) {
    if (e.bi_valid === 16) {
      Ae(e, e.bi_buf);
      e.bi_buf = 0;
      e.bi_valid = 0;
    } else if (e.bi_valid >= 8) {
      e.pending_buf[e.pending++] = e.bi_buf & 255;
      e.bi_buf >>= 8;
      e.bi_valid -= 8;
    }
  }
  function Pi(e, i) {
    var t = i.dyn_tree;
    var a = i.max_code;
    var r = i.stat_desc.static_tree;
    var n = i.stat_desc.has_stree;
    var _ = i.stat_desc.extra_bits;
    var f = i.stat_desc.extra_base;
    var d = i.stat_desc.max_length;
    var l;
    var h, x;
    var u;
    var o;
    var s;
    var c = 0;
    for (u = 0; u <= fe; u++) {
      e.bl_count[u] = 0;
    }
    t[e.heap[e.heap_max] * 2 + 1] = 0;
    for (l = e.heap_max + 1; l < Vt; l++) {
      h = e.heap[l];
      u = t[t[h * 2 + 1] * 2 + 1] + 1;
      if (u > d) {
        u = d;
        c++;
      }
      t[h * 2 + 1] = u;
      if (h > a) {
        continue;
      }
      e.bl_count[u]++;
      o = 0;
      if (h >= f) {
        o = _[h - f];
      }
      s = t[h * 2];
      e.opt_len += s * (u + o);
      if (n) {
        e.static_len += s * (r[h * 2 + 1] + o);
      }
    }
    if (c === 0) {
      return;
    }
    do {
      u = d - 1;
      while (e.bl_count[u] === 0) {
        u--;
      }
      e.bl_count[u]--;
      e.bl_count[u + 1] += 2;
      e.bl_count[d]--;
      c -= 2;
    } while (c > 0);
    for (u = d; u !== 0; u--) {
      h = e.bl_count[u];
      while (h !== 0) {
        x = e.heap[--l];
        if (x > a) {
          continue;
        }
        if (t[x * 2 + 1] !== u) {
          e.opt_len += (u - t[x * 2 + 1]) * t[x * 2];
          t[x * 2 + 1] = u;
        }
        h--;
      }
    }
  }
  function fa(e, i, t) {
    var a = new Array(fe + 1);
    var r = 0;
    var n;
    var _;
    for (n = 1; n <= fe; n++) {
      a[n] = r = r + t[n - 1] << 1;
    }
    for (_ = 0; _ <= i; _++) {
      var f = e[_ * 2 + 1];
      if (f === 0) {
        continue;
      }
      e[_ * 2] = na(a[f]++, f);
    }
  }
  function Yi() {
    var e;
    var i;
    var t;
    var a;
    var r;
    var n = new Array(fe + 1);
    t = 0;
    for (a = 0; a < ut - 1; a++) {
      st[a] = t;
      for (e = 0; e < 1 << ot[a]; e++) {
        Te[t++] = a;
      }
    }
    Te[t - 1] = a;
    r = 0;
    for (a = 0; a < 16; a++) {
      Xe[a] = r;
      for (e = 0; e < 1 << Ye[a]; e++) {
        me[r++] = a;
      }
    }
    r >>= 7;
    for (; a < ce; a++) {
      Xe[a] = r << 7;
      for (e = 0; e < 1 << Ye[a] - 7; e++) {
        me[256 + r++] = a;
      }
    }
    for (i = 0; i <= fe; i++) {
      n[i] = 0;
    }
    e = 0;
    while (e <= 143) {
      J[e * 2 + 1] = 8;
      e++;
      n[8]++;
    }
    while (e <= 255) {
      J[e * 2 + 1] = 9;
      e++;
      n[9]++;
    }
    while (e <= 279) {
      J[e * 2 + 1] = 7;
      e++;
      n[7]++;
    }
    while (e <= 287) {
      J[e * 2 + 1] = 8;
      e++;
      n[8]++;
    }
    fa(J, ze + 1, n);
    for (e = 0; e < ce; e++) {
      ye[e * 2 + 1] = 5;
      ye[e * 2] = na(e, 5);
    }
    ta = new lt(J, ot, De + 1, ze, fe);
    aa = new lt(ye, Ye, 0, ce, fe);
    ia = new lt(new Array(0), Hi, 0, vt, Mi);
  }
  function la(e) {
    var i;
    for (i = 0; i < ze; i++) {
      e.dyn_ltree[i * 2] = 0;
    }
    for (i = 0; i < ce; i++) {
      e.dyn_dtree[i * 2] = 0;
    }
    for (i = 0; i < vt; i++) {
      e.bl_tree[i * 2] = 0;
    }
    e.dyn_ltree[ct * 2] = 1;
    e.opt_len = e.static_len = 0;
    e.last_lit = e.matches = 0;
  }
  function _a(e) {
    if (e.bi_valid > 8) {
      Ae(e, e.bi_buf);
    } else if (e.bi_valid > 0) {
      e.pending_buf[e.pending++] = e.bi_buf;
    }
    e.bi_buf = 0;
    e.bi_valid = 0;
  }
  function Xi(e, i, t, a) {
    _a(e);
    if (a) {
      Ae(e, t);
      Ae(e, ~t);
    }
    Ni.arraySet(e.pending_buf, e.window, i, t, e.pending);
    e.pending += t;
  }
  function Yt(e, i, t, a) {
    var r = i * 2;
    var n = t * 2;
    return e[r] < e[n] || e[r] === e[n] && a[i] <= a[t];
  }
  function ht(e, i, t) {
    var a = e.heap[t];
    var r = t << 1;
    while (r <= e.heap_len) {
      if (r < e.heap_len && Yt(i, e.heap[r + 1], e.heap[r], e.depth)) {
        r++;
      }
      if (Yt(i, a, e.heap[r], e.depth)) {
        break;
      }
      e.heap[t] = e.heap[r];
      t = r;
      r <<= 1;
    }
    e.heap[t] = a;
  }
  function Xt(e, i, t) {
    var a;
    var r;
    var n = 0;
    var _;
    var f;
    if (e.last_lit !== 0) {
      do {
        a = e.pending_buf[e.d_buf + n * 2] << 8 | e.pending_buf[e.d_buf + n * 2 + 1];
        r = e.pending_buf[e.l_buf + n];
        n++;
        if (a === 0) {
          X(e, r, i);
        } else {
          _ = Te[r];
          X(e, _ + De + 1, i);
          f = ot[_];
          if (f !== 0) {
            r -= st[_];
            L(e, r, f);
          }
          a--;
          _ = ra(a);
          X(e, _, t);
          f = Ye[_];
          if (f !== 0) {
            a -= Xe[_];
            L(e, a, f);
          }
        }
      } while (n < e.last_lit);
    }
    X(e, ct, i);
  }
  function dt(e, i) {
    var t = i.dyn_tree;
    var a = i.stat_desc.static_tree;
    var r = i.stat_desc.has_stree;
    var n = i.stat_desc.elems;
    var _, f;
    var d = -1;
    var l;
    e.heap_len = 0;
    e.heap_max = Vt;
    for (_ = 0; _ < n; _++) {
      if (t[_ * 2] !== 0) {
        e.heap[++e.heap_len] = d = _;
        e.depth[_] = 0;
      } else {
        t[_ * 2 + 1] = 0;
      }
    }
    while (e.heap_len < 2) {
      l = e.heap[++e.heap_len] = d < 2 ? ++d : 0;
      t[l * 2] = 1;
      e.depth[l] = 0;
      e.opt_len--;
      if (r) {
        e.static_len -= a[l * 2 + 1];
      }
    }
    i.max_code = d;
    for (_ = e.heap_len >> 1; _ >= 1; _--) {
      ht(e, t, _);
    }
    l = n;
    do {
      _ = e.heap[
        1
        /*SMALLEST*/
      ];
      e.heap[
        1
        /*SMALLEST*/
      ] = e.heap[e.heap_len--];
      ht(
        e,
        t,
        1
        /*SMALLEST*/
      );
      f = e.heap[
        1
        /*SMALLEST*/
      ];
      e.heap[--e.heap_max] = _;
      e.heap[--e.heap_max] = f;
      t[l * 2] = t[_ * 2] + t[f * 2];
      e.depth[l] = (e.depth[_] >= e.depth[f] ? e.depth[_] : e.depth[f]) + 1;
      t[_ * 2 + 1] = t[f * 2 + 1] = l;
      e.heap[
        1
        /*SMALLEST*/
      ] = l++;
      ht(
        e,
        t,
        1
        /*SMALLEST*/
      );
    } while (e.heap_len >= 2);
    e.heap[--e.heap_max] = e.heap[
      1
      /*SMALLEST*/
    ];
    Pi(e, i);
    fa(t, d, e.bl_count);
  }
  function qt(e, i, t) {
    var a;
    var r = -1;
    var n;
    var _ = i[0 * 2 + 1];
    var f = 0;
    var d = 7;
    var l = 4;
    if (_ === 0) {
      d = 138;
      l = 3;
    }
    i[(t + 1) * 2 + 1] = 65535;
    for (a = 0; a <= t; a++) {
      n = _;
      _ = i[(a + 1) * 2 + 1];
      if (++f < d && n === _) {
        continue;
      } else if (f < l) {
        e.bl_tree[n * 2] += f;
      } else if (n !== 0) {
        if (n !== r) {
          e.bl_tree[n * 2]++;
        }
        e.bl_tree[Jt * 2]++;
      } else if (f <= 10) {
        e.bl_tree[Qt * 2]++;
      } else {
        e.bl_tree[$t * 2]++;
      }
      f = 0;
      r = n;
      if (_ === 0) {
        d = 138;
        l = 3;
      } else if (n === _) {
        d = 6;
        l = 3;
      } else {
        d = 7;
        l = 4;
      }
    }
  }
  function Gt(e, i, t) {
    var a;
    var r = -1;
    var n;
    var _ = i[0 * 2 + 1];
    var f = 0;
    var d = 7;
    var l = 4;
    if (_ === 0) {
      d = 138;
      l = 3;
    }
    for (a = 0; a <= t; a++) {
      n = _;
      _ = i[(a + 1) * 2 + 1];
      if (++f < d && n === _) {
        continue;
      } else if (f < l) {
        do {
          X(e, n, e.bl_tree);
        } while (--f !== 0);
      } else if (n !== 0) {
        if (n !== r) {
          X(e, n, e.bl_tree);
          f--;
        }
        X(e, Jt, e.bl_tree);
        L(e, f - 3, 2);
      } else if (f <= 10) {
        X(e, Qt, e.bl_tree);
        L(e, f - 3, 3);
      } else {
        X(e, $t, e.bl_tree);
        L(e, f - 11, 7);
      }
      f = 0;
      r = n;
      if (_ === 0) {
        d = 138;
        l = 3;
      } else if (n === _) {
        d = 6;
        l = 3;
      } else {
        d = 7;
        l = 4;
      }
    }
  }
  function qi(e) {
    var i;
    qt(e, e.dyn_ltree, e.l_desc.max_code);
    qt(e, e.dyn_dtree, e.d_desc.max_code);
    dt(e, e.bl_desc);
    for (i = vt - 1; i >= 3; i--) {
      if (e.bl_tree[ea[i] * 2 + 1] !== 0) {
        break;
      }
    }
    e.opt_len += 3 * (i + 1) + 5 + 5 + 4;
    return i;
  }
  function Gi(e, i, t, a) {
    var r;
    L(e, i - 257, 5);
    L(e, t - 1, 5);
    L(e, a - 4, 4);
    for (r = 0; r < a; r++) {
      L(e, e.bl_tree[ea[r] * 2 + 1], 3);
    }
    Gt(e, e.dyn_ltree, i - 1);
    Gt(e, e.dyn_dtree, t - 1);
  }
  function ji(e) {
    var i = 4093624447;
    var t;
    for (t = 0; t <= 31; t++, i >>>= 1) {
      if (i & 1 && e.dyn_ltree[t * 2] !== 0) {
        return Kt;
      }
    }
    if (e.dyn_ltree[9 * 2] !== 0 || e.dyn_ltree[10 * 2] !== 0 || e.dyn_ltree[13 * 2] !== 0) {
      return Pt;
    }
    for (t = 32; t < De; t++) {
      if (e.dyn_ltree[t * 2] !== 0) {
        return Pt;
      }
    }
    return Kt;
  }
  var jt = false;
  function Wi(e) {
    if (!jt) {
      Yi();
      jt = true;
    }
    e.l_desc = new _t(e.dyn_ltree, ta);
    e.d_desc = new _t(e.dyn_dtree, aa);
    e.bl_desc = new _t(e.bl_tree, ia);
    e.bi_buf = 0;
    e.bi_valid = 0;
    la(e);
  }
  function ha(e, i, t, a) {
    L(e, (Bi << 1) + (a ? 1 : 0), 3);
    Xi(e, i, t, true);
  }
  function Vi(e) {
    L(e, Wt << 1, 3);
    X(e, ct, J);
    Ki(e);
  }
  function Ji(e, i, t, a) {
    var r, n;
    var _ = 0;
    if (e.level > 0) {
      if (e.strm.data_type === Ii) {
        e.strm.data_type = ji(e);
      }
      dt(e, e.l_desc);
      dt(e, e.d_desc);
      _ = qi(e);
      r = e.opt_len + 3 + 7 >>> 3;
      n = e.static_len + 3 + 7 >>> 3;
      if (n <= r) {
        r = n;
      }
    } else {
      r = n = t + 5;
    }
    if (t + 4 <= r && i !== -1) {
      ha(e, i, t, a);
    } else if (e.strategy === Oi || n === r) {
      L(e, (Wt << 1) + (a ? 1 : 0), 3);
      Xt(e, J, ye);
    } else {
      L(e, (Ci << 1) + (a ? 1 : 0), 3);
      Gi(e, e.l_desc.max_code + 1, e.d_desc.max_code + 1, _ + 1);
      Xt(e, e.dyn_ltree, e.dyn_dtree);
    }
    la(e);
    if (a) {
      _a(e);
    }
  }
  function Qi(e, i, t) {
    e.pending_buf[e.d_buf + e.last_lit * 2] = i >>> 8 & 255;
    e.pending_buf[e.d_buf + e.last_lit * 2 + 1] = i & 255;
    e.pending_buf[e.l_buf + e.last_lit] = t & 255;
    e.last_lit++;
    if (i === 0) {
      e.dyn_ltree[t * 2]++;
    } else {
      e.matches++;
      i--;
      e.dyn_ltree[(Te[t] + De + 1) * 2]++;
      e.dyn_dtree[ra(i) * 2]++;
    }
    return e.last_lit === e.lit_bufsize - 1;
  }
  be._tr_init = Wi;
  be._tr_stored_block = ha;
  be._tr_flush_block = Ji;
  be._tr_tally = Qi;
  be._tr_align = Vi;
});

// .sites-runtime/mail-pako/source/package/lib/zlib/adler32.js
var bt = I((zn, da) => {
  "use strict";
  function $i(e, i, t, a) {
    var r = e & 65535 | 0, n = e >>> 16 & 65535 | 0, _ = 0;
    while (t !== 0) {
      _ = t > 2e3 ? 2e3 : t;
      t -= _;
      do {
        r = r + i[a++] | 0;
        n = n + r | 0;
      } while (--_);
      r %= 65521;
      n %= 65521;
    }
    return r | n << 16 | 0;
  }
  da.exports = $i;
});

// .sites-runtime/mail-pako/source/package/lib/zlib/crc32.js
var wt = I((mn, ua) => {
  "use strict";
  function er() {
    var e, i = [];
    for (var t = 0; t < 256; t++) {
      e = t;
      for (var a = 0; a < 8; a++) {
        e = e & 1 ? 3988292384 ^ e >>> 1 : e >>> 1;
      }
      i[t] = e;
    }
    return i;
  }
  var tr = er();
  function ar(e, i, t, a) {
    var r = tr, n = a + t;
    e ^= -1;
    for (var _ = a; _ < n; _++) {
      e = e >>> 8 ^ r[(e ^ i[_]) & 255];
    }
    return e ^ -1;
  }
  ua.exports = ar;
});

// .sites-runtime/mail-pako/source/package/lib/zlib/messages.js
var qe = I((Tn, va) => {
  "use strict";
  va.exports = {
    2: "need dictionary",
    /* Z_NEED_DICT       2  */
    1: "stream end",
    /* Z_STREAM_END      1  */
    0: "",
    /* Z_OK              0  */
    "-1": "file error",
    /* Z_ERRNO         (-1) */
    "-2": "stream error",
    /* Z_STREAM_ERROR  (-2) */
    "-3": "data error",
    /* Z_DATA_ERROR    (-3) */
    "-4": "insufficient memory",
    /* Z_MEM_ERROR     (-4) */
    "-5": "buffer error",
    /* Z_BUF_ERROR     (-5) */
    "-6": "incompatible version"
    /* Z_VERSION_ERROR (-6) */
  };
});

// .sites-runtime/mail-pako/source/package/lib/zlib/deflate.js
var Ea = I((j) => {
  "use strict";
  var C = V();
  var M = oa();
  var wa = bt();
  var ee = wt();
  var ir = qe();
  var oe = 0;
  var rr = 1;
  var nr = 3;
  var ne = 4;
  var ca = 5;
  var G = 0;
  var sa = 1;
  var H = -2;
  var fr = -3;
  var gt = -5;
  var lr = -1;
  var _r = 1;
  var Ge = 2;
  var hr = 3;
  var or = 4;
  var dr = 0;
  var ur = 2;
  var Je = 8;
  var vr = 9;
  var cr = 15;
  var sr = 8;
  var br = 29;
  var wr = 256;
  var xt = wr + 1 + br;
  var gr = 30;
  var pr = 19;
  var xr = 2 * xt + 1;
  var kr = 15;
  var E = 3;
  var ie = 258;
  var P = ie + E + 1;
  var Er = 32;
  var Qe = 42;
  var kt = 69;
  var je = 73;
  var We = 91;
  var Ve = 103;
  var le = 113;
  var Re = 666;
  var N = 1;
  var Ne = 2;
  var _e = 3;
  var pe = 4;
  var Sr = 3;
  function re(e, i) {
    e.msg = ir[i];
    return i;
  }
  function ba(e) {
    return (e << 1) - (e > 4 ? 9 : 0);
  }
  function ae(e) {
    var i = e.length;
    while (--i >= 0) {
      e[i] = 0;
    }
  }
  function te(e) {
    var i = e.state;
    var t = i.pending;
    if (t > e.avail_out) {
      t = e.avail_out;
    }
    if (t === 0) {
      return;
    }
    C.arraySet(e.output, i.pending_buf, i.pending_out, t, e.next_out);
    e.next_out += t;
    i.pending_out += t;
    e.total_out += t;
    e.avail_out -= t;
    i.pending -= t;
    if (i.pending === 0) {
      i.pending_out = 0;
    }
  }
  function O(e, i) {
    M._tr_flush_block(e, e.block_start >= 0 ? e.block_start : -1, e.strstart - e.block_start, i);
    e.block_start = e.strstart;
    te(e.strm);
  }
  function z(e, i) {
    e.pending_buf[e.pending++] = i;
  }
  function Ze(e, i) {
    e.pending_buf[e.pending++] = i >>> 8 & 255;
    e.pending_buf[e.pending++] = i & 255;
  }
  function yr(e, i, t, a) {
    var r = e.avail_in;
    if (r > a) {
      r = a;
    }
    if (r === 0) {
      return 0;
    }
    e.avail_in -= r;
    C.arraySet(i, e.input, e.next_in, r, t);
    if (e.state.wrap === 1) {
      e.adler = wa(e.adler, i, r, t);
    } else if (e.state.wrap === 2) {
      e.adler = ee(e.adler, i, r, t);
    }
    e.next_in += r;
    e.total_in += r;
    return r;
  }
  function ga(e, i) {
    var t = e.max_chain_length;
    var a = e.strstart;
    var r;
    var n;
    var _ = e.prev_length;
    var f = e.nice_match;
    var d = e.strstart > e.w_size - P ? e.strstart - (e.w_size - P) : 0;
    var l = e.window;
    var h = e.w_mask;
    var x = e.prev;
    var u = e.strstart + ie;
    var o = l[a + _ - 1];
    var s = l[a + _];
    if (e.prev_length >= e.good_match) {
      t >>= 2;
    }
    if (f > e.lookahead) {
      f = e.lookahead;
    }
    do {
      r = i;
      if (l[r + _] !== s || l[r + _ - 1] !== o || l[r] !== l[a] || l[++r] !== l[a + 1]) {
        continue;
      }
      a += 2;
      r++;
      do {
      } while (l[++a] === l[++r] && l[++a] === l[++r] && l[++a] === l[++r] && l[++a] === l[++r] && l[++a] === l[++r] && l[++a] === l[++r] && l[++a] === l[++r] && l[++a] === l[++r] && a < u);
      n = ie - (u - a);
      a = u - ie;
      if (n > _) {
        e.match_start = i;
        _ = n;
        if (n >= f) {
          break;
        }
        o = l[a + _ - 1];
        s = l[a + _];
      }
    } while ((i = x[i & h]) > d && --t !== 0);
    if (_ <= e.lookahead) {
      return _;
    }
    return e.lookahead;
  }
  function he(e) {
    var i = e.w_size;
    var t, a, r, n, _;
    do {
      n = e.window_size - e.lookahead - e.strstart;
      if (e.strstart >= i + (i - P)) {
        C.arraySet(e.window, e.window, i, i, 0);
        e.match_start -= i;
        e.strstart -= i;
        e.block_start -= i;
        a = e.hash_size;
        t = a;
        do {
          r = e.head[--t];
          e.head[t] = r >= i ? r - i : 0;
        } while (--a);
        a = i;
        t = a;
        do {
          r = e.prev[--t];
          e.prev[t] = r >= i ? r - i : 0;
        } while (--a);
        n += i;
      }
      if (e.strm.avail_in === 0) {
        break;
      }
      a = yr(e.strm, e.window, e.strstart + e.lookahead, n);
      e.lookahead += a;
      if (e.lookahead + e.insert >= E) {
        _ = e.strstart - e.insert;
        e.ins_h = e.window[_];
        e.ins_h = (e.ins_h << e.hash_shift ^ e.window[_ + 1]) & e.hash_mask;
        while (e.insert) {
          e.ins_h = (e.ins_h << e.hash_shift ^ e.window[_ + E - 1]) & e.hash_mask;
          e.prev[_ & e.w_mask] = e.head[e.ins_h];
          e.head[e.ins_h] = _;
          _++;
          e.insert--;
          if (e.lookahead + e.insert < E) {
            break;
          }
        }
      }
    } while (e.lookahead < P && e.strm.avail_in !== 0);
  }
  function zr(e, i) {
    var t = 65535;
    if (t > e.pending_buf_size - 5) {
      t = e.pending_buf_size - 5;
    }
    for (; ; ) {
      if (e.lookahead <= 1) {
        he(e);
        if (e.lookahead === 0 && i === oe) {
          return N;
        }
        if (e.lookahead === 0) {
          break;
        }
      }
      e.strstart += e.lookahead;
      e.lookahead = 0;
      var a = e.block_start + t;
      if (e.strstart === 0 || e.strstart >= a) {
        e.lookahead = e.strstart - a;
        e.strstart = a;
        O(e, false);
        if (e.strm.avail_out === 0) {
          return N;
        }
      }
      if (e.strstart - e.block_start >= e.w_size - P) {
        O(e, false);
        if (e.strm.avail_out === 0) {
          return N;
        }
      }
    }
    e.insert = 0;
    if (i === ne) {
      O(e, true);
      if (e.strm.avail_out === 0) {
        return _e;
      }
      return pe;
    }
    if (e.strstart > e.block_start) {
      O(e, false);
      if (e.strm.avail_out === 0) {
        return N;
      }
    }
    return N;
  }
  function pt(e, i) {
    var t;
    var a;
    for (; ; ) {
      if (e.lookahead < P) {
        he(e);
        if (e.lookahead < P && i === oe) {
          return N;
        }
        if (e.lookahead === 0) {
          break;
        }
      }
      t = 0;
      if (e.lookahead >= E) {
        e.ins_h = (e.ins_h << e.hash_shift ^ e.window[e.strstart + E - 1]) & e.hash_mask;
        t = e.prev[e.strstart & e.w_mask] = e.head[e.ins_h];
        e.head[e.ins_h] = e.strstart;
      }
      if (t !== 0 && e.strstart - t <= e.w_size - P) {
        e.match_length = ga(e, t);
      }
      if (e.match_length >= E) {
        a = M._tr_tally(e, e.strstart - e.match_start, e.match_length - E);
        e.lookahead -= e.match_length;
        if (e.match_length <= e.max_lazy_match && e.lookahead >= E) {
          e.match_length--;
          do {
            e.strstart++;
            e.ins_h = (e.ins_h << e.hash_shift ^ e.window[e.strstart + E - 1]) & e.hash_mask;
            t = e.prev[e.strstart & e.w_mask] = e.head[e.ins_h];
            e.head[e.ins_h] = e.strstart;
          } while (--e.match_length !== 0);
          e.strstart++;
        } else {
          e.strstart += e.match_length;
          e.match_length = 0;
          e.ins_h = e.window[e.strstart];
          e.ins_h = (e.ins_h << e.hash_shift ^ e.window[e.strstart + 1]) & e.hash_mask;
        }
      } else {
        a = M._tr_tally(e, 0, e.window[e.strstart]);
        e.lookahead--;
        e.strstart++;
      }
      if (a) {
        O(e, false);
        if (e.strm.avail_out === 0) {
          return N;
        }
      }
    }
    e.insert = e.strstart < E - 1 ? e.strstart : E - 1;
    if (i === ne) {
      O(e, true);
      if (e.strm.avail_out === 0) {
        return _e;
      }
      return pe;
    }
    if (e.last_lit) {
      O(e, false);
      if (e.strm.avail_out === 0) {
        return N;
      }
    }
    return Ne;
  }
  function we(e, i) {
    var t;
    var a;
    var r;
    for (; ; ) {
      if (e.lookahead < P) {
        he(e);
        if (e.lookahead < P && i === oe) {
          return N;
        }
        if (e.lookahead === 0) {
          break;
        }
      }
      t = 0;
      if (e.lookahead >= E) {
        e.ins_h = (e.ins_h << e.hash_shift ^ e.window[e.strstart + E - 1]) & e.hash_mask;
        t = e.prev[e.strstart & e.w_mask] = e.head[e.ins_h];
        e.head[e.ins_h] = e.strstart;
      }
      e.prev_length = e.match_length;
      e.prev_match = e.match_start;
      e.match_length = E - 1;
      if (t !== 0 && e.prev_length < e.max_lazy_match && e.strstart - t <= e.w_size - P) {
        e.match_length = ga(e, t);
        if (e.match_length <= 5 && (e.strategy === _r || e.match_length === E && e.strstart - e.match_start > 4096)) {
          e.match_length = E - 1;
        }
      }
      if (e.prev_length >= E && e.match_length <= e.prev_length) {
        r = e.strstart + e.lookahead - E;
        a = M._tr_tally(e, e.strstart - 1 - e.prev_match, e.prev_length - E);
        e.lookahead -= e.prev_length - 1;
        e.prev_length -= 2;
        do {
          if (++e.strstart <= r) {
            e.ins_h = (e.ins_h << e.hash_shift ^ e.window[e.strstart + E - 1]) & e.hash_mask;
            t = e.prev[e.strstart & e.w_mask] = e.head[e.ins_h];
            e.head[e.ins_h] = e.strstart;
          }
        } while (--e.prev_length !== 0);
        e.match_available = 0;
        e.match_length = E - 1;
        e.strstart++;
        if (a) {
          O(e, false);
          if (e.strm.avail_out === 0) {
            return N;
          }
        }
      } else if (e.match_available) {
        a = M._tr_tally(e, 0, e.window[e.strstart - 1]);
        if (a) {
          O(e, false);
        }
        e.strstart++;
        e.lookahead--;
        if (e.strm.avail_out === 0) {
          return N;
        }
      } else {
        e.match_available = 1;
        e.strstart++;
        e.lookahead--;
      }
    }
    if (e.match_available) {
      a = M._tr_tally(e, 0, e.window[e.strstart - 1]);
      e.match_available = 0;
    }
    e.insert = e.strstart < E - 1 ? e.strstart : E - 1;
    if (i === ne) {
      O(e, true);
      if (e.strm.avail_out === 0) {
        return _e;
      }
      return pe;
    }
    if (e.last_lit) {
      O(e, false);
      if (e.strm.avail_out === 0) {
        return N;
      }
    }
    return Ne;
  }
  function mr(e, i) {
    var t;
    var a;
    var r, n;
    var _ = e.window;
    for (; ; ) {
      if (e.lookahead <= ie) {
        he(e);
        if (e.lookahead <= ie && i === oe) {
          return N;
        }
        if (e.lookahead === 0) {
          break;
        }
      }
      e.match_length = 0;
      if (e.lookahead >= E && e.strstart > 0) {
        r = e.strstart - 1;
        a = _[r];
        if (a === _[++r] && a === _[++r] && a === _[++r]) {
          n = e.strstart + ie;
          do {
          } while (a === _[++r] && a === _[++r] && a === _[++r] && a === _[++r] && a === _[++r] && a === _[++r] && a === _[++r] && a === _[++r] && r < n);
          e.match_length = ie - (n - r);
          if (e.match_length > e.lookahead) {
            e.match_length = e.lookahead;
          }
        }
      }
      if (e.match_length >= E) {
        t = M._tr_tally(e, 1, e.match_length - E);
        e.lookahead -= e.match_length;
        e.strstart += e.match_length;
        e.match_length = 0;
      } else {
        t = M._tr_tally(e, 0, e.window[e.strstart]);
        e.lookahead--;
        e.strstart++;
      }
      if (t) {
        O(e, false);
        if (e.strm.avail_out === 0) {
          return N;
        }
      }
    }
    e.insert = 0;
    if (i === ne) {
      O(e, true);
      if (e.strm.avail_out === 0) {
        return _e;
      }
      return pe;
    }
    if (e.last_lit) {
      O(e, false);
      if (e.strm.avail_out === 0) {
        return N;
      }
    }
    return Ne;
  }
  function Tr(e, i) {
    var t;
    for (; ; ) {
      if (e.lookahead === 0) {
        he(e);
        if (e.lookahead === 0) {
          if (i === oe) {
            return N;
          }
          break;
        }
      }
      e.match_length = 0;
      t = M._tr_tally(e, 0, e.window[e.strstart]);
      e.lookahead--;
      e.strstart++;
      if (t) {
        O(e, false);
        if (e.strm.avail_out === 0) {
          return N;
        }
      }
    }
    e.insert = 0;
    if (i === ne) {
      O(e, true);
      if (e.strm.avail_out === 0) {
        return _e;
      }
      return pe;
    }
    if (e.last_lit) {
      O(e, false);
      if (e.strm.avail_out === 0) {
        return N;
      }
    }
    return Ne;
  }
  function q(e, i, t, a, r) {
    this.good_length = e;
    this.max_lazy = i;
    this.nice_length = t;
    this.max_chain = a;
    this.func = r;
  }
  var ge;
  ge = [
    /*      good lazy nice chain */
    new q(0, 0, 0, 0, zr),
    /* 0 store only */
    new q(4, 4, 8, 4, pt),
    /* 1 max speed, no lazy matches */
    new q(4, 5, 16, 8, pt),
    /* 2 */
    new q(4, 6, 32, 32, pt),
    /* 3 */
    new q(4, 4, 16, 16, we),
    /* 4 lazy matches */
    new q(8, 16, 32, 32, we),
    /* 5 */
    new q(8, 16, 128, 128, we),
    /* 6 */
    new q(8, 32, 128, 256, we),
    /* 7 */
    new q(32, 128, 258, 1024, we),
    /* 8 */
    new q(32, 258, 258, 4096, we)
    /* 9 max compression */
  ];
  function Ar(e) {
    e.window_size = 2 * e.w_size;
    ae(e.head);
    e.max_lazy_match = ge[e.level].max_lazy;
    e.good_match = ge[e.level].good_length;
    e.nice_match = ge[e.level].nice_length;
    e.max_chain_length = ge[e.level].max_chain;
    e.strstart = 0;
    e.block_start = 0;
    e.lookahead = 0;
    e.insert = 0;
    e.match_length = e.prev_length = E - 1;
    e.match_available = 0;
    e.ins_h = 0;
  }
  function Dr() {
    this.strm = null;
    this.status = 0;
    this.pending_buf = null;
    this.pending_buf_size = 0;
    this.pending_out = 0;
    this.pending = 0;
    this.wrap = 0;
    this.gzhead = null;
    this.gzindex = 0;
    this.method = Je;
    this.last_flush = -1;
    this.w_size = 0;
    this.w_bits = 0;
    this.w_mask = 0;
    this.window = null;
    this.window_size = 0;
    this.prev = null;
    this.head = null;
    this.ins_h = 0;
    this.hash_size = 0;
    this.hash_bits = 0;
    this.hash_mask = 0;
    this.hash_shift = 0;
    this.block_start = 0;
    this.match_length = 0;
    this.prev_match = 0;
    this.match_available = 0;
    this.strstart = 0;
    this.match_start = 0;
    this.lookahead = 0;
    this.prev_length = 0;
    this.max_chain_length = 0;
    this.max_lazy_match = 0;
    this.level = 0;
    this.strategy = 0;
    this.good_match = 0;
    this.nice_match = 0;
    this.dyn_ltree = new C.Buf16(xr * 2);
    this.dyn_dtree = new C.Buf16((2 * gr + 1) * 2);
    this.bl_tree = new C.Buf16((2 * pr + 1) * 2);
    ae(this.dyn_ltree);
    ae(this.dyn_dtree);
    ae(this.bl_tree);
    this.l_desc = null;
    this.d_desc = null;
    this.bl_desc = null;
    this.bl_count = new C.Buf16(kr + 1);
    this.heap = new C.Buf16(2 * xt + 1);
    ae(this.heap);
    this.heap_len = 0;
    this.heap_max = 0;
    this.depth = new C.Buf16(2 * xt + 1);
    ae(this.depth);
    this.l_buf = 0;
    this.lit_bufsize = 0;
    this.last_lit = 0;
    this.d_buf = 0;
    this.opt_len = 0;
    this.static_len = 0;
    this.matches = 0;
    this.insert = 0;
    this.bi_buf = 0;
    this.bi_valid = 0;
  }
  function pa(e) {
    var i;
    if (!e || !e.state) {
      return re(e, H);
    }
    e.total_in = e.total_out = 0;
    e.data_type = ur;
    i = e.state;
    i.pending = 0;
    i.pending_out = 0;
    if (i.wrap < 0) {
      i.wrap = -i.wrap;
    }
    i.status = i.wrap ? Qe : le;
    e.adler = i.wrap === 2 ? 0 : 1;
    i.last_flush = oe;
    M._tr_init(i);
    return G;
  }
  function xa(e) {
    var i = pa(e);
    if (i === G) {
      Ar(e.state);
    }
    return i;
  }
  function Zr(e, i) {
    if (!e || !e.state) {
      return H;
    }
    if (e.state.wrap !== 2) {
      return H;
    }
    e.state.gzhead = i;
    return G;
  }
  function ka(e, i, t, a, r, n) {
    if (!e) {
      return H;
    }
    var _ = 1;
    if (i === lr) {
      i = 6;
    }
    if (a < 0) {
      _ = 0;
      a = -a;
    } else if (a > 15) {
      _ = 2;
      a -= 16;
    }
    if (r < 1 || r > vr || t !== Je || a < 8 || a > 15 || i < 0 || i > 9 || n < 0 || n > or) {
      return re(e, H);
    }
    if (a === 8) {
      a = 9;
    }
    var f = new Dr();
    e.state = f;
    f.strm = e;
    f.wrap = _;
    f.gzhead = null;
    f.w_bits = a;
    f.w_size = 1 << f.w_bits;
    f.w_mask = f.w_size - 1;
    f.hash_bits = r + 7;
    f.hash_size = 1 << f.hash_bits;
    f.hash_mask = f.hash_size - 1;
    f.hash_shift = ~~((f.hash_bits + E - 1) / E);
    f.window = new C.Buf8(f.w_size * 2);
    f.head = new C.Buf16(f.hash_size);
    f.prev = new C.Buf16(f.w_size);
    f.lit_bufsize = 1 << r + 6;
    f.pending_buf_size = f.lit_bufsize * 4;
    f.pending_buf = new C.Buf8(f.pending_buf_size);
    f.d_buf = 1 * f.lit_bufsize;
    f.l_buf = (1 + 2) * f.lit_bufsize;
    f.level = i;
    f.strategy = n;
    f.method = t;
    return xa(e);
  }
  function Rr(e, i) {
    return ka(e, i, Je, cr, sr, dr);
  }
  function Nr(e, i) {
    var t, a;
    var r, n;
    if (!e || !e.state || i > ca || i < 0) {
      return e ? re(e, H) : H;
    }
    a = e.state;
    if (!e.output || !e.input && e.avail_in !== 0 || a.status === Re && i !== ne) {
      return re(e, e.avail_out === 0 ? gt : H);
    }
    a.strm = e;
    t = a.last_flush;
    a.last_flush = i;
    if (a.status === Qe) {
      if (a.wrap === 2) {
        e.adler = 0;
        z(a, 31);
        z(a, 139);
        z(a, 8);
        if (!a.gzhead) {
          z(a, 0);
          z(a, 0);
          z(a, 0);
          z(a, 0);
          z(a, 0);
          z(a, a.level === 9 ? 2 : a.strategy >= Ge || a.level < 2 ? 4 : 0);
          z(a, Sr);
          a.status = le;
        } else {
          z(
            a,
            (a.gzhead.text ? 1 : 0) + (a.gzhead.hcrc ? 2 : 0) + (!a.gzhead.extra ? 0 : 4) + (!a.gzhead.name ? 0 : 8) + (!a.gzhead.comment ? 0 : 16)
          );
          z(a, a.gzhead.time & 255);
          z(a, a.gzhead.time >> 8 & 255);
          z(a, a.gzhead.time >> 16 & 255);
          z(a, a.gzhead.time >> 24 & 255);
          z(a, a.level === 9 ? 2 : a.strategy >= Ge || a.level < 2 ? 4 : 0);
          z(a, a.gzhead.os & 255);
          if (a.gzhead.extra && a.gzhead.extra.length) {
            z(a, a.gzhead.extra.length & 255);
            z(a, a.gzhead.extra.length >> 8 & 255);
          }
          if (a.gzhead.hcrc) {
            e.adler = ee(e.adler, a.pending_buf, a.pending, 0);
          }
          a.gzindex = 0;
          a.status = kt;
        }
      } else {
        var _ = Je + (a.w_bits - 8 << 4) << 8;
        var f = -1;
        if (a.strategy >= Ge || a.level < 2) {
          f = 0;
        } else if (a.level < 6) {
          f = 1;
        } else if (a.level === 6) {
          f = 2;
        } else {
          f = 3;
        }
        _ |= f << 6;
        if (a.strstart !== 0) {
          _ |= Er;
        }
        _ += 31 - _ % 31;
        a.status = le;
        Ze(a, _);
        if (a.strstart !== 0) {
          Ze(a, e.adler >>> 16);
          Ze(a, e.adler & 65535);
        }
        e.adler = 1;
      }
    }
    if (a.status === kt) {
      if (a.gzhead.extra) {
        r = a.pending;
        while (a.gzindex < (a.gzhead.extra.length & 65535)) {
          if (a.pending === a.pending_buf_size) {
            if (a.gzhead.hcrc && a.pending > r) {
              e.adler = ee(e.adler, a.pending_buf, a.pending - r, r);
            }
            te(e);
            r = a.pending;
            if (a.pending === a.pending_buf_size) {
              break;
            }
          }
          z(a, a.gzhead.extra[a.gzindex] & 255);
          a.gzindex++;
        }
        if (a.gzhead.hcrc && a.pending > r) {
          e.adler = ee(e.adler, a.pending_buf, a.pending - r, r);
        }
        if (a.gzindex === a.gzhead.extra.length) {
          a.gzindex = 0;
          a.status = je;
        }
      } else {
        a.status = je;
      }
    }
    if (a.status === je) {
      if (a.gzhead.name) {
        r = a.pending;
        do {
          if (a.pending === a.pending_buf_size) {
            if (a.gzhead.hcrc && a.pending > r) {
              e.adler = ee(e.adler, a.pending_buf, a.pending - r, r);
            }
            te(e);
            r = a.pending;
            if (a.pending === a.pending_buf_size) {
              n = 1;
              break;
            }
          }
          if (a.gzindex < a.gzhead.name.length) {
            n = a.gzhead.name.charCodeAt(a.gzindex++) & 255;
          } else {
            n = 0;
          }
          z(a, n);
        } while (n !== 0);
        if (a.gzhead.hcrc && a.pending > r) {
          e.adler = ee(e.adler, a.pending_buf, a.pending - r, r);
        }
        if (n === 0) {
          a.gzindex = 0;
          a.status = We;
        }
      } else {
        a.status = We;
      }
    }
    if (a.status === We) {
      if (a.gzhead.comment) {
        r = a.pending;
        do {
          if (a.pending === a.pending_buf_size) {
            if (a.gzhead.hcrc && a.pending > r) {
              e.adler = ee(e.adler, a.pending_buf, a.pending - r, r);
            }
            te(e);
            r = a.pending;
            if (a.pending === a.pending_buf_size) {
              n = 1;
              break;
            }
          }
          if (a.gzindex < a.gzhead.comment.length) {
            n = a.gzhead.comment.charCodeAt(a.gzindex++) & 255;
          } else {
            n = 0;
          }
          z(a, n);
        } while (n !== 0);
        if (a.gzhead.hcrc && a.pending > r) {
          e.adler = ee(e.adler, a.pending_buf, a.pending - r, r);
        }
        if (n === 0) {
          a.status = Ve;
        }
      } else {
        a.status = Ve;
      }
    }
    if (a.status === Ve) {
      if (a.gzhead.hcrc) {
        if (a.pending + 2 > a.pending_buf_size) {
          te(e);
        }
        if (a.pending + 2 <= a.pending_buf_size) {
          z(a, e.adler & 255);
          z(a, e.adler >> 8 & 255);
          e.adler = 0;
          a.status = le;
        }
      } else {
        a.status = le;
      }
    }
    if (a.pending !== 0) {
      te(e);
      if (e.avail_out === 0) {
        a.last_flush = -1;
        return G;
      }
    } else if (e.avail_in === 0 && ba(i) <= ba(t) && i !== ne) {
      return re(e, gt);
    }
    if (a.status === Re && e.avail_in !== 0) {
      return re(e, gt);
    }
    if (e.avail_in !== 0 || a.lookahead !== 0 || i !== oe && a.status !== Re) {
      var d = a.strategy === Ge ? Tr(a, i) : a.strategy === hr ? mr(a, i) : ge[a.level].func(a, i);
      if (d === _e || d === pe) {
        a.status = Re;
      }
      if (d === N || d === _e) {
        if (e.avail_out === 0) {
          a.last_flush = -1;
        }
        return G;
      }
      if (d === Ne) {
        if (i === rr) {
          M._tr_align(a);
        } else if (i !== ca) {
          M._tr_stored_block(a, 0, 0, false);
          if (i === nr) {
            ae(a.head);
            if (a.lookahead === 0) {
              a.strstart = 0;
              a.block_start = 0;
              a.insert = 0;
            }
          }
        }
        te(e);
        if (e.avail_out === 0) {
          a.last_flush = -1;
          return G;
        }
      }
    }
    if (i !== ne) {
      return G;
    }
    if (a.wrap <= 0) {
      return sa;
    }
    if (a.wrap === 2) {
      z(a, e.adler & 255);
      z(a, e.adler >> 8 & 255);
      z(a, e.adler >> 16 & 255);
      z(a, e.adler >> 24 & 255);
      z(a, e.total_in & 255);
      z(a, e.total_in >> 8 & 255);
      z(a, e.total_in >> 16 & 255);
      z(a, e.total_in >> 24 & 255);
    } else {
      Ze(a, e.adler >>> 16);
      Ze(a, e.adler & 65535);
    }
    te(e);
    if (a.wrap > 0) {
      a.wrap = -a.wrap;
    }
    return a.pending !== 0 ? G : sa;
  }
  function Or(e) {
    var i;
    if (!e || !e.state) {
      return H;
    }
    i = e.state.status;
    if (i !== Qe && i !== kt && i !== je && i !== We && i !== Ve && i !== le && i !== Re) {
      return re(e, H);
    }
    e.state = null;
    return i === le ? re(e, fr) : G;
  }
  function Ir(e, i) {
    var t = i.length;
    var a;
    var r, n;
    var _;
    var f;
    var d;
    var l;
    var h;
    if (!e || !e.state) {
      return H;
    }
    a = e.state;
    _ = a.wrap;
    if (_ === 2 || _ === 1 && a.status !== Qe || a.lookahead) {
      return H;
    }
    if (_ === 1) {
      e.adler = wa(e.adler, i, t, 0);
    }
    a.wrap = 0;
    if (t >= a.w_size) {
      if (_ === 0) {
        ae(a.head);
        a.strstart = 0;
        a.block_start = 0;
        a.insert = 0;
      }
      h = new C.Buf8(a.w_size);
      C.arraySet(h, i, t - a.w_size, a.w_size, 0);
      i = h;
      t = a.w_size;
    }
    f = e.avail_in;
    d = e.next_in;
    l = e.input;
    e.avail_in = t;
    e.next_in = 0;
    e.input = i;
    he(a);
    while (a.lookahead >= E) {
      r = a.strstart;
      n = a.lookahead - (E - 1);
      do {
        a.ins_h = (a.ins_h << a.hash_shift ^ a.window[r + E - 1]) & a.hash_mask;
        a.prev[r & a.w_mask] = a.head[a.ins_h];
        a.head[a.ins_h] = r;
        r++;
      } while (--n);
      a.strstart = r;
      a.lookahead = E - 1;
      he(a);
    }
    a.strstart += a.lookahead;
    a.block_start = a.strstart;
    a.insert = a.lookahead;
    a.lookahead = 0;
    a.match_length = a.prev_length = E - 1;
    a.match_available = 0;
    e.next_in = d;
    e.input = l;
    e.avail_in = f;
    a.wrap = _;
    return G;
  }
  j.deflateInit = Rr;
  j.deflateInit2 = ka;
  j.deflateReset = xa;
  j.deflateResetKeep = pa;
  j.deflateSetHeader = Zr;
  j.deflate = Nr;
  j.deflateEnd = Or;
  j.deflateSetDictionary = Ir;
  j.deflateInfo = "pako deflate (from Nodeca project)";
});

// .sites-runtime/mail-pako/source/package/lib/utils/strings.js
var Et = I((xe) => {
  "use strict";
  var $e = V();
  var Sa = true;
  var ya = true;
  try {
    String.fromCharCode.apply(null, [0]);
  } catch (e) {
    Sa = false;
  }
  try {
    String.fromCharCode.apply(null, new Uint8Array(1));
  } catch (e) {
    ya = false;
  }
  var Oe = new $e.Buf8(256);
  for (Q = 0; Q < 256; Q++) {
    Oe[Q] = Q >= 252 ? 6 : Q >= 248 ? 5 : Q >= 240 ? 4 : Q >= 224 ? 3 : Q >= 192 ? 2 : 1;
  }
  var Q;
  Oe[254] = Oe[254] = 1;
  xe.string2buf = function(e) {
    var i, t, a, r, n, _ = e.length, f = 0;
    for (r = 0; r < _; r++) {
      t = e.charCodeAt(r);
      if ((t & 64512) === 55296 && r + 1 < _) {
        a = e.charCodeAt(r + 1);
        if ((a & 64512) === 56320) {
          t = 65536 + (t - 55296 << 10) + (a - 56320);
          r++;
        }
      }
      f += t < 128 ? 1 : t < 2048 ? 2 : t < 65536 ? 3 : 4;
    }
    i = new $e.Buf8(f);
    for (n = 0, r = 0; n < f; r++) {
      t = e.charCodeAt(r);
      if ((t & 64512) === 55296 && r + 1 < _) {
        a = e.charCodeAt(r + 1);
        if ((a & 64512) === 56320) {
          t = 65536 + (t - 55296 << 10) + (a - 56320);
          r++;
        }
      }
      if (t < 128) {
        i[n++] = t;
      } else if (t < 2048) {
        i[n++] = 192 | t >>> 6;
        i[n++] = 128 | t & 63;
      } else if (t < 65536) {
        i[n++] = 224 | t >>> 12;
        i[n++] = 128 | t >>> 6 & 63;
        i[n++] = 128 | t & 63;
      } else {
        i[n++] = 240 | t >>> 18;
        i[n++] = 128 | t >>> 12 & 63;
        i[n++] = 128 | t >>> 6 & 63;
        i[n++] = 128 | t & 63;
      }
    }
    return i;
  };
  function za(e, i) {
    if (i < 65534) {
      if (e.subarray && ya || !e.subarray && Sa) {
        return String.fromCharCode.apply(null, $e.shrinkBuf(e, i));
      }
    }
    var t = "";
    for (var a = 0; a < i; a++) {
      t += String.fromCharCode(e[a]);
    }
    return t;
  }
  xe.buf2binstring = function(e) {
    return za(e, e.length);
  };
  xe.binstring2buf = function(e) {
    var i = new $e.Buf8(e.length);
    for (var t = 0, a = i.length; t < a; t++) {
      i[t] = e.charCodeAt(t);
    }
    return i;
  };
  xe.buf2string = function(e, i) {
    var t, a, r, n;
    var _ = i || e.length;
    var f = new Array(_ * 2);
    for (a = 0, t = 0; t < _; ) {
      r = e[t++];
      if (r < 128) {
        f[a++] = r;
        continue;
      }
      n = Oe[r];
      if (n > 4) {
        f[a++] = 65533;
        t += n - 1;
        continue;
      }
      r &= n === 2 ? 31 : n === 3 ? 15 : 7;
      while (n > 1 && t < _) {
        r = r << 6 | e[t++] & 63;
        n--;
      }
      if (n > 1) {
        f[a++] = 65533;
        continue;
      }
      if (r < 65536) {
        f[a++] = r;
      } else {
        r -= 65536;
        f[a++] = 55296 | r >> 10 & 1023;
        f[a++] = 56320 | r & 1023;
      }
    }
    return za(f, a);
  };
  xe.utf8border = function(e, i) {
    var t;
    i = i || e.length;
    if (i > e.length) {
      i = e.length;
    }
    t = i - 1;
    while (t >= 0 && (e[t] & 192) === 128) {
      t--;
    }
    if (t < 0) {
      return i;
    }
    if (t === 0) {
      return i;
    }
    return t + Oe[e[t]] > i ? t : i;
  };
});

// .sites-runtime/mail-pako/source/package/lib/zlib/zstream.js
var St = I((Zn, ma) => {
  "use strict";
  function Br() {
    this.input = null;
    this.next_in = 0;
    this.avail_in = 0;
    this.total_in = 0;
    this.output = null;
    this.next_out = 0;
    this.avail_out = 0;
    this.total_out = 0;
    this.msg = "";
    this.state = null;
    this.data_type = 2;
    this.adler = 0;
  }
  ma.exports = Br;
});

// .sites-runtime/mail-pako/source/package/lib/deflate.js
var Za = I((Ce) => {
  "use strict";
  var Ie = Ea();
  var Be = V();
  var zt = Et();
  var mt = qe();
  var Cr = St();
  var Da = Object.prototype.toString;
  var Lr = 0;
  var yt = 4;
  var ke = 0;
  var Ta = 1;
  var Aa = 2;
  var Fr = -1;
  var Mr = 0;
  var Hr = 8;
  function de(e) {
    if (!(this instanceof de)) return new de(e);
    this.options = Be.assign({
      level: Fr,
      method: Hr,
      chunkSize: 16384,
      windowBits: 15,
      memLevel: 8,
      strategy: Mr,
      to: ""
    }, e || {});
    var i = this.options;
    if (i.raw && i.windowBits > 0) {
      i.windowBits = -i.windowBits;
    } else if (i.gzip && i.windowBits > 0 && i.windowBits < 16) {
      i.windowBits += 16;
    }
    this.err = 0;
    this.msg = "";
    this.ended = false;
    this.chunks = [];
    this.strm = new Cr();
    this.strm.avail_out = 0;
    var t = Ie.deflateInit2(
      this.strm,
      i.level,
      i.method,
      i.windowBits,
      i.memLevel,
      i.strategy
    );
    if (t !== ke) {
      throw new Error(mt[t]);
    }
    if (i.header) {
      Ie.deflateSetHeader(this.strm, i.header);
    }
    if (i.dictionary) {
      var a;
      if (typeof i.dictionary === "string") {
        a = zt.string2buf(i.dictionary);
      } else if (Da.call(i.dictionary) === "[object ArrayBuffer]") {
        a = new Uint8Array(i.dictionary);
      } else {
        a = i.dictionary;
      }
      t = Ie.deflateSetDictionary(this.strm, a);
      if (t !== ke) {
        throw new Error(mt[t]);
      }
      this._dict_set = true;
    }
  }
  de.prototype.push = function(e, i) {
    var t = this.strm;
    var a = this.options.chunkSize;
    var r, n;
    if (this.ended) {
      return false;
    }
    n = i === ~~i ? i : i === true ? yt : Lr;
    if (typeof e === "string") {
      t.input = zt.string2buf(e);
    } else if (Da.call(e) === "[object ArrayBuffer]") {
      t.input = new Uint8Array(e);
    } else {
      t.input = e;
    }
    t.next_in = 0;
    t.avail_in = t.input.length;
    do {
      if (t.avail_out === 0) {
        t.output = new Be.Buf8(a);
        t.next_out = 0;
        t.avail_out = a;
      }
      r = Ie.deflate(t, n);
      if (r !== Ta && r !== ke) {
        this.onEnd(r);
        this.ended = true;
        return false;
      }
      if (t.avail_out === 0 || t.avail_in === 0 && (n === yt || n === Aa)) {
        if (this.options.to === "string") {
          this.onData(zt.buf2binstring(Be.shrinkBuf(t.output, t.next_out)));
        } else {
          this.onData(Be.shrinkBuf(t.output, t.next_out));
        }
      }
    } while ((t.avail_in > 0 || t.avail_out === 0) && r !== Ta);
    if (n === yt) {
      r = Ie.deflateEnd(this.strm);
      this.onEnd(r);
      this.ended = true;
      return r === ke;
    }
    if (n === Aa) {
      this.onEnd(ke);
      t.avail_out = 0;
      return true;
    }
    return true;
  };
  de.prototype.onData = function(e) {
    this.chunks.push(e);
  };
  de.prototype.onEnd = function(e) {
    if (e === ke) {
      if (this.options.to === "string") {
        this.result = this.chunks.join("");
      } else {
        this.result = Be.flattenChunks(this.chunks);
      }
    }
    this.chunks = [];
    this.err = e;
    this.msg = this.strm.msg;
  };
  function Tt(e, i) {
    var t = new de(i);
    t.push(e, true);
    if (t.err) {
      throw t.msg || mt[t.err];
    }
    return t.result;
  }
  function Ur(e, i) {
    i = i || {};
    i.raw = true;
    return Tt(e, i);
  }
  function Kr(e, i) {
    i = i || {};
    i.gzip = true;
    return Tt(e, i);
  }
  Ce.Deflate = de;
  Ce.deflate = Tt;
  Ce.deflateRaw = Ur;
  Ce.gzip = Kr;
});

// .sites-runtime/mail-pako/source/package/lib/zlib/inffast.js
var Na = I((Nn, Ra) => {
  "use strict";
  var et = 30;
  var Pr = 12;
  Ra.exports = function e(i, t) {
    var a;
    var r;
    var n;
    var _;
    var f;
    var d;
    var l;
    var h;
    var x;
    var u;
    var o;
    var s;
    var c;
    var k;
    var b;
    var T;
    var A;
    var p;
    var v;
    var m;
    var S;
    var w;
    var y;
    var Z, g;
    a = i.state;
    r = i.next_in;
    Z = i.input;
    n = r + (i.avail_in - 5);
    _ = i.next_out;
    g = i.output;
    f = _ - (t - i.avail_out);
    d = _ + (i.avail_out - 257);
    l = a.dmax;
    h = a.wsize;
    x = a.whave;
    u = a.wnext;
    o = a.window;
    s = a.hold;
    c = a.bits;
    k = a.lencode;
    b = a.distcode;
    T = (1 << a.lenbits) - 1;
    A = (1 << a.distbits) - 1;
    e:
      do {
        if (c < 15) {
          s += Z[r++] << c;
          c += 8;
          s += Z[r++] << c;
          c += 8;
        }
        p = k[s & T];
        t:
          for (; ; ) {
            v = p >>> 24;
            s >>>= v;
            c -= v;
            v = p >>> 16 & 255;
            if (v === 0) {
              g[_++] = p & 65535;
            } else if (v & 16) {
              m = p & 65535;
              v &= 15;
              if (v) {
                if (c < v) {
                  s += Z[r++] << c;
                  c += 8;
                }
                m += s & (1 << v) - 1;
                s >>>= v;
                c -= v;
              }
              if (c < 15) {
                s += Z[r++] << c;
                c += 8;
                s += Z[r++] << c;
                c += 8;
              }
              p = b[s & A];
              a:
                for (; ; ) {
                  v = p >>> 24;
                  s >>>= v;
                  c -= v;
                  v = p >>> 16 & 255;
                  if (v & 16) {
                    S = p & 65535;
                    v &= 15;
                    if (c < v) {
                      s += Z[r++] << c;
                      c += 8;
                      if (c < v) {
                        s += Z[r++] << c;
                        c += 8;
                      }
                    }
                    S += s & (1 << v) - 1;
                    if (S > l) {
                      i.msg = "invalid distance too far back";
                      a.mode = et;
                      break e;
                    }
                    s >>>= v;
                    c -= v;
                    v = _ - f;
                    if (S > v) {
                      v = S - v;
                      if (v > x) {
                        if (a.sane) {
                          i.msg = "invalid distance too far back";
                          a.mode = et;
                          break e;
                        }
                      }
                      w = 0;
                      y = o;
                      if (u === 0) {
                        w += h - v;
                        if (v < m) {
                          m -= v;
                          do {
                            g[_++] = o[w++];
                          } while (--v);
                          w = _ - S;
                          y = g;
                        }
                      } else if (u < v) {
                        w += h + u - v;
                        v -= u;
                        if (v < m) {
                          m -= v;
                          do {
                            g[_++] = o[w++];
                          } while (--v);
                          w = 0;
                          if (u < m) {
                            v = u;
                            m -= v;
                            do {
                              g[_++] = o[w++];
                            } while (--v);
                            w = _ - S;
                            y = g;
                          }
                        }
                      } else {
                        w += u - v;
                        if (v < m) {
                          m -= v;
                          do {
                            g[_++] = o[w++];
                          } while (--v);
                          w = _ - S;
                          y = g;
                        }
                      }
                      while (m > 2) {
                        g[_++] = y[w++];
                        g[_++] = y[w++];
                        g[_++] = y[w++];
                        m -= 3;
                      }
                      if (m) {
                        g[_++] = y[w++];
                        if (m > 1) {
                          g[_++] = y[w++];
                        }
                      }
                    } else {
                      w = _ - S;
                      do {
                        g[_++] = g[w++];
                        g[_++] = g[w++];
                        g[_++] = g[w++];
                        m -= 3;
                      } while (m > 2);
                      if (m) {
                        g[_++] = g[w++];
                        if (m > 1) {
                          g[_++] = g[w++];
                        }
                      }
                    }
                  } else if ((v & 64) === 0) {
                    p = b[(p & 65535) + (s & (1 << v) - 1)];
                    continue a;
                  } else {
                    i.msg = "invalid distance code";
                    a.mode = et;
                    break e;
                  }
                  break;
                }
            } else if ((v & 64) === 0) {
              p = k[(p & 65535) + (s & (1 << v) - 1)];
              continue t;
            } else if (v & 32) {
              a.mode = Pr;
              break e;
            } else {
              i.msg = "invalid literal/length code";
              a.mode = et;
              break e;
            }
            break;
          }
      } while (r < n && _ < d);
    m = c >> 3;
    r -= m;
    c -= m << 3;
    s &= (1 << c) - 1;
    i.next_in = r;
    i.next_out = _;
    i.avail_in = r < n ? 5 + (n - r) : 5 - (r - n);
    i.avail_out = _ < d ? 257 + (d - _) : 257 - (_ - d);
    a.hold = s;
    a.bits = c;
    return;
  };
});

// .sites-runtime/mail-pako/source/package/lib/zlib/inftrees.js
var Ma = I((On, Fa) => {
  "use strict";
  var Oa = V();
  var Ee = 15;
  var Ia = 852;
  var Ba = 592;
  var Ca = 0;
  var At = 1;
  var La = 2;
  var Yr = [
    /* Length codes 257..285 base */
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    13,
    15,
    17,
    19,
    23,
    27,
    31,
    35,
    43,
    51,
    59,
    67,
    83,
    99,
    115,
    131,
    163,
    195,
    227,
    258,
    0,
    0
  ];
  var Xr = [
    /* Length codes 257..285 extra */
    16,
    16,
    16,
    16,
    16,
    16,
    16,
    16,
    17,
    17,
    17,
    17,
    18,
    18,
    18,
    18,
    19,
    19,
    19,
    19,
    20,
    20,
    20,
    20,
    21,
    21,
    21,
    21,
    16,
    72,
    78
  ];
  var qr = [
    /* Distance codes 0..29 base */
    1,
    2,
    3,
    4,
    5,
    7,
    9,
    13,
    17,
    25,
    33,
    49,
    65,
    97,
    129,
    193,
    257,
    385,
    513,
    769,
    1025,
    1537,
    2049,
    3073,
    4097,
    6145,
    8193,
    12289,
    16385,
    24577,
    0,
    0
  ];
  var Gr = [
    /* Distance codes 0..29 extra */
    16,
    16,
    16,
    16,
    17,
    17,
    18,
    18,
    19,
    19,
    20,
    20,
    21,
    21,
    22,
    22,
    23,
    23,
    24,
    24,
    25,
    25,
    26,
    26,
    27,
    27,
    28,
    28,
    29,
    29,
    64,
    64
  ];
  Fa.exports = function e(i, t, a, r, n, _, f, d) {
    var l = d.bits;
    var h = 0;
    var x = 0;
    var u = 0, o = 0;
    var s = 0;
    var c = 0;
    var k = 0;
    var b = 0;
    var T = 0;
    var A = 0;
    var p;
    var v;
    var m;
    var S;
    var w;
    var y = null;
    var Z = 0;
    var g;
    var K = new Oa.Buf16(Ee + 1);
    var He = new Oa.Buf16(Ee + 1);
    var Ue = null;
    var Ht = 0;
    var Ut, Ke, Pe;
    for (h = 0; h <= Ee; h++) {
      K[h] = 0;
    }
    for (x = 0; x < r; x++) {
      K[t[a + x]]++;
    }
    s = l;
    for (o = Ee; o >= 1; o--) {
      if (K[o] !== 0) {
        break;
      }
    }
    if (s > o) {
      s = o;
    }
    if (o === 0) {
      n[_++] = 1 << 24 | 64 << 16 | 0;
      n[_++] = 1 << 24 | 64 << 16 | 0;
      d.bits = 1;
      return 0;
    }
    for (u = 1; u < o; u++) {
      if (K[u] !== 0) {
        break;
      }
    }
    if (s < u) {
      s = u;
    }
    b = 1;
    for (h = 1; h <= Ee; h++) {
      b <<= 1;
      b -= K[h];
      if (b < 0) {
        return -1;
      }
    }
    if (b > 0 && (i === Ca || o !== 1)) {
      return -1;
    }
    He[1] = 0;
    for (h = 1; h < Ee; h++) {
      He[h + 1] = He[h] + K[h];
    }
    for (x = 0; x < r; x++) {
      if (t[a + x] !== 0) {
        f[He[t[a + x]]++] = x;
      }
    }
    if (i === Ca) {
      y = Ue = f;
      g = 19;
    } else if (i === At) {
      y = Yr;
      Z -= 257;
      Ue = Xr;
      Ht -= 257;
      g = 256;
    } else {
      y = qr;
      Ue = Gr;
      g = -1;
    }
    A = 0;
    x = 0;
    h = u;
    w = _;
    c = s;
    k = 0;
    m = -1;
    T = 1 << s;
    S = T - 1;
    if (i === At && T > Ia || i === La && T > Ba) {
      return 1;
    }
    for (; ; ) {
      Ut = h - k;
      if (f[x] < g) {
        Ke = 0;
        Pe = f[x];
      } else if (f[x] > g) {
        Ke = Ue[Ht + f[x]];
        Pe = y[Z + f[x]];
      } else {
        Ke = 32 + 64;
        Pe = 0;
      }
      p = 1 << h - k;
      v = 1 << c;
      u = v;
      do {
        v -= p;
        n[w + (A >> k) + v] = Ut << 24 | Ke << 16 | Pe | 0;
      } while (v !== 0);
      p = 1 << h - 1;
      while (A & p) {
        p >>= 1;
      }
      if (p !== 0) {
        A &= p - 1;
        A += p;
      } else {
        A = 0;
      }
      x++;
      if (--K[h] === 0) {
        if (h === o) {
          break;
        }
        h = t[a + f[x]];
      }
      if (h > s && (A & S) !== m) {
        if (k === 0) {
          k = s;
        }
        w += u;
        c = h - k;
        b = 1 << c;
        while (c + k < o) {
          b -= K[c + k];
          if (b <= 0) {
            break;
          }
          c++;
          b <<= 1;
        }
        T += 1 << c;
        if (i === At && T > Ia || i === La && T > Ba) {
          return 1;
        }
        m = A & S;
        n[m] = s << 24 | c << 16 | w - _ | 0;
      }
    }
    if (A !== 0) {
      n[w + A] = h - k << 24 | 64 << 16 | 0;
    }
    d.bits = s;
    return 0;
  };
});

// .sites-runtime/mail-pako/source/package/lib/zlib/inflate.js
var xi = I((Y) => {
  "use strict";
  var F = V();
  var It = bt();
  var W = wt();
  var jr = Na();
  var Le = Ma();
  var Wr = 0;
  var di = 1;
  var ui = 2;
  var Ha = 4;
  var Vr = 5;
  var tt = 6;
  var ue = 0;
  var Jr = 1;
  var Qr = 2;
  var U = -2;
  var vi = -3;
  var Bt = -4;
  var $r = -5;
  var Ua = 8;
  var ci = 1;
  var Ka = 2;
  var Pa = 3;
  var Ya = 4;
  var Xa = 5;
  var qa = 6;
  var Ga = 7;
  var ja = 8;
  var Wa = 9;
  var Va = 10;
  var rt = 11;
  var $ = 12;
  var Dt = 13;
  var Ja = 14;
  var Zt = 15;
  var Qa = 16;
  var $a = 17;
  var ei = 18;
  var ti = 19;
  var at = 20;
  var it = 21;
  var ai = 22;
  var ii = 23;
  var ri = 24;
  var ni = 25;
  var fi = 26;
  var Rt = 27;
  var li = 28;
  var _i = 29;
  var D = 30;
  var Ct = 31;
  var en = 32;
  var tn = 852;
  var an = 592;
  var rn = 15;
  var nn = rn;
  function hi(e) {
    return (e >>> 24 & 255) + (e >>> 8 & 65280) + ((e & 65280) << 8) + ((e & 255) << 24);
  }
  function fn() {
    this.mode = 0;
    this.last = false;
    this.wrap = 0;
    this.havedict = false;
    this.flags = 0;
    this.dmax = 0;
    this.check = 0;
    this.total = 0;
    this.head = null;
    this.wbits = 0;
    this.wsize = 0;
    this.whave = 0;
    this.wnext = 0;
    this.window = null;
    this.hold = 0;
    this.bits = 0;
    this.length = 0;
    this.offset = 0;
    this.extra = 0;
    this.lencode = null;
    this.distcode = null;
    this.lenbits = 0;
    this.distbits = 0;
    this.ncode = 0;
    this.nlen = 0;
    this.ndist = 0;
    this.have = 0;
    this.next = null;
    this.lens = new F.Buf16(320);
    this.work = new F.Buf16(288);
    this.lendyn = null;
    this.distdyn = null;
    this.sane = 0;
    this.back = 0;
    this.was = 0;
  }
  function si(e) {
    var i;
    if (!e || !e.state) {
      return U;
    }
    i = e.state;
    e.total_in = e.total_out = i.total = 0;
    e.msg = "";
    if (i.wrap) {
      e.adler = i.wrap & 1;
    }
    i.mode = ci;
    i.last = 0;
    i.havedict = 0;
    i.dmax = 32768;
    i.head = null;
    i.hold = 0;
    i.bits = 0;
    i.lencode = i.lendyn = new F.Buf32(tn);
    i.distcode = i.distdyn = new F.Buf32(an);
    i.sane = 1;
    i.back = -1;
    return ue;
  }
  function bi(e) {
    var i;
    if (!e || !e.state) {
      return U;
    }
    i = e.state;
    i.wsize = 0;
    i.whave = 0;
    i.wnext = 0;
    return si(e);
  }
  function wi(e, i) {
    var t;
    var a;
    if (!e || !e.state) {
      return U;
    }
    a = e.state;
    if (i < 0) {
      t = 0;
      i = -i;
    } else {
      t = (i >> 4) + 1;
      if (i < 48) {
        i &= 15;
      }
    }
    if (i && (i < 8 || i > 15)) {
      return U;
    }
    if (a.window !== null && a.wbits !== i) {
      a.window = null;
    }
    a.wrap = t;
    a.wbits = i;
    return bi(e);
  }
  function gi(e, i) {
    var t;
    var a;
    if (!e) {
      return U;
    }
    a = new fn();
    e.state = a;
    a.window = null;
    t = wi(e, i);
    if (t !== ue) {
      e.state = null;
    }
    return t;
  }
  function ln(e) {
    return gi(e, nn);
  }
  var oi = true;
  var Nt;
  var Ot;
  function _n(e) {
    if (oi) {
      var i;
      Nt = new F.Buf32(512);
      Ot = new F.Buf32(32);
      i = 0;
      while (i < 144) {
        e.lens[i++] = 8;
      }
      while (i < 256) {
        e.lens[i++] = 9;
      }
      while (i < 280) {
        e.lens[i++] = 7;
      }
      while (i < 288) {
        e.lens[i++] = 8;
      }
      Le(di, e.lens, 0, 288, Nt, 0, e.work, { bits: 9 });
      i = 0;
      while (i < 32) {
        e.lens[i++] = 5;
      }
      Le(ui, e.lens, 0, 32, Ot, 0, e.work, { bits: 5 });
      oi = false;
    }
    e.lencode = Nt;
    e.lenbits = 9;
    e.distcode = Ot;
    e.distbits = 5;
  }
  function pi(e, i, t, a) {
    var r;
    var n = e.state;
    if (n.window === null) {
      n.wsize = 1 << n.wbits;
      n.wnext = 0;
      n.whave = 0;
      n.window = new F.Buf8(n.wsize);
    }
    if (a >= n.wsize) {
      F.arraySet(n.window, i, t - n.wsize, n.wsize, 0);
      n.wnext = 0;
      n.whave = n.wsize;
    } else {
      r = n.wsize - n.wnext;
      if (r > a) {
        r = a;
      }
      F.arraySet(n.window, i, t - a, r, n.wnext);
      a -= r;
      if (a) {
        F.arraySet(n.window, i, t - a, a, 0);
        n.wnext = a;
        n.whave = n.wsize;
      } else {
        n.wnext += r;
        if (n.wnext === n.wsize) {
          n.wnext = 0;
        }
        if (n.whave < n.wsize) {
          n.whave += r;
        }
      }
    }
    return 0;
  }
  function hn(e, i) {
    var t;
    var a, r;
    var n;
    var _;
    var f, d;
    var l;
    var h;
    var x, u;
    var o;
    var s;
    var c;
    var k = 0;
    var b, T, A;
    var p, v, m;
    var S;
    var w;
    var y = new F.Buf8(4);
    var Z;
    var g;
    var K = (
      /* permutation of code lengths */
      [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]
    );
    if (!e || !e.state || !e.output || !e.input && e.avail_in !== 0) {
      return U;
    }
    t = e.state;
    if (t.mode === $) {
      t.mode = Dt;
    }
    _ = e.next_out;
    r = e.output;
    d = e.avail_out;
    n = e.next_in;
    a = e.input;
    f = e.avail_in;
    l = t.hold;
    h = t.bits;
    x = f;
    u = d;
    w = ue;
    e:
      for (; ; ) {
        switch (t.mode) {
          case ci:
            if (t.wrap === 0) {
              t.mode = Dt;
              break;
            }
            while (h < 16) {
              if (f === 0) {
                break e;
              }
              f--;
              l += a[n++] << h;
              h += 8;
            }
            if (t.wrap & 2 && l === 35615) {
              t.check = 0;
              y[0] = l & 255;
              y[1] = l >>> 8 & 255;
              t.check = W(t.check, y, 2, 0);
              l = 0;
              h = 0;
              t.mode = Ka;
              break;
            }
            t.flags = 0;
            if (t.head) {
              t.head.done = false;
            }
            if (!(t.wrap & 1) || /* check if zlib header allowed */
            (((l & 255) << 8) + (l >> 8)) % 31) {
              e.msg = "incorrect header check";
              t.mode = D;
              break;
            }
            if ((l & 15) !== Ua) {
              e.msg = "unknown compression method";
              t.mode = D;
              break;
            }
            l >>>= 4;
            h -= 4;
            S = (l & 15) + 8;
            if (t.wbits === 0) {
              t.wbits = S;
            } else if (S > t.wbits) {
              e.msg = "invalid window size";
              t.mode = D;
              break;
            }
            t.dmax = 1 << S;
            e.adler = t.check = 1;
            t.mode = l & 512 ? Va : $;
            l = 0;
            h = 0;
            break;
          case Ka:
            while (h < 16) {
              if (f === 0) {
                break e;
              }
              f--;
              l += a[n++] << h;
              h += 8;
            }
            t.flags = l;
            if ((t.flags & 255) !== Ua) {
              e.msg = "unknown compression method";
              t.mode = D;
              break;
            }
            if (t.flags & 57344) {
              e.msg = "unknown header flags set";
              t.mode = D;
              break;
            }
            if (t.head) {
              t.head.text = l >> 8 & 1;
            }
            if (t.flags & 512) {
              y[0] = l & 255;
              y[1] = l >>> 8 & 255;
              t.check = W(t.check, y, 2, 0);
            }
            l = 0;
            h = 0;
            t.mode = Pa;
          /* falls through */
          case Pa:
            while (h < 32) {
              if (f === 0) {
                break e;
              }
              f--;
              l += a[n++] << h;
              h += 8;
            }
            if (t.head) {
              t.head.time = l;
            }
            if (t.flags & 512) {
              y[0] = l & 255;
              y[1] = l >>> 8 & 255;
              y[2] = l >>> 16 & 255;
              y[3] = l >>> 24 & 255;
              t.check = W(t.check, y, 4, 0);
            }
            l = 0;
            h = 0;
            t.mode = Ya;
          /* falls through */
          case Ya:
            while (h < 16) {
              if (f === 0) {
                break e;
              }
              f--;
              l += a[n++] << h;
              h += 8;
            }
            if (t.head) {
              t.head.xflags = l & 255;
              t.head.os = l >> 8;
            }
            if (t.flags & 512) {
              y[0] = l & 255;
              y[1] = l >>> 8 & 255;
              t.check = W(t.check, y, 2, 0);
            }
            l = 0;
            h = 0;
            t.mode = Xa;
          /* falls through */
          case Xa:
            if (t.flags & 1024) {
              while (h < 16) {
                if (f === 0) {
                  break e;
                }
                f--;
                l += a[n++] << h;
                h += 8;
              }
              t.length = l;
              if (t.head) {
                t.head.extra_len = l;
              }
              if (t.flags & 512) {
                y[0] = l & 255;
                y[1] = l >>> 8 & 255;
                t.check = W(t.check, y, 2, 0);
              }
              l = 0;
              h = 0;
            } else if (t.head) {
              t.head.extra = null;
            }
            t.mode = qa;
          /* falls through */
          case qa:
            if (t.flags & 1024) {
              o = t.length;
              if (o > f) {
                o = f;
              }
              if (o) {
                if (t.head) {
                  S = t.head.extra_len - t.length;
                  if (!t.head.extra) {
                    t.head.extra = new Array(t.head.extra_len);
                  }
                  F.arraySet(
                    t.head.extra,
                    a,
                    n,
                    // extra field is limited to 65536 bytes
                    // - no need for additional size check
                    o,
                    /*len + copy > state.head.extra_max - len ? state.head.extra_max : copy,*/
                    S
                  );
                }
                if (t.flags & 512) {
                  t.check = W(t.check, a, o, n);
                }
                f -= o;
                n += o;
                t.length -= o;
              }
              if (t.length) {
                break e;
              }
            }
            t.length = 0;
            t.mode = Ga;
          /* falls through */
          case Ga:
            if (t.flags & 2048) {
              if (f === 0) {
                break e;
              }
              o = 0;
              do {
                S = a[n + o++];
                if (t.head && S && t.length < 65536) {
                  t.head.name += String.fromCharCode(S);
                }
              } while (S && o < f);
              if (t.flags & 512) {
                t.check = W(t.check, a, o, n);
              }
              f -= o;
              n += o;
              if (S) {
                break e;
              }
            } else if (t.head) {
              t.head.name = null;
            }
            t.length = 0;
            t.mode = ja;
          /* falls through */
          case ja:
            if (t.flags & 4096) {
              if (f === 0) {
                break e;
              }
              o = 0;
              do {
                S = a[n + o++];
                if (t.head && S && t.length < 65536) {
                  t.head.comment += String.fromCharCode(S);
                }
              } while (S && o < f);
              if (t.flags & 512) {
                t.check = W(t.check, a, o, n);
              }
              f -= o;
              n += o;
              if (S) {
                break e;
              }
            } else if (t.head) {
              t.head.comment = null;
            }
            t.mode = Wa;
          /* falls through */
          case Wa:
            if (t.flags & 512) {
              while (h < 16) {
                if (f === 0) {
                  break e;
                }
                f--;
                l += a[n++] << h;
                h += 8;
              }
              if (l !== (t.check & 65535)) {
                e.msg = "header crc mismatch";
                t.mode = D;
                break;
              }
              l = 0;
              h = 0;
            }
            if (t.head) {
              t.head.hcrc = t.flags >> 9 & 1;
              t.head.done = true;
            }
            e.adler = t.check = 0;
            t.mode = $;
            break;
          case Va:
            while (h < 32) {
              if (f === 0) {
                break e;
              }
              f--;
              l += a[n++] << h;
              h += 8;
            }
            e.adler = t.check = hi(l);
            l = 0;
            h = 0;
            t.mode = rt;
          /* falls through */
          case rt:
            if (t.havedict === 0) {
              e.next_out = _;
              e.avail_out = d;
              e.next_in = n;
              e.avail_in = f;
              t.hold = l;
              t.bits = h;
              return Qr;
            }
            e.adler = t.check = 1;
            t.mode = $;
          /* falls through */
          case $:
            if (i === Vr || i === tt) {
              break e;
            }
          /* falls through */
          case Dt:
            if (t.last) {
              l >>>= h & 7;
              h -= h & 7;
              t.mode = Rt;
              break;
            }
            while (h < 3) {
              if (f === 0) {
                break e;
              }
              f--;
              l += a[n++] << h;
              h += 8;
            }
            t.last = l & 1;
            l >>>= 1;
            h -= 1;
            switch (l & 3) {
              case 0:
                t.mode = Ja;
                break;
              case 1:
                _n(t);
                t.mode = at;
                if (i === tt) {
                  l >>>= 2;
                  h -= 2;
                  break e;
                }
                break;
              case 2:
                t.mode = $a;
                break;
              case 3:
                e.msg = "invalid block type";
                t.mode = D;
            }
            l >>>= 2;
            h -= 2;
            break;
          case Ja:
            l >>>= h & 7;
            h -= h & 7;
            while (h < 32) {
              if (f === 0) {
                break e;
              }
              f--;
              l += a[n++] << h;
              h += 8;
            }
            if ((l & 65535) !== (l >>> 16 ^ 65535)) {
              e.msg = "invalid stored block lengths";
              t.mode = D;
              break;
            }
            t.length = l & 65535;
            l = 0;
            h = 0;
            t.mode = Zt;
            if (i === tt) {
              break e;
            }
          /* falls through */
          case Zt:
            t.mode = Qa;
          /* falls through */
          case Qa:
            o = t.length;
            if (o) {
              if (o > f) {
                o = f;
              }
              if (o > d) {
                o = d;
              }
              if (o === 0) {
                break e;
              }
              F.arraySet(r, a, n, o, _);
              f -= o;
              n += o;
              d -= o;
              _ += o;
              t.length -= o;
              break;
            }
            t.mode = $;
            break;
          case $a:
            while (h < 14) {
              if (f === 0) {
                break e;
              }
              f--;
              l += a[n++] << h;
              h += 8;
            }
            t.nlen = (l & 31) + 257;
            l >>>= 5;
            h -= 5;
            t.ndist = (l & 31) + 1;
            l >>>= 5;
            h -= 5;
            t.ncode = (l & 15) + 4;
            l >>>= 4;
            h -= 4;
            if (t.nlen > 286 || t.ndist > 30) {
              e.msg = "too many length or distance symbols";
              t.mode = D;
              break;
            }
            t.have = 0;
            t.mode = ei;
          /* falls through */
          case ei:
            while (t.have < t.ncode) {
              while (h < 3) {
                if (f === 0) {
                  break e;
                }
                f--;
                l += a[n++] << h;
                h += 8;
              }
              t.lens[K[t.have++]] = l & 7;
              l >>>= 3;
              h -= 3;
            }
            while (t.have < 19) {
              t.lens[K[t.have++]] = 0;
            }
            t.lencode = t.lendyn;
            t.lenbits = 7;
            Z = { bits: t.lenbits };
            w = Le(Wr, t.lens, 0, 19, t.lencode, 0, t.work, Z);
            t.lenbits = Z.bits;
            if (w) {
              e.msg = "invalid code lengths set";
              t.mode = D;
              break;
            }
            t.have = 0;
            t.mode = ti;
          /* falls through */
          case ti:
            while (t.have < t.nlen + t.ndist) {
              for (; ; ) {
                k = t.lencode[l & (1 << t.lenbits) - 1];
                b = k >>> 24;
                T = k >>> 16 & 255;
                A = k & 65535;
                if (b <= h) {
                  break;
                }
                if (f === 0) {
                  break e;
                }
                f--;
                l += a[n++] << h;
                h += 8;
              }
              if (A < 16) {
                l >>>= b;
                h -= b;
                t.lens[t.have++] = A;
              } else {
                if (A === 16) {
                  g = b + 2;
                  while (h < g) {
                    if (f === 0) {
                      break e;
                    }
                    f--;
                    l += a[n++] << h;
                    h += 8;
                  }
                  l >>>= b;
                  h -= b;
                  if (t.have === 0) {
                    e.msg = "invalid bit length repeat";
                    t.mode = D;
                    break;
                  }
                  S = t.lens[t.have - 1];
                  o = 3 + (l & 3);
                  l >>>= 2;
                  h -= 2;
                } else if (A === 17) {
                  g = b + 3;
                  while (h < g) {
                    if (f === 0) {
                      break e;
                    }
                    f--;
                    l += a[n++] << h;
                    h += 8;
                  }
                  l >>>= b;
                  h -= b;
                  S = 0;
                  o = 3 + (l & 7);
                  l >>>= 3;
                  h -= 3;
                } else {
                  g = b + 7;
                  while (h < g) {
                    if (f === 0) {
                      break e;
                    }
                    f--;
                    l += a[n++] << h;
                    h += 8;
                  }
                  l >>>= b;
                  h -= b;
                  S = 0;
                  o = 11 + (l & 127);
                  l >>>= 7;
                  h -= 7;
                }
                if (t.have + o > t.nlen + t.ndist) {
                  e.msg = "invalid bit length repeat";
                  t.mode = D;
                  break;
                }
                while (o--) {
                  t.lens[t.have++] = S;
                }
              }
            }
            if (t.mode === D) {
              break;
            }
            if (t.lens[256] === 0) {
              e.msg = "invalid code -- missing end-of-block";
              t.mode = D;
              break;
            }
            t.lenbits = 9;
            Z = { bits: t.lenbits };
            w = Le(di, t.lens, 0, t.nlen, t.lencode, 0, t.work, Z);
            t.lenbits = Z.bits;
            if (w) {
              e.msg = "invalid literal/lengths set";
              t.mode = D;
              break;
            }
            t.distbits = 6;
            t.distcode = t.distdyn;
            Z = { bits: t.distbits };
            w = Le(ui, t.lens, t.nlen, t.ndist, t.distcode, 0, t.work, Z);
            t.distbits = Z.bits;
            if (w) {
              e.msg = "invalid distances set";
              t.mode = D;
              break;
            }
            t.mode = at;
            if (i === tt) {
              break e;
            }
          /* falls through */
          case at:
            t.mode = it;
          /* falls through */
          case it:
            if (f >= 6 && d >= 258) {
              e.next_out = _;
              e.avail_out = d;
              e.next_in = n;
              e.avail_in = f;
              t.hold = l;
              t.bits = h;
              jr(e, u);
              _ = e.next_out;
              r = e.output;
              d = e.avail_out;
              n = e.next_in;
              a = e.input;
              f = e.avail_in;
              l = t.hold;
              h = t.bits;
              if (t.mode === $) {
                t.back = -1;
              }
              break;
            }
            t.back = 0;
            for (; ; ) {
              k = t.lencode[l & (1 << t.lenbits) - 1];
              b = k >>> 24;
              T = k >>> 16 & 255;
              A = k & 65535;
              if (b <= h) {
                break;
              }
              if (f === 0) {
                break e;
              }
              f--;
              l += a[n++] << h;
              h += 8;
            }
            if (T && (T & 240) === 0) {
              p = b;
              v = T;
              m = A;
              for (; ; ) {
                k = t.lencode[m + ((l & (1 << p + v) - 1) >> p)];
                b = k >>> 24;
                T = k >>> 16 & 255;
                A = k & 65535;
                if (p + b <= h) {
                  break;
                }
                if (f === 0) {
                  break e;
                }
                f--;
                l += a[n++] << h;
                h += 8;
              }
              l >>>= p;
              h -= p;
              t.back += p;
            }
            l >>>= b;
            h -= b;
            t.back += b;
            t.length = A;
            if (T === 0) {
              t.mode = fi;
              break;
            }
            if (T & 32) {
              t.back = -1;
              t.mode = $;
              break;
            }
            if (T & 64) {
              e.msg = "invalid literal/length code";
              t.mode = D;
              break;
            }
            t.extra = T & 15;
            t.mode = ai;
          /* falls through */
          case ai:
            if (t.extra) {
              g = t.extra;
              while (h < g) {
                if (f === 0) {
                  break e;
                }
                f--;
                l += a[n++] << h;
                h += 8;
              }
              t.length += l & (1 << t.extra) - 1;
              l >>>= t.extra;
              h -= t.extra;
              t.back += t.extra;
            }
            t.was = t.length;
            t.mode = ii;
          /* falls through */
          case ii:
            for (; ; ) {
              k = t.distcode[l & (1 << t.distbits) - 1];
              b = k >>> 24;
              T = k >>> 16 & 255;
              A = k & 65535;
              if (b <= h) {
                break;
              }
              if (f === 0) {
                break e;
              }
              f--;
              l += a[n++] << h;
              h += 8;
            }
            if ((T & 240) === 0) {
              p = b;
              v = T;
              m = A;
              for (; ; ) {
                k = t.distcode[m + ((l & (1 << p + v) - 1) >> p)];
                b = k >>> 24;
                T = k >>> 16 & 255;
                A = k & 65535;
                if (p + b <= h) {
                  break;
                }
                if (f === 0) {
                  break e;
                }
                f--;
                l += a[n++] << h;
                h += 8;
              }
              l >>>= p;
              h -= p;
              t.back += p;
            }
            l >>>= b;
            h -= b;
            t.back += b;
            if (T & 64) {
              e.msg = "invalid distance code";
              t.mode = D;
              break;
            }
            t.offset = A;
            t.extra = T & 15;
            t.mode = ri;
          /* falls through */
          case ri:
            if (t.extra) {
              g = t.extra;
              while (h < g) {
                if (f === 0) {
                  break e;
                }
                f--;
                l += a[n++] << h;
                h += 8;
              }
              t.offset += l & (1 << t.extra) - 1;
              l >>>= t.extra;
              h -= t.extra;
              t.back += t.extra;
            }
            if (t.offset > t.dmax) {
              e.msg = "invalid distance too far back";
              t.mode = D;
              break;
            }
            t.mode = ni;
          /* falls through */
          case ni:
            if (d === 0) {
              break e;
            }
            o = u - d;
            if (t.offset > o) {
              o = t.offset - o;
              if (o > t.whave) {
                if (t.sane) {
                  e.msg = "invalid distance too far back";
                  t.mode = D;
                  break;
                }
              }
              if (o > t.wnext) {
                o -= t.wnext;
                s = t.wsize - o;
              } else {
                s = t.wnext - o;
              }
              if (o > t.length) {
                o = t.length;
              }
              c = t.window;
            } else {
              c = r;
              s = _ - t.offset;
              o = t.length;
            }
            if (o > d) {
              o = d;
            }
            d -= o;
            t.length -= o;
            do {
              r[_++] = c[s++];
            } while (--o);
            if (t.length === 0) {
              t.mode = it;
            }
            break;
          case fi:
            if (d === 0) {
              break e;
            }
            r[_++] = t.length;
            d--;
            t.mode = it;
            break;
          case Rt:
            if (t.wrap) {
              while (h < 32) {
                if (f === 0) {
                  break e;
                }
                f--;
                l |= a[n++] << h;
                h += 8;
              }
              u -= d;
              e.total_out += u;
              t.total += u;
              if (u) {
                e.adler = t.check = /*UPDATE(state.check, put - _out, _out);*/
                t.flags ? W(t.check, r, u, _ - u) : It(t.check, r, u, _ - u);
              }
              u = d;
              if ((t.flags ? l : hi(l)) !== t.check) {
                e.msg = "incorrect data check";
                t.mode = D;
                break;
              }
              l = 0;
              h = 0;
            }
            t.mode = li;
          /* falls through */
          case li:
            if (t.wrap && t.flags) {
              while (h < 32) {
                if (f === 0) {
                  break e;
                }
                f--;
                l += a[n++] << h;
                h += 8;
              }
              if (l !== (t.total & 4294967295)) {
                e.msg = "incorrect length check";
                t.mode = D;
                break;
              }
              l = 0;
              h = 0;
            }
            t.mode = _i;
          /* falls through */
          case _i:
            w = Jr;
            break e;
          case D:
            w = vi;
            break e;
          case Ct:
            return Bt;
          case en:
          /* falls through */
          default:
            return U;
        }
      }
    e.next_out = _;
    e.avail_out = d;
    e.next_in = n;
    e.avail_in = f;
    t.hold = l;
    t.bits = h;
    if (t.wsize || u !== e.avail_out && t.mode < D && (t.mode < Rt || i !== Ha)) {
      if (pi(e, e.output, e.next_out, u - e.avail_out)) {
        t.mode = Ct;
        return Bt;
      }
    }
    x -= e.avail_in;
    u -= e.avail_out;
    e.total_in += x;
    e.total_out += u;
    t.total += u;
    if (t.wrap && u) {
      e.adler = t.check = /*UPDATE(state.check, strm.next_out - _out, _out);*/
      t.flags ? W(t.check, r, u, e.next_out - u) : It(t.check, r, u, e.next_out - u);
    }
    e.data_type = t.bits + (t.last ? 64 : 0) + (t.mode === $ ? 128 : 0) + (t.mode === at || t.mode === Zt ? 256 : 0);
    if ((x === 0 && u === 0 || i === Ha) && w === ue) {
      w = $r;
    }
    return w;
  }
  function on(e) {
    if (!e || !e.state) {
      return U;
    }
    var i = e.state;
    if (i.window) {
      i.window = null;
    }
    e.state = null;
    return ue;
  }
  function dn(e, i) {
    var t;
    if (!e || !e.state) {
      return U;
    }
    t = e.state;
    if ((t.wrap & 2) === 0) {
      return U;
    }
    t.head = i;
    i.done = false;
    return ue;
  }
  function un(e, i) {
    var t = i.length;
    var a;
    var r;
    var n;
    if (!e || !e.state) {
      return U;
    }
    a = e.state;
    if (a.wrap !== 0 && a.mode !== rt) {
      return U;
    }
    if (a.mode === rt) {
      r = 1;
      r = It(r, i, t, 0);
      if (r !== a.check) {
        return vi;
      }
    }
    n = pi(e, i, t, t);
    if (n) {
      a.mode = Ct;
      return Bt;
    }
    a.havedict = 1;
    return ue;
  }
  Y.inflateReset = bi;
  Y.inflateReset2 = wi;
  Y.inflateResetKeep = si;
  Y.inflateInit = ln;
  Y.inflateInit2 = gi;
  Y.inflate = hn;
  Y.inflateEnd = on;
  Y.inflateGetHeader = dn;
  Y.inflateSetDictionary = un;
  Y.inflateInfo = "pako inflate (from Nodeca project)";
});

// .sites-runtime/mail-pako/source/package/lib/zlib/constants.js
var Lt = I((Bn, ki) => {
  "use strict";
  ki.exports = {
    /* Allowed flush values; see deflate() and inflate() below for details */
    Z_NO_FLUSH: 0,
    Z_PARTIAL_FLUSH: 1,
    Z_SYNC_FLUSH: 2,
    Z_FULL_FLUSH: 3,
    Z_FINISH: 4,
    Z_BLOCK: 5,
    Z_TREES: 6,
    /* Return codes for the compression/decompression functions. Negative values
    * are errors, positive values are used for special but normal events.
    */
    Z_OK: 0,
    Z_STREAM_END: 1,
    Z_NEED_DICT: 2,
    Z_ERRNO: -1,
    Z_STREAM_ERROR: -2,
    Z_DATA_ERROR: -3,
    //Z_MEM_ERROR:     -4,
    Z_BUF_ERROR: -5,
    //Z_VERSION_ERROR: -6,
    /* compression levels */
    Z_NO_COMPRESSION: 0,
    Z_BEST_SPEED: 1,
    Z_BEST_COMPRESSION: 9,
    Z_DEFAULT_COMPRESSION: -1,
    Z_FILTERED: 1,
    Z_HUFFMAN_ONLY: 2,
    Z_RLE: 3,
    Z_FIXED: 4,
    Z_DEFAULT_STRATEGY: 0,
    /* Possible values of the data_type field (though see inflate()) */
    Z_BINARY: 0,
    Z_TEXT: 1,
    //Z_ASCII:                1, // = Z_TEXT (deprecated)
    Z_UNKNOWN: 2,
    /* The deflate compression method */
    Z_DEFLATED: 8
    //Z_NULL:                 null // Use -1 or null inline, depending on var type
  };
});

// .sites-runtime/mail-pako/source/package/lib/zlib/gzheader.js
var Si = I((Cn, Ei) => {
  "use strict";
  function vn() {
    this.text = 0;
    this.time = 0;
    this.xflags = 0;
    this.os = 0;
    this.extra = null;
    this.extra_len = 0;
    this.name = "";
    this.comment = "";
    this.hcrc = 0;
    this.done = false;
  }
  Ei.exports = vn;
});

// .sites-runtime/mail-pako/source/package/lib/inflate.js
var zi = I((Me) => {
  "use strict";
  var Se = xi();
  var Fe = V();
  var nt = Et();
  var R = Lt();
  var Ft = qe();
  var cn = St();
  var sn = Si();
  var yi = Object.prototype.toString;
  function ve(e) {
    if (!(this instanceof ve)) return new ve(e);
    this.options = Fe.assign({
      chunkSize: 16384,
      windowBits: 0,
      to: ""
    }, e || {});
    var i = this.options;
    if (i.raw && i.windowBits >= 0 && i.windowBits < 16) {
      i.windowBits = -i.windowBits;
      if (i.windowBits === 0) {
        i.windowBits = -15;
      }
    }
    if (i.windowBits >= 0 && i.windowBits < 16 && !(e && e.windowBits)) {
      i.windowBits += 32;
    }
    if (i.windowBits > 15 && i.windowBits < 48) {
      if ((i.windowBits & 15) === 0) {
        i.windowBits |= 15;
      }
    }
    this.err = 0;
    this.msg = "";
    this.ended = false;
    this.chunks = [];
    this.strm = new cn();
    this.strm.avail_out = 0;
    var t = Se.inflateInit2(
      this.strm,
      i.windowBits
    );
    if (t !== R.Z_OK) {
      throw new Error(Ft[t]);
    }
    this.header = new sn();
    Se.inflateGetHeader(this.strm, this.header);
    if (i.dictionary) {
      if (typeof i.dictionary === "string") {
        i.dictionary = nt.string2buf(i.dictionary);
      } else if (yi.call(i.dictionary) === "[object ArrayBuffer]") {
        i.dictionary = new Uint8Array(i.dictionary);
      }
      if (i.raw) {
        t = Se.inflateSetDictionary(this.strm, i.dictionary);
        if (t !== R.Z_OK) {
          throw new Error(Ft[t]);
        }
      }
    }
  }
  ve.prototype.push = function(e, i) {
    var t = this.strm;
    var a = this.options.chunkSize;
    var r = this.options.dictionary;
    var n, _;
    var f, d, l;
    var h = false;
    if (this.ended) {
      return false;
    }
    _ = i === ~~i ? i : i === true ? R.Z_FINISH : R.Z_NO_FLUSH;
    if (typeof e === "string") {
      t.input = nt.binstring2buf(e);
    } else if (yi.call(e) === "[object ArrayBuffer]") {
      t.input = new Uint8Array(e);
    } else {
      t.input = e;
    }
    t.next_in = 0;
    t.avail_in = t.input.length;
    do {
      if (t.avail_out === 0) {
        t.output = new Fe.Buf8(a);
        t.next_out = 0;
        t.avail_out = a;
      }
      n = Se.inflate(t, R.Z_NO_FLUSH);
      if (n === R.Z_NEED_DICT && r) {
        n = Se.inflateSetDictionary(this.strm, r);
      }
      if (n === R.Z_BUF_ERROR && h === true) {
        n = R.Z_OK;
        h = false;
      }
      if (n !== R.Z_STREAM_END && n !== R.Z_OK) {
        this.onEnd(n);
        this.ended = true;
        return false;
      }
      if (t.next_out) {
        if (t.avail_out === 0 || n === R.Z_STREAM_END || t.avail_in === 0 && (_ === R.Z_FINISH || _ === R.Z_SYNC_FLUSH)) {
          if (this.options.to === "string") {
            f = nt.utf8border(t.output, t.next_out);
            d = t.next_out - f;
            l = nt.buf2string(t.output, f);
            t.next_out = d;
            t.avail_out = a - d;
            if (d) {
              Fe.arraySet(t.output, t.output, f, d, 0);
            }
            this.onData(l);
          } else {
            this.onData(Fe.shrinkBuf(t.output, t.next_out));
          }
        }
      }
      if (t.avail_in === 0 && t.avail_out === 0) {
        h = true;
      }
    } while ((t.avail_in > 0 || t.avail_out === 0) && n !== R.Z_STREAM_END);
    if (n === R.Z_STREAM_END) {
      _ = R.Z_FINISH;
    }
    if (_ === R.Z_FINISH) {
      n = Se.inflateEnd(this.strm);
      this.onEnd(n);
      this.ended = true;
      return n === R.Z_OK;
    }
    if (_ === R.Z_SYNC_FLUSH) {
      this.onEnd(R.Z_OK);
      t.avail_out = 0;
      return true;
    }
    return true;
  };
  ve.prototype.onData = function(e) {
    this.chunks.push(e);
  };
  ve.prototype.onEnd = function(e) {
    if (e === R.Z_OK) {
      if (this.options.to === "string") {
        this.result = this.chunks.join("");
      } else {
        this.result = Fe.flattenChunks(this.chunks);
      }
    }
    this.chunks = [];
    this.err = e;
    this.msg = this.strm.msg;
  };
  function Mt(e, i) {
    var t = new ve(i);
    t.push(e, true);
    if (t.err) {
      throw t.msg || Ft[t.err];
    }
    return t.result;
  }
  function bn(e, i) {
    i = i || {};
    i.raw = true;
    return Mt(e, i);
  }
  Me.Inflate = ve;
  Me.inflate = Mt;
  Me.inflateRaw = bn;
  Me.ungzip = Mt;
});

// .sites-runtime/mail-pako/source/package/index.js
var kn = I((Fn, Ti) => {
  var wn = V().assign;
  var gn = Za();
  var pn = zi();
  var xn = Lt();
  var mi = {};
  wn(mi, gn, pn, xn);
  Ti.exports = mi;
});
export default kn();
