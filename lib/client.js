window.__ModuleLoader__.load({
	id: "aidos",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
"use strict";var tu=Object.create;var ro=Object.defineProperty;var iu=Object.getOwnPropertyDescriptor;var ou=Object.getOwnPropertyNames;var ru=Object.getPrototypeOf,au=Object.prototype.hasOwnProperty;var su=(e,n)=>()=>{try{return n||e((n={exports:{}}).exports,n),n.exports}catch(t){throw n=0,t}},lu=(e,n)=>{for(var t in n)ro(e,t,{get:n[t],enumerable:!0})},Na=(e,n,t,i)=>{if(n&&typeof n=="object"||typeof n=="function")for(let o of ou(n))!au.call(e,o)&&o!==t&&ro(e,o,{get:()=>n[o],enumerable:!(i=iu(n,o))||i.enumerable});return e};var de=(e,n,t)=>(t=e!=null?tu(ru(e)):{},Na(n||!e||!e.__esModule?ro(t,"default",{value:e,enumerable:!0}):t,e)),du=e=>Na(ro({},"__esModule",{value:!0}),e);var Qd=su((mk,Wd)=>{"use strict";function Dd(e){return e instanceof Map?e.clear=e.delete=e.set=function(){throw new Error("map is read-only")}:e instanceof Set&&(e.add=e.clear=e.delete=function(){throw new Error("set is read-only")}),Object.freeze(e),Object.getOwnPropertyNames(e).forEach(n=>{let t=e[n],i=typeof t;(i==="object"||i==="function")&&!Object.isFrozen(t)&&Dd(t)}),e}var Lo=class{constructor(n){n.data===void 0&&(n.data={}),this.data=n.data,this.isMatchIgnored=!1}ignoreMatch(){this.isMatchIgnored=!0}};function Bd(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#x27;")}function xt(e,...n){let t=Object.create(null);for(let i in e)t[i]=e[i];return n.forEach(function(i){for(let o in i)t[o]=i[o]}),t}var Kh="</span>",_d=e=>!!e.scope,Fh=(e,{prefix:n})=>{if(e.startsWith("language:"))return e.replace("language:","language-");if(e.includes(".")){let t=e.split(".");return[`${n}${t.shift()}`,...t.map((i,o)=>`${i}${"_".repeat(o+1)}`)].join(" ")}return`${n}${e}`},na=class{constructor(n,t){this.buffer="",this.classPrefix=t.classPrefix,n.walk(this)}addText(n){this.buffer+=Bd(n)}openNode(n){if(!_d(n))return;let t=Fh(n.scope,{prefix:this.classPrefix});this.span(t)}closeNode(n){_d(n)&&(this.buffer+=Kh)}value(){return this.buffer}span(n){this.buffer+=`<span class="${n}">`}},Cd=(e={})=>{let n={children:[]};return Object.assign(n,e),n},ta=class e{constructor(){this.rootNode=Cd(),this.stack=[this.rootNode]}get top(){return this.stack[this.stack.length-1]}get root(){return this.rootNode}add(n){this.top.children.push(n)}openNode(n){let t=Cd({scope:n});this.add(t),this.stack.push(t)}closeNode(){if(this.stack.length>1)return this.stack.pop()}closeAllNodes(){for(;this.closeNode(););}toJSON(){return JSON.stringify(this.rootNode,null,4)}walk(n){return this.constructor._walk(n,this.rootNode)}static _walk(n,t){return typeof t=="string"?n.addText(t):t.children&&(n.openNode(t),t.children.forEach(i=>this._walk(n,i)),n.closeNode(t)),n}static _collapse(n){typeof n!="string"&&n.children&&(n.children.every(t=>typeof t=="string")?n.children=[n.children.join("")]:n.children.forEach(t=>{e._collapse(t)}))}},ia=class extends ta{constructor(n){super(),this.options=n}addText(n){n!==""&&this.add(n)}startScope(n){this.openNode(n)}endScope(){this.closeNode()}__addSublanguage(n,t){let i=n.root;t&&(i.scope=`language:${t}`),this.add(i)}toHTML(){return new na(this,this.options).value()}finalize(){return this.closeAllNodes(),!0}};function Hi(e){return e?typeof e=="string"?e:e.source:null}function zd(e){return Gt("(?=",e,")")}function $h(e){return Gt("(?:",e,")*")}function jh(e){return Gt("(?:",e,")?")}function Gt(...e){return e.map(t=>Hi(t)).join("")}function Uh(e){let n=e[e.length-1];return typeof n=="object"&&n.constructor===Object?(e.splice(e.length-1,1),n):{}}function Bo(...e){return"("+(Uh(e).capture?"":"?:")+e.map(i=>Hi(i)).join("|")+")"}function Kd(e){return new RegExp(e.toString()+"|").exec("").length-1}function Vh(e,n){let t=e&&e.exec(n);return t&&t.index===0}var qh=new RegExp(Bo(/\[(?:[^\\\]]|\\.)*\]/,/\(\?<(?![=!])[^>]+>/,/\(\?'[^']+'/,/\(\??/,/\\([1-9][0-9]*)/,/\\./));function ra(e,{joinWith:n}){let t=0;return e.map(i=>{t+=1;let o=t,r=Hi(i),s="";for(;r.length>0;){let a=qh.exec(r);if(!a){s+=r;break}s+=r.substring(0,a.index),r=r.substring(a.index+a[0].length),a[0][0]==="\\"&&a[1]?s+="\\"+String(Number(a[1])+o):(s+=a[0],(a[0]==="("||/^\(\?[<']/.test(a[0]))&&t++)}return s}).map(i=>`(${i})`).join(n)}var Hh=/\b\B/,Fd="[a-zA-Z]\\w*",aa="[a-zA-Z_]\\w*",$d="\\b\\d+(\\.\\d+)?",jd="(-?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)",Ud="\\b(0b[01]+)",Gh="!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|>>|>|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~",Wh=(e={})=>{let n=/^#![ ]*\//;return e.binary&&(e.begin=Gt(n,/.*\b/,e.binary,/\b.*/)),xt({scope:"meta",begin:n,end:/$/,relevance:0,"on:begin":(t,i)=>{t.index!==0&&i.ignoreMatch()}},e)},Gi={begin:"\\\\[\\s\\S]",relevance:0},Qh={scope:"string",begin:"'",end:"'",illegal:"\\n",contains:[Gi]},Yh={scope:"string",begin:'"',end:'"',illegal:"\\n",contains:[Gi]},Zh={begin:/\b(a|an|the|are|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such|will|you|your|they|like|more)\b/},zo=function(e,n,t={}){let i=xt({scope:"comment",begin:e,end:n,contains:[]},t);i.contains.push({scope:"doctag",begin:"[ ]*(?=(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):)",end:/(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):/,excludeBegin:!0,relevance:0});let o=Bo("I","a","is","so","us","to","at","if","in","it","on",/[A-Za-z]+['](d|ve|re|ll|t|s|n)/,/[A-Za-z]+[-][a-z]+/,/[A-Za-z][a-z]{2,}/);return i.contains.push({begin:Gt(/[ ]+/,"(",o,/[.]?[:]?([.][ ]|[ ])/,"){3}")}),i},Jh=zo("//","$"),Xh=zo("/\\*","\\*/"),eg=zo("#","$"),ng={scope:"number",begin:$d,relevance:0},tg={scope:"number",begin:jd,relevance:0},ig={scope:"number",begin:Ud,relevance:0},og={scope:"regexp",begin:/\/(?=[^/\n]*\/)/,end:/\/[gimuy]*/,contains:[Gi,{begin:/\[/,end:/\]/,relevance:0,contains:[Gi]}]},rg={scope:"title",begin:Fd,relevance:0},ag={scope:"title",begin:aa,relevance:0},sg={begin:"\\.\\s*"+aa,relevance:0},lg=function(e){return Object.assign(e,{"on:begin":(n,t)=>{t.data._beginMatch=n[1]},"on:end":(n,t)=>{t.data._beginMatch!==n[1]&&t.ignoreMatch()}})},Mo=Object.freeze({__proto__:null,APOS_STRING_MODE:Qh,BACKSLASH_ESCAPE:Gi,BINARY_NUMBER_MODE:ig,BINARY_NUMBER_RE:Ud,COMMENT:zo,C_BLOCK_COMMENT_MODE:Xh,C_LINE_COMMENT_MODE:Jh,C_NUMBER_MODE:tg,C_NUMBER_RE:jd,END_SAME_AS_BEGIN:lg,HASH_COMMENT_MODE:eg,IDENT_RE:Fd,MATCH_NOTHING_RE:Hh,METHOD_GUARD:sg,NUMBER_MODE:ng,NUMBER_RE:$d,PHRASAL_WORDS_MODE:Zh,QUOTE_STRING_MODE:Yh,REGEXP_MODE:og,RE_STARTERS_RE:Gh,SHEBANG:Wh,TITLE_MODE:rg,UNDERSCORE_IDENT_RE:aa,UNDERSCORE_TITLE_MODE:ag});function dg(e,n){e.input[e.index-1]==="."&&n.ignoreMatch()}function cg(e,n){e.className!==void 0&&(e.scope=e.className,delete e.className)}function ug(e,n){n&&e.beginKeywords&&(e.begin="\\b("+e.beginKeywords.split(" ").join("|")+")(?!\\.)(?=\\b|\\s)",e.__beforeBegin=dg,e.keywords=e.keywords||e.beginKeywords,delete e.beginKeywords,e.relevance===void 0&&(e.relevance=0))}function pg(e,n){Array.isArray(e.illegal)&&(e.illegal=Bo(...e.illegal))}function fg(e,n){if(e.match){if(e.begin||e.end)throw new Error("begin & end are not supported with match");e.begin=e.match,delete e.match}}function hg(e,n){e.relevance===void 0&&(e.relevance=1)}var gg=(e,n)=>{if(!e.beforeMatch)return;if(e.starts)throw new Error("beforeMatch cannot be used with starts");let t=Object.assign({},e);Object.keys(e).forEach(i=>{delete e[i]}),e.keywords=t.keywords,e.begin=Gt(t.beforeMatch,zd(t.begin)),e.starts={relevance:0,contains:[Object.assign(t,{endsParent:!0})]},e.relevance=0,delete t.beforeMatch},mg=["of","and","for","in","not","or","if","then","parent","list","value"],bg="keyword";function Vd(e,n,t=bg){let i=Object.create(null);return typeof e=="string"?o(t,e.split(" ")):Array.isArray(e)?o(t,e):Object.keys(e).forEach(function(r){Object.assign(i,Vd(e[r],n,r))}),i;function o(r,s){n&&(s=s.map(a=>a.toLowerCase())),s.forEach(function(a){let l=a.split("|");i[l[0]]=[r,wg(l[0],l[1])]})}}function wg(e,n){return n?Number(n):yg(e)?0:1}function yg(e){return mg.includes(e.toLowerCase())}var Od={},Ht=e=>{console.error(e)},Pd=(e,...n)=>{console.log(`WARN: ${e}`,...n)},wi=(e,n)=>{Od[`${e}/${n}`]||(console.log(`Deprecated as of ${e}. ${n}`),Od[`${e}/${n}`]=!0)},Do=new Error;function qd(e,n,{key:t}){let i=0,o=e[t],r={},s={};for(let a=1;a<=n.length;a++)s[a+i]=o[a],r[a+i]=!0,i+=Kd(n[a-1]);e[t]=s,e[t]._emit=r,e[t]._multi=!0}function vg(e){if(Array.isArray(e.begin)){if(e.skip||e.excludeBegin||e.returnBegin)throw Ht("skip, excludeBegin, returnBegin not compatible with beginScope: {}"),Do;if(typeof e.beginScope!="object"||e.beginScope===null)throw Ht("beginScope must be object"),Do;qd(e,e.begin,{key:"beginScope"}),e.begin=ra(e.begin,{joinWith:""})}}function kg(e){if(Array.isArray(e.end)){if(e.skip||e.excludeEnd||e.returnEnd)throw Ht("skip, excludeEnd, returnEnd not compatible with endScope: {}"),Do;if(typeof e.endScope!="object"||e.endScope===null)throw Ht("endScope must be object"),Do;qd(e,e.end,{key:"endScope"}),e.end=ra(e.end,{joinWith:""})}}function xg(e){e.scope&&typeof e.scope=="object"&&e.scope!==null&&(e.beginScope=e.scope,delete e.scope)}function Sg(e){xg(e),typeof e.beginScope=="string"&&(e.beginScope={_wrap:e.beginScope}),typeof e.endScope=="string"&&(e.endScope={_wrap:e.endScope}),vg(e),kg(e)}function Tg(e){function n(s,a){return new RegExp(Hi(s),"m"+(e.case_insensitive?"i":"")+(e.unicodeRegex?"u":"")+(a?"g":""))}class t{constructor(){this.matchIndexes={},this.regexes=[],this.matchAt=1,this.position=0}addRule(a,l){l.position=this.position++,this.matchIndexes[this.matchAt]=l,this.regexes.push([l,a]),this.matchAt+=Kd(a)+1}compile(){this.regexes.length===0&&(this.exec=()=>null);let a=this.regexes.map(l=>l[1]);this.matcherRe=n(ra(a,{joinWith:"|"}),!0),this.lastIndex=0}exec(a){this.matcherRe.lastIndex=this.lastIndex;let l=this.matcherRe.exec(a);if(!l)return null;let d=l.findIndex((f,p)=>p>0&&f!==void 0),c=this.matchIndexes[d];return l.splice(0,d),Object.assign(l,c)}}class i{constructor(){this.rules=[],this.multiRegexes=[],this.count=0,this.lastIndex=0,this.regexIndex=0}getMatcher(a){if(this.multiRegexes[a])return this.multiRegexes[a];let l=new t;return this.rules.slice(a).forEach(([d,c])=>l.addRule(d,c)),l.compile(),this.multiRegexes[a]=l,l}resumingScanAtSamePosition(){return this.regexIndex!==0}considerAll(){this.regexIndex=0}addRule(a,l){this.rules.push([a,l]),l.type==="begin"&&this.count++}exec(a){let l=this.getMatcher(this.regexIndex);l.lastIndex=this.lastIndex;let d=l.exec(a);if(this.resumingScanAtSamePosition()&&!(d&&d.index===this.lastIndex)){let c=this.getMatcher(0);c.lastIndex=this.lastIndex+1,d=c.exec(a)}return d&&(this.regexIndex+=d.position+1,this.regexIndex===this.count&&this.considerAll()),d}}function o(s){let a=new i;return s.contains.forEach(l=>a.addRule(l.begin,{rule:l,type:"begin"})),s.terminatorEnd&&a.addRule(s.terminatorEnd,{type:"end"}),s.illegal&&a.addRule(s.illegal,{type:"illegal"}),a}function r(s,a){let l=s;if(s.isCompiled)return l;[cg,fg,Sg,gg].forEach(c=>c(s,a)),e.compilerExtensions.forEach(c=>c(s,a)),s.__beforeBegin=null,[ug,pg,hg].forEach(c=>c(s,a)),s.isCompiled=!0;let d=null;return typeof s.keywords=="object"&&s.keywords.$pattern&&(s.keywords=Object.assign({},s.keywords),d=s.keywords.$pattern,delete s.keywords.$pattern),d=d||/\w+/,s.keywords&&(s.keywords=Vd(s.keywords,e.case_insensitive)),l.keywordPatternRe=n(d,!0),a&&(s.begin||(s.begin=/\B|\b/),l.beginRe=n(l.begin),!s.end&&!s.endsWithParent&&(s.end=/\B|\b/),s.end&&(l.endRe=n(l.end)),l.terminatorEnd=Hi(l.end)||"",s.endsWithParent&&a.terminatorEnd&&(l.terminatorEnd+=(s.end?"|":"")+a.terminatorEnd)),s.illegal&&(l.illegalRe=n(s.illegal)),s.contains||(s.contains=[]),s.contains=[].concat(...s.contains.map(function(c){return Eg(c==="self"?s:c)})),s.contains.forEach(function(c){r(c,l)}),s.starts&&r(s.starts,a),l.matcher=o(l),l}if(e.compilerExtensions||(e.compilerExtensions=[]),e.contains&&e.contains.includes("self"))throw new Error("ERR: contains `self` is not supported at the top-level of a language.  See documentation.");return e.classNameAliases=xt(e.classNameAliases||{}),r(e)}function Hd(e){return e?e.endsWithParent||Hd(e.starts):!1}function Eg(e){return e.variants&&!e.cachedVariants&&(e.cachedVariants=e.variants.map(function(n){return xt(e,{variants:null},n)})),e.cachedVariants?e.cachedVariants:Hd(e)?xt(e,{starts:e.starts?xt(e.starts):null}):Object.isFrozen(e)?xt(e):e}var Rg="11.12.0",oa=class extends Error{constructor(n,t){super(n),this.name="HTMLInjectionError",this.html=t}},ea=Bd,Md=xt,Ld=Symbol("nomatch"),Ag=7,Gd=function(e){let n=Object.create(null),t=Object.create(null),i=[],o=!0,r="Could not find the language '{}', did you forget to load/include a language module?",s={disableAutodetect:!0,name:"Plain text",contains:[]},a={ignoreUnescapedHTML:!1,throwUnescapedHTML:!1,noHighlightRe:/^(no-?highlight)$/i,languageDetectRe:/\blang(?:uage)?-([\w-]+)\b/i,classPrefix:"hljs-",cssSelector:"pre code",languages:null,__emitter:ia};function l(R){return a.noHighlightRe.test(R)}function d(R){let b=R.className+" ";b+=R.parentNode?R.parentNode.className:"";let N=a.languageDetectRe.exec(b);if(N){let B=T(N[1]);return B||(Pd(r.replace("{}",N[1])),Pd("Falling back to no-highlight mode for this block.",R)),B?N[1]:"no-highlight"}return b.split(/\s+/).find(B=>l(B)||T(B))}function c(R,b,N){let B="",H="";typeof b=="object"?(B=R,N=b.ignoreIllegals,H=b.language):(wi("10.7.0","highlight(lang, code, ...args) has been deprecated."),wi("10.7.0",`Please use highlight(code, options) instead.
https://github.com/highlightjs/highlight.js/issues/2277`),H=R,B=b),N===void 0&&(N=!0);let he={code:B,language:H};Be("before:highlight",he);let _e=he.result?he.result:f(he.language,he.code,N);return _e.code=he.code,Be("after:highlight",_e),_e}function f(R,b,N,B){let H=Object.create(null);function he(O,D){return O.keywords[D]}function _e(){if(!V.keywords){Ae.addText(fe);return}let O=0;V.keywordPatternRe.lastIndex=0;let D=V.keywordPatternRe.exec(fe),G="";for(;D;){G+=fe.substring(O,D.index);let ie=re.case_insensitive?D[0].toLowerCase():D[0],Oe=he(V,ie);if(Oe){let[Pe,Wn]=Oe;if(Ae.addText(G),G="",H[ie]=(H[ie]||0)+1,H[ie]<=Ag&&(Ye+=Wn),Pe.startsWith("_"))G+=D[0];else{let An=re.classNameAliases[Pe]||Pe;te(D[0],An)}}else G+=D[0];O=V.keywordPatternRe.lastIndex,D=V.keywordPatternRe.exec(fe)}G+=fe.substring(O),Ae.addText(G)}function ze(){if(fe==="")return;let O=null;if(typeof V.subLanguage=="string"){if(!n[V.subLanguage]){Ae.addText(fe);return}O=f(V.subLanguage,fe,!0,Ke[V.subLanguage]),Ke[V.subLanguage]=O._top}else O=h(fe,V.subLanguage.length?V.subLanguage:null);V.relevance>0&&(Ye+=O.relevance),Ae.__addSublanguage(O._emitter,O.language)}function He(){V.subLanguage!=null?ze():_e(),fe=""}function te(O,D){O!==""&&(Ae.startScope(D),Ae.addText(O),Ae.endScope())}function ot(O,D){let G=1,ie=D.length-1;for(;G<=ie;){if(!O._emit[G]){G++;continue}let Oe=re.classNameAliases[O[G]]||O[G],Pe=D[G];Oe?te(Pe,Oe):(fe=Pe,_e(),fe=""),G++}}function rt(O,D){return O.scope&&typeof O.scope=="string"&&Ae.openNode(re.classNameAliases[O.scope]||O.scope),O.beginScope&&(O.beginScope._wrap?(te(fe,re.classNameAliases[O.beginScope._wrap]||O.beginScope._wrap),fe=""):O.beginScope._multi&&(ot(O.beginScope,D),fe="")),V=Object.create(O,{parent:{value:V}}),V}function at(O,D,G){let ie=Vh(O.endRe,G);if(ie){if(O["on:end"]){let Oe=new Lo(O);O["on:end"](D,Oe),Oe.isMatchIgnored&&(ie=!1)}if(ie){for(;O.endsParent&&O.parent;)O=O.parent;return O}}if(O.endsWithParent)return at(O.parent,D,G)}function Rt(O){return V.matcher.regexIndex===0?(fe+=O[0],1):(Gn=!0,0)}function At(O){let D=O[0],G=O.rule,ie=new Lo(G),Oe=[G.__beforeBegin,G["on:begin"]];for(let Pe of Oe)if(Pe&&(Pe(O,ie),ie.isMatchIgnored))return Rt(D);return G.skip?fe+=D:(G.excludeBegin&&(fe+=D),He(),!G.returnBegin&&!G.excludeBegin&&(fe=D)),rt(G,O),G.returnBegin?0:D.length}function Wt(O){let D=O[0],G=b.substring(O.index),ie=at(V,O,G);if(!ie)return Ld;let Oe=V;V.endScope&&V.endScope._wrap?(He(),te(D,V.endScope._wrap)):V.endScope&&V.endScope._multi?(He(),ot(V.endScope,O)):Oe.skip?fe+=D:(Oe.returnEnd||Oe.excludeEnd||(fe+=D),He(),Oe.excludeEnd&&(fe=D));do V.scope&&Ae.closeNode(),!V.skip&&!V.subLanguage&&(Ye+=V.relevance),V=V.parent;while(V!==ie.parent);return ie.starts&&rt(ie.starts,O),Oe.returnEnd?0:D.length}function Qt(){let O=[];for(let D=V;D!==re;D=D.parent)D.scope&&O.unshift(D.scope);O.forEach(D=>Ae.openNode(D))}let Ln={};function It(O,D){let G=D&&D[0];if(fe+=O,G==null)return He(),0;if(Ln.type==="begin"&&D.type==="end"&&Ln.index===D.index&&G===""){if(fe+=b.slice(D.index,D.index+1),!o){let ie=new Error(`0 width match regex (${R})`);throw ie.languageName=R,ie.badRule=Ln.rule,ie}return 1}if(Ln=D,D.type==="begin")return At(D);if(D.type==="illegal"&&!N){let ie=new Error('Illegal lexeme "'+G+'" for mode "'+(V.scope||"<unnamed>")+'"');throw ie.mode=V,ie}else if(D.type==="end"){let ie=Wt(D);if(ie!==Ld)return ie}if(D.type==="illegal"&&G==="")return D.index===b.length||(fe+=`
`),1;if(Dn>1e5&&Dn>D.index*3)throw new Error("potential infinite loop, way more iterations than matches");return fe+=G,G.length}let re=T(R);if(!re)throw Ht(r.replace("{}",R)),new Error('Unknown language: "'+R+'"');let Nt=Tg(re),ge="",V=B||Nt,Ke={},Ae=new a.__emitter(a);Qt();let fe="",Ye=0,gn=0,Dn=0,Gn=!1;try{if(re.__emitTokens)re.__emitTokens(b,Ae);else{for(V.matcher.considerAll();;){Dn++,Gn?Gn=!1:V.matcher.considerAll(),V.matcher.lastIndex=gn;let O=V.matcher.exec(b);if(!O)break;let D=b.substring(gn,O.index),G=It(D,O);gn=O.index+G}It(b.substring(gn))}return Ae.finalize(),ge=Ae.toHTML(),{language:R,value:ge,relevance:Ye,illegal:!1,_emitter:Ae,_top:V}}catch(O){if(O.message&&O.message.includes("Illegal"))return{language:R,value:ea(b),illegal:!0,relevance:0,_illegalBy:{message:O.message,index:gn,context:b.slice(gn-100,gn+100),mode:O.mode,resultSoFar:ge},_emitter:Ae};if(o)return{language:R,value:ea(b),illegal:!1,relevance:0,errorRaised:O,_emitter:Ae,_top:V};throw O}}function p(R){let b={value:ea(R),illegal:!1,relevance:0,_top:s,_emitter:new a.__emitter(a)};return b._emitter.addText(R),b}function h(R,b){b=b||a.languages||Object.keys(n);let N=p(R),B=b.filter(T).filter(pe).map(He=>f(He,R,!1));B.unshift(N);let H=B.sort((He,te)=>{if(He.relevance!==te.relevance)return te.relevance-He.relevance;if(He.language&&te.language){if(T(He.language).supersetOf===te.language)return 1;if(T(te.language).supersetOf===He.language)return-1}return 0}),[he,_e]=H,ze=he;return ze.secondBest=_e,ze}function y(R,b,N){let B=b&&t[b]||N;R.classList.add("hljs"),R.classList.add(`language-${B}`)}function k(R){let b=null,N=d(R);if(l(N))return;if(Be("before:highlightElement",{el:R,language:N}),R.dataset.highlighted){console.log("Element previously highlighted. To highlight again, first unset `dataset.highlighted`.",R);return}if(R.children.length>0&&(a.ignoreUnescapedHTML||(console.warn("One of your code blocks includes unescaped HTML. This is a potentially serious security risk."),console.warn("https://github.com/highlightjs/highlight.js/wiki/security"),console.warn("The element with unescaped HTML:"),console.warn(R)),a.throwUnescapedHTML))throw new oa("One of your code blocks includes unescaped HTML.",R.innerHTML);b=R;let B=b.textContent,H=N?c(B,{language:N,ignoreIllegals:!0}):h(B);R.innerHTML=H.value,R.dataset.highlighted="yes",y(R,N,H.language),R.result={language:H.language,re:H.relevance,relevance:H.relevance},H.secondBest&&(R.secondBest={language:H.secondBest.language,relevance:H.secondBest.relevance}),Be("after:highlightElement",{el:R,result:H,text:B})}function I(R){a=Md(a,R)}let v=()=>{Q(),wi("10.6.0","initHighlighting() deprecated.  Use highlightAll() now.")};function P(){Q(),wi("10.6.0","initHighlightingOnLoad() deprecated.  Use highlightAll() now.")}let F=!1;function Q(){function R(){Q()}if(document.readyState==="loading"){F||window.addEventListener("DOMContentLoaded",R,!1),F=!0;return}document.querySelectorAll(a.cssSelector).forEach(k)}function A(R,b){let N=null;try{N=b(e)}catch(B){if(Ht("Language definition for '{}' could not be registered.".replace("{}",R)),o)Ht(B);else throw B;N=s}N.name||(N.name=R),n[R]=N,N.rawDefinition=b.bind(null,e),N.aliases&&Z(N.aliases,{languageName:R})}function j(R){delete n[R];for(let b of Object.keys(t))t[b]===R&&delete t[b]}function se(){return Object.keys(n)}function T(R){return R=(R||"").toLowerCase(),n[R]||n[t[R]]}function Z(R,{languageName:b}){typeof R=="string"&&(R=[R]),R.forEach(N=>{t[N.toLowerCase()]=b})}function pe(R){let b=T(R);return b&&!b.disableAutodetect}function qe(R){R["before:highlightBlock"]&&!R["before:highlightElement"]&&(R["before:highlightElement"]=b=>{R["before:highlightBlock"](Object.assign({block:b.el},b))}),R["after:highlightBlock"]&&!R["after:highlightElement"]&&(R["after:highlightElement"]=b=>{R["after:highlightBlock"](Object.assign({block:b.el},b))})}function tn(R){qe(R),i.push(R)}function sn(R){let b=i.indexOf(R);b!==-1&&i.splice(b,1)}function Be(R,b){let N=R;i.forEach(function(B){B[N]&&B[N](b)})}function hn(R){return wi("10.7.0","highlightBlock will be removed entirely in v12.0"),wi("10.7.0","Please use highlightElement now."),k(R)}Object.assign(e,{highlight:c,highlightAuto:h,highlightAll:Q,highlightElement:k,highlightBlock:hn,configure:I,initHighlighting:v,initHighlightingOnLoad:P,registerLanguage:A,unregisterLanguage:j,listLanguages:se,getLanguage:T,registerAliases:Z,autoDetection:pe,inherit:Md,addPlugin:tn,removePlugin:sn}),e.debugMode=function(){o=!1},e.safeMode=function(){o=!0},e.versionString=Rg,e.regex={concat:Gt,lookahead:zd,either:Bo,optional:jh,anyNumberOfTimes:$h};for(let R in Mo)typeof Mo[R]=="object"&&Dd(Mo[R]);return Object.assign(e,Mo),e},yi=Gd({});yi.newInstance=()=>Gd({});Wd.exports=yi;yi.HighlightJS=yi;yi.default=yi});var qm={};lu(qm,{apply:()=>Vm,inject:()=>Fm,name:()=>Km,registerScratchRows:()=>Vc});module.exports=du(qm);var _a=`/* Dark Settings Form Control Design System \u2014 applied to aidos board */

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

  /* #108: retirement is a HIDING, not a verdict and not a state. Muted
     slate, in the same mid-saturation family as --state-open (which is also
     a resting state), so a retired chip reads as "parked" rather than as
     "wrong". Own token, never borrowed: recolouring the states must not
     recolour retirement, and recolouring retirement must not recolour
     states. */
  --verdict-retired: #5a6472;
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
  /* #213: the board sidebar's sizing lives HERE, in the mounting context,
     not on .aidos-detail itself: fixed, non-flexing, beside the grid. */
  flex: none;
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

/*
 * #213: NO intrinsic width on this rule. The 300px that lived here is the
 * BOARD sidebar's width, and DetailView carried it into the 720px
 * clickthrough modal -- a 300px column beside ~400px of empty dialog.
 * Width now lives in the mounting context: the board's layout rule
 * (.aidos-layout > .aidos-detail, which already overrode this width to
 * auto, so the board's computed width does not change) and the modal
 * rule beside .aidos-modal-wide.
 */
.aidos-detail {
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
/*
 * One chip anatomy, borrowed from the shell's tool-render name badge
 * (user ask: "badges take on the same styling the new tool-render does
 * with the chip"): a 1px border in the chip's hue over a translucent tint
 * of the same hue, 0.375rem radius, near-white text. Every chip sets
 * --chip-hue (inline for hashed hues, per-class for the rest) and this one
 * rule derives the tint and border, so NO chip carries a solid fill
 * anymore -- on a tile carrying five chips that is five quiet accents, not
 * five competing colour blocks. This finishes what #21 started: that
 * ticket left the id and state fills loud on purpose; the tool-render
 * chip's look is now the house style and the exception is retired.
 */
.aidos-chip {
  height: 20px;
  display: inline-flex;
  align-items: center;
  padding-inline: 7px;
  border: 1px solid color-mix(in srgb, var(--chip-hue, var(--metric-bg)) 55%, transparent);
  border-radius: 0.375rem;
  background: color-mix(in srgb, var(--chip-hue, var(--metric-bg)) 18%, transparent);
  color: #f9fafb;
  font-size: 11px;
  line-height: 16px;
  font-weight: 600;
  white-space: nowrap;
  flex: none;
}

/* The markup sets the hashed hue inline. This fallback keeps the chip readable without it. */
.aidos-chip-id,
.aidos-chip-kind,
.aidos-chip-dep {
  --chip-hue: var(--badge-hue-1);
}

/* #136: the review-provenance mark on an evidence strip.

   A MARK, not a chip. It sits beside the kind chip and says one thing:
   this review ran through the configured reviewer chain. It appears ONLY
   when the harness stamped the run, so every review row that exists today
   renders exactly as it always has \u2014 the feature arrives with new reviews
   rather than re-labelling old ones.

   Verified carries no fill: at strip scale a coloured pill competes with
   the kind chip, and "the review ran where it was sent" is the
   unremarkable case. The off-chain warning keeps the error tint, because a
   misrouted review that looks identical to a correct one is worth exactly
   one colour. (Same reasoning as tool-render's approval verdict badge.) */
.aidos-review-standing {
  flex: none;
  font-size: 0.75rem;
  line-height: 1;
  cursor: help;
}
.aidos-review-standing-verified {
  color: var(--text-secondary);
}
.aidos-review-standing-invalidated {
  color: var(--danger, #e5534b);
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

   The kind and dep chips led the move from saturated FILL to text+border
   over a tint of the same hue. #21 review F1 lives here as a warning for
   anyone retuning these mixes:

   The first attempt used text at 72% hue over a 14% tint, which MEASURED at
   2.44:1 on a hovered tile -- literally the grey-on-grey this ticket's
   oldest criterion forbids. Two causes: the kind palette held no hues at
   all (see KIND_COLORS in board-logic.ts), and the chip background is
   TRANSLUCENT, so contrast depends on the backdrop and .aidos-tile:hover
   lightens it. Both backdrops are now checked.

   Measured worst case across every hue, --verdict-fail, and BOTH the
   resting and hovered tile: 5.81:1. The previous pair was 2.44:1. */
.aidos-chip-kind,
.aidos-chip-dep {
  background: color-mix(in srgb, var(--chip-hue, var(--badge-hue-1)) 16%, transparent);
  border-color: color-mix(in srgb, var(--chip-hue, var(--badge-hue-1)) 45%, transparent);
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


/* The state chips no longer fill: each sets its hue and the shared anatomy
   derives the tint and border, exactly as the tool-render chip does. */
.aidos-chip-state-open {
  --chip-hue: var(--state-open);
}

.aidos-chip-state-in-progress {
  --chip-hue: var(--state-in-progress);
}

.aidos-chip-state-awaiting-verification {
  --chip-hue: var(--state-awaiting);
}

.aidos-chip-state-done {
  --chip-hue: var(--state-done);
}

/* Red for failures, straight from tool-render's vocabulary: a chip that
   reports something WRONG wears the verdict-fail hue the same way every
   other chip wears its hue, plus the error text treatment
   (.tool-render-summary[tool-render-error]: tinted red, medium weight).
   The board's one hard failure is an unmet gate -- criteria exist and the
   required evidence is not all attached. */
.aidos-chip-fail {
  --chip-hue: var(--verdict-fail);
  color: color-mix(in srgb, var(--verdict-fail) 38%, #ffffff);
  font-weight: 600;
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
  gap: 6px;
  min-width: 0;
}

/* The id chip, copies chip, and pending-actions flag sit together on the
   left; the state chip pins itself to the far edge. space-between spread
   the row's children to its two ends, which misaligned the approval flag
   whenever the row held three or more chips. */
.aidos-tile-meta [class*="aidos-chip-state-"] {
  margin-left: auto;
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

/* The filter panel's self-report, where the Apply button used to be
   (2026-09-08). It holds the row's height whether or not it has anything
   to say, so the Reset button beside it does not jump when a filter
   settles -- a control that moves under the cursor is worse than the
   button that was removed. */
.aidos-filter-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 2rem;
  color: var(--text-secondary);
  font-size: 0.75rem;
}

/* The allowlist approval, rendered inside its own tool card. It sits under
   the path table with a rule above it, so the card reads as "here is what
   I asked for" then "here is where you answer" rather than as one
   undifferentiated block. */
.aidos-inline-approval {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
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

/* #169: the queue's tabs \u2014 a LEFT-ALIGNED TOP BAR, not a sidebar. The ask
   list is the wide thing in this modal, and a sidebar would spend the
   horizontal space the rows need for titles and reasons. Every tab wears
   the action's icon, its label, and its count, so the size of each job is
   visible before entering it. */
.aidos-queue-tabs {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
}

.aidos-queue-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
}

.aidos-queue-tab:hover {
  color: var(--text-primary);
  background: color-mix(in srgb, var(--text-secondary) 10%, transparent);
}

.aidos-queue-tab-active {
  color: var(--text-primary);
  border-color: color-mix(in srgb, var(--text-secondary) 30%, transparent);
  background: color-mix(in srgb, var(--text-secondary) 12%, transparent);
}

.aidos-queue-tab-icon {
  display: inline-flex;
  align-items: center;
}

.aidos-queue-tab-icon svg {
  width: 14px;
  height: 14px;
}

.aidos-queue-tab-count {
  /* How many asks are in this tab, so the size of each job is visible
     before entering it. */
  font-weight: 400;
  color: var(--text-muted, var(--text-secondary));
}

.aidos-queue-tab-active .aidos-queue-tab-count {
  color: var(--text-secondary);
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

/*
 * #141: the row's buttons are tool-render approval buttons now, so this
 * selector names that class as well.
 *
 * SIZE ONLY. Every colour, border, radius, hover, armed and disabled rule
 * comes from the vendored sheet -- re-stating any of them here is what the
 * ticket forbids, because a second copy of a look is a second thing to keep
 * in step, and the three hand-ports that preceded the vendoring all died of
 * exactly that. What the vendored sheet cannot know is the SCALE of the
 * surface it landed in: its buttons are sized for a tool card (12px/20px
 * text, 5px 12px padding, ~30px tall) and these sit in a list whose chips
 * are 20px, where they would dominate the ask they answer.
 */
.aidos-ticket-strip-actionrow .aidos-btn,
.aidos-ticket-strip-actionrow .tool-render-approval-btn {
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
  line-height: 20px;
  justify-content: center;
  white-space: nowrap;
}

/* No primary-only width. It was the reason Dismiss and the primary read as
   different sizes: one was pinned at 7.5rem and the other took its text
   width. The shared rule above sizes every button on the row. */

/* \u2500\u2500 the state badge under the id \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   A regular state chip (the board tile's badge), stacked under the id chip
   and CENTERED with it (user's design): left-aligned it sat under the chip's
   first letter and read as a caption that had slipped rather than as a label
   belonging to the chip above it.

   History: #93 rendered this as coloured parenthesised TEXT, on the theory
   that a state is a property rather than an ask and should not carry a
   badge's weight. The owner reversed it on sight \u2014 parens read as awkward
   prose next to real chips \u2014 so the override block that stripped the chip
   look is gone, and the per-state colours come from .aidos-chip-state-*.
   Sizing inside the queue comes from the one-badge-size rule below. */
.aidos-ticket-strip-idcol {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex: none;
}

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

/*
 * #108: the Retired panel reuses the queue's one-column strip layout
 * (TicketStrip rows), with its own accents: the supersede note under each
 * title and the panel's prose states.
 */
.aidos-retired-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.aidos-retired-empty {
  font-size: 12px;
  color: var(--text-secondary);
}

.aidos-retired-error {
  font-size: 12px;
  color: var(--verdict-fail);
}

.aidos-retired-supersede {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.aidos-retired-supersede::before {
  content: "\\2192";
  flex: none;
}

.aidos-queue-empty {
  font-size: 12px;
  color: var(--text-secondary);
}

.aidos-queue-reason {
  color: var(--accent-blue);
}

/* #131: the pending-nomination count, seen without opening the queue.
   TYPOGRAPHIC, not a chip: bold text beside the label, no pill and no
   background of its own. The pill it replaces read as a third badge
   competing with the id and gate chips, and it carried its own blue while
   the button around it stayed neutral -- so the colour said "attention"
   in a place the eye had already learned to ignore. The BUTTON now carries
   the attention state instead, and this is only the number. */
.aidos-queue-count {
  margin-left: 6px;
  font-weight: 700;
  /* Typographic in the resting state: bold text beside the label, no chip
     chrome. Inherits the button's colour so it never fights it. */
  color: inherit;
}

/* #131 round 2: the attention state lives on the BADGE, not the button.
   Round 1 painted the whole control blue and the user reported it on
   sight -- a button changing colour is a far louder statement than a
   coloured count, and it fought every other button in the toolbar. The
   badge is the smallest thing that can carry the signal, so it carries it
   alone: the button keeps its ordinary styling in every state. */
.aidos-queue-count.aidos-queue-count-asks {
  background: var(--accent-blue);
  color: #fff;
  border-radius: 999px;
  padding: 0 6px;
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

/*
 * #213: the detail panel fills a modal. .aidos-detail carries no width of
 * its own any more, so without this the panel would collapse to a narrow
 * column inside the wide dialog. The dialog itself stays clamped by
 * .aidos-modal's max-width/max-height, and .aidos-modal-form keeps
 * scrolling the body, so the #93 safe-box rule still holds.
 */
.aidos-modal .aidos-detail {
  flex: 1 1 auto;
  align-self: stretch;
  width: 100%;
  min-width: 0;
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
  --chip-hue: var(--state-awaiting);
  color: color-mix(in srgb, var(--state-awaiting) 30%, #ffffff);
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
 * #144: A SUMMARY LINE THAT IS NOT ONE STRING.
 *
 * A row's summary clips from the right, so anything at the end of it is
 * what a long ticket title deletes -- and on a move card that end was the
 * DESTINATION STATE, the one fact the card exists to report. The line
 * becomes a flex row instead: the title is the only part allowed to shrink,
 * and the badge beside it is flex: none (from .aidos-chip) so it is drawn
 * whole at every width.
 *
 * Layout only. The badge itself is the ticket state chip -- .aidos-chip
 * plus .aidos-chip-state-* through badgeClass -- so there is no second
 * state-badge look defined here to drift from the first.
 */
.tool-render-path.aidos-row-summary-rich,
.tool-render-summary.aidos-row-summary-rich {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
  overflow: hidden;
}

.aidos-move-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.aidos-move-arrow {
  flex: none;
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
   the two surface the same kind of summary in the same kind of context.
   (#135 review: the peek's excerpt paragraph is gone \u2014 the modal renders
   the full description; descriptionExcerpt still feeds the collapsed
   strip contexts elsewhere.) */
.aidos-ticket-peek-empty {
  margin: 0.25rem;
  color: var(--dsw-alias-label-tertiary, var(--text-secondary));
  font-size: 0.8125rem;
  line-height: 1.25rem;
}

/* #135: the peek modal's full-description body and its action row. The
   description reuses .aidos-md (the detail panel's markdown styling) and
   only adds its own scroll cap, so a long description scrolls inside the
   modal instead of stretching it past the viewport. */
.aidos-ticket-peek-description {
  margin: 0.5rem 0.25rem 0;
  max-height: 40vh;
  overflow-y: auto;
  font-size: 0.8125rem;
  line-height: 1.25rem;
}

/*
 * THE ACTION-ROW RULE (#142, settling the #135 review note "button should
 * be right-aligned").
 *
 * EVERY action row on an aidos card packs its controls to the BOTTOM-RIGHT:
 * justify-content: flex-end, on its own row under the content it acts on.
 * It is one rule rather than a nudge to one button because the placement
 * was already inconsistent by one card -- the queue's action row
 * (.aidos-ticket-strip-actionrow) and the vendored approval-actions row in
 * tool-render both pack right, and this row did not, so
 * the same class of control sat two ways in the same transcript. Right is
 * the side the harness already chose, and a reader who learns where the
 * commit button lives should not have to relearn it per card.
 */
.aidos-ticket-peek-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--dsw-alias-border-l1, var(--border-color));
}

/* The action button wears the vendored tool-render approval anatomy (#82):
   the same .tool-render-approval-btn the inline tool-card actions use, so
   the peek's primary action reads as part of the same system. Only the
   gap beside the icon is aidos's own. */
.aidos-ticket-peek-actions .tool-render-approval-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

/* The activation notice sits UNDER the action row, not inside it: it is a
   status line, not a control, and the action-row rule above is about
   controls (#142). */
.aidos-ticket-peek-note {
  margin: 0.375rem 0.25rem 0;
  color: var(--dsw-alias-label-tertiary, var(--text-secondary));
  font-size: 0.75rem;
  line-height: 1rem;
}

/*
 * THE STACK OF TABLES (user direction 2026-09-05): "if it's a single
 * ticket, it should be one table. if it's many, it should be a stack of
 * tables, like batch_edit stacks single edit diffs in tool-render."
 *
 * The SCROLL LIVES HERE, not on the tables inside it. \`.aidos-tool-facts\`
 * carries the house 17.5rem cap with overflow-y: auto, which is right for a
 * lone table but wrong inside a stack: thirty tickets would produce thirty
 * independently-scrolling boxes, each cut at the same arbitrary height, and
 * the card itself would grow without limit. One cap on the stack gives the
 * behaviour the user asked for -- "if the result then exceeds the max tool
 * call card height, it should scroll, like usual" -- with the tables laid
 * out at their natural height inside it.
 */
.aidos-tool-stack {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin: 0.25rem 0 0.25rem 0.25rem;
  max-height: 22rem;
  overflow-y: auto;
}

.aidos-tool-stack .aidos-tool-facts {
  /* The stack owns the scroll; a nested scroller traps the wheel. */
  margin: 0;
  max-height: none;
  overflow-y: visible;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}

.aidos-tool-table {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/*
 * One table's caption. Shares the tables' surface so the caption and its
 * rows read as one object, with the id and state leading because they are
 * the two things a reader scans a board result for.
 */
.aidos-tool-table-head {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  min-width: 0;
  box-sizing: border-box;
  padding: 0.375rem 0.8125rem 0.25rem;
  border-radius: 0.625rem 0.625rem 0 0;
  background: var(--dsw-alias-markdown-code-block, var(--surface-raised));
  font-size: 0.8125rem;
  line-height: 1.375rem;
}

/* A lone caption (the single-ticket read) has no table stacked under it in
   a .aidos-tool-stack, so it keeps its own left margin to line up with the
   facts table below it. */
.tool-render-body > .aidos-tool-table-head {
  margin: 0.25rem 0 0 0.25rem;
}

.tool-render-body > .aidos-tool-table-head + .aidos-tool-facts {
  margin-top: 0;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}

.aidos-tool-table-id {
  flex: none;
  font-family: var(--ds-font-family-code, monospace);
  color: var(--dsw-alias-label-secondary, var(--text-secondary));
}

/* The id is the click-through target, so it looks like one -- but it is a
   real <button>, not a styled span: it is reached by Tab and fires on
   Enter without any handler written here. */
.aidos-tool-table-id-link {
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  font: inherit;
  font-family: var(--ds-font-family-code, monospace);
  color: var(--dsw-alias-label-secondary, var(--text-secondary));
}

.aidos-tool-table-id-link:hover,
.aidos-tool-table-id-link:focus-visible {
  color: var(--dsw-alias-label-primary, var(--text-primary));
  text-decoration: underline;
}

.aidos-tool-table-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--dsw-alias-label-primary, var(--text-primary));
}

/*
 * THE IN-CELL EXPANDER (user direction 2026-09-05): "every ellipsized strip
 * should have a show more that expands its own cell".
 *
 * An expanded cell drops the one-line clamp entirely -- nowrap and the
 * ellipsis are what it exists to undo -- and keeps its newlines, since the
 * flattening is exactly what the reader is asking to see through.
 */
.aidos-tool-facts dd[data-expanded] {
  overflow: visible;
  text-overflow: clip;
  white-space: normal;
}

.aidos-tool-fact-clipped {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.aidos-tool-fact-full {
  display: block;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Markdown inside a fact cell: the shared .aidos-md rules already style it,
   so only the cell's own spacing is set here. */
.aidos-md.aidos-tool-fact-full {
  white-space: normal;
}

.aidos-tool-fact-more {
  display: block;
  margin-top: 0.125rem;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  font: inherit;
  font-size: 0.75rem;
  line-height: 1.125rem;
  color: var(--dsw-alias-label-tertiary, var(--text-secondary));
}

.aidos-tool-fact-more:hover,
.aidos-tool-fact-more:focus-visible {
  color: var(--dsw-alias-label-primary, var(--text-primary));
  text-decoration: underline;
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

/* #142: a list cell holding an EXPANDABLE value releases its own one-line
   clamp -- the clamp moves to .aidos-tool-fact-clipped inside it, so the
   "Show more" button is not cut off with the text it belongs to. The
   expander markup itself is the facts table's, not a second one. */
.aidos-tool-list-value {
  overflow: visible;
  white-space: normal;
}

.aidos-tool-fact-value {
  display: block;
  min-width: 0;
}

/*
 * The card FOOTER: a fact ABOUT the body, under the body (user, 2026-09-05 --
 * a board read's count belongs after its rows, not on the collapsed line).
 *
 * Tertiary and small on purpose. It is a total, not a row: it must read as
 * the caption under the list rather than as one more entry in it, which is
 * how it would read at the list's own weight.
 *
 * The left margin matches .aidos-tool-list's, so the caption lines up with
 * the box it belongs to instead of with the card's edge.
 */
.aidos-tool-footer {
  margin: 0.125rem 0 0.125rem 0.25rem;
  padding: 0 0.8125rem;
  color: var(--dsw-alias-label-tertiary, var(--text-secondary));
  font-size: 0.75rem;
  line-height: 1.125rem;
  font-variant-numeric: tabular-nums;
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

/*
 * The aidos tool rows reuse the tool-render badge classes, but their glyphs
 * are this repo's 12px viewBox icons rather than the shell's 14px
 * primitives. The badge slot scales them to the base card's exact icon
 * size -- shapes and font sizes match; only the glyph artwork itself is
 * ours.
 */
.tool-render-name-badge-icon svg {
  width: 0.875rem;
  height: 0.875rem;
}

/*
 * #180: the Tags browser. The list is the element that must stay readable
 * when it is long, so it scrolls on its own (max-height, not the page).
 */
.aidos-tags-list {
  list-style: none;
  margin: 0.75rem 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  max-height: 12rem;
  overflow-y: auto;
}

.aidos-tags-row {
  margin: 0;
  padding: 0;
}

.aidos-tags-detail {
  margin-top: 1rem;
  border-top: 1px solid var(--dsw-alias-border-subtle, #e0e0e0);
  padding-top: 0.75rem;
}

.aidos-tags-detail-title {
  font-size: 0.9rem;
  margin: 0 0 0.5rem;
}

.aidos-tags-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0.75rem;
  flex-wrap: wrap;
}

.aidos-tags-actions .aidos-search-box {
  flex: 1 1 10rem;
}

.aidos-tags-proposals {
  margin-top: 1rem;
}

.aidos-tags-proposal {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
  padding: 0.5rem 0;
  border-top: 1px dashed var(--dsw-alias-border-subtle, #e0e0e0);
}
`;var Ca=`/* Plan-meta modal styles (Ticket U12). Board.css owns the shared modal
   tokens; this file styles only the aidos-plan-meta-* classes. */

.aidos-plan-meta-modal {
  box-sizing: border-box;
  width: 640px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 96px);
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

.aidos-plan-meta-blocks {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

.aidos-plan-meta-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  background: var(--bg);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
}

.aidos-plan-meta-block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.aidos-plan-meta-block-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.aidos-plan-meta-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
  text-align: left;
}

.aidos-plan-meta-toggle:hover {
  color: var(--text-secondary);
}

.aidos-plan-meta-text {
  margin: 0;
  padding: 6px 8px;
  font-family: inherit;
  font-size: 0.8125rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text-secondary);
  background: var(--surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  max-height: 240px;
  overflow-y: auto;
}

.aidos-plan-meta-input {
  box-sizing: border-box;
  width: 100%;
  min-height: 96px;
  padding: 6px 8px;
  font: inherit;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--control-text);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  resize: vertical;
}

.aidos-plan-meta-input:focus {
  outline: none;
  border-color: var(--border-focus);
}

.aidos-plan-meta-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.aidos-plan-meta-note {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--text-secondary);
}
`;var Oa=`.tool-render-row {
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
.tool-render-chevron-disabled {
  opacity: 0.35;
  pointer-events: none;
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
/* Once answered, the outline dulls to translucent white instead of
   vanishing. This rule sits BEFORE error/stopped/guard so a failed or
   guarded call keeps its own stronger mark. */
.tool-render-card[data-question-answered] {
  outline: 3px solid color-mix(in srgb, #fff 40%, transparent);
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
/* The guard outline outranks error and stopped, not just escalated. A
   rewritten command often exits non-zero (rg exits 1 on no match, and
   bashErrorState promotes any [exit code: N>=1] result to error), which
   used to hand blue's 3px to the later red 2px rules at equal (0,2,0)
   specificity. The doubled attribute selector (0,3,0) wins over all
   three without !important, so the durable "this call was guarded" mark
   survives a failing exit. */
.tool-render-card[data-guard-approval][data-guard-approval] {
  outline: 3px solid var(--dsh-outline-guard);
}
/* A call waiting on the human's answer to its question is outlined in
   solid white at the same 3px weight as the other state outlines. This
   rule sits after error/stopped/guard so the bright "answer me" mark wins
   while pending (a pending call is still running, so error/stopped cannot
   co-occur; the doubled guard rule above still wins a true tie, which
   cannot happen because guard approvals are bash-only). */
.tool-render-card[data-question-pending] {
  outline: 3px solid #fff;
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
/* Each of the four ask-card text fields now renders through MarkdownText,
   which wraps even one plain line in its own markup. That cost two things
   this row depended on: MarkdownText's own prose elements carry their own
   color and font shorthand at every level of whatever it nests (a wrapper
   div, then a <p>, and so on), overriding these four classes' own colors
   (including the data-selected bold+primary label) and sizes, and a
   paragraph's default block margin added unwanted vertical gaps in what is
   one line of layout, not a markdown body. \`*\` resets color and font on
   EVERY descendant, however deep MarkdownText nests -- each level inherits
   from its own immediate parent, so the reset cascades all the way down to
   the actual text, including an ancestor's font-weight or font-style such as
   data-selected's bold or the note's italic. \`margin: 0\` on \`p\` alone
   removes the paragraph gap. A genuine list or heading inside an answer
   still renders; it just does not get this rule's own tight spacing or
   color override. */
.tool-render-question-prompt *,
.tool-render-option-label *,
.tool-render-option-description *,
.tool-render-answer-note * {
  color: inherit;
  font: inherit;
}
.tool-render-question-prompt p,
.tool-render-option-label p,
.tool-render-option-description p,
.tool-render-answer-note p {
  margin: 0;
}

/* ask_user_question answer form: the interactive UI on the pending card,
   ported from the shipped QuestionComposer. Option buttons follow the
   approval-btn recipe (1px border, surface bg); the selected option takes
   the business-primary border, the primary action the filled recipe. */
.tool-render-qform {
  flex-direction: column;
  display: flex;
  gap: 0.375rem;
  padding: 0.25rem 0 0.25rem 0.25rem;
}
.tool-render-qheader {
  align-items: flex-start;
  justify-content: space-between;
  display: flex;
  gap: 0.5rem;
}
.tool-render-qheading {
  min-width: 0;
  flex: 1 1 auto;
}
.tool-render-qeyebrow {
  color: var(--dsw-alias-label-tertiary);
  font-size: 0.6875rem;
  line-height: 1rem;
}
.tool-render-qtitle {
  color: var(--dsw-alias-label-primary);
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.25rem;
  overflow-wrap: anywhere;
}
.tool-render-qdismiss {
  flex: none;
  border: none;
  background: none;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
  font-size: 0.6875rem;
  line-height: 1rem;
  padding: 0.0625rem 0.25rem;
  text-decoration: underline dotted;
}
.tool-render-qdismiss:hover:enabled {
  color: var(--dsw-alias-label-primary);
}
.tool-render-qdismiss:disabled {
  opacity: 0.55;
  cursor: default;
}
.tool-render-qbody {
  flex-direction: column;
  display: flex;
  gap: 0.375rem;
}
.tool-render-qdetail {
  color: var(--dsw-alias-label-secondary);
  font-size: 0.8125rem;
  line-height: 1.25rem;
  overflow-wrap: anywhere;
}
.tool-render-qoptions {
  flex-direction: column;
  display: flex;
  gap: 0.25rem;
}
.tool-render-qoption {
  align-items: baseline;
  display: flex;
  gap: 0.375rem;
  width: 100%;
  box-sizing: border-box;
  text-align: left;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 0.5rem;
  background: var(--dsw-alias-bg-base);
  color: inherit;
  font: inherit;
  cursor: pointer;
  padding: 0.375rem 0.5rem;
}
.tool-render-qoption:hover:enabled {
  background: var(--dsw-alias-interactive-bg-hover-solid);
}
.tool-render-qoption:disabled {
  cursor: default;
}
.tool-render-qoption[data-selected] {
  border-color: var(--dsw-alias-state-business-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}
.tool-render-qoption-marker {
  flex: none;
  width: 1rem;
  color: var(--dsw-alias-label-tertiary);
  font-size: 0.8125rem;
  line-height: 1.25rem;
  text-align: center;
}
.tool-render-qoption[data-selected] .tool-render-qoption-marker {
  color: var(--dsw-alias-state-business-primary);
}
.tool-render-qoption-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1 1 auto;
}
.tool-render-qoption-line {
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.5rem;
}
.tool-render-qoption-label {
  color: var(--dsw-alias-label-primary);
  font-size: 0.8125rem;
  line-height: 1.25rem;
  overflow-wrap: anywhere;
}
.tool-render-qoption[data-selected] .tool-render-qoption-label {
  font-weight: 700;
}
.tool-render-qoption-description {
  color: var(--dsw-alias-label-secondary);
  font-size: 0.8125rem;
  line-height: 1.125rem;
  overflow-wrap: anywhere;
}
.tool-render-qbadge {
  flex: none;
  border: 1px solid var(--dsw-alias-state-business-primary);
  border-radius: 999px;
  color: var(--dsw-alias-state-business-primary);
  font-size: 0.6875rem;
  line-height: 1rem;
  padding: 0 0.375rem;
}
.tool-render-qcustom-row {
  align-items: center;
  display: flex;
  gap: 0.375rem;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 0.5rem;
  background: var(--dsw-alias-bg-base);
  padding: 0.375rem 0.5rem;
}
.tool-render-qcustom-row[data-active] {
  border-color: var(--dsw-alias-state-business-primary);
}
.tool-render-qcustom-input {
  flex: 1 1 auto;
  min-width: 0;
  border: none;
  outline: none;
  background: none;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  padding: 0;
}
.tool-render-qcustom-input::placeholder {
  color: var(--dsw-alias-label-caption);
}
.tool-render-qcustom-textarea {
  box-sizing: border-box;
  width: 100%;
  resize: vertical;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 0.5rem;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  padding: 0.375rem 0.5rem;
}
.tool-render-qcustom-textarea:focus {
  border-color: var(--dsw-alias-state-business-primary);
  outline: none;
}
.tool-render-qfooter {
  align-items: center;
  display: flex;
  gap: 0.5rem;
}
.tool-render-qpager {
  flex: none;
  align-items: center;
  display: flex;
  gap: 0.25rem;
}
.tool-render-qnav {
  border: none;
  background: none;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
  border-radius: 999px;
  font-size: 1rem;
  line-height: 1;
  padding: 0.125rem 0.375rem;
}
.tool-render-qnav:hover:enabled {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
.tool-render-qnav:disabled {
  opacity: 0.4;
  cursor: default;
}
.tool-render-qprogress {
  color: var(--dsw-alias-label-secondary);
  white-space: nowrap;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.25rem;
}
.tool-render-qfeedback {
  flex: 1 1 auto;
  min-height: 1rem;
  color: var(--dsw-alias-state-error-primary);
  font-size: 0.6875rem;
  line-height: 1rem;
}
.tool-render-qactions {
  flex: none;
  align-items: center;
  display: flex;
  gap: 0.25rem;
}
.tool-render-qbtn {
  border: 1px solid var(--dsw-alias-border-l3);
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-secondary);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  line-height: 20px;
  padding: 5px 12px;
}
.tool-render-qbtn:hover:enabled {
  background: var(--dsw-alias-interactive-bg-hover-solid);
  color: var(--dsw-alias-label-primary);
}
.tool-render-qbtn:disabled {
  opacity: 0.45;
  cursor: default;
}
.tool-render-qbtn-primary {
  border-color: transparent;
  background: var(--dsw-alias-label-secondary);
  color: var(--dsw-alias-bg-base);
  font-weight: 600;
}
.tool-render-qbtn-primary:hover:enabled {
  background: var(--dsw-alias-label-secondary);
  color: var(--dsw-alias-bg-base);
  filter: brightness(1.15);
}

/* list_agents roster: one line per agent, status first so the column reads
   down the left edge. A descendants listing indents each line by its own
   depth through an inline padding, so the tree shape is visible without a
   parent id on every row. */
.tool-render-agents {
  display: flex;
  flex-direction: column;
  padding: 0.125rem 0 0.125rem 0.25rem;
}
.tool-render-agent {
  align-items: baseline;
  display: flex;
  gap: 0.375rem;
  min-width: 0;
  padding: 0.0625rem 0;
}
.tool-render-agent-status {
  flex: none;
  width: 5rem;
  font-size: 0.75rem;
  line-height: 1.25rem;
  color: var(--dsw-alias-label-caption);
}
.tool-render-agent-status[data-status="running"] {
  color: var(--dsh-outline-guard);
}
.tool-render-agent-status[data-status="diagnostic"] {
  color: var(--dsw-alias-state-error-primary);
}
.tool-render-agent-id {
  flex: none;
  font-family: var(--ds-font-family-code);
  font-size: 0.75rem;
  line-height: 1.25rem;
  color: var(--dsw-alias-label-tertiary);
  max-width: 12rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tool-render-agent-label {
  color: var(--dsw-alias-label-primary);
  font-size: 0.8125rem;
  line-height: 1.25rem;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
.tool-render-markdown-body :where(h1, h2, h3, h4, h5, h6),
.tool-render-fetch-body :where(h1, h2, h3, h4, h5, h6) {
  font-size: 0.875rem;
  line-height: 1.25rem;
  margin: 0.5rem 0 0.25rem;
}
.tool-render-markdown-body :where(h1, h2, h3, h4, h5, h6):first-child,
.tool-render-fetch-body :where(h1, h2, h3, h4, h5, h6):first-child {
  margin-top: 0;
}
.tool-render-markdown-body :where(p, ul, ol, pre, blockquote, table),
.tool-render-fetch-body :where(p, ul, ol, pre, blockquote, table) {
  font-size: 0.8125rem;
  line-height: 1.25rem;
  margin: 0.25rem 0;
}
.tool-render-markdown-body :where(ul, ol),
.tool-render-fetch-body :where(ul, ol) {
  padding-left: 1.125rem;
}
.tool-render-markdown-body :where(pre),
.tool-render-fetch-body :where(pre) {
  background: var(--dsw-alias-bg-base);
  border-radius: 0.25rem;
  overflow-x: auto;
  padding: 0.375rem 0.5rem;
}
.tool-render-markdown-body :where(code),
.tool-render-fetch-body :where(code) {
  font-family: var(--ds-font-family-code);
}
.tool-render-markdown-body :where(code):not(:where(pre code)),
.tool-render-fetch-body :where(code):not(:where(pre code)) {
  background: var(--dsw-alias-bg-base);
  border-radius: 0.1875rem;
  padding: 0 0.1875rem;
}

/* web_fetch body. Same bounded-scroll shape as the markdown body but its
   own block, so a fetched page scrolls inside the card. A raw-HTML page
   renders as escaped code text in this container instead, never as
   markup. */
.tool-render-fetch-body {
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 0.375rem;
  margin: 0.25rem 0 0.125rem 0.25rem;
  max-height: 16rem;
  overflow-y: auto;
  padding: 0.5rem 0.625rem;
}
.tool-render-fetch-raw {
  font-family: var(--ds-font-family-code);
  font-size: 0.8125rem;
  line-height: 1.25rem;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--dsw-alias-label-primary);
  margin: 0;
}
/* A <system-reminder> block, framed instead of hidden: every character of
   its text still renders, just under a chip instead of literal tags. The
   left border this used to carry read as a blockquote and was mistaken for
   a stray outline on the whole card; dropped. */
.tool-render-reminder {
  margin: 0.5rem 0;
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

/* ---- Approval answer bar and decided badge. While an approval that
   carries this card's callId is pending, the card answers it inline; once
   decided, a durable badge keeps the outcome. The strip is additive: the
   card keeps rendering its normal content above it. */
/* A COLUMN, not a row: the comment affordance is a precondition of the
   decision, so it reads above the buttons rather than beside them. Order is
   "add comment" (left) -> optional textarea (full width) -> the decision
   pair (right), which is also the order the user moves through them. */
.tool-render-approval-strip {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.25rem;
  /* Bottom margin matches .tool-render-output's own 0.25rem, so the
     strip's last row does not kiss the card's bottom border. */
  margin: 0.25rem 0 0.25rem 0.25rem;
}
/* Reject/approve pack to the card's bottom-right corner (aidos queue recipe:
   actions sit at the end of their container). */
.tool-render-approval-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.25rem;
  padding-bottom: 0.25rem;
}
/* The toggle sits above the buttons on the card's RIGHT edge, matching the
   actions below it \u2014 the whole comment affordance reads as one right-aligned
   column, and only the textarea spans the full width. */
.tool-render-approval-comment-toggle {
  align-self: flex-end;
}
/* (The decided badge that used to live here was retired on 2026-09-08: the
   durable verdict is now a badge on the collapsed row, .tool-render-verdict,
   and the answer bar renders nothing once a decision has settled.) */
/* Aidios review-queue button recipe, mapped onto dsw-alias tokens: 1px
   border, surface bg, secondary text, 4px radius, 12px/20px, 5px 12px
   padding, hover raises surface + primary text, disabled 0.45. */
.tool-render-approval-btn {
  border: 1px solid var(--dsw-alias-border-l3);
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-secondary);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  line-height: 20px;
  padding: 5px 12px;
}
.tool-render-approval-btn:hover:enabled {
  background: var(--dsw-alias-interactive-bg-hover-solid);
  color: var(--dsw-alias-label-primary);
}
.tool-render-approval-btn:disabled {
  opacity: 0.45;
  cursor: default;
}
.tool-render-approval-reject {
  color: var(--dsw-alias-state-error-primary);
  border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 55%, var(--dsw-alias-border-l3));
}
/* First click arms ("? Confirm reject"), second click rejects; the armed
   fill makes the confirm step read unmistakably. */
.tool-render-approval-reject[data-armed] {
  background: var(--dsw-alias-state-error-primary);
  border-color: var(--dsw-alias-state-error-primary);
  color: #fff;
  font-weight: 600;
}
/* Primary/confirm button of the recipe: filled secondary-label bg with
   surface text, weight 600, no border. */
.tool-render-approval-approve {
  border-color: transparent;
  background: var(--dsw-alias-label-secondary);
  color: var(--dsw-alias-bg-base);
  font-weight: 600;
}
.tool-render-approval-approve:hover:enabled {
  background: var(--dsw-alias-label-secondary);
  color: var(--dsw-alias-bg-base);
  filter: brightness(1.15);
}
/* A comment draft relabels the action "Approve + send", so it reads warn:
   the click now also steers the comment to the running agent. */
.tool-render-approval-approve[data-with-comment] {
  color: var(--dsw-alias-state-warn-primary);
}
.tool-render-approval-approve[data-with-comment]:hover:enabled {
  background: var(--dsw-alias-label-secondary);
  color: var(--dsw-alias-state-warn-primary);
  filter: brightness(1.15);
}
.tool-render-approval-comment-toggle {
  border: none;
  background: none;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
  font-size: 0.6875rem;
  line-height: 1rem;
  padding: 0.0625rem 0.25rem;
  text-decoration: underline dotted;
}
.tool-render-approval-comment-toggle:hover:enabled {
  color: var(--dsw-alias-label-primary);
}
.tool-render-approval-comment-toggle:disabled {
  opacity: 0.55;
  cursor: default;
}
.tool-render-approval-comment {
  box-sizing: border-box;
  flex-basis: 100%;
  resize: vertical;
  min-height: 2.5rem;
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: 0.4375rem;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font-family: inherit;
  font-size: 0.8125rem;
  line-height: 1.25rem;
  padding: 0.25rem 0.5rem;
}
.tool-render-approval-comment:focus {
  outline: 2px solid var(--dsw-alias-state-business-primary);
  outline-offset: -1px;
}
/* The durable approval verdict on the COLLAPSED row (owner, 2026-09-08):
   [shield | APPROVED], sitting immediately after the tool-call label badge.
   It reads as a small status stamp \u2014 uppercase, tight, nowrap \u2014 so the row
   still scans as one line and the verdict is legible without expanding.
   Approved carries no accent: at row scale a coloured pill competes with the
   tool name for attention, and "it was approved" is the unremarkable case.
   Rejected keeps the error tint, because a refusal that looks identical to an
   approval is worth exactly one colour.
   Sourced from the guarded-approvals fold, so it survives a page reload. */
.tool-render-verdict {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: none;
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: 4px;
  padding: 0 6px;
  color: var(--dsw-alias-label-secondary);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  line-height: 18px;
  white-space: nowrap;
}
.tool-render-verdict[data-outcome="rejected"] {
  color: var(--dsw-alias-state-error-primary);
  border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 55%, var(--dsw-alias-border-l3));
}
.tool-render-verdict-shield {
  flex: none;
}
/* The pending ask's reason (owner, 2026-09-08): while an approval is open the
   card must say WHY it is being asked. Tertiary label, wrapping, sitting above
   the actions so the question reads before the answer. */
.tool-render-approval-reason {
  align-self: stretch;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
  margin-bottom: 4px;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
/* The sandbox-escalation banner (owner, 2026-09-09). The label line reuses
   the guard rewrite banner's .tool-render-cmd-label styling, so the two
   "something happened to this call" annotations read as one family. The
   mode rides the label line as its own chip \u2014 it decides how far the
   sandbox widens, so it stays discoverable without being jammed into the
   justification sentence. The justification below is prose in the same
   tertiary 12px/18px voice as the approval reason, never code. */
/* The chip carries the ESCALATION colour, not a neutral one (owner,
   2026-09-09). The mode is the single most consequential fact on the card \u2014
   how far the sandbox widens \u2014 and a grey chip made it read as incidental
   metadata beside its own warning. Sharing --dsh-outline-escalated with the
   card outline means the chip and the outline state the same thing in the
   same colour, so the eye pairs them.

   Independent of the outline defect this was reported alongside (#105: a
   REJECTED escalation currently outlines guard-blue instead of escalated,
   cause still unproven). The owner chose to ship the chip first, accepting
   that until #105 lands a rejected card shows a yellow chip inside a blue
   outline. Do not "fix" that mismatch by neutralising the chip again \u2014 the
   outline is the wrong half. */
.tool-render-escalation-mode {
  font: inherit;
  white-space: nowrap;
  color: var(--dsh-outline-escalated);
  border: 1px solid var(--dsh-outline-escalated);
  border-radius: 0.25rem;
  margin-left: 0.375rem;
  padding: 0 0.25rem;
}
.tool-render-escalation-reason {
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
  margin: 0.125rem 0 0.25rem 0.25rem;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
/* The settled ask (approved OR rejected \u2014 the trigger is settledness, not
   approval): muted and small, so a decided request no longer reads as
   though it still needed an answer. This quiets the ASK only \u2014 the outcome
   keeps its own surfaces (the collapsed-row verdict badge, the error
   outline), which this rule never touches. */
.tool-render-escalation-reason-muted {
  color: var(--dsw-alias-label-caption);
  font-size: 11px;
  line-height: 16px;
}
`;var pt=["open","in_progress","awaiting_verification","done"];function Pa(e){return e.criteria.trim().length>0}function Ma(e,n){let t=e.toLowerCase(),i=n.toLowerCase();return t<i?-1:t>i?1:0}function La(e,n,t="confidence",i=!0){let o=Pa(e),r=Pa(n);if(o!==r)return o?-1:1;let s=0,a=0;switch(t){case"confidence":s=e.confidenceScore-n.confidenceScore,a=(e.gateFraction??0)-(n.gateFraction??0);break;case"gates":s=(e.gateFraction??0)-(n.gateFraction??0),a=e.confidenceScore-n.confidenceScore;break;case"time":s=e.updatedAt-n.updatedAt,a=Ma(e.title,n.title);break;case"alpha":s=Ma(e.title,n.title),a=e.updatedAt-n.updatedAt;break}let l=s;return i&&(l=-l),l===0&&(l=a,i&&(l=-l)),l===0&&(l=e.id-n.id),l}function cu(e,n){return n===""||e.title.toLowerCase().includes(n.toLowerCase())?!0:String(e.id).includes(n)}function Da(e,n={}){let t=n.stateIds?new Set(n.stateIds):null,i=n.projectIds?new Set(n.projectIds):null,o=n.search??"",r=n.tags!==void 0&&n.tags.length>0?new Set(n.tags):null,s=[];for(let a of e)if(!(t!==null&&!t.has(a.state))&&!(i!==null&&!i.has(a.projectId))&&cu(a,o)){if(r!==null){let l=a.tags??[],d=!1;for(let c of l)if(r.has(c)){d=!0;break}if(!d)continue}s.push(a)}return s.sort((a,l)=>La(a,l,n.sortKey??"confidence",n.descending??!0)),s}var ni=[{id:"builtin:user_signoff",label:"User signoff",description:"The human confirms the work.",weight:1,allowedAuthors:["user"]},{id:"builtin:user_verified",label:"User verified",description:"The human checked the finished work.",weight:1,allowedAuthors:["user"]},{id:"builtin:eval_criteria",label:"Evaluation criteria",description:"The criteria to judge the work.",weight:1,allowedAuthors:["user","agent"]},{id:"builtin:file_allowlist",label:"File allowlist",description:"The files the change may touch.",weight:1,allowedAuthors:["user"]},{id:"builtin:agent_report",label:"Agent report",description:"The agent describes the work.",weight:1,allowedAuthors:["user","agent"]},{id:"builtin:automated_check",label:"Automated check",description:"A machine check ran and reported a result.",weight:1,allowedAuthors:["agent","user"]},{id:"builtin:test_run",label:"Test run",description:"A test run and its result.",weight:1,allowedAuthors:["agent","user"]},{id:"builtin:review_pass",label:"Review \u2014 accepted",description:"An independent review of the change accepted it: a reviewer subagent or the human read it, reported findings, and PASSED it. The orchestrator's own read does not qualify. A failing review is recorded with builtin:review_fail instead \u2014 never here.",weight:1,allowedAuthors:["agent","user"]},{id:"builtin:review_fail",label:"Review \u2014 failed",description:"An independent review of the change FAILED it: a reviewer subagent or the human found a defect and did not pass it. Contributes to nothing \u2014 it never satisfies a gate. Kept alongside any later builtin:review_pass so the review history (how many rounds, what each found) stays visible.",weight:0,allowedAuthors:["agent","user"]},{id:"builtin:retired",label:"Retired",description:"The human hid this ticket without deleting it (#108). While a live row of this kind exists, every consumer ignores the ticket \u2014 the board grid, the filter counts, the tab badge, the human queue, the agent's board reads, the plan render \u2014 except the Retired panel, where it can be viewed and un-retired. DETACH this row to un-retire: the append-only log keeps both the retirement and the un-retirement as history, so the ticket returns to exactly the state and evidence it had. Contributes to nothing \u2014 it never satisfies a gate \u2014 and only the human may attach it: an agent that can hide tickets can hide its own inconvenient work. The payload carries an optional reason and optional supersededBy ticket references naming where the work went.",weight:0,allowedAuthors:["user"]},{id:"builtin:review_note",label:"Remark",description:"A remark: a note from a review round, or a general comment on the ticket. The one surviving free-form remark kind after builtin:comment folded into it \u2014 same weight, same authors, one kind instead of two doing the same job.",weight:.5,allowedAuthors:["agent","user"]},{id:"builtin:after_shot",label:"After shot",description:"The state after the work.",weight:1,allowedAuthors:["user","agent"]},{id:"builtin:comment",label:"Comment (deprecated)",description:"DEPRECATED \u2014 folded into builtin:review_note, which is identical in weight and authorship. Kept here only so a pre-existing evidence row of this kind still validates and renders; no longer offered for new rows. Do not confuse with the ticket's COMMENT THREAD (CommentRecord/userAddComment), a separate durable mechanism this kind never wrote to.",weight:.5,allowedAuthors:["user","agent"]},{id:"builtin:imported_state",label:"Imported state",description:"The state that a plan document claimed at import time.",weight:0,allowedAuthors:["system"]},{id:"builtin:user_commit",label:"Git commit",description:"One git commit from the ticket's workspace, resolved through git show at attach time. The AGENT may attach it as well as the human, because it is a VERIFIED FACT rather than an attestation: the host resolves the hash and stores what git reports, so an unresolvable or invented hash is refused instead of recorded. That is what separates it from review_pass, which stays human- or reviewer-authored because nothing can verify a judgement.",weight:1,allowedAuthors:["user","agent"]}],ao=[{fromState:"open",toState:"in_progress",requiredKinds:["builtin:user_signoff"],allowedActors:["user","agent"]},{fromState:"in_progress",toState:"awaiting_verification",requiredKinds:["builtin:automated_check","builtin:review_pass","builtin:user_commit"],allowedActors:["user","agent"],excusedBy:{"builtin:automated_check":"builtin:review_pass"}},{fromState:"awaiting_verification",toState:"done",requiredKinds:["builtin:user_verified"],allowedActors:["user"]},{fromState:"awaiting_verification",toState:"in_progress",requiredKinds:[],allowedActors:["user"]}],ub={kinds:[...ni],gates:[...ao],injectEnabled:!0,injectDebounceMs:3e4};function ar(e){return e.foreign===!0&&e.sourceSessionId!==void 0?e.sourceSessionId+":"+String(e.id):String(e.id)}function Ba(e){let n=e.lastIndexOf(":");if(n>0){let t=e.slice(n+1);if(/^\d+$/.test(t))return{sourceSessionId:e.slice(0,n),id:Number(t),foreign:!0}}return{id:Number(e),foreign:!1}}var sr="builtin:retired";function za(e){return e===void 0?!1:e.some(n=>n.kind===sr)}function ee(e){return ar(e)}function $a(e,n){if(e===null||e==="")return null;let t=n.find(r=>ee(r)===e);if(t!==void 0)return t;if(/^\d+$/.test(e)){let r=Number(e);return n.find(s=>Number(s.id)===r)??null}let i=Ba(e);if(i.foreign!==!0)return null;let o=n.filter(r=>Number(r.id)===i.id&&r.sourceSessionId===i.sourceSessionId);return o.length===1?o[0]??null:null}function ja(e,n){return e.filter(t=>!za(n[ar(t)]))}var Mt=["open","in_progress","awaiting_verification","done"];function cn(e){switch(e){case"open":return"Open";case"in_progress":return"In progress";case"awaiting_verification":return"Awaiting verification";case"done":return"Done";default:return e}}function uu(e){switch(e){case"open":return"open";case"in_progress":return"in-progress";case"awaiting_verification":return"awaiting-verification";case"done":return"done";default:return e}}function ft(e){return"aidos-chip aidos-chip-state-"+uu(e)}function Kn(e){return typeof e.criteria=="string"&&e.criteria.trim().length>0}function pu(e,n){return n===""||e.title.toLowerCase().includes(n.toLowerCase())?!0:String(e.id).includes(n)}function Ua(e,n){return Da(e,{stateIds:n.stateIds,projectIds:n.projectIds??void 0,search:n.search,tags:n.tags,sortKey:n.sortKey,descending:n.descending})}function Va(e,n,t=8){let i=[];for(let o of e)pu(o,n)&&i.push(o);return i.sort((o,r)=>o.id-r.id),i.slice(0,t)}function qa(e){let n=0;for(let t of e)t.state!=="done"&&(n+=1);return n}function ht(e,n,t){return t?e===null||n===null?"\u2014":e+"/"+n:"N/A"}function so(e,n,t){return t?e===null||n===null||e<n:!1}function ti(e){return Number.isFinite(e)?Math.max(0,Math.min(100,e*20)):0}function Ha(e){return e.split(`
`).map(n=>n.trim()).filter(n=>n.length>0)}var fu=/\s*<!--\s*kinds:\s*([a-z0-9_:,\- ]+?)\s*-->\s*$/i;function hu(e){let n=fu.exec(e);return n===null?[]:n[1].split(",").map(t=>t.trim()).filter(t=>t!=="")}function lr(e){return Ha(e)}function gu(e,n){let i=Ha(e).map(s=>({criterion:s,matched:!1,rows:[]})),o=new Map;for(let s of i)o.set(s.criterion,s);let r=[];for(let s of n){let a=s.payload.criteria;if(typeof a!="string"||a.trim()==="")r.push(s);else{let l=a.trim(),d=o.get(l);d?(d.rows.push(s),d.matched=!0):r.push(s)}}return r.length>0&&i.push({criterion:"",matched:!0,rows:r}),i}function Ga(e,n){let t=gu(e,n),i=[];for(let o of t){if(o.criterion===""||o.matched)continue;let r=hu(o.criterion),s=a=>r.includes(a)||r.includes(a.replace(/^builtin:/,""));r.length>0&&n.some(a=>s(a.kind))||i.push(o.criterion)}return i}function dr(e,n=6){return e.length>n}var Ka=["var(--badge-hue-1)","var(--badge-hue-2)","var(--badge-hue-3)","var(--badge-hue-4)","var(--badge-hue-5)","var(--badge-hue-6)","var(--badge-hue-7)","var(--badge-hue-8)"];function Ni(e){if(e==="builtin:review_fail")return"var(--verdict-fail)";if(e==="builtin:retired")return"var(--verdict-retired)";let n=0;for(let i=0;i<e.length;i++)n=n*31+e.charCodeAt(i)|0;let t=Math.abs(n)%Ka.length;return Ka[t]}function mu(e){for(let n of ni)if(n.id===e)return n.label;return e}function lo(e){for(let n of ni)if(n.id===e)return n.description;return""}var bu={"builtin:imported_state":"IMPORTED","builtin:user_signoff":"SIGNED OFF","builtin:user_verified":"VERIFIED","builtin:eval_criteria":"CRITERIA","builtin:file_allowlist":"ALLOWLIST","builtin:agent_report":"REPORT","builtin:automated_check":"CHECK","builtin:test_run":"TESTS","builtin:review_pass":"ACCEPTED","builtin:review_fail":"FAILED","builtin:review_note":"NOTE","builtin:retired":"RETIRED","builtin:user_commit":"COMMIT"};function ii(e){let n=bu[e];if(n!==void 0)return n;let t=mu(e);return t!==e?t.toUpperCase():(e.includes(":")?e.slice(e.indexOf(":")+1):e).replace(/[_-]+/g," ").toUpperCase()}function wu(e,n=ao){let t=pt.indexOf(e),i=new Set;for(let o of n){let r=pt.indexOf(o.toState);if(!(r<=pt.indexOf(o.fromState))&&r>=0&&t>=r)for(let s of o.requiredKinds)i.add(s)}return i}function Wa(e,n,t=ao){let i=wu(e,t);return n.filter(o=>o.count>1||!i.has(o.kind))}function Qa(e){let n=new Map,t=new Map,i=0,o=new Map;for(let s of e)if(n.set(s.kind,(n.get(s.kind)??0)+1),o.has(s.kind)||o.set(s.kind,i++),typeof s.at=="number"){let a=t.get(s.kind);(a===void 0||s.at<a)&&t.set(s.kind,s.at)}let r=[];for(let[s,a]of n)r.push({kind:s,count:a,color:Ni(s)});return r.sort((s,a)=>{let l=s.kind==="builtin:imported_state",d=a.kind==="builtin:imported_state";if(l!==d)return l?-1:1;let c=t.get(s.kind),f=t.get(a.kind);if(c!==void 0&&f!==void 0&&c!==f)return c-f;let p=o.get(s.kind)??0,h=o.get(a.kind)??0;return p!==h?p-h:s.kind<a.kind?-1:s.kind>a.kind?1:0}),r}var Ya=new Map;function Za(e,n){let t=n.trim();e===""||t===""||Ya.set(e,t)}function yu(e){let n=Ya.get(e);if(n!==void 0)return n;let t=e.split("-").filter(i=>i!=="");return t.length===0?e:t[t.length-1]}function Lt(e,n){let t=/^(--.*--):(.*)$/.exec(e);if(t===null)return e;let[,i,o]=t;return n!==void 0&&i===n?"#"+o:yu(i)+"#"+o}function Le(e){return e.workspaceKey+":"+e.slug}function Zn(e,n){return Lt(e.workspaceKey+":"+e.id,n)}var Fa=["var(--badge-hue-1)","var(--badge-hue-2)","var(--badge-hue-3)","var(--badge-hue-4)","var(--badge-hue-5)","var(--badge-hue-6)","var(--badge-hue-7)","var(--badge-hue-8)"];function Fn(e){let n=0;for(let i=0;i<e.length;i++)n=n*31+e.charCodeAt(i)|0;let t=Math.abs(n)%Fa.length;return Fa[t]}function Ja(e){return Fn(e)}function Xa(e){let n=new Map;for(let i of e)for(let o of i.tags??[])n.set(o,(n.get(o)??0)+1);let t=[];for(let[i,o]of n)t.push({tag:i,count:o});return t.sort((i,o)=>o.count-i.count||(i.tag<o.tag?-1:i.tag>o.tag?1:0)),t}function es(e,n,t){if(n===null)return{ticket:null,reanchorKey:null,reason:"none",absent:!1};let i=e.find(o=>ee(o)===n)??null;if(i!==null)return{ticket:i,reanchorKey:null,reason:"resolved",absent:!1};if(t!==null){let o=e.find(r=>Le(r)===Le(t))??null;return o!==null?{ticket:o,reanchorKey:ee(o),reason:"reanchored",absent:!1}:{ticket:t,reanchorKey:null,reason:"held",absent:!0}}return{ticket:null,reanchorKey:null,reason:"gone",absent:!1}}var Cn={projectIds:null,stateIds:[...Mt],sortKey:"time",descending:!0,search:""};function mn(e){return{projectIds:e.projectIds===null?null:[...e.projectIds],stateIds:[...e.stateIds],sortKey:e.sortKey,descending:e.descending,search:e.search,tags:e.tags===void 0?void 0:[...e.tags]}}var _i=new Map;function ts(){return{applied:mn(Cn),staged:mn(Cn)}}function is(e){let n=_i.get(e);return n?n.staged:mn(Cn)}function br(e,n){let t=_i.get(e);t||(t=ts(),_i.set(e,t)),t.applied=mn(n)}function wr(e,n){let t=_i.get(e);t||(t=ts(),_i.set(e,t)),t.staged=mn(n)}var cr=new Map,os=null,ur=null,pr=!1,Dt=null;function rs(e){Dt=e}function as(e,n){let t=cr.get(e)!==n;if(cr.set(e,n),os=e,!!t){if(yr){po=!0;return}Dt!==null&&Dt()}}function ss(e){let n=!pr||ur!==e;if(ur=e,pr=!0,!!n){if(yr){po=!0;return}Dt!==null&&Dt()}}function vu(){return pr?ur:os}function Ci(){let e=vu(),n=e===null?0:cr.get(e)??0;return n>0?"Tickets ("+n+")":"Tickets"}var yr=!1,po=!1;function vr(e){yr=e,!e&&po&&(po=!1,Dt!==null&&Dt())}var co=new Map;function ls(e,n){return co.get(e)?.has(n)===!0}function ds(e,n,t){let i=co.get(e);if(t){i===void 0?co.set(e,new Set([n])):i.add(n);return}i!==void 0&&(i.delete(n),i.size===0&&co.delete(e))}var oi=new Map;function ri(e,n,t){let i=oi.get(e);if(i===void 0){if(!t)return;i=new Map,oi.set(e,i)}let o=i.get(n);if(o===void 0){if(!t)return;o={open:new Set,evidence:null},i.set(n,o)}return o}function cs(e,n){let t=oi.get(e),i=t?.get(n);t===void 0||i===void 0||i.open.size>0||i.evidence!==null||(t.delete(n),t.size===0&&oi.delete(e))}function us(e,n,t){return ri(e,n,!1)?.open.has(t)===!0}function ps(e,n,t,i){if(i){ri(e,n,!0)?.open.add(t);return}let o=ri(e,n,!1);o!==void 0&&(o.open.delete(t),cs(e,n))}function fs(e,n){return ri(e,n,!1)?.evidence??null}function hs(e,n,t){if(t!==null){let o=ri(e,n,!0);o!==void 0&&(o.evidence=t);return}let i=ri(e,n,!1);i!==void 0&&(i.evidence=null,cs(e,n))}function gs(e,n){let t=oi.get(e);t!==void 0&&(t.delete(n),t.size===0&&oi.delete(e))}var fr=new Map;function ms(e){return fr.get(e)??null}function bs(e,n){n===null?fr.delete(e):fr.set(e,n)}var uo=new Map;function kr(e){return uo.get(e)??null}var hr=new Set;function ws(e){return hr.add(e),function(){hr.delete(e)}}function Oi(e){if(typeof window>"u")return;let n=new URL(window.location.href);e===null?(n.searchParams.delete("ticket"),window.history.replaceState({},"",n)):(n.searchParams.set("ticket",e),window.history.pushState({},"",n))}function Jn(e,n){let t=uo.get(e)??null;if(n===null?uo.delete(e):uo.set(e,n),t!==n)for(let i of[...hr])try{i(e)}catch{}}var gr=new Map;function fo(e){return gr.get(e)??null}function ns(e,n){n===null?gr.delete(e):gr.set(e,n)}function ys(e,n){return n??fo(e)}function vs(e,n,t){if(n==="resolved"||n==="reanchored"){t!==null&&ns(e,t);return}n==="none"&&ns(e,null)}var ks=new Map;function xs(e,n){return e+"\0"+String(n)}function Ss(e,n){for(let t of n)t.foreign===!0&&t.sourceSessionId===void 0||ks.set(xs(t.sourceSessionId??e,t.id),t.title)}function ho(e,n){return e===void 0?null:ks.get(xs(e,n))??null}var Ts=new Map,Es=new Map;function gt(e){return Ts.get(e)??null}function Rs(e,n){Ts.set(e,n)}function As(e){return Es.get(e)??null}function Is(e,n){Es.set(e,n)}var mr=new Set;function Ns(e){return mr.has(e)}function xr(e,n){n?mr.add(e):mr.delete(e)}var K=de(require("react"),1);var Ee=de(require("react"),1);var M=de(require("react"),1);function le(e){console.debug("aidos: "+e)}function _s(e){console.info("aidos: "+e)}function bn(e){console.warn("aidos: "+e)}function Cs(e){console.error("aidos: "+e)}function ku(e,n){if(e.sortKey!==n.sortKey||e.descending!==n.descending||e.search!==n.search||e.stateIds.length!==n.stateIds.length)return!1;for(let o=0;o<e.stateIds.length;o+=1)if(e.stateIds[o]!==n.stateIds[o])return!1;if(e.projectIds===null||n.projectIds===null){if(e.projectIds!==n.projectIds)return!1}else{if(e.projectIds.length!==n.projectIds.length)return!1;for(let o=0;o<e.projectIds.length;o+=1)if(e.projectIds[o]!==n.projectIds[o])return!1}let t=e.tags??[],i=n.tags??[];if(t.length!==i.length)return!1;for(let o=0;o<t.length;o+=1)if(t[o]!==i[o])return!1;return!0}var Os=[{key:"confidence",label:"Confidence"},{key:"gates",label:"Gates"},{key:"time",label:"Time updated"},{key:"alpha",label:"Alphabetical"}],xu=1200;function Ps(e){return e.pending?M.default.createElement("span",{className:"aidos-filter-status","aria-live":"polite"},M.default.createElement("span",{className:"aidos-merge-spinner"}),M.default.createElement("span",null,"Filtering\u2026")):e.dirty?M.default.createElement("span",{className:"aidos-filter-status","aria-live":"polite"},M.default.createElement("span",null,"Not applied yet")):M.default.createElement("span",{className:"aidos-filter-status"})}function Ms(e){let n=e.sessionId,t=M.default.useRef(is(n)),[i,o]=M.default.useState(()=>({...t.current,tags:t.current.tags??e.applied.tags??[]})),[r,s]=M.default.useState(t.current.search),[a,l]=M.default.useState(!1),d=M.default.useRef(null),c=M.default.useRef(null),[f,p]=M.default.useState(!1);function h(b){c.current!==null&&window.clearTimeout(c.current),p(!0),c.current=window.setTimeout(function(){c.current=null,p(!1),e.onApply(b)},xu)}function y(b){c.current!==null&&window.clearTimeout(c.current),c.current=null,p(!1),e.onApply(b)}function k(b){t.current=b,o(b),wr(n,b),h(b)}function I(b){s(b),d.current!==null&&window.clearTimeout(d.current),d.current=window.setTimeout(function(){k({...t.current,search:b})},150)}function v(){d.current!==null&&window.clearTimeout(d.current),s(""),k({...t.current,search:""})}M.default.useEffect(function(){le("filter panel mounted")},[]),M.default.useEffect(function(){return function(){d.current!==null&&window.clearTimeout(d.current),c.current!==null&&window.clearTimeout(c.current)}},[]);let P=!ku(i,e.applied),F=Va(e.tickets,r);function Q(b){let B=i.stateIds.includes(b)?i.stateIds.filter(H=>H!==b):[...i.stateIds,b];k({...i,stateIds:B})}function A(b){let N=(e.projects??[]).map(ze=>ze.id),B=i.projectIds===null?N:i.projectIds,he=B.includes(b)?B.filter(ze=>ze!==b):[...B,b],_e=he.length===N.length?null:he;k({...i,projectIds:_e})}function j(b){let N=i.tags??[],B=N.includes(b)?N.filter(H=>H!==b):[...N,b];k({...i,tags:B})}function se(){s(""),d.current!==null&&window.clearTimeout(d.current);let b=mn(Cn);t.current=b,o(b),wr(n,b),y(b)}let T=e.projects===void 0?null:M.default.createElement("div",{className:"aidos-panel-section"},M.default.createElement("div",{className:"aidos-panel-head"},M.default.createElement("h4",{className:"aidos-panel-title"},"Projects")),M.default.createElement("div",{className:"aidos-check-list"},e.projects.map(b=>{let N=i.projectIds===null||i.projectIds.includes(b.id);return M.default.createElement("label",{className:"aidos-check-row",key:b.id},M.default.createElement("input",{type:"checkbox",checked:N,onChange:()=>{A(b.id)}}),M.default.createElement("span",null,b.name))}))),Z=M.default.createElement("div",{className:"aidos-panel-section"},M.default.createElement("div",{className:"aidos-panel-head"},M.default.createElement("h4",{className:"aidos-panel-title"},"State")),M.default.createElement("div",{className:"aidos-check-list"},Mt.map(b=>{let N=i.stateIds.includes(b),B=e.tickets.filter(H=>H.state===b).length;return M.default.createElement("label",{className:"aidos-check-row",key:b},M.default.createElement("input",{type:"checkbox",checked:N,onChange:()=>{Q(b)}}),M.default.createElement("span",null,cn(b)),M.default.createElement("span",{className:"aidos-check-count"},String(B)))}))),pe=M.default.createElement("div",{className:"aidos-panel-section"},M.default.createElement("div",{className:"aidos-panel-head"},M.default.createElement("h4",{className:"aidos-panel-title"},"Sort")),M.default.createElement("div",{className:"aidos-sort-row"},M.default.createElement("select",{value:i.sortKey,onChange:b=>{k({...i,sortKey:b.target.value})}},Os.map(b=>M.default.createElement("option",{key:b.key,value:b.key},b.label))),M.default.createElement("button",{className:"aidos-btn aidos-toggle-btn",title:i.descending?"Sort ascending":"Sort descending","data-dsh-tip":"","aria-label":i.descending?"Sort ascending":"Sort descending",onClick:()=>{k({...i,descending:!i.descending})}},i.descending?"\u2193":"\u2191"))),qe=M.default.createElement("div",{className:"aidos-panel-section"},M.default.createElement("div",{className:"aidos-panel-head"},M.default.createElement("h4",{className:"aidos-panel-title"},"Search")),M.default.createElement("div",{className:"aidos-search-box"},M.default.createElement("input",{className:"aidos-search-input",type:"text",placeholder:"Title or id",value:r,onChange:b=>{I(b.target.value)},onFocus:()=>{l(!0)},onBlur:()=>{window.setTimeout(function(){l(!1)},120)}}),a&&F.length>0?M.default.createElement("div",{className:"aidos-autocomplete"},F.map(b=>M.default.createElement("button",{className:"aidos-suggestion",key:b.id,onMouseDown:N=>{N.preventDefault(),v(),e.onJump(ee(b))}},M.default.createElement("span",{className:"aidos-suggestion-title"},b.title),M.default.createElement("span",{className:"aidos-chip aidos-chip-id",style:{"--chip-hue":Fn(Le(b))},title:Le(b),"data-dsh-tip":""},Zn(b))))):null)),tn=M.default.createElement("div",{className:"aidos-actions-row"},M.default.createElement(Ps,{pending:f,dirty:P}),M.default.createElement("button",{className:"aidos-btn",onClick:se},"Reset")),sn=M.default.createElement("div",{className:"aidos-filter-chips"},Mt.map(b=>{let N=i.stateIds.includes(b),B=e.tickets.filter(H=>H.state===b).length;return M.default.createElement("button",{key:b,className:"aidos-filter-chip"+(N?" aidos-filter-chip-on":""),onClick:()=>{Q(b)}},cn(b),M.default.createElement("span",{className:"aidos-check-count"},String(B)))})),Be=Xa(e.tickets),hn=i.tags??[],R=Be.length===0?null:M.default.createElement("div",{className:"aidos-filter-chips",role:"group","aria-label":"Tags"},Be.map(({tag:b,count:N})=>{let B=hn.includes(b);return M.default.createElement("button",{key:b,className:"aidos-filter-chip"+(B?" aidos-filter-chip-on":""),title:N+" ticket(s) carry this tag","data-dsh-tip":"",onClick:()=>{j(b)}},b,M.default.createElement("span",{className:"aidos-check-count"},String(N)))}));return M.default.createElement("div",{className:"aidos-filterbar"},M.default.createElement("div",{className:"aidos-filterbar-left"},sn,R,e.projects===void 0||e.projects.length===0?null:M.default.createElement("select",{className:"aidos-filter-project",value:i.projectIds===null?"all":i.projectIds.join(","),onChange:b=>{let N=b.target.value;if(N==="all"){k({...i,projectIds:null});return}k({...i,projectIds:N===""?[]:N.split(",").map(Number)})}},M.default.createElement("option",{value:"all"},"All projects"),e.projects.map(b=>M.default.createElement("option",{key:b.id,value:String(b.id)},b.name))),M.default.createElement("div",{className:"aidos-sort-row"},M.default.createElement("select",{value:i.sortKey,onChange:b=>{k({...i,sortKey:b.target.value})}},Os.map(b=>M.default.createElement("option",{key:b.key,value:b.key},b.label))),M.default.createElement("button",{className:"aidos-btn aidos-toggle-btn",title:i.descending?"Sort ascending":"Sort descending","data-dsh-tip":"","aria-label":i.descending?"Sort ascending":"Sort descending",onClick:()=>{k({...i,descending:!i.descending})}},i.descending?"\u2193":"\u2191")),M.default.createElement("div",{className:"aidos-search-box aidos-filterbar-search"},M.default.createElement("input",{className:"aidos-search-input",type:"text",placeholder:"Title or id",value:r,onChange:b=>{I(b.target.value)},onFocus:()=>{l(!0)},onBlur:()=>{window.setTimeout(function(){l(!1)},120)}}),a&&F.length>0?M.default.createElement("div",{className:"aidos-autocomplete"},F.map(b=>M.default.createElement("button",{className:"aidos-suggestion",key:b.id,onMouseDown:N=>{N.preventDefault(),v(),e.onJump(ee(b))}},M.default.createElement("span",{className:"aidos-suggestion-title"},b.title),M.default.createElement("span",{className:"aidos-chip aidos-chip-id",style:{"--chip-hue":Fn(Le(b))},title:Le(b),"data-dsh-tip":""},Zn(b))))):null),M.default.createElement(Ps,{pending:f,dirty:P}),M.default.createElement("button",{className:"aidos-btn",onClick:se},"Reset")))}var Se=de(require("react"),1);var ai=de(require("react"),1);function Ls({evidence:e,state:n}){let t=Wa(n,Qa(e));if(t.length===0)return null;let i=new Map;for(let o of e)o.kind==="builtin:imported_state"&&typeof o.payload.claimed_state=="string"&&i.set(o.kind,o.payload.claimed_state);return ai.default.createElement(ai.default.Fragment,null,t.map(o=>{let r=i.get(o.kind),s=r!==void 0?r:o.count>1?String(o.count):null;return ai.default.createElement("span",{key:o.kind,className:"aidos-chip aidos-chip-kind",style:{"--chip-hue":o.color},title:lo(o.kind),"data-dsh-tip":""},ai.default.createElement("span",{className:"aidos-chip-key"},ii(o.kind)),s!==null?ai.default.createElement("span",{className:"aidos-chip-count"},s):null)}))}var q=de(require("react"),1),Pi=require("@deepseek-ai/dsh-client-ui-primitives"),Su=1.6;function wn(){return{width:12,height:12,viewBox:"0 0 12 12",fill:"none",stroke:"currentColor",strokeWidth:Su,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":!0,focusable:!1}}function Tn(){return q.default.createElement("svg",{...wn()},q.default.createElement("path",{d:"M8.5 1.5l2 2L4 10l-2.5.5L2 8z"}))}function Ds(){return q.default.createElement("svg",{...wn()},q.default.createElement("path",{d:"M2 3.5h8M5 3.5V2h2v1.5M3 3.5l.5 7h5l.5-7M5 5.5v3M7 5.5v3"}))}function mt(){return q.default.createElement("svg",{...wn()},q.default.createElement("path",{d:"M6.5 2H2v8h8V5.5"}),q.default.createElement("path",{d:"M7 2h3v3"}),q.default.createElement("path",{d:"M5 7l5-5"}))}function Bs(){return q.default.createElement("svg",{...wn()},q.default.createElement("path",{d:"M6.5 10H2V2h8v4.5"}),q.default.createElement("path",{d:"M10.5 6.5v3.5H7"}),q.default.createElement("path",{d:"M10.2 6.8L7.2 9.8"}))}function zs(){return q.default.createElement("svg",{...wn()},q.default.createElement("path",{d:"M6 1.5l4.5 8h-9z"}),q.default.createElement("path",{d:"M6 4.75v2.5"}),q.default.createElement("path",{d:"M6 8.6v.4"}))}function si(){return q.default.createElement("svg",{...wn()},q.default.createElement("circle",{cx:"6",cy:"4.1",r:"2.4"}),q.default.createElement("path",{d:"M5.1 6.3L4.3 9.9h3.4L6.9 6.3"}))}function li(){return q.default.createElement("svg",{...wn()},q.default.createElement("circle",{cx:"3.4",cy:"2.6",r:"1.4"}),q.default.createElement("circle",{cx:"3.4",cy:"9.4",r:"1.4"}),q.default.createElement("circle",{cx:"8.6",cy:"2.6",r:"1.4"}),q.default.createElement("path",{d:"M3.4 4v4"}),q.default.createElement("path",{d:"M8.6 4v1.4c0 1.2-.7 1.6-1.8 1.6H3.4"}))}function Xn(){return q.default.createElement("svg",{...wn()},q.default.createElement("circle",{cx:"6",cy:"6",r:"4.6"}),q.default.createElement("path",{d:"M8 4L5.2 5.2 4 8l2.8-1.2z"}))}function Mi(){return q.default.createElement("svg",{...wn()},q.default.createElement("circle",{cx:"6",cy:"6",r:"4.6"}),q.default.createElement("path",{d:"M6 3.5v3"}),q.default.createElement("path",{d:"M6 8.3v.35"}))}function Li(){return q.default.createElement("svg",{...wn()},q.default.createElement("path",{d:"M2.6 1.6h4.3l2.5 2.5v6.3H2.6z"}),q.default.createElement("path",{d:"M6.8 1.7v2.4h2.4"}),q.default.createElement("path",{d:"M4.2 8.4c1-1.4 1.7-1.4 2.2-.5s1 .6 1.6-.6"}))}function Ks(){return q.default.createElement("svg",{...wn()},q.default.createElement("circle",{cx:"6",cy:"6",r:"4.6"}),q.default.createElement("path",{d:"M3.9 6.1l1.5 1.5L8.2 4.8"}))}function Fs(){return q.default.createElement("svg",{...wn()},q.default.createElement("rect",{x:"1.6",y:"1.6",width:"8.8",height:"8.8",rx:"1.6"}),q.default.createElement("path",{d:"M3.9 6.1l1.5 1.5L8.2 4.8"}))}function go(){return q.default.createElement("svg",{...wn()},q.default.createElement("path",{d:"M1.8 3.2l1 1 1.6-1.8"}),q.default.createElement("path",{d:"M1.8 7.4l1 1 1.6-1.8"}),q.default.createElement("path",{d:"M6.4 3.4h3.8"}),q.default.createElement("path",{d:"M6.4 7.6h3.8"}))}function mo({open:e,disabled:n}){return n===!0?q.default.createElement(Pi.IconChevronDownOutline14,{className:"tool-render-chevron tool-render-chevron-disabled","aria-hidden":!0}):q.default.createElement(Pi.IconChevronDownOutline14,{className:"tool-render-chevron"+(e?" tool-render-chevron-open":""),"aria-hidden":!0})}function $s(){return q.default.createElement(Pi.IconInspectOutline12,null)}function Sr(e){return e.tags.length===0?null:Se.default.createElement(Se.default.Fragment,null,e.tags.map(n=>Se.default.createElement("span",{key:n,className:"aidos-chip aidos-chip-tag",style:{"--chip-hue":Ja(n)},"aria-label":"Tag "+n,title:"Tag "+n,"data-dsh-tip":""},n)))}function js(e){let n=Eu(e.ticket),t=bo.get(n);if(t!==void 0&&Au(t.props,e))return t.element;let i=Iu(e);return bo.size>=Tu&&bo.clear(),bo.set(n,{props:e,element:i}),i}var Tu=1024,bo=new Map;function Eu(e){let n=e.sourceSessionId;return(typeof n=="string"?n:"")+":"+String(e.id)}function Ru(e,n){return e===n||e.length===0&&n.length===0}function Au(e,n){return e.ticket===n.ticket&&Ru(e.evidence,n.evidence)&&e.selected===n.selected&&(e.active??!1)===(n.active??!1)&&(e.awaitingApproval??!1)===(n.awaitingApproval??!1)&&e.ownWorkspaceKey===n.ownWorkspaceKey}function Iu(e){let n=e.ticket,t=n.supersededCopies??[],i="aidos-tile"+(e.selected?" aidos-tile-selected":"")+(e.active===!0?" aidos-tile-active":""),o=ft(n.state),r=so(n.gatePresent,n.gateTotal,Kn(n));return Se.default.createElement("button",{className:i,onClick:e.onSelect},Se.default.createElement("div",{className:"aidos-tile-meta"},Se.default.createElement("span",{className:"aidos-chip aidos-chip-id",style:{"--chip-hue":Fn(Le(n))},title:Le(n),"data-dsh-tip":""},Zn(n,e.ownWorkspaceKey)),t.length>0?Se.default.createElement("span",{className:"aidos-chip aidos-chip-copies","aria-label":t.length+" other session cop"+(t.length===1?"y":"ies")+" of this ticket were merged into this row",title:"Merged from "+t.length+" other session cop"+(t.length===1?"y":"ies")+`. This row is the most recently updated one.
`+t.map(s=>`${s.sessionId} (updated ${new Date(s.updatedAt*1e3).toLocaleString()})`).join(`
`),"data-dsh-tip":""},"+"+t.length):null,e.awaitingApproval===!0?Se.default.createElement("span",{className:"aidos-chip aidos-chip-approval-flag","aria-label":"This ticket has a request waiting for your approval",title:"This ticket has a request waiting for your approval","data-dsh-tip":""},Se.default.createElement(Mi,null)):null,Se.default.createElement("span",{className:o},cn(n.state))),Se.default.createElement("h3",{className:"aidos-tile-title"},n.title),Se.default.createElement("p",{className:"aidos-tile-preview"},n.description),Se.default.createElement("div",{className:"aidos-tile-chips"},Se.default.createElement("span",{className:"aidos-chip aidos-chip-metric aidos-chip-gate"+(r?" aidos-chip-fail":""),"aria-label":"Gate: "+ht(n.gatePresent,n.gateTotal,Kn(n))+" of the required evidence is attached",title:"Gate: "+ht(n.gatePresent,n.gateTotal,Kn(n))+" of the required evidence is attached","data-dsh-tip":""},Se.default.createElement("span",{className:"aidos-chip-key"},Se.default.createElement(si,null)),Se.default.createElement("span",{className:"aidos-chip-value"},ht(n.gatePresent,n.gateTotal,Kn(n)))),Se.default.createElement(Ls,{evidence:e.evidence,state:n.state}),Se.default.createElement(Sr,{tags:n.tags??[]}),n.dependsOn?.map(s=>Se.default.createElement("span",{key:s,className:"aidos-chip aidos-chip-dep","aria-label":"Depends on "+s,title:"Depends on "+s,"data-dsh-tip":""},Se.default.createElement("span",{className:"aidos-chip-dep-icon"},Se.default.createElement(li,null)),Lt(s,e.ownWorkspaceKey))),Se.default.createElement("span",{className:"aidos-chip aidos-chip-metric aidos-chip-conf","aria-label":"Confidence "+ti(n.confidenceScore)+"%. Advisory only \u2014 it never unlocks anything.",title:"Confidence "+ti(n.confidenceScore)+"%. Advisory only \u2014 it never unlocks anything.","data-dsh-tip":""},Se.default.createElement("span",{className:"aidos-chip-key"},Se.default.createElement(Xn,null)),Se.default.createElement("span",{className:"aidos-chip-value"},ti(n.confidenceScore)+"%"))))}function Nu(e){if(e.state!=="open")return"the ticket is already signed off"}function _u(e,n){if(e.state!=="in_progress")return"the ticket must be in progress";let t=new Set(n);if(!t.has("builtin:review_pass")){let i=["review_pass (a reviewer subagent or the human reviews first)"];return t.has("builtin:automated_check")||i.unshift("automated_check"),"requires "+i.join(", ")}}function Cu(e){if(e.state!=="awaiting_verification")return"the ticket must be awaiting verification"}function Ou(e){if(e.state!=="awaiting_verification")return"the ticket must be awaiting verification"}function Pu(e,n){if(e.state!=="awaiting_verification")return"the ticket must be awaiting verification";if(!n.includes("builtin:user_verified"))return"requires user_verified (attach your verification row first)"}function Mu(e){if(e.state!=="in_progress")return"the ticket must be in progress"}function Bt(e,n=[]){return[{id:"signoff",label:"Sign off",primary:!0,unavailableReason:Nu(e)},{id:"verify",label:"Verify",unavailableReason:Ou(e)},{id:"submit-for-review",label:"Submit for review",unavailableReason:_u(e,n)},{id:"send-back",label:"Send back",unavailableReason:Cu(e)},{id:"mark-done",label:"Mark done",primary:!0,unavailableReason:Pu(e,n)},{id:"allowlist",label:"Allowlist",unavailableReason:Mu(e)}]}function Us(e,n,t){let i=Bt(e,n).find(o=>o.id===t);return i===void 0?"unknown action "+t:i.unavailableReason===void 0?null:i.label+" is not available \u2014 "+i.unavailableReason}var Lu=new Set(["signoff","verify","mark-done"]),Du={signoff:"Sign off to let the agent start work",verify:"Verify the work and attach your row","mark-done":"Verified \u2014 mark it done"};function qs(e,n){let t=[];for(let i of e){if(i.state==="done")continue;let o=n(i);if(o.includes(sr))continue;let r=Bt(i,o).filter(a=>Lu.has(a.id)&&a.unavailableReason===void 0),s=new Set(r.map(a=>a.id));for(let a of r)a.id==="verify"&&s.has("mark-done")||t.push({ticket:i,boardKey:ee(i),actionId:a.id,label:a.label,prompt:Du[a.id]??a.label})}return t}function Ar(e,n,t=[],i="suggested",o=[]){let r=qs(e,n);for(let s of o){let a=String(s.ticketId),l=e.find(c=>ee(c)===a);if(l===void 0)continue;let d=Array.isArray(s.payload?.paths)?s.payload.paths.filter(c=>typeof c=="string"):[];r.push({ticket:l,boardKey:ee(l),actionId:"allowlist",label:"Review request",prompt:s.prompt+(d.length>0?` \u2014 ${d.length} path(s)`:""),approvalId:s.id,approvalPaths:d})}for(let s of t){let a=String(s.ticketId),l=r.find(d=>d.boardKey===a&&d.actionId===s.actionId);l!==void 0&&(l.nominationReason=s.reason,l.nominationId=s.id)}return Bu(r,i)}var Ir={suggested:"Suggested first",recent:"Recently updated",id:"Ticket id",alpha:"Title A\u2013Z"};function Bu(e,n="suggested"){let t=[...e];switch(n){case"recent":return t.sort((i,o)=>o.ticket.updatedAt-i.ticket.updatedAt||i.ticket.id-o.ticket.id);case"id":return t.sort((i,o)=>i.ticket.id-o.ticket.id);case"alpha":return t.sort((i,o)=>i.ticket.title.localeCompare(o.ticket.title)||i.ticket.id-o.ticket.id);default:return t.sort((i,o)=>{let r=i.approvalId!==void 0?0:1,s=o.approvalId!==void 0?0:1;if(r!==s)return r-s;let a=i.nominationReason!==void 0?0:1,l=o.nominationReason!==void 0?0:1;return a!==l?a-l:i.ticket.phase-o.ticket.phase||i.ticket.order-o.ticket.order})}}function Hs(e){return e.filter(n=>n.nominationId!==void 0||n.approvalId!==void 0).length}var Tr=["signoff","approvals","verify"],zu={signoff:"Sign off",approvals:"Approvals",verify:"Verify"},Gs={signoff:"No sign-offs waiting. Nothing needs permission to start.",approvals:"No approvals waiting. The agent is not blocked on you.",verify:"Nothing to verify. No finished work is waiting for a check."},Ws={signoff:"signoff",approvals:"allowlist",verify:"verify"};function Qs(e){return e.approvalId!==void 0?"approvals":e.actionId==="signoff"?"signoff":"verify"}function Ys(e){return Tr.map(n=>({id:n,label:zu[n],entries:e.filter(t=>Qs(t)===n)}))}function Zs(e){for(let n of Tr)if(e.some(t=>Qs(t)===n))return n;return Tr[0]}function Js(e){return e?4e3:2e4}var Er=null,Rr=new Set;function zt(){return Er}function Nr(e){Er=e;for(let n of[...Rr])n(Er)}function Xs(e){return Rr.add(e),function(){Rr.delete(e)}}function el(e,n){if(e===null)return null;let t=Number(n);if(!Number.isFinite(t))return null;let i=null;for(let o of e.approvals)Number(o.ticketId)===t&&(i===null||o.at<i.at)&&(i=o);return i}function _r(e,n,t){return!t&&Array.isArray(n)?[...n]:[...e]}function nl(e,n){return e!==n?{armed:n,dismiss:!1}:{armed:null,dismiss:!0}}function tl(e,n){let t=Number.isFinite(e)&&e>0?Math.floor(e):0,i=Number.isFinite(n)&&n>0?Math.floor(n):0;return{count:t,indicator:i>0&&t>0,asks:i}}function il(e,n){let t=e.count===0?"Nothing is waiting on you":`${e.count} waiting on you`,i=e.asks>0?`; ${e.asks} the agent is asking for`:"",o=n?" (the last refresh failed; showing the last known count)":"";return t+i+o}var Ku={signoff:"open",verify:"awaiting_verification","mark-done":"awaiting_verification"},Vs=["open","in_progress","awaiting_verification","done"];function ol(e,n,t){let i=qs(e,n),o=[];for(let r of t){let s=String(r.ticketId);if(i.some(f=>f.boardKey===s&&f.actionId===r.actionId))continue;let a=e.find(f=>ee(f)===s);if(a===void 0){o.push({nomination:r,kind:"not-on-board",reason:"#"+s+" is not on this board (it may belong to another session)"});continue}let l=Ku[r.actionId],d=l===void 0?-1:Vs.indexOf(l),c=Vs.indexOf(a.state);if(d>=0&&c>d){o.push({nomination:r,kind:"fulfilled",reason:"#"+s+" is already "+a.state+"; the ask was answered"});continue}o.push({nomination:r,kind:"unavailable",reason:"#"+s+" has no available "+r.actionId+" action right now"})}return o}function rl(e){let[n,t]=Ee.default.useState(!1),i=e.tickets.map(s=>Ee.default.createElement(js,{key:ee(s),ticket:s,evidence:e.evidenceByTicket?.[ee(s)]??[],ownWorkspaceKey:e.ownWorkspaceKey,awaitingApproval:e.awaitingApprovalKeys?.has(ee(s))===!0,selected:ee(s)===e.selectedId,active:ee(s)===e.activeTicketId,onSelect:()=>{e.onSelect(ee(s))}})),o;e.allTicketsCount===0?o=Ee.default.createElement("div",{className:"aidos-empty"},Ee.default.createElement("h3",{className:"aidos-empty-title"},"No tickets yet"),Ee.default.createElement("p",{className:"aidos-empty-note"},"This session holds no tickets. Create the first one to start the board."),Ee.default.createElement("button",{className:"aidos-btn aidos-btn-primary",onClick:e.onCreate},"Create a ticket")):e.tickets.length===0?o=Ee.default.createElement("div",{className:"aidos-empty"},Ee.default.createElement("h3",{className:"aidos-empty-title"},"No tickets match"),Ee.default.createElement("p",{className:"aidos-empty-note"},"The active filters hide every ticket. Clear them to see the board."),Ee.default.createElement("button",{className:"aidos-btn",onClick:e.onClearFilters},"Clear filters")):o=Ee.default.createElement("div",{className:"aidos-board-grid"},i);let r=tl(e.queueTotal??0,e.agentAskCount??0);return Ee.default.createElement("div",{className:"aidos-root"},Ee.default.createElement("div",{className:"aidos-toolbar"},Ee.default.createElement("span",{className:"aidos-empty-note"},e.tickets.length+" of "+e.allTicketsCount+" tickets"),Ee.default.createElement("span",{className:"aidos-toolbar-actions"},e.onQueue!==void 0?Ee.default.createElement("button",{className:"aidos-btn",onClick:e.onQueue,title:il(r,e.agentAskCountStale===!0),"data-dsh-tip":""},"Waiting on you",Ee.default.createElement("b",{className:"aidos-queue-count"+(r.indicator?" aidos-queue-count-asks":"")},r.count)):null,e.onRetired!==void 0&&(e.retiredCount??0)>0?Ee.default.createElement("button",{className:"aidos-btn",onClick:e.onRetired,title:"Hidden tickets \u2014 view and un-retire them","data-dsh-tip":""},"Retired",Ee.default.createElement("b",{className:"aidos-queue-count"},e.retiredCount)):null,Ee.default.createElement("button",{className:"aidos-btn",onClick:e.onPlan},"Plan"),e.onTags!==void 0?Ee.default.createElement("button",{className:"aidos-btn",onClick:e.onTags,title:"Browse every tag in the workspace, with counts","data-dsh-tip":""},"Tags",Ee.default.createElement("b",{className:"aidos-queue-count"},e.tagsTotal??0)):null,Ee.default.createElement("button",{className:"aidos-btn aidos-btn-primary",onClick:e.onCreate},"Create"))),Ee.default.createElement(Ms,{sessionId:e.sessionId,projects:e.projects,applied:e.applied,tickets:e.tickets,onApply:e.onApply,onJump:e.onJump,collapsed:n,onToggleCollapsed:()=>{t(!n)}}),Ee.default.createElement("div",{className:"aidos-grid-wrap"},o))}var w=de(require("react"),1);var Ue=de(require("react"),1);var J=class extends Error{code;message;extra;constructor(n,t,i={}){super(t),this.name="AidosRemoteError",this.code=n,this.message=t,this.extra=i}};function Fu(){return crypto.randomUUID()}function $u(e){return e===void 0?"":typeof e.message=="string"?e.message:""}function ju(e){return e===void 0?{}:typeof e.details!="object"||e.details===null?{}:e.details}function al(e){if(e===null)return"null";if(typeof e=="string")return e.length>60?e.slice(0,57)+"...":e;if(typeof e=="number"||typeof e=="boolean")return String(e);if(Array.isArray(e))return"["+e.length+" items]";if(typeof e=="object"){let n=Object.keys(e);return"{"+n.slice(0,4).join(",")+(n.length>4?",...":"")+"}"}return String(e)}function Uu(e){let n=Object.keys(e).map(function(t){return t+"="+al(e[t])});return n.length===0?"{}":n.join(" ")}function di(e){return Cs("remote failed: "+e),new J("transport_error",e)}async function z(e,n,t){le("remote "+e+" args: "+Uu(n));let i={type:"client-request",rpcId:Fu(),method:`aidos/${e}`,payload:{args:{agentId:t,args:n}}},o=15e3,r=typeof AbortController<"u"?new AbortController:void 0,s=r?setTimeout(()=>r.abort(new Error("Remote call timed out after "+o+"ms")),o):void 0,a;try{a=await fetch(`/api/${i.method}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(i),signal:r?.signal}),s!==void 0&&clearTimeout(s)}catch(c){throw s!==void 0&&clearTimeout(s),di(`The request to the aidos Remote failed: ${c instanceof Error?c.message:String(c)}`)}if(!a.ok)throw di(`The aidos Remote answered with HTTP ${a.status}.`);let l;try{l=await a.json()}catch{throw di("The aidos Remote answered with a body that is not JSON.")}if(l.type!=="server-response")throw di("The aidos Remote answered with an unexpected response shape.");let d=l.result;if(d===void 0)throw di("The aidos Remote answered without a result.");if(d.ok===!0){let c=d.value;return _s("remote "+e+" ok"),c===void 0?null:(le("remote "+e+" result: "+al(c)),c)}if(d.ok===!1){let c=d.error,f=typeof c?.code=="string"?c.code:"refused",p=$u(c)||`The aidos Remote refused the request (${f}).`;throw bn("remote "+e+" refused "+f+": "+p),new J(f,p,ju(c))}throw di("The aidos Remote answered with an unrecognized result.")}var sl=6e3;function Vu(){return crypto.randomUUID()}var ci=[],Cr=new Set,Or=new Map;function ll(){let e=ci.slice();for(let n of Cr)n(e)}function dl(e){let n=Or.get(e);n!==void 0&&(window.clearTimeout(n),Or.delete(e));let t=ci.filter(i=>i.id!==e);t.length!==ci.length&&(ci=t,ll())}function _(e,n="info"){n==="refusal"?bn("toast refusal: "+e):le("toast: "+e);let t=Vu(),i={id:t,text:e,kind:n,expiresAt:Date.now()+sl};ci=ci.concat(i),ll();let o=window.setTimeout(function(){dl(t)},sl);return Or.set(t,o),t}function cl(e){dl(e)}function ul(e){return Cr.add(e),function(){Cr.delete(e)}}function qu(e){let n=new Set;for(let t of e.split(`
`)){let i=t.trim();i!==""&&!n.has(i)&&n.add(i)}return[...n]}function Hu(e,n){let t=[],i=new Set;for(let o of e)if(!(ee(o)===n||o.state!=="in_progress"))for(let r of o.allowlist??[])i.has(r)||(i.add(r),t.push(r));return t}function pl(e){let[n,t]=Ue.default.useState(e.currentAllowlist.join(`
`)),[i,o]=Ue.default.useState([]),[r,s]=Ue.default.useState(!1);if(Ue.default.useEffect(function(){if(!e.open)return;let l=!1;return(async function(){try{let d=await z("workspaceTickets",{},e.agentId),c=Array.isArray(d)?d:d?.tickets??[],f=Hu(c,e.ticketIdKey);l||o(f)}catch{}})(),function(){l=!0}},[e.open,e.agentId,e.ticketId]),!e.open)return null;async function a(){if(r)return;let l=qu(n);s(!0);try{let d=await z("userGrantAllowlist",{ticketId:e.ticketIdKey,paths:l},e.agentId),c=Array.isArray(d?.granted)?d.granted.length:l.length;_(c>0?"Allowlist granted \u2014 "+c+" path(s)":"Allowlist unchanged","success"),e.onClose(),e.onSaved()}catch(d){d instanceof J?_(d.message,"refusal"):_(String(d),"refusal")}finally{s(!1)}}return Ue.default.createElement("div",{className:"aidos-modal-mask",onClick:()=>{r||e.onClose()}},Ue.default.createElement("div",{className:"aidos-modal",onClick:l=>{l.stopPropagation()}},Ue.default.createElement("div",{className:"aidos-modal-head"},Ue.default.createElement("h3",{className:"aidos-modal-title"},"File allowlist"),Ue.default.createElement("button",{className:"aidos-close-btn",onClick:()=>{r||e.onClose()},"aria-label":"Close"},"\xD7")),Ue.default.createElement("div",{className:"aidos-modal-form"},Ue.default.createElement("div",{className:"aidos-modal-row"},Ue.default.createElement("label",null,"One path per line. Saving grants these paths on top of the current list \u2014 a write outside the granted set refuses while the ticket is in progress. To revoke a path, delete its grant row from the ticket's evidence."),Ue.default.createElement("textarea",{className:"aidos-allowlist-input",value:n,disabled:r,rows:8,onChange:l=>{t(l.target.value)}})),i.length>0?Ue.default.createElement("div",{className:"aidos-modal-row aidos-allowlist-preview"},Ue.default.createElement("label",null,"Also allowed by other in-progress tickets"),Ue.default.createElement("ul",null,i.map(l=>Ue.default.createElement("li",{key:l},l)))):null,Ue.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:r,onClick:()=>{a()}},r?"Saving\u2026":"Save"))))}var un=de(require("react"),1);var Ne=de(require("react"),1);function Ge(e){return Ne.default.createElement("div",{className:"aidos-field-row"},Ne.default.createElement("span",{className:"aidos-field-row-label"},e.label),Ne.default.createElement("span",{className:"aidos-field-row-value"},e.children))}function fl(e){let[n,t]=Ne.default.useState(e.defaultOpen===!0);return Ne.default.createElement("details",{className:"aidos-collapse",open:n,onToggle:i=>{t(i.currentTarget.open)}},Ne.default.createElement("summary",null,e.summary),Ne.default.createElement("div",{className:"aidos-collapse-body"},e.children))}function De(e){let n=e.working===!0;return Ne.default.useEffect(function(){let t=i=>{i.key==="Escape"&&!n&&e.onClose()};return window.addEventListener("keydown",t),function(){window.removeEventListener("keydown",t)}},[e,n]),Ne.default.createElement("div",{className:"aidos-modal-mask",onClick:()=>{n||e.onClose()}},Ne.default.createElement("div",{className:"aidos-modal"+(e.wide===!0?" aidos-modal-wide":""),onClick:t=>{t.stopPropagation()}},e.bare===!0?null:Ne.default.createElement("div",{className:"aidos-modal-head"},Ne.default.createElement("h3",{className:"aidos-modal-title"},e.title),Ne.default.createElement("button",{className:"aidos-close-btn",onClick:e.onClose,disabled:n,"aria-label":"Close"},"\xD7")),Ne.default.createElement("div",{className:"aidos-modal-form"},e.children,e.onConfirm!==void 0?Ne.default.createElement("div",{className:"aidos-form-actions"},Ne.default.createElement("button",{className:"aidos-btn",onClick:e.onClose,disabled:n},"Cancel"),Ne.default.createElement("button",{className:"aidos-btn aidos-btn-primary",onClick:e.onConfirm,disabled:n},n?"Working\u2026":e.confirmLabel??"Confirm")):null)))}function yn(e){return Ne.default.createElement("div",{className:"aidos-modal-row"},Ne.default.createElement("label",null,e.label),Ne.default.createElement("textarea",{className:"aidos-evidence-attach-note",value:e.value,disabled:e.working,placeholder:e.placeholder,onChange:n=>{e.onChange(n.target.value)}}))}function et(e){return Ne.default.createElement("div",{className:"aidos-modal-row"},Ne.default.createElement("label",null,e.label),Ne.default.createElement("textarea",{className:"aidos-evidence-attach-note aidos-allowlist-input",value:e.value,disabled:e.working,placeholder:e.placeholder,onChange:n=>{e.onChange(n.target.value)}}))}function ui(e){return e.split(`
`).map(n=>n.trim()).filter(n=>n!=="")}var X=de(require("react"),1);function Kt(e){return X.default.createElement("span",{className:"aidos-evidence-note-text"},e.text)}function Di(e){let[n,t]=X.default.useState(!1);return X.default.createElement("details",{className:"aidos-evidence-raw-json",open:n,onToggle:i=>{t(i.currentTarget.open)}},X.default.createElement("summary",null,"raw payload"),X.default.createElement("pre",{className:"aidos-evidence-payload-json"},JSON.stringify(e.payload,null,2)))}function Gu(e){return/\.(png|jpe?g|webp|gif|avif)$/i.test(e)}function hl(e){let{kind:n}=e.row,t=e.row.payload??{},i=typeof t.note=="string"?t.note:null,o={...t};if(delete o.note,n==="builtin:file_allowlist"&&Array.isArray(t.paths))return X.default.createElement("div",{className:"aidos-evidence-fields"},X.default.createElement(Ge,{label:"Paths"},X.default.createElement("ul",{className:"aidos-evidence-payload-list"},t.paths.map(a=>X.default.createElement("li",{key:a},a)))),i!==null?X.default.createElement(Ge,{label:"Note"},X.default.createElement(Kt,{text:i})):null,X.default.createElement(Di,{payload:t}));if(n==="builtin:imported_state"&&typeof t.claimed_state=="string")return X.default.createElement("div",{className:"aidos-evidence-fields"},X.default.createElement(Ge,{label:"Claimed state"},X.default.createElement("span",{className:"aidos-evidence-note-text"},t.claimed_state)),typeof t.source=="string"?X.default.createElement(Ge,{label:"Source"},t.source):null,i!==null?X.default.createElement(Ge,{label:"Note"},X.default.createElement(Kt,{text:i})):null,X.default.createElement(Di,{payload:t}));if(typeof t.imagePath=="string")return X.default.createElement("div",{className:"aidos-evidence-fields"},X.default.createElement(Ge,{label:"Screenshot"},X.default.createElement("img",{className:"aidos-evidence-image",src:t.imagePath,alt:i??"evidence screenshot"}),X.default.createElement("span",{className:"aidos-evidence-image-path"},t.imagePath)),i!==null?X.default.createElement(Ge,{label:"Note"},X.default.createElement(Kt,{text:i})):null,X.default.createElement(Di,{payload:t}));if(typeof t.commit=="string")return X.default.createElement("div",{className:"aidos-evidence-fields"},X.default.createElement(Ge,{label:"Commit"},X.default.createElement("code",null,String(t.commit).slice(0,12)),typeof t.subject=="string"?X.default.createElement(Kt,{text:" "+t.subject}):null),typeof t.author=="string"?X.default.createElement(Ge,{label:"Committed by"},t.author):null,typeof t.branch=="string"?X.default.createElement(Ge,{label:"Branch"},t.branch):null,i!==null?X.default.createElement(Ge,{label:"Note"},X.default.createElement(Kt,{text:i})):null,X.default.createElement(Di,{payload:t}));let r=Object.entries(o).filter(a=>typeof a[1]=="string"&&a[1].trim()!==""),s=Object.entries(o).filter(a=>typeof a[1]!="string");return X.default.createElement("div",{className:"aidos-evidence-fields"},r.map(([a,l])=>X.default.createElement(Ge,{key:a,label:a},X.default.createElement(Kt,{text:l}))),s.map(([a,l])=>X.default.createElement(Ge,{key:a,label:a},X.default.createElement("code",null,Gu(String(l))?String(l):JSON.stringify(l)))),i!==null?X.default.createElement(Ge,{label:"Note"},X.default.createElement(Kt,{text:i})):null,X.default.createElement(Di,{payload:t}))}function bt(e){let n=e.row;return un.default.useEffect(function(){if(n===null)return;let t=i=>{i.key==="Escape"&&e.onClose()};return window.addEventListener("keydown",t),function(){window.removeEventListener("keydown",t)}},[n,e]),n===null?null:un.default.createElement("div",{className:"aidos-modal-mask",onClick:e.onClose},un.default.createElement("div",{className:"aidos-modal",onClick:t=>{t.stopPropagation()}},un.default.createElement("div",{className:"aidos-modal-head"},un.default.createElement("h3",{className:"aidos-modal-title"},un.default.createElement("span",{className:"aidos-chip aidos-chip-kind",style:{"--chip-hue":Ni(n.kind)}},un.default.createElement("span",{className:"aidos-chip-key"},ii(n.kind)))," "+n.kind),un.default.createElement("button",{className:"aidos-close-btn",onClick:e.onClose,"aria-label":"Close"},"\xD7")),un.default.createElement("div",{className:"aidos-modal-form"},un.default.createElement("div",{className:"aidos-evidence-fields"},un.default.createElement(Ge,{label:"Author"},n.author),un.default.createElement(Ge,{label:"At"},typeof n.at=="number"?new Date(n.at*1e3).toISOString():"unknown")),un.default.createElement(hl,{row:n}))))}var Ze=de(require("react"),1);var rn=de(require("react"),1);function Wu(e){let n=e.payload??{};if(typeof n.note=="string"&&n.note.trim()!=="")return n.note.trim();if(Array.isArray(n.paths)){let t=n.paths.filter(i=>typeof i=="string");if(t.length>0)return t.length+" path(s)"}return typeof n.claimed_state=="string"?"claimed "+n.claimed_state:typeof n.commit=="string"?"commit "+n.commit.slice(0,12):typeof n.imagePath=="string"?"screenshot":typeof n.report=="string"?n.report.slice(0,60):null}function Qu(e){if(typeof e!="number")return null;let n=Math.max(0,Math.floor(Date.now()/1e3-e));return n<60?"just now":n<3600?Math.floor(n/60)+"m ago":n<86400?Math.floor(n/3600)+"h ago":Math.floor(n/86400)+"d ago"}function En(e){let n=e.row,t=Wu(n),i=Qu(n.at);return rn.default.createElement("li",{className:"aidos-evidence-strip"},rn.default.createElement("div",{className:"aidos-evidence-strip-main"},rn.default.createElement("span",{className:"aidos-chip aidos-chip-kind",style:{"--chip-hue":Ni(n.kind)},title:lo(n.kind),"data-dsh-tip":""},rn.default.createElement("span",{className:"aidos-chip-key"},ii(n.kind))),e.standing==="verified"||e.standing==="invalidated"?rn.default.createElement("span",{className:"aidos-review-standing aidos-review-standing-"+e.standing,title:e.standingReason??"","data-dsh-tip":"","aria-label":e.standing==="verified"?"This review ran through the configured reviewer chain":"This review did not run on the chain it declared"},e.standing==="verified"?"\u2713":"\u26A0"):null,rn.default.createElement("span",{className:"aidos-evidence-strip-body"},t!==null?rn.default.createElement("span",{className:"aidos-evidence-strip-excerpt"},t):rn.default.createElement("span",{className:"aidos-evidence-strip-kind-name"},n.kind),rn.default.createElement("span",{className:"aidos-evidence-strip-meta"},n.author,i!==null?" \xB7 "+i:"",e.criterionLabel!==void 0?" \xB7 criterion: "+e.criterionLabel:null)),rn.default.createElement("span",{className:"aidos-evidence-strip-actions"},e.onView!==void 0?rn.default.createElement("button",{className:"aidos-icon-btn",title:"View evidence","data-dsh-tip":"","aria-label":"View evidence",onClick:o=>{o.stopPropagation(),e.onView?.(n)}},rn.default.createElement(mt,null)):null,e.onUnlink!==void 0?rn.default.createElement("button",{className:"aidos-evidence-unlink",title:"Unlink from criterion","data-dsh-tip":"","aria-label":"Unlink from criterion",disabled:e.deleting===!0,onClick:o=>{o.stopPropagation(),e.onUnlink?.()}},"\u2A02"):null,e.onDelete!==void 0?rn.default.createElement("button",{className:"aidos-evidence-delete",title:"Delete this evidence row","data-dsh-tip":"","aria-label":"Delete this evidence row",disabled:e.deleting===!0,onClick:o=>{o.stopPropagation(),e.onDelete?.(n)}},"\u2715"):null)))}function wo(e){let n=(e.payload??{}).criteria;if(typeof n!="string")return null;let t=n.trim();return t===""?null:t}function Yu(e,n){return e.filter(t=>wo(t)===n)}function Zu(e){return e.filter(n=>wo(n)===null)}function Ju(e){e instanceof J?_(e.message,"refusal"):_(String(e),"refusal")}function yo(e){let[n,t]=Ze.default.useState(null),[i,o]=Ze.default.useState(null),[r,s]=Ze.default.useState({}),a=Zu(e.evidence);async function l(d,c){if(n===null){t(d.at??0);try{await z("userLinkEvidence",{ticketId:e.ticketIdKey,at:d.at,rowKind:d.kind,criterion:c},e.agentId),_(c===null?"Evidence unlinked":"Evidence linked to criterion","success"),e.onChanged()}catch(f){Ju(f)}finally{t(null)}}}return Ze.default.createElement("div",{className:"aidos-criterion-blocks"},i===null?null:Ze.default.createElement(bt,{row:i,onClose:()=>{o(null)}}),e.criteria.map(d=>{let c=Yu(e.evidence,d),f=a.filter(h=>!c.includes(h)),p=r[d]??"";return Ze.default.createElement("div",{className:"aidos-criterion-block",key:d},Ze.default.createElement("div",{className:"aidos-criterion-label"},d),c.length>0?Ze.default.createElement("ul",{className:"aidos-criterion-evidence"},c.map(h=>Ze.default.createElement(En,{key:String(h.at)+":"+h.kind,row:h,onView:o,deleting:n===h.at,onUnlink:e.readOnly?void 0:()=>{l(h,null)}}))):Ze.default.createElement("p",{className:"aidos-detail-note"},"No evidence linked."),!e.readOnly&&f.length>0?Ze.default.createElement("div",{className:"aidos-criterion-linker"},Ze.default.createElement("select",{value:p,onChange:h=>{s({...r,[d]:h.target.value})},"aria-label":"Evidence to link to criterion "+d},Ze.default.createElement("option",{value:""},"Link an evidence row\u2026"),f.map(h=>Ze.default.createElement("option",{key:String(h.at)+":"+h.kind,value:String(h.at)+":"+h.kind},Xu(h)))),Ze.default.createElement("button",{className:"aidos-btn",disabled:p===""||n!==null,onClick:()=>{let h=f.find(y=>String(y.at)+":"+y.kind===p);h&&l(h,d)}},"Add")):null)}))}function Xu(e){let n=ep(e),t=e.kind.replace(/^builtin:/,"");return n!==null?t+" \u2014 "+n:t}function ep(e){let n=e.payload??{};if(typeof n.note=="string"&&n.note.trim()!==""){let t=n.note.trim();return t.length>48?t.slice(0,48)+"\u2026":t}return Array.isArray(n.paths)&&n.paths.length>0?n.paths.length+" path(s)":typeof n.claimed_state=="string"?n.claimed_state:typeof n.commit=="string"?n.commit.slice(0,12):typeof n.imagePath=="string"?"screenshot":null}function gl(e,n){(n==null||n>e.length)&&(n=e.length);for(var t=0,i=Array(n);t<n;t++)i[t]=e[t];return i}function np(e){if(Array.isArray(e))return e}function tp(e,n){var t=e==null?null:typeof Symbol<"u"&&e[Symbol.iterator]||e["@@iterator"];if(t!=null){var i,o,r,s,a=[],l=!0,d=!1;try{if(r=(t=t.call(e)).next,n!==0)for(;!(l=(i=r.call(t)).done)&&(a.push(i.value),a.length!==n);l=!0);}catch(c){d=!0,o=c}finally{try{if(!l&&t.return!=null&&(s=t.return(),Object(s)!==s))return}finally{if(d)throw o}}return a}}function ip(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function op(e,n){return np(e)||tp(e,n)||rp(e,n)||ip()}function rp(e,n){if(e){if(typeof e=="string")return gl(e,n);var t={}.toString.call(e).slice(8,-1);return t==="Object"&&e.constructor&&(t=e.constructor.name),t==="Map"||t==="Set"?Array.from(e):t==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t)?gl(e,n):void 0}}var _l=Object.entries,ml=Object.setPrototypeOf,ap=Object.isFrozen,sp=Object.getPrototypeOf,lp=Object.getOwnPropertyDescriptor,Ve=Object.freeze,We=Object.seal,pi=Object.create,Cl=typeof Reflect<"u"&&Reflect,Kr=Cl.apply,Fr=Cl.construct;Ve||(Ve=function(n){return n});We||(We=function(n){return n});Kr||(Kr=function(n,t){for(var i=arguments.length,o=new Array(i>2?i-2:0),r=2;r<i;r++)o[r-2]=arguments[r];return n.apply(t,o)});Fr||(Fr=function(n){for(var t=arguments.length,i=new Array(t>1?t-1:0),o=1;o<t;o++)i[o-1]=arguments[o];return new n(...i)});var $t=Fe(Array.prototype.forEach),dp=Fe(Array.prototype.lastIndexOf),bl=Fe(Array.prototype.pop),Bi=Fe(Array.prototype.push),cp=Fe(Array.prototype.splice),fi=Array.isArray,Fi=Fe(String.prototype.toLowerCase),Pr=Fe(String.prototype.toString),wl=Fe(String.prototype.match),zi=Fe(String.prototype.replace),yl=Fe(String.prototype.indexOf),up=Fe(String.prototype.trim),pp=Fe(Number.prototype.toString),fp=Fe(Boolean.prototype.toString),vl=typeof BigInt>"u"?null:Fe(BigInt.prototype.toString),kl=typeof Symbol>"u"?null:Fe(Symbol.prototype.toString),pn=Fe(Object.prototype.hasOwnProperty),Ki=Fe(Object.prototype.toString),Je=Fe(RegExp.prototype.test),Ft=hp(TypeError);function Fe(e){return function(n){n instanceof RegExp&&(n.lastIndex=0);for(var t=arguments.length,i=new Array(t>1?t-1:0),o=1;o<t;o++)i[o-1]=arguments[o];return Kr(e,n,i)}}function hp(e){return function(){for(var n=arguments.length,t=new Array(n),i=0;i<n;i++)t[i]=arguments[i];return Fr(e,t)}}function ue(e,n){let t=arguments.length>2&&arguments[2]!==void 0?arguments[2]:Fi;if(ml&&ml(e,null),!fi(n))return e;let i=n.length;for(;i--;){let o=n[i];if(typeof o=="string"){let r=t(o);r!==o&&(ap(n)||(n[i]=r),o=r)}e[o]=!0}return e}function gp(e){for(let n=0;n<e.length;n++)pn(e,n)||(e[n]=null);return e}function kn(e){let n=pi(null);for(let i of _l(e)){var t=op(i,2);let o=t[0],r=t[1];pn(e,o)&&(fi(r)?n[o]=gp(r):r&&typeof r=="object"&&r.constructor===Object?n[o]=kn(r):n[o]=r)}return n}function mp(e){switch(typeof e){case"string":return e;case"number":return pp(e);case"boolean":return fp(e);case"bigint":return vl?vl(e):"0";case"symbol":return kl?kl(e):"Symbol()";case"undefined":return Ki(e);case"function":case"object":{if(e===null)return Ki(e);let n=e,t=Rn(n,"toString");if(typeof t=="function"){let i=t(n);return typeof i=="string"?i:Ki(i)}return Ki(e)}default:return Ki(e)}}function Rn(e,n){for(;e!==null;){let i=lp(e,n);if(i){if(i.get)return Fe(i.get);if(typeof i.value=="function")return Fe(i.value)}e=sp(e)}function t(){return null}return t}function bp(e){try{return Je(e,""),!0}catch{return!1}}var xl=Ve(["a","abbr","acronym","address","area","article","aside","audio","b","bdi","bdo","big","blink","blockquote","body","br","button","canvas","caption","center","cite","code","col","colgroup","content","data","datalist","dd","decorator","del","details","dfn","dialog","dir","div","dl","dt","element","em","fieldset","figcaption","figure","font","footer","form","h1","h2","h3","h4","h5","h6","head","header","hgroup","hr","html","i","img","input","ins","kbd","label","legend","li","main","map","mark","marquee","menu","menuitem","meter","nav","nobr","ol","optgroup","option","output","p","picture","pre","progress","q","rp","rt","ruby","s","samp","search","section","select","shadow","slot","small","source","spacer","span","strike","strong","style","sub","summary","sup","table","tbody","td","template","textarea","tfoot","th","thead","time","tr","track","tt","u","ul","var","video","wbr"]),Mr=Ve(["svg","a","altglyph","altglyphdef","altglyphitem","animatecolor","animatemotion","animatetransform","circle","clippath","defs","desc","ellipse","enterkeyhint","exportparts","filter","font","g","glyph","glyphref","hkern","image","inputmode","line","lineargradient","marker","mask","metadata","mpath","part","path","pattern","polygon","polyline","radialgradient","rect","stop","style","switch","symbol","text","textpath","title","tref","tspan","view","vkern"]),Lr=Ve(["feBlend","feColorMatrix","feComponentTransfer","feComposite","feConvolveMatrix","feDiffuseLighting","feDisplacementMap","feDistantLight","feDropShadow","feFlood","feFuncA","feFuncB","feFuncG","feFuncR","feGaussianBlur","feImage","feMerge","feMergeNode","feMorphology","feOffset","fePointLight","feSpecularLighting","feSpotLight","feTile","feTurbulence"]),wp=Ve(["animate","color-profile","cursor","discard","font-face","font-face-format","font-face-name","font-face-src","font-face-uri","foreignobject","hatch","hatchpath","mesh","meshgradient","meshpatch","meshrow","missing-glyph","script","set","solidcolor","unknown","use"]),Dr=Ve(["math","menclose","merror","mfenced","mfrac","mglyph","mi","mlabeledtr","mmultiscripts","mn","mo","mover","mpadded","mphantom","mroot","mrow","ms","mspace","msqrt","mstyle","msub","msup","msubsup","mtable","mtd","mtext","mtr","munder","munderover","mprescripts"]),yp=Ve(["maction","maligngroup","malignmark","mlongdiv","mscarries","mscarry","msgroup","mstack","msline","msrow","semantics","annotation","annotation-xml","mprescripts","none"]),Sl=Ve(["#text"]),Tl=Ve(["accept","action","align","alt","autocapitalize","autocomplete","autopictureinpicture","autoplay","background","bgcolor","border","capture","cellpadding","cellspacing","checked","cite","class","clear","color","cols","colspan","command","commandfor","controls","controlslist","coords","crossorigin","datetime","decoding","default","dir","disabled","disablepictureinpicture","disableremoteplayback","download","draggable","enctype","enterkeyhint","exportparts","face","for","headers","height","hidden","high","href","hreflang","id","inert","inputmode","integrity","ismap","kind","label","lang","list","loading","loop","low","max","maxlength","media","method","min","minlength","multiple","muted","name","nonce","noshade","novalidate","nowrap","open","optimum","part","pattern","placeholder","playsinline","popover","popovertarget","popovertargetaction","poster","preload","pubdate","radiogroup","readonly","rel","required","rev","reversed","role","rows","rowspan","spellcheck","scope","selected","shape","size","sizes","slot","span","srclang","start","src","srcset","step","style","summary","tabindex","title","translate","type","usemap","valign","value","width","wrap","xmlns"]),Br=Ve(["accent-height","accumulate","additive","alignment-baseline","amplitude","ascent","attributename","attributetype","azimuth","basefrequency","baseline-shift","begin","bias","by","class","clip","clippathunits","clip-path","clip-rule","color","color-interpolation","color-interpolation-filters","color-profile","color-rendering","cx","cy","d","dx","dy","diffuseconstant","direction","display","divisor","dominant-baseline","dur","edgemode","elevation","end","exponent","fill","fill-opacity","fill-rule","filter","filterunits","flood-color","flood-opacity","font-family","font-size","font-size-adjust","font-stretch","font-style","font-variant","font-weight","fx","fy","g1","g2","glyph-name","glyphref","gradientunits","gradienttransform","height","href","id","image-rendering","in","in2","intercept","k","k1","k2","k3","k4","kerning","keypoints","keysplines","keytimes","lang","lengthadjust","letter-spacing","kernelmatrix","kernelunitlength","lighting-color","local","marker-end","marker-mid","marker-start","markerheight","markerunits","markerwidth","maskcontentunits","maskunits","max","mask","mask-type","media","method","mode","min","name","numoctaves","offset","operator","opacity","order","orient","orientation","origin","overflow","paint-order","path","pathlength","patterncontentunits","patterntransform","patternunits","pointer-events","points","preservealpha","preserveaspectratio","primitiveunits","r","rx","ry","radius","refx","refy","repeatcount","repeatdur","restart","result","rotate","scale","seed","shape-rendering","slope","specularconstant","specularexponent","spreadmethod","startoffset","stddeviation","stitchtiles","stop-color","stop-opacity","stroke-dasharray","stroke-dashoffset","stroke-linecap","stroke-linejoin","stroke-miterlimit","stroke-opacity","stroke","stroke-width","style","surfacescale","systemlanguage","tabindex","tablevalues","targetx","targety","transform","transform-origin","text-anchor","text-decoration","text-orientation","text-rendering","textlength","type","u1","u2","unicode","values","vector-effect","viewbox","visibility","version","vert-adv-y","vert-origin-x","vert-origin-y","width","word-spacing","wrap","writing-mode","xchannelselector","ychannelselector","x","x1","x2","xmlns","y","y1","y2","z","zoomandpan"]),El=Ve(["accent","accentunder","align","bevelled","close","columnalign","columnlines","columnspacing","columnspan","denomalign","depth","dir","display","displaystyle","encoding","fence","frame","height","href","id","largeop","length","linethickness","lquote","lspace","mathbackground","mathcolor","mathsize","mathvariant","maxsize","minsize","movablelimits","notation","numalign","open","rowalign","rowlines","rowspacing","rowspan","rspace","rquote","scriptlevel","scriptminsize","scriptsizemultiplier","selection","separator","separators","stretchy","subscriptshift","supscriptshift","symmetric","voffset","width","xmlns"]),vo=Ve(["xlink:href","xml:id","xlink:title","xml:space","xmlns:xlink"]),vp=We(/{{[\w\W]*|^[\w\W]*}}/g),kp=We(/<%[\w\W]*|^[\w\W]*%>/g),xp=We(/\${[\w\W]*/g),Sp=We(/^data-[\-\w.\u00B7-\uFFFF]+$/),Tp=We(/^aria-[\-\w]+$/),Rl=We(/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i),Ep=We(/^(?:\w+script|data):/i),Rp=We(/[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g),Ap=We(/^html$/i),Ip=We(/^[a-z][.\w]*(-[.\w]+)+$/i),Al=We(/<[/\w!]/g),Il=We(/<[/\w]/g),Np=We(/<\/no(script|embed|frames)/i),_p=We(/\/>/i),vn={element:1,attribute:2,text:3,cdataSection:4,entityReference:5,entityNode:6,processingInstruction:7,comment:8,document:9,documentType:10,documentFragment:11,notation:12},Ol=["style","script","xmp","iframe","noembed","noframes","plaintext","noscript"],Cp=Ve(ue({},Ol)),Op=(function(){let e={};return $t(Ol,n=>{e[n]=We(new RegExp("</"+n+"(?=[\\t\\n\\f\\r />])","i"))}),Ve(e)})(),Pp=function(){return typeof window>"u"?null:window},Mp=function(n,t){if(typeof n!="object"||typeof n.createPolicy!="function")return null;let i=null,o="data-tt-policy-suffix";t&&t.hasAttribute(o)&&(i=t.getAttribute(o));let r="dompurify"+(i?"#"+i:"");try{return n.createPolicy(r,{createHTML(s){return s},createScriptURL(s){return s}})}catch{return console.warn("TrustedTypes policy "+r+" could not be created."),null}},Nl=function(){return{afterSanitizeAttributes:[],afterSanitizeElements:[],afterSanitizeShadowDOM:[],beforeSanitizeAttributes:[],beforeSanitizeElements:[],beforeSanitizeShadowDOM:[],uponSanitizeAttribute:[],uponSanitizeElement:[],uponSanitizeShadowNode:[]}},wt=function(n,t,i,o){return pn(n,t)&&fi(n[t])?ue(o.base?kn(o.base):{},n[t],o.transform):i},zr=function(n,t,i){let o=pn(n,t)?n[t]:void 0;return o&&typeof o=="object"?kn(o):i()};function Pl(){let e=arguments.length>0&&arguments[0]!==void 0?arguments[0]:Pp(),n=C=>Pl(C);if(n.version="3.4.15",n.removed=[],!e||!e.document||e.document.nodeType!==vn.document||!e.Element)return n.isSupported=!1,n;let t=e.document,i=t,o=i.currentScript;e.DocumentFragment;let r=e.HTMLTemplateElement,s=e.Node,a=e.Element,l=e.NodeFilter,d=e.NamedNodeMap;d===void 0&&(e.NamedNodeMap||e.MozNamedAttrMap),e.HTMLFormElement;let c=e.DOMParser,f=e.trustedTypes,p=a.prototype,h=Rn(p,"cloneNode"),y=Rn(p,"remove"),k=Rn(p,"removeAttributeNode"),I=Rn(p,"nextSibling"),v=Rn(p,"childNodes"),P=Rn(p,"parentNode"),F=Rn(p,"shadowRoot"),Q=Rn(p,"attributes"),A=s&&s.prototype?Rn(s.prototype,"nodeType"):null,j=s&&s.prototype?Rn(s.prototype,"nodeName"):null,se=s&&s.prototype?Rn(s.prototype,"ownerDocument"):null,T=function(u){return A?A(u):u.nodeType},Z=function(u){return j?j(u):u.nodeName};if(typeof r=="function"){let C=t.createElement("template");C.content&&C.content.ownerDocument&&(t=C.content.ownerDocument)}let pe,qe="",tn,sn=!1,Be=0,hn=function(){if(Be>0)throw Ft('A configured TRUSTED_TYPES_POLICY callback (createHTML or createScriptURL) must not call DOMPurify.sanitize, as that causes infinite recursion. Do not pass a policy whose callbacks wrap DOMPurify as TRUSTED_TYPES_POLICY; see the "DOMPurify and Trusted Types" section of the README.')},R=function(u){hn(),Be++;try{return pe.createHTML(u)}finally{Be--}},b=function(u){hn(),Be++;try{return pe.createScriptURL(u)}finally{Be--}},N=function(){return sn||(tn=Mp(f,o),sn=!0),tn},B=t,H=B.implementation,he=B.createNodeIterator,_e=B.createDocumentFragment,ze=B.getElementsByTagName,He=i.importNode,te=Nl();n.isSupported=typeof _l=="function"&&typeof P=="function"&&H&&H.createHTMLDocument!==void 0;let ot=vp,rt=kp,at=xp,Rt=Sp,At=Tp,Wt=Ep,Qt=Rp,Ln=Ip,It=Rl,re=null,Nt=ue({},[...xl,...Mr,...Lr,...Dr,...Sl]),ge=null,V=ue({},[...Tl,...Br,...El,...vo]),Ke=Object.seal(pi(null,{tagNameCheck:{writable:!0,configurable:!1,enumerable:!0,value:null},attributeNameCheck:{writable:!0,configurable:!1,enumerable:!0,value:null},allowCustomizedBuiltInElements:{writable:!0,configurable:!1,enumerable:!0,value:!1}})),Ae=null,fe=null,Ye=Object.seal(pi(null,{tagCheck:{writable:!0,configurable:!1,enumerable:!0,value:null},attributeCheck:{writable:!0,configurable:!1,enumerable:!0,value:null}})),gn=!0,Dn=!0,Gn=!1,O=!0,D=!1,G=!0,ie=!1,Oe=!1,Pe=null,Wn=null,An=!1,Me=!1,_t=!1,st=!1,Yt=!0,In=!1,lt="user-content-",Zt=!0,xi=!1,Bn={},dt=null,Wi=ue({},["annotation-xml","audio","colgroup","desc","foreignobject","head","iframe","math","mi","mn","mo","ms","mtext","noembed","noframes","noscript","plaintext","script","selectedcontent","style","svg","template","thead","title","video","xmp"]),Si=null,Jt=ue({},["audio","video","img","source","image","track"]),Xt=null,Qi=ue({},["alt","class","for","id","label","name","pattern","placeholder","role","summary","title","value","style","xmlns"]),Nn="http://www.w3.org/1998/Math/MathML",_n="http://www.w3.org/2000/svg",Sn="http://www.w3.org/1999/xhtml",ct=Sn,Ti=!1,Qn=null,tr=ue({},[Nn,_n,Sn],Pr),Yi=Ve(["mi","mo","mn","ms","mtext"]),Ei=ue({},Yi),Zi=Ve(["annotation-xml"]),Ri=ue({},Zi),S=ue({},["title","style","font","a","script"]),U=null,xe=["application/xhtml+xml","text/html"],Ct="text/html",me=null,Yn=null,Ji=t.createElement("form"),Ot=function(u){return u instanceof RegExp||u instanceof Function},Ai=function(){let u=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{};if(Yn&&Yn===u)return;(!u||typeof u!="object")&&(u={}),u=kn(u),U=xe.indexOf(u.PARSER_MEDIA_TYPE)===-1?Ct:u.PARSER_MEDIA_TYPE,me=U==="application/xhtml+xml"?Pr:Fi,re=wt(u,"ALLOWED_TAGS",Nt,{transform:me}),ge=wt(u,"ALLOWED_ATTR",V,{transform:me}),Qn=wt(u,"ALLOWED_NAMESPACES",tr,{transform:Pr}),Xt=wt(u,"ADD_URI_SAFE_ATTR",Qi,{transform:me,base:Qi}),Si=wt(u,"ADD_DATA_URI_TAGS",Jt,{transform:me,base:Jt}),dt=wt(u,"FORBID_CONTENTS",Wi,{transform:me}),Ae=wt(u,"FORBID_TAGS",kn({}),{transform:me}),fe=wt(u,"FORBID_ATTR",kn({}),{transform:me}),Bn=pn(u,"USE_PROFILES")?u.USE_PROFILES&&typeof u.USE_PROFILES=="object"?kn(u.USE_PROFILES):u.USE_PROFILES:!1,gn=u.ALLOW_ARIA_ATTR!==!1,Dn=u.ALLOW_DATA_ATTR!==!1,Gn=u.ALLOW_UNKNOWN_PROTOCOLS||!1,O=u.ALLOW_SELF_CLOSE_IN_ATTR!==!1,D=u.SAFE_FOR_TEMPLATES||!1,G=u.SAFE_FOR_XML!==!1,ie=u.WHOLE_DOCUMENT||!1,Me=u.RETURN_DOM||!1,_t=u.RETURN_DOM_FRAGMENT||!1,st=u.RETURN_TRUSTED_TYPE||!1,An=u.FORCE_BODY||!1,Yt=u.SANITIZE_DOM!==!1,In=u.SANITIZE_NAMED_PROPS||!1,Zt=u.KEEP_CONTENT!==!1,xi=u.IN_PLACE||!1,It=bp(u.ALLOWED_URI_REGEXP)?u.ALLOWED_URI_REGEXP:Rl,ct=typeof u.NAMESPACE=="string"?u.NAMESPACE:Sn,Ei=zr(u,"MATHML_TEXT_INTEGRATION_POINTS",()=>ue({},Yi)),Ri=zr(u,"HTML_INTEGRATION_POINTS",()=>ue({},Zi));let g=zr(u,"CUSTOM_ELEMENT_HANDLING",()=>pi(null));if(Ke=pi(null),pn(g,"tagNameCheck")&&Ot(g.tagNameCheck)&&(Ke.tagNameCheck=g.tagNameCheck),pn(g,"attributeNameCheck")&&Ot(g.attributeNameCheck)&&(Ke.attributeNameCheck=g.attributeNameCheck),pn(g,"allowCustomizedBuiltInElements")&&typeof g.allowCustomizedBuiltInElements=="boolean"&&(Ke.allowCustomizedBuiltInElements=g.allowCustomizedBuiltInElements),We(Ke),D&&(Dn=!1),_t&&(Me=!0),Bn&&(re=ue({},Sl),ge=pi(null),Bn.html===!0&&(ue(re,xl),ue(ge,Tl)),Bn.svg===!0&&(ue(re,Mr),ue(ge,Br),ue(ge,vo)),Bn.svgFilters===!0&&(ue(re,Lr),ue(ge,Br),ue(ge,vo)),Bn.mathMl===!0&&(ue(re,Dr),ue(ge,El),ue(ge,vo))),Ye.tagCheck=null,Ye.attributeCheck=null,pn(u,"ADD_TAGS")&&(typeof u.ADD_TAGS=="function"?Ye.tagCheck=u.ADD_TAGS:fi(u.ADD_TAGS)&&(re===Nt&&(re=kn(re)),ue(re,u.ADD_TAGS,me))),pn(u,"ADD_ATTR")&&(typeof u.ADD_ATTR=="function"?Ye.attributeCheck=u.ADD_ATTR:fi(u.ADD_ATTR)&&(ge===V&&(ge=kn(ge)),ue(ge,u.ADD_ATTR,me))),pn(u,"ADD_FORBID_CONTENTS")&&fi(u.ADD_FORBID_CONTENTS)&&(dt===Wi&&(dt=kn(dt)),ue(dt,u.ADD_FORBID_CONTENTS,me)),Zt&&(re["#text"]=!0),ie&&ue(re,["html","head","body"]),re.table&&(ue(re,["tbody"]),delete Ae.tbody),u.TRUSTED_TYPES_POLICY){if(typeof u.TRUSTED_TYPES_POLICY.createHTML!="function")throw Ft('TRUSTED_TYPES_POLICY configuration option must provide a "createHTML" hook.');if(typeof u.TRUSTED_TYPES_POLICY.createScriptURL!="function")throw Ft('TRUSTED_TYPES_POLICY configuration option must provide a "createScriptURL" hook.');let E=pe;pe=u.TRUSTED_TYPES_POLICY;try{qe=R("")}catch(L){throw pe=E,L}}else u.TRUSTED_TYPES_POLICY===null?(pe=void 0,qe=""):(pe===void 0&&(pe=N()),pe&&typeof qe=="string"&&(qe=R("")));Ve&&Ve(u),Yn=u},ma=ue({},[...Mr,...Lr,...wp]),ba=ue({},[...Dr,...yp]),qc=function(u,g,E){return g.namespaceURI===Sn?u==="svg":g.namespaceURI===Nn?u==="svg"&&(E==="annotation-xml"||Ei[E]):!!ma[u]},Hc=function(u,g,E){return g.namespaceURI===Sn?u==="math":g.namespaceURI===_n?u==="math"&&Ri[E]:!!ba[u]},Gc=function(u,g,E){return g.namespaceURI===_n&&!Ri[E]||g.namespaceURI===Nn&&!Ei[E]?!1:!ba[u]&&(S[u]||!ma[u])},Wc=function(u){let g=P(u);(!g||!g.tagName)&&(g={namespaceURI:ct,tagName:"template"});let E=Fi(u.tagName),L=Fi(g.tagName);return Qn[u.namespaceURI]?u.namespaceURI===_n?qc(E,g,L):u.namespaceURI===Nn?Hc(E,g,L):u.namespaceURI===Sn?Gc(E,g,L):!!(U==="application/xhtml+xml"&&Qn[u.namespaceURI]):!1},ut=function(u){Bi(n.removed,{element:u});try{P(u).removeChild(u)}catch{if(y(u),!P(u))throw Ft("a node selected for removal could not be detached from its tree and cannot be safely returned; refusing to sanitize in place")}},wa=function(u,g,E){try{k(u,g)}catch{try{u.removeAttribute(E)}catch{}}},Xi=function(u){eo(u);let g=v(u);if(g){let L=[];$t(g,$=>{Bi(L,$)}),$t(L,$=>{try{y($)}catch{}})}let E=Q(u);if(E)for(let L=E.length-1;L>=0;--L){let $=E[L],Y=$&&$.name;typeof Y=="string"&&wa(u,$,Y)}},Pt=function(u,g,E){if(!E)try{E=g.getAttributeNode(u)}catch{E=null}Bi(n.removed,{attribute:E||null,from:g});try{E?k(g,E):g.removeAttribute(u)}catch{try{g.removeAttribute(u)}catch{}}if(u==="is")if(Me||_t)try{ut(g)}catch{}else try{g.setAttribute(u,"")}catch{}},Qc=function(u){let g=Q(u);if(g)for(let E=g.length-1;E>=0;--E){let L=g[E],$=L&&L.name;typeof $!="string"||ge[me($)]||wa(u,L,$)}},eo=function(u){let g=[u];for(;g.length>0;){let E=g.pop();T(E)===vn.element&&Qc(E);let $=v(E);if($)for(let Y=$.length-1;Y>=0;--Y)g.push($[Y])}},ya=function(u,g){return G?u==="patchsrc"?!0:u==="for"&&g!=="label"&&g!=="output":!1},Yc=function(u){if(!G)return;let g=[u];for(;g.length>0;){let E=g.pop(),L=T(E);if(L===vn.processingInstruction||L===vn.comment&&Je(Il,E.data)){try{y(E)}catch{}continue}if(L===vn.element){let Y=E,Te=me(Z(E));try{Y.hasAttribute&&Y.hasAttribute("patchsrc")&&Y.removeAttribute("patchsrc"),Y.hasAttribute&&Y.hasAttribute("for")&&ya("for",Te)&&Y.removeAttribute("for")}catch{}}let $=v(E);if($)for(let Y=$.length-1;Y>=0;--Y)g.push($[Y])}},va=function(u){let g=null,E=null;if(An)u="<remove></remove>"+u;else{let Y=wl(u,/^[\r\n\t ]+/);E=Y&&Y[0]}U==="application/xhtml+xml"&&ct===Sn&&(u='<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>'+u+"</body></html>");let L=pe?R(u):u;if(ct===Sn)try{g=new c().parseFromString(L,U)}catch{}if(!g||!g.documentElement){g=H.createDocument(ct,"template",null);try{g.documentElement.innerHTML=Ti?qe:L}catch{}}let $=g.body||g.documentElement;return u&&E&&$.insertBefore(t.createTextNode(E),$.childNodes[0]||null),ct===Sn?ze.call(g,ie?"html":"body")[0]:ie?g.documentElement:$},ka=function(u){let g=se?se(u):u.ownerDocument;return he.call(g||u,u,l.SHOW_ELEMENT|l.SHOW_COMMENT|l.SHOW_TEXT|l.SHOW_PROCESSING_INSTRUCTION|l.SHOW_CDATA_SECTION,null)},no=function(u){return u=zi(u,ot," "),u=zi(u,rt," "),u=zi(u,at," "),u},ir=function(u){var g;u.normalize();let E=se?se(u):u.ownerDocument,L=he.call(E||u,u,l.SHOW_TEXT|l.SHOW_COMMENT|l.SHOW_CDATA_SECTION|l.SHOW_PROCESSING_INSTRUCTION,null),$=L.nextNode();for(;$;)$.data=no($.data),$=L.nextNode();let Y=(g=u.querySelectorAll)===null||g===void 0?void 0:g.call(u,"template");Y&&$t(Y,Te=>{ei(Te.content)&&ir(Te.content)})},to=function(u){let g=j?j(u):null;return typeof g!="string"||me(g)!=="form"?!1:typeof u.nodeName!="string"||typeof u.textContent!="string"||typeof u.removeChild!="function"||u.attributes!==Q(u)||typeof u.removeAttribute!="function"||typeof u.removeAttributeNode!="function"||typeof u.getAttributeNode!="function"||typeof u.setAttribute!="function"||typeof u.namespaceURI!="string"||typeof u.insertBefore!="function"||typeof u.hasChildNodes!="function"||u.nodeType!==A(u)||u.childNodes!==v(u)},ei=function(u){if(!A||typeof u!="object"||u===null)return!1;try{return A(u)===vn.documentFragment}catch{return!1}},Ii=function(u){if(!A||typeof u!="object"||u===null)return!1;try{return typeof A(u)=="number"}catch{return!1}};function zn(C,u,g){C.length!==0&&$t(C,E=>{E.call(n,u,g,Yn)})}let Zc=function(u,g){return!!(G&&u.hasChildNodes()&&!Ii(u.firstElementChild)&&Je(Al,u.textContent)&&Je(Al,u.innerHTML)||G&&u.namespaceURI===Sn&&Cp[g]&&(Ii(u.firstElementChild)||typeof u.textContent=="string"&&Je(Op[g],u.textContent))||u.nodeType===vn.processingInstruction||G&&u.nodeType===vn.comment&&Je(Il,u.data))},io=function(u,g){if(u instanceof RegExp)return Je(u,g);if(u instanceof Function){for(var E=arguments.length,L=new Array(E>2?E-2:0),$=2;$<E;$++)L[$-2]=arguments[$];return!!u(g,...L)}return!1},Jc=function(u,g,E){if(!Ae[g]&&Ra(g)&&io(Ke.tagNameCheck,g))return!1;if(Zt&&!dt[g]){let L=P(u),$=v(u);if($&&L){let Y=$.length;for(let Te=Y-1;Te>=0;--Te){let Ce=u===E?h($[Te],!0):$[Te];L.insertBefore(Ce,I(u))}}}return ut(u),!0},xa=function(u,g,E,L){return u.length===0?g:g===E||g===L?kn(g):g},Sa=function(u,g){return u===g||P(u)!==null?!1:(xi&&eo(u),!0)},Ta=function(u,g){if(zn(te.beforeSanitizeElements,u,null),Sa(u,g))return!0;if(to(u))return ut(u),!0;let E=me(Z(u));if(re=xa(te.uponSanitizeElement,re,Nt,Pe),zn(te.uponSanitizeElement,u,{tagName:E,allowedTags:re}),Sa(u,g))return!0;if(Zc(u,E))return ut(u),!0;if(Ae[E]||!(Ye.tagCheck instanceof Function&&Ye.tagCheck(E))&&!re[E]){let $=Jc(u,E,g);return $===!1&&zn(te.afterSanitizeElements,u,null),$}if(T(u)===vn.element&&!Wc(u)||(E==="noscript"||E==="noembed"||E==="noframes")&&Je(Np,u.innerHTML))return ut(u),!0;if(D&&u.nodeType===vn.text){let $=no(u.textContent);u.textContent!==$&&(Bi(n.removed,{element:u.cloneNode()}),u.textContent=$)}return zn(te.afterSanitizeElements,u,null),!1},Ea=function(u,g,E){if(fe[g]||ya(g,u)||Yt&&(g==="id"||g==="name")&&(E in t||E in Ji))return!1;let L=ge[g]||Ye.attributeCheck instanceof Function&&Ye.attributeCheck(g,u);return Dn&&Je(Rt,g)||gn&&Je(At,g)?!0:L?Xt[g]||Je(It,zi(E,Qt,""))||(g==="src"||g==="xlink:href"||g==="href")&&u!=="script"&&yl(E,"data:")===0&&Si[u]||Gn&&!Je(Wt,zi(E,Qt,""))?!0:!E:Ra(u)&&io(Ke.tagNameCheck,u)&&io(Ke.attributeNameCheck,g,u)||g==="is"&&Ke.allowCustomizedBuiltInElements&&io(Ke.tagNameCheck,E)},Xc=ue({},["annotation-xml","color-profile","font-face","font-face-format","font-face-name","font-face-src","font-face-uri","missing-glyph"]),Ra=function(u){return!Xc[Fi(u)]&&Je(Ln,u)},eu=function(u,g,E,L){if(pe&&typeof f=="object"&&typeof f.getAttributeType=="function"&&!E)switch(f.getAttributeType(u,g)){case"TrustedHTML":return R(L);case"TrustedScriptURL":return b(L)}return L},nu=function(u,g,E,L){try{return E?u.setAttributeNS(E,g,L):u.setAttribute(g,L),to(u)?(ut(u),!1):!0}catch{return Pt(g,u),!1}},Aa=function(u){zn(te.beforeSanitizeAttributes,u,null);let g=u.attributes;if(!g||to(u))return;ge=xa(te.uponSanitizeAttribute,ge,V,Wn);let E={attrName:"",attrValue:"",keepAttr:!0,allowedAttributes:ge,forceKeepAttr:void 0},L=g.length,$=me(u.nodeName);for(;L--;){let Y=g[L],Te=Y.name,Ce=Y.namespaceURI,ln=Y.value,dn=me(Te),rr=ln,on=Te==="value"?rr:up(rr),Ia=!1;if(E.attrName=dn,E.attrValue=on,E.keepAttr=!0,E.forceKeepAttr=void 0,zn(te.uponSanitizeAttribute,u,E),on=E.attrValue,In&&(dn==="id"||dn==="name")&&yl(on,lt)!==0&&(Pt(Te,u,Y),on=lt+on,Ia=!0),G&&Je(/((--!?|])>)|<\/(style|script|title|xmp|textarea|noscript|iframe|noembed|noframes)/i,on)){Pt(Te,u,Y);continue}if(dn==="attributename"&&wl(on,"href")){Pt(Te,u,Y);continue}if(!E.forceKeepAttr){if(!E.keepAttr){Pt(Te,u,Y);continue}if(!O&&Je(_p,on)){Pt(Te,u,Y);continue}if(D&&(on=no(on)),!Ea($,dn,on)){Pt(Te,u,Y);continue}on=eu($,dn,Ce,on),on!==rr&&nu(u,Te,Ce,on)&&Ia&&bl(n.removed)}}zn(te.afterSanitizeAttributes,u,null)},oo=function(u){let g=null,E=ka(u);for(zn(te.beforeSanitizeShadowDOM,u,null);g=E.nextNode();)if(zn(te.uponSanitizeShadowNode,g,null),Ta(g,u),Aa(g),ei(g.content)&&oo(g.content),T(g)===vn.element){let L=F(g);ei(L)&&(or(L),oo(L))}zn(te.afterSanitizeShadowDOM,u,null)},or=function(u){let g=[{node:u,shadow:null}];for(;g.length>0;){let E=g.pop();if(E.shadow){oo(E.shadow);continue}let L=E.node,Y=T(L)===vn.element,Te=v(L);if(Te)for(let Ce=Te.length-1;Ce>=0;--Ce)g.push({node:Te[Ce],shadow:null});if(Y){let Ce=j?j(L):null;if(typeof Ce=="string"&&me(Ce)==="template"){let ln=L.content;ei(ln)&&g.push({node:ln,shadow:null})}}if(Y){let Ce=F(L);ei(Ce)&&g.push({node:null,shadow:Ce},{node:Ce,shadow:null})}}};return n.sanitize=function(C){let u=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},g=null,E=null,L=null,$=null;if(Ti=!C,Ti&&(C="<!-->"),typeof C!="string"&&!Ii(C)&&(C=mp(C),typeof C!="string"))throw Ft("dirty is not a string, aborting");if(!n.isSupported)return C;Oe?(re=Pe,ge=Wn):Ai(u),(te.uponSanitizeElement.length>0||te.uponSanitizeAttribute.length>0)&&(re=kn(re)),te.uponSanitizeAttribute.length>0&&(ge=kn(ge)),n.removed=[];let Y=xi&&typeof C!="string"&&Ii(C);if(Y){Yc(C);let ln=Z(C);if(typeof ln=="string"){let dn=me(ln);if(!re[dn]||Ae[dn])throw Xi(C),Ft("root node is forbidden and cannot be sanitized in-place")}if(to(C))throw Xi(C),Ft("root node is clobbered and cannot be sanitized in-place");try{or(C)}catch(dn){throw Xi(C),dn}}else if(Ii(C))g=va("<!---->"),E=g.ownerDocument.importNode(C,!0),E.nodeType===vn.element&&E.nodeName==="BODY"||E.nodeName==="HTML"?g=E:g.appendChild(E),or(g);else{if(!Me&&!D&&!ie&&C.indexOf("<")===-1)return pe&&st?R(C):C;if(g=va(C),!g)return Me?null:st?qe:""}g&&An&&ut(g.firstChild);let Te=Y?C:g;try{let ln=ka(Te);for(;L=ln.nextNode();)Ta(L,Te),Aa(L),ei(L.content)&&oo(L.content)}catch(ln){throw Y&&(Xi(C),$t(n.removed,dn=>{dn.element&&eo(dn.element)})),ln}if(Y)return $t(n.removed,ln=>{ln.element&&eo(ln.element)}),D&&ir(C),C;if(Me){if(D&&ir(g),_t)for($=_e.call(g.ownerDocument);g.firstChild;)$.appendChild(g.firstChild);else $=g;return(ge.shadowroot||ge.shadowrootmode)&&($=He.call(i,$,!0)),$}let Ce=ie?g.outerHTML:g.innerHTML;return ie&&re["!doctype"]&&g.ownerDocument&&g.ownerDocument.doctype&&g.ownerDocument.doctype.name&&Je(Ap,g.ownerDocument.doctype.name)&&(Ce="<!DOCTYPE "+g.ownerDocument.doctype.name+`>
`+Ce),D&&(Ce=no(Ce)),pe&&st?R(Ce):Ce},n.setConfig=function(){let C=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{};Ai(C),Oe=!0,Pe=re,Wn=ge},n.clearConfig=function(){Yn=null,Oe=!1,Pe=null,Wn=null,pe=tn,qe=""},n.isValidAttribute=function(C,u,g){Yn||Ai({});let E=me(C),L=me(u);return Ea(E,L,g)},n.addHook=function(C,u){typeof u=="function"&&pn(te,C)&&Bi(te[C],u)},n.removeHook=function(C,u){if(pn(te,C)){if(u!==void 0){let g=dp(te[C],u);return g===-1?void 0:cp(te[C],g,1)[0]}return bl(te[C])}},n.removeHooks=function(C){pn(te,C)&&(te[C]=[])},n.removeAllHooks=function(){te=Nl()},n}var Ml=Pl();function Vr(){return{async:!1,breaks:!1,extensions:null,gfm:!0,hooks:null,pedantic:!1,renderer:null,silent:!1,tokenizer:null,walkTokens:null}}var Vt=Vr();function jl(e){Vt=e}var jt={exec:()=>null};function hi(e){let n=[];return t=>{let i=Math.max(0,Math.min(3,t-1)),o=n[i];return o||(o=e(i),n[i]=o),o}}function ae(e,n=""){let t=typeof e=="string"?e:e.source,i={replace:(o,r)=>{let s=typeof r=="string"?r:r.source;return s=s.replace(Xe.caret,"$1"),t=t.replace(o,s),i},getRegex:()=>new RegExp(t,n)};return i}var Lp=((e="")=>{try{return!!new RegExp("(?<=1)(?<!1)"+e)}catch{return!1}})(),Xe={codeRemoveIndent:/^(?: {1,4}| {0,3}\t)/gm,outputLinkReplace:/\\([\[\]])/g,indentCodeCompensation:/^(\s+)(?:```)/,beginningSpace:/^\s+/,endingHash:/#$/,startingSpaceChar:/^ /,endingSpaceChar:/ $/,nonSpaceChar:/[^ ]/,newLineCharGlobal:/\n/g,tabCharGlobal:/\t/g,multipleSpaceGlobal:/\s+/g,blankLine:/^[ \t]*$/,doubleBlankLine:/\n[ \t]*\n[ \t]*$/,blockquoteStart:/^ {0,3}>/,blockquoteSetextReplace:/\n {0,3}((?:=+|-+) *)(?=\n|$)/g,blockquoteSetextReplace2:/^ {0,3}>[ \t]?/gm,listReplaceNesting:/^ {1,4}(?=( {4})*[^ ])/g,listIsTask:/^\[[ xX]\] +\S/,listReplaceTask:/^\[[ xX]\] +/,listTaskCheckbox:/\[[ xX]\]/,anyLine:/\n.*\n/,hrefBrackets:/^<(.*)>$/,tableDelimiter:/[:|]/,tableAlignChars:/^\||\| *$/g,tableRowBlankLine:/\n[ \t]*$/,tableAlignRight:/^ *-+: *$/,tableAlignCenter:/^ *:-+: *$/,tableAlignLeft:/^ *:-+ *$/,startATag:/^<a /i,endATag:/^<\/a>/i,startPreScriptTag:/^<(pre|code|kbd|script)(\s|>)/i,endPreScriptTag:/^<\/(pre|code|kbd|script)(\s|>)/i,startAngleBracket:/^</,endAngleBracket:/>$/,pedanticHrefTitle:/^([^'"]*[^\s])\s+(['"])(.*)\2/,unicodeAlphaNumeric:/[\p{L}\p{N}]/u,escapeTest:/[&<>"']/,escapeReplace:/[&<>"']/g,escapeTestNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,escapeReplaceNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,caret:/(^|[^\[])\^/g,percentDecode:/%25/g,findPipe:/\|/g,splitPipe:/ \|/,slashPipe:/\\\|/g,carriageReturn:/\r\n|\r/g,spaceLine:/^ +$/gm,notSpaceStart:/^\S*/,endingNewline:/\n$/,listItemRegex:e=>new RegExp(`^( {0,3}${e})((?:[	 ][^\\n]*)?(?:\\n|$))`),nextBulletRegex:hi(e=>new RegExp(`^ {0,${e}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`)),hrRegex:hi(e=>new RegExp(`^ {0,${e}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`)),fencesBeginRegex:hi(e=>new RegExp(`^ {0,${e}}(?:\`\`\`|~~~)`)),headingBeginRegex:hi(e=>new RegExp(`^ {0,${e}}#`)),htmlBeginRegex:hi(e=>new RegExp(`^ {0,${e}}<(?:[a-z].*>|!--)`,"i")),blockquoteBeginRegex:hi(e=>new RegExp(`^ {0,${e}}>`))},Dp=/^(?:[ \t]*(?:\n|$))+/,Bp=/^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/,zp=/^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/,Ui=/^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/,Kp=/^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,qr=/ {0,3}(?:[*+-]|\d{1,9}[.)])/,Ul=/^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/,Vl=ae(Ul).replace(/bull/g,qr).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}(?:\s|$)/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/\|table/g,"").getRegex(),Fp=ae(Ul).replace(/bull/g,qr).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}(?:\s|$)/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/table/g,/ {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex(),Hr=/^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table|[ \t]+\n)[^\n]+)*)/,$p=/^[^\n]+/,Gr=/(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/,jp=ae(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label",Gr).replace("title",/(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex(),Up=ae(/^(bull)([ \t][^\n]*?)?(?:\n|$)/).replace(/bull/g,qr).getRegex(),Eo="address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul",Wr=/<!--(?:-?>|[\s\S]*?(?:-->|$))/,Vp=ae("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n*|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>[^\\n]*\\n*|$)|<![A-Z][\\s\\S]*?(?:>[^\\n]*\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>[^\\n]*\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))","i").replace("comment",Wr).replace("tag",Eo).replace("attribute",/ +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex(),ql=e=>ae(Hr).replace("hr",Ui).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("|table","").replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list",e).replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",Eo).getRegex(),qp=ql(/ {0,3}(?:[*+-]|1[.)])[ \t]+[^ \t\n]/),Hp=ql(/ {0,3}(?:[*+-]|\d{1,9}[.)])(?:[ \t]|\n|$)/),Gp=ae(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph",Hp).getRegex(),Qr={blockquote:Gp,code:Bp,def:jp,fences:zp,heading:Kp,hr:Ui,html:Vp,lheading:Vl,list:Up,newline:Dp,paragraph:qp,table:jt,text:$p},Ll=ae("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr",Ui).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("blockquote"," {0,3}>").replace("code","(?: {4}| {0,3}	)[^\\n]").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list"," {0,3}(?:[*+-]|1[.)])[ \\t]").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",Eo).getRegex(),Wp={...Qr,lheading:Fp,table:Ll,paragraph:ae(Hr).replace("hr",Ui).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("table",Ll).replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list"," {0,3}(?:[*+-]|1[.)])[ \\t]+[^ \\t\\n]").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",Eo).getRegex()},Qp={...Qr,html:ae(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment",Wr).replace(/tag/g,"(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),def:/^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,heading:/^(#{1,6})(.*)(?:\n+|$)/,fences:jt,lheading:/^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,paragraph:ae(Hr).replace("hr",Ui).replace("heading",` *#{1,6} *[^
]`).replace("lheading",Vl).replace("|table","").replace("blockquote"," {0,3}>").replace("|fences","").replace("|list","").replace("|html","").replace("|tag","").getRegex()},Yp=/^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,Zp=/^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,Hl=/^( {2,}|\\)\n(?!\s*$)/,Jp=/^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/,nt=/[\p{P}\p{S}]/u,gi=/[\s\p{P}\p{S}]/u,Vi=/[^\s\p{P}\p{S}]/u,Xp=ae(/^((?![*_])punctSpace)/,"u").replace(/punctSpace/g,gi).getRegex(),ef=/[\p{Pi}\p{Ps}"']/u,Gl=/(?!~)[\p{P}\p{S}]/u,nf=/(?!~)[\s\p{P}\p{S}]/u,tf=/(?:[^\s\p{P}\p{S}]|~)/u,of=ae(/link|precode-code|html/,"g").replace("link",/\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-",Lp?"(?<!`)()":"(^^|[^`])").replace("code",/(?<b>`+)[^`]+\k<b>(?!`)/).replace("html",/<(?! )[^<>]*?>/).getRegex(),Wl=/^(?:\*+(?:((?!\*)punct)|([^\s*]))?)|^_+(?:((?!_)punct)|([^\s_]))?/,rf=ae(Wl,"u").replace(/punct/g,nt).getRegex(),af=ae(Wl,"u").replace(/punct/g,Gl).getRegex(),sf=/^(?:\*+(?:((?!\*)(?!openQuote)punct)|([^\s*]))?)|^_+(?:((?!_)(?!openQuote)punct)|([^\s_]))?/,lf=ae(sf,"u").replace(/openQuote/g,ef).replace(/punct/g,nt).getRegex(),Ql="^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)",df=ae(Ql,"gu").replace(/notPunctSpace/g,Vi).replace(/punctSpace/g,gi).replace(/punct/g,nt).getRegex(),cf=ae(Ql,"gu").replace(/notPunctSpace/g,tf).replace(/punctSpace/g,nf).replace(/punct/g,Gl).getRegex(),uf="^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)[\\s](\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|(?:(?!\\*)punct|notPunctSpace)(\\*+)(?!\\*)(?=notPunctSpace)",pf=ae(uf,"gu").replace(/notPunctSpace/g,Vi).replace(/punctSpace/g,gi).replace(/punct/g,nt).getRegex(),ff=ae("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)","gu").replace(/notPunctSpace/g,Vi).replace(/punctSpace/g,gi).replace(/punct/g,nt).getRegex(),hf="^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)[\\s](_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)|(?:(?!_)punct|notPunctSpace)(_+)(?!_)(?=notPunctSpace)",gf=ae(hf,"gu").replace(/notPunctSpace/g,Vi).replace(/punctSpace/g,gi).replace(/punct/g,nt).getRegex(),mf=ae(/^~~?(?:((?!~)punct)|[^\s~])/,"u").replace(/punct/g,nt).getRegex(),bf="^[^~]+(?=[^~])|(?!~)punct(~~?)(?=[\\s]|$)|notPunctSpace(~~?)(?!~)(?=punctSpace|$)|(?!~)punctSpace(~~?)(?=notPunctSpace)|[\\s](~~?)(?!~)(?=punct)|(?!~)punct(~~?)(?!~)(?=punct)|notPunctSpace(~~?)(?=notPunctSpace)",wf=ae(bf,"gu").replace(/notPunctSpace/g,Vi).replace(/punctSpace/g,gi).replace(/punct/g,nt).getRegex(),yf=ae(/\\(punct)/,"gu").replace(/punct/g,nt).getRegex(),vf=ae(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme",/[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email",/[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex(),kf=ae(Wr).replace("(?:-->|$)","-->").getRegex(),xf=ae("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment",kf).replace("attribute",/\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex(),xo=/(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\])|[^\[\]\\`])*?/,Sf=ae(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]+(?:\n[ \t]*)?|\n[ \t]*)(title))?\s*\)/).replace("label",xo).replace("href",/<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]+|(?=\))/).replace("title",/"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex(),Yl=ae(/^!?\[(label)\]\[(ref)\]/).replace("label",xo).replace("ref",Gr).getRegex(),Zl=ae(/^!?\[(ref)\](?:\[\])?/).replace("ref",Gr).getRegex(),Tf=ae("reflink|nolink(?!\\()","g").replace("reflink",Yl).replace("nolink",Zl).getRegex(),Dl=/[hH][tT][tT][pP][sS]?|[fF][tT][pP]/,Yr={_backpedal:jt,anyPunctuation:yf,autolink:vf,blockSkip:of,br:Hl,code:Zp,del:jt,delLDelim:jt,delRDelim:jt,emStrongLDelim:rf,emStrongRDelimAst:df,emStrongRDelimUnd:ff,escape:Yp,link:Sf,nolink:Zl,punctuation:Xp,reflink:Yl,reflinkSearch:Tf,tag:xf,text:Jp,url:jt},Ef={...Yr,emStrongLDelim:lf,emStrongRDelimAst:pf,emStrongRDelimUnd:gf,link:ae(/^!?\[(label)\]\((.*?)\)/).replace("label",xo).getRegex(),reflink:ae(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label",xo).getRegex()},$r={...Yr,emStrongRDelimAst:cf,emStrongLDelim:af,delLDelim:mf,delRDelim:wf,url:ae(/^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("protocol",Dl).replace("email",/[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(),_backpedal:/(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,del:/^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/,text:ae(/^(`+|~+|[^`~])(?:(?=[`~])|(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/).replace("protocol",Dl).getRegex()},Rf={...$r,br:ae(Hl).replace("{2,}","*").getRegex(),text:ae($r.text).replace("\\b_","\\b_| {2,}\\n").replace(/\{2,\}/g,"*").getRegex()},ko={normal:Qr,gfm:Wp,pedantic:Qp},$i={normal:Yr,gfm:$r,breaks:Rf,pedantic:Ef},Af={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"},Bl=e=>Af[e];function $n(e,n){if(n){if(Xe.escapeTest.test(e))return e.replace(Xe.escapeReplace,Bl)}else if(Xe.escapeTestNoEncode.test(e))return e.replace(Xe.escapeReplaceNoEncode,Bl);return e}function zl(e){try{e=encodeURI(e).replace(Xe.percentDecode,"%")}catch{return null}return e}function Kl(e,n){let t=e.replace(Xe.findPipe,(r,s,a)=>{let l=!1,d=s;for(;--d>=0&&a[d]==="\\";)l=!l;return l?"|":" |"}),i=t.split(Xe.splitPipe),o=0;if(i[0].trim()||i.shift(),i.length>0&&!i.at(-1)?.trim()&&i.pop(),n)if(i.length>n)i.splice(n);else for(;i.length<n;)i.push("");for(;o<i.length;o++)i[o]=i[o].trim().replace(Xe.slashPipe,"|");return i}function yt(e,n,t){let i=e.length;if(i===0)return"";let o=0;for(;o<i;){let r=e.charAt(i-o-1);if(r===n&&!t)o++;else if(r!==n&&t)o++;else break}return e.slice(0,i-o)}function Fl(e){let n=e.split(`
`),t=n.length-1;for(;t>=0&&Xe.blankLine.test(n[t]);)t--;return n.length-t<=2?e:n.slice(0,t+1).join(`
`)}function If(e,n){if(e.indexOf(n[1])===-1)return-1;let t=0;for(let i=0;i<e.length;i++)if(e[i]==="\\")i++;else if(e[i]===n[0])t++;else if(e[i]===n[1]&&(t--,t<0))return i;return t>0?-2:-1}function Nf(e,n=0){let t=n,i="";for(let o of e)if(o==="	"){let r=4-t%4;i+=" ".repeat(r),t+=r}else i+=o,t++;return i}function $l(e,n,t,i,o){let r=n.href,s=n.title||null,a=e[1].replace(o.other.outputLinkReplace,"$1"),l=e[0].charAt(0)==="!";i.state.inLink=!0;let d=i.state.linkEmitted,c=i.state.inRawBlock;i.state.linkEmitted=!1;let f=i.inlineTokens(a),p=i.state.linkEmitted;if(i.state.linkEmitted=d,i.state.inLink=!1,!l){if(p){i.state.inRawBlock=c;return}i.state.linkEmitted=!0}return{type:l?"image":"link",raw:t,href:r,title:s,text:a,tokens:f}}function _f(e,n,t){let i=e.match(t.other.indentCodeCompensation);if(i===null)return n;let o=i[1];return n.split(`
`).map(r=>{let s=r.match(t.other.beginningSpace);if(s===null)return r;let[a]=s;return a.length>=o.length?r.slice(o.length):r}).join(`
`)}var So=class{options;rules;lexer;constructor(e){this.options=e||Vt}space(e){let n=this.rules.block.newline.exec(e);if(n&&n[0].length>0)return{type:"space",raw:n[0]}}code(e){let n=this.rules.block.code.exec(e);if(n){let t=this.options.pedantic?n[0]:Fl(n[0]),i=t.replace(this.rules.other.codeRemoveIndent,"");return{type:"code",raw:t,codeBlockStyle:"indented",text:i}}}fences(e){let n=this.rules.block.fences.exec(e);if(n){let t=n[0],i=_f(t,n[3]||"",this.rules);return{type:"code",raw:t,lang:n[2]?n[2].trim().replace(this.rules.inline.anyPunctuation,"$1"):n[2],text:i}}}heading(e){let n=this.rules.block.heading.exec(e);if(n){let t=n[2].trim();if(this.rules.other.endingHash.test(t)){let i=yt(t,"#");(this.options.pedantic||!i||this.rules.other.endingSpaceChar.test(i))&&(t=i.trim())}return{type:"heading",raw:yt(n[0],`
`),depth:n[1].length,text:t,tokens:this.lexer.inline(t)}}}hr(e){let n=this.rules.block.hr.exec(e);if(n)return{type:"hr",raw:yt(n[0],`
`)}}blockquote(e){let n=this.rules.block.blockquote.exec(e);if(n){let t=yt(n[0],`
`).split(`
`),i="",o="",r=[];for(;t.length>0;){let s=!1,a=[],l;for(l=0;l<t.length;l++)if(this.rules.other.blockquoteStart.test(t[l]))a.push(t[l]),s=!0;else if(!s)a.push(t[l]);else break;t=t.slice(l);let d=a.join(`
`),c=d.replace(this.rules.other.blockquoteSetextReplace,`
    $1`).replace(this.rules.other.blockquoteSetextReplace2,"");i=i?`${i}
${d}`:d,o=o?`${o}
${c}`:c;let f=this.lexer.state.top;if(this.lexer.state.top=!0,this.lexer.blockTokens(c,r,!0),this.lexer.state.top=f,t.length===0)break;let p=r.at(-1);if(p?.type==="code")break;if(p?.type==="blockquote"){let h=p,y=t.join(`
`),k=h.raw+`
`+y.replace(this.rules.other.blockquoteSetextReplace2,""),I=this.blockquote(k);r[r.length-1]=I,i=`${i}
${y}`,o=o.substring(0,o.length-h.text.length)+I.text;break}else if(p?.type==="list"){let h=p,y=h.raw+`
`+t.join(`
`),k=this.list(y);r[r.length-1]=k,i=i.substring(0,i.length-p.raw.length)+k.raw,o=o.substring(0,o.length-h.raw.length)+k.raw,t=y.substring(r.at(-1).raw.length).split(`
`);continue}}return{type:"blockquote",raw:i,tokens:r,text:o}}}list(e){let n=this.rules.block.list.exec(e);if(n){let t=n[1].trim(),i=t.length>1,o={type:"list",raw:"",ordered:i,start:i?+t.slice(0,-1):"",loose:!1,items:[]};t=i?`\\d{1,9}\\${t.slice(-1)}`:`\\${t}`,this.options.pedantic&&(t=i?t:"[*+-]");let r=this.rules.other.listItemRegex(t),s=!1;for(;e;){let l=!1,d="",c="";if(!(n=r.exec(e))||this.rules.block.hr.test(e))break;d=n[0],e=e.substring(d.length);let f=Nf(n[2].split(`
`,1)[0],n[1].length),p=e.split(`
`,1)[0],h=!f.trim(),y=0;if(this.options.pedantic?(y=2,c=f.trimStart()):h?y=n[1].length+1:(y=f.search(this.rules.other.nonSpaceChar),y=y>4?1:y,c=f.slice(y),y+=n[1].length),h&&this.rules.other.blankLine.test(p)&&(d+=p+`
`,e=e.substring(p.length+1),l=!0),!l){let k=this.rules.other.nextBulletRegex(y),I=this.rules.other.hrRegex(y),v=this.rules.other.fencesBeginRegex(y),P=this.rules.other.headingBeginRegex(y),F=this.rules.other.htmlBeginRegex(y),Q=this.rules.other.blockquoteBeginRegex(y);for(;e;){let A=e.split(`
`,1)[0],j;if(p=A,this.options.pedantic?(p=p.replace(this.rules.other.listReplaceNesting,"  "),j=p):j=p.replace(this.rules.other.tabCharGlobal,"    "),v.test(p)||P.test(p)||F.test(p)||Q.test(p)||k.test(p)||I.test(p))break;if(j.search(this.rules.other.nonSpaceChar)>=y||!p.trim())c+=`
`+j.slice(y);else{if(h||f.replace(this.rules.other.tabCharGlobal,"    ").search(this.rules.other.nonSpaceChar)>=4||v.test(f)||P.test(f)||I.test(f))break;c+=`
`+p}h=!p.trim(),d+=A+`
`,e=e.substring(A.length+1),f=j.slice(y)}}o.loose||(s?o.loose=!0:this.rules.other.doubleBlankLine.test(d)&&(s=!0)),o.items.push({type:"list_item",raw:d,task:!!this.options.gfm&&this.rules.other.listIsTask.test(c),loose:!1,text:c,tokens:[]}),o.raw+=d}let a=o.items.at(-1);if(a)a.raw=a.raw.trimEnd(),a.text=a.text.trimEnd();else return;o.raw=o.raw.trimEnd();for(let l of o.items)if(this.lexer.state.top=!1,l.tokens=this.lexer.blockTokens(l.text,[]),!o.loose){let d=l.tokens.filter(f=>f.type==="space"),c=d.length>0&&d.some(f=>this.rules.other.anyLine.test(f.raw));o.loose=c}for(let l of o.items){let d=l.tokens[0];if(l.task&&(d?.type==="text"||d?.type==="paragraph")){l.text=l.text.replace(this.rules.other.listReplaceTask,""),d.raw=d.raw.replace(this.rules.other.listReplaceTask,""),d.text=d.text.replace(this.rules.other.listReplaceTask,"");for(let f=this.lexer.inlineQueue.length-1;f>=0;f--)if(this.rules.other.listIsTask.test(this.lexer.inlineQueue[f].src)){this.lexer.inlineQueue[f].src=this.lexer.inlineQueue[f].src.replace(this.rules.other.listReplaceTask,"");break}let c=this.rules.other.listTaskCheckbox.exec(l.raw);if(c){let f={type:"checkbox",raw:c[0]+" ",checked:c[0]!=="[ ]"};l.checked=f.checked,o.loose?l.tokens[0]&&["paragraph","text"].includes(l.tokens[0].type)&&"tokens"in l.tokens[0]&&l.tokens[0].tokens?(l.tokens[0].raw=f.raw+l.tokens[0].raw,l.tokens[0].text=f.raw+l.tokens[0].text,l.tokens[0].tokens.unshift(f)):l.tokens.unshift({type:"paragraph",raw:f.raw,text:f.raw,tokens:[f]}):l.tokens.unshift(f)}}else l.task&&(l.task=!1)}if(o.loose)for(let l of o.items){l.loose=!0;for(let d of l.tokens)d.type==="text"&&(d.type="paragraph")}return o}}html(e){let n=this.rules.block.html.exec(e);if(n){let t=Fl(n[0]);return{type:"html",block:!0,raw:t,pre:n[1]==="pre"||n[1]==="script"||n[1]==="style",text:t}}}def(e){let n=this.rules.block.def.exec(e);if(n){let t=n[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal," "),i=n[2]?n[2].replace(this.rules.other.hrefBrackets,"$1").replace(this.rules.inline.anyPunctuation,"$1"):"",o=n[3]?n[3].substring(1,n[3].length-1).replace(this.rules.inline.anyPunctuation,"$1"):n[3];return{type:"def",tag:t,raw:yt(n[0],`
`),href:i,title:o}}}table(e){let n=this.rules.block.table.exec(e);if(!n||!this.rules.other.tableDelimiter.test(n[2]))return;let t=Kl(n[1]),i=n[2].replace(this.rules.other.tableAlignChars,"").split("|"),o=n[3]?.trim()?n[3].replace(this.rules.other.tableRowBlankLine,"").split(`
`):[],r={type:"table",raw:yt(n[0],`
`),header:[],align:[],rows:[]};if(t.length===i.length){for(let s of i)this.rules.other.tableAlignRight.test(s)?r.align.push("right"):this.rules.other.tableAlignCenter.test(s)?r.align.push("center"):this.rules.other.tableAlignLeft.test(s)?r.align.push("left"):r.align.push(null);for(let s=0;s<t.length;s++)r.header.push({text:t[s],tokens:this.lexer.inline(t[s]),header:!0,align:r.align[s]});for(let s of o)r.rows.push(Kl(s,r.header.length).map((a,l)=>({text:a,tokens:this.lexer.inline(a),header:!1,align:r.align[l]})));return r}}lheading(e){let n=this.rules.block.lheading.exec(e);if(n){let t=n[1].trim();return{type:"heading",raw:yt(n[0],`
`),depth:n[2].charAt(0)==="="?1:2,text:t,tokens:this.lexer.inline(t)}}}paragraph(e){let n=this.rules.block.paragraph.exec(e);if(n){let t=n[1].charAt(n[1].length-1)===`
`?n[1].slice(0,-1):n[1];return{type:"paragraph",raw:n[0],text:t,tokens:this.lexer.inline(t)}}}text(e){let n=this.rules.block.text.exec(e);if(n)return{type:"text",raw:n[0],text:n[0],tokens:this.lexer.inline(n[0])}}escape(e){let n=this.rules.inline.escape.exec(e);if(n)return{type:"escape",raw:n[0],text:n[1]}}tag(e){let n=this.rules.inline.tag.exec(e);if(n)return!this.lexer.state.inLink&&this.rules.other.startATag.test(n[0])?this.lexer.state.inLink=!0:this.lexer.state.inLink&&this.rules.other.endATag.test(n[0])&&(this.lexer.state.inLink=!1),!this.lexer.state.inRawBlock&&this.rules.other.startPreScriptTag.test(n[0])?this.lexer.state.inRawBlock=!0:this.lexer.state.inRawBlock&&this.rules.other.endPreScriptTag.test(n[0])&&(this.lexer.state.inRawBlock=!1),{type:"html",raw:n[0],inLink:this.lexer.state.inLink,inRawBlock:this.lexer.state.inRawBlock,block:!1,text:n[0]}}link(e){let n=this.rules.inline.link.exec(e);if(n){let t=n[2].trim();if(!this.options.pedantic&&this.rules.other.startAngleBracket.test(t)){if(!this.rules.other.endAngleBracket.test(t))return;let r=yt(t.slice(0,-1),"\\");if((t.length-r.length)%2===0)return}else{let r=If(n[2],"()");if(r===-2)return;if(r>-1){let s=(n[0].indexOf("!")===0?5:4)+n[1].length+r;n[2]=n[2].substring(0,r),n[0]=n[0].substring(0,s).trim(),n[3]=""}}let i=n[2],o="";if(this.options.pedantic){let r=this.rules.other.pedanticHrefTitle.exec(i);r&&(i=r[1],o=r[3])}else o=n[3]?n[3].slice(1,-1):"";return i=i.trim(),this.rules.other.startAngleBracket.test(i)&&(this.options.pedantic&&!this.rules.other.endAngleBracket.test(t)?i=i.slice(1):i=i.slice(1,-1)),$l(n,{href:i&&i.replace(this.rules.inline.anyPunctuation,"$1"),title:o&&o.replace(this.rules.inline.anyPunctuation,"$1")},n[0],this.lexer,this.rules)}}reflink(e,n){let t;if((t=this.rules.inline.reflink.exec(e))||(t=this.rules.inline.nolink.exec(e))){let i=(t[2]||t[1]).replace(this.rules.other.multipleSpaceGlobal," "),o=n[i.toLowerCase()];if(!o){let r=t[0].charAt(0);return{type:"text",raw:r,text:r}}return $l(t,o,t[0],this.lexer,this.rules)}}emStrong(e,n,t=""){let i=this.rules.inline.emStrongLDelim.exec(e);if(!(!i||!i[1]&&!i[2]&&!i[3]&&!i[4]||i[4]&&t.match(this.rules.other.unicodeAlphaNumeric))&&(!(i[1]||i[3])||!t||this.rules.inline.punctuation.exec(t))){let o=[...i[0]].length-1,r,s,a=o,l=0,d=i[0][0],c=t===d,f=d==="*"?this.rules.inline.emStrongRDelimAst:this.rules.inline.emStrongRDelimUnd;for(f.lastIndex=0,n=n.slice(-1*e.length+o);(i=f.exec(n))!==null;){if(r=i[1]||i[2]||i[3]||i[4]||i[5]||i[6],!r)continue;if(s=[...r].length,i[3]||i[4]){a+=s;continue}else if(i[5]||i[6]){if(o%3&&!((o+s)%3)){l+=s;continue}if(c)break}if(a-=s,a>0)continue;s=Math.min(s,s+a+l);let p=[...i[0]][0].length,h=e.slice(0,o+i.index+p+s);if(Math.min(o,s)%2){let k=h.slice(1,-1);return{type:"em",raw:h,text:k,tokens:this.lexer.inlineTokens(k)}}let y=h.slice(2,-2);return{type:"strong",raw:h,text:y,tokens:this.lexer.inlineTokens(y)}}}}codespan(e){let n=this.rules.inline.code.exec(e);if(n){let t=n[2].replace(this.rules.other.newLineCharGlobal," "),i=this.rules.other.nonSpaceChar.test(t),o=this.rules.other.startingSpaceChar.test(t)&&this.rules.other.endingSpaceChar.test(t);return i&&o&&(t=t.substring(1,t.length-1)),{type:"codespan",raw:n[0],text:t}}}br(e){let n=this.rules.inline.br.exec(e);if(n)return{type:"br",raw:n[0]}}del(e,n,t=""){let i=this.rules.inline.delLDelim.exec(e);if(i&&(!i[1]||!t||this.rules.inline.punctuation.exec(t))){let o=[...i[0]].length-1,r,s,a=o,l=this.rules.inline.delRDelim;for(l.lastIndex=0,n=n.slice(-1*e.length+o);(i=l.exec(n))!==null;){if(r=i[1]||i[2]||i[3]||i[4]||i[5]||i[6],!r||(s=[...r].length,s!==o))continue;if(i[3]||i[4]){a+=s;continue}if(a-=s,a>0)continue;s=Math.min(s,s+a);let d=[...i[0]][0].length,c=e.slice(0,o+i.index+d+s),f=c.slice(o,-o);return{type:"del",raw:c,text:f,tokens:this.lexer.inlineTokens(f)}}}}autolink(e){let n=this.rules.inline.autolink.exec(e);if(n){let t,i;return n[2]==="@"?(t=n[1],i="mailto:"+t):(t=n[1],i=t),{type:"link",raw:n[0],text:t,href:i,tokens:[{type:"text",raw:t,text:t}]}}}url(e){let n;if(n=this.rules.inline.url.exec(e)){let t,i;if(n[2]==="@")t=n[0],i="mailto:"+t;else{let o;do o=n[0],n[0]=this.rules.inline._backpedal.exec(n[0])?.[0]??"";while(o!==n[0]);t=n[0],n[1]==="www."?i="http://"+n[0]:i=n[0]}return{type:"link",raw:n[0],text:t,href:i,tokens:[{type:"text",raw:t,text:t}]}}}inlineText(e){let n=this.rules.inline.text.exec(e);if(n){let t=this.lexer.state.inRawBlock;return{type:"text",raw:n[0],text:n[0],escaped:t}}}},On=class jr{tokens;options;state;inlineQueue;tokenizer;constructor(n){this.tokens=[],this.tokens.links=Object.create(null),this.options=n||Vt,this.options.tokenizer=this.options.tokenizer||new So,this.tokenizer=this.options.tokenizer,this.tokenizer.options=this.options,this.tokenizer.lexer=this,this.inlineQueue=[],this.state={inLink:!1,inRawBlock:!1,linkEmitted:!1,top:!0};let t={other:Xe,block:ko.normal,inline:$i.normal};this.options.pedantic?(t.block=ko.pedantic,t.inline=$i.pedantic):this.options.gfm&&(t.block=ko.gfm,this.options.breaks?t.inline=$i.breaks:t.inline=$i.gfm),this.tokenizer.rules=t}static get rules(){return{block:ko,inline:$i}}static lex(n,t){return new jr(t).lex(n)}static lexInline(n,t){return new jr(t).inlineTokens(n)}lex(n){n=n.replace(Xe.carriageReturn,`
`),this.blockTokens(n,this.tokens);for(let t=0;t<this.inlineQueue.length;t++){let i=this.inlineQueue[t];this.inlineTokens(i.src,i.tokens)}return this.inlineQueue=[],this.tokens}blockTokens(n,t=[],i=!1){this.tokenizer.lexer=this,this.options.pedantic&&(n=n.replace(Xe.tabCharGlobal,"    ").replace(Xe.spaceLine,""));let o=1/0;for(;n;){if(n.length<o)o=n.length;else{this.infiniteLoopError(n.charCodeAt(0));break}let r;if(this.options.extensions?.block?.some(a=>(r=a.call({lexer:this},n,t))?(n=n.substring(r.raw.length),t.push(r),!0):!1))continue;if(r=this.tokenizer.space(n)){n=n.substring(r.raw.length);let a=t.at(-1);r.raw.length===1&&a!==void 0?a.raw+=`
`:t.push(r);continue}if(r=this.tokenizer.code(n)){n=n.substring(r.raw.length);let a=t.at(-1);a?.type==="paragraph"||a?.type==="text"?(a.raw+=(a.raw.endsWith(`
`)?"":`
`)+r.raw,a.text+=`
`+r.text,this.inlineQueue.at(-1).src=a.text):t.push(r);continue}if(r=this.tokenizer.fences(n)){n=n.substring(r.raw.length),t.push(r);continue}if(r=this.tokenizer.heading(n)){n=n.substring(r.raw.length),t.push(r);continue}if(r=this.tokenizer.hr(n)){n=n.substring(r.raw.length),t.push(r);continue}if(r=this.tokenizer.blockquote(n)){n=n.substring(r.raw.length),t.push(r);continue}if(r=this.tokenizer.list(n)){n=n.substring(r.raw.length),t.push(r);continue}if(r=this.tokenizer.html(n)){n=n.substring(r.raw.length),t.push(r);continue}if(r=this.tokenizer.def(n)){n=n.substring(r.raw.length);let a=t.at(-1);a?.type==="paragraph"||a?.type==="text"?(a.raw+=(a.raw.endsWith(`
`)?"":`
`)+r.raw,a.text+=`
`+r.raw,this.inlineQueue.at(-1).src=a.text):this.tokens.links[r.tag]||(this.tokens.links[r.tag]={href:r.href,title:r.title},t.push(r));continue}if(r=this.tokenizer.table(n)){n=n.substring(r.raw.length),t.push(r);continue}if(r=this.tokenizer.lheading(n)){n=n.substring(r.raw.length),t.push(r);continue}let s=n;if(this.options.extensions?.startBlock){let a=1/0,l=n.slice(1),d;this.options.extensions.startBlock.forEach(c=>{d=c.call({lexer:this},l),typeof d=="number"&&d>=0&&(a=Math.min(a,d))}),a<1/0&&a>=0&&(s=n.substring(0,a+1))}if(this.state.top&&(r=this.tokenizer.paragraph(s))){let a=t.at(-1);i&&a?.type==="paragraph"?(a.raw+=(a.raw.endsWith(`
`)?"":`
`)+r.raw,a.text+=`
`+r.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=a.text):t.push(r),i=s.length!==n.length,n=n.substring(r.raw.length);continue}if(r=this.tokenizer.text(n)){n=n.substring(r.raw.length);let a=t.at(-1);a?.type==="text"?(a.raw+=(a.raw.endsWith(`
`)?"":`
`)+r.raw,a.text+=`
`+r.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=a.text):t.push(r);continue}if(n){this.infiniteLoopError(n.charCodeAt(0));break}}return this.state.top=!0,t}inline(n,t=[]){return this.inlineQueue.push({src:n,tokens:t}),t}linkInText(n){if(!n.includes("["))return!1;let t=this.tokenizer.rules.inline.link;for(let i of n.matchAll(this.tokenizer.rules.inline.blockSkip))if(t.test(i[0])&&n.charAt(i.index-1)!=="!")return!0;for(let i of n.matchAll(this.tokenizer.rules.inline.reflinkSearch)){let o=i[0],r=o.lastIndexOf("[");if(!(o.charAt(0)==="!"||!Object.hasOwn(this.tokens.links,o.slice(r+1,-1)))&&!(r>1&&this.linkInText(o.slice(1,r-1))))return!0}return!1}inlineTokens(n,t=[]){this.tokenizer.lexer=this;let i=n;if(this.tokens.links&&n.includes("[")){let a=this.tokenizer.rules.inline.reflinkSearch,l=d=>{let c=d.lastIndexOf("[");if(!Object.hasOwn(this.tokens.links,d.slice(c+1,-1)))return d;if(c>1&&d.charAt(0)!=="!"){let f=d.slice(1,c-1);if(this.linkInText(f))return"["+f.replace(a,l)+"]["+"a".repeat(d.length-c-2)+"]"}return"["+"a".repeat(d.length-2)+"]"};i=i.replace(a,l)}i=i.replace(this.tokenizer.rules.inline.anyPunctuation,a=>"+".repeat(a.length)),i=i.replace(this.tokenizer.rules.inline.blockSkip,(a,l,d)=>{let c=d?d.length:0;return a.slice(0,c)+"["+"a".repeat(a.length-c-2)+"]"}),i=this.options.hooks?.emStrongMask?.call({lexer:this},i)??i;let o=!1,r="",s=1/0;for(;n;){if(n.length<s)s=n.length;else{this.infiniteLoopError(n.charCodeAt(0));break}o||(r=""),o=!1;let a;if(this.options.extensions?.inline?.some(d=>(a=d.call({lexer:this},n,t))?(n=n.substring(a.raw.length),t.push(a),!0):!1))continue;if(a=this.tokenizer.escape(n)){n=n.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.tag(n)){n=n.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.link(n)){n=n.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.reflink(n,this.tokens.links)){n=n.substring(a.raw.length);let d=t.at(-1);a.type==="text"&&d?.type==="text"?(d.raw+=a.raw,d.text+=a.text):t.push(a);continue}if(a=this.tokenizer.emStrong(n,i,r)){n=n.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.codespan(n)){n=n.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.br(n)){n=n.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.del(n,i,r)){n=n.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.autolink(n)){n=n.substring(a.raw.length),t.push(a);continue}if(!this.state.inLink&&(a=this.tokenizer.url(n))){n=n.substring(a.raw.length),t.push(a);continue}let l=n;if(this.options.extensions?.startInline){let d=1/0,c=n.slice(1),f;this.options.extensions.startInline.forEach(p=>{f=p.call({lexer:this},c),typeof f=="number"&&f>=0&&(d=Math.min(d,f))}),d<1/0&&d>=0&&(l=n.substring(0,d+1))}if(a=this.tokenizer.inlineText(l)){n=n.substring(a.raw.length),a.raw.slice(-1)!=="_"&&(r=a.raw.slice(-1)),o=!0;let d=t.at(-1);d?.type==="text"?(d.raw+=a.raw,d.text+=a.text):t.push(a);continue}if(n){this.infiniteLoopError(n.charCodeAt(0));break}}return t}infiniteLoopError(n){let t="Infinite loop on byte: "+n;if(this.options.silent)console.error(t);else throw new Error(t)}},To=class{options;parser;constructor(e){this.options=e||Vt}space(e){return""}code({text:e,lang:n,escaped:t}){let i=(n||"").match(Xe.notSpaceStart)?.[0],o=e.replace(Xe.endingNewline,"")+`
`;return i?'<pre><code class="language-'+$n(i)+'">'+(t?o:$n(o,!0))+`</code></pre>
`:"<pre><code>"+(t?o:$n(o,!0))+`</code></pre>
`}blockquote({tokens:e}){return`<blockquote>
${this.parser.parse(e)}</blockquote>
`}html({text:e}){return e}def(e){return""}heading({tokens:e,depth:n}){return`<h${n}>${this.parser.parseInline(e)}</h${n}>
`}hr(e){return`<hr>
`}list(e){let n=e.ordered,t=e.start,i="";for(let s=0;s<e.items.length;s++){let a=e.items[s];i+=this.listitem(a)}let o=n?"ol":"ul",r=n&&t!==1?' start="'+t+'"':"";return"<"+o+r+`>
`+i+"</"+o+`>
`}listitem(e){return`<li>${this.parser.parse(e.tokens)}</li>
`}checkbox({checked:e}){return"<input "+(e?'checked="" ':"")+'disabled="" type="checkbox"> '}paragraph({tokens:e}){return`<p>${this.parser.parseInline(e)}</p>
`}table(e){let n="",t="";for(let o=0;o<e.header.length;o++)t+=this.tablecell(e.header[o]);n+=this.tablerow({text:t});let i="";for(let o=0;o<e.rows.length;o++){let r=e.rows[o];t="";for(let s=0;s<r.length;s++)t+=this.tablecell(r[s]);i+=this.tablerow({text:t})}return i&&(i=`<tbody>${i}</tbody>`),`<table>
<thead>
`+n+`</thead>
`+i+`</table>
`}tablerow({text:e}){return`<tr>
${e}</tr>
`}tablecell(e){let n=this.parser.parseInline(e.tokens),t=e.header?"th":"td";return(e.align?`<${t} align="${e.align}">`:`<${t}>`)+n+`</${t}>
`}strong({tokens:e}){return`<strong>${this.parser.parseInline(e)}</strong>`}em({tokens:e}){return`<em>${this.parser.parseInline(e)}</em>`}codespan({text:e}){return`<code>${$n(e,!0)}</code>`}br(e){return"<br>"}del({tokens:e}){return`<del>${this.parser.parseInline(e)}</del>`}link({href:e,title:n,tokens:t}){let i=this.parser.parseInline(t),o=zl(e);if(o===null)return i;e=o;let r='<a href="'+e+'"';return n&&(r+=' title="'+$n(n)+'"'),r+=">"+i+"</a>",r}image({href:e,title:n,text:t,tokens:i}){i&&(t=this.parser.parseInline(i,this.parser.textRenderer));let o=zl(e);if(o===null)return $n(t);e=o;let r=`<img src="${e}" alt="${$n(t)}"`;return n&&(r+=` title="${$n(n)}"`),r+=">",r}text(e){return"tokens"in e&&e.tokens?this.parser.parseInline(e.tokens):"escaped"in e&&e.escaped?e.text:$n(e.text)}},Zr=class{strong({text:e}){return e}em({text:e}){return e}codespan({text:e}){return e}del({text:e}){return e}html({text:e}){return e}text({text:e}){return e}link({text:e}){return""+e}image({text:e}){return""+e}br(){return""}checkbox({raw:e}){return e}},Pn=class Ur{options;renderer;textRenderer;constructor(n){this.options=n||Vt,this.options.renderer=this.options.renderer||new To,this.renderer=this.options.renderer,this.renderer.options=this.options,this.renderer.parser=this,this.textRenderer=new Zr}static parse(n,t){return new Ur(t).parse(n)}static parseInline(n,t){return new Ur(t).parseInline(n)}parse(n){this.renderer.parser=this;let t="";for(let i=0;i<n.length;i++){let o=n[i];if(this.options.extensions?.renderers?.[o.type]){let s=o,a=this.options.extensions.renderers[s.type].call({parser:this},s);if(a!==!1||!["space","hr","heading","code","table","blockquote","list","checkbox","html","def","paragraph","text"].includes(s.type)){t+=a||"";continue}}let r=o;switch(r.type){case"space":{t+=this.renderer.space(r);break}case"hr":{t+=this.renderer.hr(r);break}case"heading":{t+=this.renderer.heading(r);break}case"code":{t+=this.renderer.code(r);break}case"table":{t+=this.renderer.table(r);break}case"blockquote":{t+=this.renderer.blockquote(r);break}case"list":{t+=this.renderer.list(r);break}case"checkbox":{t+=this.renderer.checkbox(r);break}case"html":{t+=this.renderer.html(r);break}case"def":{t+=this.renderer.def(r);break}case"paragraph":{t+=this.renderer.paragraph(r);break}case"text":{t+=this.renderer.text(r);break}default:{let s='Token with "'+r.type+'" type was not found.';if(this.options.silent)return console.error(s),"";throw new Error(s)}}}return t}parseInline(n,t=this.renderer){this.renderer.parser=this;let i="";for(let o=0;o<n.length;o++){let r=n[o];if(this.options.extensions?.renderers?.[r.type]){let a=this.options.extensions.renderers[r.type].call({parser:this},r);if(a!==!1||!["escape","html","link","image","checkbox","strong","em","codespan","br","del","text"].includes(r.type)){i+=a||"";continue}}let s=r;switch(s.type){case"escape":{i+=t.text(s);break}case"html":{i+=t.html(s);break}case"link":{i+=t.link(s);break}case"image":{i+=t.image(s);break}case"checkbox":{i+=t.checkbox(s);break}case"strong":{i+=t.strong(s);break}case"em":{i+=t.em(s);break}case"codespan":{i+=t.codespan(s);break}case"br":{i+=t.br(s);break}case"del":{i+=t.del(s);break}case"text":{i+=t.text(s);break}default:{let a='Token with "'+s.type+'" type was not found.';if(this.options.silent)return console.error(a),"";throw new Error(a)}}}return i}},ji=class{options;block;constructor(e){this.options=e||Vt}static passThroughHooks=new Set(["preprocess","postprocess","processAllTokens","emStrongMask"]);static passThroughHooksRespectAsync=new Set(["preprocess","postprocess","processAllTokens"]);preprocess(e){return e}postprocess(e){return e}processAllTokens(e){return e}emStrongMask(e){return e}provideLexer(e=this.block){return e?On.lex:On.lexInline}provideParser(e=this.block){return e?Pn.parse:Pn.parseInline}},Cf=class{defaults=Vr();options=this.setOptions;parse=this.parseMarkdown(!0);parseInline=this.parseMarkdown(!1);Parser=Pn;Renderer=To;TextRenderer=Zr;Lexer=On;Tokenizer=So;Hooks=ji;constructor(...e){this.use(...e)}walkTokens(e,n){let t=[];for(let i of e)switch(t=t.concat(n.call(this,i)),i.type){case"table":{let o=i;for(let r of o.header)t=t.concat(this.walkTokens(r.tokens,n));for(let r of o.rows)for(let s of r)t=t.concat(this.walkTokens(s.tokens,n));break}case"list":{let o=i;t=t.concat(this.walkTokens(o.items,n));break}default:{let o=i;this.defaults.extensions?.childTokens?.[o.type]?this.defaults.extensions.childTokens[o.type].forEach(r=>{let s=o[r].flat(1/0);t=t.concat(this.walkTokens(s,n))}):o.tokens&&(t=t.concat(this.walkTokens(o.tokens,n)))}}return t}use(...e){let n=this.defaults.extensions||{renderers:{},childTokens:{}};return e.forEach(t=>{let i={...t};if(i.async=this.defaults.async||i.async||!1,t.extensions&&(t.extensions.forEach(o=>{if(!o.name)throw new Error("extension name required");if("renderer"in o){let r=n.renderers[o.name];r?n.renderers[o.name]=function(...s){let a=o.renderer.apply(this,s);return a===!1&&(a=r.apply(this,s)),a}:n.renderers[o.name]=o.renderer}if("tokenizer"in o){if(!o.level||o.level!=="block"&&o.level!=="inline")throw new Error("extension level must be 'block' or 'inline'");let r=n[o.level];r?r.unshift(o.tokenizer):n[o.level]=[o.tokenizer],o.start&&(o.level==="block"?n.startBlock?n.startBlock.push(o.start):n.startBlock=[o.start]:o.level==="inline"&&(n.startInline?n.startInline.push(o.start):n.startInline=[o.start]))}"childTokens"in o&&o.childTokens&&(n.childTokens[o.name]=o.childTokens)}),i.extensions=n),t.renderer){let o=this.defaults.renderer||new To(this.defaults);for(let r in t.renderer){if(!(r in o))throw new Error(`renderer '${r}' does not exist`);if(["options","parser"].includes(r))continue;let s=r,a=t.renderer[s],l=o[s];o[s]=(...d)=>{let c=a.apply(o,d);return c===!1&&(c=l.apply(o,d)),c||""}}i.renderer=o}if(t.tokenizer){let o=this.defaults.tokenizer||new So(this.defaults);for(let r in t.tokenizer){if(!(r in o))throw new Error(`tokenizer '${r}' does not exist`);if(["options","rules","lexer"].includes(r))continue;let s=r,a=t.tokenizer[s],l=o[s];o[s]=(...d)=>{let c=a.apply(o,d);return c===!1&&(c=l.apply(o,d)),c}}i.tokenizer=o}if(t.hooks){let o=this.defaults.hooks||new ji;for(let r in t.hooks){if(!(r in o))throw new Error(`hook '${r}' does not exist`);if(["options","block"].includes(r))continue;let s=r,a=t.hooks[s],l=o[s];ji.passThroughHooks.has(r)?o[s]=d=>{if(this.defaults.async&&ji.passThroughHooksRespectAsync.has(r))return(async()=>{let f=await a.call(o,d);return l.call(o,f)})();let c=a.call(o,d);return l.call(o,c)}:o[s]=(...d)=>{if(this.defaults.async)return(async()=>{let f=await a.apply(o,d);return f===!1&&(f=await l.apply(o,d)),f})();let c=a.apply(o,d);return c===!1&&(c=l.apply(o,d)),c}}i.hooks=o}if(t.walkTokens){let o=this.defaults.walkTokens,r=t.walkTokens;i.walkTokens=function(s){let a=[];return a.push(r.call(this,s)),o&&(a=a.concat(o.call(this,s))),a}}this.defaults={...this.defaults,...i}}),this}setOptions(e){return this.defaults={...this.defaults,...e},this}lexer(e,n){return On.lex(e,n??this.defaults)}parser(e,n){return Pn.parse(e,n??this.defaults)}parseMarkdown(e){return(n,t)=>{let i={...t},o={...this.defaults,...i},r=this.onError(!!o.silent,!!o.async);if(this.defaults.async===!0&&i.async===!1)return r(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));if(typeof n>"u"||n===null)return r(new Error("marked(): input parameter is undefined or null"));if(typeof n!="string")return r(new Error("marked(): input parameter is of type "+Object.prototype.toString.call(n)+", string expected"));if(o.hooks&&(o.hooks.options=o,o.hooks.block=e),o.async)return(async()=>{let s=o.hooks?await o.hooks.preprocess(n):n,a=await(o.hooks?await o.hooks.provideLexer(e):e?On.lex:On.lexInline)(s,o),l=o.hooks?await o.hooks.processAllTokens(a):a;o.walkTokens&&await Promise.all(this.walkTokens(l,o.walkTokens));let d=await(o.hooks?await o.hooks.provideParser(e):e?Pn.parse:Pn.parseInline)(l,o);return o.hooks?await o.hooks.postprocess(d):d})().catch(r);try{o.hooks&&(n=o.hooks.preprocess(n));let s=(o.hooks?o.hooks.provideLexer(e):e?On.lex:On.lexInline)(n,o);o.hooks&&(s=o.hooks.processAllTokens(s)),o.walkTokens&&this.walkTokens(s,o.walkTokens);let a=(o.hooks?o.hooks.provideParser(e):e?Pn.parse:Pn.parseInline)(s,o);return o.hooks&&(a=o.hooks.postprocess(a)),a}catch(s){return r(s)}}}onError(e,n){return t=>{if(t.message+=`
Please report this to https://github.com/markedjs/marked.`,e){let i="<p>An error occurred:</p><pre>"+$n(t.message+"",!0)+"</pre>";return n?Promise.resolve(i):i}if(n)return Promise.reject(t);throw t}}},Ut=new Cf;function ke(e,n){return Ut.parse(e,n)}ke.options=ke.setOptions=function(e){return Ut.setOptions(e),ke.defaults=Ut.defaults,jl(ke.defaults),ke};ke.getDefaults=Vr;ke.defaults=Vt;function Of(...e){return Ut.use(...e),ke.defaults=Ut.defaults,jl(ke.defaults),ke}ke.use=Of;ke.walkTokens=function(e,n){return Ut.walkTokens(e,n)};ke.parseInline=Ut.parseInline;ke.Parser=Pn;ke.parser=Pn.parse;ke.Renderer=To;ke.TextRenderer=Zr;ke.Lexer=On;ke.lexer=On.lex;ke.Tokenizer=So;ke.Hooks=ji;ke.parse=ke;var bw=ke.options,ww=ke.setOptions,yw=ke.walkTokens,vw=ke.parseInline;var kw=Pn.parse,xw=On.lex;var Jl="[^>]*?(?:refChip|ref-chip|data-ref-chip)[^>]*?",Pf=new RegExp("<span\\b"+Jl+">([\\s\\S]*?)</span>","g"),Mf=new RegExp("<span\\b"+Jl+"/>","g"),Lf=/<[A-Za-z][^<>]*ref[_-]?chip/i;function Xl(e){let n=e.replace(Pf,(i,o)=>o).replace(Mf,""),t=Lf.exec(n);if(t!==null){let i=Math.max(0,t.index-40);throw new Error("#182: unrecognised harness ref-chip variant in text headed for an aidos renderer -- refusing to pass it through (a silent pass re-creates the escaped-markup bug per variant). Teach stripHarnessChrome the new shape. Near: "+JSON.stringify(n.slice(i,t.index+120)))}return n}var Df={ALLOWED_URI_REGEXP:/^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i},ed=null,Jr=null;function Bf(){let e=Ml;if(typeof e.sanitize=="function")return e;let n=globalThis.window;if(n==null)throw new Error("#212: renderMarkdownSafe needs a Window for DOMPurify and none exists. The client bundle always runs in a browser; tests for this module must run under the jsdom environment (// @vitest-environment jsdom).");return(Jr===null||ed!==n)&&(Jr=e(n),ed=n),Jr}function zf(e){return Bf().sanitize(e,Df)}function Kf(e){let n=e.replace(/&#(x?)([0-9a-f]+);?/gi,(i,o,r)=>String.fromCharCode(parseInt(r,o===""?10:16))).replace(/[\u0000-\u0020]/g,"").toLowerCase(),t=/^([a-z][a-z0-9+.-]*):/.exec(n);return t===null?!0:t[1]==="http"||t[1]==="https"||t[1]==="mailto"}function Ff(e){return e.replace(/(\s(?:href|src)=")([^"]*)(")/gi,(n,t,i,o)=>Kf(i)?n:t+"#"+o)}function Ro(e){if(e==="")return"";let n=ke.parse(Xl(e),{async:!1});return Ff(zf(String(n)))}var fn=de(require("react"),1);var $f=["description","criteria"];function nd(e){let[n,t]=fn.default.useState(!1),[i,o]=fn.default.useState(String(e.value)),[r,s]=fn.default.useState(!1);async function a(){if(!r){s(!0);try{let c=e.field,f=i;if((c==="phase"||c==="order")&&!/^\d+$/.test(f.trim())){_("phase and order must be integers \u2265 0","refusal"),s(!1);return}let p=c==="phase"||c==="order"?Number(f):f;await z("userSetTicket",{ticketId:e.ticketId,[c]:p},e.agentId),_("Field saved","success"),t(!1),e.onSaved()}catch(c){c instanceof J?_(c.message,"refusal"):_(String(c),"refusal"),o(String(e.value))}finally{s(!1)}}}function l(){o(String(e.value)),t(!0)}function d(){o(String(e.value)),t(!1)}if(n){let c=$f.includes(e.field);return fn.default.createElement("div",{className:"aidos-field-editor"},c?fn.default.createElement("textarea",{className:"aidos-field-editor-input",value:i,disabled:r,onChange:f=>{o(f.target.value)}}):fn.default.createElement("input",{className:"aidos-field-editor-input",type:"text",value:i,disabled:r,onChange:f=>{o(f.target.value)}}),fn.default.createElement("span",null,fn.default.createElement("button",{className:"aidos-btn",disabled:r,onClick:a},"Save")," ",fn.default.createElement("button",{className:"aidos-btn",disabled:r,onClick:d},"Cancel")))}return fn.default.createElement("div",{className:"aidos-field-editor"},fn.default.createElement("span",null,e.children!==void 0?e.children:String(e.value)," ",fn.default.createElement("button",{className:"aidos-icon-btn",title:"Edit","data-dsh-tip":"","aria-label":"Edit "+e.field,onClick:l},fn.default.createElement(Tn,null))))}var xn=de(require("react"),1);var jf={signoff:"onOpenSignoff",verify:"onOpenVerify","submit-for-review":"onOpenSubmitForReview","send-back":"onOpenSendBack","mark-done":"onOpenMarkDone",allowlist:"onOpenAllowlist"};function Uf(e){return xn.default.useEffect(function(){if(!e.open)return;function n(i){i.key==="Escape"&&(e.onClose(),e.triggerRef.current?.focus())}function t(i){if(!(i.target instanceof Node))return;let o=e.containerRef.current;o!==null&&o.contains(i.target)||e.onClose()}return document.addEventListener("keydown",n),document.addEventListener("pointerdown",t),function(){document.removeEventListener("keydown",n),document.removeEventListener("pointerdown",t)}},[e.open,e.onClose]),e.open?xn.default.createElement("div",{role:"menu","aria-label":"More actions",style:{position:"absolute",top:"100%",right:0,zIndex:10,display:"flex",flexDirection:"column",alignItems:"stretch",gap:"2px",padding:"4px",background:"var(--surface)",border:"1px solid var(--border-subtle)",borderRadius:"6px",boxShadow:"0 2px 8px rgb(0 0 0 / 0.25)"}},e.items.map(n=>xn.default.createElement("button",{key:n.id,role:"menuitem",className:"aidos-btn",style:{background:"transparent",color:"var(--text-primary)",justifyContent:"flex-start",textAlign:"left"},onClick:function(){e.onClose(),n.onSelect()}},n.label))):null}function td(e){let n=e.evidence.map(p=>p.kind),t=Bt(e.ticket,n),[i,o]=xn.default.useState(null),[r,s]=xn.default.useState(!1),a=xn.default.useRef(null),l=xn.default.useRef(null);xn.default.useEffect(function(){le("action bar mounted")},[]);function d(p,h){if(p.unavailableReason!==void 0)return;if(e.checkAction===void 0){h();return}if(i!==null)return;let y=p.id;o(y),e.checkAction(y).then(k=>{if(k!==null){_(k,"refusal");return}h()}).catch(k=>{_(k instanceof J?k.message:String(k),"refusal")}).finally(()=>{o(null)})}let c=e.onOpenRetire===void 0?[]:[{id:"retire",label:"Retire\u2026",onSelect:e.onOpenRetire}],f=t.map(p=>{let h=e[jf[p.id]],y=p.unavailableReason!==void 0,k=i===p.id,I=(p.primary?"aidos-btn aidos-btn-primary":"aidos-btn")+(y?" aidos-btn-disabled":"");return xn.default.createElement("button",{className:I,key:p.id,disabled:y||k,title:p.unavailableReason??p.label,"data-dsh-tip":"",onClick:()=>{d(p,h)}},k?"Checking\u2026":p.label)});return xn.default.createElement("div",{ref:a,className:"aidos-action-bar",style:c.length>0?{position:"relative"}:void 0},f,c.length>0?xn.default.createElement("button",{type:"button",ref:l,className:"aidos-btn",style:{marginLeft:"auto"},"aria-label":"More actions","aria-haspopup":"menu","aria-expanded":r,title:"More actions","data-dsh-tip":"",onClick:function(){s(!r)}},"\u22EF"):null,xn.default.createElement(Uf,{open:r,items:c,containerRef:a,triggerRef:l,onClose:function(){s(!1)}}))}var jn=de(require("react"),1);var $e=de(require("react"),1);async function qi(e,n,t,i){try{let o=i===void 0?void 0:i.map(s=>s.trim()).filter(s=>s!==""),r=await z("resolveApproval",{requestId:n,approved:t,...t&&o!==void 0?{paths:o}:{}},e);if(t){let s=o===void 0?0:o.length;_("Approved "+s+" path(s)","success")}else _("Request rejected","info");return r}catch(o){throw _(o instanceof J?o.message:String(o),"refusal"),o}}function Vf(e){if(e===null||typeof e!="object")return[];let n=e.created;return Array.isArray(n)?n.filter(t=>typeof t=="string"):[]}function qf(e,n){let t=new Set(n.map(i=>i.trim()).filter(i=>i!==""));return e.filter(i=>t.has(i))}function Ao(e){let[n,t]=$e.default.useState(null),[i,o]=$e.default.useState([]),[r,s]=$e.default.useState(!1),a=$e.default.useRef(!1),[l,d]=$e.default.useState(()=>zt());$e.default.useEffect(function(){return Xs(d)},[]),$e.default.useEffect(function(){if(zt()!==null)return;let h=!1;return z("pendingApproval",{ticketId:e.ticketId},e.agentId).then(y=>{if(h||zt()!==null)return;let k=y!==null&&typeof y=="object"&&!Array.isArray(y)?y:null,I=a.current;t(k),o(v=>_r(v,k?.payload?.paths,I))}).catch(()=>{}),function(){h=!0}},[e.ticketId,e.agentId]),$e.default.useEffect(function(){if(l===null)return;let h=a.current,y=el(l,e.ticketId),k=y===null?null:{id:y.id,ticketId:Number(y.ticketId),kind:y.kind,prompt:y.prompt,payload:y.payload??{},at:y.at};t(k),o(I=>_r(I,k?.payload?.paths,h))},[l,e.ticketId]);async function c(h){if(!(n===null||r)){s(!0);try{await qi(e.agentId,n.id,h,i),a.current=!1,t(null),e.onResolved?.()}finally{s(!1)}}}if(n===null)return null;let f=Vf(n.payload),p=qf(f,i);return $e.default.createElement("div",{className:"aidos-approval-card"},$e.default.createElement("div",{className:"aidos-approval-head"},$e.default.createElement("span",{className:"aidos-chip aidos-chip-kind aidos-chip-approval-kind"},$e.default.createElement("span",{className:"aidos-chip-key"},n.kind.toUpperCase())),$e.default.createElement("span",{className:"aidos-approval-prompt"},n.prompt)),$e.default.createElement("textarea",{className:"aidos-allowlist-input",value:i.join(`
`),disabled:r,onChange:h=>{a.current=!0,o(h.target.value.split(`
`))}}),p.length>0?$e.default.createElement("p",{className:"aidos-approval-created"},p.length===1?"1 path does not exist yet and will be created: ":p.length+" paths do not exist yet and will be created: ",p.join(", ")):null,$e.default.createElement("p",{className:"aidos-detail-note"},"Edit the list before approving if the proposal needs amending. The agent is told the outcome either way."),$e.default.createElement("div",{className:"aidos-form-actions"},$e.default.createElement("button",{className:"aidos-btn",disabled:r,onClick:()=>{c(!1)}},"Reject"),$e.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:r,onClick:()=>{c(!0)}},r?"Working\u2026":"Approve")))}var x=de(require("react"),1);var Hf=["builtin:user_signoff","builtin:user_verified","builtin:file_allowlist"],Gf="builtin:imported_state",Wf=new Set(["builtin:comment"]),Qf=new Set(["builtin:retired"]);function id(){let e=[],n=[];for(let t of ni){if(!t.allowedAuthors.includes("user")||t.id===Gf||Wf.has(t.id)||Qf.has(t.id))continue;let i={id:t.id,label:t.label,description:t.description};Hf.includes(t.id)?e.push(i):n.push(i)}return n.sort((t,i)=>t.id<i.id?-1:t.id>i.id?1:0),e.concat(n)}function od(e){if(e.trim()==="")return{ok:!0,payload:{}};let n;try{n=JSON.parse(e)}catch(t){return{ok:!1,error:"Payload is not valid JSON: "+(t instanceof Error?t.message:String(t))}}return typeof n!="object"||n===null||Array.isArray(n)?{ok:!1,error:"Payload must be a JSON object"}:{ok:!0,payload:n}}function Yf(e){return x.default.createElement(De,{title:e.title,working:e.working,onClose:e.onClose,onConfirm:e.onAttach,confirmLabel:"Attach"},e.children)}function tt(e){return x.default.createElement(yn,{label:e.label??"Note (optional)",value:e.note,working:e.working,onChange:e.onChange})}function rd(e){let n=e.split(`
`).map(t=>t.trim()).filter(t=>t!=="");return n.length===0?{ok:!1,error:"Add at least one line."}:{ok:!0,lines:n}}function ad(e){return x.default.createElement(x.default.Fragment,null,x.default.createElement("div",{className:"aidos-evidence-paste-zone",onPaste:n=>{let t=Array.from(n.clipboardData.files)[0];t&&e.onFile(t)},onDragOver:n=>{n.preventDefault()},onDrop:n=>{n.preventDefault();let t=Array.from(n.dataTransfer.files)[0];t&&e.onFile(t)},tabIndex:0},e.uploading?"Uploading\u2026":e.imagePath!==null?"Screenshot stored \u2014 paste again to replace.":"Paste or drop a screenshot here (optional)"),e.pasteError!==null?x.default.createElement("p",{className:"aidos-evidence-paste-error"},e.pasteError):null)}async function sd(e,n,t){let i={"content-type":n.type||"application/octet-stream","x-file-name":t,"x-session-id":e},o=await z("workspaceRoot",{},e).catch(()=>{}),r=o!==void 0&&typeof o=="object"&&!Array.isArray(o)&&typeof o.workspace=="string"?o.workspace:null;r!==null&&(i["x-workspace"]=r);let s=await fetch("/paste-to-path",{method:"POST",headers:i,body:n});if(!s.ok){let l=await s.json().catch(()=>{});throw new Error(l?.error??`paste upload failed (${s.status})`)}return(await s.json()).path}function vt(e){let[n,t]=x.default.useState(""),[i,o]=x.default.useState(null),[r,s]=x.default.useState(!1),[a,l]=x.default.useState(!1),[d,c]=x.default.useState(null);async function f(h){c(null),s(!0);try{let y=await sd(e.agentId,h,h.name||"pasted-image.png");o(y),_("Screenshot stored","success")}catch(y){c(y instanceof Error?y.message:String(y))}finally{s(!1)}}async function p(){if(!a){l(!0);try{let h={};n.trim()!==""&&(h.note=n.trim()),i!==null&&(h.imagePath=i),await z("userAttachEvidence",{ticketId:e.ticketId,kind:"builtin:user_verified",payload:h},e.agentId),_("Verified","success"),e.onAttached?.(),e.onClose()}catch(h){_(h instanceof J?h.message:String(h),"refusal")}finally{l(!1)}}}return x.default.createElement(Yf,{title:"Verify",working:a||r,onAttach:()=>{p()},onClose:e.onClose},x.default.createElement("p",{className:"aidos-modal-body"},"You verified this ticket hands-on. Paste (Ctrl+V) or drop a screenshot to attach it."),x.default.createElement(ad,{imagePath:i,uploading:r,pasteError:d,onFile:f}),x.default.createElement(tt,{note:n,working:a,onChange:t}))}function Zf(e){let[n,t]=x.default.useState([]),[i,o]=x.default.useState(null),[r,s]=x.default.useState(""),[a,l]=x.default.useState(!1);x.default.useEffect(function(){let c=!0;return z("userRecentCommits",{ticketId:e.ticketId},e.agentId).then(f=>{if(!c)return;let p=f?.commits;t(Array.isArray(p)?p:[])}).catch(f=>{c&&o(f instanceof J?f.message:String(f))}),()=>{c=!1}},[e.ticketId,e.agentId]);async function d(){if(!(a||r==="")){l(!0);try{await z("userAttachCommitEvidence",{ticketId:e.ticketId,hash:r,...e.note.trim()===""?{}:{note:e.note.trim()}},e.agentId),_("Commit evidence attached","success"),s(""),e.setNote(""),e.onAttached?.()}catch(c){_(c instanceof J?c.message:String(c),"refusal")}finally{l(!1)}}}return x.default.createElement("div",{className:"aidos-evidence-tailored"},x.default.createElement("div",{className:"aidos-modal-row"},x.default.createElement("label",null,"Recent commits"),i!==null?x.default.createElement("p",{className:"aidos-evidence-paste-error"},i):x.default.createElement("select",{className:"aidos-evidence-attach-kind-select",value:r,disabled:a,onChange:c=>{s(c.target.value)}},x.default.createElement("option",{value:""},n.length===0?"Loading commits\u2026":"Pick a commit\u2026"),n.map(c=>x.default.createElement("option",{value:c.hash,key:c.hash},c.hash+" "+c.subject+" \u2014 "+c.author)))),x.default.createElement(tt,{note:e.note,working:e.working||a,onChange:e.setNote,label:"Note (optional)"}),x.default.createElement("div",{className:"aidos-form-actions"},x.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:e.working||a||r==="",onClick:()=>{d()}},a?"Working\u2026":"Attach commit")))}function Jf(e){let[n,t]=x.default.useState(""),[i,o]=x.default.useState(""),[r,s]=x.default.useState(!1),a=rd(n);async function l(){if(!(r||!a.ok)){s(!0);try{let d={lines:a.lines};i.trim()!==""&&(d.note=i.trim()),await z("userAttachEvidence",{ticketId:e.ticketId,kind:"builtin:eval_criteria",payload:d},e.agentId),_("Evaluation criteria attached","success"),t(""),o(""),e.onAttached?.()}catch(d){_(d instanceof J?d.message:String(d),"refusal")}finally{s(!1)}}}return x.default.createElement("div",{className:"aidos-evidence-tailored"},x.default.createElement(et,{label:"Evaluation criteria (one per line)",value:n,working:r,placeholder:`Criterion 1
Criterion 2`,onChange:t}),x.default.createElement(tt,{note:i,working:r,onChange:o}),x.default.createElement("div",{className:"aidos-form-actions"},x.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:r||!a.ok,title:a.ok?void 0:a.error,"data-dsh-tip":"",onClick:()=>{l()}},r?"Working\u2026":"Attach")))}function Xf(e){let[n,t]=x.default.useState(""),[i,o]=x.default.useState(""),[r,s]=x.default.useState(!1);async function a(){if(!(r||n.trim()==="")){s(!0);try{let l={report:n.trim()};i.trim()!==""&&(l.note=i.trim()),await z("userAttachEvidence",{ticketId:e.ticketId,kind:"builtin:agent_report",payload:l},e.agentId),_("Agent report attached","success"),t(""),o(""),e.onAttached?.()}catch(l){_(l instanceof J?l.message:String(l),"refusal")}finally{s(!1)}}}return x.default.createElement("div",{className:"aidos-evidence-tailored"},x.default.createElement("div",{className:"aidos-modal-row"},x.default.createElement("label",null,"Report"),x.default.createElement("textarea",{className:"aidos-evidence-attach-note aidos-evidence-attach-tall",value:n,disabled:r,placeholder:"Describe the work performed\u2026",onChange:l=>{t(l.target.value)}})),x.default.createElement(tt,{note:i,working:r,onChange:o}),x.default.createElement("div",{className:"aidos-form-actions"},x.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:r||n.trim()==="",onClick:()=>{a()}},r?"Working\u2026":"Attach")))}function eh(e){let[n,t]=x.default.useState(""),[i,o]=x.default.useState(""),[r,s]=x.default.useState(""),[a,l]=x.default.useState(!1);async function d(){if(!(a||n.trim()===""||i==="")){l(!0);try{let c={command:n.trim(),result:i};r.trim()!==""&&(c.note=r.trim()),await z("userAttachEvidence",{ticketId:e.ticketId,kind:e.kind,payload:c},e.agentId),_(`${e.kind==="builtin:automated_check"?"Automated check":"Test run"} attached`,"success"),t(""),o(""),s(""),e.onAttached?.()}catch(c){_(c instanceof J?c.message:String(c),"refusal")}finally{l(!1)}}}return x.default.createElement("div",{className:"aidos-evidence-tailored"},x.default.createElement("div",{className:"aidos-modal-row"},x.default.createElement("label",null,"Command"),x.default.createElement("input",{type:"text",className:"aidos-command-input",value:n,disabled:a,placeholder:"npm run test",onChange:c=>{t(c.target.value)}})),x.default.createElement("div",{className:"aidos-modal-row"},x.default.createElement("label",null,"Result"),x.default.createElement("select",{className:"aidos-evidence-attach-kind-select",value:i,disabled:a,onChange:c=>{o(c.target.value)}},x.default.createElement("option",{value:""},"Choose a result\u2026"),x.default.createElement("option",{value:"pass"},"Pass"),x.default.createElement("option",{value:"fail"},"Fail"))),x.default.createElement(tt,{note:r,working:a,onChange:s}),x.default.createElement("div",{className:"aidos-form-actions"},x.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:a||n.trim()===""||i==="",onClick:()=>{d()}},a?"Working\u2026":"Attach")))}function nh(e){let[n,t]=x.default.useState(null),[i,o]=x.default.useState(""),[r,s]=x.default.useState(!1),[a,l]=x.default.useState(!1),[d,c]=x.default.useState(null);async function f(h){c(null),s(!0);try{let y=await sd(e.agentId,h,h.name||"pasted-image.png");t(y),_("Screenshot stored","success")}catch(y){c(y instanceof Error?y.message:String(y))}finally{s(!1)}}async function p(){if(!(a||n===null)){l(!0);try{let h={imagePath:n};i.trim()!==""&&(h.note=i.trim()),await z("userAttachEvidence",{ticketId:e.ticketId,kind:"builtin:after_shot",payload:h},e.agentId),_("After shot attached","success"),t(null),o(""),e.onAttached?.()}catch(h){_(h instanceof J?h.message:String(h),"refusal")}finally{l(!1)}}}return x.default.createElement("div",{className:"aidos-evidence-tailored"},x.default.createElement(ad,{imagePath:n,uploading:r,pasteError:d,onFile:f}),x.default.createElement(tt,{note:i,working:a,onChange:o}),x.default.createElement("div",{className:"aidos-form-actions"},x.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:a||r||n===null,onClick:()=>{p()}},a?"Working\u2026":"Attach")))}function th(e){let[n,t]=x.default.useState(""),[i,o]=x.default.useState(""),[r,s]=x.default.useState(""),[a,l]=x.default.useState(!1);async function d(I,v){if(!a){l(!0);try{await z("userAttachEvidence",{ticketId:e.ticketId,kind:I,payload:v},e.agentId),_("Evidence attached","success"),t(""),o(""),s(""),e.onAttached()}catch(P){_(P instanceof J?P.message:String(P),"refusal")}finally{l(!1)}}}async function c(I){if(!a){l(!0);try{await z("userGrantAllowlist",{ticketId:e.ticketId,paths:I},e.agentId),_("Allowlist granted","success"),t(""),o(""),s(""),e.onAttached()}catch(v){_(v instanceof J?v.message:String(v),"refusal")}finally{l(!1)}}}if(e.kind==="builtin:file_allowlist"){let I=rd(i);return x.default.createElement("div",{className:"aidos-evidence-tailored"},x.default.createElement(et,{label:"Allowed paths (one per line)",value:i,working:a,placeholder:`src/client/
src/host/aidos-core.ts`,onChange:o}),x.default.createElement(tt,{note:n,working:a,onChange:t}),x.default.createElement("div",{className:"aidos-form-actions"},x.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:a||!I.ok,title:I.ok?void 0:I.error,"data-dsh-tip":"",onClick:()=>{I.ok&&c(I.lines??[])}},a?"Working\u2026":"Attach")))}if(e.kind==="builtin:eval_criteria")return x.default.createElement(Jf,{ticketId:e.ticketId,agentId:e.agentId,onAttached:e.onAttached});if(e.kind==="builtin:agent_report")return x.default.createElement(Xf,{ticketId:e.ticketId,agentId:e.agentId,onAttached:e.onAttached});if(e.kind==="builtin:automated_check"||e.kind==="builtin:test_run")return x.default.createElement(eh,{ticketId:e.ticketId,agentId:e.agentId,kind:e.kind,onAttached:e.onAttached});if(e.kind==="builtin:after_shot")return x.default.createElement(nh,{ticketId:e.ticketId,agentId:e.agentId,onAttached:e.onAttached});if(e.kind==="builtin:user_commit")return x.default.createElement(Zf,{ticketId:e.ticketId,agentId:e.agentId,onAttached:e.onAttached,note:n,setNote:t,working:a});let p={"builtin:review_pass":"What was reviewed, and why it is accepted","builtin:review_fail":"The verdict and the findings","builtin:review_note":"Note"}[e.kind];if(p!==void 0)return x.default.createElement("div",{className:"aidos-evidence-tailored"},x.default.createElement(tt,{note:n,working:a,onChange:t,label:p}),x.default.createElement("div",{className:"aidos-form-actions"},x.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:a||n.trim()==="",onClick:()=>{d(e.kind,{note:n.trim()})}},a?"Working\u2026":"Attach")));let h=od(r),y=h.ok?h.payload:{},k=h.ok?null:h.error;return x.default.createElement("div",{className:"aidos-evidence-tailored"},x.default.createElement(fl,{summary:"Raw JSON (optional object)",defaultOpen:!1},x.default.createElement("div",{className:"aidos-modal-row"},x.default.createElement("textarea",{className:"aidos-evidence-attach-note",value:r,disabled:a,placeholder:`{
  "custom": "value"
}`,onChange:I=>{s(I.target.value)}})),k!==null?x.default.createElement("p",{className:"aidos-evidence-paste-error"},k):null),x.default.createElement(tt,{note:n,working:a,onChange:t}),x.default.createElement("div",{className:"aidos-form-actions"},x.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:a||k!==null,onClick:()=>{let I=n.trim()===""?y:{...y,note:n.trim()};d(e.kind,I)}},a?"Working\u2026":"Attach")))}function ld(e){let n=id(),[t,i]=x.default.useState(n.length>0?n[0].id:""),[o,r]=x.default.useState(null),s=n.filter(a=>a.id!=="builtin:user_signoff"&&a.id!=="builtin:user_verified");return x.default.createElement("div",{className:"aidos-evidence-attach"},x.default.createElement("div",{className:"aidos-modal-row"},x.default.createElement("label",null,"Other evidence kinds"),x.default.createElement("select",{className:"aidos-evidence-attach-kind-select",value:t,onChange:a=>{i(a.target.value)}},s.map(a=>x.default.createElement("option",{value:a.id,key:a.id},a.label)))),x.default.createElement(th,{ticketId:e.ticketId,agentId:e.agentId,kind:t,onAttached:()=>e.onAttached?.()}))}var it=de(require("react"),1);function mi(e){let[n,t]=it.default.useState(!1),[i,o]=it.default.useState(""),[r,s]=it.default.useState(()=>(e.proposedPaths??[]).join(`
`));if(it.default.useEffect(function(){e.open&&le("signoff dialog opened")},[e.open]),!e.open)return null;async function a(){if(n)return;t(!0);let l=ui(r);try{await z("userAttachEvidence",{ticketId:e.ticketId,kind:"builtin:user_signoff",payload:i.trim()===""?{}:{note:i.trim()}},e.agentId);let d=null;if(l.length>0)try{await z("userGrantAllowlist",{ticketId:e.ticketId,paths:l},e.agentId)}catch(c){d=c instanceof Error?c.message:String(c)}await z("userMoveTicket",{ticketId:e.ticketId,to:"in_progress"},e.agentId),d===null?_(l.length>0?"Signed off \u2014 "+l.length+" path(s) granted":"Signed off","success"):_("Signed off and moved, but the allowlist was refused: "+d+" \u2014 set the paths from the ticket's allowlist editor","refusal"),e.onClose(),e.onSignedOff()}catch(d){d instanceof J?_(d.message,"refusal"):_(String(d),"refusal")}finally{t(!1)}}return it.default.createElement(De,{title:"Sign off ticket",working:n,onClose:e.onClose,onConfirm:a,confirmLabel:"Confirm"},it.default.createElement("p",{className:"aidos-modal-body"},"Signoff moves this to in progress and grants the agent write access inside the allowlist below. Signoff alone grants access to nothing, so name the files here \u2014 or leave it empty and scope them later."),it.default.createElement(yn,{label:"Note (optional \u2014 rides the signoff row)",value:i,working:n,onChange:o}),it.default.createElement(et,{label:"Files the agent may write (one per line, optional)",value:r,working:n,onChange:s}))}var ih={signoff:"Sign off",verify:"Verify","mark-done":"Open on board"};function dd(e){return e==="signoff"||e==="verify"||e==="mark-done"}function oh(e,n,t){if(t==="mark-done")return null;let i=Bt(e,n).find(o=>o.id===t);return i===void 0?"unknown action "+t:i.unavailableReason===void 0?null:i.label+" is not available \u2014 "+i.unavailableReason}async function rh(e,n,t){if(t==="mark-done")return null;let i=await z("workspaceTickets",{},e),o=Array.isArray(i)?i:i.tickets??[],r=Array.isArray(i)?{}:i.evidence??{},s=o.find(l=>ee(l)===n)??null;if(s===null)return"#"+n+" is not on this board (it may belong to another session)";let a=(r[n]??[]).map(l=>l.kind).filter(l=>typeof l=="string");return oh(s,a,t)}async function cd(e,n,t){let i=await z("workspaceTickets",{},e),o=Array.isArray(i)?i:i.tickets??[],r=Array.isArray(i)?{}:i.evidence??{},s=o.find(d=>ee(d)===n)??null;if(s===null)return"#"+n+" is not on this board (it may belong to another session)";let a=ee(s),l=[...r[n]??[],...r[a]??[]].map(d=>d.kind).filter(d=>typeof d=="string");return Us(s,l,t)}function ud(e){let[n,t]=jn.default.useState(null),[i,o]=jn.default.useState(!1);function r(){if(e.actionId==="mark-done"){Jn(e.sessionId,e.boardKey),Oi(e.boardKey),_("Opening "+e.boardKey+" \u2014 see the Tickets tab","info");return}if(i)return;let l=e.actionId;o(!0),rh(e.sessionId,e.boardKey,l).then(d=>{if(d!==null){_(d,"refusal");return}t(l)}).catch(d=>{_(d instanceof J?d.message:String(d),"refusal")}).finally(()=>{o(!1)})}let s=ih[e.actionId],a=e.title??ho(e.sessionId,e.boardKey)??e.boardKey;return jn.default.createElement(jn.default.Fragment,null,jn.default.createElement("button",{type:"button",className:"tool-render-approval-btn tool-render-approval-approve",disabled:i,onClick:r},i?"Checking\u2026":s),n==="signoff"?jn.default.createElement(mi,{open:!0,ticketId:e.boardKey,ticketTitle:a,agentId:e.sessionId,onClose:()=>{t(null)},onSignedOff:()=>{t(null)}}):null,n==="verify"?jn.default.createElement(vt,{ticketId:e.boardKey,agentId:e.sessionId,onClose:()=>{t(null)}}):null)}function pd(e){return jn.default.createElement("div",{className:"aidos-inline-approval"},jn.default.createElement(Ao,{ticketId:e.boardKey,agentId:e.sessionId}))}var Qe=de(require("react"),1);var ah=[];function fd(e){let n=e.comments??ah,[t,i]=Qe.default.useState(""),[o,r]=Qe.default.useState(!1);Qe.default.useEffect(function(){le("comments section mounted")},[]);let s=[...n].sort((d,c)=>c.at-d.at);async function a(){if(!o&&t.trim()!==""){r(!0);try{await z("userAddComment",{ticketId:e.ticketId,text:t},e.agentId),i(""),_("Comment added","success")}catch(d){d instanceof J?_(d.message,"refusal"):_(String(d),"refusal")}finally{r(!1)}}}let l=s.map((d,c)=>{let f=new Date(d.at*1e3).toLocaleString();return Qe.default.createElement("div",{className:"aidos-comment",key:c},Qe.default.createElement("div",null,Qe.default.createElement("span",{className:"aidos-evidence-author"},d.author)),Qe.default.createElement("p",{className:"aidos-detail-body"},d.text),Qe.default.createElement("p",{className:"aidos-detail-note"},f))});return Qe.default.createElement("details",{className:"aidos-panel",open:n.length!==1},Qe.default.createElement("summary",{className:"aidos-panel-head"},Qe.default.createElement("h4",{className:"aidos-panel-title"},"Comments")),Qe.default.createElement("div",{className:"aidos-panel-body"},l.length===0?Qe.default.createElement("p",{className:"aidos-detail-note"},"No comments yet."):l,Qe.default.createElement("textarea",{className:"aidos-comment-textarea",value:t,placeholder:"Add a comment. Ctrl+Enter sends.",onChange:d=>{i(d.target.value)},onKeyDown:d=>{d.ctrlKey&&d.key==="Enter"&&(d.preventDefault(),a())}}),Qe.default.createElement("div",{className:"aidos-form-actions"},Qe.default.createElement("button",{className:"aidos-comment-send",disabled:o||t.trim()==="",onClick:a},"Send"))))}var je=de(require("react"),1);var sh=1024,Io=new Map;function Un(e){let n=String(e.ticket.id),t=Io.get(n);if(t!==void 0&&lh(t.props,e))return t.element;let i=dh(e);return Io.size>=sh&&Io.clear(),Io.set(n,{props:e,element:i}),i}function lh(e,n){let t=e.ticket,i=n.ticket;return t.id===i.id&&t.title===i.title&&t.state===i.state&&t.slug===i.slug&&t.workspaceKey===i.workspaceKey&&(t.gatePresent??null)===(i.gatePresent??null)&&(t.gateTotal??null)===(i.gateTotal??null)&&(t.criteria??null)===(i.criteria??null)&&(e.showState??null)===(n.showState??null)&&e.meta===n.meta&&e.actions===n.actions&&e.actionIcon===n.actionIcon&&(e.actionHint??null)===(n.actionHint??null)&&(e.expanded??!1)===(n.expanded??!1)&&(e.working??!1)===(n.working??!1)&&(e.highlighted??!1)===(n.highlighted??!1)&&(e.awaitingApproval??!1)===(n.awaitingApproval??!1)}function dh(e){let n=e.ticket,t=Le(n),i="aidos-ticket-strip"+(e.highlighted===!0?" aidos-ticket-strip-highlighted":"")+(e.working===!0?" aidos-ticket-strip-working":""),o=n.gatePresent!==void 0||n.gateTotal!==void 0;return je.default.createElement("li",{className:i},je.default.createElement("div",{className:"aidos-ticket-strip-main"},je.default.createElement("span",{className:"aidos-ticket-strip-idcol"},je.default.createElement("span",{className:"aidos-chip aidos-chip-id",style:{"--chip-hue":Fn(t)},title:t,"data-dsh-tip":""},Zn(n)),e.showState===!1?null:je.default.createElement("span",{className:ft(n.state),title:cn(n.state),"data-dsh-tip":""},cn(n.state))),je.default.createElement("span",{className:"aidos-ticket-strip-body"},je.default.createElement("span",{className:"aidos-ticket-strip-title",title:n.title,"data-dsh-tip":""},n.title),e.meta!==void 0?je.default.createElement("span",{className:"aidos-ticket-strip-meta"},e.meta):null),je.default.createElement("span",{className:"aidos-ticket-strip-chips"},e.awaitingApproval===!0?je.default.createElement("span",{className:"aidos-chip aidos-chip-awaiting-approval",title:"This ticket has a request waiting for your approval","data-dsh-tip":""},"Needs approval"):null,o?(()=>{let r=ht(n.gatePresent??null,n.gateTotal??null,Kn(n)),s=`Gate: ${r} of the required evidence is attached`,a=so(n.gatePresent??null,n.gateTotal??null,Kn(n));return je.default.createElement("span",{className:"aidos-chip aidos-chip-metric aidos-chip-gate"+(a?" aidos-chip-fail":""),"aria-label":s,title:s,"data-dsh-tip":""},je.default.createElement("span",{className:"aidos-chip-key"},je.default.createElement(si,null)),je.default.createElement("span",{className:"aidos-chip-value"},r))})():null),je.default.createElement("span",{className:"aidos-ticket-strip-actions"},e.onOpen!==void 0?je.default.createElement("button",{className:"aidos-icon-btn",title:"Open "+t,"data-dsh-tip":"","aria-label":"Open "+t,disabled:e.working===!0,onClick:r=>{r.stopPropagation(),e.onOpen?.()}},je.default.createElement(mt,null)):null,e.actionIcon!==void 0?je.default.createElement("button",{className:"aidos-strip-action-toggle"+(e.expanded===!0?" is-open":""),title:e.actionHint??"Show actions","data-dsh-tip":"","aria-label":e.actionHint??"Show actions","aria-expanded":e.expanded===!0,disabled:e.working===!0,onClick:r=>{r.stopPropagation(),e.onToggleActions?.()}},e.actionIcon):null)),e.expanded===!0&&e.actions!==void 0?je.default.createElement("div",{className:"aidos-ticket-strip-actionrow"},e.actions):null)}var qt=de(require("react"),1);function hd(e){let[n,t]=qt.default.useState(""),[i,o]=qt.default.useState(!1);if(qt.default.useEffect(function(){e.open&&le("send back modal opened")},[e.open]),!e.open)return null;async function r(){if(!i){o(!0);try{await z("userAddComment",{ticketId:e.ticketId,text:n.trim()},e.agentId),await z("userMoveTicket",{ticketId:e.ticketId,to:"in_progress"},e.agentId),_("Sent back","success"),e.onClose(),e.onSentBack()}catch(s){s instanceof J?_(s.message,"refusal"):_(String(s),"refusal")}finally{o(!1)}}}return qt.default.createElement(De,{title:"Send back",working:i,onClose:e.onClose,onConfirm:r,confirmLabel:"Send back"},qt.default.createElement("p",{className:"aidos-modal-body"},"Send the ticket back to in progress. The reason attaches as a comment."),qt.default.createElement(yn,{label:"Reason",value:n,working:i,onChange:t}))}var oe=de(require("react"),1);function No(e){let[n,t]=oe.default.useState(1),[i,o]=oe.default.useState(""),[r,s]=oe.default.useState(!1),[a,l]=oe.default.useState(null),[d,c]=oe.default.useState(!1),[f,p]=oe.default.useState(null);if(oe.default.useEffect(function(){e.open&&le("mark done modal opened")},[e.open]),!e.open)return null;let y=!e.evidence.some(v=>v.kind==="builtin:user_verified")&&!d,k=e.ticket.criteria.split(`
`).map(v=>v.trim()).filter(v=>v.length>0);async function I(){if(!r){s(!0);try{i.trim()!==""&&await z("userAddComment",{ticketId:e.ticketId,text:i},e.agentId),await z("userMoveTicket",{ticketId:e.ticketId,to:"done"},e.agentId),_("Marked done","success"),e.onClose(),e.onMarkedDone()}catch(v){v instanceof J?_(v.message,"refusal"):_(String(v),"refusal")}finally{s(!1)}}}return y&&f===null?oe.default.createElement(De,{title:"Mark done",working:r,onClose:e.onClose},oe.default.createElement("div",{className:"aidos-modal-form"},oe.default.createElement("p",{className:"aidos-modal-body"},"This ticket has no verification row yet. Marking it done needs your hands-on check first \u2014 verify it, and the row you attach is what this close stands on."),oe.default.createElement("div",{className:"aidos-form-actions"},oe.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:r,onClick:()=>{p("verify")}},"Verify now"),oe.default.createElement("button",{className:"aidos-btn",disabled:r,title:"Close with no verification row behind it","data-dsh-tip":"",onClick:()=>{p("force")}},"Force without verification")))):y&&f==="verify"?oe.default.createElement(vt,{ticketId:e.ticketId,agentId:e.agentId,onAttached:()=>{c(!0),p(null)},onClose:()=>{p(null)}}):y&&f==="force"?oe.default.createElement(De,{title:"Mark done",working:r,onClose:e.onClose},oe.default.createElement("div",{className:"aidos-modal-form"},oe.default.createElement("p",{className:"aidos-modal-body"},"Forcing closes this ticket with NO verification row behind it. The board will show it done with nothing verified \u2014 choose this only when the check genuinely does not apply."),oe.default.createElement(yn,{label:"Final comment (optional)",value:i,working:r,onChange:o}),oe.default.createElement("div",{className:"aidos-form-actions"},oe.default.createElement("button",{className:"aidos-btn",disabled:r,onClick:()=>{p(null)}},"Back"),oe.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:r,onClick:I},r?"Working\u2026":"Force mark done")))):oe.default.createElement(De,{title:"Mark done",working:r,onClose:e.onClose},a===null?null:oe.default.createElement(bt,{row:a,onClose:()=>{l(null)}}),n===1?oe.default.createElement("div",{className:"aidos-modal-form"},oe.default.createElement("p",{className:"aidos-modal-body"},"The ticket criteria, with their evidence:"),k.length===0?oe.default.createElement("p",{className:"aidos-detail-note"},"No criteria on this ticket."):oe.default.createElement(yo,{criteria:k,evidence:e.evidence,ticketIdKey:String(e.ticketId),agentId:e.agentId,onChanged:()=>{}}),oe.default.createElement("div",{className:"aidos-form-actions"},oe.default.createElement("button",{className:"aidos-btn aidos-btn-primary",onClick:()=>{t(2)}},"Continue"))):oe.default.createElement("div",{className:"aidos-modal-form"},oe.default.createElement("p",{className:"aidos-modal-body"},"The evidence on this ticket:"),e.evidence.length===0?oe.default.createElement("p",{className:"aidos-detail-note"},"No evidence rows yet."):oe.default.createElement("ul",{className:"aidos-evidence-list"},e.evidence.map((v,P)=>oe.default.createElement(En,{key:String(v.at??P)+":"+v.kind,row:v,onView:l,criterionLabel:typeof v.payload.criteria=="string"&&v.payload.criteria.trim()!==""?v.payload.criteria:void 0}))),oe.default.createElement(yn,{label:"Final comment (optional)",value:i,working:r,onChange:o}),oe.default.createElement("div",{className:"aidos-form-actions"},oe.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:r,onClick:I},r?"Working\u2026":"Confirm"))))}var ce=de(require("react"),1);function ch(e){return new Date(e*1e3).toLocaleString()}function gd(e){let[n,t]=ce.default.useState(null),[i,o]=ce.default.useState(null),[r,s]=ce.default.useState(null),[a,l]=ce.default.useState(null),d=ce.default.useCallback(function(){o(null),z("retiredTickets",{},e.sessionId).then(f=>{let p=f.tickets??[];t(p)}).catch(f=>{o(f instanceof Error?f.message:String(f))})},[e.sessionId]);ce.default.useEffect(function(){le("retired panel opened"),d()},[d]);async function c(f){let p=ee(f);if(r===null){s(p);try{await z("userUnretireTicket",{ticketId:p},e.sessionId),_("Un-retired \u2014 the ticket is back on the board","success"),d()}catch(h){h instanceof J?_(h.message,"refusal"):_(String(h),"refusal")}finally{s(null)}}}return i!==null?ce.default.createElement("div",{className:"aidos-retired-panel"},ce.default.createElement("p",{className:"aidos-retired-error"},"The retired list could not be read: ",i),ce.default.createElement("button",{className:"aidos-btn",onClick:d},"Retry")):n===null?ce.default.createElement("div",{className:"aidos-retired-panel",role:"status"},ce.default.createElement("span",{className:"aidos-merge-spinner","aria-hidden":"true"}),ce.default.createElement("span",{className:"aidos-retired-empty"},"Loading retired tickets\u2026")):n.length===0?ce.default.createElement("div",{className:"aidos-retired-panel"},ce.default.createElement("p",{className:"aidos-retired-empty"},"Nothing is retired. Retired tickets are hidden from the board, the queue and the agent's reads \u2014 they appear here until un-retired.")):ce.default.createElement("ul",{className:"aidos-retired-panel"},n.map(f=>{let p=ee(f),h=f.retirement,y=h.reason??"(no reason given)",k=h.supersededByTickets,I=h.chainTerminals.filter(v=>!h.supersededBy.includes(v));return ce.default.createElement(Un,{key:p,ticket:f,working:r===p,expanded:a===p,onToggleActions:()=>{l(a===p?null:p)},actionIcon:ce.default.createElement(Bs,null),actionHint:"Un-retire this ticket",actions:ce.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:r===p,title:"Puts the ticket back on the board exactly as it was","data-dsh-tip":"",onClick:()=>{c(f)}},"Un-retire"),onOpen:e.onOpen===void 0?void 0:()=>e.onOpen?.(p),meta:ce.default.createElement(ce.default.Fragment,null,ce.default.createElement("span",{title:y,"data-dsh-tip":""},y),ce.default.createElement("span",null," \u2014 by ",h.author," \xB7 ",ch(h.at)),k.length>0?ce.default.createElement("span",{className:"aidos-retired-supersede"},k.map(v=>v.known?`#${v.id} ${v.title}`:v.ref).join(", ")):null,I.length>0?ce.default.createElement("span",{className:"aidos-retired-supersede"},"chain ends at ",I.join(", ")):null,h.chainCycle?ce.default.createElement("span",{className:"aidos-retired-supersede"},"supersede cycle cut here"):null)})}))}function md(e){let[n,t]=ce.default.useState(!1),[i,o]=ce.default.useState(""),[r,s]=ce.default.useState("");if(ce.default.useEffect(function(){e.open&&le("retire dialog opened")},[e.open]),!e.open)return null;async function a(){if(n)return;t(!0);let l=ui(r);try{await z("userRetireTicket",{ticketId:e.ticketId,...i.trim()===""?{}:{reason:i.trim()},...l.length>0?{supersededBy:l}:{}},e.agentId),_("Retired \u2014 hidden from the board until un-retired","success"),e.onClose(),e.onRetired()}catch(d){d instanceof J?_(d.message,"refusal"):_(String(d),"refusal")}finally{t(!1)}}return ce.default.createElement(De,{title:"Retire ticket",working:n,onClose:e.onClose,onConfirm:a,confirmLabel:"Retire"},ce.default.createElement("p",{className:"aidos-modal-body"},`Retiring "${e.ticketTitle}" hides it from the board grid, the filter counts, the tab badge, the human queue, the plan render and the agent's board reads. Nothing is deleted: the Retired panel lists it, and un-retiring restores it exactly as it was.`),ce.default.createElement(yn,{label:"Reason (optional \u2014 the panel shows it)",value:i,working:n,onChange:o}),ce.default.createElement(et,{label:"Superseded by (one ticket reference per line, optional) \u2014 where the work went, e.g. workspace-key:12",value:r,working:n,onChange:s}))}var uh=800;function bi(e){e instanceof J?_(e.message,"refusal"):_(String(e),"refusal")}async function ph(e,n){await z("userMoveTicket",{ticketId:n,to:"awaiting_verification"},e),_("Submitted for review","success")}function fh(e){let[n,t]=w.default.useState(!1),[i,o]=w.default.useState(""),[r,s]=w.default.useState(!1),[a,l]=w.default.useState(!1),d=e.ticket.description,c=d.trim()==="",f=d.length>uh,p=f&&!a,h=c?"":Ro(d);async function y(){if(!r){s(!0);try{await z("userSetTicket",{ticketId:e.ticketIdKey,description:i},e.agentId),_("Description saved","success"),t(!1),e.onSaved()}catch(v){bi(v)}finally{s(!1)}}}function k(){o(d),t(!1)}let I;return n?I=w.default.createElement(w.default.Fragment,null,w.default.createElement("textarea",{value:i,disabled:r,onChange:v=>{o(v.target.value)}}),w.default.createElement("div",{className:"aidos-form-actions"},w.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:r,onClick:()=>{y()}},"Save"),w.default.createElement("button",{className:"aidos-btn",disabled:r,onClick:k},"Cancel"))):c?I=w.default.createElement("p",{className:"aidos-detail-note"},"No description."):I=w.default.createElement(w.default.Fragment,null,w.default.createElement("div",{className:"aidos-md"+(p?" aidos-md-clipped":""),dangerouslySetInnerHTML:{__html:h}}),f?w.default.createElement("button",{className:"aidos-md-more",onClick:()=>{l(!a)}},a?"Show less":"Show more"):null),w.default.createElement("details",{className:"aidos-panel",open:!0},w.default.createElement("summary",{className:"aidos-panel-head"},w.default.createElement("span",{className:"aidos-panel-title"},"Description"),w.default.createElement("button",{className:"aidos-icon-btn",title:"Edit","data-dsh-tip":"","aria-label":"Edit description",onClick:v=>{v.preventDefault(),v.stopPropagation(),o(d),t(!0)}},w.default.createElement(Tn,null))),w.default.createElement("div",{className:"aidos-panel-body"},I))}function hh(e){let[n,t]=w.default.useState(e.line);return w.default.createElement("span",{className:"aidos-criterion-row"},w.default.createElement("input",{type:"text",value:n,disabled:e.saving,onChange:i=>{t(i.target.value)},onKeyDown:i=>{i.key==="Enter"&&(i.preventDefault(),e.onSave(n))}}),w.default.createElement("span",{className:"aidos-criterion-actions"},w.default.createElement("button",{className:"aidos-btn",disabled:e.saving,onClick:()=>{e.onSave(n)}},"Save"),w.default.createElement("button",{className:"aidos-btn",disabled:e.saving,onClick:e.onCancel},"Cancel")))}function gh(e){let[n,t]=w.default.useState(null),[i,o]=w.default.useState(!1),[r,s]=w.default.useState(""),a=lr(e.ticket.criteria),l=Ga(e.ticket.criteria,e.evidence),d=new Set(l),c=a.length-l.length;async function f(k){if(i)return!1;o(!0);try{return await z("userSetTicket",{ticketId:e.ticketIdKey,criteria:k.join(`
`)},e.agentId),_("Criteria saved","success"),t(null),e.onSaved(),!0}catch(I){return bi(I),!1}finally{o(!1)}}function p(k,I){let v=a.slice();v[k]=I,f(v)}function h(k){let I=a.slice();I.splice(k,1),f(I)}async function y(){let k=r.trim();if(k==="")return;await f(a.concat([k]))&&s("")}return w.default.createElement("details",{className:"aidos-panel"},w.default.createElement("summary",{className:"aidos-panel-head"},w.default.createElement("span",{className:"aidos-panel-title"},"Criteria "+c+"/"+a.length)),w.default.createElement("div",{className:"aidos-panel-body"},a.length===0?w.default.createElement("p",{className:"aidos-detail-note"},"No criteria yet \u2014 add the first one below."):null,w.default.createElement("ul",{className:"aidos-criteria"},a.map((k,I)=>w.default.createElement("li",{key:I+":"+k,className:d.has(k)?"aidos-criterion aidos-criterion-uncovered":"aidos-criterion"},n===I?w.default.createElement(hh,{line:k,saving:i,onSave:v=>{p(I,v.trim())},onCancel:()=>{t(null)}}):w.default.createElement("span",{className:"aidos-criterion-row"},d.has(k)?w.default.createElement("span",{className:"aidos-criterion-warn",title:"No evidence covers this criterion yet","data-dsh-tip":"","aria-label":"Uncovered criterion"},w.default.createElement(zs,null)):null,w.default.createElement("span",{className:"aidos-criterion-text"},k),w.default.createElement("span",{className:"aidos-criterion-actions"},w.default.createElement("button",{className:"aidos-icon-btn",title:"Edit","data-dsh-tip":"","aria-label":"Edit criterion "+(I+1),onClick:()=>{t(I)}},w.default.createElement(Tn,null)),w.default.createElement("button",{className:"aidos-icon-btn",title:"Delete","data-dsh-tip":"","aria-label":"Delete criterion "+(I+1),disabled:i,onClick:()=>{h(I)}},w.default.createElement(Ds,null)))),n!==I?w.default.createElement("ul",{className:"aidos-criterion-linked"},e.evidence.filter(v=>wo(v)===k).map(v=>w.default.createElement("li",{className:"aidos-criterion-linked-row",key:String(v.at)+":"+v.kind},w.default.createElement(En,{row:v,onView:e.onViewEvidence,deleting:e.deletingAt===v.at})))):null)),w.default.createElement("li",{className:"aidos-criteria-add"},w.default.createElement("input",{type:"text",value:r,disabled:i,placeholder:"Add a criterion",onChange:k=>{s(k.target.value)},onKeyDown:k=>{k.key==="Enter"&&(k.preventDefault(),y())}}),w.default.createElement("button",{className:"aidos-btn",disabled:i||r.trim()==="",onClick:()=>{y()}},"Add")))))}function _o(e){return e.workspaceKey+":"+e.ticketId}function mh(e){let n=e.depRef,t=n.includes(":")?n:(e.workspaceKey??"")+":"+n,i=e.ticketsByKey?.get(t)??e.ticketsByKey?.get(n),o=i===void 0||e.onJump===void 0?void 0:()=>{e.onJump?.(ee(i))};return i===void 0?w.default.createElement("li",{className:"aidos-ticket-strip"},w.default.createElement("div",{className:"aidos-ticket-strip-main"},w.default.createElement("span",{className:"aidos-chip aidos-chip-dep",title:n,"data-dsh-tip":""},Lt(n)),w.default.createElement("span",{className:"aidos-ticket-strip-body"},w.default.createElement("span",{className:"aidos-ticket-strip-title aidos-dep-card-unknown"},"not on this board"),w.default.createElement("span",{className:"aidos-ticket-strip-meta"},n)))):w.default.createElement(Un,{ticket:i,meta:"depends on "+Lt(n),onOpen:o})}function bh(e){let[n,t]=w.default.useState(""),[i,o]=w.default.useState(null),[r,s]=w.default.useState(!1),[a,l]=w.default.useState(null),d=e.dependsOn??[];async function c(){if(!r){if(n.trim()===""){o([]);return}s(!0);try{let p=await z("searchTickets",{query:n},e.agentId),h=Array.isArray(p)?p:[];o(h)}catch(p){bi(p),o(null)}finally{s(!1)}}}async function f(p){if(a===null){if(d.includes(p)){_("Already a dependency","info");return}l(p);try{await z("userSetTicket",{ticketId:e.ticketId,dependsOn:[...new Set([...d,p])]},e.agentId),_("Dependency added","success"),e.onSaved()}catch(h){bi(h)}finally{l(null)}}}return w.default.createElement("details",{className:"aidos-panel"},w.default.createElement("summary",{className:"aidos-panel-head"},w.default.createElement("span",{className:"aidos-panel-title"},"Dependencies")),w.default.createElement("div",{className:"aidos-panel-body"},d.length===0?w.default.createElement("p",{className:"aidos-detail-note"},"No dependencies."):w.default.createElement("ul",{className:"aidos-ticket-strips"},d.map(p=>w.default.createElement(mh,{key:p,depRef:p,agentId:e.agentId,ticketsByKey:e.ticketsByKey,onJump:e.onJump,workspaceKey:e.workspaceKey}))),w.default.createElement("div",{className:"aidos-dep-search"},w.default.createElement("input",{className:"aidos-dep-search-input",value:n,placeholder:"Search tickets",onChange:p=>{t(p.target.value)},onKeyDown:p=>{p.key==="Enter"&&(p.preventDefault(),c())}}),w.default.createElement("button",{className:"aidos-btn",disabled:r,onClick:()=>{c()}},"Search")),i!==null?w.default.createElement("div",{className:"aidos-dep-results"},i.length===0?w.default.createElement("p",{className:"aidos-detail-note"},"No matches."):i.map(p=>w.default.createElement("button",{key:_o(p),className:"aidos-dep-result",disabled:a!==null,onClick:()=>{f(_o(p))},title:_o(p),"data-dsh-tip":""},w.default.createElement("span",{className:"aidos-suggestion-title"},p.title),w.default.createElement("span",{className:"aidos-chip aidos-chip-id"},Lt(_o(p)))))):null))}function wh(e){let[n,t]=w.default.useState({});return w.default.useEffect(function(){let i=!0;return z("reviewStandings",{ticketId:e.ticketIdKey},e.agentId).then(o=>{if(!i)return;let r=o?.rows,s={};for(let a of Array.isArray(r)?r:[])s[String(a.at)+":"+a.kind]={standing:a.standing,reason:a.reason};t(s)}).catch(()=>{i&&t({})}),()=>{i=!1}},[e.ticketIdKey,e.agentId,e.evidence.length]),w.default.createElement("details",{className:"aidos-panel",open:!e.evidenceCollapsed,onToggle:i=>{i.target.open===e.evidenceCollapsed&&e.onToggleEvidence()}},w.default.createElement("summary",{className:"aidos-panel-head"},w.default.createElement("span",{className:"aidos-panel-title"},"Evidence")),w.default.createElement("div",{className:"aidos-panel-body"},e.evidence.length===0?w.default.createElement("p",{className:"aidos-detail-note"},"No evidence rows yet."):w.default.createElement("ul",{className:"aidos-evidence-list"},e.evidence.map((i,o)=>w.default.createElement(En,{key:i.at??o,row:i,onView:e.onViewEvidence,onDelete:e.onDelete,deleting:e.deletingAt!==null,criterionLabel:typeof i.payload.criteria=="string"?i.payload.criteria:void 0,standing:n[String(i.at)+":"+i.kind]?.standing,standingReason:n[String(i.at)+":"+i.kind]?.reason}))),e.criteria.length>0?w.default.createElement("details",{className:"aidos-panel aidos-panel-nested"},w.default.createElement("summary",{className:"aidos-panel-head"},w.default.createElement("span",{className:"aidos-panel-title"},"Link evidence to criteria")),w.default.createElement("div",{className:"aidos-panel-body"},w.default.createElement(yo,{criteria:e.criteria,evidence:e.evidence,ticketIdKey:e.ticketIdKey,agentId:e.agentId,onChanged:e.onLinked}))):null,w.default.createElement(ld,{ticketId:e.ticketIdKey,agentId:e.agentId})))}function yh(e){let n=e.ticket,t=ft(n.state),[i,o]=w.default.useState(null);async function r(s){if(i!==null)return;let a=s.at??0;o(a);try{await z("userDetachEvidence",{ticketId:e.ticketIdKey,at:a,rowKind:s.kind},e.agentId),_("Evidence deleted","success")}catch(l){bi(l)}finally{o(null)}}return w.default.createElement(w.default.Fragment,null,w.default.createElement("div",{className:"aidos-detail-head"},w.default.createElement(nd,{field:"title",ticketId:e.ticketIdKey,value:n.title,agentId:e.agentId,onSaved:e.onFieldSaved}),w.default.createElement("button",{className:"aidos-close-btn",onClick:e.onClose},"\xD7")),w.default.createElement("div",{className:"aidos-detail-chips"},w.default.createElement("span",{className:"aidos-chip aidos-chip-id",style:{"--chip-hue":Fn(Le(n))},title:Le(n),"data-dsh-tip":""},Zn(n)),w.default.createElement("span",{className:t},cn(n.state)),w.default.createElement(Sr,{tags:n.tags??[]})),w.default.createElement("dl",{className:"aidos-facts"},w.default.createElement("div",{className:"aidos-facts-row"},w.default.createElement("dt",{className:"aidos-facts-label"},"State"),w.default.createElement("dd",{className:"aidos-facts-value"},cn(n.state))),w.default.createElement("div",{className:"aidos-facts-row"},w.default.createElement("dt",{className:"aidos-facts-label"},"Gate"),w.default.createElement("dd",{className:"aidos-facts-value"},ht(n.gatePresent,n.gateTotal,Kn(n)))),w.default.createElement("div",{className:"aidos-facts-row"},w.default.createElement("dt",{className:"aidos-facts-label"},"Confidence"),w.default.createElement("dd",{className:"aidos-facts-value"},String(ti(n.confidenceScore))+"%",w.default.createElement("span",{className:"aidos-facts-asterisk",title:"Advisory score. It never unlocks anything.","data-dsh-tip":""},"*"))),w.default.createElement("div",{className:"aidos-facts-row"},w.default.createElement("dt",{className:"aidos-facts-label"},"Phase"),w.default.createElement("dd",{className:"aidos-facts-value"},String(n.phase))),w.default.createElement("div",{className:"aidos-facts-row"},w.default.createElement("dt",{className:"aidos-facts-label"},"Order"),w.default.createElement("dd",{className:"aidos-facts-value"},String(n.order))),w.default.createElement("div",{className:"aidos-facts-row"},w.default.createElement("dt",{className:"aidos-facts-label"},"Slug"),w.default.createElement("dd",{className:"aidos-facts-value"},n.slug))),w.default.createElement(Ao,{ticketId:e.ticketIdKey,agentId:e.agentId,onResolved:e.onFieldSaved}),e.actions,w.default.createElement(fh,{ticket:n,ticketIdKey:e.ticketIdKey,agentId:e.agentId,onSaved:e.onFieldSaved}),w.default.createElement(gh,{ticket:n,evidence:e.evidence,ticketIdKey:e.ticketIdKey,agentId:e.agentId,onSaved:e.onFieldSaved,onViewEvidence:e.onViewEvidence,deletingAt:i}),w.default.createElement(bh,{ticketId:e.ticketIdKey,dependsOn:n.dependsOn,agentId:e.agentId,onSaved:e.onFieldSaved,ticketsByKey:e.ticketsByKey,onJump:e.onJump,workspaceKey:n.workspaceKey}),w.default.createElement(wh,{evidence:e.evidence,evidenceCollapsed:e.evidenceCollapsed,onToggleEvidence:e.onToggleEvidence,onDelete:s=>{r(s)},deletingAt:i,ticketIdKey:e.ticketIdKey,agentId:e.agentId,onViewEvidence:e.onViewEvidence,criteria:lr(n.criteria),onLinked:e.onFieldSaved}))}function Co(e){let n=e.ticket,t=e.agentId,i=Le(n),o=function(T){let[Z,pe]=w.default.useState(()=>us(t,i,T));return[Z,function(tn){ps(t,i,T,tn),pe(tn)}]},[r,s]=o("signoff"),[a,l]=o("verify"),[d,c]=o("sendBack"),[f,p]=o("markDone"),[h,y]=o("allowlist"),[k,I]=o("retire"),[v,P]=w.default.useState(()=>fs(t,i)),F=function(T){hs(t,i,T),P(T)},[Q,A]=w.default.useState(!1);w.default.useEffect(function(){le("detail view: ticket "+n.id)},[]);async function j(){if(!Q){A(!0);try{await ph(t,e.ticketIdKey),e.onClose()}catch(T){bi(T)}finally{A(!1)}}}function se(T){return cd(t,e.ticketIdKey,T)}return w.default.createElement("div",{className:"aidos-detail"},w.default.createElement(yh,{ticket:n,ticketIdKey:e.ticketIdKey,evidence:e.evidence,evidenceCollapsed:e.evidenceCollapsed,onToggleEvidence:e.onToggleEvidence,onClose:e.onClose,agentId:t,onFieldSaved:e.onFieldSaved,onOpenAllowlist:()=>{y(!0)},onViewEvidence:T=>{F(T)},actions:w.default.createElement(td,{ticket:n,evidence:e.evidence,checkAction:se,onOpenSignoff:()=>{s(!0)},onOpenVerify:()=>{l(!0)},onOpenSendBack:()=>{c(!0)},onOpenMarkDone:()=>{p(!0)},onOpenSubmitForReview:()=>{j()},onOpenAllowlist:()=>{y(!0)},onOpenRetire:()=>{I(!0)}})}),w.default.createElement(bt,{row:v,onClose:()=>{F(null)}}),h?w.default.createElement(pl,{open:!0,ticketId:n.id,ticketIdKey:e.ticketIdKey,currentAllowlist:n.allowlist??[],agentId:t,onClose:()=>{y(!1)},onSaved:e.onFieldSaved}):null,w.default.createElement(fd,{ticketId:e.ticketIdKey,comments:e.comments,agentId:t}),r?w.default.createElement(mi,{open:!0,ticketId:e.ticketIdKey,ticketTitle:n.title,onClose:()=>{s(!1)},onSignedOff:function(){s(!1)},agentId:t}):null,a?w.default.createElement(vt,{ticketId:e.ticketIdKey,agentId:t,onClose:()=>{l(!1)}}):null,d?w.default.createElement(hd,{open:!0,ticketId:e.ticketIdKey,onClose:()=>{c(!1)},onSentBack:function(){c(!1)},agentId:t}):null,f?w.default.createElement(No,{open:!0,ticketId:e.ticketIdKey,ticket:n,evidence:e.evidence,onClose:()=>{p(!1)},onMarkedDone:e.onClose,agentId:t}):null,k?w.default.createElement(md,{open:!0,ticketId:e.ticketIdKey,ticketTitle:n.title,agentId:t,onClose:()=>{I(!1)},onRetired:function(){e.onClose()}}):null)}var Re=de(require("react"),1);function vh(e){let n=[],t=new Set;for(let i of e.split(",")){let o=i.trim();o===""||t.has(o)||(t.add(o),n.push(o))}return n}function bd(e){let[n,t]=Re.default.useState(""),[i,o]=Re.default.useState(""),[r,s]=Re.default.useState(""),[a,l]=Re.default.useState(""),[d,c]=Re.default.useState(!1);if(Re.default.useEffect(function(){e.open&&le("create ticket modal opened")},[e.open]),!e.open)return null;async function f(){if(!d&&n.trim()!==""){c(!0);try{let p=await z("userSetTicket",{title:n,description:i,criteria:r},e.agentId),h=typeof p=="object"&&p!==null&&!Array.isArray(p)&&"id"in p&&typeof p.id=="number"?p.id:NaN,y=vh(a);if(y.length>0&&Number.isFinite(h))try{await z("userAttachTags",{ticketId:h,tags:y},e.agentId)}catch(k){let I=k instanceof J?k.message:String(k);_("Ticket created, but its tags were not attached: "+I,"refusal"),e.onClose(),e.onCreated!==void 0&&e.onCreated(h);return}_("Ticket created","success"),e.onClose(),e.onCreated!==void 0&&Number.isFinite(h)&&e.onCreated(h)}catch(p){p instanceof J?_(p.message,"refusal"):_(String(p),"refusal")}finally{c(!1)}}}return Re.default.createElement("div",{className:"aidos-modal-mask",onClick:()=>{d||e.onClose()}},Re.default.createElement("div",{className:"aidos-modal",onClick:p=>{p.stopPropagation()}},Re.default.createElement("div",{className:"aidos-modal-head"},Re.default.createElement("h3",{className:"aidos-modal-title"},"Create a ticket"),Re.default.createElement("button",{className:"aidos-close-btn",onClick:()=>{d||e.onClose()},"aria-label":"Close"},"\xD7")),Re.default.createElement("div",{className:"aidos-modal-form"},Re.default.createElement("div",{className:"aidos-modal-row"},Re.default.createElement("label",null,"Title"),Re.default.createElement("input",{type:"text",value:n,disabled:d,onChange:p=>{t(p.target.value)}})),Re.default.createElement("div",{className:"aidos-modal-row"},Re.default.createElement("label",null,"Description"),Re.default.createElement("textarea",{value:i,disabled:d,onChange:p=>{o(p.target.value)}})),Re.default.createElement("div",{className:"aidos-modal-row"},Re.default.createElement("label",null,"Criteria"),Re.default.createElement("textarea",{value:r,disabled:d,onChange:p=>{s(p.target.value)}})),Re.default.createElement("div",{className:"aidos-modal-row"},Re.default.createElement("label",null,"Tags"),Re.default.createElement("input",{type:"text",value:a,disabled:d,placeholder:"ui, host, debt (comma-separated, optional)",onChange:p=>{l(p.target.value)}})),Re.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:d||n.trim()==="",onClick:f},d?"Saving\u2026":"Save"))))}var be=de(require("react"),1);function wd(e){let[n,t]=be.default.useState(null),[i,o]=be.default.useState(""),[r,s]=be.default.useState(!1),[a,l]=be.default.useState([]);if(be.default.useEffect(function(){e.open&&(t(null),o(""),l([0]),le("plan meta modal opened"))},[e.open]),!e.open)return null;function d(v,P){t(v),o(P)}function c(){t(null),o("")}function f(v){l(P=>P.includes(v)?P.filter(F=>F!==v):[...P,v])}async function p(v){if(r)return;let P={};v==="frontmatter"?P.frontmatter=i:v==="preamble"?P.preamble=i:P.contextSections=(e.planMeta?.contextSections??[]).map((F,Q)=>Q===v?{...F,text:i}:{...F}),s(!0);try{await z("userSetPlanMeta",P,e.agentId),_("Plan block saved","success"),c()}catch(F){F instanceof J?_(F.message,"refusal"):_(String(F),"refusal")}finally{s(!1)}}function h(v){return be.default.createElement(be.default.Fragment,null,be.default.createElement("textarea",{className:"aidos-plan-meta-input",value:i,disabled:r,onChange:P=>{o(P.target.value)}}),be.default.createElement("div",{className:"aidos-plan-meta-actions"},be.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:r,onClick:()=>{p(v)}},r?"Saving\u2026":"Save"),be.default.createElement("button",{className:"aidos-btn",disabled:r,onClick:c},"Cancel")))}function y(v,P,F){return be.default.createElement("div",{className:"aidos-plan-meta-block",key:v},be.default.createElement("div",{className:"aidos-plan-meta-block-head"},be.default.createElement("span",{className:"aidos-plan-meta-block-title"},P),be.default.createElement("button",{className:"aidos-btn",disabled:r,onClick:()=>{d(v,F)}},"Edit")),n===v?h(v):be.default.createElement("pre",{className:"aidos-plan-meta-text"},F===""?"(empty)":F))}function k(v,P,F){let Q=a.includes(v);return be.default.createElement("div",{className:"aidos-plan-meta-block",key:v},be.default.createElement("div",{className:"aidos-plan-meta-block-head"},be.default.createElement("button",{className:"aidos-plan-meta-toggle",onClick:()=>{f(v)}},be.default.createElement("span",{"aria-hidden":"true"},Q?"\u25BE":"\u25B8"),P),be.default.createElement("button",{className:"aidos-btn",disabled:r,onClick:()=>{d(v,F)}},"Edit")),n===v||Q?n===v?h(v):be.default.createElement("pre",{className:"aidos-plan-meta-text"},F===""?"(empty)":F):null)}let I=e.planMeta;return be.default.createElement("div",{className:"aidos-modal-mask",onClick:()=>{r||e.onClose()}},be.default.createElement("div",{className:"aidos-plan-meta-modal",onClick:v=>{v.stopPropagation()}},be.default.createElement("div",{className:"aidos-modal-head"},be.default.createElement("h3",{className:"aidos-modal-title"},"Plan"),be.default.createElement("button",{className:"aidos-close-btn",onClick:()=>{r||e.onClose()},"aria-label":"Close"},"\xD7")),I===null?be.default.createElement("p",{className:"aidos-plan-meta-note"},"This project holds no plan yet."):be.default.createElement("div",{className:"aidos-plan-meta-blocks"},y("frontmatter","Frontmatter",I.frontmatter),y("preamble","Preamble",I.preamble),I.contextSections.map((v,P)=>k(P,v.heading,v.text)))))}var ne=de(require("react"),1);var we=de(require("react"),1);function yd(e){switch(e.kind){case"confirm":return{kind:"confirm",note:""};case"path-list":return{kind:"path-list",paths:[...e.paths]};case"criteria-checklist":return{kind:"criteria-checklist",criteria:[...e.selected??e.criteria.map((t,i)=>i)].sort((t,i)=>t-i).map(t=>e.criteria[t]).filter(t=>typeof t=="string")};case"dependency-picker":return{kind:"dependency-picker",ticketIds:[...e.selected??[]]}}}function kh(e,n){return e.some((t,i)=>{let o=yd(t),r=n[i];return r===void 0||o.kind==="confirm"||r.kind==="confirm"?!1:JSON.stringify(o)!==JSON.stringify(r)})}function vd(e){let n=e.steps,[t,i]=we.default.useState(0),[o,r]=we.default.useState(()=>n.map(yd)),s=n[t],a=o[t],l=t===n.length-1,d=e.working===!0,c=p=>{r(h=>{let y=[...h];return y[t]=p,y})},f=()=>{if(!l){i(t+1);return}e.onResolve({status:kh(n,o)?"amended":"approved",values:o})};return s===void 0||a===void 0?null:we.default.createElement(De,{title:n.length>1?e.title+" ("+(t+1)+"/"+n.length+")":e.title,working:d,onClose:e.onClose},we.default.createElement("div",{className:"aidos-runner-step"},we.default.createElement("h4",{className:"aidos-runner-step-title"},s.title),s.prompt!==void 0?we.default.createElement("p",{className:"aidos-runner-step-prompt"},s.prompt):null,we.default.createElement(xh,{step:s,value:a,working:d,onChange:c})),we.default.createElement("div",{className:"aidos-form-actions"},we.default.createElement("button",{className:"aidos-btn",disabled:d,onClick:e.onClose},"Cancel"),we.default.createElement("button",{className:"aidos-btn aidos-btn-danger",disabled:d,title:"Answer no. The agent is told and the request is resolved.","data-dsh-tip":"",onClick:()=>{e.onResolve({status:"rejected"})}},"Reject"),t>0?we.default.createElement("button",{className:"aidos-btn",disabled:d,onClick:()=>{i(t-1)}},"Back"):null,we.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:d,onClick:f},d?"Working\u2026":l?"Confirm":"Next")))}function xh(e){let{step:n,value:t,working:i,onChange:o}=e;if(n.kind==="confirm"&&t.kind==="confirm")return we.default.createElement(we.default.Fragment,null,we.default.createElement(yn,{label:n.noteLabel??"Note (optional)",value:t.note,working:i,onChange:r=>{o({...t,note:r})}}),n.criteria!==void 0&&n.criteria.length>0?we.default.createElement("div",{className:"aidos-modal-row"},we.default.createElement("label",null,"Link to a criterion (optional)"),we.default.createElement("select",{className:"aidos-select",value:t.criterion??"",disabled:i,onChange:r=>{let s=r.target.value;o({...t,criterion:s===""?void 0:s})}},we.default.createElement("option",{value:""},"\u2014 none \u2014"),n.criteria.map(r=>we.default.createElement("option",{key:r,value:r},r)))):null);if(n.kind==="path-list"&&t.kind==="path-list")return we.default.createElement(et,{label:n.label??"Paths (one per line)",value:t.paths.join(`
`),working:i,onChange:r=>{o({kind:"path-list",paths:ui(r)})}});if(n.kind==="criteria-checklist"&&t.kind==="criteria-checklist"){let r=new Set(t.criteria);return we.default.createElement("ul",{className:"aidos-runner-checklist"},n.criteria.map(s=>we.default.createElement("li",{key:s},we.default.createElement("label",null,we.default.createElement("input",{type:"checkbox",checked:r.has(s),disabled:i,onChange:()=>{let a=new Set(r);a.has(s)?a.delete(s):a.add(s),o({kind:"criteria-checklist",criteria:n.criteria.filter(l=>a.has(l))})}}),we.default.createElement("span",null,s)))))}if(n.kind==="dependency-picker"&&t.kind==="dependency-picker"){let r=new Set(t.ticketIds);return we.default.createElement("ul",{className:"aidos-ticket-strips"},n.candidates.map(s=>{let a=String(s.id);return we.default.createElement(Un,{key:a,ticket:s,meta:r.has(a)?"will be proposed as a dependency":void 0,highlighted:r.has(a),actions:we.default.createElement("button",{className:"aidos-btn",disabled:i,onClick:()=>{let l=new Set(r);l.has(a)?l.delete(a):l.add(a),o({kind:"dependency-picker",ticketIds:n.candidates.map(d=>String(d.id)).filter(d=>l.has(d))})}},r.has(a)?"Remove":"Add")})}))}return null}function Sh(e){return e.approvalId!==void 0?[{kind:"path-list",title:"Approve file access for "+e.ticket.title,prompt:"The agent proposed these paths. Edit or remove any of them; approving grants write access to exactly this list.",label:"Paths (one per line)",paths:e.approvalPaths??[]}]:[{kind:"confirm",title:e.label,prompt:e.prompt,noteLabel:"Note (optional)"}]}var Xr={signoff:{icon:ne.default.createElement(Li,null),hint:"Sign off \u2014 let the agent start work on this ticket",tone:"signoff"},verify:{icon:ne.default.createElement(Ks,null),hint:"Verify \u2014 check the work and attach your row",tone:"verify"},"mark-done":{icon:ne.default.createElement(Fs,null),hint:"Mark done \u2014 close this ticket",tone:"done"},allowlist:{icon:ne.default.createElement(go,null),hint:"Review a write-access request",tone:"allowlist"}};function Vn(e){return e.boardKey+"\0"+e.actionId+(e.approvalId!==void 0?"\0"+e.approvalId:"")}function kd(e){let[n,t]=ne.default.useState(null),[i,o]=ne.default.useState(()=>ms(e.sessionId)),r=function(T){let Z=T===null?null:Vn(T);bs(e.sessionId,Z),o(Z)},[s,a]=ne.default.useState(!1),[l,d]=ne.default.useState("suggested"),[c,f]=ne.default.useState(null),[p,h]=ne.default.useState(null),[y,k]=ne.default.useState(new Set),I=Ar(e.tickets,T=>(e.evidenceByTicket[ee(T)]??[]).map(Z=>Z.kind),e.nominations??[],l,e.approvals??[]),v=I.filter(T=>!y.has(Vn(T))),P=Ys(v),F=c??Zs(v),Q=P.find(T=>T.id===F)??{id:F,label:F,entries:[]},A=i===null?null:I.find(T=>Vn(T)===i)??null,j=v.filter(T=>T.nominationReason!==void 0).length,se=ol(e.tickets,T=>(e.evidenceByTicket[ee(T)]??[]).map(Z=>Z.kind),e.nominations??[]);return e.error!=null&&e.error!==""?ne.default.createElement("div",{className:"aidos-queue"},ne.default.createElement("p",{className:"aidos-queue-empty"},"Could not load the queue: "+e.error),e.onRefresh!==void 0?ne.default.createElement("button",{className:"aidos-btn",onClick:e.onRefresh},"Retry"):null):v.length===0?ne.default.createElement("div",{className:"aidos-queue"},ne.default.createElement("p",{className:"aidos-queue-empty"},"Nothing is waiting on you. Every ticket is either with the agent or done.")):ne.default.createElement("div",{className:"aidos-queue"},ne.default.createElement("div",{className:"aidos-queue-head"},ne.default.createElement("span",{className:"aidos-queue-count"},v.length+(v.length===1?" ask":" asks"),j>0?" \xB7 "+j+" suggested by the agent":""),ne.default.createElement("label",{className:"aidos-queue-sort"},ne.default.createElement("span",null,"Sort"),ne.default.createElement("select",{className:"aidos-select",value:l,onChange:T=>{d(T.target.value)}},Object.keys(Ir).map(T=>ne.default.createElement("option",{key:T,value:T},Ir[T]))))),se.length>0?ne.default.createElement("ul",{className:"aidos-queue-unmatched"},se.map(T=>ne.default.createElement("li",{key:T.nomination.id},"The agent suggested "+T.nomination.actionId+" but it is not shown: "+T.reason))):null,ne.default.createElement("div",{className:"aidos-queue-tabs",role:"tablist","aria-label":"Queue"},P.map(T=>ne.default.createElement("button",{key:T.id,type:"button",role:"tab","aria-selected":T.id===Q.id,className:"aidos-queue-tab"+(T.id===Q.id?" aidos-queue-tab-active":""),onClick:()=>{f(T.id)}},ne.default.createElement("span",{className:"aidos-queue-tab-icon","aria-hidden":"true"},Xr[Ws[T.id]]?.icon),ne.default.createElement("span",{className:"aidos-queue-tab-label"},T.label),ne.default.createElement("span",{className:"aidos-queue-tab-count"},T.entries.length)))),Q.entries.length===0?ne.default.createElement("p",{className:"aidos-queue-empty"},Gs[Q.id]):ne.default.createElement("ul",{className:"aidos-ticket-strips",role:"tabpanel"},Q.entries.map(T=>ne.default.createElement(Un,{key:Vn(T),actionIcon:Xr[T.actionId]?.icon,actionHint:Xr[T.actionId]?.hint,expanded:n===Vn(T),onToggleActions:()=>{let Z=Vn(T);t(n===Z?null:Z)},ticket:T.ticket,highlighted:T.nominationReason!==void 0||T.approvalId!==void 0,awaitingApproval:T.approvalId!==void 0,meta:T.nominationReason!==void 0?ne.default.createElement("span",{className:"aidos-queue-reason"},"the agent asks: "+T.nominationReason):T.prompt,onOpen:()=>{e.onOpen(T)},actions:ne.default.createElement(ne.default.Fragment,null,T.nominationId!==void 0&&e.onDismiss!==void 0?ne.default.createElement("button",{type:"button",className:"tool-render-approval-btn tool-render-approval-reject","data-armed":p===T.nominationId?!0:void 0,disabled:s,title:"Drop this suggestion without acting on it","data-dsh-tip":"",onClick:()=>{let Z=T.nominationId,pe=nl(p,Z);h(pe.armed),pe.dismiss&&e.onDismiss?.(Z)}},p===T.nominationId?"? Confirm dismiss":"Dismiss"):null,ne.default.createElement("button",{type:"button",className:"tool-render-approval-btn tool-render-approval-approve",disabled:s,onClick:()=>{h(null),r(T)}},T.label))}))),A!==null&&A.actionId==="verify"&&A.approvalId===void 0?ne.default.createElement(vt,{ticketId:A.boardKey,agentId:e.sessionId,onAttached:()=>{k(function(T){let Z=new Set(T);return Z.add(Vn(A)),Z}),e.onRefresh?.()},onClose:()=>{r(null)}}):A!==null&&A.actionId==="signoff"&&A.approvalId===void 0?ne.default.createElement(mi,{open:!0,ticketId:A.boardKey,ticketTitle:A.ticket.title,agentId:e.sessionId,proposedPaths:A.proposedPaths??A.ticket.allowlist??[],onClose:()=>{r(null)},onSignedOff:()=>{k(function(T){let Z=new Set(T);return Z.add(Vn(A)),Z}),e.onRefresh?.()}}):A!==null&&A.actionId==="mark-done"&&A.approvalId===void 0?ne.default.createElement(No,{open:!0,ticketId:A.boardKey,ticket:A.ticket,evidence:e.evidenceByTicket[A.boardKey]??[],agentId:e.sessionId,onClose:()=>{r(null)},onMarkedDone:()=>{k(function(T){let Z=new Set(T);return Z.add(Vn(A)),Z}),e.onRefresh?.()}}):A!==null?ne.default.createElement(vd,{title:A.label,steps:Sh(A),working:s,onClose:()=>{s||r(null)},onResolve:T=>{if(T.status==="rejected"&&A.approvalId===void 0){r(null);return}a(!0),e.onAct(A,T).then(()=>{a(!1),k(function(Z){let pe=new Set(Z);return pe.add(Vn(A)),pe}),r(null)}).catch(()=>{a(!1)})}}):null)}function xd(e,n,t=[],i=[]){return Ar(e,o=>(n[ee(o)]??[]).map(r=>r.kind),t,"suggested",i)}var W=de(require("react"),1);function Th(e){if(e===null||typeof e!="object")return[];let n=e.tags;if(!Array.isArray(n))return[];let t=[];for(let i of n){if(i===null||typeof i!="object")continue;let o=i;if(typeof o.tag!="string"||typeof o.count!="number")continue;let r=[];if(Array.isArray(o.tickets))for(let s of o.tickets){if(s===null||typeof s!="object")continue;let a=s;typeof a.boardKey!="string"||typeof a.id!="number"||typeof a.title!="string"||typeof a.state!="string"||typeof a.slug!="string"||typeof a.workspaceKey!="string"||r.push({boardKey:a.boardKey,id:a.id,title:a.title,state:a.state,slug:a.slug,workspaceKey:a.workspaceKey})}t.push({tag:o.tag,count:o.count,tickets:r})}return t}function Eh(e,n){let t=n.trim().toLowerCase();return t===""?[...e]:e.filter(i=>i.tag.toLowerCase().includes(t))}function Rh(e,n){return e.filter(t=>(t.kind==="tag-delete"||t.kind==="tag-migrate"||t.kind==="tag-detach")&&t.payload.tag===n)}function Ah(e){if(e.kind==="tag-migrate"&&typeof e.payload.to=="string")return`${String(e.payload.tag)} \u2192 ${e.payload.to}`;if(e.kind==="tag-detach"){let n=e.payload.ticketId;return typeof n=="number"||typeof n=="string"?`detach ${String(e.payload.tag)} from #${n}`:`detach ${String(e.payload.tag)}`}return`delete ${String(e.payload.tag)}`}function Sd(e){let[n,t]=W.default.useState(null),[i,o]=W.default.useState([]),[r,s]=W.default.useState(null),[a,l]=W.default.useState(""),[d,c]=W.default.useState(null),[f,p]=W.default.useState(""),[h,y]=W.default.useState(null),k=W.default.useCallback(function(){s(null),z("workspaceTags",{},e.sessionId).then(A=>{t(Th(A))}).catch(A=>{s(A instanceof Error?A.message:String(A))}),z("pendingApprovals",{},e.sessionId).then(A=>{let j=Array.isArray(A)?A:[];o(j.filter(se=>{if(se===null||typeof se!="object")return!1;let T=se.kind;return T==="tag-delete"||T==="tag-migrate"||T==="tag-detach"}))}).catch(()=>{})},[e.sessionId]);W.default.useEffect(function(){le("tags modal opened"),k()},[k]);let I=n===null?[]:Eh(n,a),v=d===null?null:(n??[]).find(A=>A.tag===d)??null,P=d===null?[]:Rh(i,d);async function F(A,j,se){y(se);try{await z(A,j,e.sessionId),_(se,"success"),k()}catch(T){_(T instanceof Error?T.message:String(T),"refusal")}finally{y(null)}}let Q=r!==null?W.default.createElement("div",{className:"aidos-empty"},W.default.createElement("p",{className:"aidos-empty-note"},r),W.default.createElement("button",{className:"aidos-btn",onClick:k},"Retry")):n===null?W.default.createElement("div",{className:"aidos-merge-loading",role:"status"},W.default.createElement("span",{className:"aidos-merge-spinner","aria-hidden":"true"}),W.default.createElement("span",null,"Loading workspace tags\u2026")):n.length===0?W.default.createElement("div",{className:"aidos-empty"},W.default.createElement("h3",{className:"aidos-empty-title"},"No tags yet"),W.default.createElement("p",{className:"aidos-empty-note"},"Tags are created by attaching them \u2014 the agent attaches with attach_tags, and a name no ticket carries yet is created by the attach.")):W.default.createElement(W.default.Fragment,null,W.default.createElement("div",{className:"aidos-search-box"},W.default.createElement("input",{className:"aidos-search-input",type:"search",placeholder:"Filter tags\u2026",value:a,onChange:A=>{l(A.target.value)},"aria-label":"Filter tags"})),W.default.createElement("ul",{className:"aidos-tags-list"},I.map(A=>W.default.createElement("li",{key:A.tag,className:"aidos-tags-row"},W.default.createElement("button",{className:"aidos-btn"+(d===A.tag?" aidos-btn-primary":""),onClick:()=>{c(d===A.tag?null:A.tag),p("")},title:`${A.count} ticket(s) carry this tag`,"data-dsh-tip":""},A.tag,W.default.createElement("b",{className:"aidos-queue-count"},A.count))))),I.length===0?W.default.createElement("p",{className:"aidos-empty-note"},"No tags match this filter."):null,v===null?null:W.default.createElement("div",{className:"aidos-tags-detail"},W.default.createElement("h4",{className:"aidos-tags-detail-title"},v.tag," \u2014 ",v.count," ticket(s)"),v.tickets.map(A=>W.default.createElement("div",{key:A.boardKey,className:"aidos-tags-ticket"},W.default.createElement(Un,{ticket:{id:A.id,title:A.title,state:A.state,slug:A.slug,workspaceKey:A.workspaceKey},onOpen:()=>{e.onOpen(A.boardKey)}}),W.default.createElement("span",{className:"aidos-tags-actions"},W.default.createElement("button",{className:"aidos-btn",disabled:h!==null,onClick:()=>{F("userDetachTags",{ticketId:A.id,tags:[v.tag]},`Detached ${v.tag} from #${A.id}`)},title:`Remove ${v.tag} from this ticket only`,"data-dsh-tip":""},"Detach")))),W.default.createElement("div",{className:"aidos-tags-actions"},W.default.createElement("div",{className:"aidos-search-box"},W.default.createElement("input",{className:"aidos-search-input",type:"text",placeholder:"Migrate to\u2026",value:f,onChange:A=>{p(A.target.value)},"aria-label":"Replacement tag for migration"})),W.default.createElement("button",{className:"aidos-btn",disabled:h!==null||f.trim()==="",onClick:()=>{F("userMigrateTag",{from:v.tag,to:f.trim()},`Migrated ${v.tag} \u2192 ${f.trim()}`)},title:"Replace this tag with another on every ticket carrying it","data-dsh-tip":""},"Migrate"),W.default.createElement("button",{className:"aidos-btn",disabled:h!==null,onClick:()=>{F("userDeleteTag",{tag:v.tag},`Deleted ${v.tag}`),c(null)},title:"Delete this tag from every ticket carrying it","data-dsh-tip":""},"Delete")),P.length===0?null:W.default.createElement("div",{className:"aidos-tags-proposals"},W.default.createElement("h4",{className:"aidos-tags-detail-title"},"Agent proposals awaiting approval"),P.map(A=>W.default.createElement("div",{key:A.id,className:"aidos-tags-proposal"},W.default.createElement("span",null,Ah(A)),typeof A.payload.reason=="string"&&A.payload.reason!==""?W.default.createElement("span",{className:"aidos-empty-note"}," \u2014 ",A.payload.reason):null,W.default.createElement("span",{className:"aidos-tags-actions"},W.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:h!==null,onClick:()=>{F("resolveApproval",{requestId:A.id,approved:!0},"Proposal approved")}},"Approve"),W.default.createElement("button",{className:"aidos-btn",disabled:h!==null,onClick:()=>{F("resolveApproval",{requestId:A.id,approved:!1},"Proposal rejected")}},"Reject")))))));return W.default.createElement(De,{title:"Tags",wide:!0,onClose:e.onClose},Q)}function Td(e){let n=null;for(let t of e)t.state==="in_progress"&&(n===null||t.updatedAt>n.updatedAt)&&(n=t);return n}var kt=de(require("react"),1);function Ih(e){let n=e.toast;return kt.default.createElement("div",{className:"aidos-toast aidos-toast-"+n.kind},kt.default.createElement("span",{className:"aidos-toast-text"},n.text),kt.default.createElement("button",{className:"aidos-toast-dismiss",onClick:()=>{cl(n.id)},"aria-label":"Dismiss notification"},"\xD7"))}function Ed(){let[e,n]=kt.default.useState([]);return kt.default.useEffect(function(){return ul(n)},[]),kt.default.createElement("div",{className:"aidos-toast-stack"},e.map(function(t){return kt.default.createElement(Ih,{key:t.id,toast:t})}))}function Id(e){return"aidos:board:local:filter:"+e}var Rd=new Map,_h=300;function Ch(e,n){if(e===null)return null;let t=new Set;for(let o of n)t.add(o.projectId);let i=e.filter(o=>t.has(o));return i.length===t.size?null:i}var Oh=4096,Oo=new Map;function Ad(e,n,t){return e.map(i=>{let o=t?i.sourceSessionId??"":n,r=o+":"+String(i.id),s=JSON.stringify(i)+"|"+o+"|"+String(t),a=Oo.get(r);if(a!==void 0&&a.hash===s)return a.row;let l=t?{...i}:{...i,sourceSessionId:n,foreign:!1};return Oo.size>=Oh&&Oo.clear(),Oo.set(r,{hash:s,row:l}),l})}var Ph=4096,Po=new Map;function Mh(e){let n={};for(let[t,i]of Object.entries(e)){let o=JSON.stringify(i),r=Po.get(t);if(r!==void 0&&r.hash===o){n[t]=r.rows;continue}Po.size>=Ph&&Po.clear(),Po.set(t,{hash:o,rows:i}),n[t]=i}return n}function Lh(e,n){try{let t=window.localStorage.getItem(Id(e));if(t===null)return mn(Cn);let i=JSON.parse(t),o=Array.isArray(i.stateIds)?i.stateIds.filter(l=>Mt.includes(l)):[...Cn.stateIds],r=Array.isArray(i.projectIds)?Ch(i.projectIds.filter(l=>typeof l=="number"),n):null,s=i.sortKey==="confidence"||i.sortKey==="gates"||i.sortKey==="time"||i.sortKey==="alpha"?i.sortKey:"confidence",a=Array.isArray(i.tags)&&i.tags.every(l=>typeof l=="string")?[...i.tags]:void 0;return{projectIds:r,stateIds:o,sortKey:s,descending:typeof i.descending=="boolean"?i.descending:!0,search:typeof i.search=="string"?i.search:"",tags:a}}catch{return mn(Cn)}}function Dh(e){let n=/[?&]ticket=([^&#]+)/.exec(e);if(n===null)return null;let t=decodeURIComponent(n[1]);return t===""?null:t}function Bh(e){K.default.useEffect(function(){let n=e.current;if(n===null||typeof window>"u")return;let t=0,i=[],o=()=>{t=0;let l=n.getBoundingClientRect(),d=0,c=p=>{let h=p.getBoundingClientRect();h.height===0||h.bottom<=0||h.top>l.top+4||h.bottom>d&&(d=h.bottom)};if(document.querySelectorAll(".bmu-topbar, [data-bmu-topbar]").forEach(function(p){c(p);for(let h of Array.from(p.children))c(h)}),l.width>0&&typeof document.elementsFromPoint=="function"){let p=document.elementsFromPoint(l.left+l.width/2,l.top+2);for(let h of p){if(h===n||n.contains(h))break;let y=window.getComputedStyle(h).position;(y==="fixed"||y==="sticky")&&c(h)}}let f=Math.max(0,Math.round(d-l.top));n.style.setProperty("--aidos-top-clearance",`${f}px`),n.style.setProperty("--aidos-top-chrome",`${Math.max(0,Math.round(d))}px`)},r=()=>{t===0&&(t=window.requestAnimationFrame(o))};o();for(let l of[120,600,1600])i.push(window.setTimeout(r,l));window.addEventListener("resize",r),window.addEventListener("orientationchange",r);let s=window.visualViewport;s&&s.addEventListener("resize",r);let a=new ResizeObserver(r);return a.observe(n),function(){t!==0&&window.cancelAnimationFrame(t);for(let l of i)window.clearTimeout(l);window.removeEventListener("resize",r),window.removeEventListener("orientationchange",r),s&&s.removeEventListener("resize",r),a.disconnect()}},[e])}function Nd(e){let[n,t]=K.default.useState(0);return K.default.useEffect(function(){le("board view mounted")},[]),K.default.useEffect(function(){n>0&&bn(`#100 REMOUNT: retryNonce -> ${n}; ProjectionReader state (selection included) was destroyed`)},[n]),K.default.createElement(zh,{key:n,sessionId:e.sessionId,useProjection:e.useProjection,onRetry:()=>{bn("#100 onRetry called -> forcing a remount"),t(i=>i+1)}})}function zh(e){let n=e.sessionId,t=e.useProjection("aidos.tickets"),i=e.useProjection("aidos.evidence"),o=e.useProjection("aidos.comments"),r=e.useProjection("aidos.plan"),s=t!==void 0&&i!==void 0&&o!==void 0,a=Object.values(t??{})[0]?.projectId??null,l=a===null?null:(r??{})[String(a)]??null,[d,c]=K.default.useState(()=>gt(n)),[f,p]=K.default.useState(()=>Ns(n)&&gt(n)===null),h=t===void 0?null:JSON.stringify(t).length+":"+Object.keys(t).length;K.default.useEffect(function(){if(!s||h===null||As(n)===h)return;p(gt(n)===null);let S=!1,U=0,xe=async function(){try{let Ct=Rd.get(n),me=await z("workspaceTickets",Ct===void 0?{}:{sinceVersion:Ct},n),Yn=me.workspaceLabels;if(Yn!==void 0)for(let[Ot,Ai]of Object.entries(Yn))Za(Ot,Ai);let Ji=me.unchanged===!0;if(!Ji){Rs(n,me);let Ot=me.version;typeof Ot=="string"&&Rd.set(n,Ot)}if(xr(n,!1),Is(n,h),S)return;Ji||c(me),p(!1)}catch{if(xr(n,!1),S)return;p(!1)}};return gt(n)===null?xe():U=window.setTimeout(function(){U=0,xe()},_h),function(){S=!0,U!==0&&window.clearTimeout(U)}},[s,n,h]);let y=Ad(Object.values(t??{}),n,!1),k=d!==null?Ad(d.tickets.filter(S=>S.sourceSessionId!==n),n,!0):[],I=y.length>0?y[0].workspaceKey:void 0,P=[...y,...k];Ss(n,P);let F=i??{},Q=o??{},A={},j={};if(d!==null){for(let[S,U]of Object.entries(d.evidence))S.startsWith(n+":")||(A[S]=U);for(let[S,U]of Object.entries(d.comments))S.startsWith(n+":")||(j[S]=U)}let se=Mh({...A,...F}),T={...j,...Q},Z=ja(P,se),pe=P.length-Z.length,qe=Z.length,tn=new Set(P.map(S=>S.workspaceKey)),sn=P.length===0?"default":tn.size===1?P[0].workspaceKey:`default:${n}`,[Be,hn]=K.default.useState(function(){return mn(Cn)}),[R,b]=K.default.useState(function(){let S=kr(n);return S===null?null:S}),N=R,B=K.default.useCallback(function(S){let U=fo(n);U!==null&&gs(n,Le(U)),Jn(n,S),b(S)},[n]);K.default.useEffect(function(){return ws(function(S){if(S!==n)return;let U=kr(n);b(U===null?null:U)})},[n]);let H=function(S){let[U,xe]=K.default.useState(()=>ls(n,S));return[U,function(me){ds(n,S,me),xe(me)}]},[he,_e]=H("create"),[ze,He]=H("plan"),[te,ot]=H("queue"),[rt,at]=H("retired"),[Rt,At]=H("tags");K.default.useEffect(function(){return vr(te||he||ze||rt||Rt),function(){vr(!1)}},[te,he,ze,rt,Rt]);let[Wt,Qt]=K.default.useState([]),[Ln,It]=K.default.useState([]),re=new Set(y.map(S=>ee(S))),Nt=new Set(Ln.map(S=>String(S.ticketId)).filter(S=>re.has(S))),[ge,V]=K.default.useState(null),Ke=K.default.useCallback(function(){V(null),z("actionNominations",{},n).then(S=>{let U=S??[];Qt(U);let xe=zt();Nr({nominations:U,approvals:xe?.approvals??[],at:Date.now()})}).catch(S=>{let U="nominations: "+(S instanceof Error?S.message:String(S));V(xe=>xe==null?U:xe+"; "+U)}),z("pendingApprovals",{},n).then(S=>{let U=S??[];It(U);let xe=zt();Nr({nominations:xe?.nominations??[],approvals:U,at:Date.now()})}).catch(S=>{let U="approvals: "+(S instanceof Error?S.message:String(S));V(xe=>xe==null?U:xe+"; "+U)})},[n]);K.default.useEffect(function(){Ke();let S=setInterval(Ke,Js(te));return function(){clearInterval(S)}},[te,Ke]);let[Ae,fe]=K.default.useState(!1),Ye=K.default.useRef(!1),gn=K.default.useRef(!1),Dn=K.default.useRef(null);Bh(Dn);let Gn=qa(Z);K.default.useEffect(function(){s&&as(n,Gn)},[n,s,Gn]),K.default.useEffect(function(){s&&le("board loaded: "+qe+" tickets")},[s]),K.default.useEffect(function(){if(!s||gn.current)return;gn.current=!0;let S=Lh(sn,P);hn(S),br(n,S)},[s,sn]),K.default.useEffect(function(){if(!s||Ye.current)return;Ye.current=!0;let S=Dh(window.location.search);if(S===null)return;let U=$a(S,P);U!==null?B(ee(U)):le(`#100 deep link ${S} does not resolve on this board`)},[s]),K.default.useEffect(function(){return le("#100 ProjectionReader MOUNTED"),console.info("[aidos] board MOUNT"),function(){let S=new URL(window.location.href).searchParams.has("ticket");bn(`#100 ProjectionReader UNMOUNTING; ticket param present=${S}`+(S?" -> KEPT (round 4: it is what restores the selection after a reload)":"")),console.info("[aidos] board UNMOUNT <- if you see this when opening the queue, it is a remount")}},[]),K.default.useEffect(function(){if(s){fe(!1);return}let S=window.setTimeout(function(){fe(!0)},5e3);return function(){window.clearTimeout(S)}},[s]);let O=Ae&&!s?K.default.createElement("div",{className:"aidos-error"},K.default.createElement("span",null,"The board projection is unavailable. Retry to re-read it."),K.default.createElement("button",{className:"aidos-btn",onClick:e.onRetry},"Retry")):null,D=Ua(Z,Be),G=(function(){let S=new Set;for(let U of Z)for(let xe of U.tags??[])S.add(xe);return S.size})();function ie(S){let U=mn(S);hn(U),br(n,U);try{window.localStorage.setItem(Id(sn),JSON.stringify(U))}catch{}}function Oe(){ie(mn(Cn))}function Pe(S){if(N===S){bn(`#100 selectTicket(${S}) matched the open selection -> TOGGLING CLOSED`),Wn();return}le(`#100 selectTicket(${S})`),B(S),Oi(S)}function Wn(){bn("#100 closeDetail() called; stack: "+(new Error().stack??"unavailable").split(`
`).slice(1,5).join(" <- ")),B(null),Oi(null)}let An=K.default.useRef(null),Me=es(P,N,ys(n,An.current));vs(n,Me.reason,Me.ticket);let _t=K.default.useRef(""),st=`${Me.reason}|sel=${N??"-"}|rows=${P.length}|own=${y.length}|foreign=${k.length}|ref=${An.current===null?"null":"held"}|store=${fo(n)===null?"null":"held"}`;st!==_t.current&&(N!==null||An.current!==null)&&(_t.current=st,(Me.reason==="gone"||Me.reason==="held"?bn:le)(`#100 select: ${st}`)),Me.reason==="resolved"||Me.reason==="reanchored"||Me.reason==="held"?An.current=Me.ticket:(Me.reason==="none"||Me.reason==="gone")&&(An.current=null);let Yt=Me.reanchorKey;K.default.useEffect(function(){Yt!==null&&B(Yt)},[Yt]);let In=Me.ticket,lt=In===null?null:ee(In),Zt=Td(Z),xi=Zt===null?null:ee(Zt),Bn=lt===null?[]:se[lt]??[],dt=lt===null?[]:T[lt]??[],[Wi,Si]=K.default.useState(function(){return dr(Bn)});K.default.useEffect(function(){Si(dr(Bn))},[In?.id]);let Jt=new Map,Xt=(S,U)=>{Jt.has(S)||Jt.set(S,U)};for(let S of P)Xt(ee(S),S),Xt(String(S.id),S),Xt(S.workspaceKey+":"+String(S.id),S);let Qi=Me.absent?K.default.createElement("div",{className:"aidos-detail-absent",role:"status"},"This ticket is not on the board right now. You are seeing the last version that loaded. Close the panel to return to the grid."):null,Nn=In===null?null:Le(In),_n=K.default.useRef(null);Nn!==_n.current&&(_n.current!==null&&Nn!==null?bn(`#100 DetailView KEY CHANGED ${_n.current} -> ${Nn}; it remounts, and the dialog store is what carries the modals through`):_n.current!==null&&Nn===null&&bn(`#100 detail panel CLOSING (was ${_n.current})`),_n.current=Nn);let Sn=In===null?null:K.default.createElement(K.default.Fragment,null,Qi,K.default.createElement(Co,{key:Nn,ticket:In,evidence:Bn,comments:dt,evidenceCollapsed:Wi,onToggleEvidence:()=>{Si(S=>!S)},onClose:Wn,agentId:n,ticketIdKey:lt??String(In.id),onFieldSaved:function(){},ticketsByKey:Jt,onJump:Pe})),ct=K.default.createElement(bd,{open:he,onClose:()=>{_e(!1)},onCreated:S=>{Pe(String(S))},agentId:n}),Ti=f&&P.length===0,Qn;if(O!==null)Qn=O;else if(!s)Qn=K.default.createElement("div",{className:"aidos-skeleton-grid"},[0,1,2,3,4,5].map(S=>K.default.createElement("div",{className:"aidos-skeleton-tile",key:S})));else if(Ti)Qn=K.default.createElement("div",{className:"aidos-merge-loading",role:"status"},K.default.createElement("span",{className:"aidos-merge-spinner","aria-hidden":"true"}),K.default.createElement("span",null,"Loading workspace tickets\u2026"));else{let S=xd(Z,se,Wt,Ln);Qn=K.default.createElement(rl,{ownWorkspaceKey:I,awaitingApprovalKeys:Nt,sessionId:n,tickets:D,allTicketsCount:qe,applied:Be,selectedId:N,activeTicketId:xi,evidenceByTicket:se,onSelect:Pe,onApply:ie,onJump:Pe,onClearFilters:Oe,onPlan:()=>{He(!0)},onCreate:()=>{_e(!0)},onQueue:()=>{ot(!0)},onTags:()=>{At(!0)},tagsTotal:G,onRetired:()=>{at(!0)},retiredCount:pe,queueTotal:S.length,agentAskCount:Hs(S),agentAskCountStale:ge!==null})}async function tr(S,U){if(U.status==="rejected"){S.approvalId!==void 0&&await qi(n,S.approvalId,!1);return}try{if(S.approvalId!==void 0){let xe=U.values[0],Ct=xe!==void 0&&xe.kind==="path-list"?xe.paths:[];await qi(n,S.approvalId,!0,Ct);return}}catch(xe){throw _(xe instanceof Error?xe.message:String(xe),"refusal"),xe}}let Yi=te?K.default.createElement(De,{title:"Waiting on you",wide:!0,onClose:()=>{ot(!1)}},K.default.createElement(kd,{sessionId:n,tickets:Z,evidenceByTicket:se,nominations:Wt,approvals:Ln,error:ge,onRefresh:Ke,onOpen:S=>{ot(!1),Pe(S.boardKey)},onAct:async(S,U)=>{await tr(S,U),Ke()},onDismiss:S=>{z("dismissNomination",{nominationId:S},n).then(()=>{_("Suggestion dismissed","info"),Ke()}).catch(U=>{_(U instanceof Error?U.message:String(U),"refusal")})}})):null,Ei=rt?K.default.createElement(De,{title:"Retired tickets",wide:!0,onClose:()=>{at(!1)}},K.default.createElement(gd,{sessionId:n,onOpen:S=>{at(!1),Pe(S)}})):null,Zi=Rt?K.default.createElement(Sd,{sessionId:n,onOpen:S=>{At(!1),Pe(S)},onClose:()=>{At(!1)}}):null,Ri=K.default.createElement(wd,{open:ze,planMeta:l===null?null:{frontmatter:l.frontmatter,preamble:l.context.preamble,contextSections:l.context.contextSections},agentId:n,onClose:()=>{He(!1)}});return K.default.createElement(K.default.Fragment,null,K.default.createElement("div",{className:"aidos-layout",ref:Dn,"data-conversation-composer-overlay":""},Qn,Sn),ct,Ri,Yi,Ei,Zi,K.default.createElement(Ed,null))}var ki=de(require("react"),1);var ye=de(require("react"),1);var Yd=de(Qd(),1);var Ko=Yd.default;function Zd(e){let n=e.regex,t={},i={begin:/\$\{/,end:/\}/,contains:["self",{begin:/:-/,contains:[t]}]};Object.assign(t,{className:"variable",variants:[{begin:n.concat(/\$[\w\d#@][\w\d_]*/,"(?![\\w\\d])(?![$])")},i]});let o={className:"subst",begin:/\$\(/,end:/\)/,contains:[e.BACKSLASH_ESCAPE]},r=e.inherit(e.COMMENT(),{match:[/(^|\s)/,/#.*$/],scope:{2:"comment"}}),s={begin:/<<-?\s*(?=\w+)/,starts:{contains:[e.END_SAME_AS_BEGIN({begin:/(\w+)/,end:/(\w+)/,className:"string"})]}},a={className:"string",begin:/"/,end:/"/,contains:[e.BACKSLASH_ESCAPE,t,o]};o.contains.push(a);let l={match:/\\"/},d={className:"string",begin:/'/,end:/'/},c={match:/\\'/},f={begin:/\$?\(\(/,end:/\)\)/,contains:[{begin:/\d+#[0-9a-f]+/,className:"number"},e.NUMBER_MODE,t]},p=["fish","bash","zsh","sh","csh","ksh","tcsh","dash","scsh"],h=e.SHEBANG({binary:`(${p.join("|")})`,relevance:10}),y={className:"function",begin:/\w[\w\d_]*\s*\(\s*\)\s*\{/,returnBegin:!0,contains:[e.inherit(e.TITLE_MODE,{begin:/\w[\w\d_]*/})],relevance:0},k=["if","then","else","elif","fi","time","for","while","until","in","do","done","case","esac","coproc","function","select"],I=["true","false"],v={match:/(\/[a-z._-]+)+/},P=["break","cd","continue","eval","exec","exit","export","getopts","hash","pwd","readonly","return","shift","test","times","trap","umask","unset"],F=["alias","bind","builtin","caller","command","declare","echo","enable","help","let","local","logout","mapfile","printf","read","readarray","source","sudo","type","typeset","ulimit","unalias"],Q=["autoload","bg","bindkey","bye","cap","chdir","clone","comparguments","compcall","compctl","compdescribe","compfiles","compgroups","compquote","comptags","comptry","compvalues","dirs","disable","disown","echotc","echoti","emulate","fc","fg","float","functions","getcap","getln","history","integer","jobs","kill","limit","log","noglob","popd","print","pushd","pushln","rehash","sched","setcap","setopt","stat","suspend","ttyctl","unfunction","unhash","unlimit","unsetopt","vared","wait","whence","where","which","zcompile","zformat","zftp","zle","zmodload","zparseopts","zprof","zpty","zregexparse","zsocket","zstyle","ztcp"],A=["chcon","chgrp","chown","chmod","cp","dd","df","dir","dircolors","ln","ls","mkdir","mkfifo","mknod","mktemp","mv","realpath","rm","rmdir","shred","sync","touch","truncate","vdir","b2sum","base32","base64","cat","cksum","comm","csplit","cut","expand","fmt","fold","head","join","md5sum","nl","numfmt","od","paste","ptx","pr","sha1sum","sha224sum","sha256sum","sha384sum","sha512sum","shuf","sort","split","sum","tac","tail","tr","tsort","unexpand","uniq","wc","arch","basename","chroot","date","dirname","du","echo","env","expr","factor","groups","hostid","id","link","logname","nice","nohup","nproc","pathchk","pinky","printenv","printf","pwd","readlink","runcon","seq","sleep","stat","stdbuf","stty","tee","test","timeout","tty","uname","unlink","uptime","users","who","whoami","yes"];return{name:"Bash",aliases:["sh","zsh"],keywords:{$pattern:/\b[a-z][a-z0-9._-]+\b/,keyword:k,literal:I,built_in:[...P,...F,"set","shopt",...Q,...A]},contains:[h,e.SHEBANG(),y,f,r,s,v,a,l,d,c,t]}}var Jd="[A-Za-z$_][0-9A-Za-z$_]*",Ig=["as","in","of","if","for","while","finally","var","new","function","do","return","void","else","break","catch","instanceof","with","throw","case","default","try","switch","continue","typeof","delete","let","yield","const","class","debugger","async","await","static","import","from","export","extends","using"],Ng=["true","false","null","undefined","NaN","Infinity"],Xd=["Object","Function","Boolean","Symbol","Math","Date","Number","BigInt","String","RegExp","Array","Float32Array","Float64Array","Int8Array","Uint8Array","Uint8ClampedArray","Int16Array","Int32Array","Uint16Array","Uint32Array","BigInt64Array","BigUint64Array","Set","Map","WeakSet","WeakMap","ArrayBuffer","SharedArrayBuffer","Atomics","DataView","JSON","Promise","Generator","GeneratorFunction","AsyncFunction","Reflect","Proxy","Intl","WebAssembly"],ec=["Error","EvalError","InternalError","RangeError","ReferenceError","SyntaxError","TypeError","URIError"],nc=["setInterval","setTimeout","clearInterval","clearTimeout","require","exports","eval","isFinite","isNaN","parseFloat","parseInt","decodeURI","decodeURIComponent","encodeURI","encodeURIComponent","escape","unescape"],_g=["arguments","this","super","console","window","document","localStorage","sessionStorage","module","self","global"],Cg=[].concat(nc,Xd,ec);function tc(e){let n=e.regex,t=(N,{after:B})=>{let H="</"+N[0].slice(1);return N.input.indexOf(H,B)!==-1},i=Jd,o={begin:"<>",end:"</>"},r=/<[A-Za-z0-9\\._:-]+\s*\/>/,s={begin:/<[A-Za-z0-9\\._:-]+/,end:/\/[A-Za-z0-9\\._:-]+>|\/>/,isTrulyOpeningTag:(N,B)=>{let H=N[0].length+N.index,he=N.input[H];if(he==="<"||he===","){B.ignoreMatch();return}he===">"&&(t(N,{after:H})||B.ignoreMatch());let _e,ze=N.input.substring(H);if(_e=ze.match(/^\s*=/)){B.ignoreMatch();return}if((_e=ze.match(/^\s+extends\s+/))&&_e.index===0){B.ignoreMatch();return}}},a={$pattern:Jd,keyword:Ig,literal:Ng,built_in:Cg,"variable.language":_g},l="[0-9](_?[0-9])*",d=`\\.(${l})`,c="0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*",f={className:"number",variants:[{begin:`(\\b(${c})((${d})|\\.)?|(${d}))[eE][+-]?(${l})\\b`},{begin:`\\b(${c})\\b((${d})\\b|\\.)?|(${d})\\b`},{begin:"\\b(0|[1-9](_?[0-9])*)n\\b"},{begin:"\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*n?\\b"},{begin:"\\b0[bB][0-1](_?[0-1])*n?\\b"},{begin:"\\b0[oO][0-7](_?[0-7])*n?\\b"},{begin:"\\b0[0-7]+n?\\b"}],relevance:0},p={className:"subst",begin:"\\$\\{",end:"\\}",keywords:a,contains:[]},h={begin:".?html`",end:"",starts:{end:"`",returnEnd:!1,contains:[e.BACKSLASH_ESCAPE,p],subLanguage:"xml"}},y={begin:".?css`",end:"",starts:{end:"`",returnEnd:!1,contains:[e.BACKSLASH_ESCAPE,p],subLanguage:"css"}},k={begin:".?gql`",end:"",starts:{end:"`",returnEnd:!1,contains:[e.BACKSLASH_ESCAPE,p],subLanguage:"graphql"}},I={className:"string",begin:"`",end:"`",contains:[e.BACKSLASH_ESCAPE,p]},P={className:"comment",variants:[e.COMMENT(/\/\*\*(?!\/)/,"\\*/",{relevance:0,contains:[{begin:"(?=@[A-Za-z]+)",relevance:0,contains:[{className:"doctag",begin:"@[A-Za-z]+"},{className:"type",begin:"\\{",end:"\\}",excludeEnd:!0,excludeBegin:!0,relevance:0},{className:"variable",begin:i+"(?=\\s*(-)|$)",endsParent:!0,relevance:0},{begin:/(?=[^\n])\s/,relevance:0}]}]}),e.C_BLOCK_COMMENT_MODE,e.C_LINE_COMMENT_MODE]},F=[e.APOS_STRING_MODE,e.QUOTE_STRING_MODE,h,y,k,I,{match:/\$\d+/},f];p.contains=F.concat({begin:/\{/,end:/\}/,keywords:a,contains:["self"].concat(F)});let Q=[].concat(P,p.contains),A=Q.concat([{begin:/(\s*)\(/,end:/\)/,keywords:a,contains:["self"].concat(Q)}]),j={className:"params",begin:/(\s*)\(/,end:/\)/,excludeBegin:!0,excludeEnd:!0,keywords:a,contains:A},se={variants:[{match:[/class/,/\s+/,i,/\s+/,/extends/,/\s+/,n.concat(i,"(",n.concat(/\./,i),")*")],scope:{1:"keyword",3:"title.class",5:"keyword",7:"title.class.inherited"}},{match:[/class/,/\s+/,i],scope:{1:"keyword",3:"title.class"}}]},T={relevance:0,match:n.either(/\bJSON/,/\b[A-Z][a-z]+([A-Z][a-z]*|\d)*/,/\b[A-Z]{2,}([A-Z][a-z]+|\d)+([A-Z][a-z]*)*/,/\b[A-Z]{2,}[a-z]+([A-Z][a-z]+|\d)*([A-Z][a-z]*)*/),className:"title.class",keywords:{_:[...Xd,...ec]}},Z={label:"use_strict",className:"meta",relevance:10,begin:/^\s*['"]use (strict|asm)['"]/},pe={variants:[{match:[/function/,/\s+/,i,/(?=\s*\()/]},{match:[/function/,/\s*(?=\()/]}],className:{1:"keyword",3:"title.function"},label:"func.def",contains:[j],illegal:/%/},qe={relevance:0,match:/\b[A-Z][A-Z_0-9]+\b/,className:"variable.constant"};function tn(N){return n.concat("(?!",N.join("|"),")")}let sn={match:n.concat(/\b/,tn([...nc,"super","import","await"].map(N=>`${N}\\s*\\(`)),i,n.lookahead(/\s*\(/)),className:"title.function",relevance:0},Be={begin:n.concat(/\./,n.lookahead(n.concat(i,/(?![0-9A-Za-z$_(])/))),end:i,excludeBegin:!0,keywords:"prototype",className:"property",relevance:0},hn={match:[/get|set/,/\s+/,i,/(?=\()/],className:{1:"keyword",3:"title.function"},contains:[{begin:/\(\)/},j]},R="(\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)|"+e.UNDERSCORE_IDENT_RE+")\\s*=>",b={match:[/const|var|let/,/\s+/,i,/\s*/,/=\s*/,/(async\s*)?/,n.lookahead(R)],keywords:"async",className:{1:"keyword",3:"title.function"},contains:[j]};return{name:"JavaScript",aliases:["js","jsx","mjs","cjs"],keywords:a,exports:{PARAMS_CONTAINS:A,CLASS_REFERENCE:T},illegal:/#(?![$_A-Za-z])/,contains:[e.SHEBANG({label:"shebang",binary:"node",relevance:5}),Z,e.APOS_STRING_MODE,e.QUOTE_STRING_MODE,h,y,k,I,P,{match:/\$\d+/},f,T,{scope:"attr",match:i+n.lookahead(":"),relevance:0},b,{begin:"("+e.RE_STARTERS_RE+"|\\b(case|return|throw)\\b)\\s*",keywords:"return throw case",relevance:0,contains:[P,e.REGEXP_MODE,{className:"function",begin:R,returnBegin:!0,end:"\\s*=>",contains:[{className:"params",variants:[{begin:e.UNDERSCORE_IDENT_RE,relevance:0},{className:null,begin:/\(\s*\)/,skip:!0},{begin:/(\s*)\(/,end:/\)/,excludeBegin:!0,excludeEnd:!0,keywords:a,contains:A}]}]},{begin:/,/,relevance:0},{match:/\s+/,relevance:0},{variants:[{begin:o.begin,end:o.end},{match:r},{begin:s.begin,"on:begin":s.isTrulyOpeningTag,end:s.end}],subLanguage:"xml",contains:[{begin:s.begin,end:s.end,skip:!0,contains:["self"]}]}]},pe,{beginKeywords:"while if switch catch for"},{begin:"\\b(?!function)"+e.UNDERSCORE_IDENT_RE+"\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)\\s*\\{",returnBegin:!0,label:"func.def",contains:[j,e.inherit(e.TITLE_MODE,{begin:i,className:"title.function"})]},{match:/\.\.\./,relevance:0},Be,{match:"\\$"+i,relevance:0},{match:[/\bconstructor(?=\s*\()/],className:{1:"title.function"},contains:[j]},sn,qe,se,hn,{match:/\$[(.]/}]}}var Og="([-+]?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)|NaN|[-+]?Infinity",Pg={scope:"number",match:Og,relevance:0};function ic(e){let n={className:"attr",begin:/(("(\\.|[^\\"\r\n])*")|('(\\.|[^\\'\r\n])*'))(?=\s*:)/,relevance:1.01},t={match:/[{}[\],:]/,className:"punctuation",relevance:0},i=["true","false","null"],o={scope:"literal",beginKeywords:i.join(" ")};return{name:"JSON",aliases:["jsonc","json5"],keywords:{literal:i},contains:[n,t,e.APOS_STRING_MODE,e.QUOTE_STRING_MODE,o,Pg,e.C_LINE_COMMENT_MODE,e.C_BLOCK_COMMENT_MODE],illegal:"\\S"}}function oc(e){let n=e.regex,t=/[\p{XID_Start}_]\p{XID_Continue}*/u,i=["and","as","assert","async","await","break","case","class","continue","def","del","elif","else","except","finally","for","from","global","if","import","in","is","lambda","lazy","match","nonlocal|10","not","or","pass","raise","return","try","while","with","yield"],a={$pattern:/[A-Za-z]\w+|__\w+__/,keyword:i,built_in:["__import__","abs","aiter","all","anext","any","ascii","bin","bool","breakpoint","bytearray","bytes","callable","chr","classmethod","compile","complex","delattr","dict","dir","divmod","enumerate","eval","exec","filter","float","format","frozendict","frozenset","getattr","globals","hasattr","hash","help","hex","id","input","int","isinstance","issubclass","iter","len","list","locals","map","max","memoryview","min","next","object","oct","open","ord","pow","print","property","range","repr","reversed","round","sentinel","set","setattr","slice","sorted","staticmethod","str","sum","super","tuple","type","vars","zip"],literal:["__debug__","Ellipsis","False","None","NotImplemented","True"],type:["Any","Callable","Coroutine","Dict","List","Literal","Generic","Optional","Sequence","Set","Tuple","Type","Union"]},l={className:"meta",begin:/^(>>>|\.\.\.) /},d={className:"subst",begin:/\{/,end:/\}/,keywords:a,illegal:/#/},c={begin:/\{\{/,relevance:0},f={className:"string",contains:[e.BACKSLASH_ESCAPE],variants:[{begin:/([uU]|[bB]|[rR]|[bB][rR]|[rR][bB])?'''/,end:/'''/,contains:[e.BACKSLASH_ESCAPE,l],relevance:10},{begin:/([uU]|[bB]|[rR]|[bB][rR]|[rR][bB])?"""/,end:/"""/,contains:[e.BACKSLASH_ESCAPE,l],relevance:10},{begin:/([fFtT][rR]|[rR][fFtT]|[fFtT])'''/,end:/'''/,contains:[e.BACKSLASH_ESCAPE,l,c,d]},{begin:/([fFtT][rR]|[rR][fFtT]|[fFtT])"""/,end:/"""/,contains:[e.BACKSLASH_ESCAPE,l,c,d]},{begin:/([uU]|[rR])'/,end:/'/,relevance:10},{begin:/([uU]|[rR])"/,end:/"/,relevance:10},{begin:/([bB]|[bB][rR]|[rR][bB])'/,end:/'/},{begin:/([bB]|[bB][rR]|[rR][bB])"/,end:/"/},{begin:/([fFtT][rR]|[rR][fFtT]|[fFtT])'/,end:/'/,contains:[e.BACKSLASH_ESCAPE,c,d]},{begin:/([fFtT][rR]|[rR][fFtT]|[fFtT])"/,end:/"/,contains:[e.BACKSLASH_ESCAPE,c,d]},e.APOS_STRING_MODE,e.QUOTE_STRING_MODE]},p="[0-9](_?[0-9])*",h=`(\\b(${p}))?\\.(${p})|\\b(${p})\\.`,y=`\\b|${i.join("|")}`,k={className:"number",relevance:0,variants:[{begin:`(\\b(${p})|(${h}))[eE][+-]?(${p})[jJ]?(?=${y})`},{begin:`(${h})[jJ]?`},{begin:`\\b([1-9](_?[0-9])*|0+(_?0)*)[lLjJ]?(?=${y})`},{begin:`\\b0[bB](_?[01])+[lL]?(?=${y})`},{begin:`\\b0[oO](_?[0-7])+[lL]?(?=${y})`},{begin:`\\b0[xX](_?[0-9a-fA-F])+[lL]?(?=${y})`},{begin:`\\b(${p})[jJ](?=${y})`}]},I={className:"comment",begin:n.lookahead(/# type:/),end:/$/,keywords:a,contains:[{begin:/# type:/},{begin:/#/,end:/\b\B/,endsWithParent:!0}]},v={className:"params",variants:[{className:"",begin:/\(\s*\)/,skip:!0},{begin:/\(/,end:/\)/,excludeBegin:!0,excludeEnd:!0,keywords:a,contains:["self",l,k,f,e.HASH_COMMENT_MODE]}]};return d.contains=[f,k,l],{name:"Python",aliases:["py","gyp","ipython"],unicodeRegex:!0,keywords:a,illegal:/(<\/|\?)|=>/,contains:[l,k,{scope:"variable.language",match:/\bself\b/},{beginKeywords:"if",relevance:0},{match:/\bor\b/,scope:"keyword"},f,I,e.HASH_COMMENT_MODE,{match:[/\bdef/,/\s+/,t],scope:{1:"keyword",3:"title.function"},contains:[v]},{variants:[{match:[/\bclass/,/\s+/,t,/\s*/,/\(\s*/,t,/\s*\)/]},{match:[/\bclass/,/\s+/,t]}],scope:{1:"keyword",3:"title.class",6:"title.class.inherited"}},{className:"meta",begin:/^[\t ]*@/,end:/(?=#)|$/,contains:[k,v,f]}]}}var Fo="[A-Za-z$_][0-9A-Za-z$_]*",rc=["as","in","of","if","for","while","finally","var","new","function","do","return","void","else","break","catch","instanceof","with","throw","case","default","try","switch","continue","typeof","delete","let","yield","const","class","debugger","async","await","static","import","from","export","extends","using"],ac=["true","false","null","undefined","NaN","Infinity"],sc=["Object","Function","Boolean","Symbol","Math","Date","Number","BigInt","String","RegExp","Array","Float32Array","Float64Array","Int8Array","Uint8Array","Uint8ClampedArray","Int16Array","Int32Array","Uint16Array","Uint32Array","BigInt64Array","BigUint64Array","Set","Map","WeakSet","WeakMap","ArrayBuffer","SharedArrayBuffer","Atomics","DataView","JSON","Promise","Generator","GeneratorFunction","AsyncFunction","Reflect","Proxy","Intl","WebAssembly"],lc=["Error","EvalError","InternalError","RangeError","ReferenceError","SyntaxError","TypeError","URIError"],dc=["setInterval","setTimeout","clearInterval","clearTimeout","require","exports","eval","isFinite","isNaN","parseFloat","parseInt","decodeURI","decodeURIComponent","encodeURI","encodeURIComponent","escape","unescape"],cc=["arguments","this","super","console","window","document","localStorage","sessionStorage","module","self","global"],uc=[].concat(dc,sc,lc);function Mg(e){let n=e.regex,t=(N,{after:B})=>{let H="</"+N[0].slice(1);return N.input.indexOf(H,B)!==-1},i=Fo,o={begin:"<>",end:"</>"},r=/<[A-Za-z0-9\\._:-]+\s*\/>/,s={begin:/<[A-Za-z0-9\\._:-]+/,end:/\/[A-Za-z0-9\\._:-]+>|\/>/,isTrulyOpeningTag:(N,B)=>{let H=N[0].length+N.index,he=N.input[H];if(he==="<"||he===","){B.ignoreMatch();return}he===">"&&(t(N,{after:H})||B.ignoreMatch());let _e,ze=N.input.substring(H);if(_e=ze.match(/^\s*=/)){B.ignoreMatch();return}if((_e=ze.match(/^\s+extends\s+/))&&_e.index===0){B.ignoreMatch();return}}},a={$pattern:Fo,keyword:rc,literal:ac,built_in:uc,"variable.language":cc},l="[0-9](_?[0-9])*",d=`\\.(${l})`,c="0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*",f={className:"number",variants:[{begin:`(\\b(${c})((${d})|\\.)?|(${d}))[eE][+-]?(${l})\\b`},{begin:`\\b(${c})\\b((${d})\\b|\\.)?|(${d})\\b`},{begin:"\\b(0|[1-9](_?[0-9])*)n\\b"},{begin:"\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*n?\\b"},{begin:"\\b0[bB][0-1](_?[0-1])*n?\\b"},{begin:"\\b0[oO][0-7](_?[0-7])*n?\\b"},{begin:"\\b0[0-7]+n?\\b"}],relevance:0},p={className:"subst",begin:"\\$\\{",end:"\\}",keywords:a,contains:[]},h={begin:".?html`",end:"",starts:{end:"`",returnEnd:!1,contains:[e.BACKSLASH_ESCAPE,p],subLanguage:"xml"}},y={begin:".?css`",end:"",starts:{end:"`",returnEnd:!1,contains:[e.BACKSLASH_ESCAPE,p],subLanguage:"css"}},k={begin:".?gql`",end:"",starts:{end:"`",returnEnd:!1,contains:[e.BACKSLASH_ESCAPE,p],subLanguage:"graphql"}},I={className:"string",begin:"`",end:"`",contains:[e.BACKSLASH_ESCAPE,p]},P={className:"comment",variants:[e.COMMENT(/\/\*\*(?!\/)/,"\\*/",{relevance:0,contains:[{begin:"(?=@[A-Za-z]+)",relevance:0,contains:[{className:"doctag",begin:"@[A-Za-z]+"},{className:"type",begin:"\\{",end:"\\}",excludeEnd:!0,excludeBegin:!0,relevance:0},{className:"variable",begin:i+"(?=\\s*(-)|$)",endsParent:!0,relevance:0},{begin:/(?=[^\n])\s/,relevance:0}]}]}),e.C_BLOCK_COMMENT_MODE,e.C_LINE_COMMENT_MODE]},F=[e.APOS_STRING_MODE,e.QUOTE_STRING_MODE,h,y,k,I,{match:/\$\d+/},f];p.contains=F.concat({begin:/\{/,end:/\}/,keywords:a,contains:["self"].concat(F)});let Q=[].concat(P,p.contains),A=Q.concat([{begin:/(\s*)\(/,end:/\)/,keywords:a,contains:["self"].concat(Q)}]),j={className:"params",begin:/(\s*)\(/,end:/\)/,excludeBegin:!0,excludeEnd:!0,keywords:a,contains:A},se={variants:[{match:[/class/,/\s+/,i,/\s+/,/extends/,/\s+/,n.concat(i,"(",n.concat(/\./,i),")*")],scope:{1:"keyword",3:"title.class",5:"keyword",7:"title.class.inherited"}},{match:[/class/,/\s+/,i],scope:{1:"keyword",3:"title.class"}}]},T={relevance:0,match:n.either(/\bJSON/,/\b[A-Z][a-z]+([A-Z][a-z]*|\d)*/,/\b[A-Z]{2,}([A-Z][a-z]+|\d)+([A-Z][a-z]*)*/,/\b[A-Z]{2,}[a-z]+([A-Z][a-z]+|\d)*([A-Z][a-z]*)*/),className:"title.class",keywords:{_:[...sc,...lc]}},Z={label:"use_strict",className:"meta",relevance:10,begin:/^\s*['"]use (strict|asm)['"]/},pe={variants:[{match:[/function/,/\s+/,i,/(?=\s*\()/]},{match:[/function/,/\s*(?=\()/]}],className:{1:"keyword",3:"title.function"},label:"func.def",contains:[j],illegal:/%/},qe={relevance:0,match:/\b[A-Z][A-Z_0-9]+\b/,className:"variable.constant"};function tn(N){return n.concat("(?!",N.join("|"),")")}let sn={match:n.concat(/\b/,tn([...dc,"super","import","await"].map(N=>`${N}\\s*\\(`)),i,n.lookahead(/\s*\(/)),className:"title.function",relevance:0},Be={begin:n.concat(/\./,n.lookahead(n.concat(i,/(?![0-9A-Za-z$_(])/))),end:i,excludeBegin:!0,keywords:"prototype",className:"property",relevance:0},hn={match:[/get|set/,/\s+/,i,/(?=\()/],className:{1:"keyword",3:"title.function"},contains:[{begin:/\(\)/},j]},R="(\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)|"+e.UNDERSCORE_IDENT_RE+")\\s*=>",b={match:[/const|var|let/,/\s+/,i,/\s*/,/=\s*/,/(async\s*)?/,n.lookahead(R)],keywords:"async",className:{1:"keyword",3:"title.function"},contains:[j]};return{name:"JavaScript",aliases:["js","jsx","mjs","cjs"],keywords:a,exports:{PARAMS_CONTAINS:A,CLASS_REFERENCE:T},illegal:/#(?![$_A-Za-z])/,contains:[e.SHEBANG({label:"shebang",binary:"node",relevance:5}),Z,e.APOS_STRING_MODE,e.QUOTE_STRING_MODE,h,y,k,I,P,{match:/\$\d+/},f,T,{scope:"attr",match:i+n.lookahead(":"),relevance:0},b,{begin:"("+e.RE_STARTERS_RE+"|\\b(case|return|throw)\\b)\\s*",keywords:"return throw case",relevance:0,contains:[P,e.REGEXP_MODE,{className:"function",begin:R,returnBegin:!0,end:"\\s*=>",contains:[{className:"params",variants:[{begin:e.UNDERSCORE_IDENT_RE,relevance:0},{className:null,begin:/\(\s*\)/,skip:!0},{begin:/(\s*)\(/,end:/\)/,excludeBegin:!0,excludeEnd:!0,keywords:a,contains:A}]}]},{begin:/,/,relevance:0},{match:/\s+/,relevance:0},{variants:[{begin:o.begin,end:o.end},{match:r},{begin:s.begin,"on:begin":s.isTrulyOpeningTag,end:s.end}],subLanguage:"xml",contains:[{begin:s.begin,end:s.end,skip:!0,contains:["self"]}]}]},pe,{beginKeywords:"while if switch catch for"},{begin:"\\b(?!function)"+e.UNDERSCORE_IDENT_RE+"\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)\\s*\\{",returnBegin:!0,label:"func.def",contains:[j,e.inherit(e.TITLE_MODE,{begin:i,className:"title.function"})]},{match:/\.\.\./,relevance:0},Be,{match:"\\$"+i,relevance:0},{match:[/\bconstructor(?=\s*\()/],className:{1:"title.function"},contains:[j]},sn,qe,se,hn,{match:/\$[(.]/}]}}function pc(e){let n=e.regex,t=Mg(e),i=Fo,o=["any","void","number","boolean","string","object","never","symbol","bigint","unknown"],r={begin:[/namespace/,/\s+/,e.IDENT_RE],beginScope:{1:"keyword",3:"title.class"}},s={beginKeywords:"interface",end:/\{/,excludeEnd:!0,keywords:{keyword:"interface extends",built_in:o},contains:[t.exports.CLASS_REFERENCE]},a={className:"meta",relevance:10,begin:/^\s*['"]use strict['"]/},l=["type","interface","public","private","protected","implements","declare","abstract","readonly","enum","override","satisfies"],d={$pattern:Fo,keyword:rc.concat(l),literal:ac,built_in:uc.concat(o),"variable.language":cc},c={className:"meta",begin:"@"+i},f=(k,I,v)=>{let P=k.contains.findIndex(F=>F.label===I);if(P===-1)throw new Error("can not find mode to replace");k.contains.splice(P,1,v)};Object.assign(t.keywords,d),t.exports.PARAMS_CONTAINS.push(c);let p=t.contains.find(k=>k.scope==="attr"),h=Object.assign({},p,{match:n.concat(i,n.lookahead(/\s*\?:/))});t.exports.PARAMS_CONTAINS.push([t.exports.CLASS_REFERENCE,p,h]),t.contains=t.contains.concat([c,r,s,h]),f(t,"shebang",e.SHEBANG()),f(t,"use_strict",a);let y=t.contains.find(k=>k.label==="func.def");return y.relevance=0,Object.assign(t,{name:"TypeScript",aliases:["ts","tsx","mts","cts"]}),t}function fc(e){let n="true false yes no null",t="[\\w#;/?:@&=+$,.~*'()[\\]]+",i={className:"attr",variants:[{begin:/[\w*@][\w*@ :()\./-]*:(?=[ \t]|$)/},{begin:/"[\w*@][\w*@ :()\./-]*":(?=[ \t]|$)/},{begin:/'[\w*@][\w*@ :()\./-]*':(?=[ \t]|$)/}]},o={className:"template-variable",variants:[{begin:/\{\{/,end:/\}\}/},{begin:/%\{/,end:/\}/}]},r={className:"string",relevance:0,begin:/'/,end:/'/,contains:[{match:/''/,scope:"char.escape",relevance:0}]},s={className:"string",relevance:0,variants:[{begin:/"/,end:/"/},{begin:/\S+/}],contains:[e.BACKSLASH_ESCAPE,o]},a=e.inherit(s,{variants:[{begin:/'/,end:/'/,contains:[{begin:/''/,relevance:0}]},{begin:/"/,end:/"/},{begin:/[^\s,{}[\]]+/}]}),p={className:"number",begin:"\\b"+"[0-9]{4}(-[0-9][0-9]){0,2}"+"([Tt \\t][0-9][0-9]?(:[0-9][0-9]){2})?"+"(\\.[0-9]*)?"+"([ \\t])*(Z|[-+][0-9][0-9]?(:[0-9][0-9])?)?"+"\\b"},h={end:",",endsWithParent:!0,excludeEnd:!0,keywords:n,relevance:0},y={begin:/\{/,end:/\}/,contains:[h],illegal:"\\n",relevance:0},k={begin:"\\[",end:"\\]",contains:[h],illegal:"\\n",relevance:0},I=[i,{className:"meta",begin:"^---\\s*$",relevance:10},{className:"string",begin:"[\\|>]([1-9]?[+-])?[ ]*\\n( +)[^ ][^\\n]*\\n(\\2[^\\n]+\\n?)*"},{begin:"<%[%=-]?",end:"[%-]?%>",subLanguage:"ruby",excludeBegin:!0,excludeEnd:!0,relevance:0},{className:"type",begin:"!\\w+!"+t},{className:"type",begin:"!<"+t+">"},{className:"type",begin:"!"+t},{className:"type",begin:"!!"+t},{className:"meta",begin:"&"+e.UNDERSCORE_IDENT_RE+"$"},{className:"meta",begin:"\\*"+e.UNDERSCORE_IDENT_RE+"$"},{className:"bullet",begin:"-(?=[ ]|$)",relevance:0},e.HASH_COMMENT_MODE,{beginKeywords:n,keywords:{literal:n}},p,{className:"number",begin:e.C_NUMBER_RE+"\\b",relevance:0},y,k,r,s],v=[...I];return v.pop(),v.push(a),h.contains=v,{name:"YAML",case_insensitive:!0,aliases:["yml"],contains:I}}var hc={javascript:tc,typescript:pc,json:ic,python:oc,bash:Zd,yaml:fc},Lg={js:"javascript",mjs:"javascript",cjs:"javascript",jsx:"javascript",ts:"typescript",mts:"typescript",cts:"typescript",tsx:"typescript",json:"json",jsonc:"json",jsonl:"json",py:"python",pyi:"python",sh:"bash",bash:"bash",zsh:"bash",yml:"yaml",yaml:"yaml"},gc=new Set;function Dg(e){Object.prototype.hasOwnProperty.call(hc,e)&&(gc.has(e)||(Ko.registerLanguage(e,hc[e]),gc.add(e)))}function Bg(e){let n=/\.([A-Za-z0-9_+-]+)$/.exec(e);return n===null?"":n[1].toLowerCase()}function mc(e){return Lg[Bg(e)]??null}function zg(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function bc(e,n){n!==null&&Dg(n);let t=n!==null&&Ko.getLanguage(n)!==void 0?n:null;if(t!==null)try{return Ko.highlight(e,{language:t}).value}catch{}return zg(e)}function wc(e){let n=1;for(let t of e){if(t===null)continue;let i=String(t).length;i>n&&(n=i)}return String(n+2)+"ch"}function Kg(e){if(typeof e!="string"||e==="")return e;for(var n=e.replace(/\t/g,"    "),t=n.split(`
`),i=-1,o=0;o<t.length;o++)if(t[o].trim()!==""){for(var r=0;r<t[o].length&&t[o].charAt(r)===" ";)r++;(i===-1||r<i)&&(i=r)}if(i<=0)return n;for(var s=[],o=0;o<t.length;o++)s.push(t[o].trim()===""?"":t[o].slice(i));return s.join(`
`)}var sa=/^([A-Za-z0-9]{3})│/;function Fg(e){return e.length>0&&/^<path>/.test(e[0])&&e.indexOf("<content>")!==-1}function yc(e,n){if(e!==null&&typeof e=="object"&&typeof e.offset=="number"&&Number.isInteger(e.offset)&&e.offset>=1)return e.offset;var t=String(n).split(`
`);if(t.length>0&&sa.test(t[0])){var i=/\[Showing lines (\d+)-(\d+) of \d+/.exec(String(n));if(i!==null)return parseInt(i[1],10)}var o=/\(Showing lines (\d+)-\d+/.exec(String(n));return o!==null?parseInt(o[1],10):1}function la(e,n){for(var t=String(e).split(`
`),i=t.length>0&&sa.test(t[0]),o=!i&&Fg(t),r=[],s=n,a=0;a<t.length;a++)if(i&&sa.test(t[a]))r.push({number:s,text:t[a].slice(4)}),s++;else if(i)r.push({number:null,text:t[a]});else if(o){if(a===0||/^<type>/.test(t[a])||t[a]==="<content>"||t[a]==="</content>")continue;var l=/^(\d+): ?/.exec(t[a]);l!==null?r.push({number:parseInt(l[1],10),text:t[a].slice(l[0].length)}):r.push({number:null,text:t[a]})}else r.push({number:s,text:t[a]}),s++;for(var d=[],a=0;a<r.length;a++)r[a].number!==null&&d.push(r[a].text);for(var c=Kg(d.join(`
`)).split(`
`),f=0,a=0;a<r.length;a++)r[a].number!==null&&(r[a].text=c[f++]);return r}function $o(e){return e!==null&&typeof e=="object"&&"kind"in e}function jo(e){if(e===null||typeof e!="object")return"";let n=e;if($o(e)){let t=n.call;return t!==void 0&&typeof t.argsRaw=="string"?t.argsRaw:""}return typeof n.argsRaw=="string"?n.argsRaw:""}function Uo(e){if(e==="")return null;try{let n=JSON.parse(e);return n!==null&&typeof n=="object"&&!Array.isArray(n)?n:null}catch{return null}}function vc(e,n,t){return t===void 0?{text:n,isError:!1}:{text:t,isError:e==="error"}}function vi(e,n){if(e!==null)for(let t of n){let i=e[t];if(typeof i=="string"&&i!=="")return i}}function Vo(e){if(!$o(e))return"running";let n=e,t=n.error;return t!==void 0&&t.code==="interrupted"?"stopped":n.isError===!0?"error":"ok"}function St(e){if(!$o(e))return null;let n=e.content,t=Array.isArray(n)?n:[],i=[];for(let o of t)if(o!==null&&typeof o=="object"){let r=o;if(r.type==="text"&&typeof r.text=="string"){i.push(r.text);continue}try{i.push(JSON.stringify(r,null,2))}catch{}}return i.join(`
`)}function qo(e){if(!$o(e))return null;let n=St(e);if(n!==null&&n!=="")return n;let t=e.error;return t!==void 0&&typeof t.message=="string"?t.message:t!==void 0&&typeof t.code=="string"?t.code:null}function $g(e){let n=e.indexOf(`
`);return n===-1?e:e.slice(0,n)}var jg=/\[(?:E_|exit code:|sandbox:)|FS_[A-Z_]+|AIDOS_[A-Z_]+/;function Ho(e){if(e==="")return e;let n=Ug(e);if(n!==null)return n;for(let t of e.split(`
`))if(jg.test(t))return t;return $g(e)}function Ug(e){let n=Go(e);if(n===null)return null;let{code:t,message:i}=n;return i===null?t:t===null?i:`${t} \u2014 ${i}`}var Vg=new Set(["tool_error","Error","error"]),qg=[/^gate refused/i,/\brefused\b/i,/is not one of the ticket's criteria/i,/cannot attach kind/i,/outside the allowlist/i,/\bnot permitted\b/i];function Go(e){let n=e.indexOf("{"),t=e.lastIndexOf("}");if(n===-1||t<=n)return null;let i;try{i=JSON.parse(e.slice(n,t+1))}catch{return null}if(i===null||typeof i!="object"||Array.isArray(i))return null;let o=i,r=typeof o.message=="string"?o.message:null,s=typeof o.code=="string"?o.code:typeof o.error=="string"?o.error:null,a=s!==null&&Vg.has(s)&&r!==null?null:s,l={};for(let[c,f]of Object.entries(o))c==="ok"||c==="error"||c==="code"||c==="message"||(l[c]=f);let d=r??s??"";return{code:a,message:r,extra:l,refusal:qg.some(c=>c.test(d))}}function kc(e,n){if(n===void 0||n==="")return e;let t=n.endsWith("/")?n:n+"/";return e.startsWith(t)?e.slice(t.length):e}function da(e){if(e===null||e==="")return e;try{let n=JSON.parse(e);if(n===null||typeof n!="object")return e;let t=n;return typeof t.content=="string"?t.content:typeof t.message=="string"?t.message:e}catch{return e}}function Hg(e){let n=0;for(let o=0;o<e.length;o++)n=n*31+e.charCodeAt(o)|0;n=Math.abs(n);let i=n*.6180339887498949%1;return Math.floor(i*360)}function Wo(e,n){if(n)return{background:"color-mix(in srgb, var(--dsw-alias-state-error-primary) 85%, black)",borderColor:"var(--dsw-alias-state-error-primary)",color:"#fff"};let t=Hg(e);return{background:`color-mix(in srgb, hsl(${t} 65% 45%) 55%, var(--dsw-alias-bg-tertiary))`,borderColor:`hsl(${t} 55% 60%)`}}function Gg({state:e,open:n}){return ye.default.createElement(mo,{open:n})}function Qo({title:e,icon:n,summary:t,state:i,body:o,errorSummary:r,path:s,openFile:a,inspect:l}){let[d,c]=ye.default.useState(!1),f=o!==null||l!==void 0,p=d&&f,h=i==="error"&&r!==void 0,y=h?r:t,k=!h&&s!==void 0&&a!==void 0,I=()=>{s!==void 0&&a!==void 0&&a(s)};return ye.default.createElement("div",{className:"tool-render-card","data-error":i==="error"||void 0,"data-stopped":i==="stopped"||void 0},ye.default.createElement("div",{className:"tool-render-row","data-state":i,"data-expandable":f?!0:void 0,role:f?"button":void 0,tabIndex:f?0:void 0,"aria-expanded":f?p:void 0,onClick:f?()=>c(!d):void 0,onKeyDown:f?v=>{(v.key==="Enter"||v.key===" ")&&(v.preventDefault(),c(!d))}:void 0},f?ye.default.createElement(Gg,{state:i,open:p}):null,ye.default.createElement("span",{className:"tool-render-name-badge",style:Wo(e,i==="error")},ye.default.createElement("span",{className:"tool-render-name-badge-icon"},n),ye.default.createElement("span",{className:"tool-render-name-badge-text",title:e,"data-dsh-tip":""},e)),ye.default.createElement("span",{className:"tool-render-sep","aria-hidden":"true"}),k?ye.default.createElement("span",{className:"tool-render-path",role:"link",tabIndex:0,title:s,"data-dsh-tip":"",onClick:v=>{v.stopPropagation(),I()},onKeyDown:v=>{(v.key==="Enter"||v.key===" ")&&(v.preventDefault(),v.stopPropagation(),I())}},y):ye.default.createElement("span",{className:"tool-render-summary","tool-render-error":h?!0:void 0,title:y,"data-dsh-tip":""},y)),p?ye.default.createElement("div",{className:"tool-render-body"},o,l!==void 0?ye.default.createElement("button",{type:"button",className:"tool-render-inspect",onClick:l},ye.default.createElement($s,null),"Inspect"):null):null)}function Yo(e,n){let t=Uo(jo(e.block)),i=Vo(e.block),o=vi(t,["path","file_path"]),r=i==="error"?qo(e.block):null,s=o!==void 0?kc(o,e.cwd):n,a=r!==null&&r!==""?Ho(r):void 0;return{args:t,state:i,summary:s,errorText:r,errorSummary:a,path:o,openFile:e.openFile,inspect:e.inspect}}function Zo(e,n){return e===null||e===""?null:ye.default.createElement("pre",{className:"tool-render-output","tool-render-error":n?!0:void 0},e)}function Wg(e,n){return xc(la(e,yc(null,e)),n)}function xc(e,n){let t=mc(n??""),i=wc(e.map(o=>o.number));return ye.default.createElement("div",{className:"tool-render-code"},e.map((o,r)=>ye.default.createElement("div",{className:"tool-render-code-row",key:r},ye.default.createElement("span",{className:"tool-render-gutter","aria-hidden":"true",style:{width:i}},o.number===null?"":String(o.number)),ye.default.createElement("code",{className:"tool-render-line-cell hljs","data-highlighted":"yes",dangerouslySetInnerHTML:{__html:bc(o.text,t)}}))))}function Qg(e,n){return ye.default.createElement("div",{className:"tool-render-write"},ye.default.createElement("div",{className:"tool-render-write-note"},"No earlier version on record; new content below"),xc(la(e,1),n))}function Yg(e){let n=Yo(e,"Read"),{args:t,state:i,errorText:o}=n,r=i==="error"?o:da(St(e.block)),s=vi(t,["path","file_path"]),a=i==="error"||r===null||r===""?Zo(r,i==="error"):Wg(r,s);return ye.default.createElement(Qo,{...n,icon:ye.default.createElement(Xn,null),title:"Scratch read",body:a})}function Zg(e){let n=Yo(e,"Write"),{args:t,state:i,errorText:o}=n,r=i==="error"?o:vi(t,["content"])??null,s=i==="error"||r===null||r===""?Zo(r,i==="error"):Qg(r,n.path);return ye.default.createElement(Qo,{...n,icon:ye.default.createElement(Tn,null),title:"Scratch write",body:s})}function Jg(e){let n=Yo(e,"Edit"),{args:t,state:i,errorText:o}=n,r;if(i==="error")r=o;else{let s=vi(t,["old_string"]),a=vi(t,["new_string"]);r=s!==void 0||a!==void 0?`- ${s??""}
+ ${a??""}`:da(St(e.block))}return ye.default.createElement(Qo,{...n,icon:ye.default.createElement(Tn,null),title:"Scratch edit",body:Zo(r,i==="error")})}function Xg(e){let n=Yo(e,"Mkdir"),{state:t,errorText:i}=n;return ye.default.createElement(Qo,{...n,icon:ye.default.createElement(li,null),title:"Scratch mkdir",body:Zo(t==="error"?i:null,t==="error")})}var Sc=[["scratch_read",Yg],["scratch_write",Zg],["scratch_edit",Jg],["scratch_mkdir",Xg]];var m=de(require("react"),1);function Tt(e){return e!==null&&typeof e=="object"&&!Array.isArray(e)?e:null}function qn(e){return Array.isArray(e)?e:[]}function ve(e){return typeof e=="string"?e:typeof e=="number"||typeof e=="boolean"?String(e):null}function Tc(e,n=120){let i=(typeof e=="string"?e:JSON.stringify(e)??"").replace(/\s+/g," ").trim();return i.length>n?i.slice(0,n-1)+"\u2026":i}function ca(e){if(typeof e=="string")return e;if(e===void 0)return"";try{return JSON.stringify(e,null,2)??String(e)}catch{return String(e)}}function Ie(e,n,t){let i=Tc(n,t?.max),o=n.trim(),r=o!==i,s=/\n/.test(o);return!r&&!s?{label:e,value:i}:{label:e,value:i,full:o,...t?.markdown===!0?{markdown:!0}:{},...t?.open===!0?{open:!0}:{}}}function ua(e){let n=Tt(e?.ticket);if(n===null)return[];let t=[],i=ve(n.state);i!==null&&t.push({label:"State",value:i});let o=n.gatePresent,r=n.gateTotal;typeof o=="number"&&typeof r=="number"&&t.push({label:"Gate",value:`${o}/${r}`});let s=ve(n.description);s!==null&&s.trim()!==""&&t.push(Ie("Description",s,{markdown:!0}));let a=ve(n.criteria);a!==null&&a.trim()!==""&&t.push(Ie("Criteria",a));let l=ve(n.body);l!==null&&l.trim()!==""&&t.push(Ie("Body",l,{markdown:!0}));let d=qn(n.allowlist);d.length>0&&t.push(Ie("Allowlist",d.map(p=>String(p)).join(" \xB7 ")));let c=qn(n.dependsOn);c.length>0&&t.push(Ie("Depends on",c.map(p=>String(p)).join(" \xB7 ")));let f=e?.commentCount;return typeof f=="number"&&f>0&&t.push({label:"Comments",value:String(f)}),t}function em(e){let n=[],t=e.gatePresent,i=e.gateTotal;typeof t=="number"&&typeof i=="number"&&n.push({label:"Gate",value:`${t}/${i}`});let o=e.confidenceScore;typeof o=="number"&&n.push({label:"Score",value:String(o)});let r=e.phase;typeof r=="number"&&n.push({label:"Phase",value:String(r)});let s=e.dependsOnCount;typeof s=="number"&&s>0&&n.push({label:"Depends on",value:String(s)});let a=e.allowlistCount;typeof a=="number"&&a>0&&n.push({label:"Allowlist",value:`${a} path${a===1?"":"s"}`});let l=ve(e.descriptionExcerpt);if(l!==null&&l.trim()!==""){let c=e.descriptionTruncated===!0?l.trimEnd()+`

_(excerpt \u2014 read the ticket for the rest)_`:l;n.push(Ie("Description",c,{markdown:!0}))}return{id:ve(e.id)??"?",state:ve(e.state)??"",title:ve(e.title)??"",facts:n}}function Ec(e){let n=Tt(e?.ticket);if(n===null)return null;let t=ve(n.title)??"";return t.trim()===""?null:{id:ve(n.id)??"?",state:ve(n.state)??"",title:t}}function Rc(e){return qn(e?.tickets).map(n=>Tt(n)).filter(n=>n!==null).map(n=>em(n))}function Ac(e){return qn(e?.evidence).map(n=>Tt(n)).filter(n=>n!==null).map(n=>({kind:ve(n.kind)??"",author:ve(n.author)??"agent",at:typeof n.at=="number"?n.at:void 0,excerpt:ve(n.excerpt)??""})).filter(n=>n.kind!=="")}function Ic(e){return qn(e?.evidence).map(n=>Tt(n)).filter(n=>n!==null).map((n,t)=>({index:typeof n.index=="number"?n.index:t,kind:ve(n.kind)??"",author:ve(n.author)??"agent",at:typeof n.at=="number"?n.at:void 0,payload:Tt(n.payload)??{}})).filter(n=>n.kind!=="")}function Nc(e){return qn(e?.comments).map(n=>Tt(n)).filter(n=>n!==null).map(n=>({author:ve(n.author)??"user",at:typeof n.at=="number"?n.at:void 0,body:ve(n.body)??""})).filter(n=>n.body!=="")}function _c(e){if(e===null)return"all tickets";let n=[],i=(Array.isArray(e.stateIds)?e.stateIds:[e.stateIds]).map(c=>ve(c)).filter(c=>c!==null&&c!=="");i.length>0&&n.push(i.join("|"));let o=ve(e.search);o!==null&&o!==""&&n.push(`"${o}"`);let r=qn(e.projectIds).map(c=>ve(c)).filter(c=>c!==null&&c!==""),s=ve(e.projectId);r.length>0?n.push(`projects ${r.join(",")}`):s!==null&&s!==""&&n.push(`project ${s}`);let a=ve(e.sortKey);a!==null&&a!==""&&n.push(`${a} ${e.descending===!1?"\u2191":"\u2193"}`),e.detail==="full"&&n.push("full");let l=ve(e.limit);l!==null&&l!==""&&n.push(`limit ${l}`);let d=ve(e.offset);return d!==null&&d!==""&&d!=="0"&&n.push(`offset ${d}`),n.length===0?"all tickets":n.join(" \xB7 ")}var nm=new Set(["ticketId","projectId"]),tm=new Set(["description","body"]);function pa(e){if(e===null)return[];let n=[];for(let[t,i]of Object.entries(e))nm.has(t)||i!==void 0&&n.push(Ie(t,ca(i),{open:!0,...tm.has(t)?{markdown:!0}:{}}));return n}var fa=72;function Cc(e,n,t){let i=Tc(e??"move",fa);if(n===null||n==="")return{title:i,state:null,text:i};let o=t===void 0?n:t(n);return{title:i,state:n,text:`${i} \u2192 ${o}`}}function im(e,n){let t=new Set(qn(n?.created).map(i=>String(i)));return qn(e?.paths).map(i=>{let o=String(i);return{path:o,created:t.has(o)}})}function Oc(e,n){return im(e,n).map(t=>Ie(t.created?"will be created":"exists",t.path))}function Pc(e){let n=ve(e?.fromState),t=ve(e?.toState);return n===null||t===null?[]:[{label:"From",value:n},{label:"To",value:t}]}function Mc(e){let n=[];for(let i of["frontmatter","preamble"]){let o=e?.[i];typeof o=="string"&&n.push(o===""?{label:i,value:"(empty)"}:Ie(i,o))}let t=e?.contextSections;return Array.isArray(t)&&n.push({label:"contextSections",value:String(t.length)}),n}function Lc(e){let n=[],t=e?.imported??e?.count;typeof t=="number"&&n.push({label:"Imported",value:String(t)}),typeof e?.projectId=="number"&&n.push({label:"Project",value:String(e.projectId)});let i=e?.deleted;typeof i=="boolean"&&n.push({label:"Plan file",value:i?"deleted":"KEPT"});let o=e?.deletionError;return typeof o=="string"&&o!==""&&n.push(Ie("Deletion error",o)),n}function Dc(e){return qn(e?.suggestions).map(n=>Tt(n)).filter(n=>n!==null).map(n=>({ticketId:ve(n.ticketId)??"?",actionId:ve(n.actionId)??"",reason:ve(n.reason)??""}))}var om=["frontmatter","preamble","contextSections"];function Bc(e){return e===null?[]:om.filter(n=>typeof e[n]=="string")}function zc(e){if(e==null)return{button:null,reason:"no document"};let n=e.querySelectorAll('[role="tab"]');for(let t of Array.from(n)){let i=(t.textContent??"").trim();if(i==="Tickets"||i.startsWith("Tickets ("))return{button:t,reason:null}}return{button:null,reason:"the Tickets tab is not shown on this screen"}}function Kc(e,n,t){let i=e;return n!==void 0&&(i+=" \xB7 "+n+(n===1?" ticket":" tickets")),t===!1?i+=" \xB7 file kept":t===!0&&(i+=" \xB7 file deleted"),i}function rm(e,n){let t=e?.ticketId;if(typeof t=="number"||typeof t=="string")return String(t);if(n!==null&&typeof n=="object"){let i=n.ticketId;if(typeof i=="number"||typeof i=="string")return String(i)}return null}function am(e,n){if(e===null||n===null||n===void 0||n==="")return null;let t=n,i=e.tickets.find(a=>ee(a)===t)??null;if(i===null)return null;let o=ee(i),r=new Map,s=(a,l)=>{r.has(a)||r.set(a,l)};for(let a of e.tickets)s(ee(a),a),s(String(a.id),a),s(a.workspaceKey+":"+String(a.id),a);return{ticket:i,boardKey:o,evidence:e.evidence[o]??[],comments:e.comments[o]??[],ticketsByKey:r}}function sm(e){let n=St(e);if(n===null||n==="")return null;try{let t=JSON.parse(n);return t!==null&&typeof t=="object"&&!Array.isArray(t)?t:null}catch{return null}}function Hn(e,n){if(n===null)return null;let t=ho(e,n);return t===null?`#${n}`:`#${n} \u2014 ${t}`}function lm(e){return`Select ${e} on the board`}function en(e){let[n,t]=m.default.useState(!1),[i,o]=m.default.useState(!1),[r,s]=m.default.useState(!1),[a,l]=m.default.useState(null),d=e.body??null,c=e.footer??null,f=d!==null||c!==null,p=n&&f,h=vc(e.state,e.summary,e.errorSummary),y=e.summaryNode!==void 0&&e.errorSummary===void 0?e.summaryNode:null,k=e.errorSummary===void 0?null:Hn(e.sessionId,e.ticketId??null),I=k===null?null:Ie("identity",k,{max:fa}).value,v=I===null?null:m.default.createElement("span",{title:k??I,"data-dsh-tip":""},I+" \xB7 "),P=e.ticketId!==null&&e.ticketId!==void 0&&e.sessionId!==void 0;m.default.useEffect(()=>{e.ticketId===null||e.ticketId===void 0||console.info(`[aidos] toolview ticket=${e.ticketId} sessionId=${e.sessionId??"MISSING"} useProjection=${typeof e.useProjection} canSelect=${P}`)},[e.ticketId,e.sessionId,e.useProjection,P]);let F=P?j=>{j.stopPropagation(),console.info(`[aidos] click-through fired for ticket ${e.ticketId}`),Jn(e.sessionId,e.ticketId),l(null),o(!0)}:void 0,Q=am(e.sessionId===void 0?null:gt(e.sessionId),e.ticketId),A=e.sessionId===void 0?`Ticket #${e.ticketId??"?"} cannot be opened: this card carries no session, so the ticket cannot be addressed.`:gt(e.sessionId)===null?`Ticket #${e.ticketId??"?"} cannot be opened: this session's board has not loaded yet. Close this and retry.`:`#${e.ticketId??"?"} isn't in this session's own board yet, or belongs to another session. Open the Tickets tab to look it up there.`;return m.default.createElement("div",{className:"tool-render-card","data-error":e.state==="error"||void 0},m.default.createElement("div",{className:"tool-render-row","data-state":e.state,"data-expandable":f?!0:void 0,role:f?"button":void 0,tabIndex:f?0:void 0,"aria-expanded":f?p:void 0,onClick:f?()=>t(!n):void 0,onKeyDown:f?j=>{(j.key==="Enter"||j.key===" ")&&(j.preventDefault(),t(!n))}:void 0},m.default.createElement(mo,{open:p,disabled:!f}),m.default.createElement("span",{className:"tool-render-name-badge",style:Wo(e.title,e.state==="error")},m.default.createElement("span",{className:"tool-render-name-badge-icon"},e.icon),m.default.createElement("span",{className:"tool-render-name-badge-text",title:e.title,"data-dsh-tip":""},e.title)),m.default.createElement("span",{className:"tool-render-sep","aria-hidden":"true"}),F!==void 0&&e.errorSummary===void 0?m.default.createElement("span",{className:"tool-render-path"+(y===null?"":" aidos-row-summary-rich"),role:"link",tabIndex:0,title:lm(h.text),"data-dsh-tip":"",onClick:F,onKeyDown:j=>{(j.key==="Enter"||j.key===" ")&&(j.preventDefault(),F(j))}},y??h.text):m.default.createElement("span",{className:"tool-render-summary"+(y===null?"":" aidos-row-summary-rich"),"tool-render-error":h.isError?!0:void 0},v,y??h.text)),p?m.default.createElement("div",{className:"tool-render-body"},d,c!==null?m.default.createElement("div",{className:"aidos-tool-footer"},c):null):null,i?m.default.createElement(De,{bare:!0,wide:Q!==null,onClose:()=>o(!1)},Q!==null&&e.sessionId!==void 0?m.default.createElement(m.default.Fragment,null,m.default.createElement(Co,{key:Le(Q.ticket),ticket:Q.ticket,ticketIdKey:Q.boardKey,evidence:Q.evidence,comments:Q.comments,evidenceCollapsed:r,onToggleEvidence:()=>{s(j=>!j)},onClose:()=>o(!1),agentId:e.sessionId,onFieldSaved:()=>{},ticketsByKey:Q.ticketsByKey,onJump:j=>{Jn(e.sessionId,j),o(!1)}})):m.default.createElement(m.default.Fragment,null,m.default.createElement("p",{className:"aidos-ticket-peek-empty",role:"status"},A),m.default.createElement("div",{className:"aidos-ticket-peek-actions"},P?m.default.createElement("button",{type:"button",className:"tool-render-approval-btn tool-render-approval-approve",onClick:j=>{j.stopPropagation(),Jn(e.sessionId,e.ticketId);let se=zc(typeof document>"u"?void 0:document);se.button!==null?(se.button.click(),o(!1)):l(se.reason)}},m.default.createElement(mt,null)," Open on board"):null),a!==null?m.default.createElement("p",{className:"aidos-ticket-peek-note",role:"status"},a):null)):null)}function Mn({facts:e}){return e.length===0?null:m.default.createElement("dl",{className:"aidos-tool-facts"},e.map((n,t)=>m.default.createElement(m.default.Fragment,{key:n.label+":"+t},m.default.createElement("dt",null,n.label),m.default.createElement(dm,{fact:n}))))}function dm({fact:e}){return e.full!==void 0&&e.full!==""?m.default.createElement(Fc,{fact:e,as:"dd"}):m.default.createElement("dd",{title:e.value,"data-dsh-tip":""},e.value)}function Fc({fact:e,as:n}){let[t,i]=m.default.useState(e.open===!0);return m.default.createElement(n,{className:n==="span"?"aidos-tool-fact-value":void 0,"data-expanded":t?!0:void 0},t?m.default.createElement(cm,{fact:e}):m.default.createElement("span",{className:"aidos-tool-fact-clipped",title:e.value,"data-dsh-tip":""},e.value),m.default.createElement("button",{className:"aidos-tool-fact-more",type:"button","aria-expanded":t,onClick:r=>{r.stopPropagation(),i(!t)}},t?"Show less":"Show more"))}function Jo({fact:e}){return e.full===void 0||e.full===""?m.default.createElement("span",{className:"aidos-tool-list-text",title:e.value,"data-dsh-tip":""},e.value):m.default.createElement("span",{className:"aidos-tool-list-text aidos-tool-list-value"},m.default.createElement(Fc,{fact:e,as:"span"}))}function cm({fact:e}){let n=e.full??e.value;return e.markdown!==!0?m.default.createElement("span",{className:"aidos-tool-fact-full"},n):m.default.createElement("div",{className:"aidos-md aidos-tool-fact-full",dangerouslySetInnerHTML:{__html:Ro(n)}})}function um({tables:e,onSelect:n}){return e.length===0?null:m.default.createElement("div",{className:"aidos-tool-stack"},e.map(t=>m.default.createElement("section",{className:"aidos-tool-table",key:t.id},m.default.createElement($c,{id:t.id,state:t.state,title:t.title,onSelect:n}),m.default.createElement(Mn,{facts:t.facts}))))}function $c({id:e,state:n,title:t,onSelect:i}){return m.default.createElement("header",{className:"aidos-tool-table-head"},i!==void 0?m.default.createElement("button",{className:"aidos-tool-table-id aidos-tool-table-id-link",type:"button",onClick:o=>{o.stopPropagation(),i(e)}},"#"+e):m.default.createElement("span",{className:"aidos-tool-table-id"},"#"+e),n===""?null:m.default.createElement("span",{className:"aidos-tool-list-tag"},n),m.default.createElement("span",{className:"aidos-tool-table-title",title:t,"data-dsh-tip":""},t))}function pm(e){let n=Ec(e);return n===null?null:m.default.createElement($c,{id:n.id,state:n.state,title:n.title})}function Xo({text:e,isError:n}){return m.default.createElement("pre",{className:"tool-render-output","tool-render-error":n===!0?!0:void 0},e)}function an(e){if(e===null||e==="")return null;let n=Go(e);if(n===null)return m.default.createElement(Xo,{text:e,isError:!0});let t=[];n.code!==null&&t.push({label:"code",value:n.code});for(let[i,o]of Object.entries(n.extra))t.push(Ie(i,ca(o)));return n.message===null&&t.length===0?m.default.createElement(Xo,{text:e,isError:!0}):m.default.createElement(m.default.Fragment,null,n.message===null?null:m.default.createElement("p",{className:"aidos-tool-message"},n.message),m.default.createElement(Mn,{facts:t}))}function nn(e){let n=e?.block,t=Uo(jo(n)),i=Vo(n),o=sm(n),r=rm(t,o),s=i==="error"?qo(n):null,a=s!==null&&s!==""?Ho(s):void 0,l=s===null?null:Go(s),d=i==="error"&&l?.refusal===!0?"stopped":i,c=St(n);return{args:t,state:d,result:o,resultText:c,ticketId:r,errorText:s,errorSummary:a}}function Et(e){return e===null||e===""?null:m.default.createElement(Xo,{text:e,isError:!1})}function fm(e){let{args:n,state:t,result:i,ticketId:o,errorText:r,errorSummary:s}=nn(e),a=typeof n?.kind=="string"?n.kind:void 0,l=nr(),d=m.default.createElement(m.default.Fragment,null,r!==null&&r!==""?an(r):a!==void 0?m.default.createElement("ul",{className:"aidos-evidence-list"},m.default.createElement(En,{row:{kind:a.startsWith("builtin:")?a:"builtin:"+a,payload:n?.payload??{},author:"agent",at:typeof i?.updatedAt=="number"?i.updatedAt:void 0},onView:l.open})):null,l.viewer);return m.default.createElement(en,{icon:m.default.createElement(Li,null),title:"Evidence",summary:Hn(e.sessionId,o)??"evidence",state:t,body:d,errorSummary:s,ticketId:o,sessionId:e.sessionId,useProjection:e.useProjection})}function hm(e){let{args:n,state:t,result:i,resultText:o,ticketId:r,errorText:s,errorSummary:a}=nn(e),l=typeof n?.to=="string"?n.to:null,d=Hn(e.sessionId,r),c=[...Pc(i),...ua(i)],f=s!==null&&s!==""?an(s):c.length>0?m.default.createElement(Mn,{facts:c}):i===null?Et(o):null,p=Cc(d,l,cn),h=p.state===null?void 0:m.default.createElement(m.default.Fragment,null,m.default.createElement("span",{className:"aidos-move-title",title:d??p.title,"data-dsh-tip":""},p.title),m.default.createElement("span",{className:"aidos-move-arrow","aria-hidden":"true"},"\u2192"),m.default.createElement("span",{className:ft(p.state)},cn(p.state)));return m.default.createElement(en,{icon:m.default.createElement(li,null),title:"Move ticket",summary:p.text,summaryNode:h,state:t,body:f,errorSummary:a,ticketId:r,sessionId:e.sessionId,useProjection:e.useProjection})}function gm(e){let{args:n,state:t,result:i,ticketId:o,errorText:r,errorSummary:s}=nn(e),a=i?.created===!0,l=typeof n?.title=="string"?n.title:null,d=a&&l!==null?`#${o??"?"} \u2014 ${l}`:Hn(e.sessionId,o),c=pa(n),f=r!==null&&r!==""?an(r):c.length>0?m.default.createElement(Mn,{facts:c}):null;return m.default.createElement(en,{icon:m.default.createElement(Tn,null),title:a?"Create ticket":"Edit ticket",summary:d??"ticket",state:t,body:f,errorSummary:s,ticketId:o,sessionId:e.sessionId,useProjection:e.useProjection})}function mm(e){let{state:n,result:t,resultText:i,ticketId:o,errorText:r,errorSummary:s}=nn(e),a=ua(t),l=Ac(t),d=nr(),c=r!==null&&r!==""?an(r):a.length===0&&l.length===0?t===null?Et(i):null:m.default.createElement(m.default.Fragment,null,pm(t),m.default.createElement(Mn,{facts:a}),l.length>0?m.default.createElement("ul",{className:"aidos-evidence-list"},l.map((f,p)=>m.default.createElement(En,{key:p,row:{kind:f.kind,payload:{note:f.excerpt},author:f.author,at:f.at},onView:d.open}))):null,d.viewer);return m.default.createElement(en,{icon:m.default.createElement(Xn,null),title:"Read ticket",summary:Hn(e.sessionId,o)??"ticket",state:n,body:c,errorSummary:s,ticketId:o,sessionId:e.sessionId,useProjection:e.useProjection})}function bm(e){let{args:n,state:t,result:i,resultText:o,errorText:r,errorSummary:s}=nn(e),a=_c(n),l=typeof i?.summary=="string"?i.summary:null,d=Rc(i),c=r!==null&&r!==""?an(r):d.length===0?i===null?Et(o):null:m.default.createElement(um,{tables:d,onSelect:e.sessionId===void 0?void 0:f=>{Jn(e.sessionId,f)}});return m.default.createElement(en,{icon:m.default.createElement(si,null),title:"Read board",summary:a,state:t,body:c,footer:l,errorSummary:s})}function wm(e){let{args:n,state:t,result:i,ticketId:o,errorText:r,errorSummary:s}=nn(e),a=Oc(n,i),d=(Hn(e.sessionId,o)??"allowlist")+" \xB7 "+a.length+(a.length===1?" path":" paths"),c=r!==null&&r!==""?an(r):a.length===0?null:m.default.createElement(m.default.Fragment,null,m.default.createElement(Mn,{facts:a}),e.sessionId!==void 0&&o!==null?m.default.createElement(pd,{sessionId:e.sessionId,boardKey:String(o)}):null);return m.default.createElement(en,{icon:m.default.createElement(go,null),title:"Request allowlist",summary:d,state:t,body:c,errorSummary:s,ticketId:o,sessionId:e.sessionId,useProjection:e.useProjection})}function ym(e){let{args:n,state:t,errorText:i,errorSummary:o}=nn(e),r=Dc(n),s=r.length===0?"nothing":r.length===1?Hn(e.sessionId,r[0].ticketId)??"#"+r[0].ticketId:r.length+" tickets",a=i!==null&&i!==""?an(i):r.length===0?null:m.default.createElement("ul",{className:"aidos-tool-list"},r.map(l=>m.default.createElement("li",{key:l.ticketId+":"+l.actionId},m.default.createElement("span",{className:"aidos-tool-list-key"},"#",l.ticketId),m.default.createElement("span",{className:"aidos-tool-list-tag"},l.actionId),m.default.createElement(Jo,{fact:Ie("reason",l.reason)}),e.sessionId!==void 0&&dd(l.actionId)?m.default.createElement(ud,{sessionId:e.sessionId,boardKey:String(l.ticketId),actionId:l.actionId}):null)));return m.default.createElement(en,{icon:m.default.createElement(Mi,null),title:"Suggest actions",summary:s,state:t,body:a,errorSummary:o,ticketId:r.length===1?r[0].ticketId:null,sessionId:e.sessionId,useProjection:e.useProjection})}function vm(e){let{args:n,state:t,errorText:i,errorSummary:o}=nn(e),r=i??St(e.block),s=n?.projectId===void 0?"the project plan":"project "+String(n.projectId);return m.default.createElement(en,{icon:m.default.createElement(mt,null),title:"Export plan",summary:s,state:t,body:r===null||r===""?null:m.default.createElement(Xo,{text:r,isError:i!==null&&t==="error"}),errorSummary:o})}function km(e){let{args:n,state:t,result:i,resultText:o,errorText:r,errorSummary:s}=nn(e),a=typeof n?.file=="string"?n.file:"a plan",l=i?.imported??i?.count,d=Lc(i),c=r!==null&&r!==""?an(r):d.length>0?m.default.createElement(Mn,{facts:d}):i===null?Et(o):null;return m.default.createElement(en,{icon:m.default.createElement(mt,null),title:"Import plan",summary:Kc(a,typeof l=="number"?l:void 0,typeof i?.deleted=="boolean"?i.deleted:void 0),state:t,body:c,errorSummary:s})}function xm(e){let{args:n,state:t,result:i,resultText:o,errorText:r,errorSummary:s}=nn(e),a=n?.projectId===void 0?"the plan blocks":"project "+String(n.projectId),l=Mc(i),d=r!==null&&r!==""?an(r):l.length>0?m.default.createElement(Mn,{facts:l}):i===null?Et(o):null;return m.default.createElement(en,{icon:m.default.createElement(Xn,null),title:"Read plan blocks",summary:a,state:t,body:d,errorSummary:s})}function Sm(e){let{args:n,state:t,errorText:i,errorSummary:o}=nn(e),r=Bc(n),s=pa(n).filter(l=>l.label!=="projectId"),a=i!==null&&i!==""?an(i):s.length>0?m.default.createElement(Mn,{facts:s}):null;return m.default.createElement(en,{icon:m.default.createElement(Tn,null),title:"Edit plan blocks",summary:r.length===0?"no block":r.join(" \xB7 "),state:t,body:a,errorSummary:o})}function Tm(e){let{args:n,state:t,result:i,resultText:o,ticketId:r,errorText:s,errorSummary:a}=nn(e),l=Ic(i),d=Nc(i),c=nr(),f=typeof n?.index=="number"?n.index:null,p=Hn(e.sessionId,r)??"ticket",h=f===null?p+" \xB7 evidence":p+" \xB7 evidence ["+String(f)+"]",y=s!==null&&s!==""?an(s):l.length===0&&d.length===0?i===null?Et(o):null:m.default.createElement(m.default.Fragment,null,m.default.createElement("ul",{className:"aidos-evidence-list"},l.map(k=>m.default.createElement(En,{key:String(k.index)+":"+k.kind,row:{kind:k.kind,payload:k.payload,author:k.author,at:k.at},onView:c.open}))),d.map((k,I)=>m.default.createElement("div",{className:"aidos-comment",key:I},m.default.createElement("div",null,m.default.createElement("span",{className:"aidos-evidence-author"},k.author)),m.default.createElement("p",{className:"aidos-detail-body"},k.body))),c.viewer);return m.default.createElement(en,{icon:m.default.createElement(Xn,null),title:"Read evidence",summary:h,state:t,body:y,errorSummary:a,ticketId:r,sessionId:e.sessionId,useProjection:e.useProjection})}function nr(){let[e,n]=m.default.useState(null);return{open:n,viewer:e===null?null:m.default.createElement(bt,{row:e,onClose:()=>{n(null)}})}}function er(e){return Array.isArray(e)?e.filter(n=>typeof n=="string"):[]}function ha(e,n){return n!==null&&typeof n.commit=="string"&&n.commit.trim()!==""?n.commit.trim():e!==null&&typeof e.hash=="string"&&e.hash.trim()!==""?e.hash.trim():null}function ga(e){return e===null||typeof e.subject!="string"||e.subject.trim()===""?null:e.subject.trim()}function Em(e){return e===null||e===""?null:e.length<=12?e:e.slice(0,12)}function Rm(e,n,t,i){let o=Em(ha(n,t)),r=ga(t),s=i??(e===null?null:`#${e}`),a=r===null?null:Ie("subject",r,{max:80}).value,l=o===null?r??"commit":a===null?o:`${o} \u2014 ${a}`;return s===null?l:`${s} \xB7 ${l}`}function Am(e,n){let t=[],i=ha(e,n);i!==null&&t.push(Ie("Commit",i));let o=ga(n);o!==null&&t.push(Ie("Subject",o)),e!==null&&typeof e.note=="string"&&e.note.trim()!==""&&t.push(Ie("Note",e.note.trim()));let r=n?.gatePresent,s=n?.gateTotal;return typeof r=="number"&&typeof s=="number"&&t.push({label:"Gate",value:`${r}/${s}`}),n!==null&&typeof n.nextStep=="string"&&n.nextStep.trim()!==""&&t.push(Ie("Next step",n.nextStep.trim())),t}function Im(e){let{args:n,state:t,result:i,resultText:o,ticketId:r,errorText:s,errorSummary:a}=nn(e),l=nr(),d=Hn(e.sessionId,r),c=Rm(r,n,i,d),f=Am(n,i),p=ha(n,i),h=ga(i),y=n!==null&&typeof n.note=="string"&&n.note.trim()!==""?n.note.trim():null,k=s!==null&&s!==""?an(s):f.length===0&&p===null?i===null?Et(o):null:m.default.createElement(m.default.Fragment,null,f.length>0?m.default.createElement(Mn,{facts:f}):null,p===null?null:m.default.createElement("ul",{className:"aidos-evidence-list"},m.default.createElement(En,{row:{kind:"builtin:user_commit",payload:{commit:p,...h===null?{}:{subject:h},...y===null?{}:{note:y}},author:"agent"},onView:l.open})),l.viewer);return m.default.createElement(en,{icon:m.default.createElement(Li,null),title:"Attach commit",summary:c,state:t,body:k,errorSummary:a,ticketId:r,sessionId:e.sessionId,useProjection:e.useProjection})}function Nm(e,n,t,i){let o=t===null?[]:er(t.attached),r=er(n?.tags),s=o.length>0?o:t===null?r:o,a=`${s.length} tag${s.length===1?"":"s"}`,l=t!==null&&typeof t.createdCount=="number"?t.createdCount:null;return(i??(e===null?null:`#${e}`)??"tags")+" \xB7 "+a+(l!==null&&l>0?` \xB7 created ${l}`:"")}function _m(e,n){if(n===null)return[];let t=[],i=er(n.attached);if(i.length>0)t.push(Ie("Attached",i.join(", ")));else{let o=er(e?.tags);o.length>0&&t.push(Ie("Requested",o.join(", ")))}return typeof n.message=="string"&&n.message.trim()!==""&&t.push(Ie("Created",n.message.trim())),t}function Cm(e){let{args:n,state:t,result:i,ticketId:o,errorText:r,errorSummary:s}=nn(e),a=Hn(e.sessionId,o),l=Nm(o,n,i,a),d=_m(n,i),c=r!==null&&r!==""?an(r):d.length>0?m.default.createElement(Mn,{facts:d}):null;return m.default.createElement(en,{icon:m.default.createElement(Tn,null),title:"Attach tags",summary:l,state:t,body:c,errorSummary:s,ticketId:o,sessionId:e.sessionId,useProjection:e.useProjection})}function Om(e,n){let t=e!==null&&typeof e.action=="string"&&e.action!==""?e.action:n!==null&&typeof n.action=="string"&&n.action!==""?n.action:null,i=e!==null&&typeof e.tag=="string"&&e.tag!==""?e.tag:n!==null&&typeof n.tag=="string"&&n.tag!==""?n.tag:null;if(t===null||i===null)return null;let o=e?.to??n?.to,r=e?.ticketId??n?.ticketId;return{action:t,tag:i,to:typeof o=="string"&&o!==""?o:null,ticketId:typeof r=="number"||typeof r=="string"?String(r):null,reason:e!==null&&typeof e.reason=="string"?e.reason:"",status:n!==null&&typeof n.status=="string"?n.status:null,requestId:n!==null&&typeof n.requestId=="string"?n.requestId:null}}function Pm(e){if(e===null)return"tag change";let n=e.action==="migrate"&&e.to!==null?`${e.tag} \u2192 ${e.to}`:e.action==="detach"&&e.ticketId!==null?`detach ${e.tag} from #${e.ticketId}`:`${e.action} ${e.tag}`;return e.status===null?n:`${n} \xB7 ${e.status}`}function Mm(e){let{args:n,state:t,result:i,errorText:o,errorSummary:r}=nn(e),s=Om(n,i),a=Pm(s),l=s?.requestId===null||s?.requestId===void 0?null:`request ${s.requestId}`,d=o!==null&&o!==""?an(o):s===null?null:m.default.createElement("ul",{className:"aidos-tool-list"},m.default.createElement("li",{key:s.action+":"+s.tag+":"+(s.ticketId??"")},m.default.createElement("span",{className:"aidos-tool-list-key"},s.tag),m.default.createElement("span",{className:"aidos-tool-list-tag"},s.action),s.action==="detach"&&s.ticketId!==null?m.default.createElement("span",{className:"aidos-tool-list-key"},"#",s.ticketId):null,m.default.createElement(Jo,{fact:Ie("reason",s.reason.trim()===""?"(no reason given)":s.reason)})));return m.default.createElement(en,{icon:m.default.createElement(Mi,null),title:"Suggest tag change",summary:a,state:t,body:d,footer:l,errorSummary:r,ticketId:s!==null&&s.action==="detach"?s.ticketId:null,sessionId:e.sessionId,useProjection:e.useProjection})}function Lm(e){if(e===null||!Array.isArray(e.changes))return[];let n=[];for(let t of e.changes){if(t===null||typeof t!="object"||Array.isArray(t))continue;let i=t,o=i.ticketId,r=i.change;typeof o!="number"&&typeof o!="string"||typeof r!="string"||n.push({ticketId:String(o),state:typeof i.state=="string"?i.state:"",title:typeof i.title=="string"?i.title:"",change:r,nextStep:typeof i.nextStep=="string"&&i.nextStep.trim()!==""?i.nextStep:null})}return n}function Dm(e,n,t){let i=e!==null&&(typeof e.ticketId=="number"||typeof e.ticketId=="string")?String(e.ticketId):null;if(n===null)return i===null?"recent changes":`#${i} \xB7 recent changes`;let o=`${t.length} change${t.length===1?"":"s"}`;return i===null?o:`#${i} \xB7 ${o}`}function Bm(e){if(e===null)return null;let n=typeof e.covers=="string"&&e.covers.trim()!==""?e.covers.trim():null,t=typeof e.omitted=="number"&&e.omitted>0?e.omitted:null;return n===null&&t===null?null:(n??"board changes")+(t===null?"":` \xB7 ${t} earlier change${t===1?"":"s"} omitted`)}function zm(e){let{args:n,state:t,result:i,resultText:o,errorText:r,errorSummary:s}=nn(e),a=Lm(i),l=Dm(n,i,a),d=Bm(i),c=r!==null&&r!==""?an(r):a.length===0?i===null?Et(o):null:m.default.createElement("ul",{className:"aidos-tool-list"},a.map((f,p)=>m.default.createElement("li",{key:f.ticketId+":"+p},m.default.createElement("span",{className:"aidos-tool-list-key"},"#",f.ticketId),f.state===""?null:m.default.createElement("span",{className:"aidos-tool-list-tag"},f.state),f.title===""?null:m.default.createElement("span",{className:"aidos-tool-list-text",title:f.title,"data-dsh-tip":""},f.title),m.default.createElement(Jo,{fact:Ie("change",f.change)}),f.nextStep===null?null:m.default.createElement(Jo,{fact:Ie("next step","Next: "+f.nextStep)}))));return m.default.createElement(en,{icon:m.default.createElement(Xn,null),title:"Recent changes",summary:l,state:t,body:c,footer:d,errorSummary:s})}var jc=[["get_tickets",bm],["get_ticket",mm],["get_evidence",Tm],["digest_recent",zm],["set_ticket",gm],["attach_evidence",fm],["attach_commit",Im],["attach_tags",Cm],["move_ticket",hm],["request_allowlist",wm],["suggest_actions",ym],["suggest_tag_change",Mm],["plan",vm],["plan_import",km],["plan_meta",xm],["plan_meta_set",Sm]];var Km="aidos",Fm=["slots"],$m="aidos";function jm(){if(!(typeof document>"u"))for(let e of[{marker:"aidos/board.css",text:_a},{marker:"aidos/plan-meta.css",text:Ca},{marker:"aidos/tool-render.css",text:Oa}]){if(document.querySelector(`style[data-plugin-css="${e.marker}"]`)!==null)continue;let n=document.createElement("style");n.dataset.plugin="aidos",n.dataset.pluginCss=e.marker,n.textContent=e.text,document.head.appendChild(n)}}function Um(e,n){return function(i){try{return n(i)}catch(o){return console.warn(`aidos: the ${e} tool row failed to render`,o),ki.default.createElement("div",{className:"tool-render-card"},ki.default.createElement("div",{className:"tool-render-row","data-state":"error"},ki.default.createElement("span",{className:"tool-render-title"},e),ki.default.createElement("span",{className:"tool-render-sep"}),ki.default.createElement("span",{className:"tool-render-summary"},"this card could not render; the call itself was unaffected")))}}}function Vc(e){let n=[...Sc,...jc],t=[],i=0;for(let[o,r]of n)try{t.push(e.inject("tool.call.toolview",()=>{try{return e.register({name:"tool.call.toolview",key:o,priority:-100},Um(o,r))}catch(s){return i+=1,i===n.length&&console.error(`aidos: ALL ${n.length} tool rows failed to register on "tool.call.toolview"; every board tool will render as raw JSON`),console.warn(`aidos: the ${o} tool row could not register; the other rows continue`,s),()=>{}}}))}catch(s){i+=1,console.warn(`aidos: the ${o} tool row could not register; the other rows continue`,s)}if(i===n.length)throw new Error(`aidos: all ${n.length} tool rows failed to register on "tool.call.toolview" -- total registration failure is loud, never a console line`);return function(){for(let o of t)o()}}function Uc(e){return e.inject("conversation.view",()=>e.register({name:"conversation.view",id:"tickets",order:20,label:Ci},Nd))}function Vm(e){jm(),e.effect(()=>{let r=e.get("slots");return r===void 0?()=>{}:Vc(r)},"aidos: scratch tool rows");let n=null,t=!1,i=Ci();function o(r){t&&n===null&&(n=Uc(r),i=Ci()),!t&&n!==null&&(n(),n=null)}e.effect(function(){let r=e.get("slots");if(r===void 0)return()=>{};let s=e.get("sessions");if(s===void 0||typeof s.list?.getSnapshot!="function"||typeof s.list?.subscribe!="function")return t=!0,o(r),function(){t=!1,o(r)};let a=s.list.getSnapshot(),l=function(){let c=a.current?a.byId[a.current]?.agentPreset:void 0;t=c===void 0||c===$m,o(r),ss(a.current??null)},d=s.list.subscribe(function(){a=s.list.getSnapshot(),l()});return l(),function(){d(),t=!1,o(r)}},"aidos: tickets tab visibility"),rs(function(){if(n===null)return;let r=Ci();if(r===i)return;let s=e.get("slots");if(s!==void 0)try{n(),n=Uc(s),i=r,console.info(`[aidos] tab re-registered for label "${r}" <- this remounts the board`)}catch(a){n=null,console.error("aidos: the Tickets tab failed to re-register after a badge change; the tab may show a stale count until the next visibility change",a)}})}
/*! Bundled license information:

dompurify/dist/purify.es.mjs:
  (*! @license DOMPurify 3.4.15 | (c) Cure53 and other contributors | Released under the Apache license 2.0 and Mozilla Public License 2.0 | github.com/cure53/DOMPurify/blob/3.4.15/LICENSE *)
*/
		return module.exports;
	}
});
