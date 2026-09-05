window.__ModuleLoader__.load({
	id: "aidos",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/lib/core.js
var require_core = __commonJS({
  "node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/lib/core.js"(exports, module2) {
    "use strict";
    function deepFreeze(obj) {
      if (obj instanceof Map) {
        obj.clear = obj.delete = obj.set = function() {
          throw new Error("map is read-only");
        };
      } else if (obj instanceof Set) {
        obj.add = obj.clear = obj.delete = function() {
          throw new Error("set is read-only");
        };
      }
      Object.freeze(obj);
      Object.getOwnPropertyNames(obj).forEach((name2) => {
        const prop = obj[name2];
        const type = typeof prop;
        if ((type === "object" || type === "function") && !Object.isFrozen(prop)) {
          deepFreeze(prop);
        }
      });
      return obj;
    }
    var Response = class {
      /**
       * @param {CompiledMode} mode
       */
      constructor(mode) {
        if (mode.data === void 0) mode.data = {};
        this.data = mode.data;
        this.isMatchIgnored = false;
      }
      ignoreMatch() {
        this.isMatchIgnored = true;
      }
    };
    function escapeHTML(value) {
      return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
    }
    function inherit$1(original, ...objects) {
      const result = /* @__PURE__ */ Object.create(null);
      for (const key in original) {
        result[key] = original[key];
      }
      objects.forEach(function(obj) {
        for (const key in obj) {
          result[key] = obj[key];
        }
      });
      return (
        /** @type {T} */
        result
      );
    }
    var SPAN_CLOSE = "</span>";
    var emitsWrappingTags = (node) => {
      return !!node.scope;
    };
    var scopeToCSSClass = (name2, { prefix }) => {
      if (name2.startsWith("language:")) {
        return name2.replace("language:", "language-");
      }
      if (name2.includes(".")) {
        const pieces = name2.split(".");
        return [
          `${prefix}${pieces.shift()}`,
          ...pieces.map((x2, i) => `${x2}${"_".repeat(i + 1)}`)
        ].join(" ");
      }
      return `${prefix}${name2}`;
    };
    var HTMLRenderer = class {
      /**
       * Creates a new HTMLRenderer
       *
       * @param {Tree} parseTree - the parse tree (must support `walk` API)
       * @param {{classPrefix: string}} options
       */
      constructor(parseTree, options) {
        this.buffer = "";
        this.classPrefix = options.classPrefix;
        parseTree.walk(this);
      }
      /**
       * Adds texts to the output stream
       *
       * @param {string} text */
      addText(text) {
        this.buffer += escapeHTML(text);
      }
      /**
       * Adds a node open to the output stream (if needed)
       *
       * @param {Node} node */
      openNode(node) {
        if (!emitsWrappingTags(node)) return;
        const className = scopeToCSSClass(
          node.scope,
          { prefix: this.classPrefix }
        );
        this.span(className);
      }
      /**
       * Adds a node close to the output stream (if needed)
       *
       * @param {Node} node */
      closeNode(node) {
        if (!emitsWrappingTags(node)) return;
        this.buffer += SPAN_CLOSE;
      }
      /**
       * returns the accumulated buffer
      */
      value() {
        return this.buffer;
      }
      // helpers
      /**
       * Builds a span element
       *
       * @param {string} className */
      span(className) {
        this.buffer += `<span class="${className}">`;
      }
    };
    var newNode = (opts = {}) => {
      const result = { children: [] };
      Object.assign(result, opts);
      return result;
    };
    var TokenTree = class _TokenTree {
      constructor() {
        this.rootNode = newNode();
        this.stack = [this.rootNode];
      }
      get top() {
        return this.stack[this.stack.length - 1];
      }
      get root() {
        return this.rootNode;
      }
      /** @param {Node} node */
      add(node) {
        this.top.children.push(node);
      }
      /** @param {string} scope */
      openNode(scope) {
        const node = newNode({ scope });
        this.add(node);
        this.stack.push(node);
      }
      closeNode() {
        if (this.stack.length > 1) {
          return this.stack.pop();
        }
        return void 0;
      }
      closeAllNodes() {
        while (this.closeNode()) ;
      }
      toJSON() {
        return JSON.stringify(this.rootNode, null, 4);
      }
      /**
       * @typedef { import("./html_renderer").Renderer } Renderer
       * @param {Renderer} builder
       */
      walk(builder) {
        return this.constructor._walk(builder, this.rootNode);
      }
      /**
       * @param {Renderer} builder
       * @param {Node} node
       */
      static _walk(builder, node) {
        if (typeof node === "string") {
          builder.addText(node);
        } else if (node.children) {
          builder.openNode(node);
          node.children.forEach((child) => this._walk(builder, child));
          builder.closeNode(node);
        }
        return builder;
      }
      /**
       * @param {Node} node
       */
      static _collapse(node) {
        if (typeof node === "string") return;
        if (!node.children) return;
        if (node.children.every((el) => typeof el === "string")) {
          node.children = [node.children.join("")];
        } else {
          node.children.forEach((child) => {
            _TokenTree._collapse(child);
          });
        }
      }
    };
    var TokenTreeEmitter = class extends TokenTree {
      /**
       * @param {*} options
       */
      constructor(options) {
        super();
        this.options = options;
      }
      /**
       * @param {string} text
       */
      addText(text) {
        if (text === "") {
          return;
        }
        this.add(text);
      }
      /** @param {string} scope */
      startScope(scope) {
        this.openNode(scope);
      }
      endScope() {
        this.closeNode();
      }
      /**
       * @param {Emitter & {root: DataNode}} emitter
       * @param {string} name
       */
      __addSublanguage(emitter, name2) {
        const node = emitter.root;
        if (name2) node.scope = `language:${name2}`;
        this.add(node);
      }
      toHTML() {
        const renderer = new HTMLRenderer(this, this.options);
        return renderer.value();
      }
      finalize() {
        this.closeAllNodes();
        return true;
      }
    };
    function source(re) {
      if (!re) return null;
      if (typeof re === "string") return re;
      return re.source;
    }
    function lookahead(re) {
      return concat("(?=", re, ")");
    }
    function anyNumberOfTimes(re) {
      return concat("(?:", re, ")*");
    }
    function optional(re) {
      return concat("(?:", re, ")?");
    }
    function concat(...args) {
      const joined = args.map((x2) => source(x2)).join("");
      return joined;
    }
    function stripOptionsFromArgs(args) {
      const opts = args[args.length - 1];
      if (typeof opts === "object" && opts.constructor === Object) {
        args.splice(args.length - 1, 1);
        return opts;
      } else {
        return {};
      }
    }
    function either(...args) {
      const opts = stripOptionsFromArgs(args);
      const joined = "(" + (opts.capture ? "" : "?:") + args.map((x2) => source(x2)).join("|") + ")";
      return joined;
    }
    function countMatchGroups(re) {
      return new RegExp(re.toString() + "|").exec("").length - 1;
    }
    function startsWith(re, lexeme) {
      const match = re && re.exec(lexeme);
      return match && match.index === 0;
    }
    var BACKREF_RE = new RegExp(either(
      /\[(?:[^\\\]]|\\.)*\]/,
      // a character class, inside which ( and \ lose their meaning
      /\(\?<(?![=!])[^>]+>/,
      // a named capture group `(?<name>` (not a lookbehind `(?<=` / `(?<!`)
      /\(\?'[^']+'/,
      // a named capture group `(?'name'`
      /\(\??/,
      // an opening parenthesis, capturing or non-capturing / lookahead
      /\\([1-9][0-9]*)/,
      // a backreference like `\1`
      /\\./
      // any other escape sequence
    ));
    function _rewriteBackreferences(regexps, { joinWith }) {
      let numCaptures = 0;
      return regexps.map((regex) => {
        numCaptures += 1;
        const offset = numCaptures;
        let re = source(regex);
        let out = "";
        while (re.length > 0) {
          const match = BACKREF_RE.exec(re);
          if (!match) {
            out += re;
            break;
          }
          out += re.substring(0, match.index);
          re = re.substring(match.index + match[0].length);
          if (match[0][0] === "\\" && match[1]) {
            out += "\\" + String(Number(match[1]) + offset);
          } else {
            out += match[0];
            if (match[0] === "(" || /^\(\?[<']/.test(match[0])) {
              numCaptures++;
            }
          }
        }
        return out;
      }).map((re) => `(${re})`).join(joinWith);
    }
    var MATCH_NOTHING_RE = /\b\B/;
    var IDENT_RE3 = "[a-zA-Z]\\w*";
    var UNDERSCORE_IDENT_RE = "[a-zA-Z_]\\w*";
    var NUMBER_RE = "\\b\\d+(\\.\\d+)?";
    var C_NUMBER_RE = "(-?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)";
    var BINARY_NUMBER_RE = "\\b(0b[01]+)";
    var RE_STARTERS_RE = "!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|>>|>|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~";
    var SHEBANG = (opts = {}) => {
      const beginShebang = /^#![ ]*\//;
      if (opts.binary) {
        opts.begin = concat(
          beginShebang,
          /.*\b/,
          opts.binary,
          /\b.*/
        );
      }
      return inherit$1({
        scope: "meta",
        begin: beginShebang,
        end: /$/,
        relevance: 0,
        /** @type {ModeCallback} */
        "on:begin": (m2, resp) => {
          if (m2.index !== 0) resp.ignoreMatch();
        }
      }, opts);
    };
    var BACKSLASH_ESCAPE = {
      begin: "\\\\[\\s\\S]",
      relevance: 0
    };
    var APOS_STRING_MODE = {
      scope: "string",
      begin: "'",
      end: "'",
      illegal: "\\n",
      contains: [BACKSLASH_ESCAPE]
    };
    var QUOTE_STRING_MODE = {
      scope: "string",
      begin: '"',
      end: '"',
      illegal: "\\n",
      contains: [BACKSLASH_ESCAPE]
    };
    var PHRASAL_WORDS_MODE = {
      begin: /\b(a|an|the|are|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such|will|you|your|they|like|more)\b/
    };
    var COMMENT = function(begin, end, modeOptions = {}) {
      const mode = inherit$1(
        {
          scope: "comment",
          begin,
          end,
          contains: []
        },
        modeOptions
      );
      mode.contains.push({
        scope: "doctag",
        // hack to avoid the space from being included. the space is necessary to
        // match here to prevent the plain text rule below from gobbling up doctags
        begin: "[ ]*(?=(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):)",
        end: /(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):/,
        excludeBegin: true,
        relevance: 0
      });
      const ENGLISH_WORD = either(
        // list of common 1 and 2 letter words in English
        "I",
        "a",
        "is",
        "so",
        "us",
        "to",
        "at",
        "if",
        "in",
        "it",
        "on",
        // note: this is not an exhaustive list of contractions, just popular ones
        /[A-Za-z]+['](d|ve|re|ll|t|s|n)/,
        // contractions - can't we'd they're let's, etc
        /[A-Za-z]+[-][a-z]+/,
        // `no-way`, etc.
        /[A-Za-z][a-z]{2,}/
        // allow capitalized words at beginning of sentences
      );
      mode.contains.push(
        {
          // TODO: how to include ", (, ) without breaking grammars that use these for
          // comment delimiters?
          // begin: /[ ]+([()"]?([A-Za-z'-]{3,}|is|a|I|so|us|[tT][oO]|at|if|in|it|on)[.]?[()":]?([.][ ]|[ ]|\))){3}/
          // ---
          // this tries to find sequences of 3 english words in a row (without any
          // "programming" type syntax) this gives us a strong signal that we've
          // TRULY found a comment - vs perhaps scanning with the wrong language.
          // It's possible to find something that LOOKS like the start of the
          // comment - but then if there is no readable text - good chance it is a
          // false match and not a comment.
          //
          // for a visual example please see:
          // https://github.com/highlightjs/highlight.js/issues/2827
          begin: concat(
            /[ ]+/,
            // necessary to prevent us gobbling up doctags like /* @author Bob Mcgill */
            "(",
            ENGLISH_WORD,
            /[.]?[:]?([.][ ]|[ ])/,
            "){3}"
          )
          // look for 3 words in a row
        }
      );
      return mode;
    };
    var C_LINE_COMMENT_MODE = COMMENT("//", "$");
    var C_BLOCK_COMMENT_MODE = COMMENT("/\\*", "\\*/");
    var HASH_COMMENT_MODE = COMMENT("#", "$");
    var NUMBER_MODE = {
      scope: "number",
      begin: NUMBER_RE,
      relevance: 0
    };
    var C_NUMBER_MODE = {
      scope: "number",
      begin: C_NUMBER_RE,
      relevance: 0
    };
    var BINARY_NUMBER_MODE = {
      scope: "number",
      begin: BINARY_NUMBER_RE,
      relevance: 0
    };
    var REGEXP_MODE = {
      scope: "regexp",
      begin: /\/(?=[^/\n]*\/)/,
      end: /\/[gimuy]*/,
      contains: [
        BACKSLASH_ESCAPE,
        {
          begin: /\[/,
          end: /\]/,
          relevance: 0,
          contains: [BACKSLASH_ESCAPE]
        }
      ]
    };
    var TITLE_MODE = {
      scope: "title",
      begin: IDENT_RE3,
      relevance: 0
    };
    var UNDERSCORE_TITLE_MODE = {
      scope: "title",
      begin: UNDERSCORE_IDENT_RE,
      relevance: 0
    };
    var METHOD_GUARD = {
      // excludes method names from keyword processing
      begin: "\\.\\s*" + UNDERSCORE_IDENT_RE,
      relevance: 0
    };
    var END_SAME_AS_BEGIN = function(mode) {
      return Object.assign(
        mode,
        {
          /** @type {ModeCallback} */
          "on:begin": (m2, resp) => {
            resp.data._beginMatch = m2[1];
          },
          /** @type {ModeCallback} */
          "on:end": (m2, resp) => {
            if (resp.data._beginMatch !== m2[1]) resp.ignoreMatch();
          }
        }
      );
    };
    var MODES = /* @__PURE__ */ Object.freeze({
      __proto__: null,
      APOS_STRING_MODE,
      BACKSLASH_ESCAPE,
      BINARY_NUMBER_MODE,
      BINARY_NUMBER_RE,
      COMMENT,
      C_BLOCK_COMMENT_MODE,
      C_LINE_COMMENT_MODE,
      C_NUMBER_MODE,
      C_NUMBER_RE,
      END_SAME_AS_BEGIN,
      HASH_COMMENT_MODE,
      IDENT_RE: IDENT_RE3,
      MATCH_NOTHING_RE,
      METHOD_GUARD,
      NUMBER_MODE,
      NUMBER_RE,
      PHRASAL_WORDS_MODE,
      QUOTE_STRING_MODE,
      REGEXP_MODE,
      RE_STARTERS_RE,
      SHEBANG,
      TITLE_MODE,
      UNDERSCORE_IDENT_RE,
      UNDERSCORE_TITLE_MODE
    });
    function skipIfHasPrecedingDot(match, response) {
      const before = match.input[match.index - 1];
      if (before === ".") {
        response.ignoreMatch();
      }
    }
    function scopeClassName(mode, _parent) {
      if (mode.className !== void 0) {
        mode.scope = mode.className;
        delete mode.className;
      }
    }
    function beginKeywords(mode, parent) {
      if (!parent) return;
      if (!mode.beginKeywords) return;
      mode.begin = "\\b(" + mode.beginKeywords.split(" ").join("|") + ")(?!\\.)(?=\\b|\\s)";
      mode.__beforeBegin = skipIfHasPrecedingDot;
      mode.keywords = mode.keywords || mode.beginKeywords;
      delete mode.beginKeywords;
      if (mode.relevance === void 0) mode.relevance = 0;
    }
    function compileIllegal(mode, _parent) {
      if (!Array.isArray(mode.illegal)) return;
      mode.illegal = either(...mode.illegal);
    }
    function compileMatch(mode, _parent) {
      if (!mode.match) return;
      if (mode.begin || mode.end) throw new Error("begin & end are not supported with match");
      mode.begin = mode.match;
      delete mode.match;
    }
    function compileRelevance(mode, _parent) {
      if (mode.relevance === void 0) mode.relevance = 1;
    }
    var beforeMatchExt = (mode, parent) => {
      if (!mode.beforeMatch) return;
      if (mode.starts) throw new Error("beforeMatch cannot be used with starts");
      const originalMode = Object.assign({}, mode);
      Object.keys(mode).forEach((key) => {
        delete mode[key];
      });
      mode.keywords = originalMode.keywords;
      mode.begin = concat(originalMode.beforeMatch, lookahead(originalMode.begin));
      mode.starts = {
        relevance: 0,
        contains: [
          Object.assign(originalMode, { endsParent: true })
        ]
      };
      mode.relevance = 0;
      delete originalMode.beforeMatch;
    };
    var COMMON_KEYWORDS = [
      "of",
      "and",
      "for",
      "in",
      "not",
      "or",
      "if",
      "then",
      "parent",
      // common variable name
      "list",
      // common variable name
      "value"
      // common variable name
    ];
    var DEFAULT_KEYWORD_SCOPE = "keyword";
    function compileKeywords(rawKeywords, caseInsensitive, scopeName = DEFAULT_KEYWORD_SCOPE) {
      const compiledKeywords = /* @__PURE__ */ Object.create(null);
      if (typeof rawKeywords === "string") {
        compileList(scopeName, rawKeywords.split(" "));
      } else if (Array.isArray(rawKeywords)) {
        compileList(scopeName, rawKeywords);
      } else {
        Object.keys(rawKeywords).forEach(function(scopeName2) {
          Object.assign(
            compiledKeywords,
            compileKeywords(rawKeywords[scopeName2], caseInsensitive, scopeName2)
          );
        });
      }
      return compiledKeywords;
      function compileList(scopeName2, keywordList) {
        if (caseInsensitive) {
          keywordList = keywordList.map((x2) => x2.toLowerCase());
        }
        keywordList.forEach(function(keyword) {
          const pair = keyword.split("|");
          compiledKeywords[pair[0]] = [scopeName2, scoreForKeyword(pair[0], pair[1])];
        });
      }
    }
    function scoreForKeyword(keyword, providedScore) {
      if (providedScore) {
        return Number(providedScore);
      }
      return commonKeyword(keyword) ? 0 : 1;
    }
    function commonKeyword(keyword) {
      return COMMON_KEYWORDS.includes(keyword.toLowerCase());
    }
    var seenDeprecations = {};
    var error = (message) => {
      console.error(message);
    };
    var warn = (message, ...args) => {
      console.log(`WARN: ${message}`, ...args);
    };
    var deprecated = (version2, message) => {
      if (seenDeprecations[`${version2}/${message}`]) return;
      console.log(`Deprecated as of ${version2}. ${message}`);
      seenDeprecations[`${version2}/${message}`] = true;
    };
    var MultiClassError = new Error();
    function remapScopeNames(mode, regexes, { key }) {
      let offset = 0;
      const scopeNames = mode[key];
      const emit2 = {};
      const positions = {};
      for (let i = 1; i <= regexes.length; i++) {
        positions[i + offset] = scopeNames[i];
        emit2[i + offset] = true;
        offset += countMatchGroups(regexes[i - 1]);
      }
      mode[key] = positions;
      mode[key]._emit = emit2;
      mode[key]._multi = true;
    }
    function beginMultiClass(mode) {
      if (!Array.isArray(mode.begin)) return;
      if (mode.skip || mode.excludeBegin || mode.returnBegin) {
        error("skip, excludeBegin, returnBegin not compatible with beginScope: {}");
        throw MultiClassError;
      }
      if (typeof mode.beginScope !== "object" || mode.beginScope === null) {
        error("beginScope must be object");
        throw MultiClassError;
      }
      remapScopeNames(mode, mode.begin, { key: "beginScope" });
      mode.begin = _rewriteBackreferences(mode.begin, { joinWith: "" });
    }
    function endMultiClass(mode) {
      if (!Array.isArray(mode.end)) return;
      if (mode.skip || mode.excludeEnd || mode.returnEnd) {
        error("skip, excludeEnd, returnEnd not compatible with endScope: {}");
        throw MultiClassError;
      }
      if (typeof mode.endScope !== "object" || mode.endScope === null) {
        error("endScope must be object");
        throw MultiClassError;
      }
      remapScopeNames(mode, mode.end, { key: "endScope" });
      mode.end = _rewriteBackreferences(mode.end, { joinWith: "" });
    }
    function scopeSugar(mode) {
      if (mode.scope && typeof mode.scope === "object" && mode.scope !== null) {
        mode.beginScope = mode.scope;
        delete mode.scope;
      }
    }
    function MultiClass(mode) {
      scopeSugar(mode);
      if (typeof mode.beginScope === "string") {
        mode.beginScope = { _wrap: mode.beginScope };
      }
      if (typeof mode.endScope === "string") {
        mode.endScope = { _wrap: mode.endScope };
      }
      beginMultiClass(mode);
      endMultiClass(mode);
    }
    function compileLanguage(language) {
      function langRe(value, global) {
        return new RegExp(
          source(value),
          "m" + (language.case_insensitive ? "i" : "") + (language.unicodeRegex ? "u" : "") + (global ? "g" : "")
        );
      }
      class MultiRegex {
        constructor() {
          this.matchIndexes = {};
          this.regexes = [];
          this.matchAt = 1;
          this.position = 0;
        }
        // @ts-ignore
        addRule(re, opts) {
          opts.position = this.position++;
          this.matchIndexes[this.matchAt] = opts;
          this.regexes.push([opts, re]);
          this.matchAt += countMatchGroups(re) + 1;
        }
        compile() {
          if (this.regexes.length === 0) {
            this.exec = () => null;
          }
          const terminators = this.regexes.map((el) => el[1]);
          this.matcherRe = langRe(_rewriteBackreferences(terminators, { joinWith: "|" }), true);
          this.lastIndex = 0;
        }
        /** @param {string} s */
        exec(s) {
          this.matcherRe.lastIndex = this.lastIndex;
          const match = this.matcherRe.exec(s);
          if (!match) {
            return null;
          }
          const i = match.findIndex((el, i2) => i2 > 0 && el !== void 0);
          const matchData = this.matchIndexes[i];
          match.splice(0, i);
          return Object.assign(match, matchData);
        }
      }
      class ResumableMultiRegex {
        constructor() {
          this.rules = [];
          this.multiRegexes = [];
          this.count = 0;
          this.lastIndex = 0;
          this.regexIndex = 0;
        }
        // @ts-ignore
        getMatcher(index) {
          if (this.multiRegexes[index]) return this.multiRegexes[index];
          const matcher = new MultiRegex();
          this.rules.slice(index).forEach(([re, opts]) => matcher.addRule(re, opts));
          matcher.compile();
          this.multiRegexes[index] = matcher;
          return matcher;
        }
        resumingScanAtSamePosition() {
          return this.regexIndex !== 0;
        }
        considerAll() {
          this.regexIndex = 0;
        }
        // @ts-ignore
        addRule(re, opts) {
          this.rules.push([re, opts]);
          if (opts.type === "begin") this.count++;
        }
        /** @param {string} s */
        exec(s) {
          const m2 = this.getMatcher(this.regexIndex);
          m2.lastIndex = this.lastIndex;
          let result = m2.exec(s);
          if (this.resumingScanAtSamePosition()) {
            if (result && result.index === this.lastIndex) ;
            else {
              const m22 = this.getMatcher(0);
              m22.lastIndex = this.lastIndex + 1;
              result = m22.exec(s);
            }
          }
          if (result) {
            this.regexIndex += result.position + 1;
            if (this.regexIndex === this.count) {
              this.considerAll();
            }
          }
          return result;
        }
      }
      function buildModeRegex(mode) {
        const mm = new ResumableMultiRegex();
        mode.contains.forEach((term) => mm.addRule(term.begin, { rule: term, type: "begin" }));
        if (mode.terminatorEnd) {
          mm.addRule(mode.terminatorEnd, { type: "end" });
        }
        if (mode.illegal) {
          mm.addRule(mode.illegal, { type: "illegal" });
        }
        return mm;
      }
      function compileMode(mode, parent) {
        const cmode = (
          /** @type CompiledMode */
          mode
        );
        if (mode.isCompiled) return cmode;
        [
          scopeClassName,
          // do this early so compiler extensions generally don't have to worry about
          // the distinction between match/begin
          compileMatch,
          MultiClass,
          beforeMatchExt
        ].forEach((ext) => ext(mode, parent));
        language.compilerExtensions.forEach((ext) => ext(mode, parent));
        mode.__beforeBegin = null;
        [
          beginKeywords,
          // do this later so compiler extensions that come earlier have access to the
          // raw array if they wanted to perhaps manipulate it, etc.
          compileIllegal,
          // default to 1 relevance if not specified
          compileRelevance
        ].forEach((ext) => ext(mode, parent));
        mode.isCompiled = true;
        let keywordPattern = null;
        if (typeof mode.keywords === "object" && mode.keywords.$pattern) {
          mode.keywords = Object.assign({}, mode.keywords);
          keywordPattern = mode.keywords.$pattern;
          delete mode.keywords.$pattern;
        }
        keywordPattern = keywordPattern || /\w+/;
        if (mode.keywords) {
          mode.keywords = compileKeywords(mode.keywords, language.case_insensitive);
        }
        cmode.keywordPatternRe = langRe(keywordPattern, true);
        if (parent) {
          if (!mode.begin) mode.begin = /\B|\b/;
          cmode.beginRe = langRe(cmode.begin);
          if (!mode.end && !mode.endsWithParent) mode.end = /\B|\b/;
          if (mode.end) cmode.endRe = langRe(cmode.end);
          cmode.terminatorEnd = source(cmode.end) || "";
          if (mode.endsWithParent && parent.terminatorEnd) {
            cmode.terminatorEnd += (mode.end ? "|" : "") + parent.terminatorEnd;
          }
        }
        if (mode.illegal) cmode.illegalRe = langRe(
          /** @type {RegExp | string} */
          mode.illegal
        );
        if (!mode.contains) mode.contains = [];
        mode.contains = [].concat(...mode.contains.map(function(c) {
          return expandOrCloneMode(c === "self" ? mode : c);
        }));
        mode.contains.forEach(function(c) {
          compileMode(
            /** @type Mode */
            c,
            cmode
          );
        });
        if (mode.starts) {
          compileMode(mode.starts, parent);
        }
        cmode.matcher = buildModeRegex(cmode);
        return cmode;
      }
      if (!language.compilerExtensions) language.compilerExtensions = [];
      if (language.contains && language.contains.includes("self")) {
        throw new Error("ERR: contains `self` is not supported at the top-level of a language.  See documentation.");
      }
      language.classNameAliases = inherit$1(language.classNameAliases || {});
      return compileMode(
        /** @type Mode */
        language
      );
    }
    function dependencyOnParent(mode) {
      if (!mode) return false;
      return mode.endsWithParent || dependencyOnParent(mode.starts);
    }
    function expandOrCloneMode(mode) {
      if (mode.variants && !mode.cachedVariants) {
        mode.cachedVariants = mode.variants.map(function(variant) {
          return inherit$1(mode, { variants: null }, variant);
        });
      }
      if (mode.cachedVariants) {
        return mode.cachedVariants;
      }
      if (dependencyOnParent(mode)) {
        return inherit$1(mode, { starts: mode.starts ? inherit$1(mode.starts) : null });
      }
      if (Object.isFrozen(mode)) {
        return inherit$1(mode);
      }
      return mode;
    }
    var version = "11.12.0";
    var HTMLInjectionError = class extends Error {
      constructor(reason, html) {
        super(reason);
        this.name = "HTMLInjectionError";
        this.html = html;
      }
    };
    var escape = escapeHTML;
    var inherit = inherit$1;
    var NO_MATCH = /* @__PURE__ */ Symbol("nomatch");
    var MAX_KEYWORD_HITS = 7;
    var HLJS = function(hljs) {
      const languages = /* @__PURE__ */ Object.create(null);
      const aliases = /* @__PURE__ */ Object.create(null);
      const plugins = [];
      let SAFE_MODE = true;
      const LANGUAGE_NOT_FOUND = "Could not find the language '{}', did you forget to load/include a language module?";
      const PLAINTEXT_LANGUAGE = { disableAutodetect: true, name: "Plain text", contains: [] };
      let options = {
        ignoreUnescapedHTML: false,
        throwUnescapedHTML: false,
        noHighlightRe: /^(no-?highlight)$/i,
        languageDetectRe: /\blang(?:uage)?-([\w-]+)\b/i,
        classPrefix: "hljs-",
        cssSelector: "pre code",
        languages: null,
        // beta configuration options, subject to change, welcome to discuss
        // https://github.com/highlightjs/highlight.js/issues/1086
        __emitter: TokenTreeEmitter
      };
      function shouldNotHighlight(languageName) {
        return options.noHighlightRe.test(languageName);
      }
      function blockLanguage(block) {
        let classes = block.className + " ";
        classes += block.parentNode ? block.parentNode.className : "";
        const match = options.languageDetectRe.exec(classes);
        if (match) {
          const language = getLanguage(match[1]);
          if (!language) {
            warn(LANGUAGE_NOT_FOUND.replace("{}", match[1]));
            warn("Falling back to no-highlight mode for this block.", block);
          }
          return language ? match[1] : "no-highlight";
        }
        return classes.split(/\s+/).find((_class) => shouldNotHighlight(_class) || getLanguage(_class));
      }
      function highlight2(codeOrLanguageName, optionsOrCode, ignoreIllegals) {
        let code = "";
        let languageName = "";
        if (typeof optionsOrCode === "object") {
          code = codeOrLanguageName;
          ignoreIllegals = optionsOrCode.ignoreIllegals;
          languageName = optionsOrCode.language;
        } else {
          deprecated("10.7.0", "highlight(lang, code, ...args) has been deprecated.");
          deprecated("10.7.0", "Please use highlight(code, options) instead.\nhttps://github.com/highlightjs/highlight.js/issues/2277");
          languageName = codeOrLanguageName;
          code = optionsOrCode;
        }
        if (ignoreIllegals === void 0) {
          ignoreIllegals = true;
        }
        const context = {
          code,
          language: languageName
        };
        fire("before:highlight", context);
        const result = context.result ? context.result : _highlight(context.language, context.code, ignoreIllegals);
        result.code = context.code;
        fire("after:highlight", result);
        return result;
      }
      function _highlight(languageName, codeToHighlight, ignoreIllegals, continuation) {
        const keywordHits = /* @__PURE__ */ Object.create(null);
        function keywordData(mode, matchText) {
          return mode.keywords[matchText];
        }
        function processKeywords() {
          if (!top.keywords) {
            emitter.addText(modeBuffer);
            return;
          }
          let lastIndex = 0;
          top.keywordPatternRe.lastIndex = 0;
          let match = top.keywordPatternRe.exec(modeBuffer);
          let buf = "";
          while (match) {
            buf += modeBuffer.substring(lastIndex, match.index);
            const word = language.case_insensitive ? match[0].toLowerCase() : match[0];
            const data = keywordData(top, word);
            if (data) {
              const [kind, keywordRelevance] = data;
              emitter.addText(buf);
              buf = "";
              keywordHits[word] = (keywordHits[word] || 0) + 1;
              if (keywordHits[word] <= MAX_KEYWORD_HITS) relevance += keywordRelevance;
              if (kind.startsWith("_")) {
                buf += match[0];
              } else {
                const cssClass = language.classNameAliases[kind] || kind;
                emitKeyword(match[0], cssClass);
              }
            } else {
              buf += match[0];
            }
            lastIndex = top.keywordPatternRe.lastIndex;
            match = top.keywordPatternRe.exec(modeBuffer);
          }
          buf += modeBuffer.substring(lastIndex);
          emitter.addText(buf);
        }
        function processSubLanguage() {
          if (modeBuffer === "") return;
          let result2 = null;
          if (typeof top.subLanguage === "string") {
            if (!languages[top.subLanguage]) {
              emitter.addText(modeBuffer);
              return;
            }
            result2 = _highlight(top.subLanguage, modeBuffer, true, continuations[top.subLanguage]);
            continuations[top.subLanguage] = /** @type {CompiledMode} */
            result2._top;
          } else {
            result2 = highlightAuto(modeBuffer, top.subLanguage.length ? top.subLanguage : null);
          }
          if (top.relevance > 0) {
            relevance += result2.relevance;
          }
          emitter.__addSublanguage(result2._emitter, result2.language);
        }
        function processBuffer() {
          if (top.subLanguage != null) {
            processSubLanguage();
          } else {
            processKeywords();
          }
          modeBuffer = "";
        }
        function emitKeyword(keyword, scope) {
          if (keyword === "") return;
          emitter.startScope(scope);
          emitter.addText(keyword);
          emitter.endScope();
        }
        function emitMultiClass(scope, match) {
          let i = 1;
          const max = match.length - 1;
          while (i <= max) {
            if (!scope._emit[i]) {
              i++;
              continue;
            }
            const klass = language.classNameAliases[scope[i]] || scope[i];
            const text = match[i];
            if (klass) {
              emitKeyword(text, klass);
            } else {
              modeBuffer = text;
              processKeywords();
              modeBuffer = "";
            }
            i++;
          }
        }
        function startNewMode(mode, match) {
          if (mode.scope && typeof mode.scope === "string") {
            emitter.openNode(language.classNameAliases[mode.scope] || mode.scope);
          }
          if (mode.beginScope) {
            if (mode.beginScope._wrap) {
              emitKeyword(modeBuffer, language.classNameAliases[mode.beginScope._wrap] || mode.beginScope._wrap);
              modeBuffer = "";
            } else if (mode.beginScope._multi) {
              emitMultiClass(mode.beginScope, match);
              modeBuffer = "";
            }
          }
          top = Object.create(mode, { parent: { value: top } });
          return top;
        }
        function endOfMode(mode, match, matchPlusRemainder) {
          let matched = startsWith(mode.endRe, matchPlusRemainder);
          if (matched) {
            if (mode["on:end"]) {
              const resp = new Response(mode);
              mode["on:end"](match, resp);
              if (resp.isMatchIgnored) matched = false;
            }
            if (matched) {
              while (mode.endsParent && mode.parent) {
                mode = mode.parent;
              }
              return mode;
            }
          }
          if (mode.endsWithParent) {
            return endOfMode(mode.parent, match, matchPlusRemainder);
          }
        }
        function doIgnore(lexeme) {
          if (top.matcher.regexIndex === 0) {
            modeBuffer += lexeme[0];
            return 1;
          } else {
            resumeScanAtSamePosition = true;
            return 0;
          }
        }
        function doBeginMatch(match) {
          const lexeme = match[0];
          const newMode = match.rule;
          const resp = new Response(newMode);
          const beforeCallbacks = [newMode.__beforeBegin, newMode["on:begin"]];
          for (const cb of beforeCallbacks) {
            if (!cb) continue;
            cb(match, resp);
            if (resp.isMatchIgnored) return doIgnore(lexeme);
          }
          if (newMode.skip) {
            modeBuffer += lexeme;
          } else {
            if (newMode.excludeBegin) {
              modeBuffer += lexeme;
            }
            processBuffer();
            if (!newMode.returnBegin && !newMode.excludeBegin) {
              modeBuffer = lexeme;
            }
          }
          startNewMode(newMode, match);
          return newMode.returnBegin ? 0 : lexeme.length;
        }
        function doEndMatch(match) {
          const lexeme = match[0];
          const matchPlusRemainder = codeToHighlight.substring(match.index);
          const endMode = endOfMode(top, match, matchPlusRemainder);
          if (!endMode) {
            return NO_MATCH;
          }
          const origin = top;
          if (top.endScope && top.endScope._wrap) {
            processBuffer();
            emitKeyword(lexeme, top.endScope._wrap);
          } else if (top.endScope && top.endScope._multi) {
            processBuffer();
            emitMultiClass(top.endScope, match);
          } else if (origin.skip) {
            modeBuffer += lexeme;
          } else {
            if (!(origin.returnEnd || origin.excludeEnd)) {
              modeBuffer += lexeme;
            }
            processBuffer();
            if (origin.excludeEnd) {
              modeBuffer = lexeme;
            }
          }
          do {
            if (top.scope) {
              emitter.closeNode();
            }
            if (!top.skip && !top.subLanguage) {
              relevance += top.relevance;
            }
            top = top.parent;
          } while (top !== endMode.parent);
          if (endMode.starts) {
            startNewMode(endMode.starts, match);
          }
          return origin.returnEnd ? 0 : lexeme.length;
        }
        function processContinuations() {
          const list = [];
          for (let current = top; current !== language; current = current.parent) {
            if (current.scope) {
              list.unshift(current.scope);
            }
          }
          list.forEach((item) => emitter.openNode(item));
        }
        let lastMatch = {};
        function processLexeme(textBeforeMatch, match) {
          const lexeme = match && match[0];
          modeBuffer += textBeforeMatch;
          if (lexeme == null) {
            processBuffer();
            return 0;
          }
          if (lastMatch.type === "begin" && match.type === "end" && lastMatch.index === match.index && lexeme === "") {
            modeBuffer += codeToHighlight.slice(match.index, match.index + 1);
            if (!SAFE_MODE) {
              const err = new Error(`0 width match regex (${languageName})`);
              err.languageName = languageName;
              err.badRule = lastMatch.rule;
              throw err;
            }
            return 1;
          }
          lastMatch = match;
          if (match.type === "begin") {
            return doBeginMatch(match);
          } else if (match.type === "illegal" && !ignoreIllegals) {
            const err = new Error('Illegal lexeme "' + lexeme + '" for mode "' + (top.scope || "<unnamed>") + '"');
            err.mode = top;
            throw err;
          } else if (match.type === "end") {
            const processed = doEndMatch(match);
            if (processed !== NO_MATCH) {
              return processed;
            }
          }
          if (match.type === "illegal" && lexeme === "") {
            if (match.index === codeToHighlight.length) ;
            else {
              modeBuffer += "\n";
            }
            return 1;
          }
          if (iterations > 1e5 && iterations > match.index * 3) {
            const err = new Error("potential infinite loop, way more iterations than matches");
            throw err;
          }
          modeBuffer += lexeme;
          return lexeme.length;
        }
        const language = getLanguage(languageName);
        if (!language) {
          error(LANGUAGE_NOT_FOUND.replace("{}", languageName));
          throw new Error('Unknown language: "' + languageName + '"');
        }
        const md = compileLanguage(language);
        let result = "";
        let top = continuation || md;
        const continuations = {};
        const emitter = new options.__emitter(options);
        processContinuations();
        let modeBuffer = "";
        let relevance = 0;
        let index = 0;
        let iterations = 0;
        let resumeScanAtSamePosition = false;
        try {
          if (!language.__emitTokens) {
            top.matcher.considerAll();
            for (; ; ) {
              iterations++;
              if (resumeScanAtSamePosition) {
                resumeScanAtSamePosition = false;
              } else {
                top.matcher.considerAll();
              }
              top.matcher.lastIndex = index;
              const match = top.matcher.exec(codeToHighlight);
              if (!match) break;
              const beforeMatch = codeToHighlight.substring(index, match.index);
              const processedCount = processLexeme(beforeMatch, match);
              index = match.index + processedCount;
            }
            processLexeme(codeToHighlight.substring(index));
          } else {
            language.__emitTokens(codeToHighlight, emitter);
          }
          emitter.finalize();
          result = emitter.toHTML();
          return {
            language: languageName,
            value: result,
            relevance,
            illegal: false,
            _emitter: emitter,
            _top: top
          };
        } catch (err) {
          if (err.message && err.message.includes("Illegal")) {
            return {
              language: languageName,
              value: escape(codeToHighlight),
              illegal: true,
              relevance: 0,
              _illegalBy: {
                message: err.message,
                index,
                context: codeToHighlight.slice(index - 100, index + 100),
                mode: err.mode,
                resultSoFar: result
              },
              _emitter: emitter
            };
          } else if (SAFE_MODE) {
            return {
              language: languageName,
              value: escape(codeToHighlight),
              illegal: false,
              relevance: 0,
              errorRaised: err,
              _emitter: emitter,
              _top: top
            };
          } else {
            throw err;
          }
        }
      }
      function justTextHighlightResult(code) {
        const result = {
          value: escape(code),
          illegal: false,
          relevance: 0,
          _top: PLAINTEXT_LANGUAGE,
          _emitter: new options.__emitter(options)
        };
        result._emitter.addText(code);
        return result;
      }
      function highlightAuto(code, languageSubset) {
        languageSubset = languageSubset || options.languages || Object.keys(languages);
        const plaintext = justTextHighlightResult(code);
        const results = languageSubset.filter(getLanguage).filter(autoDetection).map(
          (name2) => _highlight(name2, code, false)
        );
        results.unshift(plaintext);
        const sorted = results.sort((a, b2) => {
          if (a.relevance !== b2.relevance) return b2.relevance - a.relevance;
          if (a.language && b2.language) {
            if (getLanguage(a.language).supersetOf === b2.language) {
              return 1;
            } else if (getLanguage(b2.language).supersetOf === a.language) {
              return -1;
            }
          }
          return 0;
        });
        const [best, secondBest] = sorted;
        const result = best;
        result.secondBest = secondBest;
        return result;
      }
      function updateClassName(element, currentLang, resultLang) {
        const language = currentLang && aliases[currentLang] || resultLang;
        element.classList.add("hljs");
        element.classList.add(`language-${language}`);
      }
      function highlightElement(element) {
        let node = null;
        const language = blockLanguage(element);
        if (shouldNotHighlight(language)) return;
        fire(
          "before:highlightElement",
          { el: element, language }
        );
        if (element.dataset.highlighted) {
          console.log("Element previously highlighted. To highlight again, first unset `dataset.highlighted`.", element);
          return;
        }
        if (element.children.length > 0) {
          if (!options.ignoreUnescapedHTML) {
            console.warn("One of your code blocks includes unescaped HTML. This is a potentially serious security risk.");
            console.warn("https://github.com/highlightjs/highlight.js/wiki/security");
            console.warn("The element with unescaped HTML:");
            console.warn(element);
          }
          if (options.throwUnescapedHTML) {
            const err = new HTMLInjectionError(
              "One of your code blocks includes unescaped HTML.",
              element.innerHTML
            );
            throw err;
          }
        }
        node = element;
        const text = node.textContent;
        const result = language ? highlight2(text, { language, ignoreIllegals: true }) : highlightAuto(text);
        element.innerHTML = result.value;
        element.dataset.highlighted = "yes";
        updateClassName(element, language, result.language);
        element.result = {
          language: result.language,
          // TODO: remove with version 11.0
          re: result.relevance,
          relevance: result.relevance
        };
        if (result.secondBest) {
          element.secondBest = {
            language: result.secondBest.language,
            relevance: result.secondBest.relevance
          };
        }
        fire("after:highlightElement", { el: element, result, text });
      }
      function configure(userOptions) {
        options = inherit(options, userOptions);
      }
      const initHighlighting = () => {
        highlightAll();
        deprecated("10.6.0", "initHighlighting() deprecated.  Use highlightAll() now.");
      };
      function initHighlightingOnLoad() {
        highlightAll();
        deprecated("10.6.0", "initHighlightingOnLoad() deprecated.  Use highlightAll() now.");
      }
      let wantsHighlight = false;
      function highlightAll() {
        function boot() {
          highlightAll();
        }
        if (document.readyState === "loading") {
          if (!wantsHighlight) {
            window.addEventListener("DOMContentLoaded", boot, false);
          }
          wantsHighlight = true;
          return;
        }
        const blocks = document.querySelectorAll(options.cssSelector);
        blocks.forEach(highlightElement);
      }
      function registerLanguage(languageName, languageDefinition) {
        let lang = null;
        try {
          lang = languageDefinition(hljs);
        } catch (error$1) {
          error("Language definition for '{}' could not be registered.".replace("{}", languageName));
          if (!SAFE_MODE) {
            throw error$1;
          } else {
            error(error$1);
          }
          lang = PLAINTEXT_LANGUAGE;
        }
        if (!lang.name) lang.name = languageName;
        languages[languageName] = lang;
        lang.rawDefinition = languageDefinition.bind(null, hljs);
        if (lang.aliases) {
          registerAliases(lang.aliases, { languageName });
        }
      }
      function unregisterLanguage(languageName) {
        delete languages[languageName];
        for (const alias of Object.keys(aliases)) {
          if (aliases[alias] === languageName) {
            delete aliases[alias];
          }
        }
      }
      function listLanguages() {
        return Object.keys(languages);
      }
      function getLanguage(name2) {
        name2 = (name2 || "").toLowerCase();
        return languages[name2] || languages[aliases[name2]];
      }
      function registerAliases(aliasList, { languageName }) {
        if (typeof aliasList === "string") {
          aliasList = [aliasList];
        }
        aliasList.forEach((alias) => {
          aliases[alias.toLowerCase()] = languageName;
        });
      }
      function autoDetection(name2) {
        const lang = getLanguage(name2);
        return lang && !lang.disableAutodetect;
      }
      function upgradePluginAPI(plugin) {
        if (plugin["before:highlightBlock"] && !plugin["before:highlightElement"]) {
          plugin["before:highlightElement"] = (data) => {
            plugin["before:highlightBlock"](
              Object.assign({ block: data.el }, data)
            );
          };
        }
        if (plugin["after:highlightBlock"] && !plugin["after:highlightElement"]) {
          plugin["after:highlightElement"] = (data) => {
            plugin["after:highlightBlock"](
              Object.assign({ block: data.el }, data)
            );
          };
        }
      }
      function addPlugin(plugin) {
        upgradePluginAPI(plugin);
        plugins.push(plugin);
      }
      function removePlugin(plugin) {
        const index = plugins.indexOf(plugin);
        if (index !== -1) {
          plugins.splice(index, 1);
        }
      }
      function fire(event, args) {
        const cb = event;
        plugins.forEach(function(plugin) {
          if (plugin[cb]) {
            plugin[cb](args);
          }
        });
      }
      function deprecateHighlightBlock(el) {
        deprecated("10.7.0", "highlightBlock will be removed entirely in v12.0");
        deprecated("10.7.0", "Please use highlightElement now.");
        return highlightElement(el);
      }
      Object.assign(hljs, {
        highlight: highlight2,
        highlightAuto,
        highlightAll,
        highlightElement,
        // TODO: Remove with v12 API
        highlightBlock: deprecateHighlightBlock,
        configure,
        initHighlighting,
        initHighlightingOnLoad,
        registerLanguage,
        unregisterLanguage,
        listLanguages,
        getLanguage,
        registerAliases,
        autoDetection,
        inherit,
        addPlugin,
        removePlugin
      });
      hljs.debugMode = function() {
        SAFE_MODE = false;
      };
      hljs.safeMode = function() {
        SAFE_MODE = true;
      };
      hljs.versionString = version;
      hljs.regex = {
        concat,
        lookahead,
        either,
        optional,
        anyNumberOfTimes
      };
      for (const key in MODES) {
        if (typeof MODES[key] === "object") {
          deepFreeze(MODES[key]);
        }
      }
      Object.assign(hljs, MODES);
      return hljs;
    };
    var highlight = HLJS({});
    highlight.newInstance = () => HLJS({});
    module2.exports = highlight;
    highlight.HighlightJS = highlight;
    highlight.default = highlight;
  }
});

// src/client/index.ts
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);

// css-text:/home/sid/repos/aidos/src/client/board.css
var board_default = `/* Dark Settings Form Control Design System \u2014 applied to aidos board */

/* \u2500\u2500 1. Tokens \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
:root,
.aidos-root {
  --bg: #2c2c2e;
  --surface: #232324;
  --surface-hover: #303032;
  --surface-active: #43454a;
  --border: #3e3e3f;
  --border-subtle: #303031;
  --border-focus: #66676b;
  --accent-blue: #3b82f6;
  --text-primary: #f9fafb;
  --text-secondary: #adb2b8;
  --text-muted: #88898a;
  --text-disabled: #757575;
  --control-text: #f9fafb;
  --radius-sm: 0.375rem;
  --radius-md: 0.625rem;
  --radius-lg: 0.875rem;
  --radius-pill: 999rem;
  --space-1: 0.5rem;
  --space-2: 1rem;
  --space-3: 1.5rem;
  --space-4: 2rem;
  --space-5: 2.5rem;
  --space-6: 3rem;

  /* Id badge hues (U6): mid-saturation backgrounds that keep white text readable. */
  --badge-hue-1: #4e6fa8;
  --badge-hue-2: #7a5ea0;
  --badge-hue-3: #2f8a7f;
  --badge-hue-4: #a86a4e;
  --badge-hue-5: #5f8a3c;
  --badge-hue-6: #a85578;
  --badge-hue-7: #3c7fa8;
  --badge-hue-8: #8a8a3c;

  /* State chips (U14): mid-saturation backgrounds that keep white text readable. */
  --state-open: #4e5a66;
  --state-in-progress: #3c6ea5;
  --state-awaiting: #a07a2a;
  --state-done: #3f8a52;
  --metric-bg: #3a3c41;

  /* #96: a failed review is a VERDICT, not a state. It gets its own token
     rather than borrowing --state-awaiting, so recolouring the state chips
     never silently recolours a verdict, and vice versa. Same mid-saturation
     family so white text stays readable on it. */
  --verdict-fail: #a5453c;
}

/* \u2500\u2500 2. Typography + base \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.aidos-root {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: 0.75rem 1rem 1.5rem;
  /* #64: the mobile plugin's fixed top bar covers our top edge, and its real
     height depends on the device safe area. The view measures the actual
     overlap and publishes it as --aidos-top-clearance (0 when nothing covers
     the board), so no breakpoint or magic number is involved. */
  padding-top: calc(0.75rem + var(--aidos-top-clearance, 0px));
  width: 100%;
  min-height: 0;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
  background: var(--bg);
  color: var(--text-primary);
  font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 0.875rem;
  line-height: 1.5;
}

.aidos-root *,
.aidos-detail,
.aidos-detail *,
.aidos-modal,
.aidos-modal * {
  box-sizing: border-box;
}

/* page title helper (spec \xA73) \u2014 used by board chrome if needed */
.aidos-page-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 650;
  line-height: 1.2;
  color: var(--text-primary);
}

/* \u2500\u2500 3. Layout \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.aidos-layout {
  /* The view asks the conversation shell for composer-overlay mode, so the
     shell hands this element a definite-height box and floats the composer
     over it. The board fills that box, and each pane scrolls on its own. The
     shell publishes --dsh-composer-height, so the panes pad clear of the
     floating composer. */
  --aidos-bottom-clearance: calc(var(--dsh-composer-height, 152px) + 16px);
  container: aidos-shell / inline-size;
  display: flex;
  gap: var(--space-2);
  align-items: stretch;
  min-width: 0;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  flex: 1 1 0%;
}

/* The grid pane fills the layout box so its inner scroller is bounded. The
   real tree is .aidos-layout > .aidos-root > .aidos-grid-wrap: any rule
   written as \`.aidos-layout > .aidos-grid-wrap\` matches NOTHING. */
.aidos-layout > .aidos-root {
  flex: 1 1 0%;
  min-height: 0;
  min-width: 0;
}

/* Two-pane above the narrow break (#64). */
.aidos-layout:has(> .aidos-detail) {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: stretch;
}

/* Mobile single pane (#64): the detail panel becomes the only thing on
   screen \u2014 a full overlay over the grid \u2014 and the grid behind it collapses
   to one column. The break follows the board container width, not the
   device, per the ticket. */
/* Mobile (#64). Two hard-won constraints live here:
   1. The single-pane switch MUST be a media query, never a container query:
      .aidos-layout declares \`container: aidos-shell\`, and an element can
      never match a query against its OWN container, so the container-query
      version of this rule was dead CSS.
   2. The breakpoint matches dsh-plugin-better-mobile-ui's own 768px mobile
      mode, because its fixed 48px top bar \u2014 and the composer it pins over
      the board bottom \u2014 exist exactly when that mode is on. */
@media (max-width: 768px) {
  .aidos-grid-wrap {
    padding-bottom: calc(var(--aidos-bottom-clearance) + 8px);
  }

  .aidos-board-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .aidos-layout:has(> .aidos-detail) {
    display: block;
    position: relative;
  }

  .aidos-layout > .aidos-detail {
    /* Fixed takeover, not absolute-in-layout: the layout sits inside the
       root's padding, so anchoring there left the header (and its close
       button) under the plugin's top bar. */
    position: fixed;
    inset: 0;
    z-index: 60;
    background: var(--bg);
    /* Viewport-pinned, so it clears the chrome's viewport-space bottom. */
    padding-top: calc(var(--aidos-top-chrome, 0px) + 0.5rem);
    padding-bottom: calc(var(--aidos-bottom-clearance) + 8px);
  }
}

@container aidos-shell (max-width: 560px) {
  .aidos-board-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.aidos-layout > .aidos-detail {
  height: 100%;
  max-height: 100%;
  min-height: 0;
  padding-bottom: var(--aidos-bottom-clearance);
  overflow-y: auto;
  width: auto;
}

/* The detail panel is a column flex box with a capped height, so its
   children must never shrink. Without this the summary table (overflow
   hidden) collapses on a ticket with a long description. */
.aidos-layout > .aidos-detail > * {
  flex: none;
}


.aidos-grid-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-height: 0;
  overflow-y: auto;
  overflow-x: clip;
  /* The composer floats over the board at every width, so the scroll pane
     must end above it or the last tile row hides underneath. Only the detail
     pane carried this clearance before, which is why the grid clipped its
     bottom row on desktop and mobile alike. */
  padding-bottom: var(--aidos-bottom-clearance);
  /* The tile grid steps its column count from the width of this pane, not the
     width of the window. The pane is always narrower than the window, and it
     halves again when the detail panel opens. */
  container: aidos-board / inline-size;
}

/* The toolbar row sits above the filter bar: the ticket count on the left and
   the board actions on the right. It stays outside the scrolling grid, so it
   never moves. */
.aidos-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-1);
  flex: none;
  padding-block: 2px;
}

.aidos-toolbar-actions {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.aidos-board-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  align-content: start;
}

@container aidos-board (max-width: 999px) {
  .aidos-board-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@container aidos-board (max-width: 699px) {
  .aidos-board-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@container aidos-board (max-width: 459px) {
  .aidos-board-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

/* \u2500\u2500 4. Section headers (spec \xA75) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.aidos-panel-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.aidos-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-1);
}

.aidos-panel-title,
.section-title {
  margin: 0;
  font-size: 1.125rem;
  line-height: 1.2;
  font-weight: 600;
  color: var(--text-primary);
  text-transform: none;
  letter-spacing: 0;
}

.aidos-panel-title {
  font-size: 11px;
  line-height: 16px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.section-description {
  margin: 0.625rem 0 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.5;
}

/* \u2500\u2500 5. Setting card (spec \xA76) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.setting-card,
.aidos-detail,
.aidos-sidebar {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
}

.aidos-filterbar {
  flex: none;
  width: 100%;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 6px 10px;
}

.aidos-filterbar-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.aidos-filter-chips {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.aidos-filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 18px;
  padding: 2px 8px;
  cursor: pointer;
}

.aidos-filter-chip-on {
  background: var(--surface-active);
  color: var(--text-primary);
  border-color: var(--border-focus);
}

.aidos-filter-chip .aidos-check-count {
  margin-left: 0;
}

.aidos-filterbar .aidos-sort-row select,
.aidos-filter-project {
  height: 1.75rem;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-primary);
  font-size: 12px;
  padding: 0 6px;
}

.aidos-filterbar-search {
  width: 180px;
}

.aidos-detail {
  flex: none;
  width: 300px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-self: flex-start;
}

/* checkbox that lives inside a setting-card grid (spec \xA76) */
.setting-card {
  display: grid;
  grid-template-columns: 1.25rem 1fr;
  gap: 1rem;
  align-items: start;
}

.setting-checkbox {
  width: 1.25rem;
  height: 1.25rem;
  flex: 0 0 1.25rem;
  border-radius: 0.1875rem;
  accent-color: var(--text-primary);
}

/* \u2500\u2500 6. Segmented control (spec \xA77) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.segmented-control {
  display: flex;
  padding: 0.25rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
}

.segment {
  min-width: 8.75rem;
  height: 2.375rem;
  border: 0;
  border-radius: 0.4375rem;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
}

.segment[data-active="true"] {
  background: var(--surface-active);
  color: var(--text-primary);
  font-weight: 600;
}

/* \u2500\u2500 7. Control list (spec \xA78) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.control-list {
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
}

.control-list-row {
  min-height: 3rem;
  padding: 0 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.control-list-row + .control-list-row {
  border-top: 1px solid var(--border-subtle);
}

/* criteria \u2014 one bullet per criterion (spec \xA76) */
.aidos-criteria {
  margin: 0;
  padding-left: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* A criterion reads as a STRIP, matching the evidence strips it now carries:
   same border, radius, surface, and padding, so the criteria panel and the
   evidence panel speak one language. */
.aidos-criterion {
  min-width: 0;
  font-size: 13px;
  line-height: 20px;
  padding: 6px var(--space-1);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text-primary);
}

/* The uncovered treatment lives in ONE place, near the criterion-block rules
   at the end of this file, so the strip and the block agree. */

/* One criterion row holds the label plus its icon controls. The controls sit
   at the end and are ALWAYS visible: the old hover-reveal (opacity 0 until
   hover) made them unreadable and undiscoverable. */
.aidos-criterion-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.aidos-criterion-actions {
  display: inline-flex;
  align-items: center;
  flex: none;
  gap: 2px;
  margin-left: auto;
  align-self: center;
}

/* Last row of the criteria block: an input plus a small add button. */
.aidos-criteria-add {
  display: flex;
  align-items: center;
  gap: 8px;
}

.aidos-criteria-add input,
.aidos-criterion-row input {
  flex: 1;
  min-width: 0;
  height: 1.75rem;
  font-size: 12px;
  padding-inline: 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text-primary);
}

/* An uncovered criterion is the one you most need to READ, so it keeps full
   text contrast and the ordinary strip surface. The signal is a warning
   TRIANGLE at the head of the row, not a dimmed or recolored strip. */
.aidos-criterion-uncovered {
  color: var(--text-primary);
}

.aidos-criterion-warn {
  display: inline-flex;
  align-items: center;
  flex: none;
  color: var(--state-awaiting);
}

/* The label takes the free space so the controls land at the row's end. */
.aidos-criterion-text {
  min-width: 0;
  flex: 1;
}

.aidos-evidence-delete {
  flex: none;
  margin-left: auto;
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: var(--text-muted);
  font-size: 10px;
  line-height: 1;
  cursor: pointer;
}

.aidos-evidence-delete:hover {
  background: var(--surface-active);
  color: #f9fafb;
}

/* The \u2715 and \u2297 controls live on a strip too: resting fill, legible glyph. */
.aidos-evidence-strip-actions .aidos-evidence-delete,
.aidos-evidence-strip-actions .aidos-evidence-unlink {
  background: var(--surface-hover);
  color: var(--text-primary);
}


.aidos-evidence-delete:disabled {
  opacity: 0.4;
  cursor: default;
}

/* \u2500\u2500 8. Chips (spec \xA73, \xA710) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.aidos-chip {
  height: 20px;
  display: inline-flex;
  align-items: center;
  padding-inline: 7px;
  border: 0;
  border-radius: 3px;
  background: var(--metric-bg);
  color: #f9fafb;
  font-size: 11px;
  line-height: 16px;
  font-weight: 600;
  white-space: nowrap;
  flex: none;
}

/* The markup sets the hashed background inline. This fallback keeps the chip readable without it. */
.aidos-chip-id,
.aidos-chip-kind,
.aidos-chip-dep {
  background: var(--badge-hue-1);
}

/* A kind chip splits when it carries a count: the keyword keeps the kind
   color, and the count segment inverts it. The chip drops its own inline
   padding so the count segment reaches the chip edge. */
.aidos-chip-kind {
  padding-inline: 0;
  overflow: hidden;
  letter-spacing: 0.04em;
}

/* #21 "they shouldn't be clutter, they should contribute info".

   Every chip used to be a saturated FILL. On a tile carrying five evidence
   kinds that is five competing colour blocks, and the eye cannot tell which
   one matters -- loudness applied uniformly is the same as no emphasis at
   all. So the colour moves from the fill to the TEXT and a hairline border,
   over a near-transparent tint of the same hue. The kind stays instantly
   identifiable by colour, but the tile reads as text with accents instead of
   a row of buttons.

   \`color-mix\` is used against \`currentColor\` so a single rule covers every
   hue: the inline style still sets one colour per kind, and the tint and
   border derive from it. The chips that must stay loud -- the id badge and
   the state chip -- deliberately keep their fill. */
.aidos-chip-kind,
.aidos-chip-dep {
  /* #21 review F1: the first attempt used text at 72% hue over a 14% tint,
     which MEASURED at 2.44:1 on a hovered tile -- literally the grey-on-grey
     this ticket's oldest criterion forbids. Two causes: the kind palette held
     no hues at all (see KIND_COLORS in board-logic.ts), and the chip
     background is TRANSLUCENT, so contrast depends on the backdrop and
     .aidos-tile:hover lightens it. Both backdrops are now checked.

     Measured worst case across every hue, --verdict-fail, and BOTH the
     resting and hovered tile: 5.81:1. The previous pair was 2.44:1. */
  background: color-mix(in srgb, var(--chip-hue, var(--badge-hue-1)) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--chip-hue, var(--badge-hue-1)) 45%, transparent);
  color: color-mix(in srgb, var(--chip-hue, var(--badge-hue-1)) 38%, #ffffff);
}

/* The dependency chip's icon: dimmer than the id it introduces, because the
   id is the information and the arrow is only grammar (#21). */
.aidos-chip-dep-icon {
  /* #21 review F1: \`opacity: 0.65\` on already-tinted text measured 2.83:1.
     Dimming a foreground that is already low-contrast is how an icon becomes
     a smudge. The icon inherits the chip's (now AA-passing) colour instead,
     and the SVG's stroke weight -- not transparency -- does the de-emphasis. */
  display: inline-flex;
  align-items: center;
  margin-inline-end: 4px;
}

/* The metric chips' key is now an ICON (#21), so it needs no letter spacing
   and should sit quieter than the value it introduces. */
.aidos-chip-metric .aidos-chip-key {
  /* The key is an ICON now, so it needs to align rather than be dimmed.
     The old \`opacity: 0.7\` was the same mistake as the dep icon above. */
  display: inline-flex;
  align-items: center;
}

.aidos-chip-key {
  padding-inline: 7px;
}

.aidos-chip-count {
  align-self: stretch;
  display: inline-flex;
  align-items: center;
  padding-inline: 5px;
  /* #21: the count segment used to invert to a near-white block, which made
     the count the LOUDEST thing on the tile -- louder than the kind it
     counts. It is now a deeper tint of the same hue: still clearly a second
     segment, no longer a flare. */
  /* #21 review F1: the count segment mixed its TEXT at 82% and its BACKGROUND
     at 30% of the same hue -- moving both ends toward each other, which is
     arithmetically guaranteed to be lower contrast than the chip itself. It
     measured worse than the chip everywhere. The text now INHERITS the chip's
     colour and only the background deepens, so the segment reads as a segment
     without trading away legibility. */
  background: color-mix(in srgb, var(--chip-hue, var(--badge-hue-1)) 30%, transparent);
  border-inline-start: 1px solid color-mix(in srgb, var(--chip-hue, var(--badge-hue-1)) 45%, transparent);
  color: inherit;
  font-weight: 700;
}


.aidos-chip-state-open {
  background: var(--state-open);
}

.aidos-chip-state-in-progress {
  background: var(--state-in-progress);
}

.aidos-chip-state-awaiting-verification {
  background: var(--state-awaiting);
}

.aidos-chip-state-done {
  background: var(--state-done);
}

.aidos-dep-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

/* \u2500\u2500 9. Icon button (spec \xA710) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.icon-button,
.aidos-close-btn {
  width: 2rem;
  height: 2rem;
  display: inline-grid;
  place-items: center;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font-size: 1.25rem;
  cursor: pointer;
}

.icon-button:hover,
.aidos-close-btn:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
}

.aidos-close-btn {
  border: none;
  font-size: 16px;
  line-height: 16px;
  padding: 0;
}

/* \u2500\u2500 10. Mode switch (spec \xA711) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.mode-switch {
  display: inline-flex;
  padding: 0.25rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
}

.mode-switch > button {
  height: 2.125rem;
  padding-inline: 1.25rem;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
}

.mode-switch > button[data-active="true"] {
  background: var(--surface-active);
  color: var(--text-primary);
  font-weight: 600;
}

/* \u2500\u2500 11. Text input (spec \xA712) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.text-input,
.aidos-search-input,
.aidos-dep-search-input,
.aidos-field-editor-input,
.aidos-evidence-attach-kind-select,
.aidos-evidence-attach-note,
.aidos-comment-textarea,
.aidos-modal-row input,
.aidos-modal-row textarea,
.aidos-modal-row select {
  height: 2.5rem;
  width: 100%;
  padding-inline: 0.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--text-primary);
  font-size: 0.875rem;
  outline: none;
  font-family: inherit;
}

.aidos-search-input,
.aidos-dep-search-input,
.aidos-field-editor-input,
.aidos-evidence-attach-kind-select {
  height: 2.5rem;
}

.aidos-modal-row textarea,
.aidos-evidence-attach-note,
.aidos-comment-textarea,
.aidos-field-editor-input[type="textarea"] {
  height: auto;
  min-height: 2.5rem;
  padding-block: 0.5rem;
  resize: none;
}

/* The evidence note is a one-or-two-line remark, not an essay field: the
   default two-row textarea took far more vertical space than it earns in a
   modal that also carries criteria, strips, and actions. */
.aidos-evidence-attach-note {
  height: 2.25rem;
  min-height: 2.25rem;
}

/* An agent report or a check's output IS an essay field: same control, more
   room. Compose it with the note class where a taller box is wanted. */
.aidos-evidence-attach-note.aidos-evidence-attach-tall {
  height: 6rem;
  min-height: 6rem;
  resize: vertical;
}

/* A command line is a single-line, monospaced input: same control chrome as
   the other modal fields, with code-shaped text. */
.aidos-command-input {
  height: 2.25rem;
  width: 100%;
  padding-inline: 0.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--control-text);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
}


.text-input::placeholder,
.aidos-search-input::placeholder,
.aidos-dep-search-input::placeholder,
.aidos-field-editor-input::placeholder,
.aidos-modal-row input::placeholder,
.aidos-modal-row textarea::placeholder {
  color: var(--text-muted);
}

.text-input:focus,
.aidos-search-input:focus,
.aidos-dep-search-input:focus,
.aidos-field-editor-input:focus,
.aidos-evidence-attach-kind-select:focus,
.aidos-evidence-attach-note:focus,
.aidos-comment-textarea:focus,
.aidos-modal-row input:focus,
.aidos-modal-row textarea:focus,
.aidos-modal-row select:focus {
  border-color: var(--border-focus);
}

/* forms never overflow their container (spec \xA78) */
.aidos-root input,
.aidos-root textarea,
.aidos-root select,
.aidos-detail input,
.aidos-detail textarea,
.aidos-detail select,
.aidos-modal input,
.aidos-modal textarea,
.aidos-modal select {
  box-sizing: border-box;
  max-width: 100%;
  min-width: 0;
}

/* search box wrapper */
.aidos-search-box {
  position: relative;
}

.aidos-autocomplete {
  position: absolute;
  z-index: 20;
  top: calc(100% + 2px);
  left: 0;
  right: 0;
  max-height: 220px;
  overflow: auto;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}

.aidos-suggestion {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  font-size: 12px;
  line-height: 18px;
  color: var(--text-primary);
  background: none;
  border: none;
  padding: 6px 8px;
  cursor: pointer;
}

.aidos-suggestion:hover {
  background: var(--surface-hover);
}

.aidos-suggestion-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* \u2500\u2500 12. Buttons (spec \xA713) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

/* secondary button \u2014 muted bordered pill, not high-contrast */
.aidos-btn,
.aidos-btn-dot {
  cursor: pointer;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-secondary);
  border-radius: 4px;
  font-size: 12px;
  line-height: 20px;
  padding: 5px 12px;
}

.aidos-btn:hover:not(:disabled) {
  background: var(--surface-hover);
  color: var(--text-primary);
  border-color: var(--border);
}

.aidos-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* primary button \u2014 the one filled control of the board: a light fill with
   dark text. A confirm button carries \`.aidos-btn\` as well, so this block
   must follow the secondary block: the two selectors weigh the same and the
   later one wins. The transparent border keeps the box the size of a
   secondary button, so a mixed row lines up. */
.primary-button,
.aidos-btn-primary,
.aidos-comment-send {
  width: auto;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 4px;
  background: var(--text-secondary);
  color: var(--surface);
  font-weight: 600;
}

.primary-button:hover:not(:disabled),
.aidos-btn-primary:hover:not(:disabled),
.aidos-comment-send:hover:not(:disabled) {
  background: var(--text-primary);
  color: var(--surface);
  border-color: transparent;
}

/* The send button sets its own height, so it lines up with the comment box. */
.aidos-comment-send {
  height: 2rem;
  padding-inline: 0.75rem;
  font-size: 0.8125rem;
}

.primary-button:disabled,
.aidos-btn-primary:disabled,
.aidos-comment-send:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.aidos-btn-dot {
  position: relative;
}

.aidos-btn-dot::after {
  content: "";
  position: absolute;
  top: -3px;
  right: -3px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #adb2b8;
  border: 1px solid var(--surface);
}

.aidos-toggle-btn {
  min-width: 0;
  border-radius: var(--radius-sm);
  height: 1.75rem;
}

.aidos-sidebar-toggle {
  margin-left: auto;
}

/* \u2500\u2500 13. Checkbox field (spec \xA714) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.checkbox-field,
.aidos-check-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  color: var(--text-secondary);
  font-size: 0.84375rem;
  cursor: pointer;
  line-height: 18px;
}

.aidos-check-row input[type="checkbox"] {
  width: 1.125rem;
  height: 1.125rem;
  flex: 0 0 1.125rem;
  accent-color: var(--text-primary);
  cursor: pointer;
  border-radius: 0.1875rem;
}

.aidos-check-count {
  color: var(--text-muted);
  margin-left: auto;
}

.aidos-check-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* \u2500\u2500 14. Tile \u2014 reinterpreted as setting-card \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.aidos-tile {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 8px;
  /* #59: no fixed height \u2014 badges own their vertical space, the card grows
     with wrapped rows, and grid rows stretch to the tallest card so the
     field stays aligned. The preview still clamps at two lines. */
  min-height: 168px;
  padding: 10px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  min-width: 0;
  overflow: hidden;
  text-align: left;
  color: var(--text-primary);
}
.aidos-tile-preview {
  flex: none;
  margin: 0;
  font-size: 12px;
  line-height: 16px;
  color: var(--text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.aidos-tile:hover {
  background: var(--surface-hover);
  border-color: var(--border);
}

/* Focused tile: the one open in the detail panel (ticket #61). */
.aidos-tile-selected {
  outline: 2px solid #f9fafb;
  outline-offset: -3px;
}

/* Active-work tile: the in_progress ticket with the latest update. The
   ring renders INSIDE the tile (inset shadow) so edge tiles never clip
   against the scroll pane and the grid extent never changes (#61). */
.aidos-tile-active {
  border-color: var(--accent-blue);
  box-shadow: inset 0 0 0 3px var(--accent-blue);
}

.aidos-tile-title {
  font-size: 13px;
  font-weight: 600;
  line-height: 18px;
  margin: 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  color: var(--text-primary);
}

.aidos-tile-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-width: 0;
}

.aidos-tile-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-top: auto;
  min-width: 0;
}

/* The confidence ring and the tile gate text are gone: the tile shows a gate
   chip and a confidence chip instead (U15). */

/* detail header / body. The head keeps the title on the left and the
   close button on the right. */
.aidos-detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.aidos-detail-title {
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  margin: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary);
}

/* Chip row between the header and the facts table. */
.aidos-detail-chips {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

/* Small square control for a 12px icon. It carries no border and no
   background until hover. */
.aidos-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 20px;
  height: 20px;
  padding: 4px;
  box-sizing: content-box;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1;
  vertical-align: middle;
  cursor: pointer;
}

.aidos-icon-btn:hover,
.aidos-icon-btn:focus-visible {
  background: var(--surface-active);
  color: var(--text-primary);
}

/* Icon controls that sit ON a strip (criteria rows, evidence rows) are always
   visible and must read against the strip's own surface, so they carry a
   resting fill and full-strength glyphs instead of a faint transparent hint. */
.aidos-criterion-actions .aidos-icon-btn,
.aidos-evidence-strip-actions .aidos-icon-btn {
  background: var(--surface-hover);
  color: var(--text-primary);
}

.aidos-criterion-actions .aidos-icon-btn:hover,
.aidos-criterion-actions .aidos-icon-btn:focus-visible,
.aidos-evidence-strip-actions .aidos-icon-btn:hover,
.aidos-evidence-strip-actions .aidos-icon-btn:focus-visible {
  background: var(--surface-active);
}


.aidos-detail-body {
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--text-secondary);
}

.aidos-detail-note {
  font-size: 0.8125rem;
  line-height: 16px;
  color: var(--text-secondary);
  margin: 0;
}

/* quick facts (spec \xA76) */
.aidos-facts {
  margin: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.aidos-facts-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 10px;
}

.aidos-facts-row + .aidos-facts-row {
  border-top: 1px solid var(--border-subtle);
}

.aidos-facts-label {
  font-size: 11px;
  line-height: 16px;
  color: var(--text-muted);
}

.aidos-facts-value {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 16px;
  color: var(--text-primary);
}

.aidos-facts-asterisk {
  margin-left: 2px;
  color: var(--text-secondary);
  cursor: help;
}

/* description section (U7, U8) */
.aidos-description {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* collapsible sections (U9) */
.aidos-collapsible {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 8px;
}
/* detail panels (spec \xA76) */
.aidos-panel {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  min-width: 0;
}

/* #69: a panel nested inside another panel (the evidence panel's linker
   section). One step quieter than its parent: the subtle border becomes the
   surface fill so the nesting reads without a second hard box. */
.aidos-panel-nested {
  border-color: transparent;
  background: var(--surface);
  padding: 8px 10px;
}

/* Panels sit in the detail column flex box, so the 10px gap separates them.
   The margin keeps stacked panels apart when markup skips the flex gap. */
.aidos-panel + .aidos-panel {
  margin-top: 10px;
}

/* The panel head is the disclosure summary. It keeps the title on the left
   and draws its own chevron on the right. */
.aidos-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-1);
  padding-block: 2px;
  list-style: none;
  cursor: pointer;
}

.aidos-panel-head::-webkit-details-marker {
  display: none;
}

.aidos-panel-head::after {
  content: "";
  flex: none;
  width: 6px;
  height: 6px;
  margin-left: auto;
  border-right: 1.5px solid var(--text-muted);
  border-bottom: 1.5px solid var(--text-muted);
  /* Closed points right. Open points down. */
  transform: rotate(-45deg);
  transition: transform 0.15s ease;
}

.aidos-panel[open] > .aidos-panel-head::after {
  transform: rotate(45deg);
}

.aidos-panel-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
  min-width: 0;
}


/* rendered markdown (spec \xA77) */
.aidos-md {
  min-width: 0;
  font-size: 13px;
  line-height: 20px;
  color: var(--text-secondary);
}

.aidos-md p {
  margin: 0 0 6px;
}

.aidos-md p:last-child {
  margin-bottom: 0;
}

.aidos-md ul,
.aidos-md ol {
  margin: 0 0 6px;
  padding-left: 18px;
}

.aidos-md li {
  margin: 0;
}

.aidos-md code {
  padding: 0 3px;
  border-radius: 3px;
  background: var(--surface-active);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
}

.aidos-md pre {
  margin: 0 0 6px;
  padding: 6px 8px;
  border-radius: 3px;
  background: var(--surface-active);
  overflow-x: auto;
}

.aidos-md pre code {
  padding: 0;
  background: none;
}

.aidos-md a {
  color: var(--text-primary);
}

.aidos-md strong {
  color: var(--text-primary);
}

.aidos-md em {
  color: var(--text-secondary);
}

.aidos-md h1,
.aidos-md h2,
.aidos-md h3,
.aidos-md h4 {
  margin: 8px 0 6px;
  color: var(--text-primary);
  font-weight: 600;
}

.aidos-md h1 {
  font-size: 14px;
  line-height: 20px;
}

.aidos-md h2 {
  font-size: 13px;
  line-height: 20px;
}

.aidos-md h3 {
  font-size: 13px;
  line-height: 20px;
}

.aidos-md h4 {
  font-size: 12px;
  line-height: 18px;
}

.aidos-md blockquote {
  margin: 0 0 6px;
  padding-left: 8px;
  border-left: 2px solid var(--border);
  color: var(--text-muted);
}

.aidos-md-clipped {
  max-height: 320px;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(to bottom, #000 78%, transparent 100%);
  mask-image: linear-gradient(to bottom, #000 78%, transparent 100%);
}

.aidos-md-more {
  align-self: flex-start;
  border: 0;
  background: none;
  padding: 0;
  font-size: 11px;
  line-height: 16px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
}

.aidos-md-more:hover {
  color: var(--text-primary);
}

/* sort row \u2014 style select as text-input */
.aidos-sort-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.aidos-sort-row select {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  line-height: 18px;
  color: var(--text-primary);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 4px 8px;
  height: 2.5rem;
}

.aidos-sort-row select:focus {
  border-color: var(--border-focus);
  outline: none;
}

.aidos-actions-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

/* dependency search */
.aidos-dep-search {
  display: flex;
  gap: 6px;
}

.aidos-dep-results {
  display: flex;
  flex-direction: column;
  gap: 4px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  overflow: hidden;
}

.aidos-dep-result {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  font-size: 12px;
  line-height: 18px;
  color: var(--text-primary);
  background: none;
  border: none;
  padding: 6px 8px;
  cursor: pointer;
}

.aidos-dep-result:hover {
  background: var(--surface-hover);
}

.aidos-dep-result:disabled {
  cursor: default;
  opacity: 0.6;
}

/* empty / error */
.aidos-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 40px 16px;
  text-align: center;
  color: var(--text-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
}

.aidos-empty-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.aidos-empty-note {
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
  color: var(--text-secondary);
}

.aidos-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 16px;
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  font-size: 12px;
  line-height: 18px;
}

/* skeleton */
.aidos-skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}

.aidos-skeleton-tile {
  aspect-ratio: 1 / 1;
  border-radius: var(--radius-lg);
  background: var(--surface);
  border: 1px solid var(--border-subtle);
}

/* modal */
.aidos-modal-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  /* #93: the mask defines the SAFE BOX every modal centers inside. Before
     this, nothing bounded a modal's height, so a long one (the 71-row work
     queue) ran off the top AND bottom of the screen with no way to reach
     either end. Padding here rather than a height on the modal keeps the
     centering honest, and clears the mobile top bar the measurement hook
     publishes. */
  box-sizing: border-box;
  padding: calc(var(--aidos-top-chrome, 0px) + 16px) 16px 16px;
}

.aidos-modal {
  box-sizing: border-box;
  width: 420px;
  max-width: 100%;
  /* Never taller than the mask's safe box; the body scrolls instead. */
  max-height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 1.25rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  color: var(--text-primary);
}

.aidos-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.aidos-modal-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
  line-height: 1.2;
  color: var(--text-primary);
}

.aidos-modal-body {
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--text-secondary);
}

/* toast */
.aidos-toast-stack {
  position: fixed;
  z-index: 200;
  left: 50%;
  bottom: 32px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.aidos-toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: min(560px, calc(100vw - 32px));
  font-size: 12px;
  line-height: 18px;
  color: var(--text-primary);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 8px 14px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.aidos-toast-text {
  flex: 1;
  min-width: 0;
}

.aidos-toast-refusal {
  border-left: 3px solid #e07a5f;
}

.aidos-toast-info {
  border-left: 3px solid var(--text-secondary);
}

.aidos-toast-success {
  border-left: 3px solid #adb2b8;
}

.aidos-toast-dismiss {
  cursor: pointer;
  flex: none;
  border: none;
  background: none;
  color: var(--text-secondary);
  font-size: 16px;
  line-height: 16px;
  padding: 0;
}

.aidos-toast-dismiss:hover {
  color: var(--text-primary);
}

/* modal form */
.aidos-modal-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  /* The scroll container: the head stays put, the body scrolls. min-height:0
     is what actually lets a flex child shrink below its content. */
  min-height: 0;
  overflow-y: auto;
}

.aidos-modal-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.aidos-modal-row label {
  font-size: 0.8125rem;
  line-height: 18px;
  color: var(--text-secondary);
}

/* field editor */
.aidos-field-editor {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* action bar */
/* The action row sits under the quick facts, near the top of the detail
   pane. It is an ordinary block of the panel column, so it scrolls with the
   rest of the pane, and it holds its buttons at the left edge. */
.aidos-action-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
}

/* The action bar's buttons are the primary verbs of the panel (Sign off,
   Verify, Submit for review, Mark done), so they carry a raised resting fill
   and full-strength text rather than the quiet secondary treatment. */
.aidos-action-bar .aidos-btn {
  background: var(--surface-hover);
  color: var(--text-primary);
  border-color: var(--border-focus);
}

.aidos-action-bar .aidos-btn:hover:not(:disabled) {
  background: var(--surface-active);
  color: var(--text-primary);
}

/* A gated action still has to be READABLE while it is unavailable \u2014 its
   tooltip names the missing evidence. Mute it, do not dissolve it. */
.aidos-action-bar .aidos-btn:disabled,
.aidos-action-bar .aidos-btn-disabled {
  opacity: 1;
  background: var(--surface);
  color: var(--text-secondary);
  border-color: var(--border-subtle);
}


/* spoiler (submit-for-review) */
.aidos-spoiler {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.aidos-spoiler-summary {
  cursor: pointer;
  font-size: 12px;
  line-height: 18px;
  color: var(--text-secondary);
}

.aidos-spoiler-summary:hover {
  color: var(--text-primary);
}

/* comments */
/* A row of controls that sits at the right edge of its block: the comment
   send button, the evidence attach button, and the save and cancel pair of an
   inline editor. */
.aidos-form-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  /* Pinned to the bottom of the scrolling body, so Confirm and Cancel are
     always reachable however long the content is. */
  position: sticky;
  bottom: 0;
  background: var(--surface);
  padding-top: 8px;
}

/* The inline editor of a panel: the raw text behind a rendered block. */
.aidos-panel-body textarea {
  width: 100%;
  min-height: 9rem;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text-primary);
  font: inherit;
  resize: vertical;
}

.aidos-comment {
  font-size: 12px;
  line-height: 20px;
  color: var(--text-primary);
  background: var(--bg);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 8px 10px;
}

/* helper text (spec \xA713) */
.helper-text {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
}

/* \u2500\u2500 15. Responsive (spec \xA720) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
@media (max-width: 700px) {
  .aidos-root {
    /* NEVER use the \`padding\` shorthand here: this block sits after the
       measured top clearance (\xA72) at equal specificity, so a shorthand
       silently resets padding-top and the toolbar slides back under the
       mobile plugin's fixed top bar. Longhands only. (#64) */
    padding-inline: 1rem;
    padding-bottom: 2.5rem;
  }

  .aidos-sidebar,
  .aidos-detail {
    width: 100%;
  }

  .segmented-control,
  .mode-switch {
    width: 100%;
  }

  .segment,
  .mode-switch > button {
    flex: 1;
  }

  .control-list-row {
    flex-wrap: wrap;
  }
}

/* \u2500\u2500 workspace merge loading \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.aidos-merge-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 240px;
  gap: 10px;
  padding: 24px 4px;
  color: var(--text-secondary);
  font-size: 12px;
}

.aidos-merge-spinner {
  width: 14px;
  height: 14px;
  flex: none;
  border: 2px solid var(--border);
  border-top-color: var(--text-secondary);
  border-radius: 50%;
  animation: aidos-merge-spin 0.8s linear infinite;
}

@keyframes aidos-merge-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .aidos-merge-spinner {
    animation-duration: 2s;
  }
}

/* U2e: allowlist editor */
.aidos-action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.aidos-allowlist-input {
  width: 100%;
  min-height: 120px;
  font-family: monospace;
  font-size: 12px;
  resize: vertical;
}

.aidos-allowlist-preview ul {
  margin: 4px 0 0;
  padding-left: 16px;
  font-family: monospace;
  font-size: 12px;
  color: var(--text-secondary);
}

.aidos-clickable {
  cursor: pointer;
}

/* #50: evidence viewer modal */
.aidos-evidence-payload-json {
  max-height: 320px;
  overflow: auto;
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 8px;
}

.aidos-evidence-payload-list {
  margin: 4px 0 0;
  padding-left: 16px;
  font-family: monospace;
  font-size: 12px;
}

/* #62: disabled action buttons stay legible on the dark theme */
.aidos-btn-disabled,
.aidos-btn-disabled:hover,
.aidos-btn-disabled:active {
  opacity: 0.45;
  cursor: not-allowed;
  color: var(--text-primary);
  background: var(--surface-active);
  border-color: var(--border);
}

/* #55: split badges for the metric chips. The keyword half carries the
   neutral chrome; the value half inverts so the number reads first. */
.aidos-chip-metric {
  padding-inline: 0;
  overflow: hidden;
}

.aidos-chip-metric .aidos-chip-key {
  padding-inline: 7px;
}

.aidos-chip-metric .aidos-chip-value {
  align-self: stretch;
  display: inline-flex;
  align-items: center;
  padding-inline: 5px;
  font-weight: 700;
}

/*
 * #21, the attention hierarchy the user set: "only gate is allowed to draw
 * attention, as is ticket id and status".
 *
 * The GATE keeps the near-white value pill. It is the only metric that
 * controls anything -- it is literally what stands between a ticket and its
 * next state -- so it earns the loudest treatment on the card.
 */
.aidos-chip-gate .aidos-chip-value {
  background: #f9fafb;
  color: #232324;
}

/*
 * CONFIDENCE is advisory: it never unlocks anything, so it must never look
 * like it does. It used to share the gate's stark white pill, which gave an
 * advisory number the same visual authority as the gate. It now uses the
 * same quiet tint as the evidence chips, over a NEUTRAL hue so it recedes
 * from the coloured kind chips too.
 *
 * Measured (both backdrops): 8.76 / 7.39 on the chip and 6.42 / 5.56 on the
 * value. Quiet is not the same as unreadable -- the earlier grey-on-grey
 * failure came from a 72% text mix, not from using a grey hue.
 */
.aidos-chip-conf {
  --chip-hue: var(--text-secondary);
  background: color-mix(in srgb, var(--chip-hue) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--chip-hue) 45%, transparent);
  color: color-mix(in srgb, var(--chip-hue) 38%, #ffffff);
}

/*
 * #21: the pending-approval flag beside the ticket id.
 *
 * Warning-yellow, and deliberately the only OTHER thing on the card allowed
 * to draw attention alongside the gate, the id and the state chip. It marks
 * the one condition that is blocked on the human, so a card that needs them
 * should be findable at a glance across the grid.
 */
.aidos-chip-approval-flag {
  --chip-hue: var(--state-awaiting);
  padding-inline: 4px;
  background: color-mix(in srgb, var(--chip-hue) 22%, transparent);
  border: 1px solid color-mix(in srgb, var(--chip-hue) 60%, transparent);
  color: color-mix(in srgb, var(--chip-hue) 30%, #ffffff);
}

.aidos-chip-conf .aidos-chip-value {
  background: color-mix(in srgb, var(--chip-hue) 30%, transparent);
  border-inline-start: 1px solid color-mix(in srgb, var(--chip-hue) 45%, transparent);
  color: inherit;
}

/* #68: structured evidence payload fields (the no-raw-JSON rule). */
.aidos-evidence-fields {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.aidos-evidence-note-text {
  white-space: pre-wrap;
}

.aidos-evidence-image {
  max-width: 100%;
  max-height: 320px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  display: block;
  margin-bottom: 4px;
}

.aidos-evidence-image-path {
  display: block;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  color: var(--text-muted);
}

.aidos-evidence-raw-json {
  margin-top: 4px;
}

.aidos-evidence-raw-json > summary {
  cursor: pointer;
  font-size: 11px;
  line-height: 16px;
  color: var(--text-muted);
  user-select: none;
}

.aidos-evidence-raw-json > summary:hover {
  color: var(--text-secondary);
}

.aidos-evidence-raw-json > .aidos-evidence-payload-json {
  margin-top: 4px;
}

/* #53: the kind-tailored attach surface. */
.aidos-evidence-attach {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.aidos-evidence-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.aidos-evidence-paste-zone {
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  padding: 14px 10px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 18px;
  cursor: pointer;
  outline: none;
}

.aidos-evidence-paste-zone:focus-visible,
.aidos-evidence-paste-zone:hover {
  border-color: var(--border-focus);
  color: var(--text-primary);
}

.aidos-evidence-paste-error {
  margin: 0;
  font-size: 12px;
  line-height: 18px;
  color: #e07a5f;
}

.aidos-evidence-tailored {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Dependency mini-cards (#board-feedback): a dependency renders as a card
   with title + state + an Open button, not a bare chip. */




/* The one dep-card survivor: the unknown-ref fallback inside a shared
   TicketStrip (#93). Every other dep-card rule died with the private card. */
.aidos-dep-card-unknown {
  color: var(--text-muted);
  font-style: italic;
}


/* #51: the pending-approval card. Kind-generic: one card style for every
   agent-to-user ask (allowlist first). */
.aidos-approval-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid var(--accent-blue);
  border-radius: var(--radius-md);
  padding: 10px;
  background: var(--surface);
}

.aidos-approval-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.aidos-approval-prompt {
  font-size: 12px;
  line-height: 18px;
  color: var(--text-primary);
  min-width: 0;
}

.aidos-chip-approval-kind {
  background: var(--accent-blue);
}

/* #70: the shared UI vocabulary's tokens. */
.aidos-field-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.aidos-field-row-label,
.aidos-collapse > summary {
  font-size: 11px;
  line-height: 16px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.aidos-field-row-value {
  font-size: 13px;
  line-height: 20px;
  color: var(--text-primary);
  overflow-wrap: anywhere;
}

.aidos-chip-emphasis {
  background: var(--accent-blue);
}

.aidos-collapse > summary {
  cursor: pointer;
  user-select: none;
}

.aidos-collapse > summary:hover {
  color: var(--text-secondary);
}

.aidos-collapse-body {
  margin-top: 4px;
}

/* ==== Evidence strips (#77) and criterion linking (#69) ==== */

.aidos-evidence-list,
.aidos-criterion-evidence,
.aidos-criterion-linked {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.aidos-evidence-strip {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: 6px var(--space-1);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  min-width: 0;
}

.aidos-evidence-strip-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.aidos-evidence-strip-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.aidos-evidence-strip-excerpt {
  font-size: 12px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.aidos-evidence-strip-kind-name {
  font-size: 12px;
  color: var(--text-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.aidos-evidence-strip-meta {
  font-size: 11px;
  color: var(--text-secondary);
}

.aidos-evidence-strip-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: none;
  /* Always at the end of the strip, whatever the excerpt's width. */
  margin-left: auto;
  align-self: center;
}

.aidos-evidence-unlink {
  flex: none;
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: var(--text-muted);
  font-size: 10px;
  line-height: 1;
  cursor: pointer;
}

.aidos-evidence-unlink:hover {
  background: var(--surface-active);
  color: var(--text-primary);
}

.aidos-evidence-unlink:disabled {
  opacity: 0.4;
  cursor: default;
}

/* Criterion blocks: label row + its linked strips + the link picker. */
.aidos-criterion-blocks {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.aidos-criterion-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--space-1);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
}

/* The linker's criterion block has no warning triangle of its own (its
   "No evidence linked." line carries that), so it keeps the warning edge.
   The criterion STRIP does not: its triangle is the signal. */
.aidos-criterion-block.aidos-criterion-uncovered {
  border-color: var(--state-awaiting);
}

.aidos-criterion-label {
  font-size: 12px;
  color: var(--text-primary);
}

.aidos-criterion-linker {
  display: flex;
  gap: 6px;
  align-items: center;
}

.aidos-criterion-linker select {
  flex: 1;
  min-width: 0;
  font: inherit;
  font-size: 12px;
  padding: 4px 6px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--control-text);
}

.aidos-criterion-linker select:focus-visible {
  outline: none;
  border-color: var(--border-focus);
}

/* Evidence nested under a criterion line in the criteria panel. */
.aidos-criterion-linked {
  margin: 4px 0 0;
  padding-left: 10px;
}

/* ---------------------------------------------------------------------------
   #93 TICKET STRIP + the human work queue, and #85's approval runner.
   Deliberately mirrors the evidence-strip rules above: the two strips are one
   family, so a referenced ticket and a referenced evidence row read alike.
   --------------------------------------------------------------------------- */

.aidos-ticket-strips {
  display: flex;
  flex-direction: column;
  gap: 6px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.aidos-ticket-strip {
  /*
   * A COLUMN, so the revealed action row can sit BELOW the strip (#93).
   *
   * This was \`flex\` with the default row direction, which is why clicking
   * the action icon appeared to do nothing: the action row rendered as a
   * second COLUMN beside the strip content, squeezed to nothing by the
   * main row's \`flex: 1\`. The state was updating correctly the whole time
   * and the element was in the DOM -- it simply had no width.
   *
   * A strip with no action row is unaffected: a column with one child lays
   * out identically to a row with one child.
   */
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  padding: 6px var(--space-1);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  min-width: 0;
}

.aidos-ticket-strip-highlighted {
  border-color: var(--accent-blue);
}

.aidos-ticket-strip-working {
  opacity: 0.6;
}

/* The strip's own content stays a ROW; only the wrapper became a column. */
.aidos-ticket-strip-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.aidos-ticket-strip-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1;
}

.aidos-ticket-strip-title {
  font-size: 12px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.aidos-ticket-strip-meta {
  font-size: 11px;
  color: var(--text-secondary);
}

.aidos-ticket-strip-chips {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: none;
}

.aidos-ticket-strip-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: none;
  /* Same rule the evidence strip follows: actions always at the end. */
  margin-left: auto;
  align-self: center;
}

/* \u2500\u2500 #93: the queue's collapsed action icons and revealed action row \u2500\u2500\u2500\u2500\u2500\u2500
   User's design, and it DISSOLVES the alignment problem rather than solving
   it. Five attempts failed to align an inline button row because a row's
   action set varies -- one action or two, a Dismiss or none -- so any fixed
   layout either reserved dead space (the gap beside "Sign off") or went
   ragged. With nothing inline there is nothing to align until a row is
   opened, and an opened row is alone. */

.aidos-strip-action-toggle {
  /*
   * An ICON, not a button (user: "these should be icons not buttons -
   * buttons should move into the expanded row").
   *
   * No border, no filled box: the collapsed row should read as a marker
   * saying what is being asked, and a button box makes it look like the
   * action itself -- which is the thing that now lives on the revealed row.
   */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  background: none;
  border-radius: var(--radius-sm);
  color: var(--tone);
  cursor: pointer;
  /* Default tone; each action overrides it below. */
  --tone: var(--text-secondary);
}

.aidos-strip-action-toggle:hover:not(:disabled) {
  background: color-mix(in srgb, var(--tone) 20%, transparent);
}

/*
 * Open reads as SELECTED. A faint tint rather than a filled button, so the
 * icon stays an icon -- it marks which row owns the revealed buttons below
 * without competing with them.
 */
/*
 * Open reads as SELECTED, not merely hovered: the revealed row belongs to
 * this icon, so it must say which one opened it even while the pointer has
 * moved on to the buttons below.
 *
 * The old design filled the box white; a bare icon has no box to fill, so
 * selection is a tone-coloured RING plus a deeper tint than hover carries.
 * Both differ from :hover, which is the property that actually matters --
 * a selected state indistinguishable from hover is not a state.
 */
.aidos-strip-action-toggle.is-open {
  background: color-mix(in srgb, var(--tone) 30%, transparent);
  box-shadow: inset 0 0 0 1px var(--tone);
}

.aidos-queue li:has([aria-label^="Sign off"]) .aidos-strip-action-toggle {
  --tone: var(--state-in-progress);
}
.aidos-queue li:has([aria-label^="Verify"]) .aidos-strip-action-toggle {
  --tone: var(--state-awaiting);
}
.aidos-queue li:has([aria-label^="Mark done"]) .aidos-strip-action-toggle {
  --tone: var(--state-done);
}
.aidos-queue li:has([aria-label^="Review a write"]) .aidos-strip-action-toggle {
  --tone: var(--badge-hue-2);
}

/* The revealed row. Right-aligned under the strip, so the buttons appear
   beneath the icon that summoned them. */
.aidos-ticket-strip-actionrow {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  /*
   * NO separator rule above the buttons.
   *
   * The revealed row already belongs to the strip that opened it -- it is
   * inside the same bordered card, and the open toggle is ringed. A rule
   * across the card divides one thing into two and makes the row read as a
   * second, unrelated strip.
   */
  padding: 2px var(--space-1) 4px;
  margin-top: 2px;
}

.aidos-ticket-strip-actionrow .aidos-btn {
  /*
   * Sized to the surrounding UI, not to a dialog. These were 28px tall in a
   * modal whose chips are 20px, so the buttons dominated rows they are
   * subordinate to: the ASK is the row, the buttons are how you answer it.
   *
   * Every button on the row gets the SAME width. Only the primary was fixed
   * before, so Dismiss sat beside it at its own text width -- which is the
   * "still different sizes" report, and the last place that inconsistency
   * survived after the container itself was fixed.
   */
  min-height: 22px;
  height: 22px;
  min-width: 5.5rem;
  padding: 0 8px;
  font-size: 11px;
  justify-content: center;
  white-space: nowrap;
}

/* No primary-only width. It was the reason Dismiss and the primary read as
   different sizes: one was pinned at 7.5rem and the other took its text
   width. The shared rule above sizes every button on the row. */

/* \u2500\u2500 #93: the state as coloured TEXT under the id \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   A state is a property of the ticket, not an ask. As a badge it carried the
   same weight as the things that need attention; as text it still reads
   instantly by colour while giving back the width the title and the agent's
   reason were squeezed out of. */
.aidos-ticket-strip-idcol {
  display: flex;
  flex-direction: column;
  /* CENTERED under the id chip (user's design). Left-aligned, the state sat
     under the chip's first letter and read as a caption that had slipped
     rather than as a label belonging to the chip above it. */
  align-items: center;
  gap: 2px;
  flex: none;
}

.aidos-ticket-strip-state {
  /* Deliberately overrides the chip look the badgeClass would apply: the
     class is kept only for its per-state COLOUR. */
  background: none !important;
  border: 0 !important;
  padding: 0 !important;
  height: auto !important;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--state-open);
}

.aidos-ticket-strip-state.aidos-chip-state-open { color: var(--state-open); }
.aidos-ticket-strip-state.aidos-chip-state-in-progress { color: var(--state-in-progress); }
.aidos-ticket-strip-state.aidos-chip-state-awaiting-verification { color: var(--state-awaiting); }
.aidos-ticket-strip-state.aidos-chip-state-done { color: var(--state-done); }

/* \u2500\u2500 #93: one badge size inside the modal \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   Chips were inheriting slightly different heights from their variants, so a
   row read as ragged even when it was aligned. */
.aidos-queue .aidos-chip {
  height: 20px;
  font-size: 11px;
}

/*
 * The nomination reason needs room to be read -- it is the agent explaining
 * WHY it is asking, and a reason squeezed into a narrow column reads as
 * noise. Two lines, then ellipsis, rather than a tall thin ribbon.
 */
.aidos-queue .aidos-ticket-strip-meta {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.35;
}

/* The queue itself. */
.aidos-queue {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.aidos-queue-empty {
  font-size: 12px;
  color: var(--text-secondary);
}

.aidos-queue-reason {
  color: var(--accent-blue);
}

/* The count the human sees without opening the queue. */
.aidos-queue-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--accent-blue);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
}

/* #85 runner steps. */
.aidos-runner-step {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.aidos-runner-step-title {
  margin: 0;
  font-size: 13px;
  color: var(--text-primary);
}

.aidos-runner-step-prompt {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.aidos-runner-checklist {
  display: flex;
  flex-direction: column;
  gap: 6px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.aidos-runner-checklist label {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: var(--text-primary);
  cursor: pointer;
}

/* #93: a wider modal for list surfaces (the work queue, pickers). The default
   420px is sized for a form; a ticket strip carries an id chip, a title, two
   chips, and its actions, and cramps badly at that width. */
.aidos-modal-wide {
  width: 720px;
}

/* #93: the queue's header \u2014 count on the left, sort on the right. */
.aidos-queue-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.aidos-queue-count {
  font-size: 12px;
  color: var(--text-secondary);
}

.aidos-queue-sort {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

/* #93: a ticket carrying an unanswered approval request. Amber, because it is
   a block on the AGENT and the human is the only one who can clear it. */
.aidos-chip-awaiting-approval {
  background: var(--state-awaiting);
  color: #1a1206;
  font-weight: 600;
}

/* #93: nominations that matched no queue entry. Visible, not silent. */
.aidos-queue-unmatched {
  list-style: none;
  margin: 0;
  padding: 6px var(--space-1);
  border: 1px solid var(--state-awaiting);
  border-radius: var(--radius-sm);
  font-size: 12px;
  color: var(--text-secondary);
}

/*
 * #100: the detail panel's "this ticket is not on the board right now"
 * notice. The panel no longer closes when a row goes momentarily missing --
 * it says so and keeps the reader's place, along with any modal they had
 * open inside it. Warning-toned because it means the view may be stale, not
 * because anything is broken.
 */
.aidos-detail-absent {
  padding: 6px 10px;
  border: 1px solid color-mix(in srgb, var(--state-awaiting) 55%, transparent);
  border-radius: 4px;
  background: color-mix(in srgb, var(--state-awaiting) 16%, transparent);
  color: color-mix(in srgb, var(--state-awaiting) 34%, #ffffff);
  font-size: 12px;
  line-height: 1.4;
}

/* \u2500\u2500 #82: the scratch tools' conversation rows \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   Nothing here. The rows now use tool-render's OWN stylesheet, vendored
   verbatim at src/client/vendor/tool-render/tool-render.css and injected by
   index.ts, so they are identical by construction rather than by
   resemblance.

   Three hand-written approximations failed in a row ("not close enough",
   "the card looks different"), which is the argument against maintaining a
   parallel set of rules here: a copy of a design drifts from it, and every
   drift is invisible until someone looks at both side by side.

   tests/u82-vendor-drift.test.ts fails loudly when upstream changes. */

/*
 * #83: the "+N" chip marking a row that the workspace merge collapsed from
 * several session copies.
 *
 * The #83 review found supersededCopies was DEAD DATA -- populated, shipped,
 * and read by nothing -- so the ticket's claim that "nothing becomes
 * invisible" was theoretical. This chip is the minimum that makes it true.
 *
 * Deliberately QUIET: it is context, not an ask. Only the gate, the id, the
 * state and the pending-approval flag draw attention (#21), and a merge is
 * normal in a workspace with forked sessions -- a loud marker on a routine
 * condition is exactly the clutter #21 removed.
 */
.aidos-chip-copies {
  --chip-hue: var(--text-secondary);
  background: color-mix(in srgb, var(--chip-hue) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--chip-hue) 45%, transparent);
  color: color-mix(in srgb, var(--chip-hue) 38%, #ffffff);
  font-variant-numeric: tabular-nums;
}

/* \u2500\u2500 #73: the aidos cards' EXPANDED bodies \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   User-reported: "the expanded view doesn't work". Only attach_evidence
   supplied a body, so every other aidos row had nothing to expand -- no
   chevron, and a click that did nothing visible.

   Two body shapes cover every tool: a FACTS table (label -> value) and a
   LIST (a key, an optional tag, and text). They deliberately borrow
   tool-render's own box -- the same --dsw-alias tokens, radius, margins and
   type scale as .tool-render-output -- so an expanded aidos card sits in the
   same visual family as an expanded fs card rather than looking like an
   aidos widget dropped into the transcript. That distinction is what #82
   settled: the --dsw-alias-* tokens are the HARNESS's design system and are
   global to the page, so using them is matching the app, not depending on
   another plugin. Every one carries a fallback, because a var() to an
   undeclared token renders as nothing at all. */

.aidos-tool-facts,
.aidos-tool-list {
  box-sizing: border-box;
  margin: 0.25rem 0 0.25rem 0.25rem;
  padding: 0.625rem 0.8125rem;
  border-radius: 0.625rem;
  background: var(--dsw-alias-markdown-code-block, var(--surface-raised));
  color: var(--dsw-alias-label-primary, var(--text-primary));
  font-size: 0.8125rem;
  line-height: 1.375rem;
  max-height: 17.5rem;
  overflow-y: auto;
}

.aidos-tool-facts {
  display: grid;
  /* The label column sizes to its content and stops: a fixed width either
     truncates "contextSections" or wastes the row on "State". */
  grid-template-columns: auto minmax(0, 1fr);
  gap: 2px 0.8125rem;
}

.aidos-tool-facts dt {
  color: var(--dsw-alias-label-tertiary, var(--text-secondary));
  font-family: var(--ds-font-family-code, monospace);
  white-space: nowrap;
}

.aidos-tool-facts dd {
  margin: 0;
  min-width: 0;
  /* One line per fact, ellipsised: a description pasted whole would bury
     every fact beside it, and the value is always reachable in the ticket. */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/*
 * The ticket-row expand chevron, in the durable-todos todo panel's style
 * (user ask: same chevron as there). Rules mirror that plugin's
 * .durable-todos-chevron so the two cannot read as different components:
 * right-pointing collapsed, rotating to down open, 0.12s transform ease.
 * The border-radius is from the source too -- it rounds a focus/hover
 * highlight if one is ever added, and costs nothing now.
 */
.aidos-chevron {
  flex: none;
  color: var(--dsw-alias-label-secondary);
  border-radius: 0.375rem;
  transform: rotate(-90deg);
  transition: transform 0.12s;
}

.aidos-chevron-open {
  transform: rotate(0deg);
}

/* The click-through peek (#73 round 3): the ticket card shown when a tool
   row's ticket link is clicked. Matches the tool-facts card's chrome, since
   the two surface the same kind of summary in the same kind of context. */
.aidos-ticket-peek-excerpt {
  margin: 0.5rem 0.25rem 0;
  color: var(--dsw-alias-label-secondary, var(--text-secondary));
  font-size: 0.8125rem;
  line-height: 1.25rem;
}

.aidos-ticket-peek-empty {
  margin: 0.25rem;
  color: var(--dsw-alias-label-tertiary, var(--text-secondary));
  font-size: 0.8125rem;
  line-height: 1.25rem;
}

.aidos-tool-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  list-style: none;
}

.aidos-tool-list li {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  min-width: 0;
}

.aidos-tool-list-key {
  flex: none;
  font-family: var(--ds-font-family-code, monospace);
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-tertiary, var(--text-secondary));
}

.aidos-tool-list-tag {
  flex: none;
  padding: 0 0.375rem;
  border-radius: 0.375rem;
  background: color-mix(in srgb, currentColor 12%, transparent);
  color: var(--dsw-alias-label-tertiary, var(--text-secondary));
  font-size: 0.75rem;
}

.aidos-tool-list-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* An evidence strip inside a card body keeps the strip's own look; it only
   needs the surrounding box the other two body shapes carry. */
/*
 * An evidence list inside a card body needs only the surrounding box the
 * other two body shapes carry -- it keeps the strip's own look.
 *
 * The class here used to be \`aidos-evidence-strips\`, which EXISTS NOWHERE
 * ELSE in this stylesheet: I invented a name rather than using the real
 * \`aidos-evidence-list\`, so the list fell back to the browser's default
 * \`padding-left: 40px\` and bullets. User-reported as "a weird indent beside
 * the strip", and it was a phantom class, not a missing rule.
 */
/* A rendered error message: prose, in the same box the other bodies use. */
.aidos-tool-message {
  box-sizing: border-box;
  margin: 0.25rem 0 0.25rem 0.25rem;
  padding: 0.625rem 0.8125rem;
  border-radius: 0.625rem;
  background: var(--dsw-alias-markdown-code-block, var(--surface-raised));
  color: var(--dsw-alias-label-primary, var(--text-primary));
  font-size: 0.8125rem;
  line-height: 1.375rem;
  white-space: pre-wrap;
  word-break: break-word;
}

.tool-render-body > .aidos-evidence-list {
  margin: 0.25rem 0 0.25rem 0.25rem;
}

/*
 * A REFUSAL is retinted to "stopped" (not crash red) -- but the stopped
 * state also MUTES its summary, and the refusal's reason is the one thing
 * the row exists to say. When a stopped row carries an error summary, the
 * summary reads in full weight instead of the mute. It is deliberately NOT
 * the error red: a gate refusal is the system working.
 */
.tool-render-row[data-state="stopped"] .tool-render-summary[tool-render-error] {
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
}
`;

// css-text:/home/sid/repos/aidos/src/client/plan-meta.css
var plan_meta_default = "/* Plan-meta modal styles (Ticket U12). Board.css owns the shared modal\n   tokens; this file styles only the aidos-plan-meta-* classes. */\n\n.aidos-plan-meta-modal {\n  box-sizing: border-box;\n  width: 640px;\n  max-width: calc(100vw - 32px);\n  max-height: calc(100vh - 96px);\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n  padding: 1.25rem;\n  background: var(--surface);\n  border: 1px solid var(--border);\n  border-radius: var(--radius-lg);\n  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);\n  color: var(--text-primary);\n}\n\n.aidos-plan-meta-blocks {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  overflow-y: auto;\n}\n\n.aidos-plan-meta-block {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n  padding: 8px;\n  background: var(--bg);\n  border: 1px solid var(--border-subtle);\n  border-radius: var(--radius-md);\n}\n\n.aidos-plan-meta-block-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n}\n\n.aidos-plan-meta-block-title {\n  font-size: 0.875rem;\n  font-weight: 600;\n  color: var(--text-primary);\n}\n\n.aidos-plan-meta-toggle {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  padding: 0;\n  border: none;\n  background: none;\n  font: inherit;\n  font-size: 0.875rem;\n  font-weight: 600;\n  color: var(--text-primary);\n  cursor: pointer;\n  text-align: left;\n}\n\n.aidos-plan-meta-toggle:hover {\n  color: var(--text-secondary);\n}\n\n.aidos-plan-meta-text {\n  margin: 0;\n  padding: 6px 8px;\n  font-family: inherit;\n  font-size: 0.8125rem;\n  line-height: 1.5;\n  white-space: pre-wrap;\n  word-break: break-word;\n  color: var(--text-secondary);\n  background: var(--surface);\n  border: 1px solid var(--border-subtle);\n  border-radius: var(--radius-sm);\n  max-height: 240px;\n  overflow-y: auto;\n}\n\n.aidos-plan-meta-input {\n  box-sizing: border-box;\n  width: 100%;\n  min-height: 96px;\n  padding: 6px 8px;\n  font: inherit;\n  font-size: 0.8125rem;\n  line-height: 1.5;\n  color: var(--control-text);\n  background: var(--surface);\n  border: 1px solid var(--border);\n  border-radius: var(--radius-sm);\n  resize: vertical;\n}\n\n.aidos-plan-meta-input:focus {\n  outline: none;\n  border-color: var(--border-focus);\n}\n\n.aidos-plan-meta-actions {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n\n.aidos-plan-meta-note {\n  margin: 0;\n  font-size: 0.875rem;\n  line-height: 1.5;\n  color: var(--text-secondary);\n}\n";

// css-text:/home/sid/repos/aidos/src/client/vendor/tool-render/tool-render.css
var tool_render_default = `.tool-render-row {
  align-items: center;
  min-width: 0;
  height: 2rem;
  display: flex;
  position: relative;
  overflow: hidden;
}
.tool-render-row[data-expandable] {
  cursor: pointer;
}
.tool-render-chevron {
  color: var(--dsw-alias-label-secondary);
  flex: none;
  margin-right: 0.25rem;
  transform: rotate(-90deg);
  transition: transform 0.12s;
}
.tool-render-chevron-open {
  transform: rotate(0deg);
}
.tool-render-title {
  color: var(--dsw-alias-label-secondary);
  flex: none;
  font-size: 0.875rem;
  line-height: 1.5rem;
}
/* The always-on raw tool-name badge: the row's own icon plus the registered
   tool name, on a hashed-hue background. */
.tool-render-name-badge {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.25rem;
  width: 6.75rem;
  height: 1.5rem;
  flex: none;
  overflow: hidden;
  border: 1px solid;
  border-radius: 0.375rem;
  padding: 0.0625rem 0.375rem;
  margin-right: 0.375rem;
  color: var(--dsw-alias-label-primary);
}
.tool-render-name-badge-icon {
  display: inline-flex;
  flex: none;
  align-items: center;
}
.tool-render-name-badge-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
  font-size: 0.75rem;
  line-height: 1.125rem;
  font-weight: 500;
}
/* The producer/source badge on a context-injection or send_message row.
   A small pill, not the sentence-in-body treatment it replaces. This is the
   older optional per-row badge, not the tool-name badge above. */
.tool-render-badge {
  flex: none;
  white-space: nowrap;
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-interactive-bg-hover);
  border-radius: 999px;
  margin-left: 0.375rem;
  padding: 0.0625rem 0.375rem;
  font-size: 0.6875rem;
  line-height: 1rem;
}
.tool-render-sep {
  background: var(--dsw-alias-label-caption);
  border-radius: 0.0625rem;
  flex: none;
  width: 0.125rem;
  height: 0.125rem;
  margin: 0 0.5rem;
}
.tool-render-summary {
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  color: var(--dsw-alias-label-tertiary);
  flex: auto;
  font-size: 0.875rem;
  line-height: 1.5rem;
  overflow: hidden;
}
.tool-render-summary[tool-render-error] {
  color: var(--dsw-alias-state-error-primary);
  font-weight: 500;
}
.tool-render-path {
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
  min-width: 0;
  max-width: 100%;
  display: inline-block;
  vertical-align: bottom;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.875rem;
  line-height: 1.5rem;
}
.tool-render-path:hover {
  color: var(--dsw-alias-label-primary);
  text-decoration: underline;
}
.tool-render-body {
  flex-direction: column;
  display: flex;
}
.tool-render-io {
  flex-direction: column;
  display: flex;
}
.tool-render-cmd-label {
  font-family: var(--ds-font-family-code);
  font-size: 0.6875rem;
  line-height: 1rem;
  color: var(--dsw-alias-label-tertiary);
  opacity: 0.75;
  margin: 0.375rem 0 0 0.25rem;
}
.tool-render-command {
  font-family: var(--ds-font-family-code);
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--dsw-alias-label-tertiary);
  margin: 0.25rem 0 0 0.25rem;
  padding: 0.125rem 0;
  font-size: 0.8125rem;
  line-height: 1.25rem;
}
.tool-render-command code.hljs {
  background: transparent;
  padding: 0;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  white-space: inherit;
}
.tool-render-output {
  box-sizing: border-box;
  background: var(--dsw-alias-markdown-code-block);
  font-family: var(--ds-font-family-code);
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--dsw-alias-label-primary);
  border-radius: 0.625rem;
  margin: 0.25rem 0 0.25rem 0.25rem;
  padding: 0.625rem 0.8125rem;
  font-size: 0.8125rem;
  line-height: 1.375rem;
  max-height: 17.5rem;
  overflow-y: auto;
}
.tool-render-output[tool-render-error] {
  color: var(--dsw-alias-state-error-primary);
  border-color: rgba(255, 85, 85, 0.45);
  background: rgba(255, 85, 85, 0.08);
  font-weight: 500;
}
.tool-render-row[data-state="error"] .tool-render-title {
  color: var(--dsw-alias-state-error-primary);
  font-weight: 500;
}
/* A stopped call mutes its title and summary, since it no longer has its own
   state dot to mark it. */
.tool-render-row[data-state="stopped"] .tool-render-title,
.tool-render-row[data-state="stopped"] .tool-render-summary {
  color: var(--dsw-alias-label-tertiary);
}
.tool-render-code {
  box-sizing: border-box;
  background: var(--dsw-alias-markdown-code-block);
  font-family: var(--ds-font-family-code);
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--dsw-alias-label-primary);
  border-radius: 0.75rem;
  margin: 0.25rem 0 0.25rem 0.25rem;
  padding: 0.625rem 0.8125rem;
  font-size: 0.8125rem;
  line-height: 1.375rem;
  max-height: 25rem;
  overflow-y: auto;
}
.tool-render-inspect {
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  opacity: 0;
  border-radius: 0.4375rem;
  align-self: flex-start;
  align-items: center;
  gap: 0.25rem;
  margin: 0.25rem 0 0.125rem 0.25rem;
  padding: 0.125rem 0.375rem;
  font-size: 0.6875rem;
  line-height: 1rem;
  transition: opacity 0.1s;
  display: inline-flex;
}
.tool-render-card:hover .tool-render-inspect,
.tool-render-inspect:focus-visible {
  opacity: 1;
}
.tool-render-inspect:hover {
  background: var(--dsw-alias-interactive-bg-hover-solid);
  color: var(--dsw-alias-label-primary);
}
.tool-render-diff-fallback {
  box-sizing: border-box;
  background: var(--dsw-alias-markdown-code-block);
  font-family: var(--ds-font-family-code);
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--dsw-alias-label-primary);
  border-radius: 0.75rem;
  margin: 0.25rem 0 0.25rem 0.25rem;
  padding: 0.625rem 0.8125rem;
  font-size: 0.8125rem;
  line-height: 1.375rem;
  max-height: 25rem;
  overflow-y: auto;
}
.tool-render-fallback-note {
  color: var(--dsw-alias-label-tertiary);
  font-size: 0.75rem;
  line-height: 1.125rem;
  margin-bottom: 0.375rem;
}
.tool-render-write {
  flex-direction: column;
  display: flex;
}
.tool-render-write-diff {
  box-sizing: border-box;
  background: var(--dsw-alias-markdown-code-block);
  font-family: var(--ds-font-family-code);
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--dsw-alias-label-primary);
  border-radius: 0.75rem;
  margin: 0.25rem 0 0.25rem 0.25rem;
  padding: 0.625rem 0.8125rem;
  font-size: 0.8125rem;
  line-height: 1.375rem;
  max-height: 25rem;
  overflow-y: auto;
}
.tool-render-line-same {
  color: var(--dsw-alias-label-primary);
}
.tool-render-diff-row.tool-render-line-del,
.tool-render-diff-cell.tool-render-line-del {
  background: rgba(255, 166, 87, 0.16);
}
.tool-render-diff-row.tool-render-line-add,
.tool-render-diff-cell.tool-render-line-add {
  background: rgba(125, 180, 255, 0.16);
}
.tool-render-diff-marker {
  flex: none;
  width: 2ch;
  text-align: center;
  align-self: flex-start;
  user-select: none;
  color: var(--dsw-alias-label-tertiary);
}
.tool-render-diff-marker-del {
  color: #ffb86c;
}
.tool-render-diff-marker-add {
  color: #7db4ff;
}
.tool-render-write-note {
  color: var(--dsw-alias-label-tertiary);
  font-size: 0.75rem;
  line-height: 1.125rem;
  margin-bottom: 0.375rem;
}
.tool-render-code-row,
.tool-render-diff-row {
  display: flex;
  align-items: flex-start;
  min-width: 0;
}
.tool-render-diff-pair {
  display: flex;
  align-items: stretch;
  min-width: 0;
}
.tool-render-diff-cell {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: flex-start;
}
.tool-render-diff-cell + .tool-render-diff-cell {
  border-left: 0.0625rem solid var(--dsw-alias-border-l2);
}
.tool-render-gutter {
  flex: none;
  align-self: flex-start;
  padding-right: 0.75rem;
  text-align: right;
  color: var(--dsw-alias-label-tertiary);
  user-select: none;
  font-family: var(--ds-font-family-code);
  font-size: 0.8125rem;
  line-height: 1.375rem;
}
.tool-render-line-cell {
  flex: auto;
  min-width: 0;
  display: block;
  font-family: var(--ds-font-family-code);
  font-size: 0.8125rem;
  line-height: 1.375rem;
  white-space: pre-wrap;
  word-break: break-word;
}
.tool-render-line-cell.hljs {
  background: transparent;
  padding: 0;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  white-space: inherit;
}
.tool-render-diff-path {
  color: var(--dsw-alias-label-secondary);
  font-family: var(--ds-font-family-code);
  font-size: 0.8125rem;
  line-height: 1.375rem;
  border-bottom: 0.0625rem solid var(--dsw-alias-border-l2);
  padding-bottom: 0.25rem;
  margin-bottom: 0.375rem;
}
.tool-render-diff-sep {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  color: var(--dsw-alias-label-caption);
  font-family: var(--ds-font-family-code);
  font-size: 0.75rem;
  line-height: 1.125rem;
  margin: 0.5rem 0;
}
.tool-render-diff-sep::before,
.tool-render-diff-sep::after {
  content: "";
  flex: 1;
  height: 0.0625rem;
  background: var(--dsw-alias-border-l2);
}
.tool-render-card {
  box-sizing: border-box;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 0.75rem;
  background: var(--dsw-alias-bg-layer-1);
  padding: 0.15625rem 0.5rem;
}
.tool-render-card[data-escalated] {
  outline: 3px solid var(--dsh-outline-escalated);
}
/* A call waiting on a bash-guard approval is outlined in electric blue, so it
   reads differently from a sandbox_permissions escalation. This rule follows
   the escalated one, so blue wins when a call is somehow both. A rewritten
   command keeps the outline permanently, because the rewrite is recorded in
   the durable result metadata. A pending approval that caused no rewrite
   loses the mark once it is answered. */
.tool-render-card[data-guard-approval] {
  outline: 3px solid var(--dsh-outline-guard);
}
/* An errored call is outlined the way an escalated one is, in red and a little
   thinner. The outline follows the card's rounded corners. It replaces the old
   tinted row background and inset left bar. */
.tool-render-card[data-error] {
  outline: 2px solid var(--dsw-alias-state-error-primary);
}
/* A stopped call (interrupted) gets a dimmer red outline, since it no longer
   carries its own state dot. */
.tool-render-card[data-stopped] {
  outline: 2px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 55%, transparent);
}
.tool-render-card:hover {
  border-color: var(--dsw-alias-border-l3);
}
.tool-render-title {
  font-weight: 500;
}
.tool-render-summary,
.tool-render-path {
  font-size: 0.8125rem;
}
.tool-render-output,
.tool-render-code,
.tool-render-write-diff,
.tool-render-diff-fallback {
  border: 1px solid var(--dsw-alias-border-l1);
}
.tool-render-row:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary);
  outline-offset: -0.125rem;
}

/* todo_write and ask_user_question shared body layout. */
.tool-render-plan {
  flex-direction: column;
  display: flex;
}
/* Plan row (item, checkbox, content) is shared PLAN_ROW_CSS from
   shared/client-util.ts, injected via the dsh-plan-row style tag. */

/* ask_user_question questions, options, and answers. */
.tool-render-ask {
  flex-direction: column;
  display: flex;
}
.tool-render-question {
  flex-direction: column;
  display: flex;
  padding: 0.125rem 0;
}
.tool-render-question + .tool-render-question {
  border-top: 1px solid var(--dsw-alias-border-l1);
  margin-top: 0.25rem;
  padding-top: 0.375rem;
}
.tool-render-question-prompt {
  color: var(--dsw-alias-label-secondary);
  font-size: 0.8125rem;
  line-height: 1.25rem;
  overflow-wrap: anywhere;
  padding: 0 0 0.125rem 0.25rem;
}
.tool-render-option {
  align-items: baseline;
  display: flex;
  gap: 0.375rem;
  padding: 0.125rem 0 0.125rem 0.25rem;
}
.tool-render-option-marker {
  flex: none;
  font-size: 0.8125rem;
  line-height: 1.25rem;
  width: 1rem;
}
.tool-render-option-text {
  display: flex;
  flex-direction: column;
  gap: 0.0625rem;
  min-width: 0;
}
.tool-render-option-label {
  color: var(--dsw-alias-label-tertiary);
  font-size: 0.8125rem;
  line-height: 1.25rem;
  overflow-wrap: anywhere;
}
.tool-render-option-description {
  color: var(--dsw-alias-label-secondary);
  font-size: 0.8125rem;
  line-height: 1.125rem;
  overflow-wrap: anywhere;
}
.tool-render-option[data-selected] .tool-render-option-label {
  color: var(--dsw-alias-label-primary);
  font-weight: 700;
}
.tool-render-answer-note {
  color: var(--dsw-alias-label-caption);
  font-size: 0.8125rem;
  line-height: 1.25rem;
  font-style: italic;
  padding: 0.125rem 0 0 1.625rem;
  overflow-wrap: anywhere;
}
.tool-render-ask[tool-render-error] .tool-render-question-prompt {
  color: var(--dsw-alias-label-tertiary);
}

/* Shared capped, scrollable markdown body. Used by every row whose body is
   rendered text: subagent prompt, context injection, send_message delivery.
   One block, so a future row family member gets the same rules for free
   instead of a fourth copy. */
.tool-render-markdown-body {
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 0.375rem;
  margin: 0.25rem 0 0.125rem 0.25rem;
  max-height: 16rem;
  overflow-y: auto;
  padding: 0.5rem 0.625rem;
}
.tool-render-markdown-body :where(h1, h2, h3, h4, h5, h6) {
  font-size: 0.875rem;
  line-height: 1.25rem;
  margin: 0.5rem 0 0.25rem;
}
.tool-render-markdown-body :where(h1, h2, h3, h4, h5, h6):first-child {
  margin-top: 0;
}
.tool-render-markdown-body :where(p, ul, ol, pre, blockquote, table) {
  font-size: 0.8125rem;
  line-height: 1.25rem;
  margin: 0.25rem 0;
}
.tool-render-markdown-body :where(ul, ol) {
  padding-left: 1.125rem;
}
.tool-render-markdown-body :where(pre) {
  background: var(--dsw-alias-bg-base);
  border-radius: 0.25rem;
  overflow-x: auto;
  padding: 0.375rem 0.5rem;
}
.tool-render-markdown-body :where(code) {
  font-family: var(--ds-font-family-code);
}
.tool-render-markdown-body :where(code):not(:where(pre code)) {
  background: var(--dsw-alias-bg-base);
  border-radius: 0.1875rem;
  padding: 0 0.1875rem;
}
/* A <system-reminder> block, framed instead of hidden: every character of
   its text still renders, just under a chip instead of literal tags. */
.tool-render-reminder {
  border-left: 2px solid var(--dsw-alias-border-l2);
  margin: 0.5rem 0;
  padding-left: 0.5rem;
}
.tool-render-reminder-chip {
  display: inline-block;
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-interactive-bg-hover);
  border-radius: 999px;
  margin-bottom: 0.25rem;
  padding: 0.0625rem 0.375rem;
  font-size: 0.6875rem;
  line-height: 1rem;
}
/* Skill frontmatter table (name, resource-resolution hint). Only what the
   loaded skill's canonical output actually carries -- description and
   whenToUse are catalog-only fields, stripped before a skill loads. */
.tool-render-skill-table {
  border-collapse: collapse;
  margin-bottom: 0.5rem;
  font-size: 0.8125rem;
  line-height: 1.25rem;
}
.tool-render-skill-table th {
  color: var(--dsw-alias-label-tertiary);
  text-align: left;
  font-weight: 400;
  padding: 0.125rem 0.5rem 0.125rem 0;
  vertical-align: top;
  white-space: nowrap;
}
.tool-render-skill-table td {
  color: var(--dsw-alias-label-primary);
  padding: 0.125rem 0;
  white-space: pre-wrap;
}

/* read_image and see image bodies. One bounded container per card, with one
   interior scroll area. Picture cards hold mixed content, so this rule is
   shaped like .tool-render-markdown-body but stands alone instead of
   overloading it. */
.tool-render-image-body {
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 0.375rem;
  margin: 0.25rem 0 0.125rem 0.25rem;
  max-height: 25rem;
  overflow-y: auto;
  padding: 0.5rem 0.625rem;
}
.tool-render-image-body > .tool-render-markdown-body {
  margin: 0 0 0.375rem;
}
/* The picture shrinks to the card width, keeps its aspect ratio, and never
   grows past its natural pixel size. width and height stay auto, so the
   browser only ever scales down. The link centers the picture when it is
   narrower than the card. */
.tool-render-image-link {
  display: flex;
  justify-content: center;
}
/* A 2px border in a LABEL token, not a border token: the border tokens are
   tuned to sit quietly against panel backgrounds, which is exactly wrong
   here, where the job is to mark where the picture's own edge is against
   arbitrary image content. */
.tool-render-image {
  max-width: 100%;
  width: auto;
  height: auto;
  border: 2px solid var(--dsw-alias-label-tertiary);
  border-radius: 0.25rem;
}
/* Metadata lines under the picture: name, type, full path. */
.tool-render-image-meta {
  color: var(--dsw-alias-label-tertiary);
  font-size: 0.75rem;
  line-height: 1.125rem;
  overflow-wrap: anywhere;
  margin-top: 0.375rem;
}
/* A path the route cannot serve. The message sits where the picture would
   sit, so a broken load is always visible. */
.tool-render-image-broken {
  color: var(--dsw-alias-state-error-primary);
  font-size: 0.75rem;
  line-height: 1.125rem;
  overflow-wrap: anywhere;
  padding: 0.5rem 0;
  text-align: center;
}
/* The see row description clamp. The cap applies only while collapsed, so
   this rule rides beside .tool-render-markdown-body and comes after it in
   this file to win the max-height and overflow contest. */
.tool-render-see-desc {
  max-height: 8rem;
  overflow: hidden;
}
.tool-render-see-toggle {
  align-self: flex-start;
  background: transparent;
  border: none;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  margin: 0 0 0.375rem;
  padding: 0;
  font-size: 0.75rem;
  line-height: 1.125rem;
}
.tool-render-see-toggle:hover {
  color: var(--dsw-alias-label-primary);
  text-decoration: underline;
}

/* Compaction checkpoint card. One line per compacted message, count-badged
   tool strips, elision notes, and a stats footer. Message lines clamp to a
   single line with an ellipsis: the full text lives on the surface the
   marker replaced, so the card only summarizes. */
.tool-render-compaction {
  flex-direction: column;
  display: flex;
  padding-bottom: 0.25rem;
}
.tool-render-compaction-line {
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
  min-width: 0;
  padding: 0.0625rem 0 0.0625rem 0.25rem;
}
.tool-render-compaction-role {
  flex: none;
  color: var(--dsw-alias-label-caption);
  font-size: 0.6875rem;
  line-height: 1.125rem;
  text-transform: uppercase;
}
.tool-render-compaction-text {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--dsw-alias-label-secondary);
  font-size: 0.8125rem;
  line-height: 1.25rem;
}
.tool-render-compaction-strip {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
  padding: 0.0625rem 0 0.0625rem 0.25rem;
}
.tool-render-compaction-strip .tool-render-compaction-text {
  flex: 0 1 auto;
}
.tool-render-compaction-note {
  color: var(--dsw-alias-label-caption);
  font-style: italic;
  font-size: 0.8125rem;
  line-height: 1.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0.0625rem 0 0.0625rem 0.25rem;
}
.tool-render-compaction-stats {
  color: var(--dsw-alias-label-caption);
  font-size: 0.6875rem;
  line-height: 1.125rem;
  border-top: 1px solid var(--dsw-alias-border-l1);
  margin-top: 0.25rem;
  padding: 0.25rem 0 0 0.25rem;
}
`;

// src/kernel/types.ts
var STATE_ORDER = [
  "open",
  "in_progress",
  "awaiting_verification",
  "done"
];

// src/kernel/constants.ts
var BUILTIN_KINDS = [
  {
    id: "builtin:user_signoff",
    label: "User signoff",
    description: "The human confirms the work.",
    weight: 1,
    allowedAuthors: ["user"]
  },
  {
    id: "builtin:user_verified",
    label: "User verified",
    description: "The human checked the finished work.",
    weight: 1,
    allowedAuthors: ["user"]
  },
  {
    id: "builtin:eval_criteria",
    label: "Evaluation criteria",
    description: "The criteria to judge the work.",
    weight: 1,
    allowedAuthors: ["user", "agent"]
  },
  {
    id: "builtin:file_allowlist",
    label: "File allowlist",
    description: "The files the change may touch.",
    weight: 1,
    allowedAuthors: ["user"]
  },
  {
    id: "builtin:agent_report",
    label: "Agent report",
    description: "The agent describes the work.",
    weight: 1,
    allowedAuthors: ["user", "agent"]
  },
  {
    id: "builtin:automated_check",
    label: "Automated check",
    description: "A machine check ran and reported a result.",
    weight: 1,
    allowedAuthors: ["agent", "user"]
  },
  {
    id: "builtin:test_run",
    label: "Test run",
    description: "A test run and its result.",
    weight: 1,
    allowedAuthors: ["agent", "user"]
  },
  {
    id: "builtin:review_pass",
    label: "Review \u2014 accepted",
    description: "An independent review of the change accepted it: a reviewer subagent or the human read it, reported findings, and PASSED it. The orchestrator's own read does not qualify. A failing review is recorded with builtin:review_fail instead \u2014 never here.",
    weight: 1,
    allowedAuthors: ["agent", "user"]
  },
  {
    id: "builtin:review_fail",
    label: "Review \u2014 failed",
    description: "An independent review of the change FAILED it: a reviewer subagent or the human found a defect and did not pass it. Contributes to nothing \u2014 it never satisfies a gate. Kept alongside any later builtin:review_pass so the review history (how many rounds, what each found) stays visible.",
    weight: 0,
    allowedAuthors: ["agent", "user"]
  },
  {
    id: "builtin:review_note",
    label: "Remark",
    description: "A remark: a note from a review round, or a general comment on the ticket. The one surviving free-form remark kind after builtin:comment folded into it \u2014 same weight, same authors, one kind instead of two doing the same job.",
    weight: 0.5,
    allowedAuthors: ["agent", "user"]
  },
  {
    id: "builtin:after_shot",
    label: "After shot",
    description: "The state after the work.",
    weight: 1,
    allowedAuthors: ["user", "agent"]
  },
  {
    id: "builtin:comment",
    label: "Comment (deprecated)",
    description: "DEPRECATED \u2014 folded into builtin:review_note, which is identical in weight and authorship. Kept here only so a pre-existing evidence row of this kind still validates and renders; no longer offered for new rows. Do not confuse with the ticket's COMMENT THREAD (CommentRecord/userAddComment), a separate durable mechanism this kind never wrote to.",
    weight: 0.5,
    allowedAuthors: ["user", "agent"]
  },
  {
    id: "builtin:imported_state",
    label: "Imported state",
    description: "The state that a plan document claimed at import time.",
    weight: 0,
    allowedAuthors: ["system"]
  },
  {
    id: "builtin:user_commit",
    label: "Git commit",
    description: "One git commit from the ticket's workspace, resolved through git show at attach time.",
    weight: 1,
    allowedAuthors: ["user"]
  }
];
var DEFAULT_GATES = [
  {
    fromState: "open",
    toState: "in_progress",
    requiredKinds: ["builtin:user_signoff"],
    allowedActors: ["user", "agent"]
  },
  {
    fromState: "in_progress",
    toState: "awaiting_verification",
    requiredKinds: ["builtin:automated_check", "builtin:review_pass"],
    allowedActors: ["user", "agent"],
    /*
     * #107: an accepted review excuses the machine check.
     *
     * automated_check is the CHEAP evidence -- the agent attaches it from
     * its own claim that it ran something, and nothing verifies the claim.
     * review_pass is the EXPENSIVE one: an independent reviewer, or the
     * human. Requiring the cheap artefact alongside the expensive one adds
     * ceremony, not safety, and worse, teaches the agent to attach a check
     * as a formality -- which is precisely how automated_check becomes a
     * rubber stamp.
     *
     * The motivating case was a human writing "this flow works fine, we've
     * been using it extensively" on a ticket that then sat blocked waiting
     * for a machine check. That review IS empirical evidence the thing
     * runs, arguably stronger than a test run, and a design that cannot
     * record it without also demanding a check is failing the human.
     *
     * DIRECTIONAL, and that is the safety property: review_pass excuses
     * automated_check and never the reverse. The expensive evidence stays
     * mandatory, so the gate still stops the agent marking its own homework.
     */
    excusedBy: { "builtin:automated_check": "builtin:review_pass" }
  },
  {
    fromState: "awaiting_verification",
    toState: "done",
    requiredKinds: ["builtin:user_verified"],
    allowedActors: ["user"]
  },
  {
    fromState: "awaiting_verification",
    toState: "in_progress",
    requiredKinds: [],
    allowedActors: ["user"]
  }
];
var DEFAULT_CONFIG = {
  kinds: [...BUILTIN_KINDS],
  gates: [...DEFAULT_GATES],
  injectEnabled: true,
  injectDebounceMs: 3e4
};

// src/client/board-logic.ts
function asBoardKey(value) {
  return value;
}
function boardKeyOf(ticket) {
  return ticket.foreign === true && ticket.sourceSessionId !== void 0 ? ticket.sourceSessionId + ":" + ticket.id : String(ticket.id);
}
var STATE_CHECKLIST_ORDER = [
  "open",
  "in_progress",
  "awaiting_verification",
  "done"
];
function stateLabel(state) {
  switch (state) {
    case "open":
      return "Open";
    case "in_progress":
      return "In progress";
    case "awaiting_verification":
      return "Awaiting verification";
    case "done":
      return "Done";
    default:
      return state;
  }
}
function stateClass(state) {
  switch (state) {
    case "open":
      return "open";
    case "in_progress":
      return "in-progress";
    case "awaiting_verification":
      return "awaiting-verification";
    case "done":
      return "done";
    default:
      return state;
  }
}
function badgeClass(state) {
  return "aidos-chip aidos-chip-state-" + stateClass(state);
}
function hasCriteria(ticket) {
  return ticket.criteria.trim().length > 0;
}
function compareTitles(a, b2) {
  const al = a.toLowerCase();
  const bl = b2.toLowerCase();
  if (al < bl) return -1;
  if (al > bl) return 1;
  return 0;
}
function compareTickets(a, b2, key, descending) {
  const aHas = hasCriteria(a);
  const bHas = hasCriteria(b2);
  if (aHas !== bHas) return aHas ? -1 : 1;
  let primary = 0;
  let tiebreak = 0;
  switch (key) {
    case "confidence":
      primary = a.confidenceScore - b2.confidenceScore;
      tiebreak = (a.gateFraction ?? 0) - (b2.gateFraction ?? 0);
      break;
    case "gates":
      primary = (a.gateFraction ?? 0) - (b2.gateFraction ?? 0);
      tiebreak = a.confidenceScore - b2.confidenceScore;
      break;
    case "time":
      primary = a.updatedAt - b2.updatedAt;
      tiebreak = compareTitles(a.title, b2.title);
      break;
    case "alpha":
      primary = compareTitles(a.title, b2.title);
      tiebreak = a.updatedAt - b2.updatedAt;
      break;
  }
  let cmp = primary;
  if (descending) cmp = -cmp;
  if (cmp === 0) {
    cmp = tiebreak;
    if (descending) cmp = -cmp;
  }
  if (cmp === 0) cmp = a.id - b2.id;
  return cmp;
}
function matchesSearch(ticket, query) {
  if (query === "") return true;
  if (ticket.title.toLowerCase().includes(query.toLowerCase())) return true;
  return String(ticket.id).includes(query);
}
function filterTickets(tickets, filter) {
  const stateSet = new Set(filter.stateIds);
  const projectSet = filter.projectIds === null ? null : new Set(filter.projectIds);
  const out = [];
  for (const ticket of tickets) {
    if (!stateSet.has(ticket.state)) continue;
    if (projectSet !== null && !projectSet.has(ticket.projectId)) continue;
    if (!matchesSearch(ticket, filter.search)) continue;
    out.push(ticket);
  }
  out.sort((a, b2) => compareTickets(a, b2, filter.sortKey, filter.descending));
  return out;
}
function autocompleteTickets(tickets, query, limit = 8) {
  const out = [];
  for (const ticket of tickets) {
    if (!matchesSearch(ticket, query)) continue;
    out.push(ticket);
  }
  out.sort((a, b2) => a.id - b2.id);
  return out.slice(0, limit);
}
function openCount(tickets) {
  let count = 0;
  for (const ticket of tickets) {
    if (ticket.state !== "done") count += 1;
  }
  return count;
}
function formatGateFraction(present, total, hasCriteriaValue) {
  if (!hasCriteriaValue) return "N/A";
  if (present === null || total === null) return "\u2014";
  return present + "/" + total;
}
function ringPercent(score) {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, score * 20));
}
function parseCriteria(criteria) {
  return criteria.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
}
var KINDS_ANNOTATION = /\s*<!--\s*kinds:\s*([a-z0-9_:,\- ]+?)\s*-->\s*$/i;
function kindsForCriterion(line) {
  const match = KINDS_ANNOTATION.exec(line);
  if (match === null) return [];
  return match[1].split(",").map((kind) => kind.trim()).filter((kind) => kind !== "");
}
function criteriaLines(criteria) {
  return parseCriteria(criteria);
}
function groupEvidenceByCriterion(criteria, evidence) {
  const lines = parseCriteria(criteria);
  const groups = lines.map((line) => ({
    criterion: line,
    matched: false,
    rows: []
  }));
  const byLabel = /* @__PURE__ */ new Map();
  for (const group of groups) {
    byLabel.set(group.criterion, group);
  }
  const ungrouped = [];
  for (const row of evidence) {
    const raw = row.payload.criteria;
    if (typeof raw !== "string" || raw.trim() === "") {
      ungrouped.push(row);
    } else {
      const label = raw.trim();
      const group = byLabel.get(label);
      if (group) {
        group.rows.push(row);
        group.matched = true;
      } else {
        ungrouped.push(row);
      }
    }
  }
  if (ungrouped.length > 0) {
    groups.push({ criterion: "", matched: true, rows: ungrouped });
  }
  return groups;
}
function uncoveredCriteria(criteria, evidence) {
  const groups = groupEvidenceByCriterion(criteria, evidence);
  const out = [];
  for (const group of groups) {
    if (group.criterion === "" || group.matched) continue;
    const linked = kindsForCriterion(group.criterion);
    const matches = (kind) => linked.includes(kind) || linked.includes(kind.replace(/^builtin:/, ""));
    if (linked.length > 0 && evidence.some((row) => matches(row.kind))) continue;
    out.push(group.criterion);
  }
  return out;
}
function evidenceIsMany(evidence, threshold = 6) {
  return evidence.length > threshold;
}
var KIND_COLORS = [
  "var(--badge-hue-1)",
  "var(--badge-hue-2)",
  "var(--badge-hue-3)",
  "var(--badge-hue-4)",
  "var(--badge-hue-5)",
  "var(--badge-hue-6)",
  "var(--badge-hue-7)",
  "var(--badge-hue-8)"
];
function kindColor(kind) {
  if (kind === "builtin:review_fail") return "var(--verdict-fail)";
  let hash = 0;
  for (let i = 0; i < kind.length; i++) {
    hash = hash * 31 + kind.charCodeAt(i) | 0;
  }
  const index = Math.abs(hash) % KIND_COLORS.length;
  return KIND_COLORS[index];
}
function kindLabel(kind) {
  for (const def of BUILTIN_KINDS) {
    if (def.id === kind) return def.label;
  }
  return kind;
}
function kindDescription(kind) {
  for (const def of BUILTIN_KINDS) {
    if (def.id === kind) return def.description;
  }
  return "";
}
var KIND_KEYWORDS = {
  "builtin:imported_state": "IMPORTED",
  "builtin:user_signoff": "SIGNED OFF",
  "builtin:user_verified": "VERIFIED",
  "builtin:eval_criteria": "CRITERIA",
  "builtin:file_allowlist": "ALLOWLIST",
  "builtin:agent_report": "REPORT",
  "builtin:automated_check": "CHECK",
  "builtin:test_run": "TESTS",
  "builtin:review_pass": "ACCEPTED",
  "builtin:review_fail": "FAILED",
  "builtin:review_note": "NOTE"
};
function kindKeyword(kind) {
  const known = KIND_KEYWORDS[kind];
  if (known !== void 0) return known;
  const label = kindLabel(kind);
  if (label !== kind) return label.toUpperCase();
  const tail = kind.includes(":") ? kind.slice(kind.indexOf(":") + 1) : kind;
  return tail.replace(/[_-]+/g, " ").toUpperCase();
}
function stateImpliedKinds(state, gates = DEFAULT_GATES) {
  const reached = STATE_ORDER.indexOf(state);
  const implied = /* @__PURE__ */ new Set();
  for (const gate of gates) {
    const target = STATE_ORDER.indexOf(gate.toState);
    if (target <= STATE_ORDER.indexOf(gate.fromState)) continue;
    if (target >= 0 && reached >= target) {
      for (const kind of gate.requiredKinds) implied.add(kind);
    }
  }
  return implied;
}
function tileKindCounts(state, counts2, gates = DEFAULT_GATES) {
  const implied = stateImpliedKinds(state, gates);
  return counts2.filter((count) => count.count > 1 || !implied.has(count.kind));
}
function evidenceKindCounts(evidence) {
  const counts2 = /* @__PURE__ */ new Map();
  const firstAt = /* @__PURE__ */ new Map();
  let sequence = 0;
  const arrival = /* @__PURE__ */ new Map();
  for (const row of evidence) {
    counts2.set(row.kind, (counts2.get(row.kind) ?? 0) + 1);
    if (!arrival.has(row.kind)) arrival.set(row.kind, sequence++);
    if (typeof row.at === "number") {
      const seen = firstAt.get(row.kind);
      if (seen === void 0 || row.at < seen) firstAt.set(row.kind, row.at);
    }
  }
  const out = [];
  for (const [kind, count] of counts2) {
    out.push({ kind, count, color: kindColor(kind) });
  }
  out.sort((a, b2) => {
    const aFirst = a.kind === "builtin:imported_state";
    const bFirst = b2.kind === "builtin:imported_state";
    if (aFirst !== bFirst) return aFirst ? -1 : 1;
    const at2 = firstAt.get(a.kind);
    const bt = firstAt.get(b2.kind);
    if (at2 !== void 0 && bt !== void 0 && at2 !== bt) return at2 - bt;
    const aa = arrival.get(a.kind) ?? 0;
    const ba = arrival.get(b2.kind) ?? 0;
    if (aa !== ba) return aa - ba;
    if (a.kind < b2.kind) return -1;
    if (a.kind > b2.kind) return 1;
    return 0;
  });
  return out;
}
function workspaceLabel(workspaceKey) {
  const parts = workspaceKey.split("-").filter((part) => part !== "");
  return parts.length === 0 ? workspaceKey : parts[parts.length - 1];
}
function displayDep(ref, ownWorkspaceKey) {
  const match = /^(--.*--):(.*)$/.exec(ref);
  if (match === null) return ref;
  const [, workspaceKey, tail] = match;
  if (ownWorkspaceKey !== void 0 && workspaceKey === ownWorkspaceKey) {
    return "#" + tail;
  }
  return workspaceLabel(workspaceKey) + "#" + tail;
}
function fullTicketId(ticket) {
  return ticket.workspaceKey + ":" + ticket.slug;
}
function ticketChipLabel(ticket, ownWorkspaceKey) {
  return displayDep(ticket.workspaceKey + ":" + ticket.id, ownWorkspaceKey);
}
var BADGE_HUES = [
  "var(--badge-hue-1)",
  "var(--badge-hue-2)",
  "var(--badge-hue-3)",
  "var(--badge-hue-4)",
  "var(--badge-hue-5)",
  "var(--badge-hue-6)",
  "var(--badge-hue-7)",
  "var(--badge-hue-8)"
];
function idColor(fullId) {
  let hash = 0;
  for (let i = 0; i < fullId.length; i++) {
    hash = hash * 31 + fullId.charCodeAt(i) | 0;
  }
  const index = Math.abs(hash) % BADGE_HUES.length;
  return BADGE_HUES[index];
}
function resolveSelection(tickets, selectedKey, previous) {
  if (selectedKey === null) {
    return { ticket: null, reanchorKey: null, reason: "none", absent: false };
  }
  const resolved = tickets.find((ticket) => boardKeyOf(ticket) === selectedKey) ?? null;
  if (resolved !== null) {
    return { ticket: resolved, reanchorKey: null, reason: "resolved", absent: false };
  }
  if (previous !== null) {
    const reanchored = tickets.find((ticket) => fullTicketId(ticket) === fullTicketId(previous)) ?? null;
    if (reanchored !== null) {
      return {
        ticket: reanchored,
        reanchorKey: boardKeyOf(reanchored),
        reason: "reanchored",
        absent: false
      };
    }
    return { ticket: previous, reanchorKey: null, reason: "held", absent: true };
  }
  return { ticket: null, reanchorKey: null, reason: "gone", absent: false };
}

// src/client/view-state.ts
var DEFAULT_APPLIED = {
  projectIds: null,
  stateIds: [...STATE_CHECKLIST_ORDER],
  sortKey: "time",
  descending: true,
  search: ""
};
function cloneAppliedState(state) {
  return {
    projectIds: state.projectIds === null ? null : [...state.projectIds],
    stateIds: [...state.stateIds],
    sortKey: state.sortKey,
    descending: state.descending,
    search: state.search
  };
}
var sessionStates = /* @__PURE__ */ new Map();
function freshState() {
  return {
    applied: cloneAppliedState(DEFAULT_APPLIED),
    staged: cloneAppliedState(DEFAULT_APPLIED)
  };
}
function getStagedState(sessionId) {
  const entry = sessionStates.get(sessionId);
  if (entry) return entry.staged;
  return cloneAppliedState(DEFAULT_APPLIED);
}
function setAppliedState(sessionId, state) {
  let entry = sessionStates.get(sessionId);
  if (!entry) {
    entry = freshState();
    sessionStates.set(sessionId, entry);
  }
  entry.applied = cloneAppliedState(state);
}
function setStagedState(sessionId, state) {
  let entry = sessionStates.get(sessionId);
  if (!entry) {
    entry = freshState();
    sessionStates.set(sessionId, entry);
  }
  entry.staged = cloneAppliedState(state);
}
var counts = /* @__PURE__ */ new Map();
var currentSessionId = null;
var bumpCallback = null;
function setCountCallback(callback) {
  bumpCallback = callback;
}
function reportCount(sessionId, count) {
  const changed = counts.get(sessionId) !== count;
  counts.set(sessionId, count);
  currentSessionId = sessionId;
  if (changed && bumpCallback !== null) bumpCallback();
}
function badgeLabel() {
  const count = currentSessionId === null ? 0 : counts.get(currentSessionId) ?? 0;
  return count > 0 ? "Tickets (" + count + ")" : "Tickets";
}
var selections = /* @__PURE__ */ new Map();
function getSelection(sessionId) {
  return selections.get(sessionId) ?? null;
}
var selectionListeners = /* @__PURE__ */ new Set();
function onSelectionChanged(listener) {
  selectionListeners.add(listener);
  return function() {
    selectionListeners.delete(listener);
  };
}
function setSelection(sessionId, key) {
  const previous = selections.get(sessionId) ?? null;
  if (key === null) selections.delete(sessionId);
  else selections.set(sessionId, key);
  if (previous === key) return;
  for (const listener of [...selectionListeners]) {
    try {
      listener(sessionId);
    } catch {
    }
  }
}
var ticketTitles = /* @__PURE__ */ new Map();
function publishTicketTitles(rows) {
  for (const row of rows) ticketTitles.set(String(row.id), row.title);
}
function ticketTitle(ticketId) {
  return ticketTitles.get(String(ticketId)) ?? null;
}
var mergeCache = /* @__PURE__ */ new Map();
var mergePulledVersion = /* @__PURE__ */ new Map();
function getMerge(sessionId) {
  return mergeCache.get(sessionId) ?? null;
}
function setMerge(sessionId, merge) {
  mergeCache.set(sessionId, merge);
}
function getPulledVersion(sessionId) {
  return mergePulledVersion.get(sessionId) ?? null;
}
function setPulledVersion(sessionId, version) {
  mergePulledVersion.set(sessionId, version);
}
var pullsInFlight = /* @__PURE__ */ new Set();
function isMergePulling(sessionId) {
  return pullsInFlight.has(sessionId);
}
function setMergePulling(sessionId, pulling) {
  if (pulling) {
    pullsInFlight.add(sessionId);
  } else {
    pullsInFlight.delete(sessionId);
  }
}

// src/client/local-ticket-view.tsx
var import_react27 = __toESM(require("react"), 1);

// src/client/ticket-view.tsx
var import_react5 = __toESM(require("react"), 1);

// src/client/filter-panel.tsx
var import_react = __toESM(require("react"), 1);

// src/client/log.ts
function logDebug(message) {
  console.debug("aidos: " + message);
}
function logInfo(message) {
  console.info("aidos: " + message);
}
function logWarn(message) {
  console.warn("aidos: " + message);
}
function logError(message) {
  console.error("aidos: " + message);
}

// src/client/filter-panel.tsx
function statesEqual(a, b2) {
  if (a.sortKey !== b2.sortKey) return false;
  if (a.descending !== b2.descending) return false;
  if (a.search !== b2.search) return false;
  if (a.stateIds.length !== b2.stateIds.length) return false;
  for (let i = 0; i < a.stateIds.length; i += 1) {
    if (a.stateIds[i] !== b2.stateIds[i]) return false;
  }
  if (a.projectIds === null || b2.projectIds === null) {
    if (a.projectIds !== b2.projectIds) return false;
  } else {
    if (a.projectIds.length !== b2.projectIds.length) return false;
    for (let i = 0; i < a.projectIds.length; i += 1) {
      if (a.projectIds[i] !== b2.projectIds[i]) return false;
    }
  }
  return true;
}
var SORT_OPTIONS = [
  { key: "confidence", label: "Confidence" },
  { key: "gates", label: "Gates" },
  { key: "time", label: "Time updated" },
  { key: "alpha", label: "Alphabetical" }
];
function FilterPanel(props) {
  const sessionId = props.sessionId;
  const stagedRef = import_react.default.useRef(getStagedState(sessionId));
  const [staged, setStaged] = import_react.default.useState(stagedRef.current);
  const [searchInput, setSearchInput] = import_react.default.useState(stagedRef.current.search);
  const [focused, setFocused] = import_react.default.useState(false);
  const debounceRef = import_react.default.useRef(null);
  function updateStaged(next) {
    stagedRef.current = next;
    setStaged(next);
    setStagedState(sessionId, next);
  }
  function updateSearch(value) {
    setSearchInput(value);
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(function() {
      updateStaged({ ...stagedRef.current, search: value });
    }, 150);
  }
  function clearSearch() {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    setSearchInput("");
    updateStaged({ ...stagedRef.current, search: "" });
  }
  import_react.default.useEffect(function() {
    logDebug("filter panel mounted");
  }, []);
  import_react.default.useEffect(function() {
    return function() {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    };
  }, []);
  const dirty = !statesEqual(staged, props.applied);
  const suggestions = autocompleteTickets(props.tickets, searchInput);
  function toggleState(state) {
    const has = staged.stateIds.includes(state);
    const next = has ? staged.stateIds.filter((s) => s !== state) : [...staged.stateIds, state];
    updateStaged({ ...staged, stateIds: next });
  }
  function toggleProject(projectId) {
    const all = (props.projects ?? []).map((p) => p.id);
    const current = staged.projectIds === null ? all : staged.projectIds;
    const has = current.includes(projectId);
    const next = has ? current.filter((id) => id !== projectId) : [...current, projectId];
    const projectIds = next.length === all.length ? null : next;
    updateStaged({ ...staged, projectIds });
  }
  function apply2() {
    props.onApply(staged);
  }
  function reset() {
    setSearchInput("");
    updateStaged(cloneAppliedState(DEFAULT_APPLIED));
  }
  const projectRows = props.projects === void 0 ? null : /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-panel-section" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-panel-head" }, /* @__PURE__ */ import_react.default.createElement("h4", { className: "aidos-panel-title" }, "Projects")), /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-check-list" }, props.projects.map((project) => {
    const checked = staged.projectIds === null || staged.projectIds.includes(project.id);
    return /* @__PURE__ */ import_react.default.createElement("label", { className: "aidos-check-row", key: project.id }, /* @__PURE__ */ import_react.default.createElement(
      "input",
      {
        type: "checkbox",
        checked,
        onChange: () => {
          toggleProject(project.id);
        }
      }
    ), /* @__PURE__ */ import_react.default.createElement("span", null, project.name));
  })));
  const stateRows = /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-panel-section" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-panel-head" }, /* @__PURE__ */ import_react.default.createElement("h4", { className: "aidos-panel-title" }, "State")), /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-check-list" }, STATE_CHECKLIST_ORDER.map((state) => {
    const checked = staged.stateIds.includes(state);
    const count = props.tickets.filter((t) => t.state === state).length;
    return /* @__PURE__ */ import_react.default.createElement("label", { className: "aidos-check-row", key: state }, /* @__PURE__ */ import_react.default.createElement(
      "input",
      {
        type: "checkbox",
        checked,
        onChange: () => {
          toggleState(state);
        }
      }
    ), /* @__PURE__ */ import_react.default.createElement("span", null, stateLabel(state)), /* @__PURE__ */ import_react.default.createElement("span", { className: "aidos-check-count" }, String(count)));
  })));
  const sortRows = /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-panel-section" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-panel-head" }, /* @__PURE__ */ import_react.default.createElement("h4", { className: "aidos-panel-title" }, "Sort")), /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-sort-row" }, /* @__PURE__ */ import_react.default.createElement(
    "select",
    {
      value: staged.sortKey,
      onChange: (event) => {
        updateStaged({
          ...staged,
          sortKey: event.target.value
        });
      }
    },
    SORT_OPTIONS.map((option) => /* @__PURE__ */ import_react.default.createElement("option", { key: option.key, value: option.key }, option.label))
  ), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      className: "aidos-btn aidos-toggle-btn",
      title: staged.descending ? "Sort ascending" : "Sort descending",
      "data-dsh-tip": "",
      "aria-label": staged.descending ? "Sort ascending" : "Sort descending",
      onClick: () => {
        updateStaged({ ...staged, descending: !staged.descending });
      }
    },
    staged.descending ? "\u2193" : "\u2191"
  )));
  const searchSection = /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-panel-section" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-panel-head" }, /* @__PURE__ */ import_react.default.createElement("h4", { className: "aidos-panel-title" }, "Search")), /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-search-box" }, /* @__PURE__ */ import_react.default.createElement(
    "input",
    {
      className: "aidos-search-input",
      type: "text",
      placeholder: "Title or id",
      value: searchInput,
      onChange: (event) => {
        updateSearch(event.target.value);
      },
      onFocus: () => {
        setFocused(true);
      },
      onBlur: () => {
        window.setTimeout(function() {
          setFocused(false);
        }, 120);
      }
    }
  ), focused && suggestions.length > 0 ? /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-autocomplete" }, suggestions.map((ticket) => /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      className: "aidos-suggestion",
      key: ticket.id,
      onMouseDown: (event) => {
        event.preventDefault();
        clearSearch();
        props.onJump(boardKeyOf(ticket));
      }
    },
    /* @__PURE__ */ import_react.default.createElement("span", { className: "aidos-suggestion-title" }, ticket.title),
    /* @__PURE__ */ import_react.default.createElement(
      "span",
      {
        className: "aidos-chip aidos-chip-id",
        style: { background: idColor(fullTicketId(ticket)) },
        title: fullTicketId(ticket),
        "data-dsh-tip": ""
      },
      ticketChipLabel(ticket)
    )
  ))) : null));
  const actionRows = /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-actions-row" }, /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      className: dirty ? "aidos-btn aidos-btn-dot" : "aidos-btn",
      onClick: apply2
    },
    "Apply"
  ), /* @__PURE__ */ import_react.default.createElement("button", { className: "aidos-btn", onClick: reset }, "Reset"));
  const stateChips = /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-filter-chips" }, STATE_CHECKLIST_ORDER.map((state) => {
    const checked = staged.stateIds.includes(state);
    const count = props.tickets.filter((t) => t.state === state).length;
    return /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        key: state,
        className: "aidos-filter-chip" + (checked ? " aidos-filter-chip-on" : ""),
        onClick: () => {
          toggleState(state);
        }
      },
      stateLabel(state),
      /* @__PURE__ */ import_react.default.createElement("span", { className: "aidos-check-count" }, String(count))
    );
  }));
  return /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-filterbar" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-filterbar-left" }, stateChips, props.projects === void 0 ? null : props.projects.length === 0 ? null : /* @__PURE__ */ import_react.default.createElement(
    "select",
    {
      className: "aidos-filter-project",
      value: staged.projectIds === null ? "all" : staged.projectIds.join(","),
      onChange: (event) => {
        const value = event.target.value;
        if (value === "all") {
          updateStaged({ ...staged, projectIds: null });
          return;
        }
        updateStaged({
          ...staged,
          projectIds: value === "" ? [] : value.split(",").map(Number)
        });
      }
    },
    /* @__PURE__ */ import_react.default.createElement("option", { value: "all" }, "All projects"),
    props.projects.map((project) => /* @__PURE__ */ import_react.default.createElement("option", { key: project.id, value: String(project.id) }, project.name))
  ), /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-sort-row" }, /* @__PURE__ */ import_react.default.createElement(
    "select",
    {
      value: staged.sortKey,
      onChange: (event) => {
        updateStaged({
          ...staged,
          sortKey: event.target.value
        });
      }
    },
    SORT_OPTIONS.map((option) => /* @__PURE__ */ import_react.default.createElement("option", { key: option.key, value: option.key }, option.label))
  ), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      className: "aidos-btn aidos-toggle-btn",
      title: staged.descending ? "Sort ascending" : "Sort descending",
      "data-dsh-tip": "",
      "aria-label": staged.descending ? "Sort ascending" : "Sort descending",
      onClick: () => {
        updateStaged({ ...staged, descending: !staged.descending });
      }
    },
    staged.descending ? "\u2193" : "\u2191"
  )), /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-search-box aidos-filterbar-search" }, /* @__PURE__ */ import_react.default.createElement(
    "input",
    {
      className: "aidos-search-input",
      type: "text",
      placeholder: "Title or id",
      value: searchInput,
      onChange: (event) => {
        updateSearch(event.target.value);
      },
      onFocus: () => {
        setFocused(true);
      },
      onBlur: () => {
        window.setTimeout(function() {
          setFocused(false);
        }, 120);
      }
    }
  ), focused && suggestions.length > 0 ? /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-autocomplete" }, suggestions.map((ticket) => /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      className: "aidos-suggestion",
      key: ticket.id,
      onMouseDown: (event) => {
        event.preventDefault();
        clearSearch();
        props.onJump(boardKeyOf(ticket));
      }
    },
    /* @__PURE__ */ import_react.default.createElement("span", { className: "aidos-suggestion-title" }, ticket.title),
    /* @__PURE__ */ import_react.default.createElement(
      "span",
      {
        className: "aidos-chip aidos-chip-id",
        style: { background: idColor(fullTicketId(ticket)) },
        title: fullTicketId(ticket),
        "data-dsh-tip": ""
      },
      ticketChipLabel(ticket)
    )
  ))) : null), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      className: dirty ? "aidos-btn aidos-btn-dot" : "aidos-btn",
      onClick: apply2
    },
    "Apply"
  ), /* @__PURE__ */ import_react.default.createElement("button", { className: "aidos-btn", onClick: reset }, "Reset")));
}

// src/client/ticket-tile.tsx
var import_react4 = __toESM(require("react"), 1);

// src/client/evidence-tags.tsx
var import_react2 = __toESM(require("react"), 1);
function EvidenceTags({ evidence, state }) {
  const counts2 = tileKindCounts(state, evidenceKindCounts(evidence));
  if (counts2.length === 0) return null;
  const claimedStates = /* @__PURE__ */ new Map();
  for (const row of evidence) {
    if (row.kind === "builtin:imported_state" && typeof row.payload.claimed_state === "string") {
      claimedStates.set(row.kind, row.payload.claimed_state);
    }
  }
  return /* @__PURE__ */ import_react2.default.createElement(import_react2.default.Fragment, null, counts2.map((count) => {
    const claimed = claimedStates.get(count.kind);
    const value = claimed !== void 0 ? claimed : count.count > 1 ? String(count.count) : null;
    return /* @__PURE__ */ import_react2.default.createElement(
      "span",
      {
        key: count.kind,
        className: "aidos-chip aidos-chip-kind",
        style: { ["--chip-hue"]: count.color },
        title: kindDescription(count.kind),
        "data-dsh-tip": ""
      },
      /* @__PURE__ */ import_react2.default.createElement("span", { className: "aidos-chip-key" }, kindKeyword(count.kind)),
      value !== null ? /* @__PURE__ */ import_react2.default.createElement("span", { className: "aidos-chip-count" }, value) : null
    );
  }));
}

// src/client/icons.tsx
var import_react3 = __toESM(require("react"), 1);
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
var ICON_STROKE = 1.6;
function iconProps() {
  return {
    width: 12,
    height: 12,
    viewBox: "0 0 12 12",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: ICON_STROKE,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    focusable: false
  };
}
function PencilIcon() {
  return /* @__PURE__ */ import_react3.default.createElement("svg", { ...iconProps() }, /* @__PURE__ */ import_react3.default.createElement("path", { d: "M8.5 1.5l2 2L4 10l-2.5.5L2 8z" }));
}
function TrashIcon() {
  return /* @__PURE__ */ import_react3.default.createElement("svg", { ...iconProps() }, /* @__PURE__ */ import_react3.default.createElement("path", { d: "M2 3.5h8M5 3.5V2h2v1.5M3 3.5l.5 7h5l.5-7M5 5.5v3M7 5.5v3" }));
}
function PopOutIcon() {
  return /* @__PURE__ */ import_react3.default.createElement("svg", { ...iconProps() }, /* @__PURE__ */ import_react3.default.createElement("path", { d: "M6.5 2H2v8h8V5.5" }), /* @__PURE__ */ import_react3.default.createElement("path", { d: "M7 2h3v3" }), /* @__PURE__ */ import_react3.default.createElement("path", { d: "M5 7l5-5" }));
}
function WarningIcon() {
  return /* @__PURE__ */ import_react3.default.createElement("svg", { ...iconProps() }, /* @__PURE__ */ import_react3.default.createElement("path", { d: "M6 1.5l4.5 8h-9z" }), /* @__PURE__ */ import_react3.default.createElement("path", { d: "M6 4.75v2.5" }), /* @__PURE__ */ import_react3.default.createElement("path", { d: "M6 8.6v.4" }));
}
function KeyholeIcon() {
  return /* @__PURE__ */ import_react3.default.createElement("svg", { ...iconProps() }, /* @__PURE__ */ import_react3.default.createElement("circle", { cx: "6", cy: "4.1", r: "2.4" }), /* @__PURE__ */ import_react3.default.createElement("path", { d: "M5.1 6.3L4.3 9.9h3.4L6.9 6.3" }));
}
function ForkIcon() {
  return /* @__PURE__ */ import_react3.default.createElement("svg", { ...iconProps() }, /* @__PURE__ */ import_react3.default.createElement("circle", { cx: "3.4", cy: "2.6", r: "1.4" }), /* @__PURE__ */ import_react3.default.createElement("circle", { cx: "3.4", cy: "9.4", r: "1.4" }), /* @__PURE__ */ import_react3.default.createElement("circle", { cx: "8.6", cy: "2.6", r: "1.4" }), /* @__PURE__ */ import_react3.default.createElement("path", { d: "M3.4 4v4" }), /* @__PURE__ */ import_react3.default.createElement("path", { d: "M8.6 4v1.4c0 1.2-.7 1.6-1.8 1.6H3.4" }));
}
function CompassIcon() {
  return /* @__PURE__ */ import_react3.default.createElement("svg", { ...iconProps() }, /* @__PURE__ */ import_react3.default.createElement("circle", { cx: "6", cy: "6", r: "4.6" }), /* @__PURE__ */ import_react3.default.createElement("path", { d: "M8 4L5.2 5.2 4 8l2.8-1.2z" }));
}
function AlertCircleIcon() {
  return /* @__PURE__ */ import_react3.default.createElement("svg", { ...iconProps() }, /* @__PURE__ */ import_react3.default.createElement("circle", { cx: "6", cy: "6", r: "4.6" }), /* @__PURE__ */ import_react3.default.createElement("path", { d: "M6 3.5v3" }), /* @__PURE__ */ import_react3.default.createElement("path", { d: "M6 8.3v.35" }));
}
function SignoffIcon() {
  return /* @__PURE__ */ import_react3.default.createElement("svg", { ...iconProps() }, /* @__PURE__ */ import_react3.default.createElement("path", { d: "M2.6 1.6h4.3l2.5 2.5v6.3H2.6z" }), /* @__PURE__ */ import_react3.default.createElement("path", { d: "M6.8 1.7v2.4h2.4" }), /* @__PURE__ */ import_react3.default.createElement("path", { d: "M4.2 8.4c1-1.4 1.7-1.4 2.2-.5s1 .6 1.6-.6" }));
}
function VerifyIcon() {
  return /* @__PURE__ */ import_react3.default.createElement("svg", { ...iconProps() }, /* @__PURE__ */ import_react3.default.createElement("circle", { cx: "6", cy: "6", r: "4.6" }), /* @__PURE__ */ import_react3.default.createElement("path", { d: "M3.9 6.1l1.5 1.5L8.2 4.8" }));
}
function MarkDoneIcon() {
  return /* @__PURE__ */ import_react3.default.createElement("svg", { ...iconProps() }, /* @__PURE__ */ import_react3.default.createElement("rect", { x: "1.6", y: "1.6", width: "8.8", height: "8.8", rx: "1.6" }), /* @__PURE__ */ import_react3.default.createElement("path", { d: "M3.9 6.1l1.5 1.5L8.2 4.8" }));
}
function AllowlistIcon() {
  return /* @__PURE__ */ import_react3.default.createElement("svg", { ...iconProps() }, /* @__PURE__ */ import_react3.default.createElement("path", { d: "M1.8 3.2l1 1 1.6-1.8" }), /* @__PURE__ */ import_react3.default.createElement("path", { d: "M1.8 7.4l1 1 1.6-1.8" }), /* @__PURE__ */ import_react3.default.createElement("path", { d: "M6.4 3.4h3.8" }), /* @__PURE__ */ import_react3.default.createElement("path", { d: "M6.4 7.6h3.8" }));
}
function ChevronIcon({ open }) {
  return /* @__PURE__ */ import_react3.default.createElement(
    import_dsh_client_ui_primitives.IconChevronDownOutline14,
    {
      className: "aidos-chevron" + (open ? " aidos-chevron-open" : ""),
      "aria-hidden": true
    }
  );
}

// src/client/ticket-tile.tsx
function TicketTile(props) {
  const ticket = props.ticket;
  const superseded = ticket.supersededCopies ?? [];
  const className = "aidos-tile" + (props.selected ? " aidos-tile-selected" : "") + (props.active === true ? " aidos-tile-active" : "");
  const badge = badgeClass(ticket.state);
  return /* @__PURE__ */ import_react4.default.createElement("button", { className, onClick: props.onSelect }, /* @__PURE__ */ import_react4.default.createElement("div", { className: "aidos-tile-meta" }, /* @__PURE__ */ import_react4.default.createElement(
    "span",
    {
      className: "aidos-chip aidos-chip-id",
      style: { background: idColor(fullTicketId(ticket)) },
      title: fullTicketId(ticket),
      "data-dsh-tip": ""
    },
    ticketChipLabel(ticket, props.ownWorkspaceKey)
  ), superseded.length > 0 ? /* @__PURE__ */ import_react4.default.createElement(
    "span",
    {
      className: "aidos-chip aidos-chip-copies",
      "aria-label": superseded.length + " other session cop" + (superseded.length === 1 ? "y" : "ies") + " of this ticket were merged into this row",
      title: "Merged from " + superseded.length + " other session cop" + (superseded.length === 1 ? "y" : "ies") + ". This row is the most recently updated one.\n" + superseded.map((copy) => `${copy.sessionId} (updated ${new Date(copy.updatedAt * 1e3).toLocaleString()})`).join("\n"),
      "data-dsh-tip": ""
    },
    "+" + superseded.length
  ) : null, props.awaitingApproval === true ? /* @__PURE__ */ import_react4.default.createElement(
    "span",
    {
      className: "aidos-chip aidos-chip-approval-flag",
      "aria-label": "This ticket has a request waiting for your approval",
      title: "This ticket has a request waiting for your approval",
      "data-dsh-tip": ""
    },
    /* @__PURE__ */ import_react4.default.createElement(AlertCircleIcon, null)
  ) : null, /* @__PURE__ */ import_react4.default.createElement("span", { className: badge }, stateLabel(ticket.state))), /* @__PURE__ */ import_react4.default.createElement("h3", { className: "aidos-tile-title" }, ticket.title), /* @__PURE__ */ import_react4.default.createElement("p", { className: "aidos-tile-preview" }, ticket.description), /* @__PURE__ */ import_react4.default.createElement("div", { className: "aidos-tile-chips" }, /* @__PURE__ */ import_react4.default.createElement(
    "span",
    {
      className: "aidos-chip aidos-chip-metric aidos-chip-gate",
      "aria-label": "Gate: " + formatGateFraction(ticket.gatePresent, ticket.gateTotal, hasCriteria(ticket)) + " of the required evidence is attached",
      title: "Gate: " + formatGateFraction(ticket.gatePresent, ticket.gateTotal, hasCriteria(ticket)) + " of the required evidence is attached",
      "data-dsh-tip": ""
    },
    /* @__PURE__ */ import_react4.default.createElement("span", { className: "aidos-chip-key" }, /* @__PURE__ */ import_react4.default.createElement(KeyholeIcon, null)),
    /* @__PURE__ */ import_react4.default.createElement("span", { className: "aidos-chip-value" }, formatGateFraction(ticket.gatePresent, ticket.gateTotal, hasCriteria(ticket)))
  ), /* @__PURE__ */ import_react4.default.createElement(EvidenceTags, { evidence: props.evidence, state: ticket.state }), ticket.dependsOn?.map((ref) => /* @__PURE__ */ import_react4.default.createElement(
    "span",
    {
      key: ref,
      className: "aidos-chip aidos-chip-dep",
      "aria-label": "Depends on " + ref,
      title: "Depends on " + ref,
      "data-dsh-tip": ""
    },
    /* @__PURE__ */ import_react4.default.createElement("span", { className: "aidos-chip-dep-icon" }, /* @__PURE__ */ import_react4.default.createElement(ForkIcon, null)),
    displayDep(ref, props.ownWorkspaceKey)
  )), /* @__PURE__ */ import_react4.default.createElement(
    "span",
    {
      className: "aidos-chip aidos-chip-metric aidos-chip-conf",
      "aria-label": "Confidence " + ringPercent(ticket.confidenceScore) + "%. Advisory only \u2014 it never unlocks anything.",
      title: "Confidence " + ringPercent(ticket.confidenceScore) + "%. Advisory only \u2014 it never unlocks anything.",
      "data-dsh-tip": ""
    },
    /* @__PURE__ */ import_react4.default.createElement("span", { className: "aidos-chip-key" }, /* @__PURE__ */ import_react4.default.createElement(CompassIcon, null)),
    /* @__PURE__ */ import_react4.default.createElement("span", { className: "aidos-chip-value" }, ringPercent(ticket.confidenceScore) + "%")
  )));
}

// src/client/ticket-view.tsx
function TicketView(props) {
  const [collapsed, setCollapsed] = import_react5.default.useState(false);
  const tiles = props.tickets.map((ticket) => /* @__PURE__ */ import_react5.default.createElement(
    TicketTile,
    {
      key: boardKeyOf(ticket),
      ticket,
      evidence: props.evidenceByTicket?.[boardKeyOf(ticket)] ?? [],
      ownWorkspaceKey: props.ownWorkspaceKey,
      awaitingApproval: props.awaitingApprovalKeys?.has(boardKeyOf(ticket)) === true,
      selected: boardKeyOf(ticket) === props.selectedId,
      active: boardKeyOf(ticket) === props.activeTicketId,
      onSelect: () => {
        props.onSelect(boardKeyOf(ticket));
      }
    }
  ));
  let content;
  if (props.allTicketsCount === 0) {
    content = /* @__PURE__ */ import_react5.default.createElement("div", { className: "aidos-empty" }, /* @__PURE__ */ import_react5.default.createElement("h3", { className: "aidos-empty-title" }, "No tickets yet"), /* @__PURE__ */ import_react5.default.createElement("p", { className: "aidos-empty-note" }, "This session holds no tickets. Create the first one to start the board."), /* @__PURE__ */ import_react5.default.createElement("button", { className: "aidos-btn aidos-btn-primary", onClick: props.onCreate }, "Create a ticket"));
  } else if (props.tickets.length === 0) {
    content = /* @__PURE__ */ import_react5.default.createElement("div", { className: "aidos-empty" }, /* @__PURE__ */ import_react5.default.createElement("h3", { className: "aidos-empty-title" }, "No tickets match"), /* @__PURE__ */ import_react5.default.createElement("p", { className: "aidos-empty-note" }, "The active filters hide every ticket. Clear them to see the board."), /* @__PURE__ */ import_react5.default.createElement("button", { className: "aidos-btn", onClick: props.onClearFilters }, "Clear filters"));
  } else {
    content = /* @__PURE__ */ import_react5.default.createElement("div", { className: "aidos-board-grid" }, tiles);
  }
  return /* @__PURE__ */ import_react5.default.createElement("div", { className: "aidos-root" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "aidos-toolbar" }, /* @__PURE__ */ import_react5.default.createElement("span", { className: "aidos-empty-note" }, props.tickets.length + " of " + props.allTicketsCount + " tickets"), /* @__PURE__ */ import_react5.default.createElement("span", { className: "aidos-toolbar-actions" }, props.onQueue !== void 0 ? /* @__PURE__ */ import_react5.default.createElement(
    "button",
    {
      className: "aidos-btn",
      onClick: props.onQueue,
      title: "What is waiting on you",
      "data-dsh-tip": ""
    },
    "Waiting on you",
    props.queueCount !== void 0 && props.queueCount > 0 ? /* @__PURE__ */ import_react5.default.createElement("span", { className: "aidos-queue-badge" }, props.queueCount) : null
  ) : null, /* @__PURE__ */ import_react5.default.createElement("button", { className: "aidos-btn", onClick: props.onPlan }, "Plan"), /* @__PURE__ */ import_react5.default.createElement("button", { className: "aidos-btn aidos-btn-primary", onClick: props.onCreate }, "Create"))), /* @__PURE__ */ import_react5.default.createElement(
    FilterPanel,
    {
      sessionId: props.sessionId,
      projects: props.projects,
      applied: props.applied,
      tickets: props.tickets,
      onApply: props.onApply,
      onJump: props.onJump,
      collapsed,
      onToggleCollapsed: () => {
        setCollapsed(!collapsed);
      }
    }
  ), /* @__PURE__ */ import_react5.default.createElement("div", { className: "aidos-grid-wrap" }, content));
}

// src/client/detail-panel.tsx
var import_react21 = __toESM(require("react"), 1);

// src/client/allowlist-editor.tsx
var import_react6 = __toESM(require("react"), 1);

// src/client/remote.ts
var AidosRemoteError = class extends Error {
  code;
  /** The refusal text, ready for the toast. */
  message;
  /** Extra refusal fields, for example missingKinds or allowedActors. */
  extra;
  constructor(code, message, extra = {}) {
    super(message);
    this.name = "AidosRemoteError";
    this.code = code;
    this.message = message;
    this.extra = extra;
  }
};
function makeRpcId() {
  return crypto.randomUUID();
}
function errorText(body) {
  if (body === void 0) return "";
  if (typeof body.message === "string") return body.message;
  return "";
}
function errorExtra(body) {
  if (body === void 0) return {};
  if (typeof body.details !== "object" || body.details === null) return {};
  return body.details;
}
function summarizeValue(value) {
  if (value === null) return "null";
  if (typeof value === "string") {
    return value.length > 60 ? value.slice(0, 57) + "..." : value;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return "[" + value.length + " items]";
  if (typeof value === "object") {
    const keys = Object.keys(value);
    const shown = keys.slice(0, 4);
    return "{" + shown.join(",") + (keys.length > 4 ? ",..." : "") + "}";
  }
  return String(value);
}
function summarizeArgs(args) {
  const parts = Object.keys(args).map(function(key) {
    return key + "=" + summarizeValue(args[key]);
  });
  return parts.length === 0 ? "{}" : parts.join(" ");
}
function transportFailure(message) {
  logError("remote failed: " + message);
  return new AidosRemoteError("transport_error", message);
}
async function callAidosRemote(method, args, agentId) {
  logDebug("remote " + method + " args: " + summarizeArgs(args));
  const envelope = {
    type: "client-request",
    rpcId: makeRpcId(),
    method: `aidos/${method}`,
    payload: {
      args: {
        agentId,
        args
      }
    }
  };
  const timeoutMs = 15e3;
  const controller = typeof AbortController !== "undefined" ? new AbortController() : void 0;
  const timeout = controller ? setTimeout(() => controller.abort(new Error("Remote call timed out after " + timeoutMs + "ms")), timeoutMs) : void 0;
  let response;
  try {
    response = await fetch(`/api/${envelope.method}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(envelope),
      signal: controller?.signal
    });
    if (timeout !== void 0) clearTimeout(timeout);
  } catch (error) {
    if (timeout !== void 0) clearTimeout(timeout);
    throw transportFailure(
      `The request to the aidos Remote failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (!response.ok) {
    throw transportFailure(`The aidos Remote answered with HTTP ${response.status}.`);
  }
  let body;
  try {
    body = await response.json();
  } catch {
    throw transportFailure("The aidos Remote answered with a body that is not JSON.");
  }
  if (body.type !== "server-response") {
    throw transportFailure("The aidos Remote answered with an unexpected response shape.");
  }
  const result = body.result;
  if (result === void 0) {
    throw transportFailure("The aidos Remote answered without a result.");
  }
  if (result.ok === true) {
    const value = result.value;
    logInfo("remote " + method + " ok");
    if (value === void 0) return null;
    logDebug("remote " + method + " result: " + summarizeValue(value));
    return value;
  }
  if (result.ok === false) {
    const errorBody2 = result.error;
    const code = typeof errorBody2?.code === "string" ? errorBody2.code : "refused";
    const message = errorText(errorBody2) || `The aidos Remote refused the request (${code}).`;
    logWarn("remote " + method + " refused " + code + ": " + message);
    throw new AidosRemoteError(code, message, errorExtra(errorBody2));
  }
  throw transportFailure("The aidos Remote answered with an unrecognized result.");
}

// src/client/toast-store.ts
var TOAST_DURATION_MS = 6e3;
function makeToastId() {
  return crypto.randomUUID();
}
var toasts = [];
var listeners = /* @__PURE__ */ new Set();
var timers = /* @__PURE__ */ new Map();
function emit() {
  const snapshot = toasts.slice();
  for (const listener of listeners) {
    listener(snapshot);
  }
}
function removeToast(id) {
  const timer = timers.get(id);
  if (timer !== void 0) {
    window.clearTimeout(timer);
    timers.delete(id);
  }
  const next = toasts.filter((toast) => toast.id !== id);
  if (next.length !== toasts.length) {
    toasts = next;
    emit();
  }
}
function showToast(text, kind = "info") {
  if (kind === "refusal") logWarn("toast refusal: " + text);
  else logDebug("toast: " + text);
  const id = makeToastId();
  const toast = {
    id,
    text,
    kind,
    expiresAt: Date.now() + TOAST_DURATION_MS
  };
  toasts = toasts.concat(toast);
  emit();
  const timer = window.setTimeout(function() {
    removeToast(id);
  }, TOAST_DURATION_MS);
  timers.set(id, timer);
  return id;
}
function dismissToast(id) {
  removeToast(id);
}
function subscribeToasts(listener) {
  listeners.add(listener);
  return function() {
    listeners.delete(listener);
  };
}

// src/client/allowlist-editor.tsx
function parseAllowlistText(text) {
  const seen = /* @__PURE__ */ new Set();
  for (const line of text.split("\n")) {
    const path = line.trim();
    if (path !== "" && !seen.has(path)) {
      seen.add(path);
    }
  }
  return [...seen];
}
function otherAllowlistUnion(rows, selfKey) {
  const union = [];
  const seen = /* @__PURE__ */ new Set();
  for (const row of rows) {
    if (boardKeyOf(row) === selfKey || row.state !== "in_progress") continue;
    for (const path of row.allowlist ?? []) {
      if (!seen.has(path)) {
        seen.add(path);
        union.push(path);
      }
    }
  }
  return union;
}
function AllowlistEditor(props) {
  const [text, setText] = import_react6.default.useState(
    props.currentAllowlist.join("\n")
  );
  const [others, setOthers] = import_react6.default.useState([]);
  const [saving, setSaving] = import_react6.default.useState(false);
  import_react6.default.useEffect(function() {
    if (!props.open) return;
    let cancelled = false;
    void (async function() {
      try {
        const rows = await callAidosRemote("workspaceTickets", {}, props.agentId);
        const list = Array.isArray(rows) ? rows : rows?.tickets ?? [];
        const union = otherAllowlistUnion(list, props.ticketIdKey);
        if (!cancelled) setOthers(union);
      } catch {
      }
    })();
    return function() {
      cancelled = true;
    };
  }, [props.open, props.agentId, props.ticketId]);
  if (!props.open) return null;
  async function save() {
    if (saving) return;
    const paths = parseAllowlistText(text);
    setSaving(true);
    try {
      await callAidosRemote(
        "userAttachEvidence",
        { ticketId: props.ticketIdKey, kind: "builtin:file_allowlist", payload: { paths } },
        props.agentId
      );
      await callAidosRemote(
        "userSetTicket",
        { ticketId: props.ticketIdKey, allowlist: paths },
        props.agentId
      );
      showToast("Allowlist saved", "success");
      props.onClose();
      props.onSaved();
    } catch (error) {
      if (error instanceof AidosRemoteError) {
        showToast(error.message, "refusal");
      } else {
        showToast(String(error), "refusal");
      }
    } finally {
      setSaving(false);
    }
  }
  return /* @__PURE__ */ import_react6.default.createElement(
    "div",
    {
      className: "aidos-modal-mask",
      onClick: () => {
        if (!saving) props.onClose();
      }
    },
    /* @__PURE__ */ import_react6.default.createElement(
      "div",
      {
        className: "aidos-modal",
        onClick: (event) => {
          event.stopPropagation();
        }
      },
      /* @__PURE__ */ import_react6.default.createElement("div", { className: "aidos-modal-head" }, /* @__PURE__ */ import_react6.default.createElement("h3", { className: "aidos-modal-title" }, "File allowlist"), /* @__PURE__ */ import_react6.default.createElement(
        "button",
        {
          className: "aidos-close-btn",
          onClick: () => {
            if (!saving) props.onClose();
          },
          "aria-label": "Close"
        },
        "\xD7"
      )),
      /* @__PURE__ */ import_react6.default.createElement("div", { className: "aidos-modal-form" }, /* @__PURE__ */ import_react6.default.createElement("div", { className: "aidos-modal-row" }, /* @__PURE__ */ import_react6.default.createElement("label", null, "One path per line. A write outside this list refuses while the ticket is in progress."), /* @__PURE__ */ import_react6.default.createElement(
        "textarea",
        {
          className: "aidos-allowlist-input",
          value: text,
          disabled: saving,
          rows: 8,
          onChange: (event) => {
            setText(event.target.value);
          }
        }
      )), others.length > 0 ? /* @__PURE__ */ import_react6.default.createElement("div", { className: "aidos-modal-row aidos-allowlist-preview" }, /* @__PURE__ */ import_react6.default.createElement("label", null, "Also allowed by other in-progress tickets"), /* @__PURE__ */ import_react6.default.createElement("ul", null, others.map((path) => /* @__PURE__ */ import_react6.default.createElement("li", { key: path }, path)))) : null, /* @__PURE__ */ import_react6.default.createElement(
        "button",
        {
          className: "aidos-btn aidos-btn-primary",
          disabled: saving,
          onClick: () => {
            void save();
          }
        },
        saving ? "Saving\u2026" : "Save"
      ))
    )
  );
}

// src/client/evidence-viewer.tsx
var import_react9 = __toESM(require("react"), 1);

// src/client/ui.tsx
var import_react7 = __toESM(require("react"), 1);
function FieldRow(props) {
  return /* @__PURE__ */ import_react7.default.createElement("div", { className: "aidos-field-row" }, /* @__PURE__ */ import_react7.default.createElement("span", { className: "aidos-field-row-label" }, props.label), /* @__PURE__ */ import_react7.default.createElement("span", { className: "aidos-field-row-value" }, props.children));
}
function Collapse(props) {
  const [open, setOpen] = import_react7.default.useState(props.defaultOpen === true);
  return /* @__PURE__ */ import_react7.default.createElement(
    "details",
    {
      className: "aidos-collapse",
      open,
      onToggle: (event) => {
        setOpen(event.currentTarget.open);
      }
    },
    /* @__PURE__ */ import_react7.default.createElement("summary", null, props.summary),
    /* @__PURE__ */ import_react7.default.createElement("div", { className: "aidos-collapse-body" }, props.children)
  );
}
function ModalShell(props) {
  const working = props.working === true;
  import_react7.default.useEffect(function() {
    const onKey = (event) => {
      if (event.key === "Escape" && !working) {
        props.onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return function() {
      window.removeEventListener("keydown", onKey);
    };
  }, [props, working]);
  return /* @__PURE__ */ import_react7.default.createElement(
    "div",
    {
      className: "aidos-modal-mask",
      onClick: () => {
        if (!working) props.onClose();
      }
    },
    /* @__PURE__ */ import_react7.default.createElement(
      "div",
      {
        className: "aidos-modal" + (props.wide === true ? " aidos-modal-wide" : ""),
        onClick: (event) => {
          event.stopPropagation();
        }
      },
      /* @__PURE__ */ import_react7.default.createElement("div", { className: "aidos-modal-head" }, /* @__PURE__ */ import_react7.default.createElement("h3", { className: "aidos-modal-title" }, props.title), /* @__PURE__ */ import_react7.default.createElement(
        "button",
        {
          className: "aidos-close-btn",
          onClick: props.onClose,
          disabled: working,
          "aria-label": "Close"
        },
        "\xD7"
      )),
      /* @__PURE__ */ import_react7.default.createElement("div", { className: "aidos-modal-form" }, props.children, props.onConfirm !== void 0 ? /* @__PURE__ */ import_react7.default.createElement("div", { className: "aidos-form-actions" }, /* @__PURE__ */ import_react7.default.createElement("button", { className: "aidos-btn", onClick: props.onClose, disabled: working }, "Cancel"), /* @__PURE__ */ import_react7.default.createElement(
        "button",
        {
          className: "aidos-btn aidos-btn-primary",
          onClick: props.onConfirm,
          disabled: working
        },
        working ? "Working\u2026" : props.confirmLabel ?? "Confirm"
      )) : null)
    )
  );
}
function NoteField(props) {
  return /* @__PURE__ */ import_react7.default.createElement("div", { className: "aidos-modal-row" }, /* @__PURE__ */ import_react7.default.createElement("label", null, props.label), /* @__PURE__ */ import_react7.default.createElement(
    "textarea",
    {
      className: "aidos-evidence-attach-note",
      value: props.value,
      disabled: props.working,
      placeholder: props.placeholder,
      onChange: (event) => {
        props.onChange(event.target.value);
      }
    }
  ));
}
function LinesField(props) {
  return /* @__PURE__ */ import_react7.default.createElement("div", { className: "aidos-modal-row" }, /* @__PURE__ */ import_react7.default.createElement("label", null, props.label), /* @__PURE__ */ import_react7.default.createElement(
    "textarea",
    {
      className: "aidos-evidence-attach-note aidos-allowlist-input",
      value: props.value,
      disabled: props.working,
      placeholder: props.placeholder,
      onChange: (event) => {
        props.onChange(event.target.value);
      }
    }
  ));
}
function linesOf(text) {
  return text.split("\n").map((line) => line.trim()).filter((line) => line !== "");
}

// src/client/evidence-payload-view.tsx
var import_react8 = __toESM(require("react"), 1);
function NoteText(props) {
  return /* @__PURE__ */ import_react8.default.createElement("span", { className: "aidos-evidence-note-text" }, props.text);
}
function RawJsonDisclosure(props) {
  const [open, setOpen] = import_react8.default.useState(false);
  return /* @__PURE__ */ import_react8.default.createElement(
    "details",
    {
      className: "aidos-evidence-raw-json",
      open,
      onToggle: (event) => {
        setOpen(event.currentTarget.open);
      }
    },
    /* @__PURE__ */ import_react8.default.createElement("summary", null, "raw payload"),
    /* @__PURE__ */ import_react8.default.createElement("pre", { className: "aidos-evidence-payload-json" }, JSON.stringify(props.payload, null, 2))
  );
}
function isImage(path) {
  return /\.(png|jpe?g|webp|gif|avif)$/i.test(path);
}
function EvidencePayloadView(props) {
  const { kind } = props.row;
  const payload = props.row.payload ?? {};
  const note = typeof payload.note === "string" ? payload.note : null;
  const rest = { ...payload };
  delete rest.note;
  if (kind === "builtin:file_allowlist" && Array.isArray(payload.paths)) {
    return /* @__PURE__ */ import_react8.default.createElement("div", { className: "aidos-evidence-fields" }, /* @__PURE__ */ import_react8.default.createElement(FieldRow, { label: "Paths" }, /* @__PURE__ */ import_react8.default.createElement("ul", { className: "aidos-evidence-payload-list" }, payload.paths.map((path) => /* @__PURE__ */ import_react8.default.createElement("li", { key: path }, path)))), note !== null ? /* @__PURE__ */ import_react8.default.createElement(FieldRow, { label: "Note" }, /* @__PURE__ */ import_react8.default.createElement(NoteText, { text: note })) : null, /* @__PURE__ */ import_react8.default.createElement(RawJsonDisclosure, { payload }));
  }
  if (kind === "builtin:imported_state" && typeof payload.claimed_state === "string") {
    return /* @__PURE__ */ import_react8.default.createElement("div", { className: "aidos-evidence-fields" }, /* @__PURE__ */ import_react8.default.createElement(FieldRow, { label: "Claimed state" }, /* @__PURE__ */ import_react8.default.createElement("span", { className: "aidos-evidence-note-text" }, payload.claimed_state)), typeof payload.source === "string" ? /* @__PURE__ */ import_react8.default.createElement(FieldRow, { label: "Source" }, payload.source) : null, note !== null ? /* @__PURE__ */ import_react8.default.createElement(FieldRow, { label: "Note" }, /* @__PURE__ */ import_react8.default.createElement(NoteText, { text: note })) : null, /* @__PURE__ */ import_react8.default.createElement(RawJsonDisclosure, { payload }));
  }
  if (typeof payload.imagePath === "string") {
    return /* @__PURE__ */ import_react8.default.createElement("div", { className: "aidos-evidence-fields" }, /* @__PURE__ */ import_react8.default.createElement(FieldRow, { label: "Screenshot" }, /* @__PURE__ */ import_react8.default.createElement("img", { className: "aidos-evidence-image", src: payload.imagePath, alt: note ?? "evidence screenshot" }), /* @__PURE__ */ import_react8.default.createElement("span", { className: "aidos-evidence-image-path" }, payload.imagePath)), note !== null ? /* @__PURE__ */ import_react8.default.createElement(FieldRow, { label: "Note" }, /* @__PURE__ */ import_react8.default.createElement(NoteText, { text: note })) : null, /* @__PURE__ */ import_react8.default.createElement(RawJsonDisclosure, { payload }));
  }
  if (typeof payload.commit === "string") {
    return /* @__PURE__ */ import_react8.default.createElement("div", { className: "aidos-evidence-fields" }, /* @__PURE__ */ import_react8.default.createElement(FieldRow, { label: "Commit" }, /* @__PURE__ */ import_react8.default.createElement("code", null, String(payload.commit).slice(0, 12)), typeof payload.subject === "string" ? /* @__PURE__ */ import_react8.default.createElement(NoteText, { text: " " + payload.subject }) : null), typeof payload.author === "string" ? /* @__PURE__ */ import_react8.default.createElement(FieldRow, { label: "Committed by" }, payload.author) : null, typeof payload.branch === "string" ? /* @__PURE__ */ import_react8.default.createElement(FieldRow, { label: "Branch" }, payload.branch) : null, note !== null ? /* @__PURE__ */ import_react8.default.createElement(FieldRow, { label: "Note" }, /* @__PURE__ */ import_react8.default.createElement(NoteText, { text: note })) : null, /* @__PURE__ */ import_react8.default.createElement(RawJsonDisclosure, { payload }));
  }
  const textFields = Object.entries(rest).filter(
    (entry) => typeof entry[1] === "string" && entry[1].trim() !== ""
  );
  const otherFields = Object.entries(rest).filter((entry) => typeof entry[1] !== "string");
  return /* @__PURE__ */ import_react8.default.createElement("div", { className: "aidos-evidence-fields" }, textFields.map(([key, value]) => /* @__PURE__ */ import_react8.default.createElement(FieldRow, { key, label: key }, /* @__PURE__ */ import_react8.default.createElement(NoteText, { text: value }))), otherFields.map(([key, value]) => /* @__PURE__ */ import_react8.default.createElement(FieldRow, { key, label: key }, /* @__PURE__ */ import_react8.default.createElement("code", null, isImage(String(value)) ? String(value) : JSON.stringify(value)))), note !== null ? /* @__PURE__ */ import_react8.default.createElement(FieldRow, { label: "Note" }, /* @__PURE__ */ import_react8.default.createElement(NoteText, { text: note })) : null, /* @__PURE__ */ import_react8.default.createElement(RawJsonDisclosure, { payload }));
}

// src/client/evidence-viewer.tsx
function EvidenceViewer(props) {
  const row = props.row;
  import_react9.default.useEffect(function() {
    if (row === null) return;
    const onKey = (event) => {
      if (event.key === "Escape") {
        props.onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return function() {
      window.removeEventListener("keydown", onKey);
    };
  }, [row, props]);
  if (row === null) return null;
  return /* @__PURE__ */ import_react9.default.createElement(
    "div",
    {
      className: "aidos-modal-mask",
      onClick: props.onClose
    },
    /* @__PURE__ */ import_react9.default.createElement(
      "div",
      {
        className: "aidos-modal",
        onClick: (event) => {
          event.stopPropagation();
        }
      },
      /* @__PURE__ */ import_react9.default.createElement("div", { className: "aidos-modal-head" }, /* @__PURE__ */ import_react9.default.createElement("h3", { className: "aidos-modal-title" }, /* @__PURE__ */ import_react9.default.createElement(
        "span",
        {
          className: "aidos-chip aidos-chip-kind",
          style: { background: kindColor(row.kind) }
        },
        /* @__PURE__ */ import_react9.default.createElement("span", { className: "aidos-chip-key" }, kindKeyword(row.kind))
      ), " " + row.kind), /* @__PURE__ */ import_react9.default.createElement(
        "button",
        {
          className: "aidos-close-btn",
          onClick: props.onClose,
          "aria-label": "Close"
        },
        "\xD7"
      )),
      /* @__PURE__ */ import_react9.default.createElement("div", { className: "aidos-modal-form" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "aidos-evidence-fields" }, /* @__PURE__ */ import_react9.default.createElement(FieldRow, { label: "Author" }, row.author), /* @__PURE__ */ import_react9.default.createElement(FieldRow, { label: "At" }, typeof row.at === "number" ? new Date(row.at * 1e3).toISOString() : "unknown")), /* @__PURE__ */ import_react9.default.createElement(EvidencePayloadView, { row }))
    )
  );
}

// src/client/criterion-linker.tsx
var import_react11 = __toESM(require("react"), 1);

// src/client/evidence-strip.tsx
var import_react10 = __toESM(require("react"), 1);
function evidenceExcerpt(row) {
  const payload = row.payload ?? {};
  if (typeof payload.note === "string" && payload.note.trim() !== "") {
    return payload.note.trim();
  }
  if (Array.isArray(payload.paths)) {
    const paths = payload.paths.filter((p) => typeof p === "string");
    if (paths.length > 0) return paths.length + " path(s)";
  }
  if (typeof payload.claimed_state === "string") return "claimed " + payload.claimed_state;
  if (typeof payload.commit === "string") return "commit " + payload.commit.slice(0, 12);
  if (typeof payload.imagePath === "string") return "screenshot";
  if (typeof payload.report === "string") return payload.report.slice(0, 60);
  return null;
}
function timeAgo(at2) {
  if (typeof at2 !== "number") return null;
  const seconds = Math.max(0, Math.floor(Date.now() / 1e3 - at2));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return Math.floor(seconds / 60) + "m ago";
  if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago";
  return Math.floor(seconds / 86400) + "d ago";
}
function EvidenceStrip(props) {
  const row = props.row;
  const excerpt = evidenceExcerpt(row);
  const when = timeAgo(row.at);
  return /* @__PURE__ */ import_react10.default.createElement("li", { className: "aidos-evidence-strip" }, /* @__PURE__ */ import_react10.default.createElement("div", { className: "aidos-evidence-strip-main" }, /* @__PURE__ */ import_react10.default.createElement(
    "span",
    {
      className: "aidos-chip aidos-chip-kind",
      style: { background: kindColor(row.kind) },
      title: kindDescription(row.kind),
      "data-dsh-tip": ""
    },
    /* @__PURE__ */ import_react10.default.createElement("span", { className: "aidos-chip-key" }, kindKeyword(row.kind))
  ), /* @__PURE__ */ import_react10.default.createElement("span", { className: "aidos-evidence-strip-body" }, excerpt !== null ? /* @__PURE__ */ import_react10.default.createElement("span", { className: "aidos-evidence-strip-excerpt" }, excerpt) : /* @__PURE__ */ import_react10.default.createElement("span", { className: "aidos-evidence-strip-kind-name" }, row.kind), /* @__PURE__ */ import_react10.default.createElement("span", { className: "aidos-evidence-strip-meta" }, row.author, when !== null ? " \xB7 " + when : "", props.criterionLabel !== void 0 ? " \xB7 criterion: " + props.criterionLabel : null)), /* @__PURE__ */ import_react10.default.createElement("span", { className: "aidos-evidence-strip-actions" }, props.onView !== void 0 ? /* @__PURE__ */ import_react10.default.createElement(
    "button",
    {
      className: "aidos-icon-btn",
      title: "View evidence",
      "data-dsh-tip": "",
      "aria-label": "View evidence",
      onClick: (event) => {
        event.stopPropagation();
        props.onView?.(row);
      }
    },
    /* @__PURE__ */ import_react10.default.createElement(PopOutIcon, null)
  ) : null, props.onUnlink !== void 0 ? /* @__PURE__ */ import_react10.default.createElement(
    "button",
    {
      className: "aidos-evidence-unlink",
      title: "Unlink from criterion",
      "data-dsh-tip": "",
      "aria-label": "Unlink from criterion",
      disabled: props.deleting === true,
      onClick: (event) => {
        event.stopPropagation();
        props.onUnlink?.();
      }
    },
    "\u2A02"
  ) : null, props.onDelete !== void 0 ? /* @__PURE__ */ import_react10.default.createElement(
    "button",
    {
      className: "aidos-evidence-delete",
      title: "Delete this evidence row",
      "data-dsh-tip": "",
      "aria-label": "Delete this evidence row",
      disabled: props.deleting === true,
      onClick: (event) => {
        event.stopPropagation();
        props.onDelete?.(row);
      }
    },
    "\u2715"
  ) : null)));
}

// src/client/criterion-linker.tsx
function criterionOf(row) {
  const raw = (row.payload ?? {}).criteria;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}
function rowsForCriterion(evidence, label) {
  return evidence.filter((row) => criterionOf(row) === label);
}
function unlinkedRows(evidence) {
  return evidence.filter((row) => criterionOf(row) === null);
}
function showError(error) {
  if (error instanceof AidosRemoteError) {
    showToast(error.message, "refusal");
  } else {
    showToast(String(error), "refusal");
  }
}
function CriterionLinker(props) {
  const [busyAt, setBusyAt] = import_react11.default.useState(null);
  const [draft, setDraft] = import_react11.default.useState({});
  const candidates = unlinkedRows(props.evidence);
  async function resolve(row, criterion) {
    if (busyAt !== null) return;
    setBusyAt(row.at ?? 0);
    try {
      await callAidosRemote(
        "userLinkEvidence",
        { ticketId: props.ticketIdKey, at: row.at, rowKind: row.kind, criterion },
        props.agentId
      );
      showToast(
        criterion === null ? "Evidence unlinked" : "Evidence linked to criterion",
        "success"
      );
      props.onChanged();
    } catch (error) {
      showError(error);
    } finally {
      setBusyAt(null);
    }
  }
  return /* @__PURE__ */ import_react11.default.createElement("div", { className: "aidos-criterion-blocks" }, props.criteria.map((label) => {
    const linked = rowsForCriterion(props.evidence, label);
    const options = candidates.filter((row) => !linked.includes(row));
    const value = draft[label] ?? "";
    return /* @__PURE__ */ import_react11.default.createElement("div", { className: "aidos-criterion-block", key: label }, /* @__PURE__ */ import_react11.default.createElement("div", { className: "aidos-criterion-label" }, label), linked.length > 0 ? /* @__PURE__ */ import_react11.default.createElement("ul", { className: "aidos-criterion-evidence" }, linked.map((row) => /* @__PURE__ */ import_react11.default.createElement(
      EvidenceStrip,
      {
        key: String(row.at) + ":" + row.kind,
        row,
        deleting: busyAt === row.at,
        onUnlink: props.readOnly ? void 0 : () => void resolve(row, null)
      }
    ))) : /* @__PURE__ */ import_react11.default.createElement("p", { className: "aidos-detail-note" }, "No evidence linked."), !props.readOnly && options.length > 0 ? /* @__PURE__ */ import_react11.default.createElement("div", { className: "aidos-criterion-linker" }, /* @__PURE__ */ import_react11.default.createElement(
      "select",
      {
        value,
        onChange: (event) => {
          setDraft({ ...draft, [label]: event.target.value });
        },
        "aria-label": "Evidence to link to criterion " + label
      },
      /* @__PURE__ */ import_react11.default.createElement("option", { value: "" }, "Link an evidence row\u2026"),
      options.map((row) => /* @__PURE__ */ import_react11.default.createElement("option", { key: String(row.at) + ":" + row.kind, value: String(row.at) + ":" + row.kind }, evidenceOptionLabel(row)))
    ), /* @__PURE__ */ import_react11.default.createElement(
      "button",
      {
        className: "aidos-btn",
        disabled: value === "" || busyAt !== null,
        onClick: () => {
          const row = options.find(
            (candidate) => String(candidate.at) + ":" + candidate.kind === value
          );
          if (row) void resolve(row, label);
        }
      },
      "Add"
    )) : null);
  }));
}
function evidenceOptionLabel(row) {
  const excerpt = evidenceExcerptForOption(row);
  const kind = row.kind.replace(/^builtin:/, "");
  return excerpt !== null ? kind + " \u2014 " + excerpt : kind;
}
function evidenceExcerptForOption(row) {
  const payload = row.payload ?? {};
  if (typeof payload.note === "string" && payload.note.trim() !== "") {
    const note = payload.note.trim();
    return note.length > 48 ? note.slice(0, 48) + "\u2026" : note;
  }
  if (Array.isArray(payload.paths) && payload.paths.length > 0) {
    return payload.paths.length + " path(s)";
  }
  if (typeof payload.claimed_state === "string") return payload.claimed_state;
  if (typeof payload.commit === "string") return payload.commit.slice(0, 12);
  if (typeof payload.imagePath === "string") return "screenshot";
  return null;
}

// node_modules/.pnpm/marked@18.0.11/node_modules/marked/lib/marked.esm.js
function A() {
  return { async: false, breaks: false, extensions: null, gfm: true, hooks: null, pedantic: false, renderer: null, silent: false, tokenizer: null, walkTokens: null };
}
var R = A();
function j(l3) {
  R = l3;
}
var z = { exec: () => null };
function I(l3) {
  let e = [];
  return (t) => {
    let n = Math.max(0, Math.min(3, t - 1)), s = e[n];
    return s || (s = l3(n), e[n] = s), s;
  };
}
function k(l3, e = "") {
  let t = typeof l3 == "string" ? l3 : l3.source, n = { replace: (s, r) => {
    let i = typeof r == "string" ? r : r.source;
    return i = i.replace(m.caret, "$1"), t = t.replace(s, i), n;
  }, getRegex: () => new RegExp(t, e) };
  return n;
}
var Oe = ((l3 = "") => {
  try {
    return !!new RegExp("(?<=1)(?<!1)" + l3);
  } catch {
    return false;
  }
})();
var m = { codeRemoveIndent: /^(?: {1,4}| {0,3}\t)/gm, outputLinkReplace: /\\([\[\]])/g, indentCodeCompensation: /^(\s+)(?:```)/, beginningSpace: /^\s+/, endingHash: /#$/, startingSpaceChar: /^ /, endingSpaceChar: / $/, nonSpaceChar: /[^ ]/, newLineCharGlobal: /\n/g, tabCharGlobal: /\t/g, multipleSpaceGlobal: /\s+/g, blankLine: /^[ \t]*$/, doubleBlankLine: /\n[ \t]*\n[ \t]*$/, blockquoteStart: /^ {0,3}>/, blockquoteSetextReplace: /\n {0,3}((?:=+|-+) *)(?=\n|$)/g, blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm, listReplaceNesting: /^ {1,4}(?=( {4})*[^ ])/g, listIsTask: /^\[[ xX]\] +\S/, listReplaceTask: /^\[[ xX]\] +/, listTaskCheckbox: /\[[ xX]\]/, anyLine: /\n.*\n/, hrefBrackets: /^<(.*)>$/, tableDelimiter: /[:|]/, tableAlignChars: /^\||\| *$/g, tableRowBlankLine: /\n[ \t]*$/, tableAlignRight: /^ *-+: *$/, tableAlignCenter: /^ *:-+: *$/, tableAlignLeft: /^ *:-+ *$/, startATag: /^<a /i, endATag: /^<\/a>/i, startPreScriptTag: /^<(pre|code|kbd|script)(\s|>)/i, endPreScriptTag: /^<\/(pre|code|kbd|script)(\s|>)/i, startAngleBracket: /^</, endAngleBracket: />$/, pedanticHrefTitle: /^([^'"]*[^\s])\s+(['"])(.*)\2/, unicodeAlphaNumeric: /[\p{L}\p{N}]/u, escapeTest: /[&<>"']/, escapeReplace: /[&<>"']/g, escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/, escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g, caret: /(^|[^\[])\^/g, percentDecode: /%25/g, findPipe: /\|/g, splitPipe: / \|/, slashPipe: /\\\|/g, carriageReturn: /\r\n|\r/g, spaceLine: /^ +$/gm, notSpaceStart: /^\S*/, endingNewline: /\n$/, listItemRegex: (l3) => new RegExp(`^( {0,3}${l3})((?:[	 ][^\\n]*)?(?:\\n|$))`), nextBulletRegex: I((l3) => new RegExp(`^ {0,${l3}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`)), hrRegex: I((l3) => new RegExp(`^ {0,${l3}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`)), fencesBeginRegex: I((l3) => new RegExp(`^ {0,${l3}}(?:\`\`\`|~~~)`)), headingBeginRegex: I((l3) => new RegExp(`^ {0,${l3}}#`)), htmlBeginRegex: I((l3) => new RegExp(`^ {0,${l3}}<(?:[a-z].*>|!--)`, "i")), blockquoteBeginRegex: I((l3) => new RegExp(`^ {0,${l3}}>`)) };
var Te = /^(?:[ \t]*(?:\n|$))+/;
var we = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/;
var ye = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/;
var q = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/;
var Pe = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/;
var U = / {0,3}(?:[*+-]|\d{1,9}[.)])/;
var oe = /^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/;
var ae = k(oe).replace(/bull/g, U).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}(?:\s|$)/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/\|table/g, "").getRegex();
var Se = k(oe).replace(/bull/g, U).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}(?:\s|$)/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/table/g, / {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex();
var K = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table|[ \t]+\n)[^\n]+)*)/;
var _e = /^[^\n]+/;
var W = /(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/;
var $e = k(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label", W).replace("title", /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex();
var Le = k(/^(bull)([ \t][^\n]*?)?(?:\n|$)/).replace(/bull/g, U).getRegex();
var Q = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";
var X = /<!--(?:-?>|[\s\S]*?(?:-->|$))/;
var Ee = k("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n*|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>[^\\n]*\\n*|$)|<![A-Z][\\s\\S]*?(?:>[^\\n]*\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>[^\\n]*\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))", "i").replace("comment", X).replace("tag", Q).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex();
var le = (l3) => k(K).replace("hr", q).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list", l3).replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", Q).getRegex();
var ze = le(/ {0,3}(?:[*+-]|1[.)])[ \t]+[^ \t\n]/);
var Me = le(/ {0,3}(?:[*+-]|\d{1,9}[.)])(?:[ \t]|\n|$)/);
var Ae = k(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph", Me).getRegex();
var J = { blockquote: Ae, code: we, def: $e, fences: ye, heading: Pe, hr: q, html: Ee, lheading: ae, list: Le, newline: Te, paragraph: ze, table: z, text: _e };
var se = k("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr", q).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("blockquote", " {0,3}>").replace("code", "(?: {4}| {0,3}	)[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", Q).getRegex();
var Ie = { ...J, lheading: Se, table: se, paragraph: k(K).replace("hr", q).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("table", se).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]+[^ \\t\\n]").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", Q).getRegex() };
var Ce = { ...J, html: k(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment", X).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(), def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/, heading: /^(#{1,6})(.*)(?:\n+|$)/, fences: z, lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/, paragraph: k(K).replace("hr", q).replace("heading", ` *#{1,6} *[^
]`).replace("lheading", ae).replace("|table", "").replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").replace("|tag", "").getRegex() };
var Be = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/;
var De = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/;
var ue = /^( {2,}|\\)\n(?!\s*$)/;
var qe = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/;
var _ = /[\p{P}\p{S}]/u;
var C = /[\s\p{P}\p{S}]/u;
var v = /[^\s\p{P}\p{S}]/u;
var ve = k(/^((?![*_])punctSpace)/, "u").replace(/punctSpace/g, C).getRegex();
var He = /[\p{Pi}\p{Ps}"']/u;
var pe = /(?!~)[\p{P}\p{S}]/u;
var Ze = /(?!~)[\s\p{P}\p{S}]/u;
var Ge = /(?:[^\s\p{P}\p{S}]|~)/u;
var Qe = k(/link|precode-code|html/, "g").replace("link", /\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-", Oe ? "(?<!`)()" : "(^^|[^`])").replace("code", /(?<b>`+)[^`]+\k<b>(?!`)/).replace("html", /<(?! )[^<>]*?>/).getRegex();
var ce = /^(?:\*+(?:((?!\*)punct)|([^\s*]))?)|^_+(?:((?!_)punct)|([^\s_]))?/;
var Ne = k(ce, "u").replace(/punct/g, _).getRegex();
var je = k(ce, "u").replace(/punct/g, pe).getRegex();
var Fe = /^(?:\*+(?:((?!\*)(?!openQuote)punct)|([^\s*]))?)|^_+(?:((?!_)(?!openQuote)punct)|([^\s_]))?/;
var Ue = k(Fe, "u").replace(/openQuote/g, He).replace(/punct/g, _).getRegex();
var he = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)";
var Ke = k(he, "gu").replace(/notPunctSpace/g, v).replace(/punctSpace/g, C).replace(/punct/g, _).getRegex();
var We = k(he, "gu").replace(/notPunctSpace/g, Ge).replace(/punctSpace/g, Ze).replace(/punct/g, pe).getRegex();
var Xe = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)[\\s](\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|(?:(?!\\*)punct|notPunctSpace)(\\*+)(?!\\*)(?=notPunctSpace)";
var Je = k(Xe, "gu").replace(/notPunctSpace/g, v).replace(/punctSpace/g, C).replace(/punct/g, _).getRegex();
var Ve = k("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)", "gu").replace(/notPunctSpace/g, v).replace(/punctSpace/g, C).replace(/punct/g, _).getRegex();
var Ye = "^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)[\\s](_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)|(?:(?!_)punct|notPunctSpace)(_+)(?!_)(?=notPunctSpace)";
var et = k(Ye, "gu").replace(/notPunctSpace/g, v).replace(/punctSpace/g, C).replace(/punct/g, _).getRegex();
var tt = k(/^~~?(?:((?!~)punct)|[^\s~])/, "u").replace(/punct/g, _).getRegex();
var nt = "^[^~]+(?=[^~])|(?!~)punct(~~?)(?=[\\s]|$)|notPunctSpace(~~?)(?!~)(?=punctSpace|$)|(?!~)punctSpace(~~?)(?=notPunctSpace)|[\\s](~~?)(?!~)(?=punct)|(?!~)punct(~~?)(?!~)(?=punct)|notPunctSpace(~~?)(?=notPunctSpace)";
var rt = k(nt, "gu").replace(/notPunctSpace/g, v).replace(/punctSpace/g, C).replace(/punct/g, _).getRegex();
var st = k(/\\(punct)/, "gu").replace(/punct/g, _).getRegex();
var it = k(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email", /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex();
var ot = k(X).replace("(?:-->|$)", "-->").getRegex();
var at = k("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment", ot).replace("attribute", /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex();
var G = /(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\])|[^\[\]\\`])*?/;
var lt = k(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]+(?:\n[ \t]*)?|\n[ \t]*)(title))?\s*\)/).replace("label", G).replace("href", /<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]+|(?=\))/).replace("title", /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex();
var ke = k(/^!?\[(label)\]\[(ref)\]/).replace("label", G).replace("ref", W).getRegex();
var de = k(/^!?\[(ref)\](?:\[\])?/).replace("ref", W).getRegex();
var ut = k("reflink|nolink(?!\\()", "g").replace("reflink", ke).replace("nolink", de).getRegex();
var ie = /[hH][tT][tT][pP][sS]?|[fF][tT][pP]/;
var V = { _backpedal: z, anyPunctuation: st, autolink: it, blockSkip: Qe, br: ue, code: De, del: z, delLDelim: z, delRDelim: z, emStrongLDelim: Ne, emStrongRDelimAst: Ke, emStrongRDelimUnd: Ve, escape: Be, link: lt, nolink: de, punctuation: ve, reflink: ke, reflinkSearch: ut, tag: at, text: qe, url: z };
var pt = { ...V, emStrongLDelim: Ue, emStrongRDelimAst: Je, emStrongRDelimUnd: et, link: k(/^!?\[(label)\]\((.*?)\)/).replace("label", G).getRegex(), reflink: k(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", G).getRegex() };
var F = { ...V, emStrongRDelimAst: We, emStrongLDelim: je, delLDelim: tt, delRDelim: rt, url: k(/^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("protocol", ie).replace("email", /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(), _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/, del: /^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/, text: k(/^(`+|~+|[^`~])(?:(?=[`~])|(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/).replace("protocol", ie).getRegex() };
var ct = { ...F, br: k(ue).replace("{2,}", "*").getRegex(), text: k(F.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex() };
var H = { normal: J, gfm: Ie, pedantic: Ce };
var B = { normal: V, gfm: F, breaks: ct, pedantic: pt };
var ht = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
var ge = (l3) => ht[l3];
function T(l3, e) {
  if (e) {
    if (m.escapeTest.test(l3)) return l3.replace(m.escapeReplace, ge);
  } else if (m.escapeTestNoEncode.test(l3)) return l3.replace(m.escapeReplaceNoEncode, ge);
  return l3;
}
function Y(l3) {
  try {
    l3 = encodeURI(l3).replace(m.percentDecode, "%");
  } catch {
    return null;
  }
  return l3;
}
function ee(l3, e) {
  let t = l3.replace(m.findPipe, (r, i, o) => {
    let u = false, a = i;
    for (; --a >= 0 && o[a] === "\\"; ) u = !u;
    return u ? "|" : " |";
  }), n = t.split(m.splitPipe), s = 0;
  if (n[0].trim() || n.shift(), n.length > 0 && !n.at(-1)?.trim() && n.pop(), e) if (n.length > e) n.splice(e);
  else for (; n.length < e; ) n.push("");
  for (; s < n.length; s++) n[s] = n[s].trim().replace(m.slashPipe, "|");
  return n;
}
function $(l3, e, t) {
  let n = l3.length;
  if (n === 0) return "";
  let s = 0;
  for (; s < n; ) {
    let r = l3.charAt(n - s - 1);
    if (r === e && !t) s++;
    else if (r !== e && t) s++;
    else break;
  }
  return l3.slice(0, n - s);
}
function te(l3) {
  let e = l3.split(`
`), t = e.length - 1;
  for (; t >= 0 && m.blankLine.test(e[t]); ) t--;
  return e.length - t <= 2 ? l3 : e.slice(0, t + 1).join(`
`);
}
function fe(l3, e) {
  if (l3.indexOf(e[1]) === -1) return -1;
  let t = 0;
  for (let n = 0; n < l3.length; n++) if (l3[n] === "\\") n++;
  else if (l3[n] === e[0]) t++;
  else if (l3[n] === e[1] && (t--, t < 0)) return n;
  return t > 0 ? -2 : -1;
}
function me(l3, e = 0) {
  let t = e, n = "";
  for (let s of l3) if (s === "	") {
    let r = 4 - t % 4;
    n += " ".repeat(r), t += r;
  } else n += s, t++;
  return n;
}
function xe(l3, e, t, n, s) {
  let r = e.href, i = e.title || null, o = l3[1].replace(s.other.outputLinkReplace, "$1"), u = l3[0].charAt(0) === "!";
  n.state.inLink = true;
  let a = n.state.linkEmitted, p = n.state.inRawBlock;
  n.state.linkEmitted = false;
  let c = n.inlineTokens(o), h = n.state.linkEmitted;
  if (n.state.linkEmitted = a, n.state.inLink = false, !u) {
    if (h) {
      n.state.inRawBlock = p;
      return;
    }
    n.state.linkEmitted = true;
  }
  return { type: u ? "image" : "link", raw: t, href: r, title: i, text: o, tokens: c };
}
function kt(l3, e, t) {
  let n = l3.match(t.other.indentCodeCompensation);
  if (n === null) return e;
  let s = n[1];
  return e.split(`
`).map((r) => {
    let i = r.match(t.other.beginningSpace);
    if (i === null) return r;
    let [o] = i;
    return o.length >= s.length ? r.slice(s.length) : r;
  }).join(`
`);
}
var y = class {
  options;
  rules;
  lexer;
  constructor(e) {
    this.options = e || R;
  }
  space(e) {
    let t = this.rules.block.newline.exec(e);
    if (t && t[0].length > 0) return { type: "space", raw: t[0] };
  }
  code(e) {
    let t = this.rules.block.code.exec(e);
    if (t) {
      let n = this.options.pedantic ? t[0] : te(t[0]), s = n.replace(this.rules.other.codeRemoveIndent, "");
      return { type: "code", raw: n, codeBlockStyle: "indented", text: s };
    }
  }
  fences(e) {
    let t = this.rules.block.fences.exec(e);
    if (t) {
      let n = t[0], s = kt(n, t[3] || "", this.rules);
      return { type: "code", raw: n, lang: t[2] ? t[2].trim().replace(this.rules.inline.anyPunctuation, "$1") : t[2], text: s };
    }
  }
  heading(e) {
    let t = this.rules.block.heading.exec(e);
    if (t) {
      let n = t[2].trim();
      if (this.rules.other.endingHash.test(n)) {
        let s = $(n, "#");
        (this.options.pedantic || !s || this.rules.other.endingSpaceChar.test(s)) && (n = s.trim());
      }
      return { type: "heading", raw: $(t[0], `
`), depth: t[1].length, text: n, tokens: this.lexer.inline(n) };
    }
  }
  hr(e) {
    let t = this.rules.block.hr.exec(e);
    if (t) return { type: "hr", raw: $(t[0], `
`) };
  }
  blockquote(e) {
    let t = this.rules.block.blockquote.exec(e);
    if (t) {
      let n = $(t[0], `
`).split(`
`), s = "", r = "", i = [];
      for (; n.length > 0; ) {
        let o = false, u = [], a;
        for (a = 0; a < n.length; a++) if (this.rules.other.blockquoteStart.test(n[a])) u.push(n[a]), o = true;
        else if (!o) u.push(n[a]);
        else break;
        n = n.slice(a);
        let p = u.join(`
`), c = p.replace(this.rules.other.blockquoteSetextReplace, `
    $1`).replace(this.rules.other.blockquoteSetextReplace2, "");
        s = s ? `${s}
${p}` : p, r = r ? `${r}
${c}` : c;
        let h = this.lexer.state.top;
        if (this.lexer.state.top = true, this.lexer.blockTokens(c, i, true), this.lexer.state.top = h, n.length === 0) break;
        let d = i.at(-1);
        if (d?.type === "code") break;
        if (d?.type === "blockquote") {
          let O = d, g = n.join(`
`), w = O.raw + `
` + g.replace(this.rules.other.blockquoteSetextReplace2, ""), E = this.blockquote(w);
          i[i.length - 1] = E, s = `${s}
${g}`, r = r.substring(0, r.length - O.text.length) + E.text;
          break;
        } else if (d?.type === "list") {
          let O = d, g = O.raw + `
` + n.join(`
`), w = this.list(g);
          i[i.length - 1] = w, s = s.substring(0, s.length - d.raw.length) + w.raw, r = r.substring(0, r.length - O.raw.length) + w.raw, n = g.substring(i.at(-1).raw.length).split(`
`);
          continue;
        }
      }
      return { type: "blockquote", raw: s, tokens: i, text: r };
    }
  }
  list(e) {
    let t = this.rules.block.list.exec(e);
    if (t) {
      let n = t[1].trim(), s = n.length > 1, r = { type: "list", raw: "", ordered: s, start: s ? +n.slice(0, -1) : "", loose: false, items: [] };
      n = s ? `\\d{1,9}\\${n.slice(-1)}` : `\\${n}`, this.options.pedantic && (n = s ? n : "[*+-]");
      let i = this.rules.other.listItemRegex(n), o = false;
      for (; e; ) {
        let a = false, p = "", c = "";
        if (!(t = i.exec(e)) || this.rules.block.hr.test(e)) break;
        p = t[0], e = e.substring(p.length);
        let h = me(t[2].split(`
`, 1)[0], t[1].length), d = e.split(`
`, 1)[0], O = !h.trim(), g = 0;
        if (this.options.pedantic ? (g = 2, c = h.trimStart()) : O ? g = t[1].length + 1 : (g = h.search(this.rules.other.nonSpaceChar), g = g > 4 ? 1 : g, c = h.slice(g), g += t[1].length), O && this.rules.other.blankLine.test(d) && (p += d + `
`, e = e.substring(d.length + 1), a = true), !a) {
          let w = this.rules.other.nextBulletRegex(g), E = this.rules.other.hrRegex(g), ne = this.rules.other.fencesBeginRegex(g), re = this.rules.other.headingBeginRegex(g), be = this.rules.other.htmlBeginRegex(g), Re = this.rules.other.blockquoteBeginRegex(g);
          for (; e; ) {
            let N = e.split(`
`, 1)[0], D;
            if (d = N, this.options.pedantic ? (d = d.replace(this.rules.other.listReplaceNesting, "  "), D = d) : D = d.replace(this.rules.other.tabCharGlobal, "    "), ne.test(d) || re.test(d) || be.test(d) || Re.test(d) || w.test(d) || E.test(d)) break;
            if (D.search(this.rules.other.nonSpaceChar) >= g || !d.trim()) c += `
` + D.slice(g);
            else {
              if (O || h.replace(this.rules.other.tabCharGlobal, "    ").search(this.rules.other.nonSpaceChar) >= 4 || ne.test(h) || re.test(h) || E.test(h)) break;
              c += `
` + d;
            }
            O = !d.trim(), p += N + `
`, e = e.substring(N.length + 1), h = D.slice(g);
          }
        }
        r.loose || (o ? r.loose = true : this.rules.other.doubleBlankLine.test(p) && (o = true)), r.items.push({ type: "list_item", raw: p, task: !!this.options.gfm && this.rules.other.listIsTask.test(c), loose: false, text: c, tokens: [] }), r.raw += p;
      }
      let u = r.items.at(-1);
      if (u) u.raw = u.raw.trimEnd(), u.text = u.text.trimEnd();
      else return;
      r.raw = r.raw.trimEnd();
      for (let a of r.items) if (this.lexer.state.top = false, a.tokens = this.lexer.blockTokens(a.text, []), !r.loose) {
        let p = a.tokens.filter((h) => h.type === "space"), c = p.length > 0 && p.some((h) => this.rules.other.anyLine.test(h.raw));
        r.loose = c;
      }
      for (let a of r.items) {
        let p = a.tokens[0];
        if (a.task && (p?.type === "text" || p?.type === "paragraph")) {
          a.text = a.text.replace(this.rules.other.listReplaceTask, ""), p.raw = p.raw.replace(this.rules.other.listReplaceTask, ""), p.text = p.text.replace(this.rules.other.listReplaceTask, "");
          for (let h = this.lexer.inlineQueue.length - 1; h >= 0; h--) if (this.rules.other.listIsTask.test(this.lexer.inlineQueue[h].src)) {
            this.lexer.inlineQueue[h].src = this.lexer.inlineQueue[h].src.replace(this.rules.other.listReplaceTask, "");
            break;
          }
          let c = this.rules.other.listTaskCheckbox.exec(a.raw);
          if (c) {
            let h = { type: "checkbox", raw: c[0] + " ", checked: c[0] !== "[ ]" };
            a.checked = h.checked, r.loose ? a.tokens[0] && ["paragraph", "text"].includes(a.tokens[0].type) && "tokens" in a.tokens[0] && a.tokens[0].tokens ? (a.tokens[0].raw = h.raw + a.tokens[0].raw, a.tokens[0].text = h.raw + a.tokens[0].text, a.tokens[0].tokens.unshift(h)) : a.tokens.unshift({ type: "paragraph", raw: h.raw, text: h.raw, tokens: [h] }) : a.tokens.unshift(h);
          }
        } else a.task && (a.task = false);
      }
      if (r.loose) for (let a of r.items) {
        a.loose = true;
        for (let p of a.tokens) p.type === "text" && (p.type = "paragraph");
      }
      return r;
    }
  }
  html(e) {
    let t = this.rules.block.html.exec(e);
    if (t) {
      let n = te(t[0]);
      return { type: "html", block: true, raw: n, pre: t[1] === "pre" || t[1] === "script" || t[1] === "style", text: n };
    }
  }
  def(e) {
    let t = this.rules.block.def.exec(e);
    if (t) {
      let n = t[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal, " "), s = t[2] ? t[2].replace(this.rules.other.hrefBrackets, "$1").replace(this.rules.inline.anyPunctuation, "$1") : "", r = t[3] ? t[3].substring(1, t[3].length - 1).replace(this.rules.inline.anyPunctuation, "$1") : t[3];
      return { type: "def", tag: n, raw: $(t[0], `
`), href: s, title: r };
    }
  }
  table(e) {
    let t = this.rules.block.table.exec(e);
    if (!t || !this.rules.other.tableDelimiter.test(t[2])) return;
    let n = ee(t[1]), s = t[2].replace(this.rules.other.tableAlignChars, "").split("|"), r = t[3]?.trim() ? t[3].replace(this.rules.other.tableRowBlankLine, "").split(`
`) : [], i = { type: "table", raw: $(t[0], `
`), header: [], align: [], rows: [] };
    if (n.length === s.length) {
      for (let o of s) this.rules.other.tableAlignRight.test(o) ? i.align.push("right") : this.rules.other.tableAlignCenter.test(o) ? i.align.push("center") : this.rules.other.tableAlignLeft.test(o) ? i.align.push("left") : i.align.push(null);
      for (let o = 0; o < n.length; o++) i.header.push({ text: n[o], tokens: this.lexer.inline(n[o]), header: true, align: i.align[o] });
      for (let o of r) i.rows.push(ee(o, i.header.length).map((u, a) => ({ text: u, tokens: this.lexer.inline(u), header: false, align: i.align[a] })));
      return i;
    }
  }
  lheading(e) {
    let t = this.rules.block.lheading.exec(e);
    if (t) {
      let n = t[1].trim();
      return { type: "heading", raw: $(t[0], `
`), depth: t[2].charAt(0) === "=" ? 1 : 2, text: n, tokens: this.lexer.inline(n) };
    }
  }
  paragraph(e) {
    let t = this.rules.block.paragraph.exec(e);
    if (t) {
      let n = t[1].charAt(t[1].length - 1) === `
` ? t[1].slice(0, -1) : t[1];
      return { type: "paragraph", raw: t[0], text: n, tokens: this.lexer.inline(n) };
    }
  }
  text(e) {
    let t = this.rules.block.text.exec(e);
    if (t) return { type: "text", raw: t[0], text: t[0], tokens: this.lexer.inline(t[0]) };
  }
  escape(e) {
    let t = this.rules.inline.escape.exec(e);
    if (t) return { type: "escape", raw: t[0], text: t[1] };
  }
  tag(e) {
    let t = this.rules.inline.tag.exec(e);
    if (t) return !this.lexer.state.inLink && this.rules.other.startATag.test(t[0]) ? this.lexer.state.inLink = true : this.lexer.state.inLink && this.rules.other.endATag.test(t[0]) && (this.lexer.state.inLink = false), !this.lexer.state.inRawBlock && this.rules.other.startPreScriptTag.test(t[0]) ? this.lexer.state.inRawBlock = true : this.lexer.state.inRawBlock && this.rules.other.endPreScriptTag.test(t[0]) && (this.lexer.state.inRawBlock = false), { type: "html", raw: t[0], inLink: this.lexer.state.inLink, inRawBlock: this.lexer.state.inRawBlock, block: false, text: t[0] };
  }
  link(e) {
    let t = this.rules.inline.link.exec(e);
    if (t) {
      let n = t[2].trim();
      if (!this.options.pedantic && this.rules.other.startAngleBracket.test(n)) {
        if (!this.rules.other.endAngleBracket.test(n)) return;
        let i = $(n.slice(0, -1), "\\");
        if ((n.length - i.length) % 2 === 0) return;
      } else {
        let i = fe(t[2], "()");
        if (i === -2) return;
        if (i > -1) {
          let u = (t[0].indexOf("!") === 0 ? 5 : 4) + t[1].length + i;
          t[2] = t[2].substring(0, i), t[0] = t[0].substring(0, u).trim(), t[3] = "";
        }
      }
      let s = t[2], r = "";
      if (this.options.pedantic) {
        let i = this.rules.other.pedanticHrefTitle.exec(s);
        i && (s = i[1], r = i[3]);
      } else r = t[3] ? t[3].slice(1, -1) : "";
      return s = s.trim(), this.rules.other.startAngleBracket.test(s) && (this.options.pedantic && !this.rules.other.endAngleBracket.test(n) ? s = s.slice(1) : s = s.slice(1, -1)), xe(t, { href: s && s.replace(this.rules.inline.anyPunctuation, "$1"), title: r && r.replace(this.rules.inline.anyPunctuation, "$1") }, t[0], this.lexer, this.rules);
    }
  }
  reflink(e, t) {
    let n;
    if ((n = this.rules.inline.reflink.exec(e)) || (n = this.rules.inline.nolink.exec(e))) {
      let s = (n[2] || n[1]).replace(this.rules.other.multipleSpaceGlobal, " "), r = t[s.toLowerCase()];
      if (!r) {
        let i = n[0].charAt(0);
        return { type: "text", raw: i, text: i };
      }
      return xe(n, r, n[0], this.lexer, this.rules);
    }
  }
  emStrong(e, t, n = "") {
    let s = this.rules.inline.emStrongLDelim.exec(e);
    if (!s || !s[1] && !s[2] && !s[3] && !s[4] || s[4] && n.match(this.rules.other.unicodeAlphaNumeric)) return;
    if (!(s[1] || s[3] || "") || !n || this.rules.inline.punctuation.exec(n)) {
      let i = [...s[0]].length - 1, o, u, a = i, p = 0, c = s[0][0], h = n === c, d = c === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
      for (d.lastIndex = 0, t = t.slice(-1 * e.length + i); (s = d.exec(t)) !== null; ) {
        if (o = s[1] || s[2] || s[3] || s[4] || s[5] || s[6], !o) continue;
        if (u = [...o].length, s[3] || s[4]) {
          a += u;
          continue;
        } else if (s[5] || s[6]) {
          if (i % 3 && !((i + u) % 3)) {
            p += u;
            continue;
          }
          if (h) break;
        }
        if (a -= u, a > 0) continue;
        u = Math.min(u, u + a + p);
        let O = [...s[0]][0].length, g = e.slice(0, i + s.index + O + u);
        if (Math.min(i, u) % 2) {
          let E = g.slice(1, -1);
          return { type: "em", raw: g, text: E, tokens: this.lexer.inlineTokens(E) };
        }
        let w = g.slice(2, -2);
        return { type: "strong", raw: g, text: w, tokens: this.lexer.inlineTokens(w) };
      }
    }
  }
  codespan(e) {
    let t = this.rules.inline.code.exec(e);
    if (t) {
      let n = t[2].replace(this.rules.other.newLineCharGlobal, " "), s = this.rules.other.nonSpaceChar.test(n), r = this.rules.other.startingSpaceChar.test(n) && this.rules.other.endingSpaceChar.test(n);
      return s && r && (n = n.substring(1, n.length - 1)), { type: "codespan", raw: t[0], text: n };
    }
  }
  br(e) {
    let t = this.rules.inline.br.exec(e);
    if (t) return { type: "br", raw: t[0] };
  }
  del(e, t, n = "") {
    let s = this.rules.inline.delLDelim.exec(e);
    if (!s) return;
    if (!(s[1] || "") || !n || this.rules.inline.punctuation.exec(n)) {
      let i = [...s[0]].length - 1, o, u, a = i, p = this.rules.inline.delRDelim;
      for (p.lastIndex = 0, t = t.slice(-1 * e.length + i); (s = p.exec(t)) !== null; ) {
        if (o = s[1] || s[2] || s[3] || s[4] || s[5] || s[6], !o || (u = [...o].length, u !== i)) continue;
        if (s[3] || s[4]) {
          a += u;
          continue;
        }
        if (a -= u, a > 0) continue;
        u = Math.min(u, u + a);
        let c = [...s[0]][0].length, h = e.slice(0, i + s.index + c + u), d = h.slice(i, -i);
        return { type: "del", raw: h, text: d, tokens: this.lexer.inlineTokens(d) };
      }
    }
  }
  autolink(e) {
    let t = this.rules.inline.autolink.exec(e);
    if (t) {
      let n, s;
      return t[2] === "@" ? (n = t[1], s = "mailto:" + n) : (n = t[1], s = n), { type: "link", raw: t[0], text: n, href: s, tokens: [{ type: "text", raw: n, text: n }] };
    }
  }
  url(e) {
    let t;
    if (t = this.rules.inline.url.exec(e)) {
      let n, s;
      if (t[2] === "@") n = t[0], s = "mailto:" + n;
      else {
        let r;
        do
          r = t[0], t[0] = this.rules.inline._backpedal.exec(t[0])?.[0] ?? "";
        while (r !== t[0]);
        n = t[0], t[1] === "www." ? s = "http://" + t[0] : s = t[0];
      }
      return { type: "link", raw: t[0], text: n, href: s, tokens: [{ type: "text", raw: n, text: n }] };
    }
  }
  inlineText(e) {
    let t = this.rules.inline.text.exec(e);
    if (t) {
      let n = this.lexer.state.inRawBlock;
      return { type: "text", raw: t[0], text: t[0], escaped: n };
    }
  }
};
var x = class l {
  tokens;
  options;
  state;
  inlineQueue;
  tokenizer;
  constructor(e) {
    this.tokens = [], this.tokens.links = /* @__PURE__ */ Object.create(null), this.options = e || R, this.options.tokenizer = this.options.tokenizer || new y(), this.tokenizer = this.options.tokenizer, this.tokenizer.options = this.options, this.tokenizer.lexer = this, this.inlineQueue = [], this.state = { inLink: false, inRawBlock: false, linkEmitted: false, top: true };
    let t = { other: m, block: H.normal, inline: B.normal };
    this.options.pedantic ? (t.block = H.pedantic, t.inline = B.pedantic) : this.options.gfm && (t.block = H.gfm, this.options.breaks ? t.inline = B.breaks : t.inline = B.gfm), this.tokenizer.rules = t;
  }
  static get rules() {
    return { block: H, inline: B };
  }
  static lex(e, t) {
    return new l(t).lex(e);
  }
  static lexInline(e, t) {
    return new l(t).inlineTokens(e);
  }
  lex(e) {
    e = e.replace(m.carriageReturn, `
`), this.blockTokens(e, this.tokens);
    for (let t = 0; t < this.inlineQueue.length; t++) {
      let n = this.inlineQueue[t];
      this.inlineTokens(n.src, n.tokens);
    }
    return this.inlineQueue = [], this.tokens;
  }
  blockTokens(e, t = [], n = false) {
    this.tokenizer.lexer = this, this.options.pedantic && (e = e.replace(m.tabCharGlobal, "    ").replace(m.spaceLine, ""));
    let s = 1 / 0;
    for (; e; ) {
      if (e.length < s) s = e.length;
      else {
        this.infiniteLoopError(e.charCodeAt(0));
        break;
      }
      let r;
      if (this.options.extensions?.block?.some((o) => (r = o.call({ lexer: this }, e, t)) ? (e = e.substring(r.raw.length), t.push(r), true) : false)) continue;
      if (r = this.tokenizer.space(e)) {
        e = e.substring(r.raw.length);
        let o = t.at(-1);
        r.raw.length === 1 && o !== void 0 ? o.raw += `
` : t.push(r);
        continue;
      }
      if (r = this.tokenizer.code(e)) {
        e = e.substring(r.raw.length);
        let o = t.at(-1);
        o?.type === "paragraph" || o?.type === "text" ? (o.raw += (o.raw.endsWith(`
`) ? "" : `
`) + r.raw, o.text += `
` + r.text, this.inlineQueue.at(-1).src = o.text) : t.push(r);
        continue;
      }
      if (r = this.tokenizer.fences(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.heading(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.hr(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.blockquote(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.list(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.html(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.def(e)) {
        e = e.substring(r.raw.length);
        let o = t.at(-1);
        o?.type === "paragraph" || o?.type === "text" ? (o.raw += (o.raw.endsWith(`
`) ? "" : `
`) + r.raw, o.text += `
` + r.raw, this.inlineQueue.at(-1).src = o.text) : this.tokens.links[r.tag] || (this.tokens.links[r.tag] = { href: r.href, title: r.title }, t.push(r));
        continue;
      }
      if (r = this.tokenizer.table(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.lheading(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      let i = e;
      if (this.options.extensions?.startBlock) {
        let o = 1 / 0, u = e.slice(1), a;
        this.options.extensions.startBlock.forEach((p) => {
          a = p.call({ lexer: this }, u), typeof a == "number" && a >= 0 && (o = Math.min(o, a));
        }), o < 1 / 0 && o >= 0 && (i = e.substring(0, o + 1));
      }
      if (this.state.top && (r = this.tokenizer.paragraph(i))) {
        let o = t.at(-1);
        n && o?.type === "paragraph" ? (o.raw += (o.raw.endsWith(`
`) ? "" : `
`) + r.raw, o.text += `
` + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = o.text) : t.push(r), n = i.length !== e.length, e = e.substring(r.raw.length);
        continue;
      }
      if (r = this.tokenizer.text(e)) {
        e = e.substring(r.raw.length);
        let o = t.at(-1);
        o?.type === "text" ? (o.raw += (o.raw.endsWith(`
`) ? "" : `
`) + r.raw, o.text += `
` + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = o.text) : t.push(r);
        continue;
      }
      if (e) {
        this.infiniteLoopError(e.charCodeAt(0));
        break;
      }
    }
    return this.state.top = true, t;
  }
  inline(e, t = []) {
    return this.inlineQueue.push({ src: e, tokens: t }), t;
  }
  linkInText(e) {
    if (!e.includes("[")) return false;
    let t = this.tokenizer.rules.inline.link;
    for (let n of e.matchAll(this.tokenizer.rules.inline.blockSkip)) if (t.test(n[0]) && e.charAt(n.index - 1) !== "!") return true;
    for (let n of e.matchAll(this.tokenizer.rules.inline.reflinkSearch)) {
      let s = n[0], r = s.lastIndexOf("[");
      if (!(s.charAt(0) === "!" || !Object.hasOwn(this.tokens.links, s.slice(r + 1, -1))) && !(r > 1 && this.linkInText(s.slice(1, r - 1)))) return true;
    }
    return false;
  }
  inlineTokens(e, t = []) {
    this.tokenizer.lexer = this;
    let n = e;
    if (this.tokens.links && e.includes("[")) {
      let o = this.tokenizer.rules.inline.reflinkSearch, u = (a) => {
        let p = a.lastIndexOf("[");
        if (!Object.hasOwn(this.tokens.links, a.slice(p + 1, -1))) return a;
        if (p > 1 && a.charAt(0) !== "!") {
          let c = a.slice(1, p - 1);
          if (this.linkInText(c)) return "[" + c.replace(o, u) + "][" + "a".repeat(a.length - p - 2) + "]";
        }
        return "[" + "a".repeat(a.length - 2) + "]";
      };
      n = n.replace(o, u);
    }
    n = n.replace(this.tokenizer.rules.inline.anyPunctuation, (o) => "+".repeat(o.length)), n = n.replace(this.tokenizer.rules.inline.blockSkip, (o, u, a) => {
      let p = a ? a.length : 0;
      return o.slice(0, p) + "[" + "a".repeat(o.length - p - 2) + "]";
    }), n = this.options.hooks?.emStrongMask?.call({ lexer: this }, n) ?? n;
    let s = false, r = "", i = 1 / 0;
    for (; e; ) {
      if (e.length < i) i = e.length;
      else {
        this.infiniteLoopError(e.charCodeAt(0));
        break;
      }
      s || (r = ""), s = false;
      let o;
      if (this.options.extensions?.inline?.some((a) => (o = a.call({ lexer: this }, e, t)) ? (e = e.substring(o.raw.length), t.push(o), true) : false)) continue;
      if (o = this.tokenizer.escape(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.tag(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.link(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.reflink(e, this.tokens.links)) {
        e = e.substring(o.raw.length);
        let a = t.at(-1);
        o.type === "text" && a?.type === "text" ? (a.raw += o.raw, a.text += o.text) : t.push(o);
        continue;
      }
      if (o = this.tokenizer.emStrong(e, n, r)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.codespan(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.br(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.del(e, n, r)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.autolink(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (!this.state.inLink && (o = this.tokenizer.url(e))) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      let u = e;
      if (this.options.extensions?.startInline) {
        let a = 1 / 0, p = e.slice(1), c;
        this.options.extensions.startInline.forEach((h) => {
          c = h.call({ lexer: this }, p), typeof c == "number" && c >= 0 && (a = Math.min(a, c));
        }), a < 1 / 0 && a >= 0 && (u = e.substring(0, a + 1));
      }
      if (o = this.tokenizer.inlineText(u)) {
        e = e.substring(o.raw.length), o.raw.slice(-1) !== "_" && (r = o.raw.slice(-1)), s = true;
        let a = t.at(-1);
        a?.type === "text" ? (a.raw += o.raw, a.text += o.text) : t.push(o);
        continue;
      }
      if (e) {
        this.infiniteLoopError(e.charCodeAt(0));
        break;
      }
    }
    return t;
  }
  infiniteLoopError(e) {
    let t = "Infinite loop on byte: " + e;
    if (this.options.silent) console.error(t);
    else throw new Error(t);
  }
};
var P = class {
  options;
  parser;
  constructor(e) {
    this.options = e || R;
  }
  space(e) {
    return "";
  }
  code({ text: e, lang: t, escaped: n }) {
    let s = (t || "").match(m.notSpaceStart)?.[0], r = e.replace(m.endingNewline, "") + `
`;
    return s ? '<pre><code class="language-' + T(s) + '">' + (n ? r : T(r, true)) + `</code></pre>
` : "<pre><code>" + (n ? r : T(r, true)) + `</code></pre>
`;
  }
  blockquote({ tokens: e }) {
    return `<blockquote>
${this.parser.parse(e)}</blockquote>
`;
  }
  html({ text: e }) {
    return e;
  }
  def(e) {
    return "";
  }
  heading({ tokens: e, depth: t }) {
    return `<h${t}>${this.parser.parseInline(e)}</h${t}>
`;
  }
  hr(e) {
    return `<hr>
`;
  }
  list(e) {
    let t = e.ordered, n = e.start, s = "";
    for (let o = 0; o < e.items.length; o++) {
      let u = e.items[o];
      s += this.listitem(u);
    }
    let r = t ? "ol" : "ul", i = t && n !== 1 ? ' start="' + n + '"' : "";
    return "<" + r + i + `>
` + s + "</" + r + `>
`;
  }
  listitem(e) {
    return `<li>${this.parser.parse(e.tokens)}</li>
`;
  }
  checkbox({ checked: e }) {
    return "<input " + (e ? 'checked="" ' : "") + 'disabled="" type="checkbox"> ';
  }
  paragraph({ tokens: e }) {
    return `<p>${this.parser.parseInline(e)}</p>
`;
  }
  table(e) {
    let t = "", n = "";
    for (let r = 0; r < e.header.length; r++) n += this.tablecell(e.header[r]);
    t += this.tablerow({ text: n });
    let s = "";
    for (let r = 0; r < e.rows.length; r++) {
      let i = e.rows[r];
      n = "";
      for (let o = 0; o < i.length; o++) n += this.tablecell(i[o]);
      s += this.tablerow({ text: n });
    }
    return s && (s = `<tbody>${s}</tbody>`), `<table>
<thead>
` + t + `</thead>
` + s + `</table>
`;
  }
  tablerow({ text: e }) {
    return `<tr>
${e}</tr>
`;
  }
  tablecell(e) {
    let t = this.parser.parseInline(e.tokens), n = e.header ? "th" : "td";
    return (e.align ? `<${n} align="${e.align}">` : `<${n}>`) + t + `</${n}>
`;
  }
  strong({ tokens: e }) {
    return `<strong>${this.parser.parseInline(e)}</strong>`;
  }
  em({ tokens: e }) {
    return `<em>${this.parser.parseInline(e)}</em>`;
  }
  codespan({ text: e }) {
    return `<code>${T(e, true)}</code>`;
  }
  br(e) {
    return "<br>";
  }
  del({ tokens: e }) {
    return `<del>${this.parser.parseInline(e)}</del>`;
  }
  link({ href: e, title: t, tokens: n }) {
    let s = this.parser.parseInline(n), r = Y(e);
    if (r === null) return s;
    e = r;
    let i = '<a href="' + e + '"';
    return t && (i += ' title="' + T(t) + '"'), i += ">" + s + "</a>", i;
  }
  image({ href: e, title: t, text: n, tokens: s }) {
    s && (n = this.parser.parseInline(s, this.parser.textRenderer));
    let r = Y(e);
    if (r === null) return T(n);
    e = r;
    let i = `<img src="${e}" alt="${T(n)}"`;
    return t && (i += ` title="${T(t)}"`), i += ">", i;
  }
  text(e) {
    return "tokens" in e && e.tokens ? this.parser.parseInline(e.tokens) : "escaped" in e && e.escaped ? e.text : T(e.text);
  }
};
var L = class {
  strong({ text: e }) {
    return e;
  }
  em({ text: e }) {
    return e;
  }
  codespan({ text: e }) {
    return e;
  }
  del({ text: e }) {
    return e;
  }
  html({ text: e }) {
    return e;
  }
  text({ text: e }) {
    return e;
  }
  link({ text: e }) {
    return "" + e;
  }
  image({ text: e }) {
    return "" + e;
  }
  br() {
    return "";
  }
  checkbox({ raw: e }) {
    return e;
  }
};
var b = class l2 {
  options;
  renderer;
  textRenderer;
  constructor(e) {
    this.options = e || R, this.options.renderer = this.options.renderer || new P(), this.renderer = this.options.renderer, this.renderer.options = this.options, this.renderer.parser = this, this.textRenderer = new L();
  }
  static parse(e, t) {
    return new l2(t).parse(e);
  }
  static parseInline(e, t) {
    return new l2(t).parseInline(e);
  }
  parse(e) {
    this.renderer.parser = this;
    let t = "";
    for (let n = 0; n < e.length; n++) {
      let s = e[n];
      if (this.options.extensions?.renderers?.[s.type]) {
        let i = s, o = this.options.extensions.renderers[i.type].call({ parser: this }, i);
        if (o !== false || !["space", "hr", "heading", "code", "table", "blockquote", "list", "checkbox", "html", "def", "paragraph", "text"].includes(i.type)) {
          t += o || "";
          continue;
        }
      }
      let r = s;
      switch (r.type) {
        case "space": {
          t += this.renderer.space(r);
          break;
        }
        case "hr": {
          t += this.renderer.hr(r);
          break;
        }
        case "heading": {
          t += this.renderer.heading(r);
          break;
        }
        case "code": {
          t += this.renderer.code(r);
          break;
        }
        case "table": {
          t += this.renderer.table(r);
          break;
        }
        case "blockquote": {
          t += this.renderer.blockquote(r);
          break;
        }
        case "list": {
          t += this.renderer.list(r);
          break;
        }
        case "checkbox": {
          t += this.renderer.checkbox(r);
          break;
        }
        case "html": {
          t += this.renderer.html(r);
          break;
        }
        case "def": {
          t += this.renderer.def(r);
          break;
        }
        case "paragraph": {
          t += this.renderer.paragraph(r);
          break;
        }
        case "text": {
          t += this.renderer.text(r);
          break;
        }
        default: {
          let i = 'Token with "' + r.type + '" type was not found.';
          if (this.options.silent) return console.error(i), "";
          throw new Error(i);
        }
      }
    }
    return t;
  }
  parseInline(e, t = this.renderer) {
    this.renderer.parser = this;
    let n = "";
    for (let s = 0; s < e.length; s++) {
      let r = e[s];
      if (this.options.extensions?.renderers?.[r.type]) {
        let o = this.options.extensions.renderers[r.type].call({ parser: this }, r);
        if (o !== false || !["escape", "html", "link", "image", "checkbox", "strong", "em", "codespan", "br", "del", "text"].includes(r.type)) {
          n += o || "";
          continue;
        }
      }
      let i = r;
      switch (i.type) {
        case "escape": {
          n += t.text(i);
          break;
        }
        case "html": {
          n += t.html(i);
          break;
        }
        case "link": {
          n += t.link(i);
          break;
        }
        case "image": {
          n += t.image(i);
          break;
        }
        case "checkbox": {
          n += t.checkbox(i);
          break;
        }
        case "strong": {
          n += t.strong(i);
          break;
        }
        case "em": {
          n += t.em(i);
          break;
        }
        case "codespan": {
          n += t.codespan(i);
          break;
        }
        case "br": {
          n += t.br(i);
          break;
        }
        case "del": {
          n += t.del(i);
          break;
        }
        case "text": {
          n += t.text(i);
          break;
        }
        default: {
          let o = 'Token with "' + i.type + '" type was not found.';
          if (this.options.silent) return console.error(o), "";
          throw new Error(o);
        }
      }
    }
    return n;
  }
};
var S = class {
  options;
  block;
  constructor(e) {
    this.options = e || R;
  }
  static passThroughHooks = /* @__PURE__ */ new Set(["preprocess", "postprocess", "processAllTokens", "emStrongMask"]);
  static passThroughHooksRespectAsync = /* @__PURE__ */ new Set(["preprocess", "postprocess", "processAllTokens"]);
  preprocess(e) {
    return e;
  }
  postprocess(e) {
    return e;
  }
  processAllTokens(e) {
    return e;
  }
  emStrongMask(e) {
    return e;
  }
  provideLexer(e = this.block) {
    return e ? x.lex : x.lexInline;
  }
  provideParser(e = this.block) {
    return e ? b.parse : b.parseInline;
  }
};
var Z = class {
  defaults = A();
  options = this.setOptions;
  parse = this.parseMarkdown(true);
  parseInline = this.parseMarkdown(false);
  Parser = b;
  Renderer = P;
  TextRenderer = L;
  Lexer = x;
  Tokenizer = y;
  Hooks = S;
  constructor(...e) {
    this.use(...e);
  }
  walkTokens(e, t) {
    let n = [];
    for (let s of e) switch (n = n.concat(t.call(this, s)), s.type) {
      case "table": {
        let r = s;
        for (let i of r.header) n = n.concat(this.walkTokens(i.tokens, t));
        for (let i of r.rows) for (let o of i) n = n.concat(this.walkTokens(o.tokens, t));
        break;
      }
      case "list": {
        let r = s;
        n = n.concat(this.walkTokens(r.items, t));
        break;
      }
      default: {
        let r = s;
        this.defaults.extensions?.childTokens?.[r.type] ? this.defaults.extensions.childTokens[r.type].forEach((i) => {
          let o = r[i].flat(1 / 0);
          n = n.concat(this.walkTokens(o, t));
        }) : r.tokens && (n = n.concat(this.walkTokens(r.tokens, t)));
      }
    }
    return n;
  }
  use(...e) {
    let t = this.defaults.extensions || { renderers: {}, childTokens: {} };
    return e.forEach((n) => {
      let s = { ...n };
      if (s.async = this.defaults.async || s.async || false, n.extensions && (n.extensions.forEach((r) => {
        if (!r.name) throw new Error("extension name required");
        if ("renderer" in r) {
          let i = t.renderers[r.name];
          i ? t.renderers[r.name] = function(...o) {
            let u = r.renderer.apply(this, o);
            return u === false && (u = i.apply(this, o)), u;
          } : t.renderers[r.name] = r.renderer;
        }
        if ("tokenizer" in r) {
          if (!r.level || r.level !== "block" && r.level !== "inline") throw new Error("extension level must be 'block' or 'inline'");
          let i = t[r.level];
          i ? i.unshift(r.tokenizer) : t[r.level] = [r.tokenizer], r.start && (r.level === "block" ? t.startBlock ? t.startBlock.push(r.start) : t.startBlock = [r.start] : r.level === "inline" && (t.startInline ? t.startInline.push(r.start) : t.startInline = [r.start]));
        }
        "childTokens" in r && r.childTokens && (t.childTokens[r.name] = r.childTokens);
      }), s.extensions = t), n.renderer) {
        let r = this.defaults.renderer || new P(this.defaults);
        for (let i in n.renderer) {
          if (!(i in r)) throw new Error(`renderer '${i}' does not exist`);
          if (["options", "parser"].includes(i)) continue;
          let o = i, u = n.renderer[o], a = r[o];
          r[o] = (...p) => {
            let c = u.apply(r, p);
            return c === false && (c = a.apply(r, p)), c || "";
          };
        }
        s.renderer = r;
      }
      if (n.tokenizer) {
        let r = this.defaults.tokenizer || new y(this.defaults);
        for (let i in n.tokenizer) {
          if (!(i in r)) throw new Error(`tokenizer '${i}' does not exist`);
          if (["options", "rules", "lexer"].includes(i)) continue;
          let o = i, u = n.tokenizer[o], a = r[o];
          r[o] = (...p) => {
            let c = u.apply(r, p);
            return c === false && (c = a.apply(r, p)), c;
          };
        }
        s.tokenizer = r;
      }
      if (n.hooks) {
        let r = this.defaults.hooks || new S();
        for (let i in n.hooks) {
          if (!(i in r)) throw new Error(`hook '${i}' does not exist`);
          if (["options", "block"].includes(i)) continue;
          let o = i, u = n.hooks[o], a = r[o];
          S.passThroughHooks.has(i) ? r[o] = (p) => {
            if (this.defaults.async && S.passThroughHooksRespectAsync.has(i)) return (async () => {
              let h = await u.call(r, p);
              return a.call(r, h);
            })();
            let c = u.call(r, p);
            return a.call(r, c);
          } : r[o] = (...p) => {
            if (this.defaults.async) return (async () => {
              let h = await u.apply(r, p);
              return h === false && (h = await a.apply(r, p)), h;
            })();
            let c = u.apply(r, p);
            return c === false && (c = a.apply(r, p)), c;
          };
        }
        s.hooks = r;
      }
      if (n.walkTokens) {
        let r = this.defaults.walkTokens, i = n.walkTokens;
        s.walkTokens = function(o) {
          let u = [];
          return u.push(i.call(this, o)), r && (u = u.concat(r.call(this, o))), u;
        };
      }
      this.defaults = { ...this.defaults, ...s };
    }), this;
  }
  setOptions(e) {
    return this.defaults = { ...this.defaults, ...e }, this;
  }
  lexer(e, t) {
    return x.lex(e, t ?? this.defaults);
  }
  parser(e, t) {
    return b.parse(e, t ?? this.defaults);
  }
  parseMarkdown(e) {
    return (n, s) => {
      let r = { ...s }, i = { ...this.defaults, ...r }, o = this.onError(!!i.silent, !!i.async);
      if (this.defaults.async === true && r.async === false) return o(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));
      if (typeof n > "u" || n === null) return o(new Error("marked(): input parameter is undefined or null"));
      if (typeof n != "string") return o(new Error("marked(): input parameter is of type " + Object.prototype.toString.call(n) + ", string expected"));
      if (i.hooks && (i.hooks.options = i, i.hooks.block = e), i.async) return (async () => {
        let u = i.hooks ? await i.hooks.preprocess(n) : n, p = await (i.hooks ? await i.hooks.provideLexer(e) : e ? x.lex : x.lexInline)(u, i), c = i.hooks ? await i.hooks.processAllTokens(p) : p;
        i.walkTokens && await Promise.all(this.walkTokens(c, i.walkTokens));
        let d = await (i.hooks ? await i.hooks.provideParser(e) : e ? b.parse : b.parseInline)(c, i);
        return i.hooks ? await i.hooks.postprocess(d) : d;
      })().catch(o);
      try {
        i.hooks && (n = i.hooks.preprocess(n));
        let a = (i.hooks ? i.hooks.provideLexer(e) : e ? x.lex : x.lexInline)(n, i);
        i.hooks && (a = i.hooks.processAllTokens(a)), i.walkTokens && this.walkTokens(a, i.walkTokens);
        let c = (i.hooks ? i.hooks.provideParser(e) : e ? b.parse : b.parseInline)(a, i);
        return i.hooks && (c = i.hooks.postprocess(c)), c;
      } catch (u) {
        return o(u);
      }
    };
  }
  onError(e, t) {
    return (n) => {
      if (n.message += `
Please report this to https://github.com/markedjs/marked.`, e) {
        let s = "<p>An error occurred:</p><pre>" + T(n.message + "", true) + "</pre>";
        return t ? Promise.resolve(s) : s;
      }
      if (t) return Promise.reject(n);
      throw n;
    };
  }
};
var M = new Z();
function f(l3, e) {
  return M.parse(l3, e);
}
f.options = f.setOptions = function(l3) {
  return M.setOptions(l3), f.defaults = M.defaults, j(f.defaults), f;
};
f.getDefaults = A;
f.defaults = R;
function dt(...l3) {
  return M.use(...l3), f.defaults = M.defaults, j(f.defaults), f;
}
f.use = dt;
f.walkTokens = function(l3, e) {
  return M.walkTokens(l3, e);
};
f.parseInline = M.parseInline;
f.Parser = b;
f.parser = b.parse;
f.Renderer = P;
f.TextRenderer = L;
f.Lexer = x;
f.lexer = x.lex;
f.Tokenizer = y;
f.Hooks = S;
f.parse = f;
var nn = f.options;
var rn = f.setOptions;
var sn = f.walkTokens;
var on = f.parseInline;
var ln = b.parse;
var un = x.lex;

// src/client/field-editor.tsx
var import_react12 = __toESM(require("react"), 1);
var TEXTAREA_FIELDS = ["description", "criteria"];
function FieldEditor(props) {
  const [editing, setEditing] = import_react12.default.useState(false);
  const [draft, setDraft] = import_react12.default.useState(String(props.value));
  const [saving, setSaving] = import_react12.default.useState(false);
  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const field = props.field;
      const raw = draft;
      if ((field === "phase" || field === "order") && !/^\d+$/.test(raw.trim())) {
        showToast("phase and order must be integers \u2265 0", "refusal");
        setSaving(false);
        return;
      }
      const value = field === "phase" || field === "order" ? Number(raw) : raw;
      await callAidosRemote("userSetTicket", { ticketId: props.ticketId, [field]: value }, props.agentId);
      showToast("Field saved", "success");
      setEditing(false);
      props.onSaved();
    } catch (error) {
      if (error instanceof AidosRemoteError) {
        showToast(error.message, "refusal");
      } else {
        showToast(String(error), "refusal");
      }
      setDraft(String(props.value));
    } finally {
      setSaving(false);
    }
  }
  function beginEdit() {
    setDraft(String(props.value));
    setEditing(true);
  }
  function cancel() {
    setDraft(String(props.value));
    setEditing(false);
  }
  if (editing) {
    const isTextarea = TEXTAREA_FIELDS.includes(props.field);
    return /* @__PURE__ */ import_react12.default.createElement("div", { className: "aidos-field-editor" }, isTextarea ? /* @__PURE__ */ import_react12.default.createElement(
      "textarea",
      {
        className: "aidos-field-editor-input",
        value: draft,
        disabled: saving,
        onChange: (event) => {
          setDraft(event.target.value);
        }
      }
    ) : /* @__PURE__ */ import_react12.default.createElement(
      "input",
      {
        className: "aidos-field-editor-input",
        type: "text",
        value: draft,
        disabled: saving,
        onChange: (event) => {
          setDraft(event.target.value);
        }
      }
    ), /* @__PURE__ */ import_react12.default.createElement("span", null, /* @__PURE__ */ import_react12.default.createElement("button", { className: "aidos-btn", disabled: saving, onClick: save }, "Save"), " ", /* @__PURE__ */ import_react12.default.createElement("button", { className: "aidos-btn", disabled: saving, onClick: cancel }, "Cancel")));
  }
  return /* @__PURE__ */ import_react12.default.createElement("div", { className: "aidos-field-editor" }, /* @__PURE__ */ import_react12.default.createElement("span", null, props.children !== void 0 ? props.children : String(props.value), " ", /* @__PURE__ */ import_react12.default.createElement(
    "button",
    {
      className: "aidos-icon-btn",
      title: "Edit",
      "data-dsh-tip": "",
      "aria-label": "Edit " + props.field,
      onClick: beginEdit
    },
    /* @__PURE__ */ import_react12.default.createElement(PencilIcon, null)
  )));
}

// src/client/action-bar.tsx
var import_react13 = __toESM(require("react"), 1);

// src/client/action-visibility.ts
function signoffReason(ticket) {
  if (ticket.state !== "open") {
    return "the ticket is already signed off";
  }
  return void 0;
}
function submitReason(ticket, kinds) {
  if (ticket.state !== "in_progress") {
    return "the ticket must be in progress";
  }
  const present = new Set(kinds);
  if (!present.has("builtin:review_pass")) {
    const missing = ["review_pass (a reviewer subagent or the human reviews first)"];
    if (!present.has("builtin:automated_check")) missing.unshift("automated_check");
    return "requires " + missing.join(", ");
  }
  return void 0;
}
function sendBackReason(ticket) {
  if (ticket.state !== "awaiting_verification") {
    return "the ticket must be awaiting verification";
  }
  return void 0;
}
function verifyReason(ticket) {
  if (ticket.state !== "awaiting_verification") {
    return "the ticket must be awaiting verification";
  }
  return void 0;
}
function markDoneReason(ticket, kinds) {
  if (ticket.state !== "awaiting_verification") {
    return "the ticket must be awaiting verification";
  }
  if (!kinds.includes("builtin:user_verified")) {
    return "requires user_verified (attach your verification row first)";
  }
  return void 0;
}
function allowlistReason(ticket) {
  if (ticket.state !== "in_progress") {
    return "the ticket must be in progress";
  }
  return void 0;
}
function actionsFor(ticket, evidenceKinds = []) {
  return [
    { id: "signoff", label: "Sign off", primary: true, unavailableReason: signoffReason(ticket) },
    { id: "verify", label: "Verify", unavailableReason: verifyReason(ticket) },
    { id: "submit-for-review", label: "Submit for review", unavailableReason: submitReason(ticket, evidenceKinds) },
    { id: "send-back", label: "Send back", unavailableReason: sendBackReason(ticket) },
    { id: "mark-done", label: "Mark done", primary: true, unavailableReason: markDoneReason(ticket, evidenceKinds) },
    { id: "allowlist", label: "Allowlist", unavailableReason: allowlistReason(ticket) }
  ];
}

// src/client/action-bar.tsx
var OPENERS = {
  signoff: "onOpenSignoff",
  verify: "onOpenVerify",
  "submit-for-review": "onOpenSubmitForReview",
  "send-back": "onOpenSendBack",
  "mark-done": "onOpenMarkDone",
  allowlist: "onOpenAllowlist"
};
function ActionBar(props) {
  const kinds = props.evidence.map((row) => row.kind);
  const actions = actionsFor(props.ticket, kinds);
  import_react13.default.useEffect(function() {
    logDebug("action bar mounted");
  }, []);
  const buttons = actions.map((action) => {
    const opener = props[OPENERS[action.id]];
    const disabled = action.unavailableReason !== void 0;
    const className = (action.primary ? "aidos-btn aidos-btn-primary" : "aidos-btn") + (disabled ? " aidos-btn-disabled" : "");
    return /* @__PURE__ */ import_react13.default.createElement(
      "button",
      {
        className,
        key: action.id,
        disabled,
        title: action.unavailableReason ?? action.label,
        "data-dsh-tip": "",
        onClick: () => {
          if (!disabled) opener();
        }
      },
      action.label
    );
  });
  return /* @__PURE__ */ import_react13.default.createElement("div", { className: "aidos-action-bar" }, buttons);
}

// src/client/comments-section.tsx
var import_react14 = __toESM(require("react"), 1);
var EMPTY_COMMENTS = [];
function CommentsSection(props) {
  const comments = props.comments ?? EMPTY_COMMENTS;
  const [draft, setDraft] = import_react14.default.useState("");
  const [sending, setSending] = import_react14.default.useState(false);
  import_react14.default.useEffect(function() {
    logDebug("comments section mounted");
  }, []);
  const newestFirst = [...comments].sort((a, b2) => b2.at - a.at);
  async function send() {
    if (sending) return;
    if (draft.trim() === "") return;
    setSending(true);
    try {
      await callAidosRemote(
        "userAddComment",
        { ticketId: props.ticketId, text: draft },
        props.agentId
      );
      setDraft("");
      showToast("Comment added", "success");
    } catch (error) {
      if (error instanceof AidosRemoteError) {
        showToast(error.message, "refusal");
      } else {
        showToast(String(error), "refusal");
      }
    } finally {
      setSending(false);
    }
  }
  const rows = newestFirst.map((comment, index) => {
    const time = new Date(comment.at * 1e3).toLocaleString();
    return /* @__PURE__ */ import_react14.default.createElement("div", { className: "aidos-comment", key: index }, /* @__PURE__ */ import_react14.default.createElement("div", null, /* @__PURE__ */ import_react14.default.createElement("span", { className: "aidos-evidence-author" }, comment.author)), /* @__PURE__ */ import_react14.default.createElement("p", { className: "aidos-detail-body" }, comment.text), /* @__PURE__ */ import_react14.default.createElement("p", { className: "aidos-detail-note" }, time));
  });
  return /* @__PURE__ */ import_react14.default.createElement("details", { className: "aidos-panel", open: comments.length !== 1 }, /* @__PURE__ */ import_react14.default.createElement("summary", { className: "aidos-panel-head" }, /* @__PURE__ */ import_react14.default.createElement("h4", { className: "aidos-panel-title" }, "Comments")), /* @__PURE__ */ import_react14.default.createElement("div", { className: "aidos-panel-body" }, rows.length === 0 ? /* @__PURE__ */ import_react14.default.createElement("p", { className: "aidos-detail-note" }, "No comments yet.") : rows, /* @__PURE__ */ import_react14.default.createElement(
    "textarea",
    {
      className: "aidos-comment-textarea",
      value: draft,
      placeholder: "Add a comment. Ctrl+Enter sends.",
      onChange: (event) => {
        setDraft(event.target.value);
      },
      onKeyDown: (event) => {
        if (event.ctrlKey && event.key === "Enter") {
          event.preventDefault();
          void send();
        }
      }
    }
  ), /* @__PURE__ */ import_react14.default.createElement("div", { className: "aidos-form-actions" }, /* @__PURE__ */ import_react14.default.createElement(
    "button",
    {
      className: "aidos-comment-send",
      disabled: sending || draft.trim() === "",
      onClick: send
    },
    "Send"
  ))));
}

// src/client/evidence-attach.tsx
var import_react15 = __toESM(require("react"), 1);

// src/client/user-evidence-kinds.ts
var HUMAN_ONLY_IDS = ["builtin:user_signoff", "builtin:user_verified", "builtin:file_allowlist"];
var SYSTEM_ONLY_ID = "builtin:imported_state";
var RETIRED_IDS = /* @__PURE__ */ new Set(["builtin:comment"]);
function userEvidenceKinds() {
  const humanOnly = [];
  const rest = [];
  for (const kind of BUILTIN_KINDS) {
    if (!kind.allowedAuthors.includes("user")) continue;
    if (kind.id === SYSTEM_ONLY_ID || RETIRED_IDS.has(kind.id)) continue;
    const descriptor = {
      id: kind.id,
      label: kind.label,
      description: kind.description
    };
    if (HUMAN_ONLY_IDS.includes(kind.id)) {
      humanOnly.push(descriptor);
    } else {
      rest.push(descriptor);
    }
  }
  rest.sort((a, b2) => {
    if (a.id < b2.id) return -1;
    if (a.id > b2.id) return 1;
    return 0;
  });
  return humanOnly.concat(rest);
}

// src/client/parse-payload-text.ts
function parsePayloadText(text) {
  if (text.trim() === "") {
    return { ok: true, payload: {} };
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return {
      ok: false,
      error: "Payload is not valid JSON: " + (error instanceof Error ? error.message : String(error))
    };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: "Payload must be a JSON object" };
  }
  return { ok: true, payload: parsed };
}

// src/client/evidence-attach.tsx
function AttachModal(props) {
  return /* @__PURE__ */ import_react15.default.createElement(
    ModalShell,
    {
      title: props.title,
      working: props.working,
      onClose: props.onClose,
      onConfirm: props.onAttach,
      confirmLabel: "Attach"
    },
    props.children
  );
}
function NoteField2(props) {
  return /* @__PURE__ */ import_react15.default.createElement(
    NoteField,
    {
      label: props.label ?? "Note (optional)",
      value: props.note,
      working: props.working,
      onChange: props.onChange
    }
  );
}
function parseLinesText(text) {
  const lines = text.split("\n").map((line) => line.trim()).filter((line) => line !== "");
  if (lines.length === 0) {
    return { ok: false, error: "Add at least one line." };
  }
  return { ok: true, lines };
}
function ImagePasteZone(props) {
  return /* @__PURE__ */ import_react15.default.createElement(import_react15.default.Fragment, null, /* @__PURE__ */ import_react15.default.createElement(
    "div",
    {
      className: "aidos-evidence-paste-zone",
      onPaste: (event) => {
        const file = Array.from(event.clipboardData.files)[0];
        if (file) props.onFile(file);
      },
      onDragOver: (event) => {
        event.preventDefault();
      },
      onDrop: (event) => {
        event.preventDefault();
        const file = Array.from(event.dataTransfer.files)[0];
        if (file) props.onFile(file);
      },
      tabIndex: 0
    },
    props.uploading ? "Uploading\u2026" : props.imagePath !== null ? "Screenshot stored \u2014 paste again to replace." : "Paste or drop a screenshot here (optional)"
  ), props.pasteError !== null ? /* @__PURE__ */ import_react15.default.createElement("p", { className: "aidos-evidence-paste-error" }, props.pasteError) : null);
}
async function uploadImagePaste(agentId, file, name2) {
  const headers = {
    "content-type": file.type || "application/octet-stream",
    "x-file-name": name2,
    // The route requires the session: the agentId IS the session id.
    "x-session-id": agentId
  };
  const root = await callAidosRemote("workspaceRoot", {}, agentId).catch(() => void 0);
  const workspaceDir = root !== void 0 && typeof root === "object" && !Array.isArray(root) && typeof root.workspace === "string" ? root.workspace : null;
  if (workspaceDir !== null) {
    headers["x-workspace"] = workspaceDir;
  }
  const res = await fetch("/paste-to-path", { method: "POST", headers, body: file });
  if (!res.ok) {
    const body = await res.json().catch(() => void 0);
    throw new Error(body?.error ?? `paste upload failed (${res.status})`);
  }
  const attachment = await res.json();
  return attachment.path;
}
function VerifyModal(props) {
  const [note, setNote] = import_react15.default.useState("");
  const [imagePath, setImagePath] = import_react15.default.useState(null);
  const [uploading, setUploading] = import_react15.default.useState(false);
  const [working, setWorking] = import_react15.default.useState(false);
  const [pasteError, setPasteError] = import_react15.default.useState(null);
  async function handleFile(file) {
    setPasteError(null);
    setUploading(true);
    try {
      const path = await uploadImagePaste(props.agentId, file, file.name || "pasted-image.png");
      setImagePath(path);
      showToast("Screenshot stored", "success");
    } catch (error) {
      setPasteError(error instanceof Error ? error.message : String(error));
    } finally {
      setUploading(false);
    }
  }
  async function attach() {
    if (working) return;
    setWorking(true);
    try {
      const payload = {};
      if (note.trim() !== "") payload.note = note.trim();
      if (imagePath !== null) payload.imagePath = imagePath;
      await callAidosRemote(
        "userAttachEvidence",
        { ticketId: props.ticketId, kind: "builtin:user_verified", payload },
        props.agentId
      );
      showToast("Verified", "success");
      props.onClose();
    } catch (error) {
      showToast(error instanceof AidosRemoteError ? error.message : String(error), "refusal");
    } finally {
      setWorking(false);
    }
  }
  return /* @__PURE__ */ import_react15.default.createElement(AttachModal, { title: "Verify", working: working || uploading, onAttach: () => void attach(), onClose: props.onClose }, /* @__PURE__ */ import_react15.default.createElement("p", { className: "aidos-modal-body" }, "You verified this ticket hands-on. Paste (Ctrl+V) or drop a screenshot to attach it."), /* @__PURE__ */ import_react15.default.createElement(ImagePasteZone, { imagePath, uploading, pasteError, onFile: handleFile }), /* @__PURE__ */ import_react15.default.createElement(NoteField2, { note, working, onChange: setNote }));
}
function CommitPickerForm(props) {
  const [commits, setCommits] = import_react15.default.useState([]);
  const [loadError, setLoadError] = import_react15.default.useState(null);
  const [picked, setPicked] = import_react15.default.useState("");
  const [attaching, setAttaching] = import_react15.default.useState(false);
  import_react15.default.useEffect(function() {
    let alive = true;
    callAidosRemote("userRecentCommits", { ticketId: props.ticketId }, props.agentId).then((out) => {
      if (!alive) return;
      const rows = out?.commits;
      setCommits(Array.isArray(rows) ? rows : []);
    }).catch((error) => {
      if (!alive) return;
      setLoadError(error instanceof AidosRemoteError ? error.message : String(error));
    });
    return () => {
      alive = false;
    };
  }, [props.ticketId, props.agentId]);
  async function attach() {
    if (attaching || picked === "") return;
    setAttaching(true);
    try {
      await callAidosRemote(
        "userAttachCommitEvidence",
        { ticketId: props.ticketId, hash: picked, ...props.note.trim() === "" ? {} : { note: props.note.trim() } },
        props.agentId
      );
      showToast("Commit evidence attached", "success");
      setPicked("");
      props.setNote("");
      props.onAttached?.();
    } catch (error) {
      showToast(error instanceof AidosRemoteError ? error.message : String(error), "refusal");
    } finally {
      setAttaching(false);
    }
  }
  return /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-evidence-tailored" }, /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-modal-row" }, /* @__PURE__ */ import_react15.default.createElement("label", null, "Recent commits"), loadError !== null ? /* @__PURE__ */ import_react15.default.createElement("p", { className: "aidos-evidence-paste-error" }, loadError) : /* @__PURE__ */ import_react15.default.createElement(
    "select",
    {
      className: "aidos-evidence-attach-kind-select",
      value: picked,
      disabled: attaching,
      onChange: (event) => {
        setPicked(event.target.value);
      }
    },
    /* @__PURE__ */ import_react15.default.createElement("option", { value: "" }, commits.length === 0 ? "Loading commits\u2026" : "Pick a commit\u2026"),
    commits.map((commit) => /* @__PURE__ */ import_react15.default.createElement("option", { value: commit.hash, key: commit.hash }, commit.hash + " " + commit.subject + " \u2014 " + commit.author))
  )), /* @__PURE__ */ import_react15.default.createElement(NoteField2, { note: props.note, working: props.working || attaching, onChange: props.setNote, label: "Note (optional)" }), /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-form-actions" }, /* @__PURE__ */ import_react15.default.createElement(
    "button",
    {
      className: "aidos-btn aidos-btn-primary",
      disabled: props.working || attaching || picked === "",
      onClick: () => void attach()
    },
    attaching ? "Working\u2026" : "Attach commit"
  )));
}
function EvalCriteriaForm(props) {
  const [criteriaText, setCriteriaText] = import_react15.default.useState("");
  const [note, setNote] = import_react15.default.useState("");
  const [working, setWorking] = import_react15.default.useState(false);
  const parsed = parseLinesText(criteriaText);
  async function attach() {
    if (working || !parsed.ok) return;
    setWorking(true);
    try {
      const payload = { lines: parsed.lines };
      if (note.trim() !== "") payload.note = note.trim();
      await callAidosRemote(
        "userAttachEvidence",
        { ticketId: props.ticketId, kind: "builtin:eval_criteria", payload },
        props.agentId
      );
      showToast("Evaluation criteria attached", "success");
      setCriteriaText("");
      setNote("");
      props.onAttached?.();
    } catch (error) {
      showToast(error instanceof AidosRemoteError ? error.message : String(error), "refusal");
    } finally {
      setWorking(false);
    }
  }
  return /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-evidence-tailored" }, /* @__PURE__ */ import_react15.default.createElement(
    LinesField,
    {
      label: "Evaluation criteria (one per line)",
      value: criteriaText,
      working,
      placeholder: "Criterion 1\nCriterion 2",
      onChange: setCriteriaText
    }
  ), /* @__PURE__ */ import_react15.default.createElement(NoteField2, { note, working, onChange: setNote }), /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-form-actions" }, /* @__PURE__ */ import_react15.default.createElement(
    "button",
    {
      className: "aidos-btn aidos-btn-primary",
      disabled: working || !parsed.ok,
      title: parsed.ok ? void 0 : parsed.error,
      "data-dsh-tip": "",
      onClick: () => void attach()
    },
    working ? "Working\u2026" : "Attach"
  )));
}
function AgentReportForm(props) {
  const [reportText, setReportText] = import_react15.default.useState("");
  const [note, setNote] = import_react15.default.useState("");
  const [working, setWorking] = import_react15.default.useState(false);
  async function attach() {
    if (working || reportText.trim() === "") return;
    setWorking(true);
    try {
      const payload = { report: reportText.trim() };
      if (note.trim() !== "") payload.note = note.trim();
      await callAidosRemote(
        "userAttachEvidence",
        { ticketId: props.ticketId, kind: "builtin:agent_report", payload },
        props.agentId
      );
      showToast("Agent report attached", "success");
      setReportText("");
      setNote("");
      props.onAttached?.();
    } catch (error) {
      showToast(error instanceof AidosRemoteError ? error.message : String(error), "refusal");
    } finally {
      setWorking(false);
    }
  }
  return /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-evidence-tailored" }, /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-modal-row" }, /* @__PURE__ */ import_react15.default.createElement("label", null, "Report"), /* @__PURE__ */ import_react15.default.createElement(
    "textarea",
    {
      className: "aidos-evidence-attach-note aidos-evidence-attach-tall",
      value: reportText,
      disabled: working,
      placeholder: "Describe the work performed\u2026",
      onChange: (event) => {
        setReportText(event.target.value);
      }
    }
  )), /* @__PURE__ */ import_react15.default.createElement(NoteField2, { note, working, onChange: setNote }), /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-form-actions" }, /* @__PURE__ */ import_react15.default.createElement(
    "button",
    {
      className: "aidos-btn aidos-btn-primary",
      disabled: working || reportText.trim() === "",
      onClick: () => void attach()
    },
    working ? "Working\u2026" : "Attach"
  )));
}
function CheckResultForm(props) {
  const [command, setCommand] = import_react15.default.useState("");
  const [result, setResult] = import_react15.default.useState("");
  const [note, setNote] = import_react15.default.useState("");
  const [working, setWorking] = import_react15.default.useState(false);
  async function attach() {
    if (working || command.trim() === "" || result === "") return;
    setWorking(true);
    try {
      const payload = {
        command: command.trim(),
        result
      };
      if (note.trim() !== "") payload.note = note.trim();
      await callAidosRemote(
        "userAttachEvidence",
        { ticketId: props.ticketId, kind: props.kind, payload },
        props.agentId
      );
      showToast(`${props.kind === "builtin:automated_check" ? "Automated check" : "Test run"} attached`, "success");
      setCommand("");
      setResult("");
      setNote("");
      props.onAttached?.();
    } catch (error) {
      showToast(error instanceof AidosRemoteError ? error.message : String(error), "refusal");
    } finally {
      setWorking(false);
    }
  }
  return /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-evidence-tailored" }, /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-modal-row" }, /* @__PURE__ */ import_react15.default.createElement("label", null, "Command"), /* @__PURE__ */ import_react15.default.createElement(
    "input",
    {
      type: "text",
      className: "aidos-command-input",
      value: command,
      disabled: working,
      placeholder: "npm run test",
      onChange: (event) => {
        setCommand(event.target.value);
      }
    }
  )), /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-modal-row" }, /* @__PURE__ */ import_react15.default.createElement("label", null, "Result"), /* @__PURE__ */ import_react15.default.createElement(
    "select",
    {
      className: "aidos-evidence-attach-kind-select",
      value: result,
      disabled: working,
      onChange: (event) => {
        setResult(event.target.value);
      }
    },
    /* @__PURE__ */ import_react15.default.createElement("option", { value: "" }, "Choose a result\u2026"),
    /* @__PURE__ */ import_react15.default.createElement("option", { value: "pass" }, "Pass"),
    /* @__PURE__ */ import_react15.default.createElement("option", { value: "fail" }, "Fail")
  )), /* @__PURE__ */ import_react15.default.createElement(NoteField2, { note, working, onChange: setNote }), /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-form-actions" }, /* @__PURE__ */ import_react15.default.createElement(
    "button",
    {
      className: "aidos-btn aidos-btn-primary",
      disabled: working || command.trim() === "" || result === "",
      onClick: () => void attach()
    },
    working ? "Working\u2026" : "Attach"
  )));
}
function AfterShotForm(props) {
  const [imagePath, setImagePath] = import_react15.default.useState(null);
  const [note, setNote] = import_react15.default.useState("");
  const [uploading, setUploading] = import_react15.default.useState(false);
  const [working, setWorking] = import_react15.default.useState(false);
  const [pasteError, setPasteError] = import_react15.default.useState(null);
  async function handleFile(file) {
    setPasteError(null);
    setUploading(true);
    try {
      const path = await uploadImagePaste(props.agentId, file, file.name || "pasted-image.png");
      setImagePath(path);
      showToast("Screenshot stored", "success");
    } catch (error) {
      setPasteError(error instanceof Error ? error.message : String(error));
    } finally {
      setUploading(false);
    }
  }
  async function attach() {
    if (working || imagePath === null) return;
    setWorking(true);
    try {
      const payload = { imagePath };
      if (note.trim() !== "") payload.note = note.trim();
      await callAidosRemote(
        "userAttachEvidence",
        { ticketId: props.ticketId, kind: "builtin:after_shot", payload },
        props.agentId
      );
      showToast("After shot attached", "success");
      setImagePath(null);
      setNote("");
      props.onAttached?.();
    } catch (error) {
      showToast(error instanceof AidosRemoteError ? error.message : String(error), "refusal");
    } finally {
      setWorking(false);
    }
  }
  return /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-evidence-tailored" }, /* @__PURE__ */ import_react15.default.createElement(ImagePasteZone, { imagePath, uploading, pasteError, onFile: handleFile }), /* @__PURE__ */ import_react15.default.createElement(NoteField2, { note, working, onChange: setNote }), /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-form-actions" }, /* @__PURE__ */ import_react15.default.createElement(
    "button",
    {
      className: "aidos-btn aidos-btn-primary",
      disabled: working || uploading || imagePath === null,
      onClick: () => void attach()
    },
    working ? "Working\u2026" : "Attach"
  )));
}
function TailoredForm(props) {
  const [note, setNote] = import_react15.default.useState("");
  const [pathsText, setPathsText] = import_react15.default.useState("");
  const [payloadText, setPayloadText] = import_react15.default.useState("");
  const [working, setWorking] = import_react15.default.useState(false);
  async function attachWith(kind, payload) {
    if (working) return;
    setWorking(true);
    try {
      await callAidosRemote("userAttachEvidence", { ticketId: props.ticketId, kind, payload }, props.agentId);
      showToast("Evidence attached", "success");
      setNote("");
      setPathsText("");
      setPayloadText("");
      props.onAttached();
    } catch (error) {
      showToast(error instanceof AidosRemoteError ? error.message : String(error), "refusal");
    } finally {
      setWorking(false);
    }
  }
  if (props.kind === "builtin:file_allowlist") {
    const parsed = parseLinesText(pathsText);
    return /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-evidence-tailored" }, /* @__PURE__ */ import_react15.default.createElement(
      LinesField,
      {
        label: "Allowed paths (one per line)",
        value: pathsText,
        working,
        placeholder: "src/client/\nsrc/host/aidos-core.ts",
        onChange: setPathsText
      }
    ), /* @__PURE__ */ import_react15.default.createElement(NoteField2, { note, working, onChange: setNote }), /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-form-actions" }, /* @__PURE__ */ import_react15.default.createElement(
      "button",
      {
        className: "aidos-btn aidos-btn-primary",
        disabled: working || !parsed.ok,
        title: parsed.ok ? void 0 : parsed.error,
        "data-dsh-tip": "",
        onClick: () => {
          if (parsed.ok) void attachWith(props.kind, { paths: parsed.lines });
        }
      },
      working ? "Working\u2026" : "Attach"
    )));
  }
  if (props.kind === "builtin:eval_criteria") {
    return /* @__PURE__ */ import_react15.default.createElement(EvalCriteriaForm, { ticketId: props.ticketId, agentId: props.agentId, onAttached: props.onAttached });
  }
  if (props.kind === "builtin:agent_report") {
    return /* @__PURE__ */ import_react15.default.createElement(AgentReportForm, { ticketId: props.ticketId, agentId: props.agentId, onAttached: props.onAttached });
  }
  if (props.kind === "builtin:automated_check" || props.kind === "builtin:test_run") {
    return /* @__PURE__ */ import_react15.default.createElement(
      CheckResultForm,
      {
        ticketId: props.ticketId,
        agentId: props.agentId,
        kind: props.kind,
        onAttached: props.onAttached
      }
    );
  }
  if (props.kind === "builtin:after_shot") {
    return /* @__PURE__ */ import_react15.default.createElement(AfterShotForm, { ticketId: props.ticketId, agentId: props.agentId, onAttached: props.onAttached });
  }
  if (props.kind === "builtin:user_commit") {
    return /* @__PURE__ */ import_react15.default.createElement(CommitPickerForm, { ticketId: props.ticketId, agentId: props.agentId, onAttached: props.onAttached, note, setNote, working });
  }
  const REVIEW_VERDICT_LABEL = {
    "builtin:review_pass": "What was reviewed, and why it is accepted",
    "builtin:review_fail": "The verdict and the findings",
    "builtin:review_note": "Note"
  };
  const verdictLabel = REVIEW_VERDICT_LABEL[props.kind];
  if (verdictLabel !== void 0) {
    return /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-evidence-tailored" }, /* @__PURE__ */ import_react15.default.createElement(NoteField2, { note, working, onChange: setNote, label: verdictLabel }), /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-form-actions" }, /* @__PURE__ */ import_react15.default.createElement(
      "button",
      {
        className: "aidos-btn aidos-btn-primary",
        disabled: working || note.trim() === "",
        onClick: () => void attachWith(props.kind, { note: note.trim() })
      },
      working ? "Working\u2026" : "Attach"
    )));
  }
  const parsedPayload = parsePayloadText(payloadText);
  const structured = parsedPayload.ok ? parsedPayload.payload : {};
  const parseError = parsedPayload.ok ? null : parsedPayload.error;
  return /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-evidence-tailored" }, /* @__PURE__ */ import_react15.default.createElement(Collapse, { summary: "Raw JSON (optional object)", defaultOpen: false }, /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-modal-row" }, /* @__PURE__ */ import_react15.default.createElement(
    "textarea",
    {
      className: "aidos-evidence-attach-note",
      value: payloadText,
      disabled: working,
      placeholder: '{\n  "custom": "value"\n}',
      onChange: (event) => {
        setPayloadText(event.target.value);
      }
    }
  )), parseError !== null ? /* @__PURE__ */ import_react15.default.createElement("p", { className: "aidos-evidence-paste-error" }, parseError) : null), /* @__PURE__ */ import_react15.default.createElement(NoteField2, { note, working, onChange: setNote }), /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-form-actions" }, /* @__PURE__ */ import_react15.default.createElement(
    "button",
    {
      className: "aidos-btn aidos-btn-primary",
      disabled: working || parseError !== null,
      onClick: () => {
        const payload = note.trim() === "" ? structured : { ...structured, note: note.trim() };
        void attachWith(props.kind, payload);
      }
    },
    working ? "Working\u2026" : "Attach"
  )));
}
function EvidenceAttach(props) {
  const kinds = userEvidenceKinds();
  const [kind, setKind] = import_react15.default.useState(kinds.length > 0 ? kinds[0].id : "");
  const [lastRow, setLastRow] = import_react15.default.useState(null);
  const remainingKinds = kinds.filter(
    (k2) => k2.id !== "builtin:user_signoff" && k2.id !== "builtin:user_verified"
  );
  void lastRow;
  return /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-evidence-attach" }, /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-modal-row" }, /* @__PURE__ */ import_react15.default.createElement("label", null, "Other evidence kinds"), /* @__PURE__ */ import_react15.default.createElement(
    "select",
    {
      className: "aidos-evidence-attach-kind-select",
      value: kind,
      onChange: (event) => {
        setKind(event.target.value);
      }
    },
    remainingKinds.map((descriptor) => /* @__PURE__ */ import_react15.default.createElement("option", { value: descriptor.id, key: descriptor.id }, descriptor.label))
  )), /* @__PURE__ */ import_react15.default.createElement(TailoredForm, { ticketId: props.ticketId, agentId: props.agentId, kind, onAttached: () => props.onAttached?.() }));
}

// src/client/allowlist-request-card.tsx
var import_react16 = __toESM(require("react"), 1);
function createdFromPayload(payload) {
  if (payload === null || typeof payload !== "object") return [];
  const created = payload.created;
  if (!Array.isArray(created)) return [];
  return created.filter((p) => typeof p === "string");
}
function stillCreated(proposedCreated, currentPaths) {
  const current = new Set(currentPaths.map((p) => p.trim()).filter((p) => p !== ""));
  return proposedCreated.filter((p) => current.has(p));
}
function AllowlistRequestCard(props) {
  const [request, setRequest] = import_react16.default.useState(null);
  const [paths, setPaths] = import_react16.default.useState([]);
  const [working, setWorking] = import_react16.default.useState(false);
  const dirtyRef = import_react16.default.useRef(false);
  import_react16.default.useEffect(function() {
    let cancelled = false;
    async function poll() {
      try {
        const result = await callAidosRemote("pendingApproval", { ticketId: props.ticketId }, props.agentId);
        if (cancelled) return;
        const row = result !== null && typeof result === "object" && !Array.isArray(result) ? result : null;
        setRequest(row);
        if (row !== null && !dirtyRef.current && Array.isArray(row.payload?.paths)) {
          setPaths(row.payload.paths);
        }
      } catch {
      }
    }
    void poll();
    const timer = setInterval(() => void poll(), 2e3);
    return function() {
      cancelled = true;
      clearInterval(timer);
    };
  }, [props.ticketId, props.agentId]);
  async function resolve(approved) {
    if (request === null || working) return;
    setWorking(true);
    try {
      const clean = paths.map((p) => p.trim()).filter((p) => p !== "");
      await callAidosRemote(
        "resolveApproval",
        { requestId: request.id, approved, ...approved ? { paths: clean } : {} },
        props.agentId
      );
      showToast(approved ? "Allowlist approved" : "Allowlist rejected", approved ? "success" : "info");
      dirtyRef.current = false;
      setRequest(null);
      props.onResolved?.();
    } catch (error) {
      showToast(error instanceof AidosRemoteError ? error.message : String(error), "refusal");
    } finally {
      setWorking(false);
    }
  }
  if (request === null) return null;
  const proposedCreated = createdFromPayload(request.payload);
  const createdPaths = stillCreated(proposedCreated, paths);
  return /* @__PURE__ */ import_react16.default.createElement("div", { className: "aidos-approval-card" }, /* @__PURE__ */ import_react16.default.createElement("div", { className: "aidos-approval-head" }, /* @__PURE__ */ import_react16.default.createElement("span", { className: "aidos-chip aidos-chip-kind aidos-chip-approval-kind" }, /* @__PURE__ */ import_react16.default.createElement("span", { className: "aidos-chip-key" }, request.kind.toUpperCase())), /* @__PURE__ */ import_react16.default.createElement("span", { className: "aidos-approval-prompt" }, request.prompt)), /* @__PURE__ */ import_react16.default.createElement(
    "textarea",
    {
      className: "aidos-allowlist-input",
      value: paths.join("\n"),
      disabled: working,
      onChange: (event) => {
        dirtyRef.current = true;
        setPaths(event.target.value.split("\n"));
      }
    }
  ), createdPaths.length > 0 ? /* @__PURE__ */ import_react16.default.createElement("p", { className: "aidos-approval-created" }, createdPaths.length === 1 ? "1 path does not exist yet and will be created: " : createdPaths.length + " paths do not exist yet and will be created: ", createdPaths.join(", ")) : null, /* @__PURE__ */ import_react16.default.createElement("p", { className: "aidos-detail-note" }, "Edit the list before approving if the proposal needs amending. The agent is told the outcome either way."), /* @__PURE__ */ import_react16.default.createElement("div", { className: "aidos-form-actions" }, /* @__PURE__ */ import_react16.default.createElement("button", { className: "aidos-btn", disabled: working, onClick: () => void resolve(false) }, "Reject"), /* @__PURE__ */ import_react16.default.createElement("button", { className: "aidos-btn aidos-btn-primary", disabled: working, onClick: () => void resolve(true) }, working ? "Working\u2026" : "Approve")));
}

// src/client/ticket-strip.tsx
var import_react17 = __toESM(require("react"), 1);
function TicketStrip(props) {
  const ticket = props.ticket;
  const full = fullTicketId(ticket);
  const className = "aidos-ticket-strip" + (props.highlighted === true ? " aidos-ticket-strip-highlighted" : "") + (props.working === true ? " aidos-ticket-strip-working" : "");
  const showGate = ticket.gatePresent !== void 0 || ticket.gateTotal !== void 0;
  return /* @__PURE__ */ import_react17.default.createElement("li", { className }, /* @__PURE__ */ import_react17.default.createElement("div", { className: "aidos-ticket-strip-main" }, /* @__PURE__ */ import_react17.default.createElement("span", { className: "aidos-ticket-strip-idcol" }, /* @__PURE__ */ import_react17.default.createElement(
    "span",
    {
      className: "aidos-chip aidos-chip-id",
      style: { background: idColor(full) },
      title: full,
      "data-dsh-tip": ""
    },
    ticketChipLabel(ticket)
  ), /* @__PURE__ */ import_react17.default.createElement(
    "span",
    {
      className: "aidos-ticket-strip-state " + badgeClass(ticket.state),
      title: stateLabel(ticket.state),
      "data-dsh-tip": ""
    },
    "(",
    stateLabel(ticket.state),
    ")"
  )), /* @__PURE__ */ import_react17.default.createElement("span", { className: "aidos-ticket-strip-body" }, /* @__PURE__ */ import_react17.default.createElement("span", { className: "aidos-ticket-strip-title", title: ticket.title, "data-dsh-tip": "" }, ticket.title), props.meta !== void 0 ? /* @__PURE__ */ import_react17.default.createElement("span", { className: "aidos-ticket-strip-meta" }, props.meta) : null), /* @__PURE__ */ import_react17.default.createElement("span", { className: "aidos-ticket-strip-chips" }, props.awaitingApproval === true ? /* @__PURE__ */ import_react17.default.createElement(
    "span",
    {
      className: "aidos-chip aidos-chip-awaiting-approval",
      title: "This ticket has a request waiting for your approval",
      "data-dsh-tip": ""
    },
    "Needs approval"
  ) : null, showGate ? (
    /*
     * #21's chip, not a second design (user: "Gate badge should use
     * the new styling from the ticket board").
     *
     * The board replaced the literal word "Gate" with a KEY icon --
     * the value is the information, the word was four characters of
     * furniture repeated on every row. The queue kept the old chip,
     * so the same fact wore two different faces depending on which
     * surface you were looking at.
     *
     * The sentence rides BOTH aria-label and title, exactly as the
     * tile does. #21's review found that `title` alone never reaches
     * the accessible name when the element has text content, so a
     * screen reader heard a bare "3/4" -- strictly worse than the
     * word it replaced. An icon may replace a label only when the
     * label survives for everyone.
     */
    (() => {
      const fraction = formatGateFraction(
        ticket.gatePresent ?? null,
        ticket.gateTotal ?? null,
        hasCriteria(ticket)
      );
      const sentence = `Gate: ${fraction} of the required evidence is attached`;
      return /* @__PURE__ */ import_react17.default.createElement(
        "span",
        {
          className: "aidos-chip aidos-chip-metric aidos-chip-gate",
          "aria-label": sentence,
          title: sentence,
          "data-dsh-tip": ""
        },
        /* @__PURE__ */ import_react17.default.createElement("span", { className: "aidos-chip-key" }, /* @__PURE__ */ import_react17.default.createElement(KeyholeIcon, null)),
        /* @__PURE__ */ import_react17.default.createElement("span", { className: "aidos-chip-value" }, fraction)
      );
    })()
  ) : null), /* @__PURE__ */ import_react17.default.createElement("span", { className: "aidos-ticket-strip-actions" }, props.onOpen !== void 0 ? /* @__PURE__ */ import_react17.default.createElement(
    "button",
    {
      className: "aidos-icon-btn",
      title: "Open " + full,
      "data-dsh-tip": "",
      "aria-label": "Open " + full,
      disabled: props.working === true,
      onClick: (event) => {
        event.stopPropagation();
        props.onOpen?.();
      }
    },
    /* @__PURE__ */ import_react17.default.createElement(PopOutIcon, null)
  ) : null, props.actionIcon !== void 0 ? /* @__PURE__ */ import_react17.default.createElement(
    "button",
    {
      className: "aidos-strip-action-toggle" + (props.expanded === true ? " is-open" : ""),
      title: props.actionHint ?? "Show actions",
      "data-dsh-tip": "",
      "aria-label": props.actionHint ?? "Show actions",
      "aria-expanded": props.expanded === true,
      disabled: props.working === true,
      onClick: (event) => {
        event.stopPropagation();
        props.onToggleActions?.();
      }
    },
    props.actionIcon
  ) : null)), props.expanded === true && props.actions !== void 0 ? /* @__PURE__ */ import_react17.default.createElement("div", { className: "aidos-ticket-strip-actionrow" }, props.actions) : null);
}

// src/client/signoff-dialog.tsx
var import_react18 = __toESM(require("react"), 1);
function SignoffDialog(props) {
  const [working, setWorking] = import_react18.default.useState(false);
  const [note, setNote] = import_react18.default.useState("");
  import_react18.default.useEffect(function() {
    if (props.open) logDebug("signoff dialog opened");
  }, [props.open]);
  if (!props.open) return null;
  async function confirm() {
    if (working) return;
    setWorking(true);
    try {
      await callAidosRemote(
        "userAttachEvidence",
        {
          ticketId: props.ticketId,
          kind: "builtin:user_signoff",
          payload: note.trim() === "" ? {} : { note: note.trim() }
        },
        props.agentId
      );
      await callAidosRemote(
        "userMoveTicket",
        { ticketId: props.ticketId, to: "in_progress" },
        props.agentId
      );
      showToast("Signed off", "success");
      props.onClose();
      props.onSignedOff();
    } catch (error) {
      if (error instanceof AidosRemoteError) {
        showToast(error.message, "refusal");
      } else {
        showToast(String(error), "refusal");
      }
    } finally {
      setWorking(false);
    }
  }
  return /* @__PURE__ */ import_react18.default.createElement(
    ModalShell,
    {
      title: "Sign off ticket",
      working,
      onClose: props.onClose,
      onConfirm: confirm,
      confirmLabel: "Confirm"
    },
    /* @__PURE__ */ import_react18.default.createElement("p", { className: "aidos-modal-body" }, "Signoff grants the agent write access on this ticket. Confirm to proceed."),
    /* @__PURE__ */ import_react18.default.createElement(
      NoteField,
      {
        label: "Note (optional \u2014 rides the signoff row)",
        value: note,
        working,
        onChange: setNote
      }
    )
  );
}

// src/client/send-back-modal.tsx
var import_react19 = __toESM(require("react"), 1);
function SendBackModal(props) {
  const [reason, setReason] = import_react19.default.useState("");
  const [working, setWorking] = import_react19.default.useState(false);
  import_react19.default.useEffect(function() {
    if (props.open) logDebug("send back modal opened");
  }, [props.open]);
  if (!props.open) return null;
  async function sendBack() {
    if (working) return;
    setWorking(true);
    try {
      await callAidosRemote(
        "userAddComment",
        { ticketId: props.ticketId, text: reason.trim() },
        props.agentId
      );
      await callAidosRemote(
        "userMoveTicket",
        { ticketId: props.ticketId, to: "in_progress" },
        props.agentId
      );
      showToast("Sent back", "success");
      props.onClose();
      props.onSentBack();
    } catch (error) {
      if (error instanceof AidosRemoteError) {
        showToast(error.message, "refusal");
      } else {
        showToast(String(error), "refusal");
      }
    } finally {
      setWorking(false);
    }
  }
  return /* @__PURE__ */ import_react19.default.createElement(
    ModalShell,
    {
      title: "Send back",
      working,
      onClose: props.onClose,
      onConfirm: sendBack,
      confirmLabel: "Send back"
    },
    /* @__PURE__ */ import_react19.default.createElement("p", { className: "aidos-modal-body" }, "Send the ticket back to in progress. The reason attaches as a comment."),
    /* @__PURE__ */ import_react19.default.createElement(NoteField, { label: "Reason", value: reason, working, onChange: setReason })
  );
}

// src/client/mark-done-modal.tsx
var import_react20 = __toESM(require("react"), 1);
function MarkDoneModal(props) {
  const [step, setStep] = import_react20.default.useState(1);
  const [finalComment, setFinalComment] = import_react20.default.useState("");
  const [working, setWorking] = import_react20.default.useState(false);
  import_react20.default.useEffect(function() {
    if (props.open) logDebug("mark done modal opened");
  }, [props.open]);
  if (!props.open) return null;
  const criteriaLines2 = props.ticket.criteria.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
  async function confirm() {
    if (working) return;
    setWorking(true);
    try {
      if (finalComment.trim() !== "") {
        await callAidosRemote(
          "userAddComment",
          { ticketId: props.ticketId, text: finalComment },
          props.agentId
        );
      }
      await callAidosRemote(
        "userAttachEvidence",
        { ticketId: props.ticketId, kind: "builtin:user_verified", payload: {} },
        props.agentId
      );
      await callAidosRemote(
        "userMoveTicket",
        { ticketId: props.ticketId, to: "done" },
        props.agentId
      );
      showToast("Marked done", "success");
      props.onClose();
      props.onMarkedDone();
    } catch (error) {
      if (error instanceof AidosRemoteError) {
        showToast(error.message, "refusal");
      } else {
        showToast(String(error), "refusal");
      }
    } finally {
      setWorking(false);
    }
  }
  return /* @__PURE__ */ import_react20.default.createElement(ModalShell, { title: "Mark done", working, onClose: props.onClose }, step === 1 ? /* @__PURE__ */ import_react20.default.createElement("div", { className: "aidos-modal-form" }, /* @__PURE__ */ import_react20.default.createElement("p", { className: "aidos-modal-body" }, "The ticket criteria, with their evidence:"), criteriaLines2.length === 0 ? /* @__PURE__ */ import_react20.default.createElement("p", { className: "aidos-detail-note" }, "No criteria on this ticket.") : /* @__PURE__ */ import_react20.default.createElement(
    CriterionLinker,
    {
      criteria: criteriaLines2,
      evidence: props.evidence,
      ticketIdKey: String(props.ticketId),
      agentId: props.agentId,
      onChanged: () => {
      }
    }
  ), /* @__PURE__ */ import_react20.default.createElement("div", { className: "aidos-form-actions" }, /* @__PURE__ */ import_react20.default.createElement(
    "button",
    {
      className: "aidos-btn aidos-btn-primary",
      onClick: () => {
        setStep(2);
      }
    },
    "Continue"
  ))) : /* @__PURE__ */ import_react20.default.createElement("div", { className: "aidos-modal-form" }, /* @__PURE__ */ import_react20.default.createElement("p", { className: "aidos-modal-body" }, "The evidence on this ticket:"), props.evidence.length === 0 ? /* @__PURE__ */ import_react20.default.createElement("p", { className: "aidos-detail-note" }, "No evidence rows yet.") : /* @__PURE__ */ import_react20.default.createElement("ul", { className: "aidos-evidence-list" }, props.evidence.map((row, index) => /* @__PURE__ */ import_react20.default.createElement(
    EvidenceStrip,
    {
      key: String(row.at ?? index) + ":" + row.kind,
      row,
      criterionLabel: typeof row.payload.criteria === "string" && row.payload.criteria.trim() !== "" ? row.payload.criteria : void 0
    }
  ))), /* @__PURE__ */ import_react20.default.createElement(
    NoteField,
    {
      label: "Final comment (optional)",
      value: finalComment,
      working,
      onChange: setFinalComment
    }
  ), /* @__PURE__ */ import_react20.default.createElement("div", { className: "aidos-form-actions" }, /* @__PURE__ */ import_react20.default.createElement(
    "button",
    {
      className: "aidos-btn aidos-btn-primary",
      disabled: working,
      onClick: confirm
    },
    working ? "Working\u2026" : "Confirm"
  ))));
}

// src/client/detail-panel.tsx
var DESCRIPTION_CLIP_CHARS = 800;
function showError2(error) {
  if (error instanceof AidosRemoteError) {
    showToast(error.message, "refusal");
  } else {
    showToast(String(error), "refusal");
  }
}
function DescriptionPanel(props) {
  const [editing, setEditing] = import_react21.default.useState(false);
  const [draft, setDraft] = import_react21.default.useState("");
  const [saving, setSaving] = import_react21.default.useState(false);
  const [expanded, setExpanded] = import_react21.default.useState(false);
  const text = props.ticket.description;
  const empty = text.trim() === "";
  const long = text.length > DESCRIPTION_CLIP_CHARS;
  const clipped = long && !expanded;
  const html = empty ? "" : String(f.parse(text, { async: false }));
  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      await callAidosRemote(
        "userSetTicket",
        { ticketId: props.ticketIdKey, description: draft },
        props.agentId
      );
      showToast("Description saved", "success");
      setEditing(false);
      props.onSaved();
    } catch (error) {
      showError2(error);
    } finally {
      setSaving(false);
    }
  }
  function cancel() {
    setDraft(text);
    setEditing(false);
  }
  let body;
  if (editing) {
    body = /* @__PURE__ */ import_react21.default.createElement(import_react21.default.Fragment, null, /* @__PURE__ */ import_react21.default.createElement(
      "textarea",
      {
        value: draft,
        disabled: saving,
        onChange: (event) => {
          setDraft(event.target.value);
        }
      }
    ), /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-form-actions" }, /* @__PURE__ */ import_react21.default.createElement(
      "button",
      {
        className: "aidos-btn aidos-btn-primary",
        disabled: saving,
        onClick: () => {
          void save();
        }
      },
      "Save"
    ), /* @__PURE__ */ import_react21.default.createElement(
      "button",
      {
        className: "aidos-btn",
        disabled: saving,
        onClick: cancel
      },
      "Cancel"
    )));
  } else if (empty) {
    body = /* @__PURE__ */ import_react21.default.createElement("p", { className: "aidos-detail-note" }, "No description.");
  } else {
    body = /* @__PURE__ */ import_react21.default.createElement(import_react21.default.Fragment, null, /* @__PURE__ */ import_react21.default.createElement(
      "div",
      {
        className: "aidos-md" + (clipped ? " aidos-md-clipped" : ""),
        dangerouslySetInnerHTML: { __html: html }
      }
    ), long ? /* @__PURE__ */ import_react21.default.createElement(
      "button",
      {
        className: "aidos-md-more",
        onClick: () => {
          setExpanded(!expanded);
        }
      },
      expanded ? "Show less" : "Show more"
    ) : null);
  }
  return /* @__PURE__ */ import_react21.default.createElement("details", { className: "aidos-panel", open: true }, /* @__PURE__ */ import_react21.default.createElement("summary", { className: "aidos-panel-head" }, /* @__PURE__ */ import_react21.default.createElement("span", { className: "aidos-panel-title" }, "Description"), /* @__PURE__ */ import_react21.default.createElement(
    "button",
    {
      className: "aidos-icon-btn",
      title: "Edit",
      "data-dsh-tip": "",
      "aria-label": "Edit description",
      onClick: (event) => {
        event.preventDefault();
        event.stopPropagation();
        setDraft(text);
        setEditing(true);
      }
    },
    /* @__PURE__ */ import_react21.default.createElement(PencilIcon, null)
  )), /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-panel-body" }, body));
}
function CriterionEditor(props) {
  const [draft, setDraft] = import_react21.default.useState(props.line);
  return /* @__PURE__ */ import_react21.default.createElement("span", { className: "aidos-criterion-row" }, /* @__PURE__ */ import_react21.default.createElement(
    "input",
    {
      type: "text",
      value: draft,
      disabled: props.saving,
      onChange: (event) => {
        setDraft(event.target.value);
      },
      onKeyDown: (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          props.onSave(draft);
        }
      }
    }
  ), /* @__PURE__ */ import_react21.default.createElement("span", { className: "aidos-criterion-actions" }, /* @__PURE__ */ import_react21.default.createElement(
    "button",
    {
      className: "aidos-btn",
      disabled: props.saving,
      onClick: () => {
        props.onSave(draft);
      }
    },
    "Save"
  ), /* @__PURE__ */ import_react21.default.createElement(
    "button",
    {
      className: "aidos-btn",
      disabled: props.saving,
      onClick: props.onCancel
    },
    "Cancel"
  )));
}
function CriteriaPanel(props) {
  const [editingIndex, setEditingIndex] = import_react21.default.useState(null);
  const [saving, setSaving] = import_react21.default.useState(false);
  const [addDraft, setAddDraft] = import_react21.default.useState("");
  const lines = criteriaLines(props.ticket.criteria);
  const uncovered = uncoveredCriteria(props.ticket.criteria, props.evidence);
  const uncoveredSet = new Set(uncovered);
  const covered = lines.length - uncovered.length;
  async function saveLines(survivors) {
    if (saving) return false;
    setSaving(true);
    try {
      await callAidosRemote(
        "userSetTicket",
        { ticketId: props.ticketIdKey, criteria: survivors.join("\n") },
        props.agentId
      );
      showToast("Criteria saved", "success");
      setEditingIndex(null);
      props.onSaved();
      return true;
    } catch (error) {
      showError2(error);
      return false;
    } finally {
      setSaving(false);
    }
  }
  function replaceLine(index, replacement) {
    const survivors = lines.slice();
    survivors[index] = replacement;
    void saveLines(survivors);
  }
  function removeLine(index) {
    const survivors = lines.slice();
    survivors.splice(index, 1);
    void saveLines(survivors);
  }
  async function addLine() {
    const text = addDraft.trim();
    if (text === "") return;
    const saved = await saveLines(lines.concat([text]));
    if (saved) setAddDraft("");
  }
  return /* @__PURE__ */ import_react21.default.createElement("details", { className: "aidos-panel" }, /* @__PURE__ */ import_react21.default.createElement("summary", { className: "aidos-panel-head" }, /* @__PURE__ */ import_react21.default.createElement("span", { className: "aidos-panel-title" }, "Criteria " + covered + "/" + lines.length)), /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-panel-body" }, lines.length === 0 ? /* @__PURE__ */ import_react21.default.createElement("p", { className: "aidos-detail-note" }, "No criteria yet \u2014 add the first one below.") : null, /* @__PURE__ */ import_react21.default.createElement("ul", { className: "aidos-criteria" }, lines.map((line, index) => /* @__PURE__ */ import_react21.default.createElement(
    "li",
    {
      key: index + ":" + line,
      className: uncoveredSet.has(line) ? "aidos-criterion aidos-criterion-uncovered" : "aidos-criterion"
    },
    editingIndex === index ? /* @__PURE__ */ import_react21.default.createElement(
      CriterionEditor,
      {
        line,
        saving,
        onSave: (draft) => {
          replaceLine(index, draft.trim());
        },
        onCancel: () => {
          setEditingIndex(null);
        }
      }
    ) : /* @__PURE__ */ import_react21.default.createElement("span", { className: "aidos-criterion-row" }, uncoveredSet.has(line) ? /* @__PURE__ */ import_react21.default.createElement(
      "span",
      {
        className: "aidos-criterion-warn",
        title: "No evidence covers this criterion yet",
        "data-dsh-tip": "",
        "aria-label": "Uncovered criterion"
      },
      /* @__PURE__ */ import_react21.default.createElement(WarningIcon, null)
    ) : null, /* @__PURE__ */ import_react21.default.createElement("span", { className: "aidos-criterion-text" }, line), /* @__PURE__ */ import_react21.default.createElement("span", { className: "aidos-criterion-actions" }, /* @__PURE__ */ import_react21.default.createElement(
      "button",
      {
        className: "aidos-icon-btn",
        title: "Edit",
        "data-dsh-tip": "",
        "aria-label": "Edit criterion " + (index + 1),
        onClick: () => {
          setEditingIndex(index);
        }
      },
      /* @__PURE__ */ import_react21.default.createElement(PencilIcon, null)
    ), /* @__PURE__ */ import_react21.default.createElement(
      "button",
      {
        className: "aidos-icon-btn",
        title: "Delete",
        "data-dsh-tip": "",
        "aria-label": "Delete criterion " + (index + 1),
        disabled: saving,
        onClick: () => {
          removeLine(index);
        }
      },
      /* @__PURE__ */ import_react21.default.createElement(TrashIcon, null)
    ))),
    editingIndex !== index ? /* @__PURE__ */ import_react21.default.createElement("ul", { className: "aidos-criterion-linked" }, props.evidence.filter((row) => criterionOf(row) === line).map((row) => /* @__PURE__ */ import_react21.default.createElement("li", { className: "aidos-criterion-linked-row", key: String(row.at) + ":" + row.kind }, /* @__PURE__ */ import_react21.default.createElement(
      EvidenceStrip,
      {
        row,
        onView: props.onViewEvidence,
        deleting: props.deletingAt === row.at
      }
    )))) : null
  )), /* @__PURE__ */ import_react21.default.createElement("li", { className: "aidos-criteria-add" }, /* @__PURE__ */ import_react21.default.createElement(
    "input",
    {
      type: "text",
      value: addDraft,
      disabled: saving,
      placeholder: "Add a criterion",
      onChange: (event) => {
        setAddDraft(event.target.value);
      },
      onKeyDown: (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          void addLine();
        }
      }
    }
  ), /* @__PURE__ */ import_react21.default.createElement(
    "button",
    {
      className: "aidos-btn",
      disabled: saving || addDraft.trim() === "",
      onClick: () => {
        void addLine();
      }
    },
    "Add"
  )))));
}
function refOf(hit) {
  return hit.workspaceKey + ":" + hit.ticketId;
}
function DependencyCard(props) {
  const ref = props.depRef;
  const key = ref.includes(":") ? ref : (props.workspaceKey ?? "") + ":" + ref;
  const known = props.ticketsByKey?.get(key) ?? props.ticketsByKey?.get(ref);
  const open = known === void 0 || props.onJump === void 0 ? void 0 : () => {
    props.onJump?.(boardKeyOf(known));
  };
  if (known === void 0) {
    return /* @__PURE__ */ import_react21.default.createElement("li", { className: "aidos-ticket-strip" }, /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-ticket-strip-main" }, /* @__PURE__ */ import_react21.default.createElement("span", { className: "aidos-chip aidos-chip-dep", title: ref, "data-dsh-tip": "" }, displayDep(ref)), /* @__PURE__ */ import_react21.default.createElement("span", { className: "aidos-ticket-strip-body" }, /* @__PURE__ */ import_react21.default.createElement("span", { className: "aidos-ticket-strip-title aidos-dep-card-unknown" }, "not on this board"), /* @__PURE__ */ import_react21.default.createElement("span", { className: "aidos-ticket-strip-meta" }, ref))));
  }
  return /* @__PURE__ */ import_react21.default.createElement(
    TicketStrip,
    {
      ticket: known,
      meta: "depends on " + displayDep(ref),
      onOpen: open
    }
  );
}
function DependencySection(props) {
  const [query, setQuery] = import_react21.default.useState("");
  const [hits, setHits] = import_react21.default.useState(null);
  const [searching, setSearching] = import_react21.default.useState(false);
  const [adding, setAdding] = import_react21.default.useState(null);
  const current = props.dependsOn ?? [];
  async function search() {
    if (searching) return;
    if (query.trim() === "") {
      setHits([]);
      return;
    }
    setSearching(true);
    try {
      const result = await callAidosRemote(
        "searchTickets",
        { query },
        props.agentId
      );
      const rows = Array.isArray(result) ? result : [];
      setHits(rows);
    } catch (error) {
      showError2(error);
      setHits(null);
    } finally {
      setSearching(false);
    }
  }
  async function add(ref) {
    if (adding !== null) return;
    if (current.includes(ref)) {
      showToast("Already a dependency", "info");
      return;
    }
    setAdding(ref);
    try {
      await callAidosRemote(
        "userSetTicket",
        { ticketId: props.ticketId, dependsOn: [.../* @__PURE__ */ new Set([...current, ref])] },
        props.agentId
      );
      showToast("Dependency added", "success");
      props.onSaved();
    } catch (error) {
      showError2(error);
    } finally {
      setAdding(null);
    }
  }
  return /* @__PURE__ */ import_react21.default.createElement("details", { className: "aidos-panel" }, /* @__PURE__ */ import_react21.default.createElement("summary", { className: "aidos-panel-head" }, /* @__PURE__ */ import_react21.default.createElement("span", { className: "aidos-panel-title" }, "Dependencies")), /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-panel-body" }, current.length === 0 ? /* @__PURE__ */ import_react21.default.createElement("p", { className: "aidos-detail-note" }, "No dependencies.") : /* @__PURE__ */ import_react21.default.createElement("ul", { className: "aidos-ticket-strips" }, current.map((ref) => /* @__PURE__ */ import_react21.default.createElement(
    DependencyCard,
    {
      key: ref,
      depRef: ref,
      agentId: props.agentId,
      ticketsByKey: props.ticketsByKey,
      onJump: props.onJump,
      workspaceKey: props.workspaceKey
    }
  ))), /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-dep-search" }, /* @__PURE__ */ import_react21.default.createElement(
    "input",
    {
      className: "aidos-dep-search-input",
      value: query,
      placeholder: "Search tickets",
      onChange: (event) => {
        setQuery(event.target.value);
      },
      onKeyDown: (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          void search();
        }
      }
    }
  ), /* @__PURE__ */ import_react21.default.createElement(
    "button",
    {
      className: "aidos-btn",
      disabled: searching,
      onClick: () => {
        void search();
      }
    },
    "Search"
  )), hits !== null ? /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-dep-results" }, hits.length === 0 ? /* @__PURE__ */ import_react21.default.createElement("p", { className: "aidos-detail-note" }, "No matches.") : hits.map((hit) => /* @__PURE__ */ import_react21.default.createElement(
    "button",
    {
      key: refOf(hit),
      className: "aidos-dep-result",
      disabled: adding !== null,
      onClick: () => {
        void add(refOf(hit));
      },
      title: refOf(hit),
      "data-dsh-tip": ""
    },
    /* @__PURE__ */ import_react21.default.createElement("span", { className: "aidos-suggestion-title" }, hit.title),
    /* @__PURE__ */ import_react21.default.createElement("span", { className: "aidos-chip aidos-chip-id" }, displayDep(refOf(hit)))
  ))) : null));
}
function EvidencePanel(props) {
  return /* @__PURE__ */ import_react21.default.createElement(
    "details",
    {
      className: "aidos-panel",
      open: !props.evidenceCollapsed,
      onToggle: (event) => {
        const open = event.target.open;
        if (open === props.evidenceCollapsed) {
          props.onToggleEvidence();
        }
      }
    },
    /* @__PURE__ */ import_react21.default.createElement("summary", { className: "aidos-panel-head" }, /* @__PURE__ */ import_react21.default.createElement("span", { className: "aidos-panel-title" }, "Evidence")),
    /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-panel-body" }, props.evidence.length === 0 ? /* @__PURE__ */ import_react21.default.createElement("p", { className: "aidos-detail-note" }, "No evidence rows yet.") : /* @__PURE__ */ import_react21.default.createElement("ul", { className: "aidos-evidence-list" }, props.evidence.map((row, index) => /* @__PURE__ */ import_react21.default.createElement(
      EvidenceStrip,
      {
        key: row.at ?? index,
        row,
        onView: props.onViewEvidence,
        onDelete: props.onDelete,
        deleting: props.deletingAt !== null,
        criterionLabel: typeof row.payload.criteria === "string" ? row.payload.criteria : void 0
      }
    ))), props.criteria.length > 0 ? /* @__PURE__ */ import_react21.default.createElement("details", { className: "aidos-panel aidos-panel-nested" }, /* @__PURE__ */ import_react21.default.createElement("summary", { className: "aidos-panel-head" }, /* @__PURE__ */ import_react21.default.createElement("span", { className: "aidos-panel-title" }, "Link evidence to criteria")), /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-panel-body" }, /* @__PURE__ */ import_react21.default.createElement(
      CriterionLinker,
      {
        criteria: props.criteria,
        evidence: props.evidence,
        ticketIdKey: props.ticketIdKey,
        agentId: props.agentId,
        onChanged: props.onLinked
      }
    ))) : null, /* @__PURE__ */ import_react21.default.createElement(EvidenceAttach, { ticketId: props.ticketIdKey, agentId: props.agentId }))
  );
}
function DetailPanel(props) {
  const ticket = props.ticket;
  const badge = badgeClass(ticket.state);
  const [deletingAt, setDeletingAt] = import_react21.default.useState(null);
  async function deleteEvidence(row) {
    if (deletingAt !== null) return;
    const at2 = row.at ?? 0;
    setDeletingAt(at2);
    try {
      await callAidosRemote(
        "userDetachEvidence",
        { ticketId: props.ticketIdKey, at: at2, rowKind: row.kind },
        props.agentId
      );
      showToast("Evidence deleted", "success");
    } catch (error) {
      showError2(error);
    } finally {
      setDeletingAt(null);
    }
  }
  return /* @__PURE__ */ import_react21.default.createElement(import_react21.default.Fragment, null, /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-detail-head" }, /* @__PURE__ */ import_react21.default.createElement(
    FieldEditor,
    {
      field: "title",
      ticketId: props.ticketIdKey,
      value: ticket.title,
      agentId: props.agentId,
      onSaved: props.onFieldSaved
    }
  ), /* @__PURE__ */ import_react21.default.createElement("button", { className: "aidos-close-btn", onClick: props.onClose }, "\xD7")), /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-detail-chips" }, /* @__PURE__ */ import_react21.default.createElement(
    "span",
    {
      className: "aidos-chip aidos-chip-id",
      style: { background: idColor(fullTicketId(ticket)) },
      title: fullTicketId(ticket),
      "data-dsh-tip": ""
    },
    ticketChipLabel(ticket)
  ), /* @__PURE__ */ import_react21.default.createElement("span", { className: badge }, stateLabel(ticket.state))), /* @__PURE__ */ import_react21.default.createElement("dl", { className: "aidos-facts" }, /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-facts-row" }, /* @__PURE__ */ import_react21.default.createElement("dt", { className: "aidos-facts-label" }, "State"), /* @__PURE__ */ import_react21.default.createElement("dd", { className: "aidos-facts-value" }, stateLabel(ticket.state))), /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-facts-row" }, /* @__PURE__ */ import_react21.default.createElement("dt", { className: "aidos-facts-label" }, "Gate"), /* @__PURE__ */ import_react21.default.createElement("dd", { className: "aidos-facts-value" }, formatGateFraction(ticket.gatePresent, ticket.gateTotal, hasCriteria(ticket)))), /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-facts-row" }, /* @__PURE__ */ import_react21.default.createElement("dt", { className: "aidos-facts-label" }, "Confidence"), /* @__PURE__ */ import_react21.default.createElement("dd", { className: "aidos-facts-value" }, String(ringPercent(ticket.confidenceScore)) + "%", /* @__PURE__ */ import_react21.default.createElement(
    "span",
    {
      className: "aidos-facts-asterisk",
      title: "Advisory score. It never unlocks anything.",
      "data-dsh-tip": ""
    },
    "*"
  ))), /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-facts-row" }, /* @__PURE__ */ import_react21.default.createElement("dt", { className: "aidos-facts-label" }, "Phase"), /* @__PURE__ */ import_react21.default.createElement("dd", { className: "aidos-facts-value" }, String(ticket.phase))), /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-facts-row" }, /* @__PURE__ */ import_react21.default.createElement("dt", { className: "aidos-facts-label" }, "Order"), /* @__PURE__ */ import_react21.default.createElement("dd", { className: "aidos-facts-value" }, String(ticket.order))), /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-facts-row" }, /* @__PURE__ */ import_react21.default.createElement("dt", { className: "aidos-facts-label" }, "Slug"), /* @__PURE__ */ import_react21.default.createElement("dd", { className: "aidos-facts-value" }, ticket.slug))), /* @__PURE__ */ import_react21.default.createElement(
    AllowlistRequestCard,
    {
      ticketId: props.ticketIdKey,
      agentId: props.agentId,
      onResolved: props.onFieldSaved
    }
  ), props.actions, /* @__PURE__ */ import_react21.default.createElement(
    DescriptionPanel,
    {
      ticket,
      ticketIdKey: props.ticketIdKey,
      agentId: props.agentId,
      onSaved: props.onFieldSaved
    }
  ), /* @__PURE__ */ import_react21.default.createElement(
    CriteriaPanel,
    {
      ticket,
      evidence: props.evidence,
      ticketIdKey: props.ticketIdKey,
      agentId: props.agentId,
      onSaved: props.onFieldSaved,
      onViewEvidence: props.onViewEvidence,
      deletingAt
    }
  ), /* @__PURE__ */ import_react21.default.createElement(
    DependencySection,
    {
      ticketId: props.ticketIdKey,
      dependsOn: ticket.dependsOn,
      agentId: props.agentId,
      onSaved: props.onFieldSaved,
      ticketsByKey: props.ticketsByKey,
      onJump: props.onJump,
      workspaceKey: ticket.workspaceKey
    }
  ), /* @__PURE__ */ import_react21.default.createElement(
    EvidencePanel,
    {
      evidence: props.evidence,
      evidenceCollapsed: props.evidenceCollapsed,
      onToggleEvidence: props.onToggleEvidence,
      onDelete: (row) => {
        void deleteEvidence(row);
      },
      deletingAt,
      ticketIdKey: props.ticketIdKey,
      agentId: props.agentId,
      onViewEvidence: props.onViewEvidence,
      criteria: criteriaLines(ticket.criteria),
      onLinked: props.onFieldSaved
    }
  ));
}
function DetailView(props) {
  const [signoffOpen, setSignoffOpen] = import_react21.default.useState(false);
  const [verifyOpen, setVerifyOpen] = import_react21.default.useState(false);
  const [sendBackOpen, setSendBackOpen] = import_react21.default.useState(false);
  const [markDoneOpen, setMarkDoneOpen] = import_react21.default.useState(false);
  const [allowlistOpen, setAllowlistOpen] = import_react21.default.useState(false);
  const [viewingEvidence, setViewingEvidence] = import_react21.default.useState(null);
  const [submitting, setSubmitting] = import_react21.default.useState(false);
  const ticket = props.ticket;
  const agentId = props.agentId;
  import_react21.default.useEffect(function() {
    logDebug("detail view: ticket " + ticket.id);
  }, []);
  async function submitForReview() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await callAidosRemote(
        "userMoveTicket",
        // #93 third review, finding 1: this sent the bare `ticket.id` while
        // every sibling write in this component uses props.ticketIdKey. For a
        // FOREIGN row _routedAgent returns the caller unchanged for a number,
        // so Submit for review moved the caller's OWN ticket with that id.
        { ticketId: props.ticketIdKey, to: "awaiting_verification" },
        agentId
      );
      showToast("Submitted for review", "success");
      props.onClose();
    } catch (error) {
      showError2(error);
    } finally {
      setSubmitting(false);
    }
  }
  return /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-detail" }, /* @__PURE__ */ import_react21.default.createElement(
    DetailPanel,
    {
      ticket,
      ticketIdKey: props.ticketIdKey,
      evidence: props.evidence,
      evidenceCollapsed: props.evidenceCollapsed,
      onToggleEvidence: props.onToggleEvidence,
      onClose: props.onClose,
      agentId,
      onFieldSaved: props.onFieldSaved,
      onOpenAllowlist: () => {
        setAllowlistOpen(true);
      },
      onViewEvidence: (row) => {
        setViewingEvidence(row);
      },
      actions: /* @__PURE__ */ import_react21.default.createElement(
        ActionBar,
        {
          ticket,
          evidence: props.evidence,
          onOpenSignoff: () => {
            setSignoffOpen(true);
          },
          onOpenVerify: () => {
            setVerifyOpen(true);
          },
          onOpenSendBack: () => {
            setSendBackOpen(true);
          },
          onOpenMarkDone: () => {
            setMarkDoneOpen(true);
          },
          onOpenSubmitForReview: () => {
            void submitForReview();
          },
          onOpenAllowlist: () => {
            setAllowlistOpen(true);
          }
        }
      )
    }
  ), /* @__PURE__ */ import_react21.default.createElement(
    EvidenceViewer,
    {
      row: viewingEvidence,
      onClose: () => {
        setViewingEvidence(null);
      }
    }
  ), allowlistOpen ? /* @__PURE__ */ import_react21.default.createElement(
    AllowlistEditor,
    {
      open: true,
      ticketId: ticket.id,
      ticketIdKey: props.ticketIdKey,
      currentAllowlist: ticket.allowlist ?? [],
      agentId,
      onClose: () => {
        setAllowlistOpen(false);
      },
      onSaved: props.onFieldSaved
    }
  ) : null, /* @__PURE__ */ import_react21.default.createElement(
    CommentsSection,
    {
      ticketId: props.ticketIdKey,
      comments: props.comments,
      agentId
    }
  ), signoffOpen ? /* @__PURE__ */ import_react21.default.createElement(
    SignoffDialog,
    {
      open: true,
      ticketId: props.ticketIdKey,
      ticketTitle: ticket.title,
      onClose: () => {
        setSignoffOpen(false);
      },
      onSignedOff: function() {
        setSignoffOpen(false);
      },
      agentId
    }
  ) : null, verifyOpen ? /* @__PURE__ */ import_react21.default.createElement(
    VerifyModal,
    {
      ticketId: props.ticketIdKey,
      agentId,
      onClose: () => {
        setVerifyOpen(false);
      }
    }
  ) : null, sendBackOpen ? /* @__PURE__ */ import_react21.default.createElement(
    SendBackModal,
    {
      open: true,
      ticketId: props.ticketIdKey,
      onClose: () => {
        setSendBackOpen(false);
      },
      onSentBack: function() {
        setSendBackOpen(false);
      },
      agentId
    }
  ) : null, markDoneOpen ? /* @__PURE__ */ import_react21.default.createElement(
    MarkDoneModal,
    {
      open: true,
      ticketId: props.ticketIdKey,
      ticket,
      evidence: props.evidence,
      onClose: () => {
        setMarkDoneOpen(false);
      },
      onMarkedDone: props.onClose,
      agentId
    }
  ) : null);
}

// src/client/create-ticket-modal.tsx
var import_react22 = __toESM(require("react"), 1);
function CreateTicketModal(props) {
  const [title, setTitle] = import_react22.default.useState("");
  const [description, setDescription] = import_react22.default.useState("");
  const [criteria, setCriteria] = import_react22.default.useState("");
  const [saving, setSaving] = import_react22.default.useState(false);
  import_react22.default.useEffect(function() {
    if (props.open) logDebug("create ticket modal opened");
  }, [props.open]);
  if (!props.open) return null;
  async function save() {
    if (saving) return;
    if (title.trim() === "") return;
    setSaving(true);
    try {
      const result = await callAidosRemote(
        "userSetTicket",
        { title, description, criteria },
        props.agentId
      );
      const id = typeof result === "object" && result !== null && !Array.isArray(result) && "id" in result && typeof result.id === "number" ? result.id : NaN;
      showToast("Ticket created", "success");
      props.onClose();
      if (props.onCreated !== void 0 && Number.isFinite(id)) {
        props.onCreated(id);
      }
    } catch (error) {
      if (error instanceof AidosRemoteError) {
        showToast(error.message, "refusal");
      } else {
        showToast(String(error), "refusal");
      }
    } finally {
      setSaving(false);
    }
  }
  return /* @__PURE__ */ import_react22.default.createElement(
    "div",
    {
      className: "aidos-modal-mask",
      onClick: () => {
        if (!saving) props.onClose();
      }
    },
    /* @__PURE__ */ import_react22.default.createElement(
      "div",
      {
        className: "aidos-modal",
        onClick: (event) => {
          event.stopPropagation();
        }
      },
      /* @__PURE__ */ import_react22.default.createElement("div", { className: "aidos-modal-head" }, /* @__PURE__ */ import_react22.default.createElement("h3", { className: "aidos-modal-title" }, "Create a ticket"), /* @__PURE__ */ import_react22.default.createElement(
        "button",
        {
          className: "aidos-close-btn",
          onClick: () => {
            if (!saving) props.onClose();
          },
          "aria-label": "Close"
        },
        "\xD7"
      )),
      /* @__PURE__ */ import_react22.default.createElement("div", { className: "aidos-modal-form" }, /* @__PURE__ */ import_react22.default.createElement("div", { className: "aidos-modal-row" }, /* @__PURE__ */ import_react22.default.createElement("label", null, "Title"), /* @__PURE__ */ import_react22.default.createElement(
        "input",
        {
          type: "text",
          value: title,
          disabled: saving,
          onChange: (event) => {
            setTitle(event.target.value);
          }
        }
      )), /* @__PURE__ */ import_react22.default.createElement("div", { className: "aidos-modal-row" }, /* @__PURE__ */ import_react22.default.createElement("label", null, "Description"), /* @__PURE__ */ import_react22.default.createElement(
        "textarea",
        {
          value: description,
          disabled: saving,
          onChange: (event) => {
            setDescription(event.target.value);
          }
        }
      )), /* @__PURE__ */ import_react22.default.createElement("div", { className: "aidos-modal-row" }, /* @__PURE__ */ import_react22.default.createElement("label", null, "Criteria"), /* @__PURE__ */ import_react22.default.createElement(
        "textarea",
        {
          value: criteria,
          disabled: saving,
          onChange: (event) => {
            setCriteria(event.target.value);
          }
        }
      )), /* @__PURE__ */ import_react22.default.createElement(
        "button",
        {
          className: "aidos-btn aidos-btn-primary",
          disabled: saving || title.trim() === "",
          onClick: save
        },
        saving ? "Saving\u2026" : "Save"
      ))
    )
  );
}

// src/client/plan-meta-modal.tsx
var import_react23 = __toESM(require("react"), 1);
function PlanMetaModal(props) {
  const [editing, setEditing] = import_react23.default.useState(null);
  const [draft, setDraft] = import_react23.default.useState("");
  const [saving, setSaving] = import_react23.default.useState(false);
  const [expanded, setExpanded] = import_react23.default.useState([]);
  import_react23.default.useEffect(function() {
    if (props.open) {
      setEditing(null);
      setDraft("");
      setExpanded([0]);
      logDebug("plan meta modal opened");
    }
  }, [props.open]);
  if (!props.open) return null;
  function beginEdit(key, text) {
    setEditing(key);
    setDraft(text);
  }
  function cancelEdit() {
    setEditing(null);
    setDraft("");
  }
  function toggleSection(position) {
    setExpanded(
      (current) => current.includes(position) ? current.filter((item) => item !== position) : [...current, position]
    );
  }
  async function save(key) {
    if (saving) return;
    const args = {};
    if (key === "frontmatter") {
      args.frontmatter = draft;
    } else if (key === "preamble") {
      args.preamble = draft;
    } else {
      args.contextSections = (props.planMeta?.contextSections ?? []).map(
        (section, position) => position === key ? { ...section, text: draft } : { ...section }
      );
    }
    setSaving(true);
    try {
      await callAidosRemote("userSetPlanMeta", args, props.agentId);
      showToast("Plan block saved", "success");
      cancelEdit();
    } catch (error) {
      if (error instanceof AidosRemoteError) {
        showToast(error.message, "refusal");
      } else {
        showToast(String(error), "refusal");
      }
    } finally {
      setSaving(false);
    }
  }
  function renderEditControls(key) {
    return /* @__PURE__ */ import_react23.default.createElement(import_react23.default.Fragment, null, /* @__PURE__ */ import_react23.default.createElement(
      "textarea",
      {
        className: "aidos-plan-meta-input",
        value: draft,
        disabled: saving,
        onChange: (event) => {
          setDraft(event.target.value);
        }
      }
    ), /* @__PURE__ */ import_react23.default.createElement("div", { className: "aidos-plan-meta-actions" }, /* @__PURE__ */ import_react23.default.createElement(
      "button",
      {
        className: "aidos-btn aidos-btn-primary",
        disabled: saving,
        onClick: () => {
          void save(key);
        }
      },
      saving ? "Saving\u2026" : "Save"
    ), /* @__PURE__ */ import_react23.default.createElement(
      "button",
      {
        className: "aidos-btn",
        disabled: saving,
        onClick: cancelEdit
      },
      "Cancel"
    )));
  }
  function renderNamedBlock(key, label, text) {
    return /* @__PURE__ */ import_react23.default.createElement("div", { className: "aidos-plan-meta-block", key }, /* @__PURE__ */ import_react23.default.createElement("div", { className: "aidos-plan-meta-block-head" }, /* @__PURE__ */ import_react23.default.createElement("span", { className: "aidos-plan-meta-block-title" }, label), /* @__PURE__ */ import_react23.default.createElement(
      "button",
      {
        className: "aidos-btn",
        disabled: saving,
        onClick: () => {
          beginEdit(key, text);
        }
      },
      "Edit"
    )), editing === key ? renderEditControls(key) : /* @__PURE__ */ import_react23.default.createElement("pre", { className: "aidos-plan-meta-text" }, text === "" ? "(empty)" : text));
  }
  function renderSectionBlock(position, heading, text) {
    const open = expanded.includes(position);
    return /* @__PURE__ */ import_react23.default.createElement("div", { className: "aidos-plan-meta-block", key: position }, /* @__PURE__ */ import_react23.default.createElement("div", { className: "aidos-plan-meta-block-head" }, /* @__PURE__ */ import_react23.default.createElement(
      "button",
      {
        className: "aidos-plan-meta-toggle",
        onClick: () => {
          toggleSection(position);
        }
      },
      /* @__PURE__ */ import_react23.default.createElement("span", { "aria-hidden": "true" }, open ? "\u25BE" : "\u25B8"),
      heading
    ), /* @__PURE__ */ import_react23.default.createElement(
      "button",
      {
        className: "aidos-btn",
        disabled: saving,
        onClick: () => {
          beginEdit(position, text);
        }
      },
      "Edit"
    )), editing === position || open ? editing === position ? renderEditControls(position) : /* @__PURE__ */ import_react23.default.createElement("pre", { className: "aidos-plan-meta-text" }, text === "" ? "(empty)" : text) : null);
  }
  const meta = props.planMeta;
  return /* @__PURE__ */ import_react23.default.createElement(
    "div",
    {
      className: "aidos-modal-mask",
      onClick: () => {
        if (!saving) props.onClose();
      }
    },
    /* @__PURE__ */ import_react23.default.createElement(
      "div",
      {
        className: "aidos-plan-meta-modal",
        onClick: (event) => {
          event.stopPropagation();
        }
      },
      /* @__PURE__ */ import_react23.default.createElement("div", { className: "aidos-modal-head" }, /* @__PURE__ */ import_react23.default.createElement("h3", { className: "aidos-modal-title" }, "Plan"), /* @__PURE__ */ import_react23.default.createElement(
        "button",
        {
          className: "aidos-close-btn",
          onClick: () => {
            if (!saving) props.onClose();
          },
          "aria-label": "Close"
        },
        "\xD7"
      )),
      meta === null ? /* @__PURE__ */ import_react23.default.createElement("p", { className: "aidos-plan-meta-note" }, "This project holds no plan yet.") : /* @__PURE__ */ import_react23.default.createElement("div", { className: "aidos-plan-meta-blocks" }, renderNamedBlock("frontmatter", "Frontmatter", meta.frontmatter), renderNamedBlock("preamble", "Preamble", meta.preamble), meta.contextSections.map(
        (section, position) => renderSectionBlock(position, section.heading, section.text)
      ))
    )
  );
}

// src/client/queue-panel.tsx
var import_react25 = __toESM(require("react"), 1);

// src/client/human-queue.ts
var HUMAN_ACTIONS = /* @__PURE__ */ new Set([
  "signoff",
  "verify",
  "mark-done"
]);
var QUEUE_PROMPTS = {
  signoff: "Sign off to let the agent start work",
  verify: "Verify the work and attach your row",
  "mark-done": "Verified \u2014 mark it done"
};
function derivedQueue(tickets, evidenceKindsOf) {
  const entries = [];
  for (const ticket of tickets) {
    if (ticket.state === "done") continue;
    const kinds = evidenceKindsOf(ticket);
    const available = actionsFor(ticket, kinds).filter(
      (action) => HUMAN_ACTIONS.has(action.id) && action.unavailableReason === void 0
    );
    const ids = new Set(available.map((a) => a.id));
    for (const action of available) {
      if (action.id === "verify" && ids.has("mark-done")) continue;
      entries.push({
        ticket,
        boardKey: boardKeyOf(ticket),
        actionId: action.id,
        label: action.label,
        prompt: QUEUE_PROMPTS[action.id] ?? action.label
      });
    }
  }
  return entries;
}
function humanQueue(tickets, evidenceKindsOf, nominations = [], sortKey = "suggested", approvals = []) {
  const entries = derivedQueue(tickets, evidenceKindsOf);
  for (const approval of approvals) {
    const key = String(approval.ticketId);
    const ticket = tickets.find((t) => boardKeyOf(t) === key);
    if (ticket === void 0) continue;
    const paths = Array.isArray(approval.payload?.paths) ? approval.payload.paths.filter(
      (p) => typeof p === "string"
    ) : [];
    entries.push({
      ticket,
      boardKey: boardKeyOf(ticket),
      actionId: "allowlist",
      label: "Review request",
      prompt: approval.prompt + (paths.length > 0 ? ` \u2014 ${paths.length} path(s)` : ""),
      approvalId: approval.id,
      approvalPaths: paths
    });
  }
  for (const nomination of nominations) {
    const key = String(nomination.ticketId);
    const match = entries.find(
      (entry) => entry.boardKey === key && entry.actionId === nomination.actionId
    );
    if (match === void 0) continue;
    match.nominationReason = nomination.reason;
    match.nominationId = nomination.id;
  }
  return sortQueue(entries, sortKey);
}
var QUEUE_SORT_LABELS = {
  suggested: "Suggested first",
  recent: "Recently updated",
  id: "Ticket id",
  alpha: "Title A\u2013Z"
};
function sortQueue(entries, sortKey = "suggested") {
  const rows = [...entries];
  switch (sortKey) {
    case "recent":
      return rows.sort(
        (a, b2) => b2.ticket.updatedAt - a.ticket.updatedAt || a.ticket.id - b2.ticket.id
      );
    case "id":
      return rows.sort((a, b2) => a.ticket.id - b2.ticket.id);
    case "alpha":
      return rows.sort(
        (a, b2) => a.ticket.title.localeCompare(b2.ticket.title) || a.ticket.id - b2.ticket.id
      );
    case "suggested":
    default:
      return rows.sort((a, b2) => {
        const aApproval = a.approvalId !== void 0 ? 0 : 1;
        const bApproval = b2.approvalId !== void 0 ? 0 : 1;
        if (aApproval !== bApproval) return aApproval - bApproval;
        const aNominated = a.nominationReason !== void 0 ? 0 : 1;
        const bNominated = b2.nominationReason !== void 0 ? 0 : 1;
        if (aNominated !== bNominated) return aNominated - bNominated;
        return a.ticket.phase - b2.ticket.phase || a.ticket.order - b2.ticket.order;
      });
  }
}
var ACTION_STATE = {
  signoff: "open",
  verify: "awaiting_verification",
  "mark-done": "awaiting_verification"
};
var STATE_SEQUENCE = ["open", "in_progress", "awaiting_verification", "done"];
function unmatchedNominations(tickets, evidenceKindsOf, nominations) {
  const entries = derivedQueue(tickets, evidenceKindsOf);
  const out = [];
  for (const nomination of nominations) {
    const key = String(nomination.ticketId);
    if (entries.some((e) => e.boardKey === key && e.actionId === nomination.actionId)) {
      continue;
    }
    const ticket = tickets.find((t) => boardKeyOf(t) === key);
    if (ticket === void 0) {
      out.push({
        nomination,
        kind: "not-on-board",
        reason: "#" + key + " is not on this board (it may belong to another session)"
      });
      continue;
    }
    const wanted = ACTION_STATE[nomination.actionId];
    const wantedAt = wanted === void 0 ? -1 : STATE_SEQUENCE.indexOf(wanted);
    const isAt = STATE_SEQUENCE.indexOf(ticket.state);
    if (wantedAt >= 0 && isAt > wantedAt) {
      out.push({
        nomination,
        kind: "fulfilled",
        reason: "#" + key + " is already " + ticket.state + "; the ask was answered"
      });
      continue;
    }
    out.push({
      nomination,
      kind: "unavailable",
      reason: "#" + key + " has no available " + nomination.actionId + " action right now"
    });
  }
  return out;
}

// src/client/approval-runner.tsx
var import_react24 = __toESM(require("react"), 1);
function initialValue(step) {
  switch (step.kind) {
    case "confirm":
      return { kind: "confirm", note: "" };
    case "path-list":
      return { kind: "path-list", paths: [...step.paths] };
    case "criteria-checklist": {
      const selected = step.selected ?? step.criteria.map((_criterion, index) => index);
      return {
        kind: "criteria-checklist",
        criteria: [...selected].sort((a, b2) => a - b2).map((index) => step.criteria[index]).filter((c) => typeof c === "string")
      };
    }
    case "dependency-picker":
      return { kind: "dependency-picker", ticketIds: [...step.selected ?? []] };
  }
}
function isAmended(steps, values) {
  return steps.some((step, index) => {
    const before = initialValue(step);
    const after = values[index];
    if (after === void 0) return false;
    if (before.kind === "confirm" || after.kind === "confirm") return false;
    return JSON.stringify(before) !== JSON.stringify(after);
  });
}
function ApprovalRunner(props) {
  const steps = props.steps;
  const [index, setIndex] = import_react24.default.useState(0);
  const [values, setValues] = import_react24.default.useState(
    () => steps.map(initialValue)
  );
  const step = steps[index];
  const value = values[index];
  const last = index === steps.length - 1;
  const working = props.working === true;
  const update = (next) => {
    setValues((previous) => {
      const copy = [...previous];
      copy[index] = next;
      return copy;
    });
  };
  const advance = () => {
    if (!last) {
      setIndex(index + 1);
      return;
    }
    props.onResolve({
      status: isAmended(steps, values) ? "amended" : "approved",
      values
    });
  };
  if (step === void 0 || value === void 0) return null;
  return /* @__PURE__ */ import_react24.default.createElement(
    ModalShell,
    {
      title: steps.length > 1 ? props.title + " (" + (index + 1) + "/" + steps.length + ")" : props.title,
      working,
      onClose: props.onClose
    },
    /* @__PURE__ */ import_react24.default.createElement("div", { className: "aidos-runner-step" }, /* @__PURE__ */ import_react24.default.createElement("h4", { className: "aidos-runner-step-title" }, step.title), step.prompt !== void 0 ? /* @__PURE__ */ import_react24.default.createElement("p", { className: "aidos-runner-step-prompt" }, step.prompt) : null, /* @__PURE__ */ import_react24.default.createElement(StepBody, { step, value, working, onChange: update })),
    /* @__PURE__ */ import_react24.default.createElement("div", { className: "aidos-form-actions" }, /* @__PURE__ */ import_react24.default.createElement(
      "button",
      {
        className: "aidos-btn",
        disabled: working,
        onClick: props.onClose
      },
      "Cancel"
    ), /* @__PURE__ */ import_react24.default.createElement(
      "button",
      {
        className: "aidos-btn aidos-btn-danger",
        disabled: working,
        title: "Answer no. The agent is told and the request is resolved.",
        "data-dsh-tip": "",
        onClick: () => {
          props.onResolve({ status: "rejected" });
        }
      },
      "Reject"
    ), index > 0 ? /* @__PURE__ */ import_react24.default.createElement(
      "button",
      {
        className: "aidos-btn",
        disabled: working,
        onClick: () => {
          setIndex(index - 1);
        }
      },
      "Back"
    ) : null, /* @__PURE__ */ import_react24.default.createElement("button", { className: "aidos-btn aidos-btn-primary", disabled: working, onClick: advance }, working ? "Working\u2026" : last ? "Confirm" : "Next"))
  );
}
function StepBody(props) {
  const { step, value, working, onChange } = props;
  if (step.kind === "confirm" && value.kind === "confirm") {
    return /* @__PURE__ */ import_react24.default.createElement(import_react24.default.Fragment, null, /* @__PURE__ */ import_react24.default.createElement(
      NoteField,
      {
        label: step.noteLabel ?? "Note (optional)",
        value: value.note,
        working,
        onChange: (note) => {
          onChange({ ...value, note });
        }
      }
    ), step.criteria !== void 0 && step.criteria.length > 0 ? /* @__PURE__ */ import_react24.default.createElement("div", { className: "aidos-modal-row" }, /* @__PURE__ */ import_react24.default.createElement("label", null, "Link to a criterion (optional)"), /* @__PURE__ */ import_react24.default.createElement(
      "select",
      {
        className: "aidos-select",
        value: value.criterion ?? "",
        disabled: working,
        onChange: (event) => {
          const criterion = event.target.value;
          onChange({
            ...value,
            criterion: criterion === "" ? void 0 : criterion
          });
        }
      },
      /* @__PURE__ */ import_react24.default.createElement("option", { value: "" }, "\u2014 none \u2014"),
      step.criteria.map((criterion) => /* @__PURE__ */ import_react24.default.createElement("option", { key: criterion, value: criterion }, criterion))
    )) : null);
  }
  if (step.kind === "path-list" && value.kind === "path-list") {
    return /* @__PURE__ */ import_react24.default.createElement(
      LinesField,
      {
        label: step.label ?? "Paths (one per line)",
        value: value.paths.join("\n"),
        working,
        onChange: (text) => {
          onChange({ kind: "path-list", paths: linesOf(text) });
        }
      }
    );
  }
  if (step.kind === "criteria-checklist" && value.kind === "criteria-checklist") {
    const chosen = new Set(value.criteria);
    return /* @__PURE__ */ import_react24.default.createElement("ul", { className: "aidos-runner-checklist" }, step.criteria.map((criterion) => /* @__PURE__ */ import_react24.default.createElement("li", { key: criterion }, /* @__PURE__ */ import_react24.default.createElement("label", null, /* @__PURE__ */ import_react24.default.createElement(
      "input",
      {
        type: "checkbox",
        checked: chosen.has(criterion),
        disabled: working,
        onChange: () => {
          const next = new Set(chosen);
          if (next.has(criterion)) next.delete(criterion);
          else next.add(criterion);
          onChange({
            kind: "criteria-checklist",
            criteria: step.criteria.filter((c) => next.has(c))
          });
        }
      }
    ), /* @__PURE__ */ import_react24.default.createElement("span", null, criterion)))));
  }
  if (step.kind === "dependency-picker" && value.kind === "dependency-picker") {
    const chosen = new Set(value.ticketIds);
    return /* @__PURE__ */ import_react24.default.createElement("ul", { className: "aidos-ticket-strips" }, step.candidates.map((candidate) => {
      const id = String(candidate.id);
      return /* @__PURE__ */ import_react24.default.createElement(
        TicketStrip,
        {
          key: id,
          ticket: candidate,
          meta: chosen.has(id) ? "will be proposed as a dependency" : void 0,
          highlighted: chosen.has(id),
          actions: /* @__PURE__ */ import_react24.default.createElement(
            "button",
            {
              className: "aidos-btn",
              disabled: working,
              onClick: () => {
                const next = new Set(chosen);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                onChange({
                  kind: "dependency-picker",
                  ticketIds: step.candidates.map((c) => String(c.id)).filter((c) => next.has(c))
                });
              }
            },
            chosen.has(id) ? "Remove" : "Add"
          )
        }
      );
    }));
  }
  return null;
}

// src/client/queue-panel.tsx
function stepsFor(entry) {
  const criteria = entry.actionId === "verify" ? parseCriteria(entry.ticket.criteria ?? "") : [];
  const titles = {
    signoff: "Sign off on " + entry.ticket.title,
    verify: "Verify " + entry.ticket.title,
    "mark-done": "Mark " + entry.ticket.title + " done"
  };
  const prompts = {
    signoff: "Signing off moves this to in progress and grants the agent write access inside its allowlist.",
    verify: "Attaches your user_verified row. It does not move the ticket.",
    "mark-done": "This is the final state. Only you can set it."
  };
  if (entry.approvalId !== void 0) {
    return [
      {
        kind: "path-list",
        title: "Approve file access for " + entry.ticket.title,
        prompt: "The agent proposed these paths. Edit or remove any of them; approving grants write access to exactly this list.",
        label: "Paths (one per line)",
        paths: entry.approvalPaths ?? []
      }
    ];
  }
  return [
    {
      kind: "confirm",
      title: titles[entry.actionId] ?? entry.label,
      prompt: prompts[entry.actionId],
      noteLabel: "Note (optional)",
      criteria: criteria.length > 0 ? criteria : void 0
    }
  ];
}
var ACTION_ICONS = {
  signoff: {
    icon: /* @__PURE__ */ import_react25.default.createElement(SignoffIcon, null),
    hint: "Sign off \u2014 let the agent start work on this ticket",
    tone: "signoff"
  },
  verify: {
    icon: /* @__PURE__ */ import_react25.default.createElement(VerifyIcon, null),
    hint: "Verify \u2014 check the work and attach your row",
    tone: "verify"
  },
  "mark-done": {
    icon: /* @__PURE__ */ import_react25.default.createElement(MarkDoneIcon, null),
    hint: "Mark done \u2014 close this ticket",
    tone: "done"
  },
  allowlist: {
    icon: /* @__PURE__ */ import_react25.default.createElement(AllowlistIcon, null),
    hint: "Review a write-access request",
    tone: "allowlist"
  }
};
function entryKey(entry) {
  return entry.boardKey + "\0" + entry.actionId + (entry.approvalId !== void 0 ? "\0" + entry.approvalId : "");
}
function QueuePanel(props) {
  const [openRow, setOpenRow] = import_react25.default.useState(null);
  const [running, setRunning] = import_react25.default.useState(null);
  const [working, setWorking] = import_react25.default.useState(false);
  const [sortKey, setSortKey] = import_react25.default.useState("suggested");
  const [answered, setAnswered] = import_react25.default.useState(/* @__PURE__ */ new Set());
  const entries = humanQueue(
    props.tickets,
    // The BOARD key, not the bare id: a foreign ticket's evidence is filed
    // under `sourceSessionId:id`, so String(ticket.id) read the wrong rows.
    (ticket) => (props.evidenceByTicket[boardKeyOf(ticket)] ?? []).map((row) => row.kind),
    props.nominations ?? [],
    sortKey,
    props.approvals ?? []
  );
  const visible = entries.filter((entry) => !answered.has(entryKey(entry)));
  const suggested = visible.filter((e) => e.nominationReason !== void 0).length;
  const unmatched = unmatchedNominations(
    props.tickets,
    (ticket) => (props.evidenceByTicket[boardKeyOf(ticket)] ?? []).map((row) => row.kind),
    props.nominations ?? []
  );
  if (props.error != null && props.error !== "") {
    return /* @__PURE__ */ import_react25.default.createElement("div", { className: "aidos-queue" }, /* @__PURE__ */ import_react25.default.createElement("p", { className: "aidos-queue-empty" }, "Could not load the queue: " + props.error), props.onRefresh !== void 0 ? /* @__PURE__ */ import_react25.default.createElement("button", { className: "aidos-btn", onClick: props.onRefresh }, "Retry") : null);
  }
  if (visible.length === 0) {
    return /* @__PURE__ */ import_react25.default.createElement("div", { className: "aidos-queue" }, /* @__PURE__ */ import_react25.default.createElement("p", { className: "aidos-queue-empty" }, "Nothing is waiting on you. Every ticket is either with the agent or done."));
  }
  return /* @__PURE__ */ import_react25.default.createElement("div", { className: "aidos-queue" }, /* @__PURE__ */ import_react25.default.createElement("div", { className: "aidos-queue-head" }, /* @__PURE__ */ import_react25.default.createElement("span", { className: "aidos-queue-count" }, visible.length + (visible.length === 1 ? " ask" : " asks"), suggested > 0 ? " \xB7 " + suggested + " suggested by the agent" : ""), /* @__PURE__ */ import_react25.default.createElement("label", { className: "aidos-queue-sort" }, /* @__PURE__ */ import_react25.default.createElement("span", null, "Sort"), /* @__PURE__ */ import_react25.default.createElement(
    "select",
    {
      className: "aidos-select",
      value: sortKey,
      onChange: (event) => {
        setSortKey(event.target.value);
      }
    },
    Object.keys(QUEUE_SORT_LABELS).map((key) => /* @__PURE__ */ import_react25.default.createElement("option", { key, value: key }, QUEUE_SORT_LABELS[key]))
  ))), unmatched.length > 0 ? /* @__PURE__ */ import_react25.default.createElement("ul", { className: "aidos-queue-unmatched" }, unmatched.map((row) => /* @__PURE__ */ import_react25.default.createElement("li", { key: row.nomination.id }, "The agent suggested " + row.nomination.actionId + " but it is not shown: " + row.reason))) : null, /* @__PURE__ */ import_react25.default.createElement("ul", { className: "aidos-ticket-strips" }, visible.map((entry) => /* @__PURE__ */ import_react25.default.createElement(
    TicketStrip,
    {
      key: entryKey(entry),
      actionIcon: ACTION_ICONS[entry.actionId]?.icon,
      actionHint: ACTION_ICONS[entry.actionId]?.hint,
      expanded: openRow === entryKey(entry),
      onToggleActions: () => {
        const id = entryKey(entry);
        setOpenRow(openRow === id ? null : id);
      },
      ticket: entry.ticket,
      highlighted: entry.nominationReason !== void 0 || entry.approvalId !== void 0,
      awaitingApproval: entry.approvalId !== void 0,
      meta: entry.nominationReason !== void 0 ? /* @__PURE__ */ import_react25.default.createElement("span", { className: "aidos-queue-reason" }, "the agent asks: " + entry.nominationReason) : entry.prompt,
      onOpen: () => {
        props.onOpen(entry);
      },
      actions: /* @__PURE__ */ import_react25.default.createElement(import_react25.default.Fragment, null, entry.nominationId !== void 0 && props.onDismiss !== void 0 ? /* @__PURE__ */ import_react25.default.createElement(
        "button",
        {
          className: "aidos-btn",
          title: "Drop this suggestion without acting on it",
          "data-dsh-tip": "",
          onClick: () => {
            props.onDismiss?.(entry.nominationId);
          }
        },
        "Dismiss"
      ) : null, /* @__PURE__ */ import_react25.default.createElement(
        "button",
        {
          className: "aidos-btn aidos-btn-primary",
          onClick: () => {
            setRunning(entry);
          }
        },
        entry.label
      ))
    }
  ))), running !== null ? /* @__PURE__ */ import_react25.default.createElement(
    ApprovalRunner,
    {
      title: running.label,
      steps: stepsFor(running),
      working,
      onClose: () => {
        if (!working) setRunning(null);
      },
      onResolve: (outcome) => {
        if (outcome.status === "rejected") {
          if (running.approvalId === void 0) {
            setRunning(null);
            return;
          }
        }
        setWorking(true);
        void props.onAct(running, outcome).then(() => {
          setWorking(false);
          setAnswered(function(previous) {
            const next = new Set(previous);
            next.add(entryKey(running));
            return next;
          });
          setRunning(null);
        }).catch(() => {
          setWorking(false);
        });
      }
    }
  ) : null);
}
function queueEntriesFor(tickets, evidenceByTicket, nominations = []) {
  return humanQueue(
    tickets,
    (ticket) => (evidenceByTicket[boardKeyOf(ticket)] ?? []).map((row) => row.kind),
    nominations
  );
}

// src/client/active-ticket.ts
function activeTicketRow(tickets) {
  let active = null;
  for (const ticket of tickets) {
    if (ticket.state !== "in_progress") continue;
    if (active === null || ticket.updatedAt > active.updatedAt) {
      active = ticket;
    }
  }
  return active;
}

// src/client/toast.tsx
var import_react26 = __toESM(require("react"), 1);
function ToastRow(props) {
  const toast = props.toast;
  return /* @__PURE__ */ import_react26.default.createElement("div", { className: "aidos-toast aidos-toast-" + toast.kind }, /* @__PURE__ */ import_react26.default.createElement("span", { className: "aidos-toast-text" }, toast.text), /* @__PURE__ */ import_react26.default.createElement(
    "button",
    {
      className: "aidos-toast-dismiss",
      onClick: () => {
        dismissToast(toast.id);
      },
      "aria-label": "Dismiss notification"
    },
    "\xD7"
  ));
}
function ToastContainer() {
  const [toasts2, setToasts] = import_react26.default.useState([]);
  import_react26.default.useEffect(
    function() {
      return subscribeToasts(setToasts);
    },
    []
  );
  return /* @__PURE__ */ import_react26.default.createElement("div", { className: "aidos-toast-stack" }, toasts2.map(function(toast) {
    return /* @__PURE__ */ import_react26.default.createElement(ToastRow, { key: toast.id, toast });
  }));
}

// src/client/local-ticket-view.tsx
function filterStorageKey(workspaceKey) {
  return "aidos:board:local:filter:" + workspaceKey;
}
function intersectProjectIds(stored, tickets) {
  if (stored === null) return null;
  const present = /* @__PURE__ */ new Set();
  for (const ticket of tickets) present.add(ticket.projectId);
  const kept = stored.filter((id) => present.has(id));
  if (kept.length === present.size) return null;
  return kept;
}
function restoreFilter(workspaceKey, tickets) {
  try {
    const raw = window.localStorage.getItem(filterStorageKey(workspaceKey));
    if (raw === null) return cloneAppliedState(DEFAULT_APPLIED);
    const parsed = JSON.parse(raw);
    const stateIds = Array.isArray(parsed.stateIds) ? parsed.stateIds.filter(
      (state) => STATE_CHECKLIST_ORDER.includes(state)
    ) : [...DEFAULT_APPLIED.stateIds];
    const projectIds = Array.isArray(parsed.projectIds) ? intersectProjectIds(
      parsed.projectIds.filter((id) => typeof id === "number"),
      tickets
    ) : null;
    const sortKey = parsed.sortKey === "confidence" || parsed.sortKey === "gates" || parsed.sortKey === "time" || parsed.sortKey === "alpha" ? parsed.sortKey : "confidence";
    return {
      projectIds,
      stateIds,
      sortKey,
      descending: typeof parsed.descending === "boolean" ? parsed.descending : true,
      search: typeof parsed.search === "string" ? parsed.search : ""
    };
  } catch {
    return cloneAppliedState(DEFAULT_APPLIED);
  }
}
function ticketIdFromSearch(search) {
  const match = /[?&]ticket=(\d+)/.exec(search);
  if (match === null) return null;
  return Number(match[1]);
}
function setTicketParam(id) {
  const url = new URL(window.location.href);
  if (id === null) {
    url.searchParams.delete("ticket");
    window.history.replaceState({}, "", url);
  } else {
    url.searchParams.set("ticket", String(id));
    window.history.pushState({}, "", url);
  }
}
function useTopChromeClearance(ref) {
  import_react27.default.useEffect(function() {
    const node = ref.current;
    if (node === null || typeof window === "undefined") return;
    let frame = 0;
    const timers2 = [];
    const measure = () => {
      frame = 0;
      const box = node.getBoundingClientRect();
      let chromeBottom = 0;
      const consider = (element) => {
        const rect = element.getBoundingClientRect();
        if (rect.height === 0 || rect.bottom <= 0) return;
        if (rect.top > box.top + 4) return;
        if (rect.bottom > chromeBottom) chromeBottom = rect.bottom;
      };
      document.querySelectorAll(".bmu-topbar, [data-bmu-topbar]").forEach(function(bar) {
        consider(bar);
        for (const child of Array.from(bar.children)) consider(child);
      });
      if (box.width > 0 && typeof document.elementsFromPoint === "function") {
        const stack = document.elementsFromPoint(box.left + box.width / 2, box.top + 2);
        for (const element of stack) {
          if (element === node || node.contains(element)) break;
          const position = window.getComputedStyle(element).position;
          if (position === "fixed" || position === "sticky") consider(element);
        }
      }
      const overlap = Math.max(0, Math.round(chromeBottom - box.top));
      node.style.setProperty("--aidos-top-clearance", `${overlap}px`);
      node.style.setProperty("--aidos-top-chrome", `${Math.max(0, Math.round(chromeBottom))}px`);
    };
    const schedule = () => {
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(measure);
    };
    measure();
    for (const delay of [120, 600, 1600]) {
      timers2.push(window.setTimeout(schedule, delay));
    }
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    const viewport = window.visualViewport;
    if (viewport) viewport.addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(node);
    return function() {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      for (const timer of timers2) window.clearTimeout(timer);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      if (viewport) viewport.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, [ref]);
}
function LocalTicketView(props) {
  const [retryNonce, setRetryNonce] = import_react27.default.useState(0);
  import_react27.default.useEffect(function() {
    logDebug("board view mounted");
  }, []);
  import_react27.default.useEffect(
    function() {
      if (retryNonce > 0) {
        logWarn(
          `#100 REMOUNT: retryNonce -> ${retryNonce}; ProjectionReader state (selection included) was destroyed`
        );
      }
    },
    [retryNonce]
  );
  return /* @__PURE__ */ import_react27.default.createElement(
    ProjectionReader,
    {
      key: retryNonce,
      sessionId: props.sessionId,
      useProjection: props.useProjection,
      onRetry: () => {
        logWarn("#100 onRetry called -> forcing a remount");
        setRetryNonce((n) => n + 1);
      }
    }
  );
}
function ProjectionReader(props) {
  const sessionId = props.sessionId;
  const ticketsProjection = props.useProjection("aidos.tickets");
  const evidenceProjection = props.useProjection("aidos.evidence");
  const commentsProjection = props.useProjection("aidos.comments");
  const planProjection = props.useProjection("aidos.plan");
  const loaded = ticketsProjection !== void 0 && evidenceProjection !== void 0 && commentsProjection !== void 0;
  const ownProjectId = Object.values(ticketsProjection ?? {})[0]?.projectId ?? null;
  const ownPlan = ownProjectId === null ? null : (planProjection ?? {})[String(ownProjectId)] ?? null;
  const [merge, setMergeState] = import_react27.default.useState(() => getMerge(sessionId));
  const [mergePending, setMergePending] = import_react27.default.useState(() => isMergePulling(sessionId) && getMerge(sessionId) === null);
  const ownVersion = ticketsProjection === void 0 ? null : JSON.stringify(ticketsProjection).length + ":" + Object.keys(ticketsProjection).length;
  import_react27.default.useEffect(function() {
    if (!loaded || ownVersion === null) return;
    if (getPulledVersion(sessionId) === ownVersion) return;
    setMergePending(getMerge(sessionId) === null);
    let cancelled = false;
    const pull = async function() {
      try {
        const result = await callAidosRemote("workspaceTickets", {}, sessionId);
        setMerge(sessionId, result);
        setMergePulling(sessionId, false);
        setPulledVersion(sessionId, ownVersion);
        if (cancelled) return;
        setMergeState(result);
        setMergePending(false);
      } catch {
        setMergePulling(sessionId, false);
        if (cancelled) return;
        setMergePending(false);
      }
    };
    void pull();
    return function() {
      cancelled = true;
    };
  }, [loaded, sessionId, ownVersion]);
  const ownRows = Object.values(ticketsProjection ?? {}).map(
    (row) => ({ ...row, sourceSessionId: sessionId, foreign: false })
  );
  const foreignRows = merge !== null ? merge.tickets.filter((row) => row.sourceSessionId !== sessionId) : [];
  const ownWorkspaceKey = ownRows.length > 0 ? ownRows[0].workspaceKey : void 0;
  const boardTickets = [
    ...ownRows,
    ...foreignRows
  ];
  const rawTickets = boardTickets;
  publishTicketTitles(rawTickets);
  const ownEvidence = evidenceProjection ?? {};
  const ownComments = commentsProjection ?? {};
  const foreignEvidence = {};
  const foreignComments = {};
  if (merge !== null) {
    for (const [key, value] of Object.entries(merge.evidence)) {
      if (!key.startsWith(sessionId + ":")) foreignEvidence[key] = value;
    }
    for (const [key, value] of Object.entries(merge.comments)) {
      if (!key.startsWith(sessionId + ":")) foreignComments[key] = value;
    }
  }
  const rawEvidence = { ...foreignEvidence, ...ownEvidence };
  const rawComments = { ...foreignComments, ...ownComments };
  const allTicketsCount = rawTickets.length;
  const rawWsSet = new Set(rawTickets.map((ticket) => ticket.workspaceKey));
  const workspaceKey = rawTickets.length === 0 ? "default" : rawWsSet.size === 1 ? rawTickets[0].workspaceKey : `default:${sessionId}`;
  const [applied, setAppliedStateLocal] = import_react27.default.useState(function() {
    return cloneAppliedState(DEFAULT_APPLIED);
  });
  const [selectedKeyRaw, setSelectedKeyRaw] = import_react27.default.useState(function() {
    const stored = getSelection(sessionId);
    return stored === null ? null : asBoardKey(stored);
  });
  const selectedKey = selectedKeyRaw;
  const setSelectedKey = import_react27.default.useCallback(
    function(next) {
      setSelection(sessionId, next);
      setSelectedKeyRaw(next);
    },
    [sessionId]
  );
  import_react27.default.useEffect(
    function() {
      return onSelectionChanged(function(changed) {
        if (changed !== sessionId) return;
        const stored = getSelection(sessionId);
        setSelectedKeyRaw(stored === null ? null : asBoardKey(stored));
      });
    },
    [sessionId]
  );
  const [createOpen, setCreateOpen] = import_react27.default.useState(false);
  const [planOpen, setPlanOpen] = import_react27.default.useState(false);
  const [queueOpen, setQueueOpen] = import_react27.default.useState(false);
  const [nominations, setNominations] = import_react27.default.useState([]);
  const [approvals, setApprovals] = import_react27.default.useState([]);
  const ownBoardKeys = new Set(ownRows.map((row) => boardKeyOf(row)));
  const awaitingApprovalKeys = new Set(
    approvals.map((approval) => String(approval.ticketId)).filter((key) => ownBoardKeys.has(key))
  );
  const [queueError, setQueueError] = import_react27.default.useState(null);
  const refreshNominations = import_react27.default.useCallback(
    function() {
      setQueueError(null);
      void callAidosRemote("actionNominations", {}, sessionId).then((rows) => {
        setNominations(rows ?? []);
      }).catch((error2) => {
        setNominations([]);
        const detail = "nominations: " + (error2 instanceof Error ? error2.message : String(error2));
        setQueueError((prev) => prev == null ? detail : prev + "; " + detail);
      });
      void callAidosRemote("pendingApprovals", {}, sessionId).then((rows) => {
        setApprovals(rows ?? []);
      }).catch((error2) => {
        setApprovals([]);
        const detail = "approvals: " + (error2 instanceof Error ? error2.message : String(error2));
        setQueueError((prev) => prev == null ? detail : prev + "; " + detail);
      });
    },
    [sessionId]
  );
  import_react27.default.useEffect(
    function() {
      if (!queueOpen) return;
      const timer = setInterval(refreshNominations, 4e3);
      return function() {
        clearInterval(timer);
      };
    },
    [queueOpen, refreshNominations]
  );
  const [errorTimedOut, setErrorTimedOut] = import_react27.default.useState(false);
  const deepLinkHandled = import_react27.default.useRef(false);
  const restoredRef = import_react27.default.useRef(false);
  const layoutRef = import_react27.default.useRef(null);
  useTopChromeClearance(layoutRef);
  const count = openCount(rawTickets);
  import_react27.default.useEffect(
    function() {
      if (!loaded) return;
      reportCount(sessionId, count);
    },
    [sessionId, loaded, count]
  );
  import_react27.default.useEffect(
    function() {
      if (!loaded) return;
      logDebug("board loaded: " + allTicketsCount + " tickets");
    },
    [loaded]
  );
  import_react27.default.useEffect(
    function() {
      if (!loaded) return;
      if (restoredRef.current) return;
      restoredRef.current = true;
      const restored = restoreFilter(workspaceKey, rawTickets);
      setAppliedStateLocal(restored);
      setAppliedState(sessionId, restored);
    },
    [loaded, workspaceKey]
  );
  import_react27.default.useEffect(
    function() {
      if (!loaded) return;
      if (deepLinkHandled.current) return;
      deepLinkHandled.current = true;
      const id = ticketIdFromSearch(window.location.search);
      if (id === null) return;
      const row = rawTickets.find((ticket) => ticket.id === id);
      if (row !== void 0) {
        setSelectedKey(boardKeyOf(row));
      } else {
        showToast("Ticket " + id + " not found", "info");
      }
    },
    [loaded]
  );
  import_react27.default.useEffect(function() {
    logDebug("#100 ProjectionReader MOUNTED");
    console.info("[aidos] board MOUNT");
    return function() {
      const had = new URL(window.location.href).searchParams.has("ticket");
      logWarn(
        `#100 ProjectionReader UNMOUNTING; ticket param present=${had}` + (had ? " -> STRIPPING IT (the deep link that could restore the selection)" : "")
      );
      if (had) setTicketParam(null);
      console.info("[aidos] board UNMOUNT <- if you see this when opening the queue, it is a remount");
    };
  }, []);
  import_react27.default.useEffect(
    function() {
      if (loaded) {
        setErrorTimedOut(false);
        return;
      }
      const timer = window.setTimeout(function() {
        setErrorTimedOut(true);
      }, 5e3);
      return function() {
        window.clearTimeout(timer);
      };
    },
    [loaded]
  );
  const error = errorTimedOut && !loaded ? /* @__PURE__ */ import_react27.default.createElement("div", { className: "aidos-error" }, /* @__PURE__ */ import_react27.default.createElement("span", null, "The board projection is unavailable. Retry to re-read it."), /* @__PURE__ */ import_react27.default.createElement("button", { className: "aidos-btn", onClick: props.onRetry }, "Retry")) : null;
  const filtered = filterTickets(rawTickets, applied);
  function applyState(state) {
    const next = cloneAppliedState(state);
    setAppliedStateLocal(next);
    setAppliedState(sessionId, next);
    try {
      window.localStorage.setItem(filterStorageKey(workspaceKey), JSON.stringify(next));
    } catch {
    }
  }
  function clearFilters() {
    applyState(cloneAppliedState(DEFAULT_APPLIED));
  }
  function selectTicket(key) {
    if (selectedKey === key) {
      logWarn(`#100 selectTicket(${key}) matched the open selection -> TOGGLING CLOSED`);
      closeDetail();
      return;
    }
    logDebug(`#100 selectTicket(${key})`);
    setSelectedKey(key);
    const numeric = Number(key);
    setTicketParam(Number.isInteger(numeric) ? numeric : null);
  }
  function closeDetail() {
    logWarn(
      "#100 closeDetail() called; stack: " + (new Error().stack ?? "unavailable").split("\n").slice(1, 5).join(" <- ")
    );
    setSelectedKey(null);
    setTicketParam(null);
  }
  const lastSelected = import_react27.default.useRef(null);
  const resolution = resolveSelection(rawTickets, selectedKey, lastSelected.current);
  const lastLogged = import_react27.default.useRef("");
  const shape = `${resolution.reason}|sel=${selectedKey ?? "-"}|rows=${rawTickets.length}|own=${ownRows.length}|foreign=${foreignRows.length}|ref=${lastSelected.current === null ? "null" : "held"}`;
  if (shape !== lastLogged.current && (selectedKey !== null || lastSelected.current !== null)) {
    lastLogged.current = shape;
    const noisy = resolution.reason === "gone" || resolution.reason === "held";
    (noisy ? logWarn : logDebug)(`#100 select: ${shape}`);
  }
  if (resolution.reason === "resolved" || resolution.reason === "reanchored") {
    lastSelected.current = resolution.ticket;
  } else if (resolution.reason === "none" || resolution.reason === "gone") {
    lastSelected.current = null;
  }
  const reanchoredKey = resolution.reanchorKey;
  import_react27.default.useEffect(
    function() {
      if (reanchoredKey !== null) setSelectedKey(reanchoredKey);
    },
    [reanchoredKey]
  );
  const selectedTicket = resolution.ticket;
  const selectedBoardKey = selectedTicket === null ? null : boardKeyOf(selectedTicket);
  const activeRow = activeTicketRow(rawTickets);
  const activeBoardKey = activeRow === null ? null : boardKeyOf(activeRow);
  const selectedEvidence = selectedBoardKey === null ? [] : rawEvidence[selectedBoardKey] ?? [];
  const selectedComments = selectedBoardKey === null ? [] : rawComments[selectedBoardKey] ?? [];
  const [evidenceCollapsed, setEvidenceCollapsed] = import_react27.default.useState(function() {
    return evidenceIsMany(selectedEvidence);
  });
  import_react27.default.useEffect(function() {
    setEvidenceCollapsed(evidenceIsMany(selectedEvidence));
  }, [selectedTicket?.id]);
  const ticketsByKey = /* @__PURE__ */ new Map();
  const remember = (key, view) => {
    if (!ticketsByKey.has(key)) ticketsByKey.set(key, view);
  };
  for (const view of rawTickets) {
    remember(boardKeyOf(view), view);
    remember(String(view.id), view);
    remember(view.workspaceKey + ":" + String(view.id), view);
  }
  const absentNotice = resolution.absent ? /* @__PURE__ */ import_react27.default.createElement("div", { className: "aidos-detail-absent", role: "status" }, "This ticket is not on the board right now. You are seeing the last version that loaded. Close the panel to return to the grid.") : null;
  const lastPanelKey = import_react27.default.useRef(null);
  if (selectedBoardKey !== lastPanelKey.current) {
    if (lastPanelKey.current !== null && selectedBoardKey !== null) {
      logWarn(
        `#100 DetailView KEY CHANGED ${lastPanelKey.current} -> ${selectedBoardKey}; it remounts and any open modal is destroyed`
      );
    } else if (lastPanelKey.current !== null && selectedBoardKey === null) {
      logWarn(`#100 detail panel CLOSING (was ${lastPanelKey.current})`);
    }
    lastPanelKey.current = selectedBoardKey;
  }
  const detailPanel = selectedTicket === null ? null : /* @__PURE__ */ import_react27.default.createElement(import_react27.default.Fragment, null, absentNotice, /* @__PURE__ */ import_react27.default.createElement(
    DetailView,
    {
      key: selectedBoardKey,
      ticket: selectedTicket,
      evidence: selectedEvidence,
      comments: selectedComments,
      evidenceCollapsed,
      onToggleEvidence: () => {
        setEvidenceCollapsed((v2) => !v2);
      },
      onClose: closeDetail,
      agentId: sessionId,
      ticketIdKey: selectedBoardKey ?? String(selectedTicket.id),
      onFieldSaved: function() {
      },
      ticketsByKey,
      onJump: selectTicket
    }
  ));
  const createModal = /* @__PURE__ */ import_react27.default.createElement(
    CreateTicketModal,
    {
      open: createOpen,
      onClose: () => {
        setCreateOpen(false);
      },
      onCreated: (id) => {
        selectTicket(asBoardKey(String(id)));
      },
      agentId: sessionId
    }
  );
  const mergeLoading = mergePending && rawTickets.length === 0;
  let body;
  if (error !== null) {
    body = error;
  } else if (!loaded) {
    body = /* @__PURE__ */ import_react27.default.createElement("div", { className: "aidos-skeleton-grid" }, [0, 1, 2, 3, 4, 5].map((index) => /* @__PURE__ */ import_react27.default.createElement("div", { className: "aidos-skeleton-tile", key: index })));
  } else if (mergeLoading) {
    body = /* @__PURE__ */ import_react27.default.createElement("div", { className: "aidos-merge-loading", role: "status" }, /* @__PURE__ */ import_react27.default.createElement("span", { className: "aidos-merge-spinner", "aria-hidden": "true" }), /* @__PURE__ */ import_react27.default.createElement("span", null, "Loading workspace tickets\u2026"));
  } else {
    body = /* @__PURE__ */ import_react27.default.createElement(
      TicketView,
      {
        ownWorkspaceKey,
        awaitingApprovalKeys,
        sessionId,
        tickets: filtered,
        allTicketsCount,
        applied,
        selectedId: selectedKey,
        activeTicketId: activeBoardKey,
        evidenceByTicket: rawEvidence,
        onSelect: selectTicket,
        onApply: applyState,
        onJump: selectTicket,
        onClearFilters: clearFilters,
        onPlan: () => {
          setPlanOpen(true);
        },
        onCreate: () => {
          setCreateOpen(true);
        },
        onQueue: () => {
          refreshNominations();
          setQueueOpen(true);
        },
        queueCount: queueEntriesFor(rawTickets, rawEvidence).length
      }
    );
  }
  async function performQueueAction(entry, outcome) {
    if (outcome.status === "rejected") {
      if (entry.approvalId !== void 0) {
        await callAidosRemote(
          "resolveApproval",
          { requestId: entry.approvalId, approved: false },
          sessionId
        );
        showToast("Request rejected", "info");
      }
      return;
    }
    const first = outcome.values[0];
    const note = first !== void 0 && first.kind === "confirm" ? first.note.trim() : "";
    const criterion = first !== void 0 && first.kind === "confirm" ? first.criterion : void 0;
    const payload = {};
    if (note !== "") payload.note = note;
    if (criterion !== void 0) payload.criteria = criterion;
    const ticketId = entry.boardKey;
    try {
      if (entry.approvalId !== void 0) {
        const step = outcome.values[0];
        const paths = step !== void 0 && step.kind === "path-list" ? step.paths : [];
        await callAidosRemote(
          "resolveApproval",
          { requestId: entry.approvalId, approved: true, paths },
          sessionId
        );
        showToast("Approved " + paths.length + " path(s)", "success");
        return;
      }
      if (entry.actionId === "signoff") {
        await callAidosRemote(
          "userAttachEvidence",
          { ticketId, kind: "builtin:user_signoff", payload },
          sessionId
        );
        try {
          await callAidosRemote(
            "userMoveTicket",
            { ticketId, to: "in_progress" },
            sessionId
          );
        } catch (moveError) {
          const detail = moveError instanceof Error ? moveError.message : String(moveError);
          throw new Error(
            `the signoff row was attached to #${ticketId}, but the move to in_progress failed: ${detail} \u2014 the row is already there, so move the ticket from its detail panel rather than signing off again`
          );
        }
        showToast("Signed off", "success");
      } else if (entry.actionId === "verify") {
        await callAidosRemote(
          "userAttachEvidence",
          { ticketId, kind: "builtin:user_verified", payload },
          sessionId
        );
        showToast("Verified", "success");
      } else if (entry.actionId === "mark-done") {
        await callAidosRemote("userMoveTicket", { ticketId, to: "done" }, sessionId);
        showToast("Marked done", "success");
      }
    } catch (error2) {
      showToast(error2 instanceof Error ? error2.message : String(error2), "refusal");
      throw error2;
    }
  }
  const queueModal = queueOpen ? /* @__PURE__ */ import_react27.default.createElement(
    ModalShell,
    {
      title: "Waiting on you",
      wide: true,
      onClose: () => {
        setQueueOpen(false);
      }
    },
    /* @__PURE__ */ import_react27.default.createElement(
      QueuePanel,
      {
        tickets: rawTickets,
        evidenceByTicket: rawEvidence,
        nominations,
        approvals,
        error: queueError,
        onRefresh: refreshNominations,
        onOpen: (entry) => {
          setQueueOpen(false);
          selectTicket(entry.boardKey);
        },
        onAct: async (entry, outcome) => {
          await performQueueAction(entry, outcome);
          refreshNominations();
        },
        onDismiss: (nominationId) => {
          void callAidosRemote("dismissNomination", { nominationId }, sessionId).then(() => {
            showToast("Suggestion dismissed", "info");
            refreshNominations();
          }).catch((error2) => {
            showToast(
              error2 instanceof Error ? error2.message : String(error2),
              "refusal"
            );
          });
        }
      }
    )
  ) : null;
  const planModal = /* @__PURE__ */ import_react27.default.createElement(
    PlanMetaModal,
    {
      open: planOpen,
      planMeta: ownPlan === null ? null : {
        frontmatter: ownPlan.frontmatter,
        preamble: ownPlan.context.preamble,
        contextSections: ownPlan.context.contextSections
      },
      agentId: sessionId,
      onClose: () => {
        setPlanOpen(false);
      }
    }
  );
  return /* @__PURE__ */ import_react27.default.createElement(import_react27.default.Fragment, null, /* @__PURE__ */ import_react27.default.createElement("div", { className: "aidos-layout", ref: layoutRef, "data-conversation-composer-overlay": "" }, body, detailPanel), createModal, planModal, queueModal, /* @__PURE__ */ import_react27.default.createElement(ToastContainer, null));
}

// src/client/index.ts
var import_react30 = __toESM(require("react"), 1);

// src/client/scratch-rows.tsx
var import_react28 = __toESM(require("react"), 1);

// node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/core.js
var import_core = __toESM(require_core(), 1);
var core_default = import_core.default;

// node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/bash.js
function bash(hljs) {
  const regex = hljs.regex;
  const VAR = {};
  const BRACED_VAR = {
    begin: /\$\{/,
    end: /\}/,
    contains: [
      "self",
      {
        begin: /:-/,
        contains: [VAR]
      }
      // default values
    ]
  };
  Object.assign(VAR, {
    className: "variable",
    variants: [
      { begin: regex.concat(
        /\$[\w\d#@][\w\d_]*/,
        // negative look-ahead tries to avoid matching patterns that are not
        // Perl at all like $ident$, @ident@, etc.
        `(?![\\w\\d])(?![$])`
      ) },
      BRACED_VAR
    ]
  });
  const SUBST = {
    className: "subst",
    begin: /\$\(/,
    end: /\)/,
    contains: [hljs.BACKSLASH_ESCAPE]
  };
  const COMMENT = hljs.inherit(
    hljs.COMMENT(),
    {
      match: [
        /(^|\s)/,
        /#.*$/
      ],
      scope: {
        2: "comment"
      }
    }
  );
  const HERE_DOC = {
    begin: /<<-?\s*(?=\w+)/,
    starts: { contains: [
      hljs.END_SAME_AS_BEGIN({
        begin: /(\w+)/,
        end: /(\w+)/,
        className: "string"
      })
    ] }
  };
  const QUOTE_STRING = {
    className: "string",
    begin: /"/,
    end: /"/,
    contains: [
      hljs.BACKSLASH_ESCAPE,
      VAR,
      SUBST
    ]
  };
  SUBST.contains.push(QUOTE_STRING);
  const ESCAPED_QUOTE = {
    match: /\\"/
  };
  const APOS_STRING = {
    className: "string",
    begin: /'/,
    end: /'/
  };
  const ESCAPED_APOS = {
    match: /\\'/
  };
  const ARITHMETIC = {
    begin: /\$?\(\(/,
    end: /\)\)/,
    contains: [
      {
        begin: /\d+#[0-9a-f]+/,
        className: "number"
      },
      hljs.NUMBER_MODE,
      VAR
    ]
  };
  const SH_LIKE_SHELLS = [
    "fish",
    "bash",
    "zsh",
    "sh",
    "csh",
    "ksh",
    "tcsh",
    "dash",
    "scsh"
  ];
  const KNOWN_SHEBANG = hljs.SHEBANG({
    binary: `(${SH_LIKE_SHELLS.join("|")})`,
    relevance: 10
  });
  const FUNCTION = {
    className: "function",
    begin: /\w[\w\d_]*\s*\(\s*\)\s*\{/,
    returnBegin: true,
    contains: [hljs.inherit(hljs.TITLE_MODE, { begin: /\w[\w\d_]*/ })],
    relevance: 0
  };
  const KEYWORDS3 = [
    "if",
    "then",
    "else",
    "elif",
    "fi",
    "time",
    "for",
    "while",
    "until",
    "in",
    "do",
    "done",
    "case",
    "esac",
    "coproc",
    "function",
    "select"
  ];
  const LITERALS3 = [
    "true",
    "false"
  ];
  const PATH_MODE = { match: /(\/[a-z._-]+)+/ };
  const SHELL_BUILT_INS = [
    "break",
    "cd",
    "continue",
    "eval",
    "exec",
    "exit",
    "export",
    "getopts",
    "hash",
    "pwd",
    "readonly",
    "return",
    "shift",
    "test",
    "times",
    "trap",
    "umask",
    "unset"
  ];
  const BASH_BUILT_INS = [
    "alias",
    "bind",
    "builtin",
    "caller",
    "command",
    "declare",
    "echo",
    "enable",
    "help",
    "let",
    "local",
    "logout",
    "mapfile",
    "printf",
    "read",
    "readarray",
    "source",
    "sudo",
    "type",
    "typeset",
    "ulimit",
    "unalias"
  ];
  const ZSH_BUILT_INS = [
    "autoload",
    "bg",
    "bindkey",
    "bye",
    "cap",
    "chdir",
    "clone",
    "comparguments",
    "compcall",
    "compctl",
    "compdescribe",
    "compfiles",
    "compgroups",
    "compquote",
    "comptags",
    "comptry",
    "compvalues",
    "dirs",
    "disable",
    "disown",
    "echotc",
    "echoti",
    "emulate",
    "fc",
    "fg",
    "float",
    "functions",
    "getcap",
    "getln",
    "history",
    "integer",
    "jobs",
    "kill",
    "limit",
    "log",
    "noglob",
    "popd",
    "print",
    "pushd",
    "pushln",
    "rehash",
    "sched",
    "setcap",
    "setopt",
    "stat",
    "suspend",
    "ttyctl",
    "unfunction",
    "unhash",
    "unlimit",
    "unsetopt",
    "vared",
    "wait",
    "whence",
    "where",
    "which",
    "zcompile",
    "zformat",
    "zftp",
    "zle",
    "zmodload",
    "zparseopts",
    "zprof",
    "zpty",
    "zregexparse",
    "zsocket",
    "zstyle",
    "ztcp"
  ];
  const GNU_CORE_UTILS = [
    "chcon",
    "chgrp",
    "chown",
    "chmod",
    "cp",
    "dd",
    "df",
    "dir",
    "dircolors",
    "ln",
    "ls",
    "mkdir",
    "mkfifo",
    "mknod",
    "mktemp",
    "mv",
    "realpath",
    "rm",
    "rmdir",
    "shred",
    "sync",
    "touch",
    "truncate",
    "vdir",
    "b2sum",
    "base32",
    "base64",
    "cat",
    "cksum",
    "comm",
    "csplit",
    "cut",
    "expand",
    "fmt",
    "fold",
    "head",
    "join",
    "md5sum",
    "nl",
    "numfmt",
    "od",
    "paste",
    "ptx",
    "pr",
    "sha1sum",
    "sha224sum",
    "sha256sum",
    "sha384sum",
    "sha512sum",
    "shuf",
    "sort",
    "split",
    "sum",
    "tac",
    "tail",
    "tr",
    "tsort",
    "unexpand",
    "uniq",
    "wc",
    "arch",
    "basename",
    "chroot",
    "date",
    "dirname",
    "du",
    "echo",
    "env",
    "expr",
    "factor",
    // "false", // keyword literal already
    "groups",
    "hostid",
    "id",
    "link",
    "logname",
    "nice",
    "nohup",
    "nproc",
    "pathchk",
    "pinky",
    "printenv",
    "printf",
    "pwd",
    "readlink",
    "runcon",
    "seq",
    "sleep",
    "stat",
    "stdbuf",
    "stty",
    "tee",
    "test",
    "timeout",
    // "true", // keyword literal already
    "tty",
    "uname",
    "unlink",
    "uptime",
    "users",
    "who",
    "whoami",
    "yes"
  ];
  return {
    name: "Bash",
    aliases: [
      "sh",
      "zsh"
    ],
    keywords: {
      $pattern: /\b[a-z][a-z0-9._-]+\b/,
      keyword: KEYWORDS3,
      literal: LITERALS3,
      built_in: [
        ...SHELL_BUILT_INS,
        ...BASH_BUILT_INS,
        // Shell modifiers
        "set",
        "shopt",
        ...ZSH_BUILT_INS,
        ...GNU_CORE_UTILS
      ]
    },
    contains: [
      KNOWN_SHEBANG,
      // to catch known shells and boost relevancy
      hljs.SHEBANG(),
      // to catch unknown shells but still highlight the shebang
      FUNCTION,
      ARITHMETIC,
      COMMENT,
      HERE_DOC,
      PATH_MODE,
      QUOTE_STRING,
      ESCAPED_QUOTE,
      APOS_STRING,
      ESCAPED_APOS,
      VAR
    ]
  };
}

// node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/javascript.js
var IDENT_RE = "[A-Za-z$_][0-9A-Za-z$_]*";
var KEYWORDS = [
  "as",
  // for exports
  "in",
  "of",
  "if",
  "for",
  "while",
  "finally",
  "var",
  "new",
  "function",
  "do",
  "return",
  "void",
  "else",
  "break",
  "catch",
  "instanceof",
  "with",
  "throw",
  "case",
  "default",
  "try",
  "switch",
  "continue",
  "typeof",
  "delete",
  "let",
  "yield",
  "const",
  "class",
  // JS handles these with a special rule
  // "get",
  // "set",
  "debugger",
  "async",
  "await",
  "static",
  "import",
  "from",
  "export",
  "extends",
  // It's reached stage 3, which is "recommended for implementation":
  "using"
];
var LITERALS = [
  "true",
  "false",
  "null",
  "undefined",
  "NaN",
  "Infinity"
];
var TYPES = [
  // Fundamental objects
  "Object",
  "Function",
  "Boolean",
  "Symbol",
  // numbers and dates
  "Math",
  "Date",
  "Number",
  "BigInt",
  // text
  "String",
  "RegExp",
  // Indexed collections
  "Array",
  "Float32Array",
  "Float64Array",
  "Int8Array",
  "Uint8Array",
  "Uint8ClampedArray",
  "Int16Array",
  "Int32Array",
  "Uint16Array",
  "Uint32Array",
  "BigInt64Array",
  "BigUint64Array",
  // Keyed collections
  "Set",
  "Map",
  "WeakSet",
  "WeakMap",
  // Structured data
  "ArrayBuffer",
  "SharedArrayBuffer",
  "Atomics",
  "DataView",
  "JSON",
  // Control abstraction objects
  "Promise",
  "Generator",
  "GeneratorFunction",
  "AsyncFunction",
  // Reflection
  "Reflect",
  "Proxy",
  // Internationalization
  "Intl",
  // WebAssembly
  "WebAssembly"
];
var ERROR_TYPES = [
  "Error",
  "EvalError",
  "InternalError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "TypeError",
  "URIError"
];
var BUILT_IN_GLOBALS = [
  "setInterval",
  "setTimeout",
  "clearInterval",
  "clearTimeout",
  "require",
  "exports",
  "eval",
  "isFinite",
  "isNaN",
  "parseFloat",
  "parseInt",
  "decodeURI",
  "decodeURIComponent",
  "encodeURI",
  "encodeURIComponent",
  "escape",
  "unescape"
];
var BUILT_IN_VARIABLES = [
  "arguments",
  "this",
  "super",
  "console",
  "window",
  "document",
  "localStorage",
  "sessionStorage",
  "module",
  "self",
  "global"
  // Node.js
];
var BUILT_INS = [].concat(
  BUILT_IN_GLOBALS,
  TYPES,
  ERROR_TYPES
);
function javascript(hljs) {
  const regex = hljs.regex;
  const hasClosingTag = (match, { after }) => {
    const tag = "</" + match[0].slice(1);
    const pos = match.input.indexOf(tag, after);
    return pos !== -1;
  };
  const IDENT_RE$1 = IDENT_RE;
  const FRAGMENT = {
    begin: "<>",
    end: "</>"
  };
  const XML_SELF_CLOSING = /<[A-Za-z0-9\\._:-]+\s*\/>/;
  const XML_TAG = {
    begin: /<[A-Za-z0-9\\._:-]+/,
    end: /\/[A-Za-z0-9\\._:-]+>|\/>/,
    /**
     * @param {RegExpMatchArray} match
     * @param {CallbackResponse} response
     */
    isTrulyOpeningTag: (match, response) => {
      const afterMatchIndex = match[0].length + match.index;
      const nextChar = match.input[afterMatchIndex];
      if (
        // HTML should not include another raw `<` inside a tag
        // nested type?
        // `<Array<Array<number>>`, etc.
        nextChar === "<" || // the , gives away that this is not HTML
        // `<T, A extends keyof T, V>`
        nextChar === ","
      ) {
        response.ignoreMatch();
        return;
      }
      if (nextChar === ">") {
        if (!hasClosingTag(match, { after: afterMatchIndex })) {
          response.ignoreMatch();
        }
      }
      let m2;
      const afterMatch = match.input.substring(afterMatchIndex);
      if (m2 = afterMatch.match(/^\s*=/)) {
        response.ignoreMatch();
        return;
      }
      if (m2 = afterMatch.match(/^\s+extends\s+/)) {
        if (m2.index === 0) {
          response.ignoreMatch();
          return;
        }
      }
    }
  };
  const KEYWORDS$1 = {
    $pattern: IDENT_RE,
    keyword: KEYWORDS,
    literal: LITERALS,
    built_in: BUILT_INS,
    "variable.language": BUILT_IN_VARIABLES
  };
  const decimalDigits = "[0-9](_?[0-9])*";
  const frac = `\\.(${decimalDigits})`;
  const decimalInteger = `0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*`;
  const NUMBER = {
    className: "number",
    variants: [
      // DecimalLiteral
      { begin: `(\\b(${decimalInteger})((${frac})|\\.)?|(${frac}))[eE][+-]?(${decimalDigits})\\b` },
      { begin: `\\b(${decimalInteger})\\b((${frac})\\b|\\.)?|(${frac})\\b` },
      // DecimalBigIntegerLiteral
      { begin: `\\b(0|[1-9](_?[0-9])*)n\\b` },
      // NonDecimalIntegerLiteral
      { begin: "\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*n?\\b" },
      { begin: "\\b0[bB][0-1](_?[0-1])*n?\\b" },
      { begin: "\\b0[oO][0-7](_?[0-7])*n?\\b" },
      // LegacyOctalIntegerLiteral (does not include underscore separators)
      // https://tc39.es/ecma262/#sec-additional-syntax-numeric-literals
      { begin: "\\b0[0-7]+n?\\b" }
    ],
    relevance: 0
  };
  const SUBST = {
    className: "subst",
    begin: "\\$\\{",
    end: "\\}",
    keywords: KEYWORDS$1,
    contains: []
    // defined later
  };
  const HTML_TEMPLATE = {
    begin: ".?html`",
    end: "",
    starts: {
      end: "`",
      returnEnd: false,
      contains: [
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ],
      subLanguage: "xml"
    }
  };
  const CSS_TEMPLATE = {
    begin: ".?css`",
    end: "",
    starts: {
      end: "`",
      returnEnd: false,
      contains: [
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ],
      subLanguage: "css"
    }
  };
  const GRAPHQL_TEMPLATE = {
    begin: ".?gql`",
    end: "",
    starts: {
      end: "`",
      returnEnd: false,
      contains: [
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ],
      subLanguage: "graphql"
    }
  };
  const TEMPLATE_STRING = {
    className: "string",
    begin: "`",
    end: "`",
    contains: [
      hljs.BACKSLASH_ESCAPE,
      SUBST
    ]
  };
  const JSDOC_COMMENT = hljs.COMMENT(
    /\/\*\*(?!\/)/,
    "\\*/",
    {
      relevance: 0,
      contains: [
        {
          begin: "(?=@[A-Za-z]+)",
          relevance: 0,
          contains: [
            {
              className: "doctag",
              begin: "@[A-Za-z]+"
            },
            {
              className: "type",
              begin: "\\{",
              end: "\\}",
              excludeEnd: true,
              excludeBegin: true,
              relevance: 0
            },
            {
              className: "variable",
              begin: IDENT_RE$1 + "(?=\\s*(-)|$)",
              endsParent: true,
              relevance: 0
            },
            // eat spaces (not newlines) so we can find
            // types or variables
            {
              begin: /(?=[^\n])\s/,
              relevance: 0
            }
          ]
        }
      ]
    }
  );
  const COMMENT = {
    className: "comment",
    variants: [
      JSDOC_COMMENT,
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.C_LINE_COMMENT_MODE
    ]
  };
  const SUBST_INTERNALS = [
    hljs.APOS_STRING_MODE,
    hljs.QUOTE_STRING_MODE,
    HTML_TEMPLATE,
    CSS_TEMPLATE,
    GRAPHQL_TEMPLATE,
    TEMPLATE_STRING,
    // Skip numbers when they are part of a variable name
    { match: /\$\d+/ },
    NUMBER
    // This is intentional:
    // See https://github.com/highlightjs/highlight.js/issues/3288
    // hljs.REGEXP_MODE
  ];
  SUBST.contains = SUBST_INTERNALS.concat({
    // we need to pair up {} inside our subst to prevent
    // it from ending too early by matching another }
    begin: /\{/,
    end: /\}/,
    keywords: KEYWORDS$1,
    contains: [
      "self"
    ].concat(SUBST_INTERNALS)
  });
  const SUBST_AND_COMMENTS = [].concat(COMMENT, SUBST.contains);
  const PARAMS_CONTAINS = SUBST_AND_COMMENTS.concat([
    // eat recursive parens in sub expressions
    {
      begin: /(\s*)\(/,
      end: /\)/,
      keywords: KEYWORDS$1,
      contains: ["self"].concat(SUBST_AND_COMMENTS)
    }
  ]);
  const PARAMS = {
    className: "params",
    // convert this to negative lookbehind in v12
    begin: /(\s*)\(/,
    // to match the parms with
    end: /\)/,
    excludeBegin: true,
    excludeEnd: true,
    keywords: KEYWORDS$1,
    contains: PARAMS_CONTAINS
  };
  const CLASS_OR_EXTENDS = {
    variants: [
      // class Car extends vehicle
      {
        match: [
          /class/,
          /\s+/,
          IDENT_RE$1,
          /\s+/,
          /extends/,
          /\s+/,
          regex.concat(IDENT_RE$1, "(", regex.concat(/\./, IDENT_RE$1), ")*")
        ],
        scope: {
          1: "keyword",
          3: "title.class",
          5: "keyword",
          7: "title.class.inherited"
        }
      },
      // class Car
      {
        match: [
          /class/,
          /\s+/,
          IDENT_RE$1
        ],
        scope: {
          1: "keyword",
          3: "title.class"
        }
      }
    ]
  };
  const CLASS_REFERENCE = {
    relevance: 0,
    match: regex.either(
      // Hard coded exceptions
      /\bJSON/,
      // Float32Array, OutT
      /\b[A-Z][a-z]+([A-Z][a-z]*|\d)*/,
      // CSSFactory, CSSFactoryT
      /\b[A-Z]{2,}([A-Z][a-z]+|\d)+([A-Z][a-z]*)*/,
      // FPs, FPsT
      /\b[A-Z]{2,}[a-z]+([A-Z][a-z]+|\d)*([A-Z][a-z]*)*/
      // P
      // single letters are not highlighted
      // BLAH
      // this will be flagged as a UPPER_CASE_CONSTANT instead
    ),
    className: "title.class",
    keywords: {
      _: [
        // se we still get relevance credit for JS library classes
        ...TYPES,
        ...ERROR_TYPES
      ]
    }
  };
  const USE_STRICT = {
    label: "use_strict",
    className: "meta",
    relevance: 10,
    begin: /^\s*['"]use (strict|asm)['"]/
  };
  const FUNCTION_DEFINITION = {
    variants: [
      {
        match: [
          /function/,
          /\s+/,
          IDENT_RE$1,
          /(?=\s*\()/
        ]
      },
      // anonymous function
      {
        match: [
          /function/,
          /\s*(?=\()/
        ]
      }
    ],
    className: {
      1: "keyword",
      3: "title.function"
    },
    label: "func.def",
    contains: [PARAMS],
    illegal: /%/
  };
  const UPPER_CASE_CONSTANT = {
    relevance: 0,
    match: /\b[A-Z][A-Z_0-9]+\b/,
    className: "variable.constant"
  };
  function noneOf(list) {
    return regex.concat("(?!", list.join("|"), ")");
  }
  const FUNCTION_CALL = {
    match: regex.concat(
      /\b/,
      noneOf([
        ...BUILT_IN_GLOBALS,
        "super",
        "import",
        "await"
      ].map((x2) => `${x2}\\s*\\(`)),
      IDENT_RE$1,
      regex.lookahead(/\s*\(/)
    ),
    className: "title.function",
    relevance: 0
  };
  const PROPERTY_ACCESS = {
    begin: regex.concat(/\./, regex.lookahead(
      regex.concat(IDENT_RE$1, /(?![0-9A-Za-z$_(])/)
    )),
    end: IDENT_RE$1,
    excludeBegin: true,
    keywords: "prototype",
    className: "property",
    relevance: 0
  };
  const GETTER_OR_SETTER = {
    match: [
      /get|set/,
      /\s+/,
      IDENT_RE$1,
      /(?=\()/
    ],
    className: {
      1: "keyword",
      3: "title.function"
    },
    contains: [
      {
        // eat to avoid empty params
        begin: /\(\)/
      },
      PARAMS
    ]
  };
  const FUNC_LEAD_IN_RE = "(\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)|" + hljs.UNDERSCORE_IDENT_RE + ")\\s*=>";
  const FUNCTION_VARIABLE = {
    match: [
      /const|var|let/,
      /\s+/,
      IDENT_RE$1,
      /\s*/,
      /=\s*/,
      /(async\s*)?/,
      // async is optional
      regex.lookahead(FUNC_LEAD_IN_RE)
    ],
    keywords: "async",
    className: {
      1: "keyword",
      3: "title.function"
    },
    contains: [
      PARAMS
    ]
  };
  return {
    name: "JavaScript",
    aliases: ["js", "jsx", "mjs", "cjs"],
    keywords: KEYWORDS$1,
    // this will be extended by TypeScript
    exports: { PARAMS_CONTAINS, CLASS_REFERENCE },
    illegal: /#(?![$_A-Za-z])/,
    contains: [
      hljs.SHEBANG({
        label: "shebang",
        binary: "node",
        relevance: 5
      }),
      USE_STRICT,
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      HTML_TEMPLATE,
      CSS_TEMPLATE,
      GRAPHQL_TEMPLATE,
      TEMPLATE_STRING,
      COMMENT,
      // Skip numbers when they are part of a variable name
      { match: /\$\d+/ },
      NUMBER,
      CLASS_REFERENCE,
      {
        scope: "attr",
        match: IDENT_RE$1 + regex.lookahead(":"),
        relevance: 0
      },
      FUNCTION_VARIABLE,
      {
        // "value" container
        begin: "(" + hljs.RE_STARTERS_RE + "|\\b(case|return|throw)\\b)\\s*",
        keywords: "return throw case",
        relevance: 0,
        contains: [
          COMMENT,
          hljs.REGEXP_MODE,
          {
            className: "function",
            // we have to count the parens to make sure we actually have the
            // correct bounding ( ) before the =>.  There could be any number of
            // sub-expressions inside also surrounded by parens.
            begin: FUNC_LEAD_IN_RE,
            returnBegin: true,
            end: "\\s*=>",
            contains: [
              {
                className: "params",
                variants: [
                  {
                    begin: hljs.UNDERSCORE_IDENT_RE,
                    relevance: 0
                  },
                  {
                    className: null,
                    begin: /\(\s*\)/,
                    skip: true
                  },
                  {
                    begin: /(\s*)\(/,
                    end: /\)/,
                    excludeBegin: true,
                    excludeEnd: true,
                    keywords: KEYWORDS$1,
                    contains: PARAMS_CONTAINS
                  }
                ]
              }
            ]
          },
          {
            // could be a comma delimited list of params to a function call
            begin: /,/,
            relevance: 0
          },
          {
            match: /\s+/,
            relevance: 0
          },
          {
            // JSX
            variants: [
              { begin: FRAGMENT.begin, end: FRAGMENT.end },
              { match: XML_SELF_CLOSING },
              {
                begin: XML_TAG.begin,
                // we carefully check the opening tag to see if it truly
                // is a tag and not a false positive
                "on:begin": XML_TAG.isTrulyOpeningTag,
                end: XML_TAG.end
              }
            ],
            subLanguage: "xml",
            contains: [
              {
                begin: XML_TAG.begin,
                end: XML_TAG.end,
                skip: true,
                contains: ["self"]
              }
            ]
          }
        ]
      },
      FUNCTION_DEFINITION,
      {
        // prevent this from getting swallowed up by function
        // since they appear "function like"
        beginKeywords: "while if switch catch for"
      },
      {
        // we have to count the parens to make sure we actually have the correct
        // bounding ( ).  There could be any number of sub-expressions inside
        // also surrounded by parens.
        begin: "\\b(?!function)" + hljs.UNDERSCORE_IDENT_RE + "\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)\\s*\\{",
        // end parens
        returnBegin: true,
        label: "func.def",
        contains: [
          PARAMS,
          hljs.inherit(hljs.TITLE_MODE, { begin: IDENT_RE$1, className: "title.function" })
        ]
      },
      // catch ... so it won't trigger the property rule below
      {
        match: /\.\.\./,
        relevance: 0
      },
      PROPERTY_ACCESS,
      // hack: prevents detection of keywords in some circumstances
      // .keyword()
      // $keyword = x
      {
        match: "\\$" + IDENT_RE$1,
        relevance: 0
      },
      {
        match: [/\bconstructor(?=\s*\()/],
        className: { 1: "title.function" },
        contains: [PARAMS]
      },
      FUNCTION_CALL,
      UPPER_CASE_CONSTANT,
      CLASS_OR_EXTENDS,
      GETTER_OR_SETTER,
      {
        match: /\$[(.]/
        // relevance booster for a pattern common to JS libs: `$(something)` and `$.something`
      }
    ]
  };
}

// node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/json.js
var EXTENDED_NUMBER_RE = "([-+]?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)|NaN|[-+]?Infinity";
var EXTENDED_NUMBER_MODE = {
  scope: "number",
  match: EXTENDED_NUMBER_RE,
  relevance: 0
};
function json(hljs) {
  const ATTRIBUTE = {
    className: "attr",
    begin: /(("(\\.|[^\\"\r\n])*")|('(\\.|[^\\'\r\n])*'))(?=\s*:)/,
    relevance: 1.01
  };
  const PUNCTUATION = {
    match: /[{}[\],:]/,
    className: "punctuation",
    relevance: 0
  };
  const LITERALS3 = [
    "true",
    "false",
    "null"
  ];
  const LITERALS_MODE = {
    scope: "literal",
    beginKeywords: LITERALS3.join(" ")
  };
  return {
    name: "JSON",
    aliases: ["jsonc", "json5"],
    keywords: {
      literal: LITERALS3
    },
    contains: [
      ATTRIBUTE,
      PUNCTUATION,
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      LITERALS_MODE,
      EXTENDED_NUMBER_MODE,
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE
    ],
    illegal: "\\S"
  };
}

// node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/python.js
function python(hljs) {
  const regex = hljs.regex;
  const IDENT_RE3 = /[\p{XID_Start}_]\p{XID_Continue}*/u;
  const RESERVED_WORDS = [
    "and",
    "as",
    "assert",
    "async",
    "await",
    "break",
    "case",
    "class",
    "continue",
    "def",
    "del",
    "elif",
    "else",
    "except",
    "finally",
    "for",
    "from",
    "global",
    "if",
    "import",
    "in",
    "is",
    "lambda",
    "lazy",
    "match",
    "nonlocal|10",
    "not",
    "or",
    "pass",
    "raise",
    "return",
    "try",
    "while",
    "with",
    "yield"
  ];
  const BUILT_INS3 = [
    "__import__",
    "abs",
    "aiter",
    "all",
    "anext",
    "any",
    "ascii",
    "bin",
    "bool",
    "breakpoint",
    "bytearray",
    "bytes",
    "callable",
    "chr",
    "classmethod",
    "compile",
    "complex",
    "delattr",
    "dict",
    "dir",
    "divmod",
    "enumerate",
    "eval",
    "exec",
    "filter",
    "float",
    "format",
    "frozendict",
    "frozenset",
    "getattr",
    "globals",
    "hasattr",
    "hash",
    "help",
    "hex",
    "id",
    "input",
    "int",
    "isinstance",
    "issubclass",
    "iter",
    "len",
    "list",
    "locals",
    "map",
    "max",
    "memoryview",
    "min",
    "next",
    "object",
    "oct",
    "open",
    "ord",
    "pow",
    "print",
    "property",
    "range",
    "repr",
    "reversed",
    "round",
    "sentinel",
    "set",
    "setattr",
    "slice",
    "sorted",
    "staticmethod",
    "str",
    "sum",
    "super",
    "tuple",
    "type",
    "vars",
    "zip"
  ];
  const LITERALS3 = [
    "__debug__",
    "Ellipsis",
    "False",
    "None",
    "NotImplemented",
    "True"
  ];
  const TYPES3 = [
    "Any",
    "Callable",
    "Coroutine",
    "Dict",
    "List",
    "Literal",
    "Generic",
    "Optional",
    "Sequence",
    "Set",
    "Tuple",
    "Type",
    "Union"
  ];
  const KEYWORDS3 = {
    $pattern: /[A-Za-z]\w+|__\w+__/,
    keyword: RESERVED_WORDS,
    built_in: BUILT_INS3,
    literal: LITERALS3,
    type: TYPES3
  };
  const PROMPT = {
    className: "meta",
    begin: /^(>>>|\.\.\.) /
  };
  const SUBST = {
    className: "subst",
    begin: /\{/,
    end: /\}/,
    keywords: KEYWORDS3,
    illegal: /#/
  };
  const LITERAL_BRACKET = {
    begin: /\{\{/,
    relevance: 0
  };
  const STRING = {
    className: "string",
    contains: [hljs.BACKSLASH_ESCAPE],
    variants: [
      {
        begin: /([uU]|[bB]|[rR]|[bB][rR]|[rR][bB])?'''/,
        end: /'''/,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          PROMPT
        ],
        relevance: 10
      },
      {
        begin: /([uU]|[bB]|[rR]|[bB][rR]|[rR][bB])?"""/,
        end: /"""/,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          PROMPT
        ],
        relevance: 10
      },
      {
        begin: /([fFtT][rR]|[rR][fFtT]|[fFtT])'''/,
        end: /'''/,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          PROMPT,
          LITERAL_BRACKET,
          SUBST
        ]
      },
      {
        begin: /([fFtT][rR]|[rR][fFtT]|[fFtT])"""/,
        end: /"""/,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          PROMPT,
          LITERAL_BRACKET,
          SUBST
        ]
      },
      {
        begin: /([uU]|[rR])'/,
        end: /'/,
        relevance: 10
      },
      {
        begin: /([uU]|[rR])"/,
        end: /"/,
        relevance: 10
      },
      {
        begin: /([bB]|[bB][rR]|[rR][bB])'/,
        end: /'/
      },
      {
        begin: /([bB]|[bB][rR]|[rR][bB])"/,
        end: /"/
      },
      {
        begin: /([fFtT][rR]|[rR][fFtT]|[fFtT])'/,
        end: /'/,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          LITERAL_BRACKET,
          SUBST
        ]
      },
      {
        begin: /([fFtT][rR]|[rR][fFtT]|[fFtT])"/,
        end: /"/,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          LITERAL_BRACKET,
          SUBST
        ]
      },
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE
    ]
  };
  const digitpart = "[0-9](_?[0-9])*";
  const pointfloat = `(\\b(${digitpart}))?\\.(${digitpart})|\\b(${digitpart})\\.`;
  const lookahead = `\\b|${RESERVED_WORDS.join("|")}`;
  const NUMBER = {
    className: "number",
    relevance: 0,
    variants: [
      // exponentfloat, pointfloat
      // https://docs.python.org/3.9/reference/lexical_analysis.html#floating-point-literals
      // optionally imaginary
      // https://docs.python.org/3.9/reference/lexical_analysis.html#imaginary-literals
      // Note: no leading \b because floats can start with a decimal point
      // and we don't want to mishandle e.g. `fn(.5)`,
      // no trailing \b for pointfloat because it can end with a decimal point
      // and we don't want to mishandle e.g. `0..hex()`; this should be safe
      // because both MUST contain a decimal point and so cannot be confused with
      // the interior part of an identifier
      {
        begin: `(\\b(${digitpart})|(${pointfloat}))[eE][+-]?(${digitpart})[jJ]?(?=${lookahead})`
      },
      {
        begin: `(${pointfloat})[jJ]?`
      },
      // decinteger, bininteger, octinteger, hexinteger
      // https://docs.python.org/3.9/reference/lexical_analysis.html#integer-literals
      // optionally "long" in Python 2
      // https://docs.python.org/2.7/reference/lexical_analysis.html#integer-and-long-integer-literals
      // decinteger is optionally imaginary
      // https://docs.python.org/3.9/reference/lexical_analysis.html#imaginary-literals
      {
        begin: `\\b([1-9](_?[0-9])*|0+(_?0)*)[lLjJ]?(?=${lookahead})`
      },
      {
        begin: `\\b0[bB](_?[01])+[lL]?(?=${lookahead})`
      },
      {
        begin: `\\b0[oO](_?[0-7])+[lL]?(?=${lookahead})`
      },
      {
        begin: `\\b0[xX](_?[0-9a-fA-F])+[lL]?(?=${lookahead})`
      },
      // imagnumber (digitpart-based)
      // https://docs.python.org/3.9/reference/lexical_analysis.html#imaginary-literals
      {
        begin: `\\b(${digitpart})[jJ](?=${lookahead})`
      }
    ]
  };
  const COMMENT_TYPE = {
    className: "comment",
    begin: regex.lookahead(/# type:/),
    end: /$/,
    keywords: KEYWORDS3,
    contains: [
      {
        // prevent keywords from coloring `type`
        begin: /# type:/
      },
      // comment within a datatype comment includes no keywords
      {
        begin: /#/,
        end: /\b\B/,
        endsWithParent: true
      }
    ]
  };
  const PARAMS = {
    className: "params",
    variants: [
      // Exclude params in functions without params
      {
        className: "",
        begin: /\(\s*\)/,
        skip: true
      },
      {
        begin: /\(/,
        end: /\)/,
        excludeBegin: true,
        excludeEnd: true,
        keywords: KEYWORDS3,
        contains: [
          "self",
          PROMPT,
          NUMBER,
          STRING,
          hljs.HASH_COMMENT_MODE
        ]
      }
    ]
  };
  SUBST.contains = [
    STRING,
    NUMBER,
    PROMPT
  ];
  return {
    name: "Python",
    aliases: [
      "py",
      "gyp",
      "ipython"
    ],
    unicodeRegex: true,
    keywords: KEYWORDS3,
    illegal: /(<\/|\?)|=>/,
    contains: [
      PROMPT,
      NUMBER,
      {
        // very common convention
        scope: "variable.language",
        match: /\bself\b/
      },
      {
        // eat "if" prior to string so that it won't accidentally be
        // labeled as an f-string
        beginKeywords: "if",
        relevance: 0
      },
      { match: /\bor\b/, scope: "keyword" },
      STRING,
      COMMENT_TYPE,
      hljs.HASH_COMMENT_MODE,
      {
        match: [
          /\bdef/,
          /\s+/,
          IDENT_RE3
        ],
        scope: {
          1: "keyword",
          3: "title.function"
        },
        contains: [PARAMS]
      },
      {
        variants: [
          {
            match: [
              /\bclass/,
              /\s+/,
              IDENT_RE3,
              /\s*/,
              /\(\s*/,
              IDENT_RE3,
              /\s*\)/
            ]
          },
          {
            match: [
              /\bclass/,
              /\s+/,
              IDENT_RE3
            ]
          }
        ],
        scope: {
          1: "keyword",
          3: "title.class",
          6: "title.class.inherited"
        }
      },
      {
        className: "meta",
        begin: /^[\t ]*@/,
        end: /(?=#)|$/,
        contains: [
          NUMBER,
          PARAMS,
          STRING
        ]
      }
    ]
  };
}

// node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/typescript.js
var IDENT_RE2 = "[A-Za-z$_][0-9A-Za-z$_]*";
var KEYWORDS2 = [
  "as",
  // for exports
  "in",
  "of",
  "if",
  "for",
  "while",
  "finally",
  "var",
  "new",
  "function",
  "do",
  "return",
  "void",
  "else",
  "break",
  "catch",
  "instanceof",
  "with",
  "throw",
  "case",
  "default",
  "try",
  "switch",
  "continue",
  "typeof",
  "delete",
  "let",
  "yield",
  "const",
  "class",
  // JS handles these with a special rule
  // "get",
  // "set",
  "debugger",
  "async",
  "await",
  "static",
  "import",
  "from",
  "export",
  "extends",
  // It's reached stage 3, which is "recommended for implementation":
  "using"
];
var LITERALS2 = [
  "true",
  "false",
  "null",
  "undefined",
  "NaN",
  "Infinity"
];
var TYPES2 = [
  // Fundamental objects
  "Object",
  "Function",
  "Boolean",
  "Symbol",
  // numbers and dates
  "Math",
  "Date",
  "Number",
  "BigInt",
  // text
  "String",
  "RegExp",
  // Indexed collections
  "Array",
  "Float32Array",
  "Float64Array",
  "Int8Array",
  "Uint8Array",
  "Uint8ClampedArray",
  "Int16Array",
  "Int32Array",
  "Uint16Array",
  "Uint32Array",
  "BigInt64Array",
  "BigUint64Array",
  // Keyed collections
  "Set",
  "Map",
  "WeakSet",
  "WeakMap",
  // Structured data
  "ArrayBuffer",
  "SharedArrayBuffer",
  "Atomics",
  "DataView",
  "JSON",
  // Control abstraction objects
  "Promise",
  "Generator",
  "GeneratorFunction",
  "AsyncFunction",
  // Reflection
  "Reflect",
  "Proxy",
  // Internationalization
  "Intl",
  // WebAssembly
  "WebAssembly"
];
var ERROR_TYPES2 = [
  "Error",
  "EvalError",
  "InternalError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "TypeError",
  "URIError"
];
var BUILT_IN_GLOBALS2 = [
  "setInterval",
  "setTimeout",
  "clearInterval",
  "clearTimeout",
  "require",
  "exports",
  "eval",
  "isFinite",
  "isNaN",
  "parseFloat",
  "parseInt",
  "decodeURI",
  "decodeURIComponent",
  "encodeURI",
  "encodeURIComponent",
  "escape",
  "unescape"
];
var BUILT_IN_VARIABLES2 = [
  "arguments",
  "this",
  "super",
  "console",
  "window",
  "document",
  "localStorage",
  "sessionStorage",
  "module",
  "self",
  "global"
  // Node.js
];
var BUILT_INS2 = [].concat(
  BUILT_IN_GLOBALS2,
  TYPES2,
  ERROR_TYPES2
);
function javascript2(hljs) {
  const regex = hljs.regex;
  const hasClosingTag = (match, { after }) => {
    const tag = "</" + match[0].slice(1);
    const pos = match.input.indexOf(tag, after);
    return pos !== -1;
  };
  const IDENT_RE$1 = IDENT_RE2;
  const FRAGMENT = {
    begin: "<>",
    end: "</>"
  };
  const XML_SELF_CLOSING = /<[A-Za-z0-9\\._:-]+\s*\/>/;
  const XML_TAG = {
    begin: /<[A-Za-z0-9\\._:-]+/,
    end: /\/[A-Za-z0-9\\._:-]+>|\/>/,
    /**
     * @param {RegExpMatchArray} match
     * @param {CallbackResponse} response
     */
    isTrulyOpeningTag: (match, response) => {
      const afterMatchIndex = match[0].length + match.index;
      const nextChar = match.input[afterMatchIndex];
      if (
        // HTML should not include another raw `<` inside a tag
        // nested type?
        // `<Array<Array<number>>`, etc.
        nextChar === "<" || // the , gives away that this is not HTML
        // `<T, A extends keyof T, V>`
        nextChar === ","
      ) {
        response.ignoreMatch();
        return;
      }
      if (nextChar === ">") {
        if (!hasClosingTag(match, { after: afterMatchIndex })) {
          response.ignoreMatch();
        }
      }
      let m2;
      const afterMatch = match.input.substring(afterMatchIndex);
      if (m2 = afterMatch.match(/^\s*=/)) {
        response.ignoreMatch();
        return;
      }
      if (m2 = afterMatch.match(/^\s+extends\s+/)) {
        if (m2.index === 0) {
          response.ignoreMatch();
          return;
        }
      }
    }
  };
  const KEYWORDS$1 = {
    $pattern: IDENT_RE2,
    keyword: KEYWORDS2,
    literal: LITERALS2,
    built_in: BUILT_INS2,
    "variable.language": BUILT_IN_VARIABLES2
  };
  const decimalDigits = "[0-9](_?[0-9])*";
  const frac = `\\.(${decimalDigits})`;
  const decimalInteger = `0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*`;
  const NUMBER = {
    className: "number",
    variants: [
      // DecimalLiteral
      { begin: `(\\b(${decimalInteger})((${frac})|\\.)?|(${frac}))[eE][+-]?(${decimalDigits})\\b` },
      { begin: `\\b(${decimalInteger})\\b((${frac})\\b|\\.)?|(${frac})\\b` },
      // DecimalBigIntegerLiteral
      { begin: `\\b(0|[1-9](_?[0-9])*)n\\b` },
      // NonDecimalIntegerLiteral
      { begin: "\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*n?\\b" },
      { begin: "\\b0[bB][0-1](_?[0-1])*n?\\b" },
      { begin: "\\b0[oO][0-7](_?[0-7])*n?\\b" },
      // LegacyOctalIntegerLiteral (does not include underscore separators)
      // https://tc39.es/ecma262/#sec-additional-syntax-numeric-literals
      { begin: "\\b0[0-7]+n?\\b" }
    ],
    relevance: 0
  };
  const SUBST = {
    className: "subst",
    begin: "\\$\\{",
    end: "\\}",
    keywords: KEYWORDS$1,
    contains: []
    // defined later
  };
  const HTML_TEMPLATE = {
    begin: ".?html`",
    end: "",
    starts: {
      end: "`",
      returnEnd: false,
      contains: [
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ],
      subLanguage: "xml"
    }
  };
  const CSS_TEMPLATE = {
    begin: ".?css`",
    end: "",
    starts: {
      end: "`",
      returnEnd: false,
      contains: [
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ],
      subLanguage: "css"
    }
  };
  const GRAPHQL_TEMPLATE = {
    begin: ".?gql`",
    end: "",
    starts: {
      end: "`",
      returnEnd: false,
      contains: [
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ],
      subLanguage: "graphql"
    }
  };
  const TEMPLATE_STRING = {
    className: "string",
    begin: "`",
    end: "`",
    contains: [
      hljs.BACKSLASH_ESCAPE,
      SUBST
    ]
  };
  const JSDOC_COMMENT = hljs.COMMENT(
    /\/\*\*(?!\/)/,
    "\\*/",
    {
      relevance: 0,
      contains: [
        {
          begin: "(?=@[A-Za-z]+)",
          relevance: 0,
          contains: [
            {
              className: "doctag",
              begin: "@[A-Za-z]+"
            },
            {
              className: "type",
              begin: "\\{",
              end: "\\}",
              excludeEnd: true,
              excludeBegin: true,
              relevance: 0
            },
            {
              className: "variable",
              begin: IDENT_RE$1 + "(?=\\s*(-)|$)",
              endsParent: true,
              relevance: 0
            },
            // eat spaces (not newlines) so we can find
            // types or variables
            {
              begin: /(?=[^\n])\s/,
              relevance: 0
            }
          ]
        }
      ]
    }
  );
  const COMMENT = {
    className: "comment",
    variants: [
      JSDOC_COMMENT,
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.C_LINE_COMMENT_MODE
    ]
  };
  const SUBST_INTERNALS = [
    hljs.APOS_STRING_MODE,
    hljs.QUOTE_STRING_MODE,
    HTML_TEMPLATE,
    CSS_TEMPLATE,
    GRAPHQL_TEMPLATE,
    TEMPLATE_STRING,
    // Skip numbers when they are part of a variable name
    { match: /\$\d+/ },
    NUMBER
    // This is intentional:
    // See https://github.com/highlightjs/highlight.js/issues/3288
    // hljs.REGEXP_MODE
  ];
  SUBST.contains = SUBST_INTERNALS.concat({
    // we need to pair up {} inside our subst to prevent
    // it from ending too early by matching another }
    begin: /\{/,
    end: /\}/,
    keywords: KEYWORDS$1,
    contains: [
      "self"
    ].concat(SUBST_INTERNALS)
  });
  const SUBST_AND_COMMENTS = [].concat(COMMENT, SUBST.contains);
  const PARAMS_CONTAINS = SUBST_AND_COMMENTS.concat([
    // eat recursive parens in sub expressions
    {
      begin: /(\s*)\(/,
      end: /\)/,
      keywords: KEYWORDS$1,
      contains: ["self"].concat(SUBST_AND_COMMENTS)
    }
  ]);
  const PARAMS = {
    className: "params",
    // convert this to negative lookbehind in v12
    begin: /(\s*)\(/,
    // to match the parms with
    end: /\)/,
    excludeBegin: true,
    excludeEnd: true,
    keywords: KEYWORDS$1,
    contains: PARAMS_CONTAINS
  };
  const CLASS_OR_EXTENDS = {
    variants: [
      // class Car extends vehicle
      {
        match: [
          /class/,
          /\s+/,
          IDENT_RE$1,
          /\s+/,
          /extends/,
          /\s+/,
          regex.concat(IDENT_RE$1, "(", regex.concat(/\./, IDENT_RE$1), ")*")
        ],
        scope: {
          1: "keyword",
          3: "title.class",
          5: "keyword",
          7: "title.class.inherited"
        }
      },
      // class Car
      {
        match: [
          /class/,
          /\s+/,
          IDENT_RE$1
        ],
        scope: {
          1: "keyword",
          3: "title.class"
        }
      }
    ]
  };
  const CLASS_REFERENCE = {
    relevance: 0,
    match: regex.either(
      // Hard coded exceptions
      /\bJSON/,
      // Float32Array, OutT
      /\b[A-Z][a-z]+([A-Z][a-z]*|\d)*/,
      // CSSFactory, CSSFactoryT
      /\b[A-Z]{2,}([A-Z][a-z]+|\d)+([A-Z][a-z]*)*/,
      // FPs, FPsT
      /\b[A-Z]{2,}[a-z]+([A-Z][a-z]+|\d)*([A-Z][a-z]*)*/
      // P
      // single letters are not highlighted
      // BLAH
      // this will be flagged as a UPPER_CASE_CONSTANT instead
    ),
    className: "title.class",
    keywords: {
      _: [
        // se we still get relevance credit for JS library classes
        ...TYPES2,
        ...ERROR_TYPES2
      ]
    }
  };
  const USE_STRICT = {
    label: "use_strict",
    className: "meta",
    relevance: 10,
    begin: /^\s*['"]use (strict|asm)['"]/
  };
  const FUNCTION_DEFINITION = {
    variants: [
      {
        match: [
          /function/,
          /\s+/,
          IDENT_RE$1,
          /(?=\s*\()/
        ]
      },
      // anonymous function
      {
        match: [
          /function/,
          /\s*(?=\()/
        ]
      }
    ],
    className: {
      1: "keyword",
      3: "title.function"
    },
    label: "func.def",
    contains: [PARAMS],
    illegal: /%/
  };
  const UPPER_CASE_CONSTANT = {
    relevance: 0,
    match: /\b[A-Z][A-Z_0-9]+\b/,
    className: "variable.constant"
  };
  function noneOf(list) {
    return regex.concat("(?!", list.join("|"), ")");
  }
  const FUNCTION_CALL = {
    match: regex.concat(
      /\b/,
      noneOf([
        ...BUILT_IN_GLOBALS2,
        "super",
        "import",
        "await"
      ].map((x2) => `${x2}\\s*\\(`)),
      IDENT_RE$1,
      regex.lookahead(/\s*\(/)
    ),
    className: "title.function",
    relevance: 0
  };
  const PROPERTY_ACCESS = {
    begin: regex.concat(/\./, regex.lookahead(
      regex.concat(IDENT_RE$1, /(?![0-9A-Za-z$_(])/)
    )),
    end: IDENT_RE$1,
    excludeBegin: true,
    keywords: "prototype",
    className: "property",
    relevance: 0
  };
  const GETTER_OR_SETTER = {
    match: [
      /get|set/,
      /\s+/,
      IDENT_RE$1,
      /(?=\()/
    ],
    className: {
      1: "keyword",
      3: "title.function"
    },
    contains: [
      {
        // eat to avoid empty params
        begin: /\(\)/
      },
      PARAMS
    ]
  };
  const FUNC_LEAD_IN_RE = "(\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)|" + hljs.UNDERSCORE_IDENT_RE + ")\\s*=>";
  const FUNCTION_VARIABLE = {
    match: [
      /const|var|let/,
      /\s+/,
      IDENT_RE$1,
      /\s*/,
      /=\s*/,
      /(async\s*)?/,
      // async is optional
      regex.lookahead(FUNC_LEAD_IN_RE)
    ],
    keywords: "async",
    className: {
      1: "keyword",
      3: "title.function"
    },
    contains: [
      PARAMS
    ]
  };
  return {
    name: "JavaScript",
    aliases: ["js", "jsx", "mjs", "cjs"],
    keywords: KEYWORDS$1,
    // this will be extended by TypeScript
    exports: { PARAMS_CONTAINS, CLASS_REFERENCE },
    illegal: /#(?![$_A-Za-z])/,
    contains: [
      hljs.SHEBANG({
        label: "shebang",
        binary: "node",
        relevance: 5
      }),
      USE_STRICT,
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      HTML_TEMPLATE,
      CSS_TEMPLATE,
      GRAPHQL_TEMPLATE,
      TEMPLATE_STRING,
      COMMENT,
      // Skip numbers when they are part of a variable name
      { match: /\$\d+/ },
      NUMBER,
      CLASS_REFERENCE,
      {
        scope: "attr",
        match: IDENT_RE$1 + regex.lookahead(":"),
        relevance: 0
      },
      FUNCTION_VARIABLE,
      {
        // "value" container
        begin: "(" + hljs.RE_STARTERS_RE + "|\\b(case|return|throw)\\b)\\s*",
        keywords: "return throw case",
        relevance: 0,
        contains: [
          COMMENT,
          hljs.REGEXP_MODE,
          {
            className: "function",
            // we have to count the parens to make sure we actually have the
            // correct bounding ( ) before the =>.  There could be any number of
            // sub-expressions inside also surrounded by parens.
            begin: FUNC_LEAD_IN_RE,
            returnBegin: true,
            end: "\\s*=>",
            contains: [
              {
                className: "params",
                variants: [
                  {
                    begin: hljs.UNDERSCORE_IDENT_RE,
                    relevance: 0
                  },
                  {
                    className: null,
                    begin: /\(\s*\)/,
                    skip: true
                  },
                  {
                    begin: /(\s*)\(/,
                    end: /\)/,
                    excludeBegin: true,
                    excludeEnd: true,
                    keywords: KEYWORDS$1,
                    contains: PARAMS_CONTAINS
                  }
                ]
              }
            ]
          },
          {
            // could be a comma delimited list of params to a function call
            begin: /,/,
            relevance: 0
          },
          {
            match: /\s+/,
            relevance: 0
          },
          {
            // JSX
            variants: [
              { begin: FRAGMENT.begin, end: FRAGMENT.end },
              { match: XML_SELF_CLOSING },
              {
                begin: XML_TAG.begin,
                // we carefully check the opening tag to see if it truly
                // is a tag and not a false positive
                "on:begin": XML_TAG.isTrulyOpeningTag,
                end: XML_TAG.end
              }
            ],
            subLanguage: "xml",
            contains: [
              {
                begin: XML_TAG.begin,
                end: XML_TAG.end,
                skip: true,
                contains: ["self"]
              }
            ]
          }
        ]
      },
      FUNCTION_DEFINITION,
      {
        // prevent this from getting swallowed up by function
        // since they appear "function like"
        beginKeywords: "while if switch catch for"
      },
      {
        // we have to count the parens to make sure we actually have the correct
        // bounding ( ).  There could be any number of sub-expressions inside
        // also surrounded by parens.
        begin: "\\b(?!function)" + hljs.UNDERSCORE_IDENT_RE + "\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)\\s*\\{",
        // end parens
        returnBegin: true,
        label: "func.def",
        contains: [
          PARAMS,
          hljs.inherit(hljs.TITLE_MODE, { begin: IDENT_RE$1, className: "title.function" })
        ]
      },
      // catch ... so it won't trigger the property rule below
      {
        match: /\.\.\./,
        relevance: 0
      },
      PROPERTY_ACCESS,
      // hack: prevents detection of keywords in some circumstances
      // .keyword()
      // $keyword = x
      {
        match: "\\$" + IDENT_RE$1,
        relevance: 0
      },
      {
        match: [/\bconstructor(?=\s*\()/],
        className: { 1: "title.function" },
        contains: [PARAMS]
      },
      FUNCTION_CALL,
      UPPER_CASE_CONSTANT,
      CLASS_OR_EXTENDS,
      GETTER_OR_SETTER,
      {
        match: /\$[(.]/
        // relevance booster for a pattern common to JS libs: `$(something)` and `$.something`
      }
    ]
  };
}
function typescript(hljs) {
  const regex = hljs.regex;
  const tsLanguage = javascript2(hljs);
  const IDENT_RE$1 = IDENT_RE2;
  const TYPES3 = [
    "any",
    "void",
    "number",
    "boolean",
    "string",
    "object",
    "never",
    "symbol",
    "bigint",
    "unknown"
  ];
  const NAMESPACE = {
    begin: [
      /namespace/,
      /\s+/,
      hljs.IDENT_RE
    ],
    beginScope: {
      1: "keyword",
      3: "title.class"
    }
  };
  const INTERFACE = {
    beginKeywords: "interface",
    end: /\{/,
    excludeEnd: true,
    keywords: {
      keyword: "interface extends",
      built_in: TYPES3
    },
    contains: [tsLanguage.exports.CLASS_REFERENCE]
  };
  const USE_STRICT = {
    className: "meta",
    relevance: 10,
    begin: /^\s*['"]use strict['"]/
  };
  const TS_SPECIFIC_KEYWORDS = [
    "type",
    // "namespace",
    "interface",
    "public",
    "private",
    "protected",
    "implements",
    "declare",
    "abstract",
    "readonly",
    "enum",
    "override",
    "satisfies"
  ];
  const KEYWORDS$1 = {
    $pattern: IDENT_RE2,
    keyword: KEYWORDS2.concat(TS_SPECIFIC_KEYWORDS),
    literal: LITERALS2,
    built_in: BUILT_INS2.concat(TYPES3),
    "variable.language": BUILT_IN_VARIABLES2
  };
  const DECORATOR = {
    className: "meta",
    begin: "@" + IDENT_RE$1
  };
  const swapMode = (mode, label, replacement) => {
    const indx = mode.contains.findIndex((m2) => m2.label === label);
    if (indx === -1) {
      throw new Error("can not find mode to replace");
    }
    mode.contains.splice(indx, 1, replacement);
  };
  Object.assign(tsLanguage.keywords, KEYWORDS$1);
  tsLanguage.exports.PARAMS_CONTAINS.push(DECORATOR);
  const ATTRIBUTE_HIGHLIGHT = tsLanguage.contains.find((c) => c.scope === "attr");
  const OPTIONAL_KEY_OR_ARGUMENT = Object.assign(
    {},
    ATTRIBUTE_HIGHLIGHT,
    { match: regex.concat(IDENT_RE$1, regex.lookahead(/\s*\?:/)) }
  );
  tsLanguage.exports.PARAMS_CONTAINS.push([
    tsLanguage.exports.CLASS_REFERENCE,
    // class reference for highlighting the params types
    ATTRIBUTE_HIGHLIGHT,
    // highlight the params key
    OPTIONAL_KEY_OR_ARGUMENT
    // Added for optional property assignment highlighting
  ]);
  tsLanguage.contains = tsLanguage.contains.concat([
    DECORATOR,
    NAMESPACE,
    INTERFACE,
    OPTIONAL_KEY_OR_ARGUMENT
    // Added for optional property assignment highlighting
  ]);
  swapMode(tsLanguage, "shebang", hljs.SHEBANG());
  swapMode(tsLanguage, "use_strict", USE_STRICT);
  const functionDeclaration = tsLanguage.contains.find((m2) => m2.label === "func.def");
  functionDeclaration.relevance = 0;
  Object.assign(tsLanguage, {
    name: "TypeScript",
    aliases: [
      "ts",
      "tsx",
      "mts",
      "cts"
    ]
  });
  return tsLanguage;
}

// node_modules/.pnpm/highlight.js@11.12.0/node_modules/highlight.js/es/languages/yaml.js
function yaml(hljs) {
  const LITERALS3 = "true false yes no null";
  const URI_CHARACTERS = "[\\w#;/?:@&=+$,.~*'()[\\]]+";
  const KEY = {
    className: "attr",
    variants: [
      // added brackets support and special char support
      { begin: /[\w*@][\w*@ :()\./-]*:(?=[ \t]|$)/ },
      {
        // double quoted keys - with brackets and special char support
        begin: /"[\w*@][\w*@ :()\./-]*":(?=[ \t]|$)/
      },
      {
        // single quoted keys - with brackets and special char support
        begin: /'[\w*@][\w*@ :()\./-]*':(?=[ \t]|$)/
      }
    ]
  };
  const TEMPLATE_VARIABLES = {
    className: "template-variable",
    variants: [
      {
        // jinja templates Ansible
        begin: /\{\{/,
        end: /\}\}/
      },
      {
        // Ruby i18n
        begin: /%\{/,
        end: /\}/
      }
    ]
  };
  const SINGLE_QUOTE_STRING = {
    className: "string",
    relevance: 0,
    begin: /'/,
    end: /'/,
    contains: [
      {
        match: /''/,
        scope: "char.escape",
        relevance: 0
      }
    ]
  };
  const STRING = {
    className: "string",
    relevance: 0,
    variants: [
      {
        begin: /"/,
        end: /"/
      },
      { begin: /\S+/ }
    ],
    contains: [
      hljs.BACKSLASH_ESCAPE,
      TEMPLATE_VARIABLES
    ]
  };
  const CONTAINER_STRING = hljs.inherit(STRING, { variants: [
    {
      begin: /'/,
      end: /'/,
      contains: [
        {
          begin: /''/,
          relevance: 0
        }
      ]
    },
    {
      begin: /"/,
      end: /"/
    },
    { begin: /[^\s,{}[\]]+/ }
  ] });
  const DATE_RE = "[0-9]{4}(-[0-9][0-9]){0,2}";
  const TIME_RE = "([Tt \\t][0-9][0-9]?(:[0-9][0-9]){2})?";
  const FRACTION_RE = "(\\.[0-9]*)?";
  const ZONE_RE = "([ \\t])*(Z|[-+][0-9][0-9]?(:[0-9][0-9])?)?";
  const TIMESTAMP = {
    className: "number",
    begin: "\\b" + DATE_RE + TIME_RE + FRACTION_RE + ZONE_RE + "\\b"
  };
  const VALUE_CONTAINER = {
    end: ",",
    endsWithParent: true,
    excludeEnd: true,
    keywords: LITERALS3,
    relevance: 0
  };
  const OBJECT = {
    begin: /\{/,
    end: /\}/,
    contains: [VALUE_CONTAINER],
    illegal: "\\n",
    relevance: 0
  };
  const ARRAY = {
    begin: "\\[",
    end: "\\]",
    contains: [VALUE_CONTAINER],
    illegal: "\\n",
    relevance: 0
  };
  const MODES = [
    KEY,
    {
      className: "meta",
      begin: "^---\\s*$",
      relevance: 10
    },
    {
      // multi line string
      // Blocks start with a | or > followed by a newline
      //
      // Indentation of subsequent lines must be the same to
      // be considered part of the block
      className: "string",
      begin: "[\\|>]([1-9]?[+-])?[ ]*\\n( +)[^ ][^\\n]*\\n(\\2[^\\n]+\\n?)*"
    },
    {
      // Ruby/Rails erb
      begin: "<%[%=-]?",
      end: "[%-]?%>",
      subLanguage: "ruby",
      excludeBegin: true,
      excludeEnd: true,
      relevance: 0
    },
    {
      // named tags
      className: "type",
      begin: "!\\w+!" + URI_CHARACTERS
    },
    // https://yaml.org/spec/1.2/spec.html#id2784064
    {
      // verbatim tags
      className: "type",
      begin: "!<" + URI_CHARACTERS + ">"
    },
    {
      // primary tags
      className: "type",
      begin: "!" + URI_CHARACTERS
    },
    {
      // secondary tags
      className: "type",
      begin: "!!" + URI_CHARACTERS
    },
    {
      // fragment id &ref
      className: "meta",
      begin: "&" + hljs.UNDERSCORE_IDENT_RE + "$"
    },
    {
      // fragment reference *ref
      className: "meta",
      begin: "\\*" + hljs.UNDERSCORE_IDENT_RE + "$"
    },
    {
      // array listing
      className: "bullet",
      // TODO: remove |$ hack when we have proper look-ahead support
      begin: "-(?=[ ]|$)",
      relevance: 0
    },
    hljs.HASH_COMMENT_MODE,
    {
      beginKeywords: LITERALS3,
      keywords: { literal: LITERALS3 }
    },
    TIMESTAMP,
    // numbers are any valid C-style number that
    // sit isolated from other words
    {
      className: "number",
      begin: hljs.C_NUMBER_RE + "\\b",
      relevance: 0
    },
    OBJECT,
    ARRAY,
    SINGLE_QUOTE_STRING,
    STRING
  ];
  const VALUE_MODES = [...MODES];
  VALUE_MODES.pop();
  VALUE_MODES.push(CONTAINER_STRING);
  VALUE_CONTAINER.contains = VALUE_MODES;
  return {
    name: "YAML",
    case_insensitive: true,
    aliases: ["yml"],
    contains: MODES
  };
}

// src/client/highlight.ts
var GRAMMARS = {
  javascript,
  typescript,
  json,
  python,
  bash,
  yaml
};
var EXTENSION_LANGUAGE = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "javascript",
  ts: "typescript",
  mts: "typescript",
  cts: "typescript",
  tsx: "typescript",
  json: "json",
  jsonc: "json",
  jsonl: "json",
  py: "python",
  pyi: "python",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  yml: "yaml",
  yaml: "yaml"
};
var registered = /* @__PURE__ */ new Set();
function ensureLanguage(name2) {
  if (!Object.prototype.hasOwnProperty.call(GRAMMARS, name2)) return;
  if (registered.has(name2)) return;
  core_default.registerLanguage(name2, GRAMMARS[name2]);
  registered.add(name2);
}
function extensionOf(path) {
  const match = /\.([A-Za-z0-9_+-]+)$/.exec(path);
  return match === null ? "" : match[1].toLowerCase();
}
function languageFor(path) {
  return EXTENSION_LANGUAGE[extensionOf(path)] ?? null;
}
function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function highlightCode(text, language) {
  if (language !== null) ensureLanguage(language);
  const use = language !== null && core_default.getLanguage(language) !== void 0 ? language : null;
  if (use !== null) {
    try {
      return core_default.highlight(text, { language: use }).value;
    } catch {
    }
  }
  return escapeHtml(text);
}
function gutterWidth(numbers) {
  let max = 1;
  for (const number of numbers) {
    if (number === null) continue;
    const length = String(number).length;
    if (length > max) max = length;
  }
  return String(max + 2) + "ch";
}

// src/client/vendor/tool-render/text.js
function deIndent(text) {
  if (typeof text !== "string" || text === "") return text;
  var expanded = text.replace(/\t/g, "    ");
  var lines = expanded.split("\n");
  var min = -1;
  for (var i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "") continue;
    var count = 0;
    while (count < lines[i].length && lines[i].charAt(count) === " ") count++;
    if (min === -1 || count < min) min = count;
  }
  if (min <= 0) return expanded;
  var out = [];
  for (var i = 0; i < lines.length; i++) {
    out.push(lines[i].trim() === "" ? "" : lines[i].slice(min));
  }
  return out.join("\n");
}
var HASH_ROW_RE = /^([A-Za-z0-9]{3})│/;
function isBuiltinReadEnvelope(lines) {
  return lines.length > 0 && /^<path>/.test(lines[0]) && lines.indexOf("<content>") !== -1;
}
function readStartLine(args, output) {
  if (args !== null && typeof args === "object" && typeof args.offset === "number" && Number.isInteger(args.offset) && args.offset >= 1) {
    return args.offset;
  }
  var lines = String(output).split("\n");
  if (lines.length > 0 && HASH_ROW_RE.test(lines[0])) {
    var m2 = /\[Showing lines (\d+)-(\d+) of \d+/.exec(String(output));
    if (m2 !== null) return parseInt(m2[1], 10);
  }
  var b2 = /\(Showing lines (\d+)-\d+/.exec(String(output));
  if (b2 !== null) return parseInt(b2[1], 10);
  return 1;
}
function numberedReadRows(output, startLine) {
  var lines = String(output).split("\n");
  var hashline = lines.length > 0 && HASH_ROW_RE.test(lines[0]);
  var builtin = !hashline && isBuiltinReadEnvelope(lines);
  var rows = [];
  var next = startLine;
  for (var i = 0; i < lines.length; i++) {
    if (hashline && HASH_ROW_RE.test(lines[i])) {
      rows.push({ number: next, text: lines[i].slice(4) });
      next++;
    } else if (hashline) {
      rows.push({ number: null, text: lines[i] });
    } else if (builtin) {
      if (i === 0 || /^<type>/.test(lines[i]) || lines[i] === "<content>" || lines[i] === "</content>") {
        continue;
      }
      var bm = /^(\d+): ?/.exec(lines[i]);
      if (bm !== null) {
        rows.push({ number: parseInt(bm[1], 10), text: lines[i].slice(bm[0].length) });
      } else {
        rows.push({ number: null, text: lines[i] });
      }
    } else {
      rows.push({ number: next, text: lines[i] });
      next++;
    }
  }
  var content = [];
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].number !== null) content.push(rows[i].text);
  }
  var leveled = deIndent(content.join("\n")).split("\n");
  var at2 = 0;
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].number !== null) rows[i].text = leveled[at2++];
  }
  return rows;
}

// src/client/tool-block.ts
function isDone(block) {
  return block !== null && typeof block === "object" && "kind" in block;
}
function argsRawOf(block) {
  if (block === null || typeof block !== "object") return "";
  const b2 = block;
  if (isDone(block)) {
    const call = b2.call;
    return call !== void 0 && typeof call.argsRaw === "string" ? call.argsRaw : "";
  }
  return typeof b2.argsRaw === "string" ? b2.argsRaw : "";
}
function parseArgs(raw) {
  if (raw === "") return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
function rowSummary(state, summary, errorSummary) {
  if (errorSummary === void 0) return { text: summary, isError: false };
  return { text: errorSummary, isError: state === "error" };
}
function pickString(value, keys) {
  if (value === null) return void 0;
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate !== "") return candidate;
  }
  return void 0;
}
function rowStateOf(block) {
  if (!isDone(block)) return "running";
  const b2 = block;
  const error = b2.error;
  if (error !== void 0 && error.code === "interrupted") return "stopped";
  return b2.isError === true ? "error" : "ok";
}
function resultTextOf(block) {
  if (!isDone(block)) return null;
  const content = block.content;
  const items = Array.isArray(content) ? content : [];
  const parts = [];
  for (const item of items) {
    if (item !== null && typeof item === "object") {
      const entry = item;
      if (entry.type === "text" && typeof entry.text === "string") {
        parts.push(entry.text);
        continue;
      }
      try {
        parts.push(JSON.stringify(entry, null, 2));
      } catch {
      }
    }
  }
  return parts.join("\n");
}
function errorTextOf(block) {
  if (!isDone(block)) return null;
  const text = resultTextOf(block);
  if (text !== null && text !== "") return text;
  const error = block.error;
  if (error !== void 0 && typeof error.message === "string") return error.message;
  if (error !== void 0 && typeof error.code === "string") return error.code;
  return null;
}
function firstLine(text) {
  const at2 = text.indexOf("\n");
  return at2 === -1 ? text : text.slice(0, at2);
}
var ERROR_TOKEN = /\[(?:E_|exit code:|sandbox:)|FS_[A-Z_]+|AIDOS_[A-Z_]+/;
function firstLineOfError(text) {
  if (text === "") return text;
  const unwrapped = unwrapErrorEnvelope(text);
  if (unwrapped !== null) return unwrapped;
  for (const line of text.split("\n")) {
    if (ERROR_TOKEN.test(line)) return line;
  }
  return firstLine(text);
}
function unwrapErrorEnvelope(text) {
  const parsed = parseErrorEnvelope(text);
  if (parsed === null) return null;
  const { code, message } = parsed;
  if (message === null) return code;
  return code === null ? message : `${code} \u2014 ${message}`;
}
var USELESS_ERROR_CODES = /* @__PURE__ */ new Set(["tool_error", "Error", "error"]);
var REFUSAL_PATTERNS = [
  /^gate refused/i,
  /\brefused\b/i,
  /is not one of the ticket's criteria/i,
  /cannot attach kind/i,
  /outside the allowlist/i,
  /\bnot permitted\b/i
];
function parseErrorEnvelope(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  let parsed;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const value = parsed;
  const message = typeof value.message === "string" ? value.message : null;
  const rawCode = typeof value.code === "string" ? value.code : typeof value.error === "string" ? value.error : null;
  const code = rawCode !== null && USELESS_ERROR_CODES.has(rawCode) && message !== null ? null : rawCode;
  const extra = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key === "ok" || key === "error" || key === "code" || key === "message") continue;
    extra[key] = entry;
  }
  const probe = message ?? rawCode ?? "";
  return {
    code,
    message,
    extra,
    refusal: REFUSAL_PATTERNS.some((pattern) => pattern.test(probe))
  };
}
function relativize(path, root) {
  if (root === void 0 || root === "") return path;
  const base = root.endsWith("/") ? root : root + "/";
  return path.startsWith(base) ? path.slice(base.length) : path;
}
function unwrapScratchResult(text) {
  if (text === null || text === "") return text;
  try {
    const parsed = JSON.parse(text);
    if (parsed === null || typeof parsed !== "object") return text;
    const value = parsed;
    if (typeof value.content === "string") return value.content;
    if (typeof value.message === "string") return value.message;
    return text;
  } catch {
    return text;
  }
}

// src/client/scratch-rows.tsx
function Leading({ state, open }) {
  if (state === "error" || state === "stopped") return /* @__PURE__ */ import_react28.default.createElement(import_react28.default.Fragment, null, "\u25CF");
  if (state === "running") return /* @__PURE__ */ import_react28.default.createElement(import_react28.default.Fragment, null, "\u25CC");
  return /* @__PURE__ */ import_react28.default.createElement(ChevronIcon, { open });
}
function ScratchRow({ title, summary, state, body, errorSummary }) {
  const [expanded, setExpanded] = import_react28.default.useState(false);
  const expandable = body !== null;
  const open = expanded && expandable;
  const showsError = state === "error" && errorSummary !== void 0;
  const shown = showsError ? errorSummary : summary;
  return /* @__PURE__ */ import_react28.default.createElement("div", { className: "tool-render-card", "data-error": state === "error" || void 0 }, /* @__PURE__ */ import_react28.default.createElement(
    "div",
    {
      className: "tool-render-row",
      "data-state": state,
      "data-expandable": expandable ? true : void 0,
      role: expandable ? "button" : void 0,
      tabIndex: expandable ? 0 : void 0,
      "aria-expanded": expandable ? open : void 0,
      onClick: expandable ? () => setExpanded(!expanded) : void 0,
      onKeyDown: expandable ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setExpanded(!expanded);
        }
      } : void 0
    },
    /* @__PURE__ */ import_react28.default.createElement("span", { className: "tool-render-leading", "aria-hidden": "true" }, /* @__PURE__ */ import_react28.default.createElement(Leading, { state, open })),
    /* @__PURE__ */ import_react28.default.createElement("span", { className: "tool-render-title" }, title),
    /* @__PURE__ */ import_react28.default.createElement("span", { className: "tool-render-sep", "aria-hidden": "true" }),
    /* @__PURE__ */ import_react28.default.createElement(
      "span",
      {
        className: "tool-render-summary",
        "tool-render-error": showsError ? true : void 0,
        title: shown,
        "data-dsh-tip": ""
      },
      shown
    )
  ), open ? /* @__PURE__ */ import_react28.default.createElement("div", { className: "tool-render-body" }, body) : null);
}
function useRow(props, label) {
  const args = parseArgs(argsRawOf(props.block));
  const state = rowStateOf(props.block);
  const rawPath = pickString(args, ["path", "file_path"]);
  const errorText2 = state === "error" ? errorTextOf(props.block) : null;
  const summary = rawPath !== void 0 ? relativize(rawPath, props.cwd) : label;
  const errorSummary = errorText2 !== null && errorText2 !== "" ? firstLineOfError(errorText2) : void 0;
  return { args, state, summary, errorText: errorText2, errorSummary };
}
function bodyOf(text, isError) {
  if (text === null || text === "") return null;
  return /* @__PURE__ */ import_react28.default.createElement("pre", { className: "tool-render-output", "tool-render-error": isError ? true : void 0 }, text);
}
function readBody(text, path) {
  const rows = numberedReadRows(text, readStartLine(null, text));
  const language = languageFor(path ?? "");
  const width = gutterWidth(rows.map((row) => row.number));
  return /* @__PURE__ */ import_react28.default.createElement("div", { className: "tool-render-code" }, rows.map((row, index) => /* @__PURE__ */ import_react28.default.createElement("div", { className: "tool-render-code-row", key: index }, /* @__PURE__ */ import_react28.default.createElement("span", { className: "tool-render-gutter", "aria-hidden": "true", style: { width } }, row.number === null ? "" : String(row.number)), /* @__PURE__ */ import_react28.default.createElement(
    "code",
    {
      className: "tool-render-line-cell hljs",
      "data-highlighted": "yes",
      dangerouslySetInnerHTML: { __html: highlightCode(row.text, language) }
    }
  ))));
}
function ScratchReadRow(props) {
  const { args, state, summary, errorText: errorText2, errorSummary } = useRow(props, "Read");
  const text = state === "error" ? errorText2 : unwrapScratchResult(resultTextOf(props.block));
  const path = pickString(args, ["path", "file_path"]);
  const body = state === "error" || text === null || text === "" ? bodyOf(text, state === "error") : readBody(text, path);
  return /* @__PURE__ */ import_react28.default.createElement(ScratchRow, { title: "Scratch read", summary, state, body, errorSummary });
}
function ScratchWriteRow(props) {
  const { args, state, summary, errorText: errorText2, errorSummary } = useRow(props, "Write");
  const written = state === "error" ? errorText2 : pickString(args, ["content"]) ?? null;
  return /* @__PURE__ */ import_react28.default.createElement(
    ScratchRow,
    {
      title: "Scratch write",
      summary,
      state,
      body: bodyOf(written, state === "error"),
      errorSummary
    }
  );
}
function ScratchEditRow(props) {
  const { args, state, summary, errorText: errorText2, errorSummary } = useRow(props, "Edit");
  let text;
  if (state === "error") {
    text = errorText2;
  } else {
    const oldText = pickString(args, ["old_string"]);
    const newText = pickString(args, ["new_string"]);
    text = oldText !== void 0 || newText !== void 0 ? `- ${oldText ?? ""}
+ ${newText ?? ""}` : unwrapScratchResult(resultTextOf(props.block));
  }
  return /* @__PURE__ */ import_react28.default.createElement(
    ScratchRow,
    {
      title: "Scratch edit",
      summary,
      state,
      body: bodyOf(text, state === "error"),
      errorSummary
    }
  );
}
function ScratchMkdirRow(props) {
  const { state, summary, errorText: errorText2, errorSummary } = useRow(props, "Mkdir");
  return /* @__PURE__ */ import_react28.default.createElement(
    ScratchRow,
    {
      title: "Scratch mkdir",
      summary,
      state,
      body: bodyOf(state === "error" ? errorText2 : null, state === "error"),
      errorSummary
    }
  );
}
var SCRATCH_ROWS = [
  ["scratch_read", ScratchReadRow],
  ["scratch_write", ScratchWriteRow],
  ["scratch_edit", ScratchEditRow],
  ["scratch_mkdir", ScratchMkdirRow]
];

// src/client/aidos-rows.tsx
var import_react29 = __toESM(require("react"), 1);

// src/client/aidos-row-data.ts
function asRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}
function asText(value) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}
function oneLine(value, max = 120) {
  const text = typeof value === "string" ? value : JSON.stringify(value) ?? "";
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? flat.slice(0, max - 1) + "\u2026" : flat;
}
function ticketFacts(result) {
  const ticket = asRecord(result?.ticket);
  if (ticket === null) return [];
  const facts = [];
  const state = asText(ticket.state);
  if (state !== null) facts.push({ label: "State", value: state });
  const present = ticket.gatePresent;
  const total = ticket.gateTotal;
  if (typeof present === "number" && typeof total === "number") {
    facts.push({ label: "Gate", value: `${present}/${total}` });
  }
  const criteria = asText(ticket.criteria);
  if (criteria !== null && criteria.trim() !== "") {
    facts.push({ label: "Criteria", value: oneLine(criteria) });
  }
  const allowlist = asArray(ticket.allowlist);
  if (allowlist.length > 0) {
    facts.push({ label: "Allowlist", value: allowlist.map((p) => String(p)).join(" \xB7 ") });
  }
  const dependsOn = asArray(ticket.dependsOn);
  if (dependsOn.length > 0) {
    facts.push({ label: "Depends on", value: dependsOn.map((d) => String(d)).join(" \xB7 ") });
  }
  const comments = result?.commentCount;
  if (typeof comments === "number" && comments > 0) {
    facts.push({ label: "Comments", value: String(comments) });
  }
  return facts;
}
function ticketEvidence(result) {
  return asArray(result?.evidence).map((row) => asRecord(row)).filter((row) => row !== null).map((row) => ({
    kind: asText(row.kind) ?? "",
    author: asText(row.author) ?? "agent",
    at: typeof row.at === "number" ? row.at : void 0,
    excerpt: asText(row.excerpt) ?? ""
  })).filter((row) => row.kind !== "");
}
function ticketLines(result) {
  return asArray(result?.tickets).map((row) => asRecord(row)).filter((row) => row !== null).map((row) => ({
    id: asText(row.id) ?? "?",
    state: asText(row.state) ?? "",
    title: asText(row.title) ?? ""
  }));
}
var SET_TICKET_ADDRESSING = /* @__PURE__ */ new Set(["ticketId", "projectId"]);
function writtenFields(args) {
  if (args === null) return [];
  const facts = [];
  for (const [key, value] of Object.entries(args)) {
    if (SET_TICKET_ADDRESSING.has(key)) continue;
    if (value === void 0) continue;
    facts.push({ label: key, value: oneLine(value) });
  }
  return facts;
}
function allowlistPaths(args, result) {
  const created = new Set(asArray(result?.created).map((p) => String(p)));
  return asArray(args?.paths).map((p) => {
    const path = String(p);
    return { path, created: created.has(path) };
  });
}
function suggestionLines(args) {
  return asArray(args?.suggestions).map((row) => asRecord(row)).filter((row) => row !== null).map((row) => ({
    ticketId: asText(row.ticketId) ?? "?",
    actionId: asText(row.actionId) ?? "",
    reason: asText(row.reason) ?? ""
  }));
}
var PLAN_BLOCKS = ["frontmatter", "preamble", "contextSections"];
function planBlocksWritten(args) {
  if (args === null) return [];
  return PLAN_BLOCKS.filter((block) => typeof args[block] === "string");
}
function isTicketState(value) {
  return typeof value === "string" && STATE_ORDER.includes(value);
}
function ticketFromProjection(projectionValue, ticketId) {
  if (ticketId === null || ticketId === void 0 || ticketId === "") return null;
  const record = asRecord(projectionValue);
  if (record === null) return null;
  const hit = asRecord(record[ticketId]);
  if (hit === null) return null;
  if (typeof hit.id !== "number" || typeof hit.title !== "string" || !isTicketState(hit.state) || typeof hit.slug !== "string" || typeof hit.workspaceKey !== "string") {
    return null;
  }
  const out = {
    id: hit.id,
    title: hit.title,
    state: hit.state,
    slug: hit.slug,
    workspaceKey: hit.workspaceKey
  };
  if (typeof hit.gatePresent === "number") out.gatePresent = hit.gatePresent;
  if (typeof hit.gateTotal === "number") out.gateTotal = hit.gateTotal;
  const excerpt = asText(hit.description);
  if (excerpt !== null && excerpt.trim() !== "") out.descriptionExcerpt = oneLine(excerpt, 220);
  return out;
}

// src/client/aidos-rows.tsx
function ticketIdOf(args, result) {
  const fromArgs = args?.ticketId;
  if (typeof fromArgs === "number" || typeof fromArgs === "string") return String(fromArgs);
  if (result !== null && typeof result === "object") {
    const value = result.ticketId;
    if (typeof value === "number" || typeof value === "string") return String(value);
  }
  return null;
}
function resultOf(block) {
  const text = resultTextOf(block);
  if (text === null || text === "") return null;
  try {
    const parsed = JSON.parse(text);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
function ticketLabel(ticketId) {
  if (ticketId === null) return null;
  const title = ticketTitle(ticketId);
  return title === null ? `#${ticketId}` : `#${ticketId} \u2014 ${title}`;
}
function AidosRow(props) {
  const [expanded, setExpanded] = import_react29.default.useState(false);
  const [peekOpen, setPeekOpen] = import_react29.default.useState(false);
  const body = props.body ?? null;
  const expandable = body !== null;
  const open = expanded && expandable;
  const shown = rowSummary(props.state, props.summary, props.errorSummary);
  const canSelect = props.ticketId !== null && props.ticketId !== void 0 && props.sessionId !== void 0;
  const select = canSelect ? (event) => {
    event.stopPropagation();
    setSelection(props.sessionId, asBoardKey(props.ticketId));
    setPeekOpen(true);
  } : void 0;
  const peeked = props.useProjection !== void 0 ? ticketFromProjection(props.useProjection("aidos.tickets"), props.ticketId) : null;
  return /* @__PURE__ */ import_react29.default.createElement("div", { className: "tool-render-card", "data-error": props.state === "error" || void 0 }, /* @__PURE__ */ import_react29.default.createElement(
    "div",
    {
      className: "tool-render-row",
      "data-state": props.state,
      "data-expandable": expandable ? true : void 0,
      role: expandable ? "button" : void 0,
      tabIndex: expandable ? 0 : void 0,
      "aria-expanded": expandable ? open : void 0,
      onClick: expandable ? () => setExpanded(!expanded) : void 0,
      onKeyDown: expandable ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setExpanded(!expanded);
        }
      } : void 0
    },
    /* @__PURE__ */ import_react29.default.createElement("span", { className: "tool-render-leading", "aria-hidden": "true" }, props.state === "error" || props.state === "stopped" ? "\u25CF" : /* @__PURE__ */ import_react29.default.createElement(ChevronIcon, { open })),
    /* @__PURE__ */ import_react29.default.createElement("span", { className: "tool-render-title" }, props.title),
    /* @__PURE__ */ import_react29.default.createElement("span", { className: "tool-render-sep", "aria-hidden": "true" }),
    select !== void 0 && props.errorSummary === void 0 ? /* @__PURE__ */ import_react29.default.createElement(
      "span",
      {
        className: "tool-render-path",
        role: "link",
        tabIndex: 0,
        title: "Select " + shown + " on the board",
        "data-dsh-tip": "",
        onClick: select,
        onKeyDown: (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            select(event);
          }
        }
      },
      shown.text
    ) : /* @__PURE__ */ import_react29.default.createElement(
      "span",
      {
        className: "tool-render-summary",
        "tool-render-error": shown.isError ? true : void 0
      },
      shown.text
    )
  ), open ? /* @__PURE__ */ import_react29.default.createElement("div", { className: "tool-render-body" }, body) : null, peekOpen ? /* @__PURE__ */ import_react29.default.createElement(ModalShell, { title: "Ticket", onClose: () => setPeekOpen(false) }, peeked !== null ? /* @__PURE__ */ import_react29.default.createElement(import_react29.default.Fragment, null, /* @__PURE__ */ import_react29.default.createElement(TicketStrip, { ticket: peeked }), peeked.descriptionExcerpt !== void 0 ? /* @__PURE__ */ import_react29.default.createElement("p", { className: "aidos-ticket-peek-excerpt" }, peeked.descriptionExcerpt) : null) : /* @__PURE__ */ import_react29.default.createElement("p", { className: "aidos-ticket-peek-empty" }, "#" + (props.ticketId ?? "?") + " isn't in this session's own board yet, or belongs to another session. Open the Tickets tab to look it up there.")) : null);
}
function Facts({ facts }) {
  if (facts.length === 0) return null;
  return /* @__PURE__ */ import_react29.default.createElement("dl", { className: "aidos-tool-facts" }, facts.map((fact) => /* @__PURE__ */ import_react29.default.createElement(import_react29.default.Fragment, { key: fact.label }, /* @__PURE__ */ import_react29.default.createElement("dt", null, fact.label), /* @__PURE__ */ import_react29.default.createElement("dd", { title: fact.value, "data-dsh-tip": "" }, fact.value))));
}
function TextBody({ text, isError }) {
  return /* @__PURE__ */ import_react29.default.createElement("pre", { className: "tool-render-output", "tool-render-error": isError === true ? true : void 0 }, text);
}
function errorBody(errorText2) {
  if (errorText2 === null || errorText2 === "") return null;
  const envelope = parseErrorEnvelope(errorText2);
  if (envelope === null) return /* @__PURE__ */ import_react29.default.createElement(TextBody, { text: errorText2, isError: true });
  const facts = [];
  if (envelope.code !== null) facts.push({ label: "code", value: envelope.code });
  for (const [key, value] of Object.entries(envelope.extra)) {
    facts.push({ label: key, value: oneLine(value) });
  }
  if (envelope.message === null && facts.length === 0) {
    return /* @__PURE__ */ import_react29.default.createElement(TextBody, { text: errorText2, isError: true });
  }
  return /* @__PURE__ */ import_react29.default.createElement(import_react29.default.Fragment, null, envelope.message === null ? null : /* @__PURE__ */ import_react29.default.createElement("p", { className: "aidos-tool-message" }, envelope.message), /* @__PURE__ */ import_react29.default.createElement(Facts, { facts }));
}
function useAidosRow(props) {
  const args = parseArgs(argsRawOf(props.block));
  const state = rowStateOf(props.block);
  const result = resultOf(props.block);
  const ticketId = ticketIdOf(args, result);
  const errorText2 = state === "error" ? errorTextOf(props.block) : null;
  const errorSummary = errorText2 !== null && errorText2 !== "" ? firstLineOfError(errorText2) : void 0;
  const envelope = errorText2 === null ? null : parseErrorEnvelope(errorText2);
  const shownState = state === "error" && envelope?.refusal === true ? "stopped" : state;
  return { args, state: shownState, result, ticketId, errorText: errorText2, errorSummary };
}
function AttachEvidenceRow(props) {
  const { args, state, result, ticketId, errorText: errorText2, errorSummary } = useAidosRow(props);
  const kind = typeof args?.kind === "string" ? args.kind : void 0;
  const body = errorText2 !== null && errorText2 !== "" ? errorBody(errorText2) : kind !== void 0 ? /* @__PURE__ */ import_react29.default.createElement("ul", { className: "aidos-evidence-list" }, /* @__PURE__ */ import_react29.default.createElement(
    EvidenceStrip,
    {
      row: {
        kind: kind.startsWith("builtin:") ? kind : "builtin:" + kind,
        payload: args?.payload ?? {},
        author: "agent",
        at: typeof result?.updatedAt === "number" ? result.updatedAt : void 0
      }
    }
  )) : null;
  return /* @__PURE__ */ import_react29.default.createElement(
    AidosRow,
    {
      title: "Attach evidence",
      summary: ticketLabel(ticketId) ?? "evidence",
      state,
      body,
      errorSummary,
      ticketId,
      sessionId: props.sessionId,
      useProjection: props.useProjection
    }
  );
}
function MoveTicketRow(props) {
  const { args, state, result, ticketId, errorText: errorText2, errorSummary } = useAidosRow(props);
  const to = typeof args?.to === "string" ? args.to : null;
  const label = ticketLabel(ticketId);
  const facts = ticketFacts(result);
  const body = errorText2 !== null && errorText2 !== "" ? errorBody(errorText2) : facts.length > 0 ? /* @__PURE__ */ import_react29.default.createElement(Facts, { facts }) : null;
  return /* @__PURE__ */ import_react29.default.createElement(
    AidosRow,
    {
      title: "Move ticket",
      summary: to === null ? label ?? "move" : `${label ?? ""} \u2192 ${to}`.trim(),
      state,
      body,
      errorSummary,
      ticketId,
      sessionId: props.sessionId,
      useProjection: props.useProjection
    }
  );
}
function SetTicketRow(props) {
  const { args, state, result, ticketId, errorText: errorText2, errorSummary } = useAidosRow(props);
  const created = result?.created === true;
  const title = typeof args?.title === "string" ? args.title : null;
  const summary = created && title !== null ? `#${ticketId ?? "?"} \u2014 ${title}` : ticketLabel(ticketId);
  const fields = writtenFields(args);
  const body = errorText2 !== null && errorText2 !== "" ? errorBody(errorText2) : fields.length > 0 ? /* @__PURE__ */ import_react29.default.createElement(Facts, { facts: fields }) : null;
  return /* @__PURE__ */ import_react29.default.createElement(
    AidosRow,
    {
      title: created ? "Create ticket" : "Edit ticket",
      summary: summary ?? "ticket",
      state,
      body,
      errorSummary,
      ticketId,
      sessionId: props.sessionId,
      useProjection: props.useProjection
    }
  );
}
function GetTicketRow(props) {
  const { state, result, ticketId, errorText: errorText2, errorSummary } = useAidosRow(props);
  const facts = ticketFacts(result);
  const evidence = ticketEvidence(result);
  const body = errorText2 !== null && errorText2 !== "" ? errorBody(errorText2) : facts.length === 0 && evidence.length === 0 ? null : /* @__PURE__ */ import_react29.default.createElement(import_react29.default.Fragment, null, /* @__PURE__ */ import_react29.default.createElement(Facts, { facts }), evidence.length > 0 ? /* @__PURE__ */ import_react29.default.createElement("ul", { className: "aidos-evidence-list" }, evidence.map((row, index) => /* @__PURE__ */ import_react29.default.createElement(
    EvidenceStrip,
    {
      key: index,
      row: {
        kind: row.kind,
        payload: { note: row.excerpt },
        author: row.author,
        at: row.at
      }
    }
  ))) : null);
  return /* @__PURE__ */ import_react29.default.createElement(
    AidosRow,
    {
      title: "Read ticket",
      summary: ticketLabel(ticketId) ?? "ticket",
      state,
      body,
      errorSummary,
      ticketId,
      sessionId: props.sessionId,
      useProjection: props.useProjection
    }
  );
}
function GetTicketsRow(props) {
  const { args, state, result, errorText: errorText2, errorSummary } = useAidosRow(props);
  const summary = typeof result?.summary === "string" ? result.summary : [
    Array.isArray(args?.stateIds) ? args.stateIds.join("|") : null,
    typeof args?.search === "string" && args.search !== "" ? `"${args.search}"` : null
  ].filter((part) => part !== null).join(" \xB7 ") || "the board";
  const lines = ticketLines(result);
  const body = errorText2 !== null && errorText2 !== "" ? errorBody(errorText2) : lines.length === 0 ? null : /* @__PURE__ */ import_react29.default.createElement("ul", { className: "aidos-tool-list" }, lines.map((line) => /* @__PURE__ */ import_react29.default.createElement("li", { key: line.id }, /* @__PURE__ */ import_react29.default.createElement("span", { className: "aidos-tool-list-key" }, "#", line.id), line.state === "" ? null : /* @__PURE__ */ import_react29.default.createElement("span", { className: "aidos-tool-list-tag" }, line.state), /* @__PURE__ */ import_react29.default.createElement("span", { className: "aidos-tool-list-text", title: line.title, "data-dsh-tip": "" }, line.title))));
  return /* @__PURE__ */ import_react29.default.createElement(
    AidosRow,
    {
      title: "Read the board",
      summary,
      state,
      body,
      errorSummary
    }
  );
}
function RequestAllowlistRow(props) {
  const { args, state, result, ticketId, errorText: errorText2, errorSummary } = useAidosRow(props);
  const paths = allowlistPaths(args, result);
  const label = ticketLabel(ticketId);
  const summary = (label ?? "allowlist") + " \xB7 " + paths.length + (paths.length === 1 ? " path" : " paths");
  const body = errorText2 !== null && errorText2 !== "" ? errorBody(errorText2) : paths.length === 0 ? null : /* @__PURE__ */ import_react29.default.createElement("ul", { className: "aidos-tool-list" }, paths.map((entry) => /* @__PURE__ */ import_react29.default.createElement("li", { key: entry.path }, /* @__PURE__ */ import_react29.default.createElement("span", { className: "aidos-tool-list-text" }, entry.path), entry.created ? /* @__PURE__ */ import_react29.default.createElement("span", { className: "aidos-tool-list-tag", title: "Does not exist yet; approving creates it", "data-dsh-tip": "" }, "will be created") : null)));
  return /* @__PURE__ */ import_react29.default.createElement(
    AidosRow,
    {
      title: "Request allowlist",
      summary,
      state,
      body,
      errorSummary,
      ticketId,
      sessionId: props.sessionId,
      useProjection: props.useProjection
    }
  );
}
function SuggestActionsRow(props) {
  const { args, state, errorText: errorText2, errorSummary } = useAidosRow(props);
  const lines = suggestionLines(args);
  const summary = lines.length === 0 ? "nothing" : lines.length === 1 ? ticketLabel(lines[0].ticketId) ?? "#" + lines[0].ticketId : lines.length + " tickets";
  const body = errorText2 !== null && errorText2 !== "" ? errorBody(errorText2) : lines.length === 0 ? null : /* @__PURE__ */ import_react29.default.createElement("ul", { className: "aidos-tool-list" }, lines.map((line) => /* @__PURE__ */ import_react29.default.createElement("li", { key: line.ticketId + ":" + line.actionId }, /* @__PURE__ */ import_react29.default.createElement("span", { className: "aidos-tool-list-key" }, "#", line.ticketId), /* @__PURE__ */ import_react29.default.createElement("span", { className: "aidos-tool-list-tag" }, line.actionId), /* @__PURE__ */ import_react29.default.createElement("span", { className: "aidos-tool-list-text", title: line.reason, "data-dsh-tip": "" }, line.reason))));
  return /* @__PURE__ */ import_react29.default.createElement(
    AidosRow,
    {
      title: "Suggest actions",
      summary,
      state,
      body,
      errorSummary,
      ticketId: lines.length === 1 ? lines[0].ticketId : null,
      sessionId: props.sessionId,
      useProjection: props.useProjection
    }
  );
}
function PlanRow(props) {
  const { args, state, errorText: errorText2, errorSummary } = useAidosRow(props);
  const text = errorText2 ?? resultTextOf(props.block);
  const summary = args?.projectId === void 0 ? "the project plan" : "project " + String(args.projectId);
  return /* @__PURE__ */ import_react29.default.createElement(
    AidosRow,
    {
      title: "Export plan",
      summary,
      state,
      body: text === null || text === "" ? null : /* @__PURE__ */ import_react29.default.createElement(TextBody, { text, isError: errorText2 !== null && state === "error" }),
      errorSummary
    }
  );
}
function PlanImportRow(props) {
  const { args, state, result, errorText: errorText2, errorSummary } = useAidosRow(props);
  const file = typeof args?.file === "string" ? args.file : "a plan";
  const facts = [];
  const imported = result?.imported ?? result?.count;
  if (typeof imported === "number") facts.push({ label: "Imported", value: String(imported) });
  if (typeof result?.projectId === "number") {
    facts.push({ label: "Project", value: String(result.projectId) });
  }
  const body = errorText2 !== null && errorText2 !== "" ? errorBody(errorText2) : facts.length > 0 ? /* @__PURE__ */ import_react29.default.createElement(Facts, { facts }) : null;
  return /* @__PURE__ */ import_react29.default.createElement(
    AidosRow,
    {
      title: "Import plan",
      summary: file,
      state,
      body,
      errorSummary
    }
  );
}
function PlanMetaRow(props) {
  const { args, state, result, errorText: errorText2, errorSummary } = useAidosRow(props);
  const summary = args?.projectId === void 0 ? "the plan blocks" : "project " + String(args.projectId);
  const facts = [];
  for (const block of ["frontmatter", "preamble"]) {
    const value = result?.[block];
    if (typeof value === "string") {
      facts.push({ label: block, value: value === "" ? "(empty)" : value });
    }
  }
  if (Array.isArray(result?.contextSections)) {
    facts.push({
      label: "contextSections",
      value: String(result.contextSections.length)
    });
  }
  const body = errorText2 !== null && errorText2 !== "" ? errorBody(errorText2) : facts.length > 0 ? /* @__PURE__ */ import_react29.default.createElement(Facts, { facts }) : null;
  return /* @__PURE__ */ import_react29.default.createElement(
    AidosRow,
    {
      title: "Read plan blocks",
      summary,
      state,
      body,
      errorSummary
    }
  );
}
function PlanMetaSetRow(props) {
  const { args, state, errorText: errorText2, errorSummary } = useAidosRow(props);
  const blocks = planBlocksWritten(args);
  const written = writtenFields(args).filter((fact) => fact.label !== "projectId");
  const body = errorText2 !== null && errorText2 !== "" ? errorBody(errorText2) : written.length > 0 ? /* @__PURE__ */ import_react29.default.createElement(Facts, { facts: written }) : null;
  return /* @__PURE__ */ import_react29.default.createElement(
    AidosRow,
    {
      title: "Edit plan blocks",
      summary: blocks.length === 0 ? "no block" : blocks.join(" \xB7 "),
      state,
      body,
      errorSummary
    }
  );
}
var AIDOS_ROWS = [
  ["get_tickets", GetTicketsRow],
  ["get_ticket", GetTicketRow],
  ["set_ticket", SetTicketRow],
  ["attach_evidence", AttachEvidenceRow],
  ["move_ticket", MoveTicketRow],
  ["request_allowlist", RequestAllowlistRow],
  ["suggest_actions", SuggestActionsRow],
  ["plan", PlanRow],
  ["plan_import", PlanImportRow],
  ["plan_meta", PlanMetaRow],
  ["plan_meta_set", PlanMetaSetRow]
];

// src/client/index.ts
var name = "aidos";
var inject = ["slots"];
var AIDOS_PRESET = "aidos";
function injectStyles() {
  if (typeof document === "undefined") return;
  for (const sheet of [
    { marker: "aidos/board.css", text: board_default },
    { marker: "aidos/plan-meta.css", text: plan_meta_default },
    { marker: "aidos/tool-render.css", text: tool_render_default }
  ]) {
    if (document.querySelector(`style[data-plugin-css="${sheet.marker}"]`) !== null) {
      continue;
    }
    const tag = document.createElement("style");
    tag.dataset.plugin = "aidos";
    tag.dataset.pluginCss = sheet.marker;
    tag.textContent = sheet.text;
    document.head.appendChild(tag);
  }
}
function guardRow(key, Row) {
  return function GuardedRow(props) {
    try {
      return Row(props);
    } catch (error) {
      console.warn(`aidos: the ${key} tool row failed to render`, error);
      return import_react30.default.createElement(
        "div",
        { className: "tool-render-card" },
        import_react30.default.createElement(
          "div",
          { className: "tool-render-row", "data-state": "error" },
          import_react30.default.createElement("span", { className: "tool-render-title" }, key),
          import_react30.default.createElement("span", { className: "tool-render-sep" }),
          import_react30.default.createElement(
            "span",
            { className: "tool-render-summary" },
            "this card could not render; the call itself was unaffected"
          )
        )
      );
    }
  };
}
function registerScratchRows(slots) {
  const disposers = [];
  for (const [key, Row] of [...SCRATCH_ROWS, ...AIDOS_ROWS]) {
    try {
      disposers.push(
        slots.register(
          { name: "tool.call.toolview", key, priority: -100 },
          guardRow(key, Row)
        )
      );
    } catch (error) {
      console.warn(
        `aidos: the ${key} tool row could not register; the other rows continue`,
        error
      );
    }
  }
  return function() {
    for (const dispose of disposers) dispose();
  };
}
function registerTicketsTab(slots) {
  return slots.inject(
    "conversation.view",
    () => slots.register(
      {
        name: "conversation.view",
        id: "tickets",
        order: 20,
        label: badgeLabel
      },
      LocalTicketView
    )
  );
}
function apply(ctx) {
  injectStyles();
  ctx.effect(() => {
    const slots = ctx.get("slots");
    if (slots === void 0) return () => {
    };
    return registerScratchRows(slots);
  }, "aidos: scratch tool rows");
  let registration = null;
  let want = false;
  function reconcile(slots) {
    if (want && registration === null) {
      registration = registerTicketsTab(slots);
    }
    if (!want && registration !== null) {
      registration();
      registration = null;
    }
  }
  ctx.effect(function() {
    const slots = ctx.get("slots");
    if (slots === void 0) return () => {
    };
    const sessions = ctx.get("sessions");
    if (sessions === void 0 || typeof sessions.list?.getSnapshot !== "function" || typeof sessions.list?.subscribe !== "function") {
      want = true;
      reconcile(slots);
      return function() {
        want = false;
        reconcile(slots);
      };
    }
    let list = sessions.list.getSnapshot();
    const sync = function() {
      const preset = list.current ? list.byId[list.current]?.agentPreset : void 0;
      want = preset === void 0 || preset === AIDOS_PRESET;
      reconcile(slots);
    };
    const disposeSubscribe = sessions.list.subscribe(function() {
      list = sessions.list.getSnapshot();
      sync();
    });
    sync();
    return function() {
      disposeSubscribe();
      want = false;
      reconcile(slots);
    };
  }, "aidos: tickets tab visibility");
  let lastLabel = badgeLabel();
  setCountCallback(function() {
    if (registration === null) return;
    const next = badgeLabel();
    if (next === lastLabel) return;
    const slots = ctx.get("slots");
    if (slots === void 0) return;
    try {
      registration();
      registration = registerTicketsTab(slots);
      lastLabel = next;
      console.info(`[aidos] tab re-registered for label "${next}" <- this remounts the board`);
    } catch (error) {
      registration = null;
      console.error(
        "aidos: the Tickets tab failed to re-register after a badge change; the tab may show a stale count until the next visibility change",
        error
      );
    }
  });
}
		return module.exports;
	}
});
