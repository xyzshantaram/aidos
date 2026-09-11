window.__ModuleLoader__.load({
	id: "aidos",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
"use strict";var sd=Object.create;var Wt=Object.defineProperty;var ld=Object.getOwnPropertyDescriptor;var dd=Object.getOwnPropertyNames;var cd=Object.getPrototypeOf,ud=Object.prototype.hasOwnProperty;var pd=(e,n)=>()=>{try{return n||e((n={exports:{}}).exports,n),n.exports}catch(t){throw n=0,t}},fd=(e,n)=>{for(var t in n)Wt(e,t,{get:n[t],enumerable:!0})},or=(e,n,t,i)=>{if(n&&typeof n=="object"||typeof n=="function")for(let o of dd(n))!ud.call(e,o)&&o!==t&&Wt(e,o,{get:()=>n[o],enumerable:!(i=ld(n,o))||i.enumerable});return e};var ee=(e,n,t)=>(t=e!=null?sd(cd(e)):{},or(n||!e||!e.__esModule?Wt(t,"default",{value:e,enumerable:!0}):t,e)),hd=e=>or(Wt({},"__esModule",{value:!0}),e);var Ys=pd((Lw,Js)=>{"use strict";function zs(e){return e instanceof Map?e.clear=e.delete=e.set=function(){throw new Error("map is read-only")}:e instanceof Set&&(e.add=e.clear=e.delete=function(){throw new Error("set is read-only")}),Object.freeze(e),Object.getOwnPropertyNames(e).forEach(n=>{let t=e[n],i=typeof t;(i==="object"||i==="function")&&!Object.isFrozen(t)&&zs(t)}),e}var Ri=class{constructor(n){n.data===void 0&&(n.data={}),this.data=n.data,this.isMatchIgnored=!1}ignoreMatch(){this.isMatchIgnored=!0}};function $s(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#x27;")}function On(e,...n){let t=Object.create(null);for(let i in e)t[i]=e[i];return n.forEach(function(i){for(let o in i)t[o]=i[o]}),t}var sp="</span>",Ps=e=>!!e.scope,lp=(e,{prefix:n})=>{if(e.startsWith("language:"))return e.replace("language:","language-");if(e.includes(".")){let t=e.split(".");return[`${n}${t.shift()}`,...t.map((i,o)=>`${i}${"_".repeat(o+1)}`)].join(" ")}return`${n}${e}`},zo=class{constructor(n,t){this.buffer="",this.classPrefix=t.classPrefix,n.walk(this)}addText(n){this.buffer+=$s(n)}openNode(n){if(!Ps(n))return;let t=lp(n.scope,{prefix:this.classPrefix});this.span(t)}closeNode(n){Ps(n)&&(this.buffer+=sp)}value(){return this.buffer}span(n){this.buffer+=`<span class="${n}">`}},Ms=(e={})=>{let n={children:[]};return Object.assign(n,e),n},$o=class e{constructor(){this.rootNode=Ms(),this.stack=[this.rootNode]}get top(){return this.stack[this.stack.length-1]}get root(){return this.rootNode}add(n){this.top.children.push(n)}openNode(n){let t=Ms({scope:n});this.add(t),this.stack.push(t)}closeNode(){if(this.stack.length>1)return this.stack.pop()}closeAllNodes(){for(;this.closeNode(););}toJSON(){return JSON.stringify(this.rootNode,null,4)}walk(n){return this.constructor._walk(n,this.rootNode)}static _walk(n,t){return typeof t=="string"?n.addText(t):t.children&&(n.openNode(t),t.children.forEach(i=>this._walk(n,i)),n.closeNode(t)),n}static _collapse(n){typeof n!="string"&&n.children&&(n.children.every(t=>typeof t=="string")?n.children=[n.children.join("")]:n.children.forEach(t=>{e._collapse(t)}))}},jo=class extends $o{constructor(n){super(),this.options=n}addText(n){n!==""&&this.add(n)}startScope(n){this.openNode(n)}endScope(){this.closeNode()}__addSublanguage(n,t){let i=n.root;t&&(i.scope=`language:${t}`),this.add(i)}toHTML(){return new zo(this,this.options).value()}finalize(){return this.closeAllNodes(),!0}};function Ft(e){return e?typeof e=="string"?e:e.source:null}function js(e){return Wn("(?=",e,")")}function dp(e){return Wn("(?:",e,")*")}function cp(e){return Wn("(?:",e,")?")}function Wn(...e){return e.map(t=>Ft(t)).join("")}function up(e){let n=e[e.length-1];return typeof n=="object"&&n.constructor===Object?(e.splice(e.length-1,1),n):{}}function Ai(...e){return"("+(up(e).capture?"":"?:")+e.map(i=>Ft(i)).join("|")+")"}function Fs(e){return new RegExp(e.toString()+"|").exec("").length-1}function pp(e,n){let t=e&&e.exec(n);return t&&t.index===0}var fp=new RegExp(Ai(/\[(?:[^\\\]]|\\.)*\]/,/\(\?<(?![=!])[^>]+>/,/\(\?'[^']+'/,/\(\??/,/\\([1-9][0-9]*)/,/\\./));function Vo(e,{joinWith:n}){let t=0;return e.map(i=>{t+=1;let o=t,r=Ft(i),s="";for(;r.length>0;){let a=fp.exec(r);if(!a){s+=r;break}s+=r.substring(0,a.index),r=r.substring(a.index+a[0].length),a[0][0]==="\\"&&a[1]?s+="\\"+String(Number(a[1])+o):(s+=a[0],(a[0]==="("||/^\(\?[<']/.test(a[0]))&&t++)}return s}).map(i=>`(${i})`).join(n)}var hp=/\b\B/,Vs="[a-zA-Z]\\w*",qo="[a-zA-Z_]\\w*",qs="\\b\\d+(\\.\\d+)?",Us="(-?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)",Hs="\\b(0b[01]+)",gp="!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|>>|>|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~",mp=(e={})=>{let n=/^#![ ]*\//;return e.binary&&(e.begin=Wn(n,/.*\b/,e.binary,/\b.*/)),On({scope:"meta",begin:n,end:/$/,relevance:0,"on:begin":(t,i)=>{t.index!==0&&i.ignoreMatch()}},e)},Vt={begin:"\\\\[\\s\\S]",relevance:0},bp={scope:"string",begin:"'",end:"'",illegal:"\\n",contains:[Vt]},wp={scope:"string",begin:'"',end:'"',illegal:"\\n",contains:[Vt]},vp={begin:/\b(a|an|the|are|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such|will|you|your|they|like|more)\b/},Ni=function(e,n,t={}){let i=On({scope:"comment",begin:e,end:n,contains:[]},t);i.contains.push({scope:"doctag",begin:"[ ]*(?=(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):)",end:/(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):/,excludeBegin:!0,relevance:0});let o=Ai("I","a","is","so","us","to","at","if","in","it","on",/[A-Za-z]+['](d|ve|re|ll|t|s|n)/,/[A-Za-z]+[-][a-z]+/,/[A-Za-z][a-z]{2,}/);return i.contains.push({begin:Wn(/[ ]+/,"(",o,/[.]?[:]?([.][ ]|[ ])/,"){3}")}),i},kp=Ni("//","$"),yp=Ni("/\\*","\\*/"),xp=Ni("#","$"),Sp={scope:"number",begin:qs,relevance:0},Tp={scope:"number",begin:Us,relevance:0},Ep={scope:"number",begin:Hs,relevance:0},Rp={scope:"regexp",begin:/\/(?=[^/\n]*\/)/,end:/\/[gimuy]*/,contains:[Vt,{begin:/\[/,end:/\]/,relevance:0,contains:[Vt]}]},Ip={scope:"title",begin:Vs,relevance:0},Ap={scope:"title",begin:qo,relevance:0},Np={begin:"\\.\\s*"+qo,relevance:0},Cp=function(e){return Object.assign(e,{"on:begin":(n,t)=>{t.data._beginMatch=n[1]},"on:end":(n,t)=>{t.data._beginMatch!==n[1]&&t.ignoreMatch()}})},Ei=Object.freeze({__proto__:null,APOS_STRING_MODE:bp,BACKSLASH_ESCAPE:Vt,BINARY_NUMBER_MODE:Ep,BINARY_NUMBER_RE:Hs,COMMENT:Ni,C_BLOCK_COMMENT_MODE:yp,C_LINE_COMMENT_MODE:kp,C_NUMBER_MODE:Tp,C_NUMBER_RE:Us,END_SAME_AS_BEGIN:Cp,HASH_COMMENT_MODE:xp,IDENT_RE:Vs,MATCH_NOTHING_RE:hp,METHOD_GUARD:Np,NUMBER_MODE:Sp,NUMBER_RE:qs,PHRASAL_WORDS_MODE:vp,QUOTE_STRING_MODE:wp,REGEXP_MODE:Rp,RE_STARTERS_RE:gp,SHEBANG:mp,TITLE_MODE:Ip,UNDERSCORE_IDENT_RE:qo,UNDERSCORE_TITLE_MODE:Ap});function _p(e,n){e.input[e.index-1]==="."&&n.ignoreMatch()}function Op(e,n){e.className!==void 0&&(e.scope=e.className,delete e.className)}function Pp(e,n){n&&e.beginKeywords&&(e.begin="\\b("+e.beginKeywords.split(" ").join("|")+")(?!\\.)(?=\\b|\\s)",e.__beforeBegin=_p,e.keywords=e.keywords||e.beginKeywords,delete e.beginKeywords,e.relevance===void 0&&(e.relevance=0))}function Mp(e,n){Array.isArray(e.illegal)&&(e.illegal=Ai(...e.illegal))}function Lp(e,n){if(e.match){if(e.begin||e.end)throw new Error("begin & end are not supported with match");e.begin=e.match,delete e.match}}function Dp(e,n){e.relevance===void 0&&(e.relevance=1)}var Kp=(e,n)=>{if(!e.beforeMatch)return;if(e.starts)throw new Error("beforeMatch cannot be used with starts");let t=Object.assign({},e);Object.keys(e).forEach(i=>{delete e[i]}),e.keywords=t.keywords,e.begin=Wn(t.beforeMatch,js(t.begin)),e.starts={relevance:0,contains:[Object.assign(t,{endsParent:!0})]},e.relevance=0,delete t.beforeMatch},Bp=["of","and","for","in","not","or","if","then","parent","list","value"],zp="keyword";function Gs(e,n,t=zp){let i=Object.create(null);return typeof e=="string"?o(t,e.split(" ")):Array.isArray(e)?o(t,e):Object.keys(e).forEach(function(r){Object.assign(i,Gs(e[r],n,r))}),i;function o(r,s){n&&(s=s.map(a=>a.toLowerCase())),s.forEach(function(a){let l=a.split("|");i[l[0]]=[r,$p(l[0],l[1])]})}}function $p(e,n){return n?Number(n):jp(e)?0:1}function jp(e){return Bp.includes(e.toLowerCase())}var Ls={},Gn=e=>{console.error(e)},Ds=(e,...n)=>{console.log(`WARN: ${e}`,...n)},vt=(e,n)=>{Ls[`${e}/${n}`]||(console.log(`Deprecated as of ${e}. ${n}`),Ls[`${e}/${n}`]=!0)},Ii=new Error;function Ws(e,n,{key:t}){let i=0,o=e[t],r={},s={};for(let a=1;a<=n.length;a++)s[a+i]=o[a],r[a+i]=!0,i+=Fs(n[a-1]);e[t]=s,e[t]._emit=r,e[t]._multi=!0}function Fp(e){if(Array.isArray(e.begin)){if(e.skip||e.excludeBegin||e.returnBegin)throw Gn("skip, excludeBegin, returnBegin not compatible with beginScope: {}"),Ii;if(typeof e.beginScope!="object"||e.beginScope===null)throw Gn("beginScope must be object"),Ii;Ws(e,e.begin,{key:"beginScope"}),e.begin=Vo(e.begin,{joinWith:""})}}function Vp(e){if(Array.isArray(e.end)){if(e.skip||e.excludeEnd||e.returnEnd)throw Gn("skip, excludeEnd, returnEnd not compatible with endScope: {}"),Ii;if(typeof e.endScope!="object"||e.endScope===null)throw Gn("endScope must be object"),Ii;Ws(e,e.end,{key:"endScope"}),e.end=Vo(e.end,{joinWith:""})}}function qp(e){e.scope&&typeof e.scope=="object"&&e.scope!==null&&(e.beginScope=e.scope,delete e.scope)}function Up(e){qp(e),typeof e.beginScope=="string"&&(e.beginScope={_wrap:e.beginScope}),typeof e.endScope=="string"&&(e.endScope={_wrap:e.endScope}),Fp(e),Vp(e)}function Hp(e){function n(s,a){return new RegExp(Ft(s),"m"+(e.case_insensitive?"i":"")+(e.unicodeRegex?"u":"")+(a?"g":""))}class t{constructor(){this.matchIndexes={},this.regexes=[],this.matchAt=1,this.position=0}addRule(a,l){l.position=this.position++,this.matchIndexes[this.matchAt]=l,this.regexes.push([l,a]),this.matchAt+=Fs(a)+1}compile(){this.regexes.length===0&&(this.exec=()=>null);let a=this.regexes.map(l=>l[1]);this.matcherRe=n(Vo(a,{joinWith:"|"}),!0),this.lastIndex=0}exec(a){this.matcherRe.lastIndex=this.lastIndex;let l=this.matcherRe.exec(a);if(!l)return null;let d=l.findIndex((u,p)=>p>0&&u!==void 0),c=this.matchIndexes[d];return l.splice(0,d),Object.assign(l,c)}}class i{constructor(){this.rules=[],this.multiRegexes=[],this.count=0,this.lastIndex=0,this.regexIndex=0}getMatcher(a){if(this.multiRegexes[a])return this.multiRegexes[a];let l=new t;return this.rules.slice(a).forEach(([d,c])=>l.addRule(d,c)),l.compile(),this.multiRegexes[a]=l,l}resumingScanAtSamePosition(){return this.regexIndex!==0}considerAll(){this.regexIndex=0}addRule(a,l){this.rules.push([a,l]),l.type==="begin"&&this.count++}exec(a){let l=this.getMatcher(this.regexIndex);l.lastIndex=this.lastIndex;let d=l.exec(a);if(this.resumingScanAtSamePosition()&&!(d&&d.index===this.lastIndex)){let c=this.getMatcher(0);c.lastIndex=this.lastIndex+1,d=c.exec(a)}return d&&(this.regexIndex+=d.position+1,this.regexIndex===this.count&&this.considerAll()),d}}function o(s){let a=new i;return s.contains.forEach(l=>a.addRule(l.begin,{rule:l,type:"begin"})),s.terminatorEnd&&a.addRule(s.terminatorEnd,{type:"end"}),s.illegal&&a.addRule(s.illegal,{type:"illegal"}),a}function r(s,a){let l=s;if(s.isCompiled)return l;[Op,Lp,Up,Kp].forEach(c=>c(s,a)),e.compilerExtensions.forEach(c=>c(s,a)),s.__beforeBegin=null,[Pp,Mp,Dp].forEach(c=>c(s,a)),s.isCompiled=!0;let d=null;return typeof s.keywords=="object"&&s.keywords.$pattern&&(s.keywords=Object.assign({},s.keywords),d=s.keywords.$pattern,delete s.keywords.$pattern),d=d||/\w+/,s.keywords&&(s.keywords=Gs(s.keywords,e.case_insensitive)),l.keywordPatternRe=n(d,!0),a&&(s.begin||(s.begin=/\B|\b/),l.beginRe=n(l.begin),!s.end&&!s.endsWithParent&&(s.end=/\B|\b/),s.end&&(l.endRe=n(l.end)),l.terminatorEnd=Ft(l.end)||"",s.endsWithParent&&a.terminatorEnd&&(l.terminatorEnd+=(s.end?"|":"")+a.terminatorEnd)),s.illegal&&(l.illegalRe=n(s.illegal)),s.contains||(s.contains=[]),s.contains=[].concat(...s.contains.map(function(c){return Gp(c==="self"?s:c)})),s.contains.forEach(function(c){r(c,l)}),s.starts&&r(s.starts,a),l.matcher=o(l),l}if(e.compilerExtensions||(e.compilerExtensions=[]),e.contains&&e.contains.includes("self"))throw new Error("ERR: contains `self` is not supported at the top-level of a language.  See documentation.");return e.classNameAliases=On(e.classNameAliases||{}),r(e)}function Qs(e){return e?e.endsWithParent||Qs(e.starts):!1}function Gp(e){return e.variants&&!e.cachedVariants&&(e.cachedVariants=e.variants.map(function(n){return On(e,{variants:null},n)})),e.cachedVariants?e.cachedVariants:Qs(e)?On(e,{starts:e.starts?On(e.starts):null}):Object.isFrozen(e)?On(e):e}var Wp="11.12.0",Fo=class extends Error{constructor(n,t){super(n),this.name="HTMLInjectionError",this.html=t}},Bo=$s,Ks=On,Bs=Symbol("nomatch"),Qp=7,Zs=function(e){let n=Object.create(null),t=Object.create(null),i=[],o=!0,r="Could not find the language '{}', did you forget to load/include a language module?",s={disableAutodetect:!0,name:"Plain text",contains:[]},a={ignoreUnescapedHTML:!1,throwUnescapedHTML:!1,noHighlightRe:/^(no-?highlight)$/i,languageDetectRe:/\blang(?:uage)?-([\w-]+)\b/i,classPrefix:"hljs-",cssSelector:"pre code",languages:null,__emitter:jo};function l(T){return a.noHighlightRe.test(T)}function d(T){let h=T.className+" ";h+=T.parentNode?T.parentNode.className:"";let I=a.languageDetectRe.exec(h);if(I){let L=S(I[1]);return L||(Ds(r.replace("{}",I[1])),Ds("Falling back to no-highlight mode for this block.",T)),L?I[1]:"no-highlight"}return h.split(/\s+/).find(L=>l(L)||S(L))}function c(T,h,I){let L="",$="";typeof h=="object"?(L=T,I=h.ignoreIllegals,$=h.language):(vt("10.7.0","highlight(lang, code, ...args) has been deprecated."),vt("10.7.0",`Please use highlight(code, options) instead.
https://github.com/highlightjs/highlight.js/issues/2277`),$=T,L=h),I===void 0&&(I=!0);let ce={code:L,language:$};Oe("before:highlight",ce);let ge=ce.result?ce.result:u(ce.language,ce.code,I);return ge.code=ce.code,Oe("after:highlight",ge),ge}function u(T,h,I,L){let $=Object.create(null);function ce(N,P){return N.keywords[P]}function ge(){if(!z.keywords){ke.addText(se);return}let N=0;z.keywordPatternRe.lastIndex=0;let P=z.keywordPatternRe.exec(se),G="";for(;P;){G+=se.substring(N,P.index);let te=qe.case_insensitive?P[0].toLowerCase():P[0],Se=ce(z,te);if(Se){let[Ee,Ht]=Se;if(ke.addText(G),G="",$[te]=($[te]||0)+1,$[te]<=Qp&&(Mn+=Ht),Ee.startsWith("_"))G+=P[0];else{let Ln=qe.classNameAliases[Ee]||Ee;Ae(P[0],Ln)}}else G+=P[0];N=z.keywordPatternRe.lastIndex,P=z.keywordPatternRe.exec(se)}G+=se.substring(N),ke.addText(G)}function xe(){if(se==="")return;let N=null;if(typeof z.subLanguage=="string"){if(!n[z.subLanguage]){ke.addText(se);return}N=u(z.subLanguage,se,!0,pn[z.subLanguage]),pn[z.subLanguage]=N._top}else N=f(se,z.subLanguage.length?z.subLanguage:null);z.relevance>0&&(Mn+=N.relevance),ke.__addSublanguage(N._emitter,N.language)}function Ie(){z.subLanguage!=null?xe():ge(),se=""}function Ae(N,P){N!==""&&(ke.startScope(P),ke.addText(N),ke.endScope())}function Zn(N,P){let G=1,te=P.length-1;for(;G<=te;){if(!N._emit[G]){G++;continue}let Se=qe.classNameAliases[N[G]]||N[G],Ee=P[G];Se?Ae(Ee,Se):(se=Ee,ge(),se=""),G++}}function Jn(N,P){return N.scope&&typeof N.scope=="string"&&ke.openNode(qe.classNameAliases[N.scope]||N.scope),N.beginScope&&(N.beginScope._wrap?(Ae(se,qe.classNameAliases[N.beginScope._wrap]||N.beginScope._wrap),se=""):N.beginScope._multi&&(Zn(N.beginScope,P),se="")),z=Object.create(N,{parent:{value:z}}),z}function Yn(N,P,G){let te=pp(N.endRe,G);if(te){if(N["on:end"]){let Se=new Ri(N);N["on:end"](P,Se),Se.isMatchIgnored&&(te=!1)}if(te){for(;N.endsParent&&N.parent;)N=N.parent;return N}}if(N.endsWithParent)return Yn(N.parent,P,G)}function Tt(N){return z.matcher.regexIndex===0?(se+=N[0],1):(nt=!0,0)}function Et(N){let P=N[0],G=N.rule,te=new Ri(G),Se=[G.__beforeBegin,G["on:begin"]];for(let Ee of Se)if(Ee&&(Ee(N,te),te.isMatchIgnored))return Tt(P);return G.skip?se+=P:(G.excludeBegin&&(se+=P),Ie(),!G.returnBegin&&!G.excludeBegin&&(se=P)),Jn(G,N),G.returnBegin?0:P.length}function qt(N){let P=N[0],G=h.substring(N.index),te=Yn(z,N,G);if(!te)return Bs;let Se=z;z.endScope&&z.endScope._wrap?(Ie(),Ae(P,z.endScope._wrap)):z.endScope&&z.endScope._multi?(Ie(),Zn(z.endScope,N)):Se.skip?se+=P:(Se.returnEnd||Se.excludeEnd||(se+=P),Ie(),Se.excludeEnd&&(se=P));do z.scope&&ke.closeNode(),!z.skip&&!z.subLanguage&&(Mn+=z.relevance),z=z.parent;while(z!==te.parent);return te.starts&&Jn(te.starts,N),Se.returnEnd?0:P.length}function qi(){let N=[];for(let P=z;P!==qe;P=P.parent)P.scope&&N.unshift(P.scope);N.forEach(P=>ke.openNode(P))}let yn={};function Ut(N,P){let G=P&&P[0];if(se+=N,G==null)return Ie(),0;if(yn.type==="begin"&&P.type==="end"&&yn.index===P.index&&G===""){if(se+=h.slice(P.index,P.index+1),!o){let te=new Error(`0 width match regex (${T})`);throw te.languageName=T,te.badRule=yn.rule,te}return 1}if(yn=P,P.type==="begin")return Et(P);if(P.type==="illegal"&&!I){let te=new Error('Illegal lexeme "'+G+'" for mode "'+(z.scope||"<unnamed>")+'"');throw te.mode=z,te}else if(P.type==="end"){let te=qt(P);if(te!==Bs)return te}if(P.type==="illegal"&&G==="")return P.index===h.length||(se+=`
`),1;if(et>1e5&&et>P.index*3)throw new Error("potential infinite loop, way more iterations than matches");return se+=G,G.length}let qe=S(T);if(!qe)throw Gn(r.replace("{}",T)),new Error('Unknown language: "'+T+'"');let Ui=Hp(qe),Xn="",z=L||Ui,pn={},ke=new a.__emitter(a);qi();let se="",Mn=0,tn=0,et=0,nt=!1;try{if(qe.__emitTokens)qe.__emitTokens(h,ke);else{for(z.matcher.considerAll();;){et++,nt?nt=!1:z.matcher.considerAll(),z.matcher.lastIndex=tn;let N=z.matcher.exec(h);if(!N)break;let P=h.substring(tn,N.index),G=Ut(P,N);tn=N.index+G}Ut(h.substring(tn))}return ke.finalize(),Xn=ke.toHTML(),{language:T,value:Xn,relevance:Mn,illegal:!1,_emitter:ke,_top:z}}catch(N){if(N.message&&N.message.includes("Illegal"))return{language:T,value:Bo(h),illegal:!0,relevance:0,_illegalBy:{message:N.message,index:tn,context:h.slice(tn-100,tn+100),mode:N.mode,resultSoFar:Xn},_emitter:ke};if(o)return{language:T,value:Bo(h),illegal:!1,relevance:0,errorRaised:N,_emitter:ke,_top:z};throw N}}function p(T){let h={value:Bo(T),illegal:!1,relevance:0,_top:s,_emitter:new a.__emitter(a)};return h._emitter.addText(T),h}function f(T,h){h=h||a.languages||Object.keys(n);let I=p(T),L=h.filter(S).filter(H).map(Ie=>u(Ie,T,!1));L.unshift(I);let $=L.sort((Ie,Ae)=>{if(Ie.relevance!==Ae.relevance)return Ae.relevance-Ie.relevance;if(Ie.language&&Ae.language){if(S(Ie.language).supersetOf===Ae.language)return 1;if(S(Ae.language).supersetOf===Ie.language)return-1}return 0}),[ce,ge]=$,xe=ce;return xe.secondBest=ge,xe}function b(T,h,I){let L=h&&t[h]||I;T.classList.add("hljs"),T.classList.add(`language-${L}`)}function w(T){let h=null,I=d(T);if(l(I))return;if(Oe("before:highlightElement",{el:T,language:I}),T.dataset.highlighted){console.log("Element previously highlighted. To highlight again, first unset `dataset.highlighted`.",T);return}if(T.children.length>0&&(a.ignoreUnescapedHTML||(console.warn("One of your code blocks includes unescaped HTML. This is a potentially serious security risk."),console.warn("https://github.com/highlightjs/highlight.js/wiki/security"),console.warn("The element with unescaped HTML:"),console.warn(T)),a.throwUnescapedHTML))throw new Fo("One of your code blocks includes unescaped HTML.",T.innerHTML);h=T;let L=h.textContent,$=I?c(L,{language:I,ignoreIllegals:!0}):f(L);T.innerHTML=$.value,T.dataset.highlighted="yes",b(T,I,$.language),T.result={language:$.language,re:$.relevance,relevance:$.relevance},$.secondBest&&(T.secondBest={language:$.secondBest.language,relevance:$.secondBest.relevance}),Oe("after:highlightElement",{el:T,result:$,text:L})}function x(T){a=Ks(a,T)}let m=()=>{W(),vt("10.6.0","initHighlighting() deprecated.  Use highlightAll() now.")};function A(){W(),vt("10.6.0","initHighlightingOnLoad() deprecated.  Use highlightAll() now.")}let _=!1;function W(){function T(){W()}if(document.readyState==="loading"){_||window.addEventListener("DOMContentLoaded",T,!1),_=!0;return}document.querySelectorAll(a.cssSelector).forEach(w)}function E(T,h){let I=null;try{I=h(e)}catch(L){if(Gn("Language definition for '{}' could not be registered.".replace("{}",T)),o)Gn(L);else throw L;I=s}I.name||(I.name=T),n[T]=I,I.rawDefinition=h.bind(null,e),I.aliases&&F(I.aliases,{languageName:T})}function Y(T){delete n[T];for(let h of Object.keys(t))t[h]===T&&delete t[h]}function de(){return Object.keys(n)}function S(T){return T=(T||"").toLowerCase(),n[T]||n[t[T]]}function F(T,{languageName:h}){typeof T=="string"&&(T=[T]),T.forEach(I=>{t[I.toLowerCase()]=h})}function H(T){let h=S(T);return h&&!h.disableAutodetect}function Ve(T){T["before:highlightBlock"]&&!T["before:highlightElement"]&&(T["before:highlightElement"]=h=>{T["before:highlightBlock"](Object.assign({block:h.el},h))}),T["after:highlightBlock"]&&!T["after:highlightElement"]&&(T["after:highlightElement"]=h=>{T["after:highlightBlock"](Object.assign({block:h.el},h))})}function Ke(T){Ve(T),i.push(T)}function We(T){let h=i.indexOf(T);h!==-1&&i.splice(h,1)}function Oe(T,h){let I=T;i.forEach(function(L){L[I]&&L[I](h)})}function nn(T){return vt("10.7.0","highlightBlock will be removed entirely in v12.0"),vt("10.7.0","Please use highlightElement now."),w(T)}Object.assign(e,{highlight:c,highlightAuto:f,highlightAll:W,highlightElement:w,highlightBlock:nn,configure:x,initHighlighting:m,initHighlightingOnLoad:A,registerLanguage:E,unregisterLanguage:Y,listLanguages:de,getLanguage:S,registerAliases:F,autoDetection:H,inherit:Ks,addPlugin:Ke,removePlugin:We}),e.debugMode=function(){o=!1},e.safeMode=function(){o=!0},e.versionString=Wp,e.regex={concat:Wn,lookahead:js,either:Ai,optional:cp,anyNumberOfTimes:dp};for(let T in Ei)typeof Ei[T]=="object"&&zs(Ei[T]);return Object.assign(e,Ei),e},kt=Zs({});kt.newInstance=()=>Zs({});Js.exports=kt;kt.HighlightJS=kt;kt.default=kt});var ih={};fd(ih,{apply:()=>th,inject:()=>Yf,name:()=>Jf,registerScratchRows:()=>Gl});module.exports=hd(ih);var rr=`/* Dark Settings Form Control Design System \u2014 applied to aidos board */

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
`;var ar=`/* Plan-meta modal styles (Ticket U12). Board.css owns the shared modal
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
`;var sr=`.tool-render-row {
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
`;var fn=["open","in_progress","awaiting_verification","done"];function lr(e){return e.criteria.trim().length>0}function dr(e,n){let t=e.toLowerCase(),i=n.toLowerCase();return t<i?-1:t>i?1:0}function cr(e,n,t="confidence",i=!0){let o=lr(e),r=lr(n);if(o!==r)return o?-1:1;let s=0,a=0;switch(t){case"confidence":s=e.confidenceScore-n.confidenceScore,a=(e.gateFraction??0)-(n.gateFraction??0);break;case"gates":s=(e.gateFraction??0)-(n.gateFraction??0),a=e.confidenceScore-n.confidenceScore;break;case"time":s=e.updatedAt-n.updatedAt,a=dr(e.title,n.title);break;case"alpha":s=dr(e.title,n.title),a=e.updatedAt-n.updatedAt;break}let l=s;return i&&(l=-l),l===0&&(l=a,i&&(l=-l)),l===0&&(l=e.id-n.id),l}function gd(e,n){return n===""||e.title.toLowerCase().includes(n.toLowerCase())?!0:String(e.id).includes(n)}function ur(e,n={}){let t=n.stateIds?new Set(n.stateIds):null,i=n.projectIds?new Set(n.projectIds):null,o=n.search??"",r=n.tags!==void 0&&n.tags.length>0?new Set(n.tags):null,s=[];for(let a of e)if(!(t!==null&&!t.has(a.state))&&!(i!==null&&!i.has(a.projectId))&&gd(a,o)){if(r!==null){let l=a.tags??[],d=!1;for(let c of l)if(r.has(c)){d=!0;break}if(!d)continue}s.push(a)}return s.sort((a,l)=>cr(a,l,n.sortKey??"confidence",n.descending??!0)),s}var ot=[{id:"builtin:user_signoff",label:"User signoff",description:"The human confirms the work.",weight:1,allowedAuthors:["user"]},{id:"builtin:user_verified",label:"User verified",description:"The human checked the finished work.",weight:1,allowedAuthors:["user"]},{id:"builtin:eval_criteria",label:"Evaluation criteria",description:"The criteria to judge the work.",weight:1,allowedAuthors:["user","agent"]},{id:"builtin:file_allowlist",label:"File allowlist",description:"The files the change may touch.",weight:1,allowedAuthors:["user"]},{id:"builtin:agent_report",label:"Agent report",description:"The agent describes the work.",weight:1,allowedAuthors:["user","agent"]},{id:"builtin:automated_check",label:"Automated check",description:"A machine check ran and reported a result.",weight:1,allowedAuthors:["agent","user"]},{id:"builtin:test_run",label:"Test run",description:"A test run and its result.",weight:1,allowedAuthors:["agent","user"]},{id:"builtin:review_pass",label:"Review \u2014 accepted",description:"An independent review of the change accepted it: a reviewer subagent or the human read it, reported findings, and PASSED it. The orchestrator's own read does not qualify. A failing review is recorded with builtin:review_fail instead \u2014 never here.",weight:1,allowedAuthors:["agent","user"]},{id:"builtin:review_fail",label:"Review \u2014 failed",description:"An independent review of the change FAILED it: a reviewer subagent or the human found a defect and did not pass it. Contributes to nothing \u2014 it never satisfies a gate. Kept alongside any later builtin:review_pass so the review history (how many rounds, what each found) stays visible.",weight:0,allowedAuthors:["agent","user"]},{id:"builtin:retired",label:"Retired",description:"The human hid this ticket without deleting it (#108). While a live row of this kind exists, every consumer ignores the ticket \u2014 the board grid, the filter counts, the tab badge, the human queue, the agent's board reads, the plan render \u2014 except the Retired panel, where it can be viewed and un-retired. DETACH this row to un-retire: the append-only log keeps both the retirement and the un-retirement as history, so the ticket returns to exactly the state and evidence it had. Contributes to nothing \u2014 it never satisfies a gate \u2014 and only the human may attach it: an agent that can hide tickets can hide its own inconvenient work. The payload carries an optional reason and optional supersededBy ticket references naming where the work went.",weight:0,allowedAuthors:["user"]},{id:"builtin:review_note",label:"Remark",description:"A remark: a note from a review round, or a general comment on the ticket. The one surviving free-form remark kind after builtin:comment folded into it \u2014 same weight, same authors, one kind instead of two doing the same job.",weight:.5,allowedAuthors:["agent","user"]},{id:"builtin:after_shot",label:"After shot",description:"The state after the work.",weight:1,allowedAuthors:["user","agent"]},{id:"builtin:comment",label:"Comment (deprecated)",description:"DEPRECATED \u2014 folded into builtin:review_note, which is identical in weight and authorship. Kept here only so a pre-existing evidence row of this kind still validates and renders; no longer offered for new rows. Do not confuse with the ticket's COMMENT THREAD (CommentRecord/userAddComment), a separate durable mechanism this kind never wrote to.",weight:.5,allowedAuthors:["user","agent"]},{id:"builtin:imported_state",label:"Imported state",description:"The state that a plan document claimed at import time.",weight:0,allowedAuthors:["system"]},{id:"builtin:user_commit",label:"Git commit",description:"One git commit from the ticket's workspace, resolved through git show at attach time. The AGENT may attach it as well as the human, because it is a VERIFIED FACT rather than an attestation: the host resolves the hash and stores what git reports, so an unresolvable or invented hash is refused instead of recorded. That is what separates it from review_pass, which stays human- or reviewer-authored because nothing can verify a judgement.",weight:1,allowedAuthors:["user","agent"]}],Qt=[{fromState:"open",toState:"in_progress",requiredKinds:["builtin:user_signoff"],allowedActors:["user","agent"]},{fromState:"in_progress",toState:"awaiting_verification",requiredKinds:["builtin:automated_check","builtin:review_pass","builtin:user_commit"],allowedActors:["user","agent"],excusedBy:{"builtin:automated_check":"builtin:review_pass"}},{fromState:"awaiting_verification",toState:"done",requiredKinds:["builtin:user_verified"],allowedActors:["user"]},{fromState:"awaiting_verification",toState:"in_progress",requiredKinds:[],allowedActors:["user"]}],xh={kinds:[...ot],gates:[...Qt],injectEnabled:!0,injectDebounceMs:3e4};function Ji(e){return e.foreign===!0&&e.sourceSessionId!==void 0?e.sourceSessionId+":"+String(e.id):String(e.id)}var Yi="builtin:retired";function pr(e){return e===void 0?!1:e.some(n=>n.kind===Yi)}function q(e){return Ji(e)}function gr(e,n){if(e===null||e==="")return null;let t=n.find(o=>q(o)===e);if(t!==void 0)return t;if(!/^\d+$/.test(e))return null;let i=Number(e);return n.find(o=>Number(o.id)===i)??null}function mr(e,n){return e.filter(t=>!pr(n[Ji(t)]))}var Dn=["open","in_progress","awaiting_verification","done"];function Me(e){switch(e){case"open":return"Open";case"in_progress":return"In progress";case"awaiting_verification":return"Awaiting verification";case"done":return"Done";default:return e}}function md(e){switch(e){case"open":return"open";case"in_progress":return"in-progress";case"awaiting_verification":return"awaiting-verification";case"done":return"done";default:return e}}function Tn(e){return"aidos-chip aidos-chip-state-"+md(e)}function on(e){return typeof e.criteria=="string"&&e.criteria.trim().length>0}function bd(e,n){return n===""||e.title.toLowerCase().includes(n.toLowerCase())?!0:String(e.id).includes(n)}function br(e,n){return ur(e,{stateIds:n.stateIds,projectIds:n.projectIds??void 0,search:n.search,tags:n.tags,sortKey:n.sortKey,descending:n.descending})}function wr(e,n,t=8){let i=[];for(let o of e)bd(o,n)&&i.push(o);return i.sort((o,r)=>o.id-r.id),i.slice(0,t)}function vr(e){let n=0;for(let t of e)t.state!=="done"&&(n+=1);return n}function En(e,n,t){return t?e===null||n===null?"\u2014":e+"/"+n:"N/A"}function Zt(e,n,t){return t?e===null||n===null||e<n:!1}function rt(e){return Number.isFinite(e)?Math.max(0,Math.min(100,e*20)):0}function kr(e){return e.split(`
`).map(n=>n.trim()).filter(n=>n.length>0)}var wd=/\s*<!--\s*kinds:\s*([a-z0-9_:,\- ]+?)\s*-->\s*$/i;function vd(e){let n=wd.exec(e);return n===null?[]:n[1].split(",").map(t=>t.trim()).filter(t=>t!=="")}function Xi(e){return kr(e)}function kd(e,n){let i=kr(e).map(s=>({criterion:s,matched:!1,rows:[]})),o=new Map;for(let s of i)o.set(s.criterion,s);let r=[];for(let s of n){let a=s.payload.criteria;if(typeof a!="string"||a.trim()==="")r.push(s);else{let l=a.trim(),d=o.get(l);d?(d.rows.push(s),d.matched=!0):r.push(s)}}return r.length>0&&i.push({criterion:"",matched:!0,rows:r}),i}function yr(e,n){let t=kd(e,n),i=[];for(let o of t){if(o.criterion===""||o.matched)continue;let r=vd(o.criterion),s=a=>r.includes(a)||r.includes(a.replace(/^builtin:/,""));r.length>0&&n.some(a=>s(a.kind))||i.push(o.criterion)}return i}function eo(e,n=6){return e.length>n}var fr=["var(--badge-hue-1)","var(--badge-hue-2)","var(--badge-hue-3)","var(--badge-hue-4)","var(--badge-hue-5)","var(--badge-hue-6)","var(--badge-hue-7)","var(--badge-hue-8)"];function Nt(e){if(e==="builtin:review_fail")return"var(--verdict-fail)";if(e==="builtin:retired")return"var(--verdict-retired)";let n=0;for(let i=0;i<e.length;i++)n=n*31+e.charCodeAt(i)|0;let t=Math.abs(n)%fr.length;return fr[t]}function yd(e){for(let n of ot)if(n.id===e)return n.label;return e}function Jt(e){for(let n of ot)if(n.id===e)return n.description;return""}var xd={"builtin:imported_state":"IMPORTED","builtin:user_signoff":"SIGNED OFF","builtin:user_verified":"VERIFIED","builtin:eval_criteria":"CRITERIA","builtin:file_allowlist":"ALLOWLIST","builtin:agent_report":"REPORT","builtin:automated_check":"CHECK","builtin:test_run":"TESTS","builtin:review_pass":"ACCEPTED","builtin:review_fail":"FAILED","builtin:review_note":"NOTE","builtin:retired":"RETIRED","builtin:user_commit":"COMMIT"};function at(e){let n=xd[e];if(n!==void 0)return n;let t=yd(e);return t!==e?t.toUpperCase():(e.includes(":")?e.slice(e.indexOf(":")+1):e).replace(/[_-]+/g," ").toUpperCase()}function Sd(e,n=Qt){let t=fn.indexOf(e),i=new Set;for(let o of n){let r=fn.indexOf(o.toState);if(!(r<=fn.indexOf(o.fromState))&&r>=0&&t>=r)for(let s of o.requiredKinds)i.add(s)}return i}function xr(e,n,t=Qt){let i=Sd(e,t);return n.filter(o=>o.count>1||!i.has(o.kind))}function Sr(e){let n=new Map,t=new Map,i=0,o=new Map;for(let s of e)if(n.set(s.kind,(n.get(s.kind)??0)+1),o.has(s.kind)||o.set(s.kind,i++),typeof s.at=="number"){let a=t.get(s.kind);(a===void 0||s.at<a)&&t.set(s.kind,s.at)}let r=[];for(let[s,a]of n)r.push({kind:s,count:a,color:Nt(s)});return r.sort((s,a)=>{let l=s.kind==="builtin:imported_state",d=a.kind==="builtin:imported_state";if(l!==d)return l?-1:1;let c=t.get(s.kind),u=t.get(a.kind);if(c!==void 0&&u!==void 0&&c!==u)return c-u;let p=o.get(s.kind)??0,f=o.get(a.kind)??0;return p!==f?p-f:s.kind<a.kind?-1:s.kind>a.kind?1:0}),r}var Tr=new Map;function Er(e,n){let t=n.trim();e===""||t===""||Tr.set(e,t)}function Td(e){let n=Tr.get(e);if(n!==void 0)return n;let t=e.split("-").filter(i=>i!=="");return t.length===0?e:t[t.length-1]}function Kn(e,n){let t=/^(--.*--):(.*)$/.exec(e);if(t===null)return e;let[,i,o]=t;return n!==void 0&&i===n?"#"+o:Td(i)+"#"+o}function me(e){return e.workspaceKey+":"+e.slug}function hn(e,n){return Kn(e.workspaceKey+":"+e.id,n)}var hr=["var(--badge-hue-1)","var(--badge-hue-2)","var(--badge-hue-3)","var(--badge-hue-4)","var(--badge-hue-5)","var(--badge-hue-6)","var(--badge-hue-7)","var(--badge-hue-8)"];function rn(e){let n=0;for(let i=0;i<e.length;i++)n=n*31+e.charCodeAt(i)|0;let t=Math.abs(n)%hr.length;return hr[t]}function Rr(e){return rn(e)}function Ir(e){let n=new Map;for(let i of e)for(let o of i.tags??[])n.set(o,(n.get(o)??0)+1);let t=[];for(let[i,o]of n)t.push({tag:i,count:o});return t.sort((i,o)=>o.count-i.count||(i.tag<o.tag?-1:i.tag>o.tag?1:0)),t}function Ar(e,n,t){if(n===null)return{ticket:null,reanchorKey:null,reason:"none",absent:!1};let i=e.find(o=>q(o)===n)??null;if(i!==null)return{ticket:i,reanchorKey:null,reason:"resolved",absent:!1};if(t!==null){let o=e.find(r=>me(r)===me(t))??null;return o!==null?{ticket:o,reanchorKey:q(o),reason:"reanchored",absent:!1}:{ticket:t,reanchorKey:null,reason:"held",absent:!0}}return{ticket:null,reanchorKey:null,reason:"gone",absent:!1}}var Qe={projectIds:null,stateIds:[...Dn],sortKey:"time",descending:!0,search:""};function Be(e){return{projectIds:e.projectIds===null?null:[...e.projectIds],stateIds:[...e.stateIds],sortKey:e.sortKey,descending:e.descending,search:e.search,tags:e.tags===void 0?void 0:[...e.tags]}}var Ct=new Map;function Cr(){return{applied:Be(Qe),staged:Be(Qe)}}function _r(e){let n=Ct.get(e);return n?n.staged:Be(Qe)}function lo(e,n){let t=Ct.get(e);t||(t=Cr(),Ct.set(e,t)),t.applied=Be(n)}function co(e,n){let t=Ct.get(e);t||(t=Cr(),Ct.set(e,t)),t.staged=Be(n)}var no=new Map,Or=null,to=null,io=!1,Bn=null;function Pr(e){Bn=e}function Mr(e,n){let t=no.get(e)!==n;if(no.set(e,n),Or=e,!!t){if(uo){ei=!0;return}Bn!==null&&Bn()}}function Lr(e){let n=!io||to!==e;if(to=e,io=!0,!!n){if(uo){ei=!0;return}Bn!==null&&Bn()}}function Ed(){return io?to:Or}function _t(){let e=Ed(),n=e===null?0:no.get(e)??0;return n>0?"Tickets ("+n+")":"Tickets"}var uo=!1,ei=!1;function po(e){uo=e,!e&&ei&&(ei=!1,Bn!==null&&Bn())}var Yt=new Map;function Dr(e,n){return Yt.get(e)?.has(n)===!0}function Kr(e,n,t){let i=Yt.get(e);if(t){i===void 0?Yt.set(e,new Set([n])):i.add(n);return}i!==void 0&&(i.delete(n),i.size===0&&Yt.delete(e))}var st=new Map;function lt(e,n,t){let i=st.get(e);if(i===void 0){if(!t)return;i=new Map,st.set(e,i)}let o=i.get(n);if(o===void 0){if(!t)return;o={open:new Set,evidence:null},i.set(n,o)}return o}function Br(e,n){let t=st.get(e),i=t?.get(n);t===void 0||i===void 0||i.open.size>0||i.evidence!==null||(t.delete(n),t.size===0&&st.delete(e))}function zr(e,n,t){return lt(e,n,!1)?.open.has(t)===!0}function $r(e,n,t,i){if(i){lt(e,n,!0)?.open.add(t);return}let o=lt(e,n,!1);o!==void 0&&(o.open.delete(t),Br(e,n))}function jr(e,n){return lt(e,n,!1)?.evidence??null}function Fr(e,n,t){if(t!==null){let o=lt(e,n,!0);o!==void 0&&(o.evidence=t);return}let i=lt(e,n,!1);i!==void 0&&(i.evidence=null,Br(e,n))}function Vr(e,n){let t=st.get(e);t!==void 0&&(t.delete(n),t.size===0&&st.delete(e))}var oo=new Map;function qr(e){return oo.get(e)??null}function Ur(e,n){n===null?oo.delete(e):oo.set(e,n)}var Xt=new Map;function fo(e){return Xt.get(e)??null}var ro=new Set;function Hr(e){return ro.add(e),function(){ro.delete(e)}}function Ot(e){if(typeof window>"u")return;let n=new URL(window.location.href);e===null?(n.searchParams.delete("ticket"),window.history.replaceState({},"",n)):(n.searchParams.set("ticket",e),window.history.pushState({},"",n))}function gn(e,n){let t=Xt.get(e)??null;if(n===null?Xt.delete(e):Xt.set(e,n),t!==n)for(let i of[...ro])try{i(e)}catch{}}var ao=new Map;function ni(e){return ao.get(e)??null}function Nr(e,n){n===null?ao.delete(e):ao.set(e,n)}function Gr(e,n){return n??ni(e)}function Wr(e,n,t){if(n==="resolved"||n==="reanchored"){t!==null&&Nr(e,t);return}n==="none"&&Nr(e,null)}var Qr=new Map;function Zr(e,n){return e+"\0"+String(n)}function Jr(e,n){for(let t of n)t.foreign===!0&&t.sourceSessionId===void 0||Qr.set(Zr(t.sourceSessionId??e,t.id),t.title)}function ti(e,n){return e===void 0?null:Qr.get(Zr(e,n))??null}var Yr=new Map,Xr=new Map;function zn(e){return Yr.get(e)??null}function ea(e,n){Yr.set(e,n)}function na(e){return Xr.get(e)??null}function ta(e,n){Xr.set(e,n)}var so=new Set;function ia(e){return so.has(e)}function ho(e,n){n?so.add(e):so.delete(e)}var M=ee(require("react"),1);var ue=ee(require("react"),1);var C=ee(require("react"),1);function X(e){console.debug("aidos: "+e)}function oa(e){console.info("aidos: "+e)}function ze(e){console.warn("aidos: "+e)}function ra(e){console.error("aidos: "+e)}function Rd(e,n){if(e.sortKey!==n.sortKey||e.descending!==n.descending||e.search!==n.search||e.stateIds.length!==n.stateIds.length)return!1;for(let o=0;o<e.stateIds.length;o+=1)if(e.stateIds[o]!==n.stateIds[o])return!1;if(e.projectIds===null||n.projectIds===null){if(e.projectIds!==n.projectIds)return!1}else{if(e.projectIds.length!==n.projectIds.length)return!1;for(let o=0;o<e.projectIds.length;o+=1)if(e.projectIds[o]!==n.projectIds[o])return!1}let t=e.tags??[],i=n.tags??[];if(t.length!==i.length)return!1;for(let o=0;o<t.length;o+=1)if(t[o]!==i[o])return!1;return!0}var aa=[{key:"confidence",label:"Confidence"},{key:"gates",label:"Gates"},{key:"time",label:"Time updated"},{key:"alpha",label:"Alphabetical"}],Id=1200;function sa(e){return e.pending?C.default.createElement("span",{className:"aidos-filter-status","aria-live":"polite"},C.default.createElement("span",{className:"aidos-merge-spinner"}),C.default.createElement("span",null,"Filtering\u2026")):e.dirty?C.default.createElement("span",{className:"aidos-filter-status","aria-live":"polite"},C.default.createElement("span",null,"Not applied yet")):C.default.createElement("span",{className:"aidos-filter-status"})}function la(e){let n=e.sessionId,t=C.default.useRef(_r(n)),[i,o]=C.default.useState(()=>({...t.current,tags:t.current.tags??e.applied.tags??[]})),[r,s]=C.default.useState(t.current.search),[a,l]=C.default.useState(!1),d=C.default.useRef(null),c=C.default.useRef(null),[u,p]=C.default.useState(!1);function f(h){c.current!==null&&window.clearTimeout(c.current),p(!0),c.current=window.setTimeout(function(){c.current=null,p(!1),e.onApply(h)},Id)}function b(h){c.current!==null&&window.clearTimeout(c.current),c.current=null,p(!1),e.onApply(h)}function w(h){t.current=h,o(h),co(n,h),f(h)}function x(h){s(h),d.current!==null&&window.clearTimeout(d.current),d.current=window.setTimeout(function(){w({...t.current,search:h})},150)}function m(){d.current!==null&&window.clearTimeout(d.current),s(""),w({...t.current,search:""})}C.default.useEffect(function(){X("filter panel mounted")},[]),C.default.useEffect(function(){return function(){d.current!==null&&window.clearTimeout(d.current),c.current!==null&&window.clearTimeout(c.current)}},[]);let A=!Rd(i,e.applied),_=wr(e.tickets,r);function W(h){let L=i.stateIds.includes(h)?i.stateIds.filter($=>$!==h):[...i.stateIds,h];w({...i,stateIds:L})}function E(h){let I=(e.projects??[]).map(xe=>xe.id),L=i.projectIds===null?I:i.projectIds,ce=L.includes(h)?L.filter(xe=>xe!==h):[...L,h],ge=ce.length===I.length?null:ce;w({...i,projectIds:ge})}function Y(h){let I=i.tags??[],L=I.includes(h)?I.filter($=>$!==h):[...I,h];w({...i,tags:L})}function de(){s(""),d.current!==null&&window.clearTimeout(d.current);let h=Be(Qe);t.current=h,o(h),co(n,h),b(h)}let S=e.projects===void 0?null:C.default.createElement("div",{className:"aidos-panel-section"},C.default.createElement("div",{className:"aidos-panel-head"},C.default.createElement("h4",{className:"aidos-panel-title"},"Projects")),C.default.createElement("div",{className:"aidos-check-list"},e.projects.map(h=>{let I=i.projectIds===null||i.projectIds.includes(h.id);return C.default.createElement("label",{className:"aidos-check-row",key:h.id},C.default.createElement("input",{type:"checkbox",checked:I,onChange:()=>{E(h.id)}}),C.default.createElement("span",null,h.name))}))),F=C.default.createElement("div",{className:"aidos-panel-section"},C.default.createElement("div",{className:"aidos-panel-head"},C.default.createElement("h4",{className:"aidos-panel-title"},"State")),C.default.createElement("div",{className:"aidos-check-list"},Dn.map(h=>{let I=i.stateIds.includes(h),L=e.tickets.filter($=>$.state===h).length;return C.default.createElement("label",{className:"aidos-check-row",key:h},C.default.createElement("input",{type:"checkbox",checked:I,onChange:()=>{W(h)}}),C.default.createElement("span",null,Me(h)),C.default.createElement("span",{className:"aidos-check-count"},String(L)))}))),H=C.default.createElement("div",{className:"aidos-panel-section"},C.default.createElement("div",{className:"aidos-panel-head"},C.default.createElement("h4",{className:"aidos-panel-title"},"Sort")),C.default.createElement("div",{className:"aidos-sort-row"},C.default.createElement("select",{value:i.sortKey,onChange:h=>{w({...i,sortKey:h.target.value})}},aa.map(h=>C.default.createElement("option",{key:h.key,value:h.key},h.label))),C.default.createElement("button",{className:"aidos-btn aidos-toggle-btn",title:i.descending?"Sort ascending":"Sort descending","data-dsh-tip":"","aria-label":i.descending?"Sort ascending":"Sort descending",onClick:()=>{w({...i,descending:!i.descending})}},i.descending?"\u2193":"\u2191"))),Ve=C.default.createElement("div",{className:"aidos-panel-section"},C.default.createElement("div",{className:"aidos-panel-head"},C.default.createElement("h4",{className:"aidos-panel-title"},"Search")),C.default.createElement("div",{className:"aidos-search-box"},C.default.createElement("input",{className:"aidos-search-input",type:"text",placeholder:"Title or id",value:r,onChange:h=>{x(h.target.value)},onFocus:()=>{l(!0)},onBlur:()=>{window.setTimeout(function(){l(!1)},120)}}),a&&_.length>0?C.default.createElement("div",{className:"aidos-autocomplete"},_.map(h=>C.default.createElement("button",{className:"aidos-suggestion",key:h.id,onMouseDown:I=>{I.preventDefault(),m(),e.onJump(q(h))}},C.default.createElement("span",{className:"aidos-suggestion-title"},h.title),C.default.createElement("span",{className:"aidos-chip aidos-chip-id",style:{"--chip-hue":rn(me(h))},title:me(h),"data-dsh-tip":""},hn(h))))):null)),Ke=C.default.createElement("div",{className:"aidos-actions-row"},C.default.createElement(sa,{pending:u,dirty:A}),C.default.createElement("button",{className:"aidos-btn",onClick:de},"Reset")),We=C.default.createElement("div",{className:"aidos-filter-chips"},Dn.map(h=>{let I=i.stateIds.includes(h),L=e.tickets.filter($=>$.state===h).length;return C.default.createElement("button",{key:h,className:"aidos-filter-chip"+(I?" aidos-filter-chip-on":""),onClick:()=>{W(h)}},Me(h),C.default.createElement("span",{className:"aidos-check-count"},String(L)))})),Oe=Ir(e.tickets),nn=i.tags??[],T=Oe.length===0?null:C.default.createElement("div",{className:"aidos-filter-chips",role:"group","aria-label":"Tags"},Oe.map(({tag:h,count:I})=>{let L=nn.includes(h);return C.default.createElement("button",{key:h,className:"aidos-filter-chip"+(L?" aidos-filter-chip-on":""),title:I+" ticket(s) carry this tag","data-dsh-tip":"",onClick:()=>{Y(h)}},h,C.default.createElement("span",{className:"aidos-check-count"},String(I)))}));return C.default.createElement("div",{className:"aidos-filterbar"},C.default.createElement("div",{className:"aidos-filterbar-left"},We,T,e.projects===void 0||e.projects.length===0?null:C.default.createElement("select",{className:"aidos-filter-project",value:i.projectIds===null?"all":i.projectIds.join(","),onChange:h=>{let I=h.target.value;if(I==="all"){w({...i,projectIds:null});return}w({...i,projectIds:I===""?[]:I.split(",").map(Number)})}},C.default.createElement("option",{value:"all"},"All projects"),e.projects.map(h=>C.default.createElement("option",{key:h.id,value:String(h.id)},h.name))),C.default.createElement("div",{className:"aidos-sort-row"},C.default.createElement("select",{value:i.sortKey,onChange:h=>{w({...i,sortKey:h.target.value})}},aa.map(h=>C.default.createElement("option",{key:h.key,value:h.key},h.label))),C.default.createElement("button",{className:"aidos-btn aidos-toggle-btn",title:i.descending?"Sort ascending":"Sort descending","data-dsh-tip":"","aria-label":i.descending?"Sort ascending":"Sort descending",onClick:()=>{w({...i,descending:!i.descending})}},i.descending?"\u2193":"\u2191")),C.default.createElement("div",{className:"aidos-search-box aidos-filterbar-search"},C.default.createElement("input",{className:"aidos-search-input",type:"text",placeholder:"Title or id",value:r,onChange:h=>{x(h.target.value)},onFocus:()=>{l(!0)},onBlur:()=>{window.setTimeout(function(){l(!1)},120)}}),a&&_.length>0?C.default.createElement("div",{className:"aidos-autocomplete"},_.map(h=>C.default.createElement("button",{className:"aidos-suggestion",key:h.id,onMouseDown:I=>{I.preventDefault(),m(),e.onJump(q(h))}},C.default.createElement("span",{className:"aidos-suggestion-title"},h.title),C.default.createElement("span",{className:"aidos-chip aidos-chip-id",style:{"--chip-hue":rn(me(h))},title:me(h),"data-dsh-tip":""},hn(h))))):null),C.default.createElement(sa,{pending:u,dirty:A}),C.default.createElement("button",{className:"aidos-btn",onClick:de},"Reset")))}var Q=ee(require("react"),1);var dt=ee(require("react"),1);function da({evidence:e,state:n}){let t=xr(n,Sr(e));if(t.length===0)return null;let i=new Map;for(let o of e)o.kind==="builtin:imported_state"&&typeof o.payload.claimed_state=="string"&&i.set(o.kind,o.payload.claimed_state);return dt.default.createElement(dt.default.Fragment,null,t.map(o=>{let r=i.get(o.kind),s=r!==void 0?r:o.count>1?String(o.count):null;return dt.default.createElement("span",{key:o.kind,className:"aidos-chip aidos-chip-kind",style:{"--chip-hue":o.color},title:Jt(o.kind),"data-dsh-tip":""},dt.default.createElement("span",{className:"aidos-chip-key"},at(o.kind)),s!==null?dt.default.createElement("span",{className:"aidos-chip-count"},s):null)}))}var D=ee(require("react"),1),Pt=require("@deepseek-ai/dsh-client-ui-primitives"),Ad=1.6;function $e(){return{width:12,height:12,viewBox:"0 0 12 12",fill:"none",stroke:"currentColor",strokeWidth:Ad,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":!0,focusable:!1}}function Ze(){return D.default.createElement("svg",{...$e()},D.default.createElement("path",{d:"M8.5 1.5l2 2L4 10l-2.5.5L2 8z"}))}function ca(){return D.default.createElement("svg",{...$e()},D.default.createElement("path",{d:"M2 3.5h8M5 3.5V2h2v1.5M3 3.5l.5 7h5l.5-7M5 5.5v3M7 5.5v3"}))}function Rn(){return D.default.createElement("svg",{...$e()},D.default.createElement("path",{d:"M6.5 2H2v8h8V5.5"}),D.default.createElement("path",{d:"M7 2h3v3"}),D.default.createElement("path",{d:"M5 7l5-5"}))}function ua(){return D.default.createElement("svg",{...$e()},D.default.createElement("path",{d:"M6.5 10H2V2h8v4.5"}),D.default.createElement("path",{d:"M10.5 6.5v3.5H7"}),D.default.createElement("path",{d:"M10.2 6.8L7.2 9.8"}))}function pa(){return D.default.createElement("svg",{...$e()},D.default.createElement("path",{d:"M6 1.5l4.5 8h-9z"}),D.default.createElement("path",{d:"M6 4.75v2.5"}),D.default.createElement("path",{d:"M6 8.6v.4"}))}function ct(){return D.default.createElement("svg",{...$e()},D.default.createElement("circle",{cx:"6",cy:"4.1",r:"2.4"}),D.default.createElement("path",{d:"M5.1 6.3L4.3 9.9h3.4L6.9 6.3"}))}function ut(){return D.default.createElement("svg",{...$e()},D.default.createElement("circle",{cx:"3.4",cy:"2.6",r:"1.4"}),D.default.createElement("circle",{cx:"3.4",cy:"9.4",r:"1.4"}),D.default.createElement("circle",{cx:"8.6",cy:"2.6",r:"1.4"}),D.default.createElement("path",{d:"M3.4 4v4"}),D.default.createElement("path",{d:"M8.6 4v1.4c0 1.2-.7 1.6-1.8 1.6H3.4"}))}function In(){return D.default.createElement("svg",{...$e()},D.default.createElement("circle",{cx:"6",cy:"6",r:"4.6"}),D.default.createElement("path",{d:"M8 4L5.2 5.2 4 8l2.8-1.2z"}))}function ii(){return D.default.createElement("svg",{...$e()},D.default.createElement("circle",{cx:"6",cy:"6",r:"4.6"}),D.default.createElement("path",{d:"M6 3.5v3"}),D.default.createElement("path",{d:"M6 8.3v.35"}))}function oi(){return D.default.createElement("svg",{...$e()},D.default.createElement("path",{d:"M2.6 1.6h4.3l2.5 2.5v6.3H2.6z"}),D.default.createElement("path",{d:"M6.8 1.7v2.4h2.4"}),D.default.createElement("path",{d:"M4.2 8.4c1-1.4 1.7-1.4 2.2-.5s1 .6 1.6-.6"}))}function fa(){return D.default.createElement("svg",{...$e()},D.default.createElement("circle",{cx:"6",cy:"6",r:"4.6"}),D.default.createElement("path",{d:"M3.9 6.1l1.5 1.5L8.2 4.8"}))}function ha(){return D.default.createElement("svg",{...$e()},D.default.createElement("rect",{x:"1.6",y:"1.6",width:"8.8",height:"8.8",rx:"1.6"}),D.default.createElement("path",{d:"M3.9 6.1l1.5 1.5L8.2 4.8"}))}function ri(){return D.default.createElement("svg",{...$e()},D.default.createElement("path",{d:"M1.8 3.2l1 1 1.6-1.8"}),D.default.createElement("path",{d:"M1.8 7.4l1 1 1.6-1.8"}),D.default.createElement("path",{d:"M6.4 3.4h3.8"}),D.default.createElement("path",{d:"M6.4 7.6h3.8"}))}function ai({open:e,disabled:n}){return n===!0?D.default.createElement(Pt.IconChevronDownOutline14,{className:"tool-render-chevron tool-render-chevron-disabled","aria-hidden":!0}):D.default.createElement(Pt.IconChevronDownOutline14,{className:"tool-render-chevron"+(e?" tool-render-chevron-open":""),"aria-hidden":!0})}function ga(){return D.default.createElement(Pt.IconInspectOutline12,null)}var Mt=ee(require("react"),1);function Nd(e){if(e.state!=="open")return"the ticket is already signed off"}function Cd(e,n){if(e.state!=="in_progress")return"the ticket must be in progress";let t=new Set(n);if(!t.has("builtin:review_pass")){let i=["review_pass (a reviewer subagent or the human reviews first)"];return t.has("builtin:automated_check")||i.unshift("automated_check"),"requires "+i.join(", ")}}function _d(e){if(e.state!=="awaiting_verification")return"the ticket must be awaiting verification"}function Od(e){if(e.state!=="awaiting_verification")return"the ticket must be awaiting verification"}function Pd(e,n){if(e.state!=="awaiting_verification")return"the ticket must be awaiting verification";if(!n.includes("builtin:user_verified"))return"requires user_verified (attach your verification row first)"}function Md(e){if(e.state!=="in_progress")return"the ticket must be in progress"}function $n(e,n=[]){return[{id:"signoff",label:"Sign off",primary:!0,unavailableReason:Nd(e)},{id:"verify",label:"Verify",unavailableReason:Od(e)},{id:"submit-for-review",label:"Submit for review",unavailableReason:Cd(e,n)},{id:"send-back",label:"Send back",unavailableReason:_d(e)},{id:"mark-done",label:"Mark done",primary:!0,unavailableReason:Pd(e,n)},{id:"allowlist",label:"Allowlist",unavailableReason:Md(e)}]}function ma(e,n,t){let i=$n(e,n).find(o=>o.id===t);return i===void 0?"unknown action "+t:i.unavailableReason===void 0?null:i.label+" is not available \u2014 "+i.unavailableReason}var j=class extends Error{code;message;extra;constructor(n,t,i={}){super(t),this.name="AidosRemoteError",this.code=n,this.message=t,this.extra=i}};function Ld(){return crypto.randomUUID()}function Dd(e){return e===void 0?"":typeof e.message=="string"?e.message:""}function Kd(e){return e===void 0?{}:typeof e.details!="object"||e.details===null?{}:e.details}function ba(e){if(e===null)return"null";if(typeof e=="string")return e.length>60?e.slice(0,57)+"...":e;if(typeof e=="number"||typeof e=="boolean")return String(e);if(Array.isArray(e))return"["+e.length+" items]";if(typeof e=="object"){let n=Object.keys(e);return"{"+n.slice(0,4).join(",")+(n.length>4?",...":"")+"}"}return String(e)}function Bd(e){let n=Object.keys(e).map(function(t){return t+"="+ba(e[t])});return n.length===0?"{}":n.join(" ")}function pt(e){return ra("remote failed: "+e),new j("transport_error",e)}async function O(e,n,t){X("remote "+e+" args: "+Bd(n));let i={type:"client-request",rpcId:Ld(),method:`aidos/${e}`,payload:{args:{agentId:t,args:n}}},o=15e3,r=typeof AbortController<"u"?new AbortController:void 0,s=r?setTimeout(()=>r.abort(new Error("Remote call timed out after "+o+"ms")),o):void 0,a;try{a=await fetch(`/api/${i.method}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(i),signal:r?.signal}),s!==void 0&&clearTimeout(s)}catch(c){throw s!==void 0&&clearTimeout(s),pt(`The request to the aidos Remote failed: ${c instanceof Error?c.message:String(c)}`)}if(!a.ok)throw pt(`The aidos Remote answered with HTTP ${a.status}.`);let l;try{l=await a.json()}catch{throw pt("The aidos Remote answered with a body that is not JSON.")}if(l.type!=="server-response")throw pt("The aidos Remote answered with an unexpected response shape.");let d=l.result;if(d===void 0)throw pt("The aidos Remote answered without a result.");if(d.ok===!0){let c=d.value;return oa("remote "+e+" ok"),c===void 0?null:(X("remote "+e+" result: "+ba(c)),c)}if(d.ok===!1){let c=d.error,u=typeof c?.code=="string"?c.code:"refused",p=Dd(c)||`The aidos Remote refused the request (${u}).`;throw ze("remote "+e+" refused "+u+": "+p),new j(u,p,Kd(c))}throw pt("The aidos Remote answered with an unrecognized result.")}var wa=6e3;function zd(){return crypto.randomUUID()}var ft=[],go=new Set,mo=new Map;function va(){let e=ft.slice();for(let n of go)n(e)}function ka(e){let n=mo.get(e);n!==void 0&&(window.clearTimeout(n),mo.delete(e));let t=ft.filter(i=>i.id!==e);t.length!==ft.length&&(ft=t,va())}function R(e,n="info"){n==="refusal"?ze("toast refusal: "+e):X("toast: "+e);let t=zd(),i={id:t,text:e,kind:n,expiresAt:Date.now()+wa};ft=ft.concat(i),va();let o=window.setTimeout(function(){ka(t)},wa);return mo.set(t,o),t}function ya(e){ka(e)}function xa(e){return go.add(e),function(){go.delete(e)}}var $d={signoff:"onOpenSignoff",verify:"onOpenVerify","submit-for-review":"onOpenSubmitForReview","send-back":"onOpenSendBack","mark-done":"onOpenMarkDone",allowlist:"onOpenAllowlist"};function si(e){let n=e.evidence.map(a=>a.kind),t=$n(e.ticket,n),[i,o]=Mt.default.useState(null);Mt.default.useEffect(function(){X("action bar mounted")},[]);function r(a,l){if(a.unavailableReason!==void 0)return;if(e.checkAction===void 0){l();return}if(i!==null)return;let d=a.id;o(d),e.checkAction(d).then(c=>{if(c!==null){R(c,"refusal");return}l()}).catch(c=>{R(c instanceof j?c.message:String(c),"refusal")}).finally(()=>{o(null)})}let s=t.map(a=>{let l=e[$d[a.id]],d=a.unavailableReason!==void 0,c=i===a.id,u=(a.primary?"aidos-btn aidos-btn-primary":"aidos-btn")+(d?" aidos-btn-disabled":"");return Mt.default.createElement("button",{className:u,key:a.id,disabled:d||c,title:a.unavailableReason??a.label,"data-dsh-tip":"",onClick:()=>{r(a,l)}},c?"Checking\u2026":a.label)});return Mt.default.createElement("div",{className:"aidos-action-bar"},s)}var sn=ee(require("react"),1);var we=ee(require("react"),1);async function Lt(e,n,t,i){try{let o=i===void 0?void 0:i.map(s=>s.trim()).filter(s=>s!==""),r=await O("resolveApproval",{requestId:n,approved:t,...t&&o!==void 0?{paths:o}:{}},e);if(t){let s=o===void 0?0:o.length;R("Approved "+s+" path(s)","success")}else R("Request rejected","info");return r}catch(o){throw R(o instanceof j?o.message:String(o),"refusal"),o}}var jd=new Set(["signoff","verify","mark-done"]),Fd={signoff:"Sign off to let the agent start work",verify:"Verify the work and attach your row","mark-done":"Verified \u2014 mark it done"};function Ta(e,n){let t=[];for(let i of e){if(i.state==="done")continue;let o=n(i);if(o.includes(Yi))continue;let r=$n(i,o).filter(a=>jd.has(a.id)&&a.unavailableReason===void 0),s=new Set(r.map(a=>a.id));for(let a of r)a.id==="verify"&&s.has("mark-done")||t.push({ticket:i,boardKey:q(i),actionId:a.id,label:a.label,prompt:Fd[a.id]??a.label})}return t}function ko(e,n,t=[],i="suggested",o=[]){let r=Ta(e,n);for(let s of o){let a=String(s.ticketId),l=e.find(c=>q(c)===a);if(l===void 0)continue;let d=Array.isArray(s.payload?.paths)?s.payload.paths.filter(c=>typeof c=="string"):[];r.push({ticket:l,boardKey:q(l),actionId:"allowlist",label:"Review request",prompt:s.prompt+(d.length>0?` \u2014 ${d.length} path(s)`:""),approvalId:s.id,approvalPaths:d})}for(let s of t){let a=String(s.ticketId),l=r.find(d=>d.boardKey===a&&d.actionId===s.actionId);l!==void 0&&(l.nominationReason=s.reason,l.nominationId=s.id)}return Vd(r,i)}var yo={suggested:"Suggested first",recent:"Recently updated",id:"Ticket id",alpha:"Title A\u2013Z"};function Vd(e,n="suggested"){let t=[...e];switch(n){case"recent":return t.sort((i,o)=>o.ticket.updatedAt-i.ticket.updatedAt||i.ticket.id-o.ticket.id);case"id":return t.sort((i,o)=>i.ticket.id-o.ticket.id);case"alpha":return t.sort((i,o)=>i.ticket.title.localeCompare(o.ticket.title)||i.ticket.id-o.ticket.id);default:return t.sort((i,o)=>{let r=i.approvalId!==void 0?0:1,s=o.approvalId!==void 0?0:1;if(r!==s)return r-s;let a=i.nominationReason!==void 0?0:1,l=o.nominationReason!==void 0?0:1;return a!==l?a-l:i.ticket.phase-o.ticket.phase||i.ticket.order-o.ticket.order})}}function Ea(e){return e.filter(n=>n.nominationId!==void 0||n.approvalId!==void 0).length}var bo=["signoff","approvals","verify"],qd={signoff:"Sign off",approvals:"Approvals",verify:"Verify"},Ra={signoff:"No sign-offs waiting. Nothing needs permission to start.",approvals:"No approvals waiting. The agent is not blocked on you.",verify:"Nothing to verify. No finished work is waiting for a check."},Ia={signoff:"signoff",approvals:"allowlist",verify:"verify"};function Aa(e){return e.approvalId!==void 0?"approvals":e.actionId==="signoff"?"signoff":"verify"}function Na(e){return bo.map(n=>({id:n,label:qd[n],entries:e.filter(t=>Aa(t)===n)}))}function Ca(e){for(let n of bo)if(e.some(t=>Aa(t)===n))return n;return bo[0]}function _a(e){return e?4e3:2e4}var wo=null,vo=new Set;function jn(){return wo}function xo(e){wo=e;for(let n of[...vo])n(wo)}function Oa(e){return vo.add(e),function(){vo.delete(e)}}function Pa(e,n){if(e===null)return null;let t=Number(n);if(!Number.isFinite(t))return null;let i=null;for(let o of e.approvals)Number(o.ticketId)===t&&(i===null||o.at<i.at)&&(i=o);return i}function So(e,n,t){return!t&&Array.isArray(n)?[...n]:[...e]}function Ma(e,n){return e!==n?{armed:n,dismiss:!1}:{armed:null,dismiss:!0}}function La(e,n){let t=Number.isFinite(e)&&e>0?Math.floor(e):0,i=Number.isFinite(n)&&n>0?Math.floor(n):0;return{count:t,indicator:i>0&&t>0,asks:i}}function Da(e,n){let t=e.count===0?"Nothing is waiting on you":`${e.count} waiting on you`,i=e.asks>0?`; ${e.asks} the agent is asking for`:"",o=n?" (the last refresh failed; showing the last known count)":"";return t+i+o}var Ud={signoff:"open",verify:"awaiting_verification","mark-done":"awaiting_verification"},Sa=["open","in_progress","awaiting_verification","done"];function Ka(e,n,t){let i=Ta(e,n),o=[];for(let r of t){let s=String(r.ticketId);if(i.some(u=>u.boardKey===s&&u.actionId===r.actionId))continue;let a=e.find(u=>q(u)===s);if(a===void 0){o.push({nomination:r,kind:"not-on-board",reason:"#"+s+" is not on this board (it may belong to another session)"});continue}let l=Ud[r.actionId],d=l===void 0?-1:Sa.indexOf(l),c=Sa.indexOf(a.state);if(d>=0&&c>d){o.push({nomination:r,kind:"fulfilled",reason:"#"+s+" is already "+a.state+"; the ask was answered"});continue}o.push({nomination:r,kind:"unavailable",reason:"#"+s+" has no available "+r.actionId+" action right now"})}return o}function Hd(e){if(e===null||typeof e!="object")return[];let n=e.created;return Array.isArray(n)?n.filter(t=>typeof t=="string"):[]}function Gd(e,n){let t=new Set(n.map(i=>i.trim()).filter(i=>i!==""));return e.filter(i=>t.has(i))}function li(e){let[n,t]=we.default.useState(null),[i,o]=we.default.useState([]),[r,s]=we.default.useState(!1),a=we.default.useRef(!1),[l,d]=we.default.useState(()=>jn());we.default.useEffect(function(){return Oa(d)},[]),we.default.useEffect(function(){if(jn()!==null)return;let f=!1;return O("pendingApproval",{ticketId:e.ticketId},e.agentId).then(b=>{if(f||jn()!==null)return;let w=b!==null&&typeof b=="object"&&!Array.isArray(b)?b:null,x=a.current;t(w),o(m=>So(m,w?.payload?.paths,x))}).catch(()=>{}),function(){f=!0}},[e.ticketId,e.agentId]),we.default.useEffect(function(){if(l===null)return;let f=a.current,b=Pa(l,e.ticketId),w=b===null?null:{id:b.id,ticketId:Number(b.ticketId),kind:b.kind,prompt:b.prompt,payload:b.payload??{},at:b.at};t(w),o(x=>So(x,w?.payload?.paths,f))},[l,e.ticketId]);async function c(f){if(!(n===null||r)){s(!0);try{await Lt(e.agentId,n.id,f,i),a.current=!1,t(null),e.onResolved?.()}finally{s(!1)}}}if(n===null)return null;let u=Hd(n.payload),p=Gd(u,i);return we.default.createElement("div",{className:"aidos-approval-card"},we.default.createElement("div",{className:"aidos-approval-head"},we.default.createElement("span",{className:"aidos-chip aidos-chip-kind aidos-chip-approval-kind"},we.default.createElement("span",{className:"aidos-chip-key"},n.kind.toUpperCase())),we.default.createElement("span",{className:"aidos-approval-prompt"},n.prompt)),we.default.createElement("textarea",{className:"aidos-allowlist-input",value:i.join(`
`),disabled:r,onChange:f=>{a.current=!0,o(f.target.value.split(`
`))}}),p.length>0?we.default.createElement("p",{className:"aidos-approval-created"},p.length===1?"1 path does not exist yet and will be created: ":p.length+" paths do not exist yet and will be created: ",p.join(", ")):null,we.default.createElement("p",{className:"aidos-detail-note"},"Edit the list before approving if the proposal needs amending. The agent is told the outcome either way."),we.default.createElement("div",{className:"aidos-form-actions"},we.default.createElement("button",{className:"aidos-btn",disabled:r,onClick:()=>{c(!1)}},"Reject"),we.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:r,onClick:()=>{c(!0)}},r?"Working\u2026":"Approve")))}var k=ee(require("react"),1);var Wd=["builtin:user_signoff","builtin:user_verified","builtin:file_allowlist"],Qd="builtin:imported_state",Zd=new Set(["builtin:comment"]),Jd=new Set(["builtin:retired"]);function Ba(){let e=[],n=[];for(let t of ot){if(!t.allowedAuthors.includes("user")||t.id===Qd||Zd.has(t.id)||Jd.has(t.id))continue;let i={id:t.id,label:t.label,description:t.description};Wd.includes(t.id)?e.push(i):n.push(i)}return n.sort((t,i)=>t.id<i.id?-1:t.id>i.id?1:0),e.concat(n)}function za(e){if(e.trim()==="")return{ok:!0,payload:{}};let n;try{n=JSON.parse(e)}catch(t){return{ok:!1,error:"Payload is not valid JSON: "+(t instanceof Error?t.message:String(t))}}return typeof n!="object"||n===null||Array.isArray(n)?{ok:!1,error:"Payload must be a JSON object"}:{ok:!0,payload:n}}var he=ee(require("react"),1);function Te(e){return he.default.createElement("div",{className:"aidos-field-row"},he.default.createElement("span",{className:"aidos-field-row-label"},e.label),he.default.createElement("span",{className:"aidos-field-row-value"},e.children))}function $a(e){let[n,t]=he.default.useState(e.defaultOpen===!0);return he.default.createElement("details",{className:"aidos-collapse",open:n,onToggle:i=>{t(i.currentTarget.open)}},he.default.createElement("summary",null,e.summary),he.default.createElement("div",{className:"aidos-collapse-body"},e.children))}function be(e){let n=e.working===!0;return he.default.useEffect(function(){let t=i=>{i.key==="Escape"&&!n&&e.onClose()};return window.addEventListener("keydown",t),function(){window.removeEventListener("keydown",t)}},[e,n]),he.default.createElement("div",{className:"aidos-modal-mask",onClick:()=>{n||e.onClose()}},he.default.createElement("div",{className:"aidos-modal"+(e.wide===!0?" aidos-modal-wide":""),onClick:t=>{t.stopPropagation()}},he.default.createElement("div",{className:"aidos-modal-head"},he.default.createElement("h3",{className:"aidos-modal-title"},e.title),he.default.createElement("button",{className:"aidos-close-btn",onClick:e.onClose,disabled:n,"aria-label":"Close"},"\xD7")),he.default.createElement("div",{className:"aidos-modal-form"},e.children,e.onConfirm!==void 0?he.default.createElement("div",{className:"aidos-form-actions"},he.default.createElement("button",{className:"aidos-btn",onClick:e.onClose,disabled:n},"Cancel"),he.default.createElement("button",{className:"aidos-btn aidos-btn-primary",onClick:e.onConfirm,disabled:n},n?"Working\u2026":e.confirmLabel??"Confirm")):null)))}function je(e){return he.default.createElement("div",{className:"aidos-modal-row"},he.default.createElement("label",null,e.label),he.default.createElement("textarea",{className:"aidos-evidence-attach-note",value:e.value,disabled:e.working,placeholder:e.placeholder,onChange:n=>{e.onChange(n.target.value)}}))}function mn(e){return he.default.createElement("div",{className:"aidos-modal-row"},he.default.createElement("label",null,e.label),he.default.createElement("textarea",{className:"aidos-evidence-attach-note aidos-allowlist-input",value:e.value,disabled:e.working,placeholder:e.placeholder,onChange:n=>{e.onChange(n.target.value)}}))}function ht(e){return e.split(`
`).map(n=>n.trim()).filter(n=>n!=="")}function Yd(e){return k.default.createElement(be,{title:e.title,working:e.working,onClose:e.onClose,onConfirm:e.onAttach,confirmLabel:"Attach"},e.children)}function bn(e){return k.default.createElement(je,{label:e.label??"Note (optional)",value:e.note,working:e.working,onChange:e.onChange})}function ja(e){let n=e.split(`
`).map(t=>t.trim()).filter(t=>t!=="");return n.length===0?{ok:!1,error:"Add at least one line."}:{ok:!0,lines:n}}function Fa(e){return k.default.createElement(k.default.Fragment,null,k.default.createElement("div",{className:"aidos-evidence-paste-zone",onPaste:n=>{let t=Array.from(n.clipboardData.files)[0];t&&e.onFile(t)},onDragOver:n=>{n.preventDefault()},onDrop:n=>{n.preventDefault();let t=Array.from(n.dataTransfer.files)[0];t&&e.onFile(t)},tabIndex:0},e.uploading?"Uploading\u2026":e.imagePath!==null?"Screenshot stored \u2014 paste again to replace.":"Paste or drop a screenshot here (optional)"),e.pasteError!==null?k.default.createElement("p",{className:"aidos-evidence-paste-error"},e.pasteError):null)}async function Va(e,n,t){let i={"content-type":n.type||"application/octet-stream","x-file-name":t,"x-session-id":e},o=await O("workspaceRoot",{},e).catch(()=>{}),r=o!==void 0&&typeof o=="object"&&!Array.isArray(o)&&typeof o.workspace=="string"?o.workspace:null;r!==null&&(i["x-workspace"]=r);let s=await fetch("/paste-to-path",{method:"POST",headers:i,body:n});if(!s.ok){let l=await s.json().catch(()=>{});throw new Error(l?.error??`paste upload failed (${s.status})`)}return(await s.json()).path}function an(e){let[n,t]=k.default.useState(""),[i,o]=k.default.useState(null),[r,s]=k.default.useState(!1),[a,l]=k.default.useState(!1),[d,c]=k.default.useState(null);async function u(f){c(null),s(!0);try{let b=await Va(e.agentId,f,f.name||"pasted-image.png");o(b),R("Screenshot stored","success")}catch(b){c(b instanceof Error?b.message:String(b))}finally{s(!1)}}async function p(){if(!a){l(!0);try{let f={};n.trim()!==""&&(f.note=n.trim()),i!==null&&(f.imagePath=i),await O("userAttachEvidence",{ticketId:e.ticketId,kind:"builtin:user_verified",payload:f},e.agentId),R("Verified","success"),e.onAttached?.(),e.onClose()}catch(f){R(f instanceof j?f.message:String(f),"refusal")}finally{l(!1)}}}return k.default.createElement(Yd,{title:"Verify",working:a||r,onAttach:()=>{p()},onClose:e.onClose},k.default.createElement("p",{className:"aidos-modal-body"},"You verified this ticket hands-on. Paste (Ctrl+V) or drop a screenshot to attach it."),k.default.createElement(Fa,{imagePath:i,uploading:r,pasteError:d,onFile:u}),k.default.createElement(bn,{note:n,working:a,onChange:t}))}function Xd(e){let[n,t]=k.default.useState([]),[i,o]=k.default.useState(null),[r,s]=k.default.useState(""),[a,l]=k.default.useState(!1);k.default.useEffect(function(){let c=!0;return O("userRecentCommits",{ticketId:e.ticketId},e.agentId).then(u=>{if(!c)return;let p=u?.commits;t(Array.isArray(p)?p:[])}).catch(u=>{c&&o(u instanceof j?u.message:String(u))}),()=>{c=!1}},[e.ticketId,e.agentId]);async function d(){if(!(a||r==="")){l(!0);try{await O("userAttachCommitEvidence",{ticketId:e.ticketId,hash:r,...e.note.trim()===""?{}:{note:e.note.trim()}},e.agentId),R("Commit evidence attached","success"),s(""),e.setNote(""),e.onAttached?.()}catch(c){R(c instanceof j?c.message:String(c),"refusal")}finally{l(!1)}}}return k.default.createElement("div",{className:"aidos-evidence-tailored"},k.default.createElement("div",{className:"aidos-modal-row"},k.default.createElement("label",null,"Recent commits"),i!==null?k.default.createElement("p",{className:"aidos-evidence-paste-error"},i):k.default.createElement("select",{className:"aidos-evidence-attach-kind-select",value:r,disabled:a,onChange:c=>{s(c.target.value)}},k.default.createElement("option",{value:""},n.length===0?"Loading commits\u2026":"Pick a commit\u2026"),n.map(c=>k.default.createElement("option",{value:c.hash,key:c.hash},c.hash+" "+c.subject+" \u2014 "+c.author)))),k.default.createElement(bn,{note:e.note,working:e.working||a,onChange:e.setNote,label:"Note (optional)"}),k.default.createElement("div",{className:"aidos-form-actions"},k.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:e.working||a||r==="",onClick:()=>{d()}},a?"Working\u2026":"Attach commit")))}function ec(e){let[n,t]=k.default.useState(""),[i,o]=k.default.useState(""),[r,s]=k.default.useState(!1),a=ja(n);async function l(){if(!(r||!a.ok)){s(!0);try{let d={lines:a.lines};i.trim()!==""&&(d.note=i.trim()),await O("userAttachEvidence",{ticketId:e.ticketId,kind:"builtin:eval_criteria",payload:d},e.agentId),R("Evaluation criteria attached","success"),t(""),o(""),e.onAttached?.()}catch(d){R(d instanceof j?d.message:String(d),"refusal")}finally{s(!1)}}}return k.default.createElement("div",{className:"aidos-evidence-tailored"},k.default.createElement(mn,{label:"Evaluation criteria (one per line)",value:n,working:r,placeholder:`Criterion 1
Criterion 2`,onChange:t}),k.default.createElement(bn,{note:i,working:r,onChange:o}),k.default.createElement("div",{className:"aidos-form-actions"},k.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:r||!a.ok,title:a.ok?void 0:a.error,"data-dsh-tip":"",onClick:()=>{l()}},r?"Working\u2026":"Attach")))}function nc(e){let[n,t]=k.default.useState(""),[i,o]=k.default.useState(""),[r,s]=k.default.useState(!1);async function a(){if(!(r||n.trim()==="")){s(!0);try{let l={report:n.trim()};i.trim()!==""&&(l.note=i.trim()),await O("userAttachEvidence",{ticketId:e.ticketId,kind:"builtin:agent_report",payload:l},e.agentId),R("Agent report attached","success"),t(""),o(""),e.onAttached?.()}catch(l){R(l instanceof j?l.message:String(l),"refusal")}finally{s(!1)}}}return k.default.createElement("div",{className:"aidos-evidence-tailored"},k.default.createElement("div",{className:"aidos-modal-row"},k.default.createElement("label",null,"Report"),k.default.createElement("textarea",{className:"aidos-evidence-attach-note aidos-evidence-attach-tall",value:n,disabled:r,placeholder:"Describe the work performed\u2026",onChange:l=>{t(l.target.value)}})),k.default.createElement(bn,{note:i,working:r,onChange:o}),k.default.createElement("div",{className:"aidos-form-actions"},k.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:r||n.trim()==="",onClick:()=>{a()}},r?"Working\u2026":"Attach")))}function tc(e){let[n,t]=k.default.useState(""),[i,o]=k.default.useState(""),[r,s]=k.default.useState(""),[a,l]=k.default.useState(!1);async function d(){if(!(a||n.trim()===""||i==="")){l(!0);try{let c={command:n.trim(),result:i};r.trim()!==""&&(c.note=r.trim()),await O("userAttachEvidence",{ticketId:e.ticketId,kind:e.kind,payload:c},e.agentId),R(`${e.kind==="builtin:automated_check"?"Automated check":"Test run"} attached`,"success"),t(""),o(""),s(""),e.onAttached?.()}catch(c){R(c instanceof j?c.message:String(c),"refusal")}finally{l(!1)}}}return k.default.createElement("div",{className:"aidos-evidence-tailored"},k.default.createElement("div",{className:"aidos-modal-row"},k.default.createElement("label",null,"Command"),k.default.createElement("input",{type:"text",className:"aidos-command-input",value:n,disabled:a,placeholder:"npm run test",onChange:c=>{t(c.target.value)}})),k.default.createElement("div",{className:"aidos-modal-row"},k.default.createElement("label",null,"Result"),k.default.createElement("select",{className:"aidos-evidence-attach-kind-select",value:i,disabled:a,onChange:c=>{o(c.target.value)}},k.default.createElement("option",{value:""},"Choose a result\u2026"),k.default.createElement("option",{value:"pass"},"Pass"),k.default.createElement("option",{value:"fail"},"Fail"))),k.default.createElement(bn,{note:r,working:a,onChange:s}),k.default.createElement("div",{className:"aidos-form-actions"},k.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:a||n.trim()===""||i==="",onClick:()=>{d()}},a?"Working\u2026":"Attach")))}function ic(e){let[n,t]=k.default.useState(null),[i,o]=k.default.useState(""),[r,s]=k.default.useState(!1),[a,l]=k.default.useState(!1),[d,c]=k.default.useState(null);async function u(f){c(null),s(!0);try{let b=await Va(e.agentId,f,f.name||"pasted-image.png");t(b),R("Screenshot stored","success")}catch(b){c(b instanceof Error?b.message:String(b))}finally{s(!1)}}async function p(){if(!(a||n===null)){l(!0);try{let f={imagePath:n};i.trim()!==""&&(f.note=i.trim()),await O("userAttachEvidence",{ticketId:e.ticketId,kind:"builtin:after_shot",payload:f},e.agentId),R("After shot attached","success"),t(null),o(""),e.onAttached?.()}catch(f){R(f instanceof j?f.message:String(f),"refusal")}finally{l(!1)}}}return k.default.createElement("div",{className:"aidos-evidence-tailored"},k.default.createElement(Fa,{imagePath:n,uploading:r,pasteError:d,onFile:u}),k.default.createElement(bn,{note:i,working:a,onChange:o}),k.default.createElement("div",{className:"aidos-form-actions"},k.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:a||r||n===null,onClick:()=>{p()}},a?"Working\u2026":"Attach")))}function oc(e){let[n,t]=k.default.useState(""),[i,o]=k.default.useState(""),[r,s]=k.default.useState(""),[a,l]=k.default.useState(!1);async function d(x,m){if(!a){l(!0);try{await O("userAttachEvidence",{ticketId:e.ticketId,kind:x,payload:m},e.agentId),R("Evidence attached","success"),t(""),o(""),s(""),e.onAttached()}catch(A){R(A instanceof j?A.message:String(A),"refusal")}finally{l(!1)}}}async function c(x){if(!a){l(!0);try{await O("userGrantAllowlist",{ticketId:e.ticketId,paths:x},e.agentId),R("Allowlist granted","success"),t(""),o(""),s(""),e.onAttached()}catch(m){R(m instanceof j?m.message:String(m),"refusal")}finally{l(!1)}}}if(e.kind==="builtin:file_allowlist"){let x=ja(i);return k.default.createElement("div",{className:"aidos-evidence-tailored"},k.default.createElement(mn,{label:"Allowed paths (one per line)",value:i,working:a,placeholder:`src/client/
src/host/aidos-core.ts`,onChange:o}),k.default.createElement(bn,{note:n,working:a,onChange:t}),k.default.createElement("div",{className:"aidos-form-actions"},k.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:a||!x.ok,title:x.ok?void 0:x.error,"data-dsh-tip":"",onClick:()=>{x.ok&&c(x.lines??[])}},a?"Working\u2026":"Attach")))}if(e.kind==="builtin:eval_criteria")return k.default.createElement(ec,{ticketId:e.ticketId,agentId:e.agentId,onAttached:e.onAttached});if(e.kind==="builtin:agent_report")return k.default.createElement(nc,{ticketId:e.ticketId,agentId:e.agentId,onAttached:e.onAttached});if(e.kind==="builtin:automated_check"||e.kind==="builtin:test_run")return k.default.createElement(tc,{ticketId:e.ticketId,agentId:e.agentId,kind:e.kind,onAttached:e.onAttached});if(e.kind==="builtin:after_shot")return k.default.createElement(ic,{ticketId:e.ticketId,agentId:e.agentId,onAttached:e.onAttached});if(e.kind==="builtin:user_commit")return k.default.createElement(Xd,{ticketId:e.ticketId,agentId:e.agentId,onAttached:e.onAttached,note:n,setNote:t,working:a});let p={"builtin:review_pass":"What was reviewed, and why it is accepted","builtin:review_fail":"The verdict and the findings","builtin:review_note":"Note"}[e.kind];if(p!==void 0)return k.default.createElement("div",{className:"aidos-evidence-tailored"},k.default.createElement(bn,{note:n,working:a,onChange:t,label:p}),k.default.createElement("div",{className:"aidos-form-actions"},k.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:a||n.trim()==="",onClick:()=>{d(e.kind,{note:n.trim()})}},a?"Working\u2026":"Attach")));let f=za(r),b=f.ok?f.payload:{},w=f.ok?null:f.error;return k.default.createElement("div",{className:"aidos-evidence-tailored"},k.default.createElement($a,{summary:"Raw JSON (optional object)",defaultOpen:!1},k.default.createElement("div",{className:"aidos-modal-row"},k.default.createElement("textarea",{className:"aidos-evidence-attach-note",value:r,disabled:a,placeholder:`{
  "custom": "value"
}`,onChange:x=>{s(x.target.value)}})),w!==null?k.default.createElement("p",{className:"aidos-evidence-paste-error"},w):null),k.default.createElement(bn,{note:n,working:a,onChange:t}),k.default.createElement("div",{className:"aidos-form-actions"},k.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:a||w!==null,onClick:()=>{let x=n.trim()===""?b:{...b,note:n.trim()};d(e.kind,x)}},a?"Working\u2026":"Attach")))}function qa(e){let n=Ba(),[t,i]=k.default.useState(n.length>0?n[0].id:""),[o,r]=k.default.useState(null),s=n.filter(a=>a.id!=="builtin:user_signoff"&&a.id!=="builtin:user_verified");return k.default.createElement("div",{className:"aidos-evidence-attach"},k.default.createElement("div",{className:"aidos-modal-row"},k.default.createElement("label",null,"Other evidence kinds"),k.default.createElement("select",{className:"aidos-evidence-attach-kind-select",value:t,onChange:a=>{i(a.target.value)}},s.map(a=>k.default.createElement("option",{value:a.id,key:a.id},a.label)))),k.default.createElement(oc,{ticketId:e.ticketId,agentId:e.agentId,kind:t,onAttached:()=>e.onAttached?.()}))}var wn=ee(require("react"),1);function An(e){let[n,t]=wn.default.useState(!1),[i,o]=wn.default.useState(""),[r,s]=wn.default.useState(()=>(e.proposedPaths??[]).join(`
`));if(wn.default.useEffect(function(){e.open&&X("signoff dialog opened")},[e.open]),!e.open)return null;async function a(){if(n)return;t(!0);let l=ht(r);try{await O("userAttachEvidence",{ticketId:e.ticketId,kind:"builtin:user_signoff",payload:i.trim()===""?{}:{note:i.trim()}},e.agentId);let d=null;if(l.length>0)try{await O("userGrantAllowlist",{ticketId:e.ticketId,paths:l},e.agentId)}catch(c){d=c instanceof Error?c.message:String(c)}await O("userMoveTicket",{ticketId:e.ticketId,to:"in_progress"},e.agentId),d===null?R(l.length>0?"Signed off \u2014 "+l.length+" path(s) granted":"Signed off","success"):R("Signed off and moved, but the allowlist was refused: "+d+" \u2014 set the paths from the ticket's allowlist editor","refusal"),e.onClose(),e.onSignedOff()}catch(d){d instanceof j?R(d.message,"refusal"):R(String(d),"refusal")}finally{t(!1)}}return wn.default.createElement(be,{title:"Sign off ticket",working:n,onClose:e.onClose,onConfirm:a,confirmLabel:"Confirm"},wn.default.createElement("p",{className:"aidos-modal-body"},"Signoff moves this to in progress and grants the agent write access inside the allowlist below. Signoff alone grants access to nothing, so name the files here \u2014 or leave it empty and scope them later."),wn.default.createElement(je,{label:"Note (optional \u2014 rides the signoff row)",value:i,working:n,onChange:o}),wn.default.createElement(mn,{label:"Files the agent may write (one per line, optional)",value:r,working:n,onChange:s}))}var rc={signoff:"Sign off",verify:"Verify","mark-done":"Open on board"};function Ua(e){return e==="signoff"||e==="verify"||e==="mark-done"}function ac(e,n,t){if(t==="mark-done")return null;let i=$n(e,n).find(o=>o.id===t);return i===void 0?"unknown action "+t:i.unavailableReason===void 0?null:i.label+" is not available \u2014 "+i.unavailableReason}async function sc(e,n,t){if(t==="mark-done")return null;let i=await O("workspaceTickets",{},e),o=Array.isArray(i)?i:i.tickets??[],r=Array.isArray(i)?{}:i.evidence??{},s=o.find(l=>q(l)===n)??null;if(s===null)return"#"+n+" is not on this board (it may belong to another session)";let a=(r[n]??[]).map(l=>l.kind).filter(l=>typeof l=="string");return ac(s,a,t)}async function di(e,n,t){let i=await O("workspaceTickets",{},e),o=Array.isArray(i)?i:i.tickets??[],r=Array.isArray(i)?{}:i.evidence??{},s=o.find(d=>q(d)===n)??null;if(s===null)return"#"+n+" is not on this board (it may belong to another session)";let a=q(s),l=[...r[n]??[],...r[a]??[]].map(d=>d.kind).filter(d=>typeof d=="string");return ma(s,l,t)}function Ha(e){let[n,t]=sn.default.useState(null),[i,o]=sn.default.useState(!1);function r(){if(e.actionId==="mark-done"){gn(e.sessionId,e.boardKey),Ot(e.boardKey),R("Opening "+e.boardKey+" \u2014 see the Tickets tab","info");return}if(i)return;let l=e.actionId;o(!0),sc(e.sessionId,e.boardKey,l).then(d=>{if(d!==null){R(d,"refusal");return}t(l)}).catch(d=>{R(d instanceof j?d.message:String(d),"refusal")}).finally(()=>{o(!1)})}let s=rc[e.actionId],a=e.title??ti(e.sessionId,e.boardKey)??e.boardKey;return sn.default.createElement(sn.default.Fragment,null,sn.default.createElement("button",{type:"button",className:"tool-render-approval-btn tool-render-approval-approve",disabled:i,onClick:r},i?"Checking\u2026":s),n==="signoff"?sn.default.createElement(An,{open:!0,ticketId:e.boardKey,ticketTitle:a,agentId:e.sessionId,onClose:()=>{t(null)},onSignedOff:()=>{t(null)}}):null,n==="verify"?sn.default.createElement(an,{ticketId:e.boardKey,agentId:e.sessionId,onClose:()=>{t(null)}}):null)}function Ga(e){return sn.default.createElement("div",{className:"aidos-inline-approval"},sn.default.createElement(li,{ticketId:e.boardKey,agentId:e.sessionId}))}var g=ee(require("react"),1);var ye=ee(require("react"),1);function lc(e){let n=new Set;for(let t of e.split(`
`)){let i=t.trim();i!==""&&!n.has(i)&&n.add(i)}return[...n]}function dc(e,n){let t=[],i=new Set;for(let o of e)if(!(q(o)===n||o.state!=="in_progress"))for(let r of o.allowlist??[])i.has(r)||(i.add(r),t.push(r));return t}function ci(e){let[n,t]=ye.default.useState(e.currentAllowlist.join(`
`)),[i,o]=ye.default.useState([]),[r,s]=ye.default.useState(!1);if(ye.default.useEffect(function(){if(!e.open)return;let l=!1;return(async function(){try{let d=await O("workspaceTickets",{},e.agentId),c=Array.isArray(d)?d:d?.tickets??[],u=dc(c,e.ticketIdKey);l||o(u)}catch{}})(),function(){l=!0}},[e.open,e.agentId,e.ticketId]),!e.open)return null;async function a(){if(r)return;let l=lc(n);s(!0);try{let d=await O("userGrantAllowlist",{ticketId:e.ticketIdKey,paths:l},e.agentId),c=Array.isArray(d?.granted)?d.granted.length:l.length;R(c>0?"Allowlist granted \u2014 "+c+" path(s)":"Allowlist unchanged","success"),e.onClose(),e.onSaved()}catch(d){d instanceof j?R(d.message,"refusal"):R(String(d),"refusal")}finally{s(!1)}}return ye.default.createElement("div",{className:"aidos-modal-mask",onClick:()=>{r||e.onClose()}},ye.default.createElement("div",{className:"aidos-modal",onClick:l=>{l.stopPropagation()}},ye.default.createElement("div",{className:"aidos-modal-head"},ye.default.createElement("h3",{className:"aidos-modal-title"},"File allowlist"),ye.default.createElement("button",{className:"aidos-close-btn",onClick:()=>{r||e.onClose()},"aria-label":"Close"},"\xD7")),ye.default.createElement("div",{className:"aidos-modal-form"},ye.default.createElement("div",{className:"aidos-modal-row"},ye.default.createElement("label",null,"One path per line. Saving grants these paths on top of the current list \u2014 a write outside the granted set refuses while the ticket is in progress. To revoke a path, delete its grant row from the ticket's evidence."),ye.default.createElement("textarea",{className:"aidos-allowlist-input",value:n,disabled:r,rows:8,onChange:l=>{t(l.target.value)}})),i.length>0?ye.default.createElement("div",{className:"aidos-modal-row aidos-allowlist-preview"},ye.default.createElement("label",null,"Also allowed by other in-progress tickets"),ye.default.createElement("ul",null,i.map(l=>ye.default.createElement("li",{key:l},l)))):null,ye.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:r,onClick:()=>{a()}},r?"Saving\u2026":"Save"))))}var Le=ee(require("react"),1);var V=ee(require("react"),1);function Fn(e){return V.default.createElement("span",{className:"aidos-evidence-note-text"},e.text)}function Dt(e){let[n,t]=V.default.useState(!1);return V.default.createElement("details",{className:"aidos-evidence-raw-json",open:n,onToggle:i=>{t(i.currentTarget.open)}},V.default.createElement("summary",null,"raw payload"),V.default.createElement("pre",{className:"aidos-evidence-payload-json"},JSON.stringify(e.payload,null,2)))}function cc(e){return/\.(png|jpe?g|webp|gif|avif)$/i.test(e)}function Wa(e){let{kind:n}=e.row,t=e.row.payload??{},i=typeof t.note=="string"?t.note:null,o={...t};if(delete o.note,n==="builtin:file_allowlist"&&Array.isArray(t.paths))return V.default.createElement("div",{className:"aidos-evidence-fields"},V.default.createElement(Te,{label:"Paths"},V.default.createElement("ul",{className:"aidos-evidence-payload-list"},t.paths.map(a=>V.default.createElement("li",{key:a},a)))),i!==null?V.default.createElement(Te,{label:"Note"},V.default.createElement(Fn,{text:i})):null,V.default.createElement(Dt,{payload:t}));if(n==="builtin:imported_state"&&typeof t.claimed_state=="string")return V.default.createElement("div",{className:"aidos-evidence-fields"},V.default.createElement(Te,{label:"Claimed state"},V.default.createElement("span",{className:"aidos-evidence-note-text"},t.claimed_state)),typeof t.source=="string"?V.default.createElement(Te,{label:"Source"},t.source):null,i!==null?V.default.createElement(Te,{label:"Note"},V.default.createElement(Fn,{text:i})):null,V.default.createElement(Dt,{payload:t}));if(typeof t.imagePath=="string")return V.default.createElement("div",{className:"aidos-evidence-fields"},V.default.createElement(Te,{label:"Screenshot"},V.default.createElement("img",{className:"aidos-evidence-image",src:t.imagePath,alt:i??"evidence screenshot"}),V.default.createElement("span",{className:"aidos-evidence-image-path"},t.imagePath)),i!==null?V.default.createElement(Te,{label:"Note"},V.default.createElement(Fn,{text:i})):null,V.default.createElement(Dt,{payload:t}));if(typeof t.commit=="string")return V.default.createElement("div",{className:"aidos-evidence-fields"},V.default.createElement(Te,{label:"Commit"},V.default.createElement("code",null,String(t.commit).slice(0,12)),typeof t.subject=="string"?V.default.createElement(Fn,{text:" "+t.subject}):null),typeof t.author=="string"?V.default.createElement(Te,{label:"Committed by"},t.author):null,typeof t.branch=="string"?V.default.createElement(Te,{label:"Branch"},t.branch):null,i!==null?V.default.createElement(Te,{label:"Note"},V.default.createElement(Fn,{text:i})):null,V.default.createElement(Dt,{payload:t}));let r=Object.entries(o).filter(a=>typeof a[1]=="string"&&a[1].trim()!==""),s=Object.entries(o).filter(a=>typeof a[1]!="string");return V.default.createElement("div",{className:"aidos-evidence-fields"},r.map(([a,l])=>V.default.createElement(Te,{key:a,label:a},V.default.createElement(Fn,{text:l}))),s.map(([a,l])=>V.default.createElement(Te,{key:a,label:a},V.default.createElement("code",null,cc(String(l))?String(l):JSON.stringify(l)))),i!==null?V.default.createElement(Te,{label:"Note"},V.default.createElement(Fn,{text:i})):null,V.default.createElement(Dt,{payload:t}))}function Nn(e){let n=e.row;return Le.default.useEffect(function(){if(n===null)return;let t=i=>{i.key==="Escape"&&e.onClose()};return window.addEventListener("keydown",t),function(){window.removeEventListener("keydown",t)}},[n,e]),n===null?null:Le.default.createElement("div",{className:"aidos-modal-mask",onClick:e.onClose},Le.default.createElement("div",{className:"aidos-modal",onClick:t=>{t.stopPropagation()}},Le.default.createElement("div",{className:"aidos-modal-head"},Le.default.createElement("h3",{className:"aidos-modal-title"},Le.default.createElement("span",{className:"aidos-chip aidos-chip-kind",style:{"--chip-hue":Nt(n.kind)}},Le.default.createElement("span",{className:"aidos-chip-key"},at(n.kind)))," "+n.kind),Le.default.createElement("button",{className:"aidos-close-btn",onClick:e.onClose,"aria-label":"Close"},"\xD7")),Le.default.createElement("div",{className:"aidos-modal-form"},Le.default.createElement("div",{className:"aidos-evidence-fields"},Le.default.createElement(Te,{label:"Author"},n.author),Le.default.createElement(Te,{label:"At"},typeof n.at=="number"?new Date(n.at*1e3).toISOString():"unknown")),Le.default.createElement(Wa,{row:n}))))}var Ne=ee(require("react"),1);var _e=ee(require("react"),1);function uc(e){let n=e.payload??{};if(typeof n.note=="string"&&n.note.trim()!=="")return n.note.trim();if(Array.isArray(n.paths)){let t=n.paths.filter(i=>typeof i=="string");if(t.length>0)return t.length+" path(s)"}return typeof n.claimed_state=="string"?"claimed "+n.claimed_state:typeof n.commit=="string"?"commit "+n.commit.slice(0,12):typeof n.imagePath=="string"?"screenshot":typeof n.report=="string"?n.report.slice(0,60):null}function pc(e){if(typeof e!="number")return null;let n=Math.max(0,Math.floor(Date.now()/1e3-e));return n<60?"just now":n<3600?Math.floor(n/60)+"m ago":n<86400?Math.floor(n/3600)+"h ago":Math.floor(n/86400)+"d ago"}function Je(e){let n=e.row,t=uc(n),i=pc(n.at);return _e.default.createElement("li",{className:"aidos-evidence-strip"},_e.default.createElement("div",{className:"aidos-evidence-strip-main"},_e.default.createElement("span",{className:"aidos-chip aidos-chip-kind",style:{"--chip-hue":Nt(n.kind)},title:Jt(n.kind),"data-dsh-tip":""},_e.default.createElement("span",{className:"aidos-chip-key"},at(n.kind))),e.standing==="verified"||e.standing==="invalidated"?_e.default.createElement("span",{className:"aidos-review-standing aidos-review-standing-"+e.standing,title:e.standingReason??"","data-dsh-tip":"","aria-label":e.standing==="verified"?"This review ran through the configured reviewer chain":"This review did not run on the chain it declared"},e.standing==="verified"?"\u2713":"\u26A0"):null,_e.default.createElement("span",{className:"aidos-evidence-strip-body"},t!==null?_e.default.createElement("span",{className:"aidos-evidence-strip-excerpt"},t):_e.default.createElement("span",{className:"aidos-evidence-strip-kind-name"},n.kind),_e.default.createElement("span",{className:"aidos-evidence-strip-meta"},n.author,i!==null?" \xB7 "+i:"",e.criterionLabel!==void 0?" \xB7 criterion: "+e.criterionLabel:null)),_e.default.createElement("span",{className:"aidos-evidence-strip-actions"},e.onView!==void 0?_e.default.createElement("button",{className:"aidos-icon-btn",title:"View evidence","data-dsh-tip":"","aria-label":"View evidence",onClick:o=>{o.stopPropagation(),e.onView?.(n)}},_e.default.createElement(Rn,null)):null,e.onUnlink!==void 0?_e.default.createElement("button",{className:"aidos-evidence-unlink",title:"Unlink from criterion","data-dsh-tip":"","aria-label":"Unlink from criterion",disabled:e.deleting===!0,onClick:o=>{o.stopPropagation(),e.onUnlink?.()}},"\u2A02"):null,e.onDelete!==void 0?_e.default.createElement("button",{className:"aidos-evidence-delete",title:"Delete this evidence row","data-dsh-tip":"","aria-label":"Delete this evidence row",disabled:e.deleting===!0,onClick:o=>{o.stopPropagation(),e.onDelete?.(n)}},"\u2715"):null)))}function ui(e){let n=(e.payload??{}).criteria;if(typeof n!="string")return null;let t=n.trim();return t===""?null:t}function fc(e,n){return e.filter(t=>ui(t)===n)}function hc(e){return e.filter(n=>ui(n)===null)}function gc(e){e instanceof j?R(e.message,"refusal"):R(String(e),"refusal")}function pi(e){let[n,t]=Ne.default.useState(null),[i,o]=Ne.default.useState(null),[r,s]=Ne.default.useState({}),a=hc(e.evidence);async function l(d,c){if(n===null){t(d.at??0);try{await O("userLinkEvidence",{ticketId:e.ticketIdKey,at:d.at,rowKind:d.kind,criterion:c},e.agentId),R(c===null?"Evidence unlinked":"Evidence linked to criterion","success"),e.onChanged()}catch(u){gc(u)}finally{t(null)}}}return Ne.default.createElement("div",{className:"aidos-criterion-blocks"},i===null?null:Ne.default.createElement(Nn,{row:i,onClose:()=>{o(null)}}),e.criteria.map(d=>{let c=fc(e.evidence,d),u=a.filter(f=>!c.includes(f)),p=r[d]??"";return Ne.default.createElement("div",{className:"aidos-criterion-block",key:d},Ne.default.createElement("div",{className:"aidos-criterion-label"},d),c.length>0?Ne.default.createElement("ul",{className:"aidos-criterion-evidence"},c.map(f=>Ne.default.createElement(Je,{key:String(f.at)+":"+f.kind,row:f,onView:o,deleting:n===f.at,onUnlink:e.readOnly?void 0:()=>{l(f,null)}}))):Ne.default.createElement("p",{className:"aidos-detail-note"},"No evidence linked."),!e.readOnly&&u.length>0?Ne.default.createElement("div",{className:"aidos-criterion-linker"},Ne.default.createElement("select",{value:p,onChange:f=>{s({...r,[d]:f.target.value})},"aria-label":"Evidence to link to criterion "+d},Ne.default.createElement("option",{value:""},"Link an evidence row\u2026"),u.map(f=>Ne.default.createElement("option",{key:String(f.at)+":"+f.kind,value:String(f.at)+":"+f.kind},mc(f)))),Ne.default.createElement("button",{className:"aidos-btn",disabled:p===""||n!==null,onClick:()=>{let f=u.find(b=>String(b.at)+":"+b.kind===p);f&&l(f,d)}},"Add")):null)}))}function mc(e){let n=bc(e),t=e.kind.replace(/^builtin:/,"");return n!==null?t+" \u2014 "+n:t}function bc(e){let n=e.payload??{};if(typeof n.note=="string"&&n.note.trim()!==""){let t=n.note.trim();return t.length>48?t.slice(0,48)+"\u2026":t}return Array.isArray(n.paths)&&n.paths.length>0?n.paths.length+" path(s)":typeof n.claimed_state=="string"?n.claimed_state:typeof n.commit=="string"?n.commit.slice(0,12):typeof n.imagePath=="string"?"screenshot":null}function Io(){return{async:!1,breaks:!1,extensions:null,gfm:!0,hooks:null,pedantic:!1,renderer:null,silent:!1,tokenizer:null,walkTokens:null}}var Un=Io();function ts(e){Un=e}var Vn={exec:()=>null};function gt(e){let n=[];return t=>{let i=Math.max(0,Math.min(3,t-1)),o=n[i];return o||(o=e(i),n[i]=o),o}}function J(e,n=""){let t=typeof e=="string"?e:e.source,i={replace:(o,r)=>{let s=typeof r=="string"?r:r.source;return s=s.replace(Ce.caret,"$1"),t=t.replace(o,s),i},getRegex:()=>new RegExp(t,n)};return i}var wc=((e="")=>{try{return!!new RegExp("(?<=1)(?<!1)"+e)}catch{return!1}})(),Ce={codeRemoveIndent:/^(?: {1,4}| {0,3}\t)/gm,outputLinkReplace:/\\([\[\]])/g,indentCodeCompensation:/^(\s+)(?:```)/,beginningSpace:/^\s+/,endingHash:/#$/,startingSpaceChar:/^ /,endingSpaceChar:/ $/,nonSpaceChar:/[^ ]/,newLineCharGlobal:/\n/g,tabCharGlobal:/\t/g,multipleSpaceGlobal:/\s+/g,blankLine:/^[ \t]*$/,doubleBlankLine:/\n[ \t]*\n[ \t]*$/,blockquoteStart:/^ {0,3}>/,blockquoteSetextReplace:/\n {0,3}((?:=+|-+) *)(?=\n|$)/g,blockquoteSetextReplace2:/^ {0,3}>[ \t]?/gm,listReplaceNesting:/^ {1,4}(?=( {4})*[^ ])/g,listIsTask:/^\[[ xX]\] +\S/,listReplaceTask:/^\[[ xX]\] +/,listTaskCheckbox:/\[[ xX]\]/,anyLine:/\n.*\n/,hrefBrackets:/^<(.*)>$/,tableDelimiter:/[:|]/,tableAlignChars:/^\||\| *$/g,tableRowBlankLine:/\n[ \t]*$/,tableAlignRight:/^ *-+: *$/,tableAlignCenter:/^ *:-+: *$/,tableAlignLeft:/^ *:-+ *$/,startATag:/^<a /i,endATag:/^<\/a>/i,startPreScriptTag:/^<(pre|code|kbd|script)(\s|>)/i,endPreScriptTag:/^<\/(pre|code|kbd|script)(\s|>)/i,startAngleBracket:/^</,endAngleBracket:/>$/,pedanticHrefTitle:/^([^'"]*[^\s])\s+(['"])(.*)\2/,unicodeAlphaNumeric:/[\p{L}\p{N}]/u,escapeTest:/[&<>"']/,escapeReplace:/[&<>"']/g,escapeTestNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,escapeReplaceNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,caret:/(^|[^\[])\^/g,percentDecode:/%25/g,findPipe:/\|/g,splitPipe:/ \|/,slashPipe:/\\\|/g,carriageReturn:/\r\n|\r/g,spaceLine:/^ +$/gm,notSpaceStart:/^\S*/,endingNewline:/\n$/,listItemRegex:e=>new RegExp(`^( {0,3}${e})((?:[	 ][^\\n]*)?(?:\\n|$))`),nextBulletRegex:gt(e=>new RegExp(`^ {0,${e}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`)),hrRegex:gt(e=>new RegExp(`^ {0,${e}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`)),fencesBeginRegex:gt(e=>new RegExp(`^ {0,${e}}(?:\`\`\`|~~~)`)),headingBeginRegex:gt(e=>new RegExp(`^ {0,${e}}#`)),htmlBeginRegex:gt(e=>new RegExp(`^ {0,${e}}<(?:[a-z].*>|!--)`,"i")),blockquoteBeginRegex:gt(e=>new RegExp(`^ {0,${e}}>`))},vc=/^(?:[ \t]*(?:\n|$))+/,kc=/^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/,yc=/^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/,zt=/^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/,xc=/^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,Ao=/ {0,3}(?:[*+-]|\d{1,9}[.)])/,is=/^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/,os=J(is).replace(/bull/g,Ao).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}(?:\s|$)/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/\|table/g,"").getRegex(),Sc=J(is).replace(/bull/g,Ao).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}(?:\s|$)/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/table/g,/ {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex(),No=/^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table|[ \t]+\n)[^\n]+)*)/,Tc=/^[^\n]+/,Co=/(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/,Ec=J(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label",Co).replace("title",/(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex(),Rc=J(/^(bull)([ \t][^\n]*?)?(?:\n|$)/).replace(/bull/g,Ao).getRegex(),bi="address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul",_o=/<!--(?:-?>|[\s\S]*?(?:-->|$))/,Ic=J("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n*|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>[^\\n]*\\n*|$)|<![A-Z][\\s\\S]*?(?:>[^\\n]*\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>[^\\n]*\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))","i").replace("comment",_o).replace("tag",bi).replace("attribute",/ +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex(),rs=e=>J(No).replace("hr",zt).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("|table","").replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list",e).replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",bi).getRegex(),Ac=rs(/ {0,3}(?:[*+-]|1[.)])[ \t]+[^ \t\n]/),Nc=rs(/ {0,3}(?:[*+-]|\d{1,9}[.)])(?:[ \t]|\n|$)/),Cc=J(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph",Nc).getRegex(),Oo={blockquote:Cc,code:kc,def:Ec,fences:yc,heading:xc,hr:zt,html:Ic,lheading:os,list:Rc,newline:vc,paragraph:Ac,table:Vn,text:Tc},Qa=J("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr",zt).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("blockquote"," {0,3}>").replace("code","(?: {4}| {0,3}	)[^\\n]").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list"," {0,3}(?:[*+-]|1[.)])[ \\t]").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",bi).getRegex(),_c={...Oo,lheading:Sc,table:Qa,paragraph:J(No).replace("hr",zt).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("table",Qa).replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list"," {0,3}(?:[*+-]|1[.)])[ \\t]+[^ \\t\\n]").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",bi).getRegex()},Oc={...Oo,html:J(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment",_o).replace(/tag/g,"(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),def:/^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,heading:/^(#{1,6})(.*)(?:\n+|$)/,fences:Vn,lheading:/^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,paragraph:J(No).replace("hr",zt).replace("heading",` *#{1,6} *[^
]`).replace("lheading",os).replace("|table","").replace("blockquote"," {0,3}>").replace("|fences","").replace("|list","").replace("|html","").replace("|tag","").getRegex()},Pc=/^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,Mc=/^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,as=/^( {2,}|\\)\n(?!\s*$)/,Lc=/^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/,vn=/[\p{P}\p{S}]/u,mt=/[\s\p{P}\p{S}]/u,$t=/[^\s\p{P}\p{S}]/u,Dc=J(/^((?![*_])punctSpace)/,"u").replace(/punctSpace/g,mt).getRegex(),Kc=/[\p{Pi}\p{Ps}"']/u,ss=/(?!~)[\p{P}\p{S}]/u,Bc=/(?!~)[\s\p{P}\p{S}]/u,zc=/(?:[^\s\p{P}\p{S}]|~)/u,$c=J(/link|precode-code|html/,"g").replace("link",/\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-",wc?"(?<!`)()":"(^^|[^`])").replace("code",/(?<b>`+)[^`]+\k<b>(?!`)/).replace("html",/<(?! )[^<>]*?>/).getRegex(),ls=/^(?:\*+(?:((?!\*)punct)|([^\s*]))?)|^_+(?:((?!_)punct)|([^\s_]))?/,jc=J(ls,"u").replace(/punct/g,vn).getRegex(),Fc=J(ls,"u").replace(/punct/g,ss).getRegex(),Vc=/^(?:\*+(?:((?!\*)(?!openQuote)punct)|([^\s*]))?)|^_+(?:((?!_)(?!openQuote)punct)|([^\s_]))?/,qc=J(Vc,"u").replace(/openQuote/g,Kc).replace(/punct/g,vn).getRegex(),ds="^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)",Uc=J(ds,"gu").replace(/notPunctSpace/g,$t).replace(/punctSpace/g,mt).replace(/punct/g,vn).getRegex(),Hc=J(ds,"gu").replace(/notPunctSpace/g,zc).replace(/punctSpace/g,Bc).replace(/punct/g,ss).getRegex(),Gc="^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)[\\s](\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|(?:(?!\\*)punct|notPunctSpace)(\\*+)(?!\\*)(?=notPunctSpace)",Wc=J(Gc,"gu").replace(/notPunctSpace/g,$t).replace(/punctSpace/g,mt).replace(/punct/g,vn).getRegex(),Qc=J("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)","gu").replace(/notPunctSpace/g,$t).replace(/punctSpace/g,mt).replace(/punct/g,vn).getRegex(),Zc="^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)[\\s](_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)|(?:(?!_)punct|notPunctSpace)(_+)(?!_)(?=notPunctSpace)",Jc=J(Zc,"gu").replace(/notPunctSpace/g,$t).replace(/punctSpace/g,mt).replace(/punct/g,vn).getRegex(),Yc=J(/^~~?(?:((?!~)punct)|[^\s~])/,"u").replace(/punct/g,vn).getRegex(),Xc="^[^~]+(?=[^~])|(?!~)punct(~~?)(?=[\\s]|$)|notPunctSpace(~~?)(?!~)(?=punctSpace|$)|(?!~)punctSpace(~~?)(?=notPunctSpace)|[\\s](~~?)(?!~)(?=punct)|(?!~)punct(~~?)(?!~)(?=punct)|notPunctSpace(~~?)(?=notPunctSpace)",eu=J(Xc,"gu").replace(/notPunctSpace/g,$t).replace(/punctSpace/g,mt).replace(/punct/g,vn).getRegex(),nu=J(/\\(punct)/,"gu").replace(/punct/g,vn).getRegex(),tu=J(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme",/[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email",/[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex(),iu=J(_o).replace("(?:-->|$)","-->").getRegex(),ou=J("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment",iu).replace("attribute",/\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex(),hi=/(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\])|[^\[\]\\`])*?/,ru=J(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]+(?:\n[ \t]*)?|\n[ \t]*)(title))?\s*\)/).replace("label",hi).replace("href",/<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]+|(?=\))/).replace("title",/"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex(),cs=J(/^!?\[(label)\]\[(ref)\]/).replace("label",hi).replace("ref",Co).getRegex(),us=J(/^!?\[(ref)\](?:\[\])?/).replace("ref",Co).getRegex(),au=J("reflink|nolink(?!\\()","g").replace("reflink",cs).replace("nolink",us).getRegex(),Za=/[hH][tT][tT][pP][sS]?|[fF][tT][pP]/,Po={_backpedal:Vn,anyPunctuation:nu,autolink:tu,blockSkip:$c,br:as,code:Mc,del:Vn,delLDelim:Vn,delRDelim:Vn,emStrongLDelim:jc,emStrongRDelimAst:Uc,emStrongRDelimUnd:Qc,escape:Pc,link:ru,nolink:us,punctuation:Dc,reflink:cs,reflinkSearch:au,tag:ou,text:Lc,url:Vn},su={...Po,emStrongLDelim:qc,emStrongRDelimAst:Wc,emStrongRDelimUnd:Jc,link:J(/^!?\[(label)\]\((.*?)\)/).replace("label",hi).getRegex(),reflink:J(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label",hi).getRegex()},To={...Po,emStrongRDelimAst:Hc,emStrongLDelim:Fc,delLDelim:Yc,delRDelim:eu,url:J(/^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("protocol",Za).replace("email",/[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(),_backpedal:/(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,del:/^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/,text:J(/^(`+|~+|[^`~])(?:(?=[`~])|(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/).replace("protocol",Za).getRegex()},lu={...To,br:J(as).replace("{2,}","*").getRegex(),text:J(To.text).replace("\\b_","\\b_| {2,}\\n").replace(/\{2,\}/g,"*").getRegex()},fi={normal:Oo,gfm:_c,pedantic:Oc},Kt={normal:Po,gfm:To,breaks:lu,pedantic:su},du={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"},Ja=e=>du[e];function ln(e,n){if(n){if(Ce.escapeTest.test(e))return e.replace(Ce.escapeReplace,Ja)}else if(Ce.escapeTestNoEncode.test(e))return e.replace(Ce.escapeReplaceNoEncode,Ja);return e}function Ya(e){try{e=encodeURI(e).replace(Ce.percentDecode,"%")}catch{return null}return e}function Xa(e,n){let t=e.replace(Ce.findPipe,(r,s,a)=>{let l=!1,d=s;for(;--d>=0&&a[d]==="\\";)l=!l;return l?"|":" |"}),i=t.split(Ce.splitPipe),o=0;if(i[0].trim()||i.shift(),i.length>0&&!i.at(-1)?.trim()&&i.pop(),n)if(i.length>n)i.splice(n);else for(;i.length<n;)i.push("");for(;o<i.length;o++)i[o]=i[o].trim().replace(Ce.slashPipe,"|");return i}function Cn(e,n,t){let i=e.length;if(i===0)return"";let o=0;for(;o<i;){let r=e.charAt(i-o-1);if(r===n&&!t)o++;else if(r!==n&&t)o++;else break}return e.slice(0,i-o)}function es(e){let n=e.split(`
`),t=n.length-1;for(;t>=0&&Ce.blankLine.test(n[t]);)t--;return n.length-t<=2?e:n.slice(0,t+1).join(`
`)}function cu(e,n){if(e.indexOf(n[1])===-1)return-1;let t=0;for(let i=0;i<e.length;i++)if(e[i]==="\\")i++;else if(e[i]===n[0])t++;else if(e[i]===n[1]&&(t--,t<0))return i;return t>0?-2:-1}function uu(e,n=0){let t=n,i="";for(let o of e)if(o==="	"){let r=4-t%4;i+=" ".repeat(r),t+=r}else i+=o,t++;return i}function ns(e,n,t,i,o){let r=n.href,s=n.title||null,a=e[1].replace(o.other.outputLinkReplace,"$1"),l=e[0].charAt(0)==="!";i.state.inLink=!0;let d=i.state.linkEmitted,c=i.state.inRawBlock;i.state.linkEmitted=!1;let u=i.inlineTokens(a),p=i.state.linkEmitted;if(i.state.linkEmitted=d,i.state.inLink=!1,!l){if(p){i.state.inRawBlock=c;return}i.state.linkEmitted=!0}return{type:l?"image":"link",raw:t,href:r,title:s,text:a,tokens:u}}function pu(e,n,t){let i=e.match(t.other.indentCodeCompensation);if(i===null)return n;let o=i[1];return n.split(`
`).map(r=>{let s=r.match(t.other.beginningSpace);if(s===null)return r;let[a]=s;return a.length>=o.length?r.slice(o.length):r}).join(`
`)}var gi=class{options;rules;lexer;constructor(e){this.options=e||Un}space(e){let n=this.rules.block.newline.exec(e);if(n&&n[0].length>0)return{type:"space",raw:n[0]}}code(e){let n=this.rules.block.code.exec(e);if(n){let t=this.options.pedantic?n[0]:es(n[0]),i=t.replace(this.rules.other.codeRemoveIndent,"");return{type:"code",raw:t,codeBlockStyle:"indented",text:i}}}fences(e){let n=this.rules.block.fences.exec(e);if(n){let t=n[0],i=pu(t,n[3]||"",this.rules);return{type:"code",raw:t,lang:n[2]?n[2].trim().replace(this.rules.inline.anyPunctuation,"$1"):n[2],text:i}}}heading(e){let n=this.rules.block.heading.exec(e);if(n){let t=n[2].trim();if(this.rules.other.endingHash.test(t)){let i=Cn(t,"#");(this.options.pedantic||!i||this.rules.other.endingSpaceChar.test(i))&&(t=i.trim())}return{type:"heading",raw:Cn(n[0],`
`),depth:n[1].length,text:t,tokens:this.lexer.inline(t)}}}hr(e){let n=this.rules.block.hr.exec(e);if(n)return{type:"hr",raw:Cn(n[0],`
`)}}blockquote(e){let n=this.rules.block.blockquote.exec(e);if(n){let t=Cn(n[0],`
`).split(`
`),i="",o="",r=[];for(;t.length>0;){let s=!1,a=[],l;for(l=0;l<t.length;l++)if(this.rules.other.blockquoteStart.test(t[l]))a.push(t[l]),s=!0;else if(!s)a.push(t[l]);else break;t=t.slice(l);let d=a.join(`
`),c=d.replace(this.rules.other.blockquoteSetextReplace,`
    $1`).replace(this.rules.other.blockquoteSetextReplace2,"");i=i?`${i}
${d}`:d,o=o?`${o}
${c}`:c;let u=this.lexer.state.top;if(this.lexer.state.top=!0,this.lexer.blockTokens(c,r,!0),this.lexer.state.top=u,t.length===0)break;let p=r.at(-1);if(p?.type==="code")break;if(p?.type==="blockquote"){let f=p,b=t.join(`
`),w=f.raw+`
`+b.replace(this.rules.other.blockquoteSetextReplace2,""),x=this.blockquote(w);r[r.length-1]=x,i=`${i}
${b}`,o=o.substring(0,o.length-f.text.length)+x.text;break}else if(p?.type==="list"){let f=p,b=f.raw+`
`+t.join(`
`),w=this.list(b);r[r.length-1]=w,i=i.substring(0,i.length-p.raw.length)+w.raw,o=o.substring(0,o.length-f.raw.length)+w.raw,t=b.substring(r.at(-1).raw.length).split(`
`);continue}}return{type:"blockquote",raw:i,tokens:r,text:o}}}list(e){let n=this.rules.block.list.exec(e);if(n){let t=n[1].trim(),i=t.length>1,o={type:"list",raw:"",ordered:i,start:i?+t.slice(0,-1):"",loose:!1,items:[]};t=i?`\\d{1,9}\\${t.slice(-1)}`:`\\${t}`,this.options.pedantic&&(t=i?t:"[*+-]");let r=this.rules.other.listItemRegex(t),s=!1;for(;e;){let l=!1,d="",c="";if(!(n=r.exec(e))||this.rules.block.hr.test(e))break;d=n[0],e=e.substring(d.length);let u=uu(n[2].split(`
`,1)[0],n[1].length),p=e.split(`
`,1)[0],f=!u.trim(),b=0;if(this.options.pedantic?(b=2,c=u.trimStart()):f?b=n[1].length+1:(b=u.search(this.rules.other.nonSpaceChar),b=b>4?1:b,c=u.slice(b),b+=n[1].length),f&&this.rules.other.blankLine.test(p)&&(d+=p+`
`,e=e.substring(p.length+1),l=!0),!l){let w=this.rules.other.nextBulletRegex(b),x=this.rules.other.hrRegex(b),m=this.rules.other.fencesBeginRegex(b),A=this.rules.other.headingBeginRegex(b),_=this.rules.other.htmlBeginRegex(b),W=this.rules.other.blockquoteBeginRegex(b);for(;e;){let E=e.split(`
`,1)[0],Y;if(p=E,this.options.pedantic?(p=p.replace(this.rules.other.listReplaceNesting,"  "),Y=p):Y=p.replace(this.rules.other.tabCharGlobal,"    "),m.test(p)||A.test(p)||_.test(p)||W.test(p)||w.test(p)||x.test(p))break;if(Y.search(this.rules.other.nonSpaceChar)>=b||!p.trim())c+=`
`+Y.slice(b);else{if(f||u.replace(this.rules.other.tabCharGlobal,"    ").search(this.rules.other.nonSpaceChar)>=4||m.test(u)||A.test(u)||x.test(u))break;c+=`
`+p}f=!p.trim(),d+=E+`
`,e=e.substring(E.length+1),u=Y.slice(b)}}o.loose||(s?o.loose=!0:this.rules.other.doubleBlankLine.test(d)&&(s=!0)),o.items.push({type:"list_item",raw:d,task:!!this.options.gfm&&this.rules.other.listIsTask.test(c),loose:!1,text:c,tokens:[]}),o.raw+=d}let a=o.items.at(-1);if(a)a.raw=a.raw.trimEnd(),a.text=a.text.trimEnd();else return;o.raw=o.raw.trimEnd();for(let l of o.items)if(this.lexer.state.top=!1,l.tokens=this.lexer.blockTokens(l.text,[]),!o.loose){let d=l.tokens.filter(u=>u.type==="space"),c=d.length>0&&d.some(u=>this.rules.other.anyLine.test(u.raw));o.loose=c}for(let l of o.items){let d=l.tokens[0];if(l.task&&(d?.type==="text"||d?.type==="paragraph")){l.text=l.text.replace(this.rules.other.listReplaceTask,""),d.raw=d.raw.replace(this.rules.other.listReplaceTask,""),d.text=d.text.replace(this.rules.other.listReplaceTask,"");for(let u=this.lexer.inlineQueue.length-1;u>=0;u--)if(this.rules.other.listIsTask.test(this.lexer.inlineQueue[u].src)){this.lexer.inlineQueue[u].src=this.lexer.inlineQueue[u].src.replace(this.rules.other.listReplaceTask,"");break}let c=this.rules.other.listTaskCheckbox.exec(l.raw);if(c){let u={type:"checkbox",raw:c[0]+" ",checked:c[0]!=="[ ]"};l.checked=u.checked,o.loose?l.tokens[0]&&["paragraph","text"].includes(l.tokens[0].type)&&"tokens"in l.tokens[0]&&l.tokens[0].tokens?(l.tokens[0].raw=u.raw+l.tokens[0].raw,l.tokens[0].text=u.raw+l.tokens[0].text,l.tokens[0].tokens.unshift(u)):l.tokens.unshift({type:"paragraph",raw:u.raw,text:u.raw,tokens:[u]}):l.tokens.unshift(u)}}else l.task&&(l.task=!1)}if(o.loose)for(let l of o.items){l.loose=!0;for(let d of l.tokens)d.type==="text"&&(d.type="paragraph")}return o}}html(e){let n=this.rules.block.html.exec(e);if(n){let t=es(n[0]);return{type:"html",block:!0,raw:t,pre:n[1]==="pre"||n[1]==="script"||n[1]==="style",text:t}}}def(e){let n=this.rules.block.def.exec(e);if(n){let t=n[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal," "),i=n[2]?n[2].replace(this.rules.other.hrefBrackets,"$1").replace(this.rules.inline.anyPunctuation,"$1"):"",o=n[3]?n[3].substring(1,n[3].length-1).replace(this.rules.inline.anyPunctuation,"$1"):n[3];return{type:"def",tag:t,raw:Cn(n[0],`
`),href:i,title:o}}}table(e){let n=this.rules.block.table.exec(e);if(!n||!this.rules.other.tableDelimiter.test(n[2]))return;let t=Xa(n[1]),i=n[2].replace(this.rules.other.tableAlignChars,"").split("|"),o=n[3]?.trim()?n[3].replace(this.rules.other.tableRowBlankLine,"").split(`
`):[],r={type:"table",raw:Cn(n[0],`
`),header:[],align:[],rows:[]};if(t.length===i.length){for(let s of i)this.rules.other.tableAlignRight.test(s)?r.align.push("right"):this.rules.other.tableAlignCenter.test(s)?r.align.push("center"):this.rules.other.tableAlignLeft.test(s)?r.align.push("left"):r.align.push(null);for(let s=0;s<t.length;s++)r.header.push({text:t[s],tokens:this.lexer.inline(t[s]),header:!0,align:r.align[s]});for(let s of o)r.rows.push(Xa(s,r.header.length).map((a,l)=>({text:a,tokens:this.lexer.inline(a),header:!1,align:r.align[l]})));return r}}lheading(e){let n=this.rules.block.lheading.exec(e);if(n){let t=n[1].trim();return{type:"heading",raw:Cn(n[0],`
`),depth:n[2].charAt(0)==="="?1:2,text:t,tokens:this.lexer.inline(t)}}}paragraph(e){let n=this.rules.block.paragraph.exec(e);if(n){let t=n[1].charAt(n[1].length-1)===`
`?n[1].slice(0,-1):n[1];return{type:"paragraph",raw:n[0],text:t,tokens:this.lexer.inline(t)}}}text(e){let n=this.rules.block.text.exec(e);if(n)return{type:"text",raw:n[0],text:n[0],tokens:this.lexer.inline(n[0])}}escape(e){let n=this.rules.inline.escape.exec(e);if(n)return{type:"escape",raw:n[0],text:n[1]}}tag(e){let n=this.rules.inline.tag.exec(e);if(n)return!this.lexer.state.inLink&&this.rules.other.startATag.test(n[0])?this.lexer.state.inLink=!0:this.lexer.state.inLink&&this.rules.other.endATag.test(n[0])&&(this.lexer.state.inLink=!1),!this.lexer.state.inRawBlock&&this.rules.other.startPreScriptTag.test(n[0])?this.lexer.state.inRawBlock=!0:this.lexer.state.inRawBlock&&this.rules.other.endPreScriptTag.test(n[0])&&(this.lexer.state.inRawBlock=!1),{type:"html",raw:n[0],inLink:this.lexer.state.inLink,inRawBlock:this.lexer.state.inRawBlock,block:!1,text:n[0]}}link(e){let n=this.rules.inline.link.exec(e);if(n){let t=n[2].trim();if(!this.options.pedantic&&this.rules.other.startAngleBracket.test(t)){if(!this.rules.other.endAngleBracket.test(t))return;let r=Cn(t.slice(0,-1),"\\");if((t.length-r.length)%2===0)return}else{let r=cu(n[2],"()");if(r===-2)return;if(r>-1){let s=(n[0].indexOf("!")===0?5:4)+n[1].length+r;n[2]=n[2].substring(0,r),n[0]=n[0].substring(0,s).trim(),n[3]=""}}let i=n[2],o="";if(this.options.pedantic){let r=this.rules.other.pedanticHrefTitle.exec(i);r&&(i=r[1],o=r[3])}else o=n[3]?n[3].slice(1,-1):"";return i=i.trim(),this.rules.other.startAngleBracket.test(i)&&(this.options.pedantic&&!this.rules.other.endAngleBracket.test(t)?i=i.slice(1):i=i.slice(1,-1)),ns(n,{href:i&&i.replace(this.rules.inline.anyPunctuation,"$1"),title:o&&o.replace(this.rules.inline.anyPunctuation,"$1")},n[0],this.lexer,this.rules)}}reflink(e,n){let t;if((t=this.rules.inline.reflink.exec(e))||(t=this.rules.inline.nolink.exec(e))){let i=(t[2]||t[1]).replace(this.rules.other.multipleSpaceGlobal," "),o=n[i.toLowerCase()];if(!o){let r=t[0].charAt(0);return{type:"text",raw:r,text:r}}return ns(t,o,t[0],this.lexer,this.rules)}}emStrong(e,n,t=""){let i=this.rules.inline.emStrongLDelim.exec(e);if(!(!i||!i[1]&&!i[2]&&!i[3]&&!i[4]||i[4]&&t.match(this.rules.other.unicodeAlphaNumeric))&&(!(i[1]||i[3])||!t||this.rules.inline.punctuation.exec(t))){let o=[...i[0]].length-1,r,s,a=o,l=0,d=i[0][0],c=t===d,u=d==="*"?this.rules.inline.emStrongRDelimAst:this.rules.inline.emStrongRDelimUnd;for(u.lastIndex=0,n=n.slice(-1*e.length+o);(i=u.exec(n))!==null;){if(r=i[1]||i[2]||i[3]||i[4]||i[5]||i[6],!r)continue;if(s=[...r].length,i[3]||i[4]){a+=s;continue}else if(i[5]||i[6]){if(o%3&&!((o+s)%3)){l+=s;continue}if(c)break}if(a-=s,a>0)continue;s=Math.min(s,s+a+l);let p=[...i[0]][0].length,f=e.slice(0,o+i.index+p+s);if(Math.min(o,s)%2){let w=f.slice(1,-1);return{type:"em",raw:f,text:w,tokens:this.lexer.inlineTokens(w)}}let b=f.slice(2,-2);return{type:"strong",raw:f,text:b,tokens:this.lexer.inlineTokens(b)}}}}codespan(e){let n=this.rules.inline.code.exec(e);if(n){let t=n[2].replace(this.rules.other.newLineCharGlobal," "),i=this.rules.other.nonSpaceChar.test(t),o=this.rules.other.startingSpaceChar.test(t)&&this.rules.other.endingSpaceChar.test(t);return i&&o&&(t=t.substring(1,t.length-1)),{type:"codespan",raw:n[0],text:t}}}br(e){let n=this.rules.inline.br.exec(e);if(n)return{type:"br",raw:n[0]}}del(e,n,t=""){let i=this.rules.inline.delLDelim.exec(e);if(i&&(!i[1]||!t||this.rules.inline.punctuation.exec(t))){let o=[...i[0]].length-1,r,s,a=o,l=this.rules.inline.delRDelim;for(l.lastIndex=0,n=n.slice(-1*e.length+o);(i=l.exec(n))!==null;){if(r=i[1]||i[2]||i[3]||i[4]||i[5]||i[6],!r||(s=[...r].length,s!==o))continue;if(i[3]||i[4]){a+=s;continue}if(a-=s,a>0)continue;s=Math.min(s,s+a);let d=[...i[0]][0].length,c=e.slice(0,o+i.index+d+s),u=c.slice(o,-o);return{type:"del",raw:c,text:u,tokens:this.lexer.inlineTokens(u)}}}}autolink(e){let n=this.rules.inline.autolink.exec(e);if(n){let t,i;return n[2]==="@"?(t=n[1],i="mailto:"+t):(t=n[1],i=t),{type:"link",raw:n[0],text:t,href:i,tokens:[{type:"text",raw:t,text:t}]}}}url(e){let n;if(n=this.rules.inline.url.exec(e)){let t,i;if(n[2]==="@")t=n[0],i="mailto:"+t;else{let o;do o=n[0],n[0]=this.rules.inline._backpedal.exec(n[0])?.[0]??"";while(o!==n[0]);t=n[0],n[1]==="www."?i="http://"+n[0]:i=n[0]}return{type:"link",raw:n[0],text:t,href:i,tokens:[{type:"text",raw:t,text:t}]}}}inlineText(e){let n=this.rules.inline.text.exec(e);if(n){let t=this.lexer.state.inRawBlock;return{type:"text",raw:n[0],text:n[0],escaped:t}}}},Ye=class Eo{tokens;options;state;inlineQueue;tokenizer;constructor(n){this.tokens=[],this.tokens.links=Object.create(null),this.options=n||Un,this.options.tokenizer=this.options.tokenizer||new gi,this.tokenizer=this.options.tokenizer,this.tokenizer.options=this.options,this.tokenizer.lexer=this,this.inlineQueue=[],this.state={inLink:!1,inRawBlock:!1,linkEmitted:!1,top:!0};let t={other:Ce,block:fi.normal,inline:Kt.normal};this.options.pedantic?(t.block=fi.pedantic,t.inline=Kt.pedantic):this.options.gfm&&(t.block=fi.gfm,this.options.breaks?t.inline=Kt.breaks:t.inline=Kt.gfm),this.tokenizer.rules=t}static get rules(){return{block:fi,inline:Kt}}static lex(n,t){return new Eo(t).lex(n)}static lexInline(n,t){return new Eo(t).inlineTokens(n)}lex(n){n=n.replace(Ce.carriageReturn,`
`),this.blockTokens(n,this.tokens);for(let t=0;t<this.inlineQueue.length;t++){let i=this.inlineQueue[t];this.inlineTokens(i.src,i.tokens)}return this.inlineQueue=[],this.tokens}blockTokens(n,t=[],i=!1){this.tokenizer.lexer=this,this.options.pedantic&&(n=n.replace(Ce.tabCharGlobal,"    ").replace(Ce.spaceLine,""));let o=1/0;for(;n;){if(n.length<o)o=n.length;else{this.infiniteLoopError(n.charCodeAt(0));break}let r;if(this.options.extensions?.block?.some(a=>(r=a.call({lexer:this},n,t))?(n=n.substring(r.raw.length),t.push(r),!0):!1))continue;if(r=this.tokenizer.space(n)){n=n.substring(r.raw.length);let a=t.at(-1);r.raw.length===1&&a!==void 0?a.raw+=`
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
`+r.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=a.text):t.push(r);continue}if(n){this.infiniteLoopError(n.charCodeAt(0));break}}return this.state.top=!0,t}inline(n,t=[]){return this.inlineQueue.push({src:n,tokens:t}),t}linkInText(n){if(!n.includes("["))return!1;let t=this.tokenizer.rules.inline.link;for(let i of n.matchAll(this.tokenizer.rules.inline.blockSkip))if(t.test(i[0])&&n.charAt(i.index-1)!=="!")return!0;for(let i of n.matchAll(this.tokenizer.rules.inline.reflinkSearch)){let o=i[0],r=o.lastIndexOf("[");if(!(o.charAt(0)==="!"||!Object.hasOwn(this.tokens.links,o.slice(r+1,-1)))&&!(r>1&&this.linkInText(o.slice(1,r-1))))return!0}return!1}inlineTokens(n,t=[]){this.tokenizer.lexer=this;let i=n;if(this.tokens.links&&n.includes("[")){let a=this.tokenizer.rules.inline.reflinkSearch,l=d=>{let c=d.lastIndexOf("[");if(!Object.hasOwn(this.tokens.links,d.slice(c+1,-1)))return d;if(c>1&&d.charAt(0)!=="!"){let u=d.slice(1,c-1);if(this.linkInText(u))return"["+u.replace(a,l)+"]["+"a".repeat(d.length-c-2)+"]"}return"["+"a".repeat(d.length-2)+"]"};i=i.replace(a,l)}i=i.replace(this.tokenizer.rules.inline.anyPunctuation,a=>"+".repeat(a.length)),i=i.replace(this.tokenizer.rules.inline.blockSkip,(a,l,d)=>{let c=d?d.length:0;return a.slice(0,c)+"["+"a".repeat(a.length-c-2)+"]"}),i=this.options.hooks?.emStrongMask?.call({lexer:this},i)??i;let o=!1,r="",s=1/0;for(;n;){if(n.length<s)s=n.length;else{this.infiniteLoopError(n.charCodeAt(0));break}o||(r=""),o=!1;let a;if(this.options.extensions?.inline?.some(d=>(a=d.call({lexer:this},n,t))?(n=n.substring(a.raw.length),t.push(a),!0):!1))continue;if(a=this.tokenizer.escape(n)){n=n.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.tag(n)){n=n.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.link(n)){n=n.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.reflink(n,this.tokens.links)){n=n.substring(a.raw.length);let d=t.at(-1);a.type==="text"&&d?.type==="text"?(d.raw+=a.raw,d.text+=a.text):t.push(a);continue}if(a=this.tokenizer.emStrong(n,i,r)){n=n.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.codespan(n)){n=n.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.br(n)){n=n.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.del(n,i,r)){n=n.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.autolink(n)){n=n.substring(a.raw.length),t.push(a);continue}if(!this.state.inLink&&(a=this.tokenizer.url(n))){n=n.substring(a.raw.length),t.push(a);continue}let l=n;if(this.options.extensions?.startInline){let d=1/0,c=n.slice(1),u;this.options.extensions.startInline.forEach(p=>{u=p.call({lexer:this},c),typeof u=="number"&&u>=0&&(d=Math.min(d,u))}),d<1/0&&d>=0&&(l=n.substring(0,d+1))}if(a=this.tokenizer.inlineText(l)){n=n.substring(a.raw.length),a.raw.slice(-1)!=="_"&&(r=a.raw.slice(-1)),o=!0;let d=t.at(-1);d?.type==="text"?(d.raw+=a.raw,d.text+=a.text):t.push(a);continue}if(n){this.infiniteLoopError(n.charCodeAt(0));break}}return t}infiniteLoopError(n){let t="Infinite loop on byte: "+n;if(this.options.silent)console.error(t);else throw new Error(t)}},mi=class{options;parser;constructor(e){this.options=e||Un}space(e){return""}code({text:e,lang:n,escaped:t}){let i=(n||"").match(Ce.notSpaceStart)?.[0],o=e.replace(Ce.endingNewline,"")+`
`;return i?'<pre><code class="language-'+ln(i)+'">'+(t?o:ln(o,!0))+`</code></pre>
`:"<pre><code>"+(t?o:ln(o,!0))+`</code></pre>
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
`}strong({tokens:e}){return`<strong>${this.parser.parseInline(e)}</strong>`}em({tokens:e}){return`<em>${this.parser.parseInline(e)}</em>`}codespan({text:e}){return`<code>${ln(e,!0)}</code>`}br(e){return"<br>"}del({tokens:e}){return`<del>${this.parser.parseInline(e)}</del>`}link({href:e,title:n,tokens:t}){let i=this.parser.parseInline(t),o=Ya(e);if(o===null)return i;e=o;let r='<a href="'+e+'"';return n&&(r+=' title="'+ln(n)+'"'),r+=">"+i+"</a>",r}image({href:e,title:n,text:t,tokens:i}){i&&(t=this.parser.parseInline(i,this.parser.textRenderer));let o=Ya(e);if(o===null)return ln(t);e=o;let r=`<img src="${e}" alt="${ln(t)}"`;return n&&(r+=` title="${ln(n)}"`),r+=">",r}text(e){return"tokens"in e&&e.tokens?this.parser.parseInline(e.tokens):"escaped"in e&&e.escaped?e.text:ln(e.text)}},Mo=class{strong({text:e}){return e}em({text:e}){return e}codespan({text:e}){return e}del({text:e}){return e}html({text:e}){return e}text({text:e}){return e}link({text:e}){return""+e}image({text:e}){return""+e}br(){return""}checkbox({raw:e}){return e}},Xe=class Ro{options;renderer;textRenderer;constructor(n){this.options=n||Un,this.options.renderer=this.options.renderer||new mi,this.renderer=this.options.renderer,this.renderer.options=this.options,this.renderer.parser=this,this.textRenderer=new Mo}static parse(n,t){return new Ro(t).parse(n)}static parseInline(n,t){return new Ro(t).parseInline(n)}parse(n){this.renderer.parser=this;let t="";for(let i=0;i<n.length;i++){let o=n[i];if(this.options.extensions?.renderers?.[o.type]){let s=o,a=this.options.extensions.renderers[s.type].call({parser:this},s);if(a!==!1||!["space","hr","heading","code","table","blockquote","list","checkbox","html","def","paragraph","text"].includes(s.type)){t+=a||"";continue}}let r=o;switch(r.type){case"space":{t+=this.renderer.space(r);break}case"hr":{t+=this.renderer.hr(r);break}case"heading":{t+=this.renderer.heading(r);break}case"code":{t+=this.renderer.code(r);break}case"table":{t+=this.renderer.table(r);break}case"blockquote":{t+=this.renderer.blockquote(r);break}case"list":{t+=this.renderer.list(r);break}case"checkbox":{t+=this.renderer.checkbox(r);break}case"html":{t+=this.renderer.html(r);break}case"def":{t+=this.renderer.def(r);break}case"paragraph":{t+=this.renderer.paragraph(r);break}case"text":{t+=this.renderer.text(r);break}default:{let s='Token with "'+r.type+'" type was not found.';if(this.options.silent)return console.error(s),"";throw new Error(s)}}}return t}parseInline(n,t=this.renderer){this.renderer.parser=this;let i="";for(let o=0;o<n.length;o++){let r=n[o];if(this.options.extensions?.renderers?.[r.type]){let a=this.options.extensions.renderers[r.type].call({parser:this},r);if(a!==!1||!["escape","html","link","image","checkbox","strong","em","codespan","br","del","text"].includes(r.type)){i+=a||"";continue}}let s=r;switch(s.type){case"escape":{i+=t.text(s);break}case"html":{i+=t.html(s);break}case"link":{i+=t.link(s);break}case"image":{i+=t.image(s);break}case"checkbox":{i+=t.checkbox(s);break}case"strong":{i+=t.strong(s);break}case"em":{i+=t.em(s);break}case"codespan":{i+=t.codespan(s);break}case"br":{i+=t.br(s);break}case"del":{i+=t.del(s);break}case"text":{i+=t.text(s);break}default:{let a='Token with "'+s.type+'" type was not found.';if(this.options.silent)return console.error(a),"";throw new Error(a)}}}return i}},Bt=class{options;block;constructor(e){this.options=e||Un}static passThroughHooks=new Set(["preprocess","postprocess","processAllTokens","emStrongMask"]);static passThroughHooksRespectAsync=new Set(["preprocess","postprocess","processAllTokens"]);preprocess(e){return e}postprocess(e){return e}processAllTokens(e){return e}emStrongMask(e){return e}provideLexer(e=this.block){return e?Ye.lex:Ye.lexInline}provideParser(e=this.block){return e?Xe.parse:Xe.parseInline}},fu=class{defaults=Io();options=this.setOptions;parse=this.parseMarkdown(!0);parseInline=this.parseMarkdown(!1);Parser=Xe;Renderer=mi;TextRenderer=Mo;Lexer=Ye;Tokenizer=gi;Hooks=Bt;constructor(...e){this.use(...e)}walkTokens(e,n){let t=[];for(let i of e)switch(t=t.concat(n.call(this,i)),i.type){case"table":{let o=i;for(let r of o.header)t=t.concat(this.walkTokens(r.tokens,n));for(let r of o.rows)for(let s of r)t=t.concat(this.walkTokens(s.tokens,n));break}case"list":{let o=i;t=t.concat(this.walkTokens(o.items,n));break}default:{let o=i;this.defaults.extensions?.childTokens?.[o.type]?this.defaults.extensions.childTokens[o.type].forEach(r=>{let s=o[r].flat(1/0);t=t.concat(this.walkTokens(s,n))}):o.tokens&&(t=t.concat(this.walkTokens(o.tokens,n)))}}return t}use(...e){let n=this.defaults.extensions||{renderers:{},childTokens:{}};return e.forEach(t=>{let i={...t};if(i.async=this.defaults.async||i.async||!1,t.extensions&&(t.extensions.forEach(o=>{if(!o.name)throw new Error("extension name required");if("renderer"in o){let r=n.renderers[o.name];r?n.renderers[o.name]=function(...s){let a=o.renderer.apply(this,s);return a===!1&&(a=r.apply(this,s)),a}:n.renderers[o.name]=o.renderer}if("tokenizer"in o){if(!o.level||o.level!=="block"&&o.level!=="inline")throw new Error("extension level must be 'block' or 'inline'");let r=n[o.level];r?r.unshift(o.tokenizer):n[o.level]=[o.tokenizer],o.start&&(o.level==="block"?n.startBlock?n.startBlock.push(o.start):n.startBlock=[o.start]:o.level==="inline"&&(n.startInline?n.startInline.push(o.start):n.startInline=[o.start]))}"childTokens"in o&&o.childTokens&&(n.childTokens[o.name]=o.childTokens)}),i.extensions=n),t.renderer){let o=this.defaults.renderer||new mi(this.defaults);for(let r in t.renderer){if(!(r in o))throw new Error(`renderer '${r}' does not exist`);if(["options","parser"].includes(r))continue;let s=r,a=t.renderer[s],l=o[s];o[s]=(...d)=>{let c=a.apply(o,d);return c===!1&&(c=l.apply(o,d)),c||""}}i.renderer=o}if(t.tokenizer){let o=this.defaults.tokenizer||new gi(this.defaults);for(let r in t.tokenizer){if(!(r in o))throw new Error(`tokenizer '${r}' does not exist`);if(["options","rules","lexer"].includes(r))continue;let s=r,a=t.tokenizer[s],l=o[s];o[s]=(...d)=>{let c=a.apply(o,d);return c===!1&&(c=l.apply(o,d)),c}}i.tokenizer=o}if(t.hooks){let o=this.defaults.hooks||new Bt;for(let r in t.hooks){if(!(r in o))throw new Error(`hook '${r}' does not exist`);if(["options","block"].includes(r))continue;let s=r,a=t.hooks[s],l=o[s];Bt.passThroughHooks.has(r)?o[s]=d=>{if(this.defaults.async&&Bt.passThroughHooksRespectAsync.has(r))return(async()=>{let u=await a.call(o,d);return l.call(o,u)})();let c=a.call(o,d);return l.call(o,c)}:o[s]=(...d)=>{if(this.defaults.async)return(async()=>{let u=await a.apply(o,d);return u===!1&&(u=await l.apply(o,d)),u})();let c=a.apply(o,d);return c===!1&&(c=l.apply(o,d)),c}}i.hooks=o}if(t.walkTokens){let o=this.defaults.walkTokens,r=t.walkTokens;i.walkTokens=function(s){let a=[];return a.push(r.call(this,s)),o&&(a=a.concat(o.call(this,s))),a}}this.defaults={...this.defaults,...i}}),this}setOptions(e){return this.defaults={...this.defaults,...e},this}lexer(e,n){return Ye.lex(e,n??this.defaults)}parser(e,n){return Xe.parse(e,n??this.defaults)}parseMarkdown(e){return(n,t)=>{let i={...t},o={...this.defaults,...i},r=this.onError(!!o.silent,!!o.async);if(this.defaults.async===!0&&i.async===!1)return r(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));if(typeof n>"u"||n===null)return r(new Error("marked(): input parameter is undefined or null"));if(typeof n!="string")return r(new Error("marked(): input parameter is of type "+Object.prototype.toString.call(n)+", string expected"));if(o.hooks&&(o.hooks.options=o,o.hooks.block=e),o.async)return(async()=>{let s=o.hooks?await o.hooks.preprocess(n):n,a=await(o.hooks?await o.hooks.provideLexer(e):e?Ye.lex:Ye.lexInline)(s,o),l=o.hooks?await o.hooks.processAllTokens(a):a;o.walkTokens&&await Promise.all(this.walkTokens(l,o.walkTokens));let d=await(o.hooks?await o.hooks.provideParser(e):e?Xe.parse:Xe.parseInline)(l,o);return o.hooks?await o.hooks.postprocess(d):d})().catch(r);try{o.hooks&&(n=o.hooks.preprocess(n));let s=(o.hooks?o.hooks.provideLexer(e):e?Ye.lex:Ye.lexInline)(n,o);o.hooks&&(s=o.hooks.processAllTokens(s)),o.walkTokens&&this.walkTokens(s,o.walkTokens);let a=(o.hooks?o.hooks.provideParser(e):e?Xe.parse:Xe.parseInline)(s,o);return o.hooks&&(a=o.hooks.postprocess(a)),a}catch(s){return r(s)}}}onError(e,n){return t=>{if(t.message+=`
Please report this to https://github.com/markedjs/marked.`,e){let i="<p>An error occurred:</p><pre>"+ln(t.message+"",!0)+"</pre>";return n?Promise.resolve(i):i}if(n)return Promise.reject(t);throw t}}},qn=new fu;function le(e,n){return qn.parse(e,n)}le.options=le.setOptions=function(e){return qn.setOptions(e),le.defaults=qn.defaults,ts(le.defaults),le};le.getDefaults=Io;le.defaults=Un;function hu(...e){return qn.use(...e),le.defaults=qn.defaults,ts(le.defaults),le}le.use=hu;le.walkTokens=function(e,n){return qn.walkTokens(e,n)};le.parseInline=qn.parseInline;le.Parser=Xe;le.parser=Xe.parse;le.Renderer=mi;le.TextRenderer=Mo;le.Lexer=Ye;le.lexer=Ye.lex;le.Tokenizer=gi;le.Hooks=Bt;le.parse=le;var Xg=le.options,em=le.setOptions,nm=le.walkTokens,tm=le.parseInline;var im=Xe.parse,om=Ye.lex;var ps="[^>]*?(?:refChip|ref-chip|data-ref-chip)[^>]*?",gu=new RegExp("<span\\b"+ps+">([\\s\\S]*?)</span>","g"),mu=new RegExp("<span\\b"+ps+"/>","g"),bu=/<[A-Za-z][^<>]*ref[_-]?chip/i;function fs(e){let n=e.replace(gu,(i,o)=>o).replace(mu,""),t=bu.exec(n);if(t!==null){let i=Math.max(0,t.index-40);throw new Error("#182: unrecognised harness ref-chip variant in text headed for an aidos renderer -- refusing to pass it through (a silent pass re-creates the escaped-markup bug per variant). Teach stripHarnessChrome the new shape. Near: "+JSON.stringify(n.slice(i,t.index+120)))}return n}var wu={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};function vu(e){return e.replace(/[&<>"']/g,n=>wu[n])}function ku(e){let n=e.replace(/&#(x?)([0-9a-f]+);?/gi,(i,o,r)=>String.fromCharCode(parseInt(r,o===""?10:16))).replace(/[\u0000-\u0020]/g,"").toLowerCase(),t=/^([a-z][a-z0-9+.-]*):/.exec(n);return t===null?!0:t[1]==="http"||t[1]==="https"||t[1]==="mailto"}function yu(e){return e.replace(/(\s(?:href|src)=")([^"]*)(")/gi,(n,t,i,o)=>ku(i)?n:t+"#"+o)}function jt(e){if(e==="")return"";let n=le.parse(vu(fs(e)),{async:!1});return yu(String(n))}var De=ee(require("react"),1);var xu=["description","criteria"];function hs(e){let[n,t]=De.default.useState(!1),[i,o]=De.default.useState(String(e.value)),[r,s]=De.default.useState(!1);async function a(){if(!r){s(!0);try{let c=e.field,u=i;if((c==="phase"||c==="order")&&!/^\d+$/.test(u.trim())){R("phase and order must be integers \u2265 0","refusal"),s(!1);return}let p=c==="phase"||c==="order"?Number(u):u;await O("userSetTicket",{ticketId:e.ticketId,[c]:p},e.agentId),R("Field saved","success"),t(!1),e.onSaved()}catch(c){c instanceof j?R(c.message,"refusal"):R(String(c),"refusal"),o(String(e.value))}finally{s(!1)}}}function l(){o(String(e.value)),t(!0)}function d(){o(String(e.value)),t(!1)}if(n){let c=xu.includes(e.field);return De.default.createElement("div",{className:"aidos-field-editor"},c?De.default.createElement("textarea",{className:"aidos-field-editor-input",value:i,disabled:r,onChange:u=>{o(u.target.value)}}):De.default.createElement("input",{className:"aidos-field-editor-input",type:"text",value:i,disabled:r,onChange:u=>{o(u.target.value)}}),De.default.createElement("span",null,De.default.createElement("button",{className:"aidos-btn",disabled:r,onClick:a},"Save")," ",De.default.createElement("button",{className:"aidos-btn",disabled:r,onClick:d},"Cancel")))}return De.default.createElement("div",{className:"aidos-field-editor"},De.default.createElement("span",null,e.children!==void 0?e.children:String(e.value)," ",De.default.createElement("button",{className:"aidos-icon-btn",title:"Edit","data-dsh-tip":"","aria-label":"Edit "+e.field,onClick:l},De.default.createElement(Ze,null))))}var Re=ee(require("react"),1);var Su=[];function gs(e){let n=e.comments??Su,[t,i]=Re.default.useState(""),[o,r]=Re.default.useState(!1);Re.default.useEffect(function(){X("comments section mounted")},[]);let s=[...n].sort((d,c)=>c.at-d.at);async function a(){if(!o&&t.trim()!==""){r(!0);try{await O("userAddComment",{ticketId:e.ticketId,text:t},e.agentId),i(""),R("Comment added","success")}catch(d){d instanceof j?R(d.message,"refusal"):R(String(d),"refusal")}finally{r(!1)}}}let l=s.map((d,c)=>{let u=new Date(d.at*1e3).toLocaleString();return Re.default.createElement("div",{className:"aidos-comment",key:c},Re.default.createElement("div",null,Re.default.createElement("span",{className:"aidos-evidence-author"},d.author)),Re.default.createElement("p",{className:"aidos-detail-body"},d.text),Re.default.createElement("p",{className:"aidos-detail-note"},u))});return Re.default.createElement("details",{className:"aidos-panel",open:n.length!==1},Re.default.createElement("summary",{className:"aidos-panel-head"},Re.default.createElement("h4",{className:"aidos-panel-title"},"Comments")),Re.default.createElement("div",{className:"aidos-panel-body"},l.length===0?Re.default.createElement("p",{className:"aidos-detail-note"},"No comments yet."):l,Re.default.createElement("textarea",{className:"aidos-comment-textarea",value:t,placeholder:"Add a comment. Ctrl+Enter sends.",onChange:d=>{i(d.target.value)},onKeyDown:d=>{d.ctrlKey&&d.key==="Enter"&&(d.preventDefault(),a())}}),Re.default.createElement("div",{className:"aidos-form-actions"},Re.default.createElement("button",{className:"aidos-comment-send",disabled:o||t.trim()==="",onClick:a},"Send"))))}var ve=ee(require("react"),1);var Tu=1024,wi=new Map;function Ue(e){let n=String(e.ticket.id),t=wi.get(n);if(t!==void 0&&Eu(t.props,e))return t.element;let i=Ru(e);return wi.size>=Tu&&wi.clear(),wi.set(n,{props:e,element:i}),i}function Eu(e,n){let t=e.ticket,i=n.ticket;return t.id===i.id&&t.title===i.title&&t.state===i.state&&t.slug===i.slug&&t.workspaceKey===i.workspaceKey&&(t.gatePresent??null)===(i.gatePresent??null)&&(t.gateTotal??null)===(i.gateTotal??null)&&(t.criteria??null)===(i.criteria??null)&&(e.showState??null)===(n.showState??null)&&e.meta===n.meta&&e.actions===n.actions&&e.actionIcon===n.actionIcon&&(e.actionHint??null)===(n.actionHint??null)&&(e.expanded??!1)===(n.expanded??!1)&&(e.working??!1)===(n.working??!1)&&(e.highlighted??!1)===(n.highlighted??!1)&&(e.awaitingApproval??!1)===(n.awaitingApproval??!1)}function Ru(e){let n=e.ticket,t=me(n),i="aidos-ticket-strip"+(e.highlighted===!0?" aidos-ticket-strip-highlighted":"")+(e.working===!0?" aidos-ticket-strip-working":""),o=n.gatePresent!==void 0||n.gateTotal!==void 0;return ve.default.createElement("li",{className:i},ve.default.createElement("div",{className:"aidos-ticket-strip-main"},ve.default.createElement("span",{className:"aidos-ticket-strip-idcol"},ve.default.createElement("span",{className:"aidos-chip aidos-chip-id",style:{"--chip-hue":rn(t)},title:t,"data-dsh-tip":""},hn(n)),e.showState===!1?null:ve.default.createElement("span",{className:Tn(n.state),title:Me(n.state),"data-dsh-tip":""},Me(n.state))),ve.default.createElement("span",{className:"aidos-ticket-strip-body"},ve.default.createElement("span",{className:"aidos-ticket-strip-title",title:n.title,"data-dsh-tip":""},n.title),e.meta!==void 0?ve.default.createElement("span",{className:"aidos-ticket-strip-meta"},e.meta):null),ve.default.createElement("span",{className:"aidos-ticket-strip-chips"},e.awaitingApproval===!0?ve.default.createElement("span",{className:"aidos-chip aidos-chip-awaiting-approval",title:"This ticket has a request waiting for your approval","data-dsh-tip":""},"Needs approval"):null,o?(()=>{let r=En(n.gatePresent??null,n.gateTotal??null,on(n)),s=`Gate: ${r} of the required evidence is attached`,a=Zt(n.gatePresent??null,n.gateTotal??null,on(n));return ve.default.createElement("span",{className:"aidos-chip aidos-chip-metric aidos-chip-gate"+(a?" aidos-chip-fail":""),"aria-label":s,title:s,"data-dsh-tip":""},ve.default.createElement("span",{className:"aidos-chip-key"},ve.default.createElement(ct,null)),ve.default.createElement("span",{className:"aidos-chip-value"},r))})():null),ve.default.createElement("span",{className:"aidos-ticket-strip-actions"},e.onOpen!==void 0?ve.default.createElement("button",{className:"aidos-icon-btn",title:"Open "+t,"data-dsh-tip":"","aria-label":"Open "+t,disabled:e.working===!0,onClick:r=>{r.stopPropagation(),e.onOpen?.()}},ve.default.createElement(Rn,null)):null,e.actionIcon!==void 0?ve.default.createElement("button",{className:"aidos-strip-action-toggle"+(e.expanded===!0?" is-open":""),title:e.actionHint??"Show actions","data-dsh-tip":"","aria-label":e.actionHint??"Show actions","aria-expanded":e.expanded===!0,disabled:e.working===!0,onClick:r=>{r.stopPropagation(),e.onToggleActions?.()}},e.actionIcon):null)),e.expanded===!0&&e.actions!==void 0?ve.default.createElement("div",{className:"aidos-ticket-strip-actionrow"},e.actions):null)}var Hn=ee(require("react"),1);function vi(e){let[n,t]=Hn.default.useState(""),[i,o]=Hn.default.useState(!1);if(Hn.default.useEffect(function(){e.open&&X("send back modal opened")},[e.open]),!e.open)return null;async function r(){if(!i){o(!0);try{await O("userAddComment",{ticketId:e.ticketId,text:n.trim()},e.agentId),await O("userMoveTicket",{ticketId:e.ticketId,to:"in_progress"},e.agentId),R("Sent back","success"),e.onClose(),e.onSentBack()}catch(s){s instanceof j?R(s.message,"refusal"):R(String(s),"refusal")}finally{o(!1)}}}return Hn.default.createElement(be,{title:"Send back",working:i,onClose:e.onClose,onConfirm:r,confirmLabel:"Send back"},Hn.default.createElement("p",{className:"aidos-modal-body"},"Send the ticket back to in progress. The reason attaches as a comment."),Hn.default.createElement(je,{label:"Reason",value:n,working:i,onChange:t}))}var Z=ee(require("react"),1);function bt(e){let[n,t]=Z.default.useState(1),[i,o]=Z.default.useState(""),[r,s]=Z.default.useState(!1),[a,l]=Z.default.useState(null),[d,c]=Z.default.useState(!1),[u,p]=Z.default.useState(null);if(Z.default.useEffect(function(){e.open&&X("mark done modal opened")},[e.open]),!e.open)return null;let b=!e.evidence.some(m=>m.kind==="builtin:user_verified")&&!d,w=e.ticket.criteria.split(`
`).map(m=>m.trim()).filter(m=>m.length>0);async function x(){if(!r){s(!0);try{i.trim()!==""&&await O("userAddComment",{ticketId:e.ticketId,text:i},e.agentId),await O("userMoveTicket",{ticketId:e.ticketId,to:"done"},e.agentId),R("Marked done","success"),e.onClose(),e.onMarkedDone()}catch(m){m instanceof j?R(m.message,"refusal"):R(String(m),"refusal")}finally{s(!1)}}}return b&&u===null?Z.default.createElement(be,{title:"Mark done",working:r,onClose:e.onClose},Z.default.createElement("div",{className:"aidos-modal-form"},Z.default.createElement("p",{className:"aidos-modal-body"},"This ticket has no verification row yet. Marking it done needs your hands-on check first \u2014 verify it, and the row you attach is what this close stands on."),Z.default.createElement("div",{className:"aidos-form-actions"},Z.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:r,onClick:()=>{p("verify")}},"Verify now"),Z.default.createElement("button",{className:"aidos-btn",disabled:r,title:"Close with no verification row behind it","data-dsh-tip":"",onClick:()=>{p("force")}},"Force without verification")))):b&&u==="verify"?Z.default.createElement(an,{ticketId:e.ticketId,agentId:e.agentId,onAttached:()=>{c(!0),p(null)},onClose:()=>{p(null)}}):b&&u==="force"?Z.default.createElement(be,{title:"Mark done",working:r,onClose:e.onClose},Z.default.createElement("div",{className:"aidos-modal-form"},Z.default.createElement("p",{className:"aidos-modal-body"},"Forcing closes this ticket with NO verification row behind it. The board will show it done with nothing verified \u2014 choose this only when the check genuinely does not apply."),Z.default.createElement(je,{label:"Final comment (optional)",value:i,working:r,onChange:o}),Z.default.createElement("div",{className:"aidos-form-actions"},Z.default.createElement("button",{className:"aidos-btn",disabled:r,onClick:()=>{p(null)}},"Back"),Z.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:r,onClick:x},r?"Working\u2026":"Force mark done")))):Z.default.createElement(be,{title:"Mark done",working:r,onClose:e.onClose},a===null?null:Z.default.createElement(Nn,{row:a,onClose:()=>{l(null)}}),n===1?Z.default.createElement("div",{className:"aidos-modal-form"},Z.default.createElement("p",{className:"aidos-modal-body"},"The ticket criteria, with their evidence:"),w.length===0?Z.default.createElement("p",{className:"aidos-detail-note"},"No criteria on this ticket."):Z.default.createElement(pi,{criteria:w,evidence:e.evidence,ticketIdKey:String(e.ticketId),agentId:e.agentId,onChanged:()=>{}}),Z.default.createElement("div",{className:"aidos-form-actions"},Z.default.createElement("button",{className:"aidos-btn aidos-btn-primary",onClick:()=>{t(2)}},"Continue"))):Z.default.createElement("div",{className:"aidos-modal-form"},Z.default.createElement("p",{className:"aidos-modal-body"},"The evidence on this ticket:"),e.evidence.length===0?Z.default.createElement("p",{className:"aidos-detail-note"},"No evidence rows yet."):Z.default.createElement("ul",{className:"aidos-evidence-list"},e.evidence.map((m,A)=>Z.default.createElement(Je,{key:String(m.at??A)+":"+m.kind,row:m,onView:l,criterionLabel:typeof m.payload.criteria=="string"&&m.payload.criteria.trim()!==""?m.payload.criteria:void 0}))),Z.default.createElement(je,{label:"Final comment (optional)",value:i,working:r,onChange:o}),Z.default.createElement("div",{className:"aidos-form-actions"},Z.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:r,onClick:x},r?"Working\u2026":"Confirm"))))}var ne=ee(require("react"),1);function Iu(e){return new Date(e*1e3).toLocaleString()}function ms(e){let[n,t]=ne.default.useState(null),[i,o]=ne.default.useState(null),[r,s]=ne.default.useState(null),[a,l]=ne.default.useState(null),d=ne.default.useCallback(function(){o(null),O("retiredTickets",{},e.sessionId).then(u=>{let p=u.tickets??[];t(p)}).catch(u=>{o(u instanceof Error?u.message:String(u))})},[e.sessionId]);ne.default.useEffect(function(){X("retired panel opened"),d()},[d]);async function c(u){let p=q(u);if(r===null){s(p);try{await O("userUnretireTicket",{ticketId:p},e.sessionId),R("Un-retired \u2014 the ticket is back on the board","success"),d()}catch(f){f instanceof j?R(f.message,"refusal"):R(String(f),"refusal")}finally{s(null)}}}return i!==null?ne.default.createElement("div",{className:"aidos-retired-panel"},ne.default.createElement("p",{className:"aidos-retired-error"},"The retired list could not be read: ",i),ne.default.createElement("button",{className:"aidos-btn",onClick:d},"Retry")):n===null?ne.default.createElement("div",{className:"aidos-retired-panel",role:"status"},ne.default.createElement("span",{className:"aidos-merge-spinner","aria-hidden":"true"}),ne.default.createElement("span",{className:"aidos-retired-empty"},"Loading retired tickets\u2026")):n.length===0?ne.default.createElement("div",{className:"aidos-retired-panel"},ne.default.createElement("p",{className:"aidos-retired-empty"},"Nothing is retired. Retired tickets are hidden from the board, the queue and the agent's reads \u2014 they appear here until un-retired.")):ne.default.createElement("ul",{className:"aidos-retired-panel"},n.map(u=>{let p=q(u),f=u.retirement,b=f.reason??"(no reason given)",w=f.supersededByTickets,x=f.chainTerminals.filter(m=>!f.supersededBy.includes(m));return ne.default.createElement(Ue,{key:p,ticket:u,working:r===p,expanded:a===p,onToggleActions:()=>{l(a===p?null:p)},actionIcon:ne.default.createElement(ua,null),actionHint:"Un-retire this ticket",actions:ne.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:r===p,title:"Puts the ticket back on the board exactly as it was","data-dsh-tip":"",onClick:()=>{c(u)}},"Un-retire"),onOpen:e.onOpen===void 0?void 0:()=>e.onOpen?.(p),meta:ne.default.createElement(ne.default.Fragment,null,ne.default.createElement("span",{title:b,"data-dsh-tip":""},b),ne.default.createElement("span",null," \u2014 by ",f.author," \xB7 ",Iu(f.at)),w.length>0?ne.default.createElement("span",{className:"aidos-retired-supersede"},w.map(m=>m.known?`#${m.id} ${m.title}`:m.ref).join(", ")):null,x.length>0?ne.default.createElement("span",{className:"aidos-retired-supersede"},"chain ends at ",x.join(", ")):null,f.chainCycle?ne.default.createElement("span",{className:"aidos-retired-supersede"},"supersede cycle cut here"):null)})}))}function bs(e){let[n,t]=ne.default.useState(!1),[i,o]=ne.default.useState(""),[r,s]=ne.default.useState("");if(ne.default.useEffect(function(){e.open&&X("retire dialog opened")},[e.open]),!e.open)return null;async function a(){if(n)return;t(!0);let l=ht(r);try{await O("userRetireTicket",{ticketId:e.ticketId,...i.trim()===""?{}:{reason:i.trim()},...l.length>0?{supersededBy:l}:{}},e.agentId),R("Retired \u2014 hidden from the board until un-retired","success"),e.onClose(),e.onRetired()}catch(d){d instanceof j?R(d.message,"refusal"):R(String(d),"refusal")}finally{t(!1)}}return ne.default.createElement(be,{title:"Retire ticket",working:n,onClose:e.onClose,onConfirm:a,confirmLabel:"Retire"},ne.default.createElement("p",{className:"aidos-modal-body"},`Retiring "${e.ticketTitle}" hides it from the board grid, the filter counts, the tab badge, the human queue, the plan render and the agent's board reads. Nothing is deleted: the Retired panel lists it, and un-retiring restores it exactly as it was.`),ne.default.createElement(je,{label:"Reason (optional \u2014 the panel shows it)",value:i,working:n,onChange:o}),ne.default.createElement(mn,{label:"Superseded by (one ticket reference per line, optional) \u2014 where the work went, e.g. workspace-key:12",value:r,working:n,onChange:s}))}var Au=800;function wt(e){e instanceof j?R(e.message,"refusal"):R(String(e),"refusal")}async function Lo(e,n){await O("userMoveTicket",{ticketId:n,to:"awaiting_verification"},e),R("Submitted for review","success")}function Nu(e){let[n,t]=g.default.useState(!1),[i,o]=g.default.useState(""),[r,s]=g.default.useState(!1),[a,l]=g.default.useState(!1),d=e.ticket.description,c=d.trim()==="",u=d.length>Au,p=u&&!a,f=c?"":jt(d);async function b(){if(!r){s(!0);try{await O("userSetTicket",{ticketId:e.ticketIdKey,description:i},e.agentId),R("Description saved","success"),t(!1),e.onSaved()}catch(m){wt(m)}finally{s(!1)}}}function w(){o(d),t(!1)}let x;return n?x=g.default.createElement(g.default.Fragment,null,g.default.createElement("textarea",{value:i,disabled:r,onChange:m=>{o(m.target.value)}}),g.default.createElement("div",{className:"aidos-form-actions"},g.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:r,onClick:()=>{b()}},"Save"),g.default.createElement("button",{className:"aidos-btn",disabled:r,onClick:w},"Cancel"))):c?x=g.default.createElement("p",{className:"aidos-detail-note"},"No description."):x=g.default.createElement(g.default.Fragment,null,g.default.createElement("div",{className:"aidos-md"+(p?" aidos-md-clipped":""),dangerouslySetInnerHTML:{__html:f}}),u?g.default.createElement("button",{className:"aidos-md-more",onClick:()=>{l(!a)}},a?"Show less":"Show more"):null),g.default.createElement("details",{className:"aidos-panel",open:!0},g.default.createElement("summary",{className:"aidos-panel-head"},g.default.createElement("span",{className:"aidos-panel-title"},"Description"),g.default.createElement("button",{className:"aidos-icon-btn",title:"Edit","data-dsh-tip":"","aria-label":"Edit description",onClick:m=>{m.preventDefault(),m.stopPropagation(),o(d),t(!0)}},g.default.createElement(Ze,null))),g.default.createElement("div",{className:"aidos-panel-body"},x))}function Cu(e){let[n,t]=g.default.useState(e.line);return g.default.createElement("span",{className:"aidos-criterion-row"},g.default.createElement("input",{type:"text",value:n,disabled:e.saving,onChange:i=>{t(i.target.value)},onKeyDown:i=>{i.key==="Enter"&&(i.preventDefault(),e.onSave(n))}}),g.default.createElement("span",{className:"aidos-criterion-actions"},g.default.createElement("button",{className:"aidos-btn",disabled:e.saving,onClick:()=>{e.onSave(n)}},"Save"),g.default.createElement("button",{className:"aidos-btn",disabled:e.saving,onClick:e.onCancel},"Cancel")))}function _u(e){let[n,t]=g.default.useState(null),[i,o]=g.default.useState(!1),[r,s]=g.default.useState(""),a=Xi(e.ticket.criteria),l=yr(e.ticket.criteria,e.evidence),d=new Set(l),c=a.length-l.length;async function u(w){if(i)return!1;o(!0);try{return await O("userSetTicket",{ticketId:e.ticketIdKey,criteria:w.join(`
`)},e.agentId),R("Criteria saved","success"),t(null),e.onSaved(),!0}catch(x){return wt(x),!1}finally{o(!1)}}function p(w,x){let m=a.slice();m[w]=x,u(m)}function f(w){let x=a.slice();x.splice(w,1),u(x)}async function b(){let w=r.trim();if(w==="")return;await u(a.concat([w]))&&s("")}return g.default.createElement("details",{className:"aidos-panel"},g.default.createElement("summary",{className:"aidos-panel-head"},g.default.createElement("span",{className:"aidos-panel-title"},"Criteria "+c+"/"+a.length)),g.default.createElement("div",{className:"aidos-panel-body"},a.length===0?g.default.createElement("p",{className:"aidos-detail-note"},"No criteria yet \u2014 add the first one below."):null,g.default.createElement("ul",{className:"aidos-criteria"},a.map((w,x)=>g.default.createElement("li",{key:x+":"+w,className:d.has(w)?"aidos-criterion aidos-criterion-uncovered":"aidos-criterion"},n===x?g.default.createElement(Cu,{line:w,saving:i,onSave:m=>{p(x,m.trim())},onCancel:()=>{t(null)}}):g.default.createElement("span",{className:"aidos-criterion-row"},d.has(w)?g.default.createElement("span",{className:"aidos-criterion-warn",title:"No evidence covers this criterion yet","data-dsh-tip":"","aria-label":"Uncovered criterion"},g.default.createElement(pa,null)):null,g.default.createElement("span",{className:"aidos-criterion-text"},w),g.default.createElement("span",{className:"aidos-criterion-actions"},g.default.createElement("button",{className:"aidos-icon-btn",title:"Edit","data-dsh-tip":"","aria-label":"Edit criterion "+(x+1),onClick:()=>{t(x)}},g.default.createElement(Ze,null)),g.default.createElement("button",{className:"aidos-icon-btn",title:"Delete","data-dsh-tip":"","aria-label":"Delete criterion "+(x+1),disabled:i,onClick:()=>{f(x)}},g.default.createElement(ca,null)))),n!==x?g.default.createElement("ul",{className:"aidos-criterion-linked"},e.evidence.filter(m=>ui(m)===w).map(m=>g.default.createElement("li",{className:"aidos-criterion-linked-row",key:String(m.at)+":"+m.kind},g.default.createElement(Je,{row:m,onView:e.onViewEvidence,deleting:e.deletingAt===m.at})))):null)),g.default.createElement("li",{className:"aidos-criteria-add"},g.default.createElement("input",{type:"text",value:r,disabled:i,placeholder:"Add a criterion",onChange:w=>{s(w.target.value)},onKeyDown:w=>{w.key==="Enter"&&(w.preventDefault(),b())}}),g.default.createElement("button",{className:"aidos-btn",disabled:i||r.trim()==="",onClick:()=>{b()}},"Add")))))}function ki(e){return e.workspaceKey+":"+e.ticketId}function Ou(e){let n=e.depRef,t=n.includes(":")?n:(e.workspaceKey??"")+":"+n,i=e.ticketsByKey?.get(t)??e.ticketsByKey?.get(n),o=i===void 0||e.onJump===void 0?void 0:()=>{e.onJump?.(q(i))};return i===void 0?g.default.createElement("li",{className:"aidos-ticket-strip"},g.default.createElement("div",{className:"aidos-ticket-strip-main"},g.default.createElement("span",{className:"aidos-chip aidos-chip-dep",title:n,"data-dsh-tip":""},Kn(n)),g.default.createElement("span",{className:"aidos-ticket-strip-body"},g.default.createElement("span",{className:"aidos-ticket-strip-title aidos-dep-card-unknown"},"not on this board"),g.default.createElement("span",{className:"aidos-ticket-strip-meta"},n)))):g.default.createElement(Ue,{ticket:i,meta:"depends on "+Kn(n),onOpen:o})}function Pu(e){let[n,t]=g.default.useState(""),[i,o]=g.default.useState(null),[r,s]=g.default.useState(!1),[a,l]=g.default.useState(null),d=e.dependsOn??[];async function c(){if(!r){if(n.trim()===""){o([]);return}s(!0);try{let p=await O("searchTickets",{query:n},e.agentId),f=Array.isArray(p)?p:[];o(f)}catch(p){wt(p),o(null)}finally{s(!1)}}}async function u(p){if(a===null){if(d.includes(p)){R("Already a dependency","info");return}l(p);try{await O("userSetTicket",{ticketId:e.ticketId,dependsOn:[...new Set([...d,p])]},e.agentId),R("Dependency added","success"),e.onSaved()}catch(f){wt(f)}finally{l(null)}}}return g.default.createElement("details",{className:"aidos-panel"},g.default.createElement("summary",{className:"aidos-panel-head"},g.default.createElement("span",{className:"aidos-panel-title"},"Dependencies")),g.default.createElement("div",{className:"aidos-panel-body"},d.length===0?g.default.createElement("p",{className:"aidos-detail-note"},"No dependencies."):g.default.createElement("ul",{className:"aidos-ticket-strips"},d.map(p=>g.default.createElement(Ou,{key:p,depRef:p,agentId:e.agentId,ticketsByKey:e.ticketsByKey,onJump:e.onJump,workspaceKey:e.workspaceKey}))),g.default.createElement("div",{className:"aidos-dep-search"},g.default.createElement("input",{className:"aidos-dep-search-input",value:n,placeholder:"Search tickets",onChange:p=>{t(p.target.value)},onKeyDown:p=>{p.key==="Enter"&&(p.preventDefault(),c())}}),g.default.createElement("button",{className:"aidos-btn",disabled:r,onClick:()=>{c()}},"Search")),i!==null?g.default.createElement("div",{className:"aidos-dep-results"},i.length===0?g.default.createElement("p",{className:"aidos-detail-note"},"No matches."):i.map(p=>g.default.createElement("button",{key:ki(p),className:"aidos-dep-result",disabled:a!==null,onClick:()=>{u(ki(p))},title:ki(p),"data-dsh-tip":""},g.default.createElement("span",{className:"aidos-suggestion-title"},p.title),g.default.createElement("span",{className:"aidos-chip aidos-chip-id"},Kn(ki(p)))))):null))}function Mu(e){let[n,t]=g.default.useState({});return g.default.useEffect(function(){let i=!0;return O("reviewStandings",{ticketId:e.ticketIdKey},e.agentId).then(o=>{if(!i)return;let r=o?.rows,s={};for(let a of Array.isArray(r)?r:[])s[String(a.at)+":"+a.kind]={standing:a.standing,reason:a.reason};t(s)}).catch(()=>{i&&t({})}),()=>{i=!1}},[e.ticketIdKey,e.agentId,e.evidence.length]),g.default.createElement("details",{className:"aidos-panel",open:!e.evidenceCollapsed,onToggle:i=>{i.target.open===e.evidenceCollapsed&&e.onToggleEvidence()}},g.default.createElement("summary",{className:"aidos-panel-head"},g.default.createElement("span",{className:"aidos-panel-title"},"Evidence")),g.default.createElement("div",{className:"aidos-panel-body"},e.evidence.length===0?g.default.createElement("p",{className:"aidos-detail-note"},"No evidence rows yet."):g.default.createElement("ul",{className:"aidos-evidence-list"},e.evidence.map((i,o)=>g.default.createElement(Je,{key:i.at??o,row:i,onView:e.onViewEvidence,onDelete:e.onDelete,deleting:e.deletingAt!==null,criterionLabel:typeof i.payload.criteria=="string"?i.payload.criteria:void 0,standing:n[String(i.at)+":"+i.kind]?.standing,standingReason:n[String(i.at)+":"+i.kind]?.reason}))),e.criteria.length>0?g.default.createElement("details",{className:"aidos-panel aidos-panel-nested"},g.default.createElement("summary",{className:"aidos-panel-head"},g.default.createElement("span",{className:"aidos-panel-title"},"Link evidence to criteria")),g.default.createElement("div",{className:"aidos-panel-body"},g.default.createElement(pi,{criteria:e.criteria,evidence:e.evidence,ticketIdKey:e.ticketIdKey,agentId:e.agentId,onChanged:e.onLinked}))):null,g.default.createElement(qa,{ticketId:e.ticketIdKey,agentId:e.agentId})))}function Lu(e){let n=e.ticket,t=Tn(n.state),[i,o]=g.default.useState(null);async function r(s){if(i!==null)return;let a=s.at??0;o(a);try{await O("userDetachEvidence",{ticketId:e.ticketIdKey,at:a,rowKind:s.kind},e.agentId),R("Evidence deleted","success")}catch(l){wt(l)}finally{o(null)}}return g.default.createElement(g.default.Fragment,null,g.default.createElement("div",{className:"aidos-detail-head"},g.default.createElement(hs,{field:"title",ticketId:e.ticketIdKey,value:n.title,agentId:e.agentId,onSaved:e.onFieldSaved}),g.default.createElement("button",{className:"aidos-close-btn",onClick:e.onClose},"\xD7")),g.default.createElement("div",{className:"aidos-detail-chips"},g.default.createElement("span",{className:"aidos-chip aidos-chip-id",style:{"--chip-hue":rn(me(n))},title:me(n),"data-dsh-tip":""},hn(n)),g.default.createElement("span",{className:t},Me(n.state)),g.default.createElement(Do,{tags:n.tags??[]})),g.default.createElement("dl",{className:"aidos-facts"},g.default.createElement("div",{className:"aidos-facts-row"},g.default.createElement("dt",{className:"aidos-facts-label"},"State"),g.default.createElement("dd",{className:"aidos-facts-value"},Me(n.state))),g.default.createElement("div",{className:"aidos-facts-row"},g.default.createElement("dt",{className:"aidos-facts-label"},"Gate"),g.default.createElement("dd",{className:"aidos-facts-value"},En(n.gatePresent,n.gateTotal,on(n)))),g.default.createElement("div",{className:"aidos-facts-row"},g.default.createElement("dt",{className:"aidos-facts-label"},"Confidence"),g.default.createElement("dd",{className:"aidos-facts-value"},String(rt(n.confidenceScore))+"%",g.default.createElement("span",{className:"aidos-facts-asterisk",title:"Advisory score. It never unlocks anything.","data-dsh-tip":""},"*"))),g.default.createElement("div",{className:"aidos-facts-row"},g.default.createElement("dt",{className:"aidos-facts-label"},"Phase"),g.default.createElement("dd",{className:"aidos-facts-value"},String(n.phase))),g.default.createElement("div",{className:"aidos-facts-row"},g.default.createElement("dt",{className:"aidos-facts-label"},"Order"),g.default.createElement("dd",{className:"aidos-facts-value"},String(n.order))),g.default.createElement("div",{className:"aidos-facts-row"},g.default.createElement("dt",{className:"aidos-facts-label"},"Slug"),g.default.createElement("dd",{className:"aidos-facts-value"},n.slug))),g.default.createElement(li,{ticketId:e.ticketIdKey,agentId:e.agentId,onResolved:e.onFieldSaved}),e.actions,e.onOpenRetire!==void 0?g.default.createElement("button",{className:"aidos-btn",title:"Hide this ticket everywhere. Reversible from the Retired panel.","data-dsh-tip":"",onClick:e.onOpenRetire},"Retire\u2026"):null,g.default.createElement(Nu,{ticket:n,ticketIdKey:e.ticketIdKey,agentId:e.agentId,onSaved:e.onFieldSaved}),g.default.createElement(_u,{ticket:n,evidence:e.evidence,ticketIdKey:e.ticketIdKey,agentId:e.agentId,onSaved:e.onFieldSaved,onViewEvidence:e.onViewEvidence,deletingAt:i}),g.default.createElement(Pu,{ticketId:e.ticketIdKey,dependsOn:n.dependsOn,agentId:e.agentId,onSaved:e.onFieldSaved,ticketsByKey:e.ticketsByKey,onJump:e.onJump,workspaceKey:n.workspaceKey}),g.default.createElement(Mu,{evidence:e.evidence,evidenceCollapsed:e.evidenceCollapsed,onToggleEvidence:e.onToggleEvidence,onDelete:s=>{r(s)},deletingAt:i,ticketIdKey:e.ticketIdKey,agentId:e.agentId,onViewEvidence:e.onViewEvidence,criteria:Xi(n.criteria),onLinked:e.onFieldSaved}))}function yi(e){let n=e.ticket,t=e.agentId,i=me(n),o=function(S){let[F,H]=g.default.useState(()=>zr(t,i,S));return[F,function(Ke){$r(t,i,S,Ke),H(Ke)}]},[r,s]=o("signoff"),[a,l]=o("verify"),[d,c]=o("sendBack"),[u,p]=o("markDone"),[f,b]=o("allowlist"),[w,x]=o("retire"),[m,A]=g.default.useState(()=>jr(t,i)),_=function(S){Fr(t,i,S),A(S)},[W,E]=g.default.useState(!1);g.default.useEffect(function(){X("detail view: ticket "+n.id)},[]);async function Y(){if(!W){E(!0);try{await Lo(t,e.ticketIdKey),e.onClose()}catch(S){wt(S)}finally{E(!1)}}}function de(S){return di(t,e.ticketIdKey,S)}return g.default.createElement("div",{className:"aidos-detail"},g.default.createElement(Lu,{ticket:n,ticketIdKey:e.ticketIdKey,evidence:e.evidence,evidenceCollapsed:e.evidenceCollapsed,onToggleEvidence:e.onToggleEvidence,onClose:e.onClose,agentId:t,onFieldSaved:e.onFieldSaved,onOpenAllowlist:()=>{b(!0)},onViewEvidence:S=>{_(S)},actions:g.default.createElement(si,{ticket:n,evidence:e.evidence,checkAction:de,onOpenSignoff:()=>{s(!0)},onOpenVerify:()=>{l(!0)},onOpenSendBack:()=>{c(!0)},onOpenMarkDone:()=>{p(!0)},onOpenSubmitForReview:()=>{Y()},onOpenAllowlist:()=>{b(!0)}}),onOpenRetire:()=>{x(!0)}}),g.default.createElement(Nn,{row:m,onClose:()=>{_(null)}}),f?g.default.createElement(ci,{open:!0,ticketId:n.id,ticketIdKey:e.ticketIdKey,currentAllowlist:n.allowlist??[],agentId:t,onClose:()=>{b(!1)},onSaved:e.onFieldSaved}):null,g.default.createElement(gs,{ticketId:e.ticketIdKey,comments:e.comments,agentId:t}),r?g.default.createElement(An,{open:!0,ticketId:e.ticketIdKey,ticketTitle:n.title,onClose:()=>{s(!1)},onSignedOff:function(){s(!1)},agentId:t}):null,a?g.default.createElement(an,{ticketId:e.ticketIdKey,agentId:t,onClose:()=>{l(!1)}}):null,d?g.default.createElement(vi,{open:!0,ticketId:e.ticketIdKey,onClose:()=>{c(!1)},onSentBack:function(){c(!1)},agentId:t}):null,u?g.default.createElement(bt,{open:!0,ticketId:e.ticketIdKey,ticket:n,evidence:e.evidence,onClose:()=>{p(!1)},onMarkedDone:e.onClose,agentId:t}):null,w?g.default.createElement(bs,{open:!0,ticketId:e.ticketIdKey,ticketTitle:n.title,agentId:t,onClose:()=>{x(!1)},onRetired:function(){e.onClose()}}):null)}function Do(e){return e.tags.length===0?null:Q.default.createElement(Q.default.Fragment,null,e.tags.map(n=>Q.default.createElement("span",{key:n,className:"aidos-chip aidos-chip-tag",style:{"--chip-hue":Rr(n)},"aria-label":"Tag "+n,title:"Tag "+n,"data-dsh-tip":""},n)))}function ws(e){let[n,t]=Q.default.useState(!1),[i,o]=Q.default.useState(!1),[r,s]=Q.default.useState(!1),[a,l]=Q.default.useState(!1),[d,c]=Q.default.useState(!1),[u,p]=Q.default.useState(!1),f={signoffOpen:n,setSignoffOpen:t,verifyOpen:i,setVerifyOpen:o,sendBackOpen:r,setSendBackOpen:s,markDoneOpen:a,setMarkDoneOpen:l,allowlistOpen:d,setAllowlistOpen:c,submitting:u,setSubmitting:p},b=Ku(e.ticket),w=xi.get(b);if(w!==void 0&&zu(w.props,e)&&$u(w.controls,f))return w.element;let x=ju(e,f);return xi.size>=Du&&xi.clear(),xi.set(b,{props:e,controls:f,element:x}),x}var Du=1024,xi=new Map;function Ku(e){let n=e.sourceSessionId;return(typeof n=="string"?n:"")+":"+String(e.id)}function Bu(e,n){return e===n||e.length===0&&n.length===0}function zu(e,n){return e.ticket===n.ticket&&Bu(e.evidence,n.evidence)&&e.selected===n.selected&&(e.active??!1)===(n.active??!1)&&(e.awaitingApproval??!1)===(n.awaitingApproval??!1)&&e.ownWorkspaceKey===n.ownWorkspaceKey&&(e.agentId??null)===(n.agentId??null)&&(e.ticketIdKey??null)===(n.ticketIdKey??null)}function $u(e,n){return e.signoffOpen===n.signoffOpen&&e.verifyOpen===n.verifyOpen&&e.sendBackOpen===n.sendBackOpen&&e.markDoneOpen===n.markDoneOpen&&e.allowlistOpen===n.allowlistOpen&&e.submitting===n.submitting}function ju(e,n){let t=e.ticket,i=t.supersededCopies??[],o="aidos-tile"+(e.selected?" aidos-tile-selected":"")+(e.active===!0?" aidos-tile-active":""),r=Tn(t.state),s=Zt(t.gatePresent,t.gateTotal,on(t)),a=t.sourceSessionId,l=e.agentId??(typeof a=="string"?a:null),d=e.ticketIdKey??String(t.id),{signoffOpen:c,setSignoffOpen:u,verifyOpen:p,setVerifyOpen:f,sendBackOpen:b,setSendBackOpen:w,markDoneOpen:x,setMarkDoneOpen:m,allowlistOpen:A,setAllowlistOpen:_,submitting:W,setSubmitting:E}=n;function Y(H){return l===null?Promise.resolve("the board session for this ticket is unknown, so the action cannot be checked"):di(l,d,H)}function de(H){H instanceof j?R(H.message,"refusal"):R(String(H),"refusal")}function S(){if(l===null||W)return;let H=l,Ve=d;E(!0),Lo(H,Ve).catch(Ke=>{de(Ke)}).finally(()=>{E(!1)})}function F(H){H.target===H.currentTarget&&(H.key==="Enter"||H.key===" ")&&(H.preventDefault(),e.onSelect())}return Q.default.createElement("div",{className:o,onClick:e.onSelect,role:"button",tabIndex:0,onKeyDown:F},Q.default.createElement("div",{className:"aidos-tile-meta"},Q.default.createElement("span",{className:"aidos-chip aidos-chip-id",style:{"--chip-hue":rn(me(t))},title:me(t),"data-dsh-tip":""},hn(t,e.ownWorkspaceKey)),i.length>0?Q.default.createElement("span",{className:"aidos-chip aidos-chip-copies","aria-label":i.length+" other session cop"+(i.length===1?"y":"ies")+" of this ticket were merged into this row",title:"Merged from "+i.length+" other session cop"+(i.length===1?"y":"ies")+`. This row is the most recently updated one.
`+i.map(H=>`${H.sessionId} (updated ${new Date(H.updatedAt*1e3).toLocaleString()})`).join(`
`),"data-dsh-tip":""},"+"+i.length):null,e.awaitingApproval===!0?Q.default.createElement("span",{className:"aidos-chip aidos-chip-approval-flag","aria-label":"This ticket has a request waiting for your approval",title:"This ticket has a request waiting for your approval","data-dsh-tip":""},Q.default.createElement(ii,null)):null,Q.default.createElement("span",{className:r},Me(t.state))),Q.default.createElement("h3",{className:"aidos-tile-title"},t.title),Q.default.createElement("p",{className:"aidos-tile-preview"},t.description),Q.default.createElement("div",{className:"aidos-tile-chips"},Q.default.createElement("span",{className:"aidos-chip aidos-chip-metric aidos-chip-gate"+(s?" aidos-chip-fail":""),"aria-label":"Gate: "+En(t.gatePresent,t.gateTotal,on(t))+" of the required evidence is attached",title:"Gate: "+En(t.gatePresent,t.gateTotal,on(t))+" of the required evidence is attached","data-dsh-tip":""},Q.default.createElement("span",{className:"aidos-chip-key"},Q.default.createElement(ct,null)),Q.default.createElement("span",{className:"aidos-chip-value"},En(t.gatePresent,t.gateTotal,on(t)))),Q.default.createElement(da,{evidence:e.evidence,state:t.state}),Q.default.createElement(Do,{tags:t.tags??[]}),t.dependsOn?.map(H=>Q.default.createElement("span",{key:H,className:"aidos-chip aidos-chip-dep","aria-label":"Depends on "+H,title:"Depends on "+H,"data-dsh-tip":""},Q.default.createElement("span",{className:"aidos-chip-dep-icon"},Q.default.createElement(ut,null)),Kn(H,e.ownWorkspaceKey))),Q.default.createElement("span",{className:"aidos-chip aidos-chip-metric aidos-chip-conf","aria-label":"Confidence "+rt(t.confidenceScore)+"%. Advisory only \u2014 it never unlocks anything.",title:"Confidence "+rt(t.confidenceScore)+"%. Advisory only \u2014 it never unlocks anything.","data-dsh-tip":""},Q.default.createElement("span",{className:"aidos-chip-key"},Q.default.createElement(In,null)),Q.default.createElement("span",{className:"aidos-chip-value"},rt(t.confidenceScore)+"%"))),Q.default.createElement("div",{className:"aidos-tile-actions",onClick:H=>{H.stopPropagation()}},Q.default.createElement(si,{ticket:t,evidence:e.evidence,checkAction:Y,onOpenSignoff:()=>{l!==null&&u(!0)},onOpenVerify:()=>{l!==null&&f(!0)},onOpenSendBack:()=>{l!==null&&w(!0)},onOpenMarkDone:()=>{l!==null&&m(!0)},onOpenSubmitForReview:S,onOpenAllowlist:()=>{l!==null&&_(!0)}}),c&&l!==null?Q.default.createElement(An,{open:!0,ticketId:d,ticketTitle:t.title,agentId:l,onClose:()=>{u(!1)},onSignedOff:()=>{u(!1)}}):null,p&&l!==null?Q.default.createElement(an,{ticketId:d,agentId:l,onClose:()=>{f(!1)}}):null,b&&l!==null?Q.default.createElement(vi,{open:!0,ticketId:d,agentId:l,onClose:()=>{w(!1)},onSentBack:()=>{w(!1)}}):null,x&&l!==null?Q.default.createElement(bt,{open:!0,ticketId:d,ticket:t,evidence:e.evidence,agentId:l,onClose:()=>{m(!1)},onMarkedDone:()=>{m(!1)}}):null,A&&l!==null?Q.default.createElement(ci,{open:!0,ticketId:t.id,ticketIdKey:d,currentAllowlist:t.allowlist??[],agentId:l,onClose:()=>{_(!1)},onSaved:()=>{}}):null))}function vs(e){let[n,t]=ue.default.useState(!1),i=e.tickets.map(s=>ue.default.createElement(ws,{key:q(s),ticket:s,evidence:e.evidenceByTicket?.[q(s)]??[],ownWorkspaceKey:e.ownWorkspaceKey,awaitingApproval:e.awaitingApprovalKeys?.has(q(s))===!0,selected:q(s)===e.selectedId,active:q(s)===e.activeTicketId,onSelect:()=>{e.onSelect(q(s))}})),o;e.allTicketsCount===0?o=ue.default.createElement("div",{className:"aidos-empty"},ue.default.createElement("h3",{className:"aidos-empty-title"},"No tickets yet"),ue.default.createElement("p",{className:"aidos-empty-note"},"This session holds no tickets. Create the first one to start the board."),ue.default.createElement("button",{className:"aidos-btn aidos-btn-primary",onClick:e.onCreate},"Create a ticket")):e.tickets.length===0?o=ue.default.createElement("div",{className:"aidos-empty"},ue.default.createElement("h3",{className:"aidos-empty-title"},"No tickets match"),ue.default.createElement("p",{className:"aidos-empty-note"},"The active filters hide every ticket. Clear them to see the board."),ue.default.createElement("button",{className:"aidos-btn",onClick:e.onClearFilters},"Clear filters")):o=ue.default.createElement("div",{className:"aidos-board-grid"},i);let r=La(e.queueTotal??0,e.agentAskCount??0);return ue.default.createElement("div",{className:"aidos-root"},ue.default.createElement("div",{className:"aidos-toolbar"},ue.default.createElement("span",{className:"aidos-empty-note"},e.tickets.length+" of "+e.allTicketsCount+" tickets"),ue.default.createElement("span",{className:"aidos-toolbar-actions"},e.onQueue!==void 0?ue.default.createElement("button",{className:"aidos-btn",onClick:e.onQueue,title:Da(r,e.agentAskCountStale===!0),"data-dsh-tip":""},"Waiting on you",ue.default.createElement("b",{className:"aidos-queue-count"+(r.indicator?" aidos-queue-count-asks":"")},r.count)):null,e.onRetired!==void 0&&(e.retiredCount??0)>0?ue.default.createElement("button",{className:"aidos-btn",onClick:e.onRetired,title:"Hidden tickets \u2014 view and un-retire them","data-dsh-tip":""},"Retired",ue.default.createElement("b",{className:"aidos-queue-count"},e.retiredCount)):null,ue.default.createElement("button",{className:"aidos-btn",onClick:e.onPlan},"Plan"),e.onTags!==void 0?ue.default.createElement("button",{className:"aidos-btn",onClick:e.onTags,title:"Browse every tag in the workspace, with counts","data-dsh-tip":""},"Tags",ue.default.createElement("b",{className:"aidos-queue-count"},e.tagsTotal??0)):null,ue.default.createElement("button",{className:"aidos-btn aidos-btn-primary",onClick:e.onCreate},"Create"))),ue.default.createElement(la,{sessionId:e.sessionId,projects:e.projects,applied:e.applied,tickets:e.tickets,onApply:e.onApply,onJump:e.onJump,collapsed:n,onToggleCollapsed:()=>{t(!n)}}),ue.default.createElement("div",{className:"aidos-grid-wrap"},o))}var pe=ee(require("react"),1);function Fu(e){let n=[],t=new Set;for(let i of e.split(",")){let o=i.trim();o===""||t.has(o)||(t.add(o),n.push(o))}return n}function ks(e){let[n,t]=pe.default.useState(""),[i,o]=pe.default.useState(""),[r,s]=pe.default.useState(""),[a,l]=pe.default.useState(""),[d,c]=pe.default.useState(!1);if(pe.default.useEffect(function(){e.open&&X("create ticket modal opened")},[e.open]),!e.open)return null;async function u(){if(!d&&n.trim()!==""){c(!0);try{let p=await O("userSetTicket",{title:n,description:i,criteria:r},e.agentId),f=typeof p=="object"&&p!==null&&!Array.isArray(p)&&"id"in p&&typeof p.id=="number"?p.id:NaN,b=Fu(a);if(b.length>0&&Number.isFinite(f))try{await O("userAttachTags",{ticketId:f,tags:b},e.agentId)}catch(w){let x=w instanceof j?w.message:String(w);R("Ticket created, but its tags were not attached: "+x,"refusal"),e.onClose(),e.onCreated!==void 0&&e.onCreated(f);return}R("Ticket created","success"),e.onClose(),e.onCreated!==void 0&&Number.isFinite(f)&&e.onCreated(f)}catch(p){p instanceof j?R(p.message,"refusal"):R(String(p),"refusal")}finally{c(!1)}}}return pe.default.createElement("div",{className:"aidos-modal-mask",onClick:()=>{d||e.onClose()}},pe.default.createElement("div",{className:"aidos-modal",onClick:p=>{p.stopPropagation()}},pe.default.createElement("div",{className:"aidos-modal-head"},pe.default.createElement("h3",{className:"aidos-modal-title"},"Create a ticket"),pe.default.createElement("button",{className:"aidos-close-btn",onClick:()=>{d||e.onClose()},"aria-label":"Close"},"\xD7")),pe.default.createElement("div",{className:"aidos-modal-form"},pe.default.createElement("div",{className:"aidos-modal-row"},pe.default.createElement("label",null,"Title"),pe.default.createElement("input",{type:"text",value:n,disabled:d,onChange:p=>{t(p.target.value)}})),pe.default.createElement("div",{className:"aidos-modal-row"},pe.default.createElement("label",null,"Description"),pe.default.createElement("textarea",{value:i,disabled:d,onChange:p=>{o(p.target.value)}})),pe.default.createElement("div",{className:"aidos-modal-row"},pe.default.createElement("label",null,"Criteria"),pe.default.createElement("textarea",{value:r,disabled:d,onChange:p=>{s(p.target.value)}})),pe.default.createElement("div",{className:"aidos-modal-row"},pe.default.createElement("label",null,"Tags"),pe.default.createElement("input",{type:"text",value:a,disabled:d,placeholder:"ui, host, debt (comma-separated, optional)",onChange:p=>{l(p.target.value)}})),pe.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:d||n.trim()==="",onClick:u},d?"Saving\u2026":"Save"))))}var oe=ee(require("react"),1);function ys(e){let[n,t]=oe.default.useState(null),[i,o]=oe.default.useState(""),[r,s]=oe.default.useState(!1),[a,l]=oe.default.useState([]);if(oe.default.useEffect(function(){e.open&&(t(null),o(""),l([0]),X("plan meta modal opened"))},[e.open]),!e.open)return null;function d(m,A){t(m),o(A)}function c(){t(null),o("")}function u(m){l(A=>A.includes(m)?A.filter(_=>_!==m):[...A,m])}async function p(m){if(r)return;let A={};m==="frontmatter"?A.frontmatter=i:m==="preamble"?A.preamble=i:A.contextSections=(e.planMeta?.contextSections??[]).map((_,W)=>W===m?{..._,text:i}:{..._}),s(!0);try{await O("userSetPlanMeta",A,e.agentId),R("Plan block saved","success"),c()}catch(_){_ instanceof j?R(_.message,"refusal"):R(String(_),"refusal")}finally{s(!1)}}function f(m){return oe.default.createElement(oe.default.Fragment,null,oe.default.createElement("textarea",{className:"aidos-plan-meta-input",value:i,disabled:r,onChange:A=>{o(A.target.value)}}),oe.default.createElement("div",{className:"aidos-plan-meta-actions"},oe.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:r,onClick:()=>{p(m)}},r?"Saving\u2026":"Save"),oe.default.createElement("button",{className:"aidos-btn",disabled:r,onClick:c},"Cancel")))}function b(m,A,_){return oe.default.createElement("div",{className:"aidos-plan-meta-block",key:m},oe.default.createElement("div",{className:"aidos-plan-meta-block-head"},oe.default.createElement("span",{className:"aidos-plan-meta-block-title"},A),oe.default.createElement("button",{className:"aidos-btn",disabled:r,onClick:()=>{d(m,_)}},"Edit")),n===m?f(m):oe.default.createElement("pre",{className:"aidos-plan-meta-text"},_===""?"(empty)":_))}function w(m,A,_){let W=a.includes(m);return oe.default.createElement("div",{className:"aidos-plan-meta-block",key:m},oe.default.createElement("div",{className:"aidos-plan-meta-block-head"},oe.default.createElement("button",{className:"aidos-plan-meta-toggle",onClick:()=>{u(m)}},oe.default.createElement("span",{"aria-hidden":"true"},W?"\u25BE":"\u25B8"),A),oe.default.createElement("button",{className:"aidos-btn",disabled:r,onClick:()=>{d(m,_)}},"Edit")),n===m||W?n===m?f(m):oe.default.createElement("pre",{className:"aidos-plan-meta-text"},_===""?"(empty)":_):null)}let x=e.planMeta;return oe.default.createElement("div",{className:"aidos-modal-mask",onClick:()=>{r||e.onClose()}},oe.default.createElement("div",{className:"aidos-plan-meta-modal",onClick:m=>{m.stopPropagation()}},oe.default.createElement("div",{className:"aidos-modal-head"},oe.default.createElement("h3",{className:"aidos-modal-title"},"Plan"),oe.default.createElement("button",{className:"aidos-close-btn",onClick:()=>{r||e.onClose()},"aria-label":"Close"},"\xD7")),x===null?oe.default.createElement("p",{className:"aidos-plan-meta-note"},"This project holds no plan yet."):oe.default.createElement("div",{className:"aidos-plan-meta-blocks"},b("frontmatter","Frontmatter",x.frontmatter),b("preamble","Preamble",x.preamble),x.contextSections.map((m,A)=>w(A,m.heading,m.text)))))}var U=ee(require("react"),1);var re=ee(require("react"),1);function xs(e){switch(e.kind){case"confirm":return{kind:"confirm",note:""};case"path-list":return{kind:"path-list",paths:[...e.paths]};case"criteria-checklist":return{kind:"criteria-checklist",criteria:[...e.selected??e.criteria.map((t,i)=>i)].sort((t,i)=>t-i).map(t=>e.criteria[t]).filter(t=>typeof t=="string")};case"dependency-picker":return{kind:"dependency-picker",ticketIds:[...e.selected??[]]}}}function Vu(e,n){return e.some((t,i)=>{let o=xs(t),r=n[i];return r===void 0||o.kind==="confirm"||r.kind==="confirm"?!1:JSON.stringify(o)!==JSON.stringify(r)})}function Ss(e){let n=e.steps,[t,i]=re.default.useState(0),[o,r]=re.default.useState(()=>n.map(xs)),s=n[t],a=o[t],l=t===n.length-1,d=e.working===!0,c=p=>{r(f=>{let b=[...f];return b[t]=p,b})},u=()=>{if(!l){i(t+1);return}e.onResolve({status:Vu(n,o)?"amended":"approved",values:o})};return s===void 0||a===void 0?null:re.default.createElement(be,{title:n.length>1?e.title+" ("+(t+1)+"/"+n.length+")":e.title,working:d,onClose:e.onClose},re.default.createElement("div",{className:"aidos-runner-step"},re.default.createElement("h4",{className:"aidos-runner-step-title"},s.title),s.prompt!==void 0?re.default.createElement("p",{className:"aidos-runner-step-prompt"},s.prompt):null,re.default.createElement(qu,{step:s,value:a,working:d,onChange:c})),re.default.createElement("div",{className:"aidos-form-actions"},re.default.createElement("button",{className:"aidos-btn",disabled:d,onClick:e.onClose},"Cancel"),re.default.createElement("button",{className:"aidos-btn aidos-btn-danger",disabled:d,title:"Answer no. The agent is told and the request is resolved.","data-dsh-tip":"",onClick:()=>{e.onResolve({status:"rejected"})}},"Reject"),t>0?re.default.createElement("button",{className:"aidos-btn",disabled:d,onClick:()=>{i(t-1)}},"Back"):null,re.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:d,onClick:u},d?"Working\u2026":l?"Confirm":"Next")))}function qu(e){let{step:n,value:t,working:i,onChange:o}=e;if(n.kind==="confirm"&&t.kind==="confirm")return re.default.createElement(re.default.Fragment,null,re.default.createElement(je,{label:n.noteLabel??"Note (optional)",value:t.note,working:i,onChange:r=>{o({...t,note:r})}}),n.criteria!==void 0&&n.criteria.length>0?re.default.createElement("div",{className:"aidos-modal-row"},re.default.createElement("label",null,"Link to a criterion (optional)"),re.default.createElement("select",{className:"aidos-select",value:t.criterion??"",disabled:i,onChange:r=>{let s=r.target.value;o({...t,criterion:s===""?void 0:s})}},re.default.createElement("option",{value:""},"\u2014 none \u2014"),n.criteria.map(r=>re.default.createElement("option",{key:r,value:r},r)))):null);if(n.kind==="path-list"&&t.kind==="path-list")return re.default.createElement(mn,{label:n.label??"Paths (one per line)",value:t.paths.join(`
`),working:i,onChange:r=>{o({kind:"path-list",paths:ht(r)})}});if(n.kind==="criteria-checklist"&&t.kind==="criteria-checklist"){let r=new Set(t.criteria);return re.default.createElement("ul",{className:"aidos-runner-checklist"},n.criteria.map(s=>re.default.createElement("li",{key:s},re.default.createElement("label",null,re.default.createElement("input",{type:"checkbox",checked:r.has(s),disabled:i,onChange:()=>{let a=new Set(r);a.has(s)?a.delete(s):a.add(s),o({kind:"criteria-checklist",criteria:n.criteria.filter(l=>a.has(l))})}}),re.default.createElement("span",null,s)))))}if(n.kind==="dependency-picker"&&t.kind==="dependency-picker"){let r=new Set(t.ticketIds);return re.default.createElement("ul",{className:"aidos-ticket-strips"},n.candidates.map(s=>{let a=String(s.id);return re.default.createElement(Ue,{key:a,ticket:s,meta:r.has(a)?"will be proposed as a dependency":void 0,highlighted:r.has(a),actions:re.default.createElement("button",{className:"aidos-btn",disabled:i,onClick:()=>{let l=new Set(r);l.has(a)?l.delete(a):l.add(a),o({kind:"dependency-picker",ticketIds:n.candidates.map(d=>String(d.id)).filter(d=>l.has(d))})}},r.has(a)?"Remove":"Add")})}))}return null}function Uu(e){return e.approvalId!==void 0?[{kind:"path-list",title:"Approve file access for "+e.ticket.title,prompt:"The agent proposed these paths. Edit or remove any of them; approving grants write access to exactly this list.",label:"Paths (one per line)",paths:e.approvalPaths??[]}]:[{kind:"confirm",title:e.label,prompt:e.prompt,noteLabel:"Note (optional)"}]}var Ko={signoff:{icon:U.default.createElement(oi,null),hint:"Sign off \u2014 let the agent start work on this ticket",tone:"signoff"},verify:{icon:U.default.createElement(fa,null),hint:"Verify \u2014 check the work and attach your row",tone:"verify"},"mark-done":{icon:U.default.createElement(ha,null),hint:"Mark done \u2014 close this ticket",tone:"done"},allowlist:{icon:U.default.createElement(ri,null),hint:"Review a write-access request",tone:"allowlist"}};function dn(e){return e.boardKey+"\0"+e.actionId+(e.approvalId!==void 0?"\0"+e.approvalId:"")}function Ts(e){let[n,t]=U.default.useState(null),[i,o]=U.default.useState(()=>qr(e.sessionId)),r=function(S){let F=S===null?null:dn(S);Ur(e.sessionId,F),o(F)},[s,a]=U.default.useState(!1),[l,d]=U.default.useState("suggested"),[c,u]=U.default.useState(null),[p,f]=U.default.useState(null),[b,w]=U.default.useState(new Set),x=ko(e.tickets,S=>(e.evidenceByTicket[q(S)]??[]).map(F=>F.kind),e.nominations??[],l,e.approvals??[]),m=x.filter(S=>!b.has(dn(S))),A=Na(m),_=c??Ca(m),W=A.find(S=>S.id===_)??{id:_,label:_,entries:[]},E=i===null?null:x.find(S=>dn(S)===i)??null,Y=m.filter(S=>S.nominationReason!==void 0).length,de=Ka(e.tickets,S=>(e.evidenceByTicket[q(S)]??[]).map(F=>F.kind),e.nominations??[]);return e.error!=null&&e.error!==""?U.default.createElement("div",{className:"aidos-queue"},U.default.createElement("p",{className:"aidos-queue-empty"},"Could not load the queue: "+e.error),e.onRefresh!==void 0?U.default.createElement("button",{className:"aidos-btn",onClick:e.onRefresh},"Retry"):null):m.length===0?U.default.createElement("div",{className:"aidos-queue"},U.default.createElement("p",{className:"aidos-queue-empty"},"Nothing is waiting on you. Every ticket is either with the agent or done.")):U.default.createElement("div",{className:"aidos-queue"},U.default.createElement("div",{className:"aidos-queue-head"},U.default.createElement("span",{className:"aidos-queue-count"},m.length+(m.length===1?" ask":" asks"),Y>0?" \xB7 "+Y+" suggested by the agent":""),U.default.createElement("label",{className:"aidos-queue-sort"},U.default.createElement("span",null,"Sort"),U.default.createElement("select",{className:"aidos-select",value:l,onChange:S=>{d(S.target.value)}},Object.keys(yo).map(S=>U.default.createElement("option",{key:S,value:S},yo[S]))))),de.length>0?U.default.createElement("ul",{className:"aidos-queue-unmatched"},de.map(S=>U.default.createElement("li",{key:S.nomination.id},"The agent suggested "+S.nomination.actionId+" but it is not shown: "+S.reason))):null,U.default.createElement("div",{className:"aidos-queue-tabs",role:"tablist","aria-label":"Queue"},A.map(S=>U.default.createElement("button",{key:S.id,type:"button",role:"tab","aria-selected":S.id===W.id,className:"aidos-queue-tab"+(S.id===W.id?" aidos-queue-tab-active":""),onClick:()=>{u(S.id)}},U.default.createElement("span",{className:"aidos-queue-tab-icon","aria-hidden":"true"},Ko[Ia[S.id]]?.icon),U.default.createElement("span",{className:"aidos-queue-tab-label"},S.label),U.default.createElement("span",{className:"aidos-queue-tab-count"},S.entries.length)))),W.entries.length===0?U.default.createElement("p",{className:"aidos-queue-empty"},Ra[W.id]):U.default.createElement("ul",{className:"aidos-ticket-strips",role:"tabpanel"},W.entries.map(S=>U.default.createElement(Ue,{key:dn(S),actionIcon:Ko[S.actionId]?.icon,actionHint:Ko[S.actionId]?.hint,expanded:n===dn(S),onToggleActions:()=>{let F=dn(S);t(n===F?null:F)},ticket:S.ticket,highlighted:S.nominationReason!==void 0||S.approvalId!==void 0,awaitingApproval:S.approvalId!==void 0,meta:S.nominationReason!==void 0?U.default.createElement("span",{className:"aidos-queue-reason"},"the agent asks: "+S.nominationReason):S.prompt,onOpen:()=>{e.onOpen(S)},actions:U.default.createElement(U.default.Fragment,null,S.nominationId!==void 0&&e.onDismiss!==void 0?U.default.createElement("button",{type:"button",className:"tool-render-approval-btn tool-render-approval-reject","data-armed":p===S.nominationId?!0:void 0,disabled:s,title:"Drop this suggestion without acting on it","data-dsh-tip":"",onClick:()=>{let F=S.nominationId,H=Ma(p,F);f(H.armed),H.dismiss&&e.onDismiss?.(F)}},p===S.nominationId?"? Confirm dismiss":"Dismiss"):null,U.default.createElement("button",{type:"button",className:"tool-render-approval-btn tool-render-approval-approve",disabled:s,onClick:()=>{f(null),r(S)}},S.label))}))),E!==null&&E.actionId==="verify"&&E.approvalId===void 0?U.default.createElement(an,{ticketId:E.boardKey,agentId:e.sessionId,onAttached:()=>{w(function(S){let F=new Set(S);return F.add(dn(E)),F}),e.onRefresh?.()},onClose:()=>{r(null)}}):E!==null&&E.actionId==="signoff"&&E.approvalId===void 0?U.default.createElement(An,{open:!0,ticketId:E.boardKey,ticketTitle:E.ticket.title,agentId:e.sessionId,proposedPaths:E.proposedPaths??E.ticket.allowlist??[],onClose:()=>{r(null)},onSignedOff:()=>{w(function(S){let F=new Set(S);return F.add(dn(E)),F}),e.onRefresh?.()}}):E!==null&&E.actionId==="mark-done"&&E.approvalId===void 0?U.default.createElement(bt,{open:!0,ticketId:E.boardKey,ticket:E.ticket,evidence:e.evidenceByTicket[E.boardKey]??[],agentId:e.sessionId,onClose:()=>{r(null)},onMarkedDone:()=>{w(function(S){let F=new Set(S);return F.add(dn(E)),F}),e.onRefresh?.()}}):E!==null?U.default.createElement(Ss,{title:E.label,steps:Uu(E),working:s,onClose:()=>{s||r(null)},onResolve:S=>{if(S.status==="rejected"&&E.approvalId===void 0){r(null);return}a(!0),e.onAct(E,S).then(()=>{a(!1),w(function(F){let H=new Set(F);return H.add(dn(E)),H}),r(null)}).catch(()=>{a(!1)})}}):null)}function Es(e,n,t=[],i=[]){return ko(e,o=>(n[q(o)]??[]).map(r=>r.kind),t,"suggested",i)}var B=ee(require("react"),1);function Hu(e){if(e===null||typeof e!="object")return[];let n=e.tags;if(!Array.isArray(n))return[];let t=[];for(let i of n){if(i===null||typeof i!="object")continue;let o=i;if(typeof o.tag!="string"||typeof o.count!="number")continue;let r=[];if(Array.isArray(o.tickets))for(let s of o.tickets){if(s===null||typeof s!="object")continue;let a=s;typeof a.boardKey!="string"||typeof a.id!="number"||typeof a.title!="string"||typeof a.state!="string"||typeof a.slug!="string"||typeof a.workspaceKey!="string"||r.push({boardKey:a.boardKey,id:a.id,title:a.title,state:a.state,slug:a.slug,workspaceKey:a.workspaceKey})}t.push({tag:o.tag,count:o.count,tickets:r})}return t}function Gu(e,n){let t=n.trim().toLowerCase();return t===""?[...e]:e.filter(i=>i.tag.toLowerCase().includes(t))}function Wu(e,n){return e.filter(t=>(t.kind==="tag-delete"||t.kind==="tag-migrate"||t.kind==="tag-detach")&&t.payload.tag===n)}function Qu(e){if(e.kind==="tag-migrate"&&typeof e.payload.to=="string")return`${String(e.payload.tag)} \u2192 ${e.payload.to}`;if(e.kind==="tag-detach"){let n=e.payload.ticketId;return typeof n=="number"||typeof n=="string"?`detach ${String(e.payload.tag)} from #${n}`:`detach ${String(e.payload.tag)}`}return`delete ${String(e.payload.tag)}`}function Rs(e){let[n,t]=B.default.useState(null),[i,o]=B.default.useState([]),[r,s]=B.default.useState(null),[a,l]=B.default.useState(""),[d,c]=B.default.useState(null),[u,p]=B.default.useState(""),[f,b]=B.default.useState(null),w=B.default.useCallback(function(){s(null),O("workspaceTags",{},e.sessionId).then(E=>{t(Hu(E))}).catch(E=>{s(E instanceof Error?E.message:String(E))}),O("pendingApprovals",{},e.sessionId).then(E=>{let Y=Array.isArray(E)?E:[];o(Y.filter(de=>{if(de===null||typeof de!="object")return!1;let S=de.kind;return S==="tag-delete"||S==="tag-migrate"||S==="tag-detach"}))}).catch(()=>{})},[e.sessionId]);B.default.useEffect(function(){X("tags modal opened"),w()},[w]);let x=n===null?[]:Gu(n,a),m=d===null?null:(n??[]).find(E=>E.tag===d)??null,A=d===null?[]:Wu(i,d);async function _(E,Y,de){b(de);try{await O(E,Y,e.sessionId),R(de,"success"),w()}catch(S){R(S instanceof Error?S.message:String(S),"refusal")}finally{b(null)}}let W=r!==null?B.default.createElement("div",{className:"aidos-empty"},B.default.createElement("p",{className:"aidos-empty-note"},r),B.default.createElement("button",{className:"aidos-btn",onClick:w},"Retry")):n===null?B.default.createElement("div",{className:"aidos-merge-loading",role:"status"},B.default.createElement("span",{className:"aidos-merge-spinner","aria-hidden":"true"}),B.default.createElement("span",null,"Loading workspace tags\u2026")):n.length===0?B.default.createElement("div",{className:"aidos-empty"},B.default.createElement("h3",{className:"aidos-empty-title"},"No tags yet"),B.default.createElement("p",{className:"aidos-empty-note"},"Tags are created by attaching them \u2014 the agent attaches with attach_tags, and a name no ticket carries yet is created by the attach.")):B.default.createElement(B.default.Fragment,null,B.default.createElement("div",{className:"aidos-search-box"},B.default.createElement("input",{className:"aidos-search-input",type:"search",placeholder:"Filter tags\u2026",value:a,onChange:E=>{l(E.target.value)},"aria-label":"Filter tags"})),B.default.createElement("ul",{className:"aidos-tags-list"},x.map(E=>B.default.createElement("li",{key:E.tag,className:"aidos-tags-row"},B.default.createElement("button",{className:"aidos-btn"+(d===E.tag?" aidos-btn-primary":""),onClick:()=>{c(d===E.tag?null:E.tag),p("")},title:`${E.count} ticket(s) carry this tag`,"data-dsh-tip":""},E.tag,B.default.createElement("b",{className:"aidos-queue-count"},E.count))))),x.length===0?B.default.createElement("p",{className:"aidos-empty-note"},"No tags match this filter."):null,m===null?null:B.default.createElement("div",{className:"aidos-tags-detail"},B.default.createElement("h4",{className:"aidos-tags-detail-title"},m.tag," \u2014 ",m.count," ticket(s)"),m.tickets.map(E=>B.default.createElement("div",{key:E.boardKey,className:"aidos-tags-ticket"},B.default.createElement(Ue,{ticket:{id:E.id,title:E.title,state:E.state,slug:E.slug,workspaceKey:E.workspaceKey},onOpen:()=>{e.onOpen(E.boardKey)}}),B.default.createElement("span",{className:"aidos-tags-actions"},B.default.createElement("button",{className:"aidos-btn",disabled:f!==null,onClick:()=>{_("userDetachTags",{ticketId:E.id,tags:[m.tag]},`Detached ${m.tag} from #${E.id}`)},title:`Remove ${m.tag} from this ticket only`,"data-dsh-tip":""},"Detach")))),B.default.createElement("div",{className:"aidos-tags-actions"},B.default.createElement("div",{className:"aidos-search-box"},B.default.createElement("input",{className:"aidos-search-input",type:"text",placeholder:"Migrate to\u2026",value:u,onChange:E=>{p(E.target.value)},"aria-label":"Replacement tag for migration"})),B.default.createElement("button",{className:"aidos-btn",disabled:f!==null||u.trim()==="",onClick:()=>{_("userMigrateTag",{from:m.tag,to:u.trim()},`Migrated ${m.tag} \u2192 ${u.trim()}`)},title:"Replace this tag with another on every ticket carrying it","data-dsh-tip":""},"Migrate"),B.default.createElement("button",{className:"aidos-btn",disabled:f!==null,onClick:()=>{_("userDeleteTag",{tag:m.tag},`Deleted ${m.tag}`),c(null)},title:"Delete this tag from every ticket carrying it","data-dsh-tip":""},"Delete")),A.length===0?null:B.default.createElement("div",{className:"aidos-tags-proposals"},B.default.createElement("h4",{className:"aidos-tags-detail-title"},"Agent proposals awaiting approval"),A.map(E=>B.default.createElement("div",{key:E.id,className:"aidos-tags-proposal"},B.default.createElement("span",null,Qu(E)),typeof E.payload.reason=="string"&&E.payload.reason!==""?B.default.createElement("span",{className:"aidos-empty-note"}," \u2014 ",E.payload.reason):null,B.default.createElement("span",{className:"aidos-tags-actions"},B.default.createElement("button",{className:"aidos-btn aidos-btn-primary",disabled:f!==null,onClick:()=>{_("resolveApproval",{requestId:E.id,approved:!0},"Proposal approved")}},"Approve"),B.default.createElement("button",{className:"aidos-btn",disabled:f!==null,onClick:()=>{_("resolveApproval",{requestId:E.id,approved:!1},"Proposal rejected")}},"Reject")))))));return B.default.createElement(be,{title:"Tags",wide:!0,onClose:e.onClose},W)}function Is(e){let n=null;for(let t of e)t.state==="in_progress"&&(n===null||t.updatedAt>n.updatedAt)&&(n=t);return n}var _n=ee(require("react"),1);function Zu(e){let n=e.toast;return _n.default.createElement("div",{className:"aidos-toast aidos-toast-"+n.kind},_n.default.createElement("span",{className:"aidos-toast-text"},n.text),_n.default.createElement("button",{className:"aidos-toast-dismiss",onClick:()=>{ya(n.id)},"aria-label":"Dismiss notification"},"\xD7"))}function As(){let[e,n]=_n.default.useState([]);return _n.default.useEffect(function(){return xa(n)},[]),_n.default.createElement("div",{className:"aidos-toast-stack"},e.map(function(t){return _n.default.createElement(Zu,{key:t.id,toast:t})}))}function _s(e){return"aidos:board:local:filter:"+e}var Ns=new Map,Yu=300;function Xu(e,n){if(e===null)return null;let t=new Set;for(let o of n)t.add(o.projectId);let i=e.filter(o=>t.has(o));return i.length===t.size?null:i}var ep=4096,Si=new Map;function Cs(e,n,t){return e.map(i=>{let o=t?i.sourceSessionId??"":n,r=o+":"+String(i.id),s=JSON.stringify(i)+"|"+o+"|"+String(t),a=Si.get(r);if(a!==void 0&&a.hash===s)return a.row;let l=t?{...i}:{...i,sourceSessionId:n,foreign:!1};return Si.size>=ep&&Si.clear(),Si.set(r,{hash:s,row:l}),l})}var np=4096,Ti=new Map;function tp(e){let n={};for(let[t,i]of Object.entries(e)){let o=JSON.stringify(i),r=Ti.get(t);if(r!==void 0&&r.hash===o){n[t]=r.rows;continue}Ti.size>=np&&Ti.clear(),Ti.set(t,{hash:o,rows:i}),n[t]=i}return n}function ip(e,n){try{let t=window.localStorage.getItem(_s(e));if(t===null)return Be(Qe);let i=JSON.parse(t),o=Array.isArray(i.stateIds)?i.stateIds.filter(l=>Dn.includes(l)):[...Qe.stateIds],r=Array.isArray(i.projectIds)?Xu(i.projectIds.filter(l=>typeof l=="number"),n):null,s=i.sortKey==="confidence"||i.sortKey==="gates"||i.sortKey==="time"||i.sortKey==="alpha"?i.sortKey:"confidence",a=Array.isArray(i.tags)&&i.tags.every(l=>typeof l=="string")?[...i.tags]:void 0;return{projectIds:r,stateIds:o,sortKey:s,descending:typeof i.descending=="boolean"?i.descending:!0,search:typeof i.search=="string"?i.search:"",tags:a}}catch{return Be(Qe)}}function op(e){let n=/[?&]ticket=([^&#]+)/.exec(e);if(n===null)return null;let t=decodeURIComponent(n[1]);return t===""?null:t}function rp(e){M.default.useEffect(function(){let n=e.current;if(n===null||typeof window>"u")return;let t=0,i=[],o=()=>{t=0;let l=n.getBoundingClientRect(),d=0,c=p=>{let f=p.getBoundingClientRect();f.height===0||f.bottom<=0||f.top>l.top+4||f.bottom>d&&(d=f.bottom)};if(document.querySelectorAll(".bmu-topbar, [data-bmu-topbar]").forEach(function(p){c(p);for(let f of Array.from(p.children))c(f)}),l.width>0&&typeof document.elementsFromPoint=="function"){let p=document.elementsFromPoint(l.left+l.width/2,l.top+2);for(let f of p){if(f===n||n.contains(f))break;let b=window.getComputedStyle(f).position;(b==="fixed"||b==="sticky")&&c(f)}}let u=Math.max(0,Math.round(d-l.top));n.style.setProperty("--aidos-top-clearance",`${u}px`),n.style.setProperty("--aidos-top-chrome",`${Math.max(0,Math.round(d))}px`)},r=()=>{t===0&&(t=window.requestAnimationFrame(o))};o();for(let l of[120,600,1600])i.push(window.setTimeout(r,l));window.addEventListener("resize",r),window.addEventListener("orientationchange",r);let s=window.visualViewport;s&&s.addEventListener("resize",r);let a=new ResizeObserver(r);return a.observe(n),function(){t!==0&&window.cancelAnimationFrame(t);for(let l of i)window.clearTimeout(l);window.removeEventListener("resize",r),window.removeEventListener("orientationchange",r),s&&s.removeEventListener("resize",r),a.disconnect()}},[e])}function Os(e){let[n,t]=M.default.useState(0);return M.default.useEffect(function(){X("board view mounted")},[]),M.default.useEffect(function(){n>0&&ze(`#100 REMOUNT: retryNonce -> ${n}; ProjectionReader state (selection included) was destroyed`)},[n]),M.default.createElement(ap,{key:n,sessionId:e.sessionId,useProjection:e.useProjection,onRetry:()=>{ze("#100 onRetry called -> forcing a remount"),t(i=>i+1)}})}function ap(e){let n=e.sessionId,t=e.useProjection("aidos.tickets"),i=e.useProjection("aidos.evidence"),o=e.useProjection("aidos.comments"),r=e.useProjection("aidos.plan"),s=t!==void 0&&i!==void 0&&o!==void 0,a=Object.values(t??{})[0]?.projectId??null,l=a===null?null:(r??{})[String(a)]??null,[d,c]=M.default.useState(()=>zn(n)),[u,p]=M.default.useState(()=>ia(n)&&zn(n)===null),f=t===void 0?null:JSON.stringify(t).length+":"+Object.keys(t).length;M.default.useEffect(function(){if(!s||f===null||na(n)===f)return;p(zn(n)===null);let y=!1,K=0,fe=async function(){try{let At=Ns.get(n),Sn=await O("workspaceTickets",At===void 0?{}:{sinceVersion:At},n),tr=Sn.workspaceLabels;if(tr!==void 0)for(let[Gt,ad]of Object.entries(tr))Er(Gt,ad);let ir=Sn.unchanged===!0;if(!ir){ea(n,Sn);let Gt=Sn.version;typeof Gt=="string"&&Ns.set(n,Gt)}if(ho(n,!1),ta(n,f),y)return;ir||c(Sn),p(!1)}catch{if(ho(n,!1),y)return;p(!1)}};return zn(n)===null?fe():K=window.setTimeout(function(){K=0,fe()},Yu),function(){y=!0,K!==0&&window.clearTimeout(K)}},[s,n,f]);let b=Cs(Object.values(t??{}),n,!1),w=d!==null?Cs(d.tickets.filter(y=>y.sourceSessionId!==n),n,!0):[],x=b.length>0?b[0].workspaceKey:void 0,A=[...b,...w];Jr(n,A);let _=i??{},W=o??{},E={},Y={};if(d!==null){for(let[y,K]of Object.entries(d.evidence))y.startsWith(n+":")||(E[y]=K);for(let[y,K]of Object.entries(d.comments))y.startsWith(n+":")||(Y[y]=K)}let de=tp({...E,..._}),S={...Y,...W},F=mr(A,de),H=A.length-F.length,Ve=F.length,Ke=new Set(A.map(y=>y.workspaceKey)),We=A.length===0?"default":Ke.size===1?A[0].workspaceKey:`default:${n}`,[Oe,nn]=M.default.useState(function(){return Be(Qe)}),[T,h]=M.default.useState(function(){let y=fo(n);return y===null?null:y}),I=T,L=M.default.useCallback(function(y){let K=ni(n);K!==null&&Vr(n,me(K)),gn(n,y),h(y)},[n]);M.default.useEffect(function(){return Hr(function(y){if(y!==n)return;let K=fo(n);h(K===null?null:K)})},[n]);let $=function(y){let[K,fe]=M.default.useState(()=>Dr(n,y));return[K,function(Sn){Kr(n,y,Sn),fe(Sn)}]},[ce,ge]=$("create"),[xe,Ie]=$("plan"),[Ae,Zn]=$("queue"),[Jn,Yn]=$("retired"),[Tt,Et]=$("tags");M.default.useEffect(function(){return po(Ae||ce||xe||Jn||Tt),function(){po(!1)}},[Ae,ce,xe,Jn,Tt]);let[qt,qi]=M.default.useState([]),[yn,Ut]=M.default.useState([]),qe=new Set(b.map(y=>q(y))),Ui=new Set(yn.map(y=>String(y.ticketId)).filter(y=>qe.has(y))),[Xn,z]=M.default.useState(null),pn=M.default.useCallback(function(){z(null),O("actionNominations",{},n).then(y=>{let K=y??[];qi(K);let fe=jn();xo({nominations:K,approvals:fe?.approvals??[],at:Date.now()})}).catch(y=>{let K="nominations: "+(y instanceof Error?y.message:String(y));z(fe=>fe==null?K:fe+"; "+K)}),O("pendingApprovals",{},n).then(y=>{let K=y??[];Ut(K);let fe=jn();xo({nominations:fe?.nominations??[],approvals:K,at:Date.now()})}).catch(y=>{let K="approvals: "+(y instanceof Error?y.message:String(y));z(fe=>fe==null?K:fe+"; "+K)})},[n]);M.default.useEffect(function(){pn();let y=setInterval(pn,_a(Ae));return function(){clearInterval(y)}},[Ae,pn]);let[ke,se]=M.default.useState(!1),Mn=M.default.useRef(!1),tn=M.default.useRef(!1),et=M.default.useRef(null);rp(et);let nt=vr(F);M.default.useEffect(function(){s&&Mr(n,nt)},[n,s,nt]),M.default.useEffect(function(){s&&X("board loaded: "+Ve+" tickets")},[s]),M.default.useEffect(function(){if(!s||tn.current)return;tn.current=!0;let y=ip(We,A);nn(y),lo(n,y)},[s,We]),M.default.useEffect(function(){if(!s||Mn.current)return;Mn.current=!0;let y=op(window.location.search);if(y===null)return;let K=gr(y,A);K!==null?L(q(K)):X(`#100 deep link ${y} does not resolve on this board`)},[s]),M.default.useEffect(function(){return X("#100 ProjectionReader MOUNTED"),console.info("[aidos] board MOUNT"),function(){let y=new URL(window.location.href).searchParams.has("ticket");ze(`#100 ProjectionReader UNMOUNTING; ticket param present=${y}`+(y?" -> KEPT (round 4: it is what restores the selection after a reload)":"")),console.info("[aidos] board UNMOUNT <- if you see this when opening the queue, it is a remount")}},[]),M.default.useEffect(function(){if(s){se(!1);return}let y=window.setTimeout(function(){se(!0)},5e3);return function(){window.clearTimeout(y)}},[s]);let N=ke&&!s?M.default.createElement("div",{className:"aidos-error"},M.default.createElement("span",null,"The board projection is unavailable. Retry to re-read it."),M.default.createElement("button",{className:"aidos-btn",onClick:e.onRetry},"Retry")):null,P=br(F,Oe),G=(function(){let y=new Set;for(let K of F)for(let fe of K.tags??[])y.add(fe);return y.size})();function te(y){let K=Be(y);nn(K),lo(n,K);try{window.localStorage.setItem(_s(We),JSON.stringify(K))}catch{}}function Se(){te(Be(Qe))}function Ee(y){if(I===y){ze(`#100 selectTicket(${y}) matched the open selection -> TOGGLING CLOSED`),Ht();return}X(`#100 selectTicket(${y})`),L(y),Ot(y)}function Ht(){ze("#100 closeDetail() called; stack: "+(new Error().stack??"unavailable").split(`
`).slice(1,5).join(" <- ")),L(null),Ot(null)}let Ln=M.default.useRef(null),Pe=Ar(A,I,Gr(n,Ln.current));Wr(n,Pe.reason,Pe.ticket);let Xo=M.default.useRef(""),Hi=`${Pe.reason}|sel=${I??"-"}|rows=${A.length}|own=${b.length}|foreign=${w.length}|ref=${Ln.current===null?"null":"held"}|store=${ni(n)===null?"null":"held"}`;Hi!==Xo.current&&(I!==null||Ln.current!==null)&&(Xo.current=Hi,(Pe.reason==="gone"||Pe.reason==="held"?ze:X)(`#100 select: ${Hi}`)),Pe.reason==="resolved"||Pe.reason==="reanchored"||Pe.reason==="held"?Ln.current=Pe.ticket:(Pe.reason==="none"||Pe.reason==="gone")&&(Ln.current=null);let Gi=Pe.reanchorKey;M.default.useEffect(function(){Gi!==null&&L(Gi)},[Gi]);let xn=Pe.ticket,Rt=xn===null?null:q(xn),er=Is(F),Wl=er===null?null:q(er),Wi=Rt===null?[]:de[Rt]??[],Ql=Rt===null?[]:S[Rt]??[],[Zl,nr]=M.default.useState(function(){return eo(Wi)});M.default.useEffect(function(){nr(eo(Wi))},[xn?.id]);let Qi=new Map,Zi=(y,K)=>{Qi.has(y)||Qi.set(y,K)};for(let y of A)Zi(q(y),y),Zi(String(y.id),y),Zi(y.workspaceKey+":"+String(y.id),y);let Jl=Pe.absent?M.default.createElement("div",{className:"aidos-detail-absent",role:"status"},"This ticket is not on the board right now. You are seeing the last version that loaded. Close the panel to return to the grid."):null,tt=xn===null?null:me(xn),it=M.default.useRef(null);tt!==it.current&&(it.current!==null&&tt!==null?ze(`#100 DetailView KEY CHANGED ${it.current} -> ${tt}; it remounts, and the dialog store is what carries the modals through`):it.current!==null&&tt===null&&ze(`#100 detail panel CLOSING (was ${it.current})`),it.current=tt);let Yl=xn===null?null:M.default.createElement(M.default.Fragment,null,Jl,M.default.createElement(yi,{key:tt,ticket:xn,evidence:Wi,comments:Ql,evidenceCollapsed:Zl,onToggleEvidence:()=>{nr(y=>!y)},onClose:Ht,agentId:n,ticketIdKey:Rt??String(xn.id),onFieldSaved:function(){},ticketsByKey:Qi,onJump:Ee})),Xl=M.default.createElement(ks,{open:ce,onClose:()=>{ge(!1)},onCreated:y=>{Ee(String(y))},agentId:n}),ed=u&&A.length===0,It;if(N!==null)It=N;else if(!s)It=M.default.createElement("div",{className:"aidos-skeleton-grid"},[0,1,2,3,4,5].map(y=>M.default.createElement("div",{className:"aidos-skeleton-tile",key:y})));else if(ed)It=M.default.createElement("div",{className:"aidos-merge-loading",role:"status"},M.default.createElement("span",{className:"aidos-merge-spinner","aria-hidden":"true"}),M.default.createElement("span",null,"Loading workspace tickets\u2026"));else{let y=Es(F,de,qt,yn);It=M.default.createElement(vs,{ownWorkspaceKey:x,awaitingApprovalKeys:Ui,sessionId:n,tickets:P,allTicketsCount:Ve,applied:Oe,selectedId:I,activeTicketId:Wl,evidenceByTicket:de,onSelect:Ee,onApply:te,onJump:Ee,onClearFilters:Se,onPlan:()=>{Ie(!0)},onCreate:()=>{ge(!0)},onQueue:()=>{Zn(!0)},onTags:()=>{Et(!0)},tagsTotal:G,onRetired:()=>{Yn(!0)},retiredCount:H,queueTotal:y.length,agentAskCount:Ea(y),agentAskCountStale:Xn!==null})}async function nd(y,K){if(K.status==="rejected"){y.approvalId!==void 0&&await Lt(n,y.approvalId,!1);return}try{if(y.approvalId!==void 0){let fe=K.values[0],At=fe!==void 0&&fe.kind==="path-list"?fe.paths:[];await Lt(n,y.approvalId,!0,At);return}}catch(fe){throw R(fe instanceof Error?fe.message:String(fe),"refusal"),fe}}let td=Ae?M.default.createElement(be,{title:"Waiting on you",wide:!0,onClose:()=>{Zn(!1)}},M.default.createElement(Ts,{sessionId:n,tickets:F,evidenceByTicket:de,nominations:qt,approvals:yn,error:Xn,onRefresh:pn,onOpen:y=>{Zn(!1),Ee(y.boardKey)},onAct:async(y,K)=>{await nd(y,K),pn()},onDismiss:y=>{O("dismissNomination",{nominationId:y},n).then(()=>{R("Suggestion dismissed","info"),pn()}).catch(K=>{R(K instanceof Error?K.message:String(K),"refusal")})}})):null,id=Jn?M.default.createElement(be,{title:"Retired tickets",wide:!0,onClose:()=>{Yn(!1)}},M.default.createElement(ms,{sessionId:n,onOpen:y=>{Yn(!1),Ee(y)}})):null,od=Tt?M.default.createElement(Rs,{sessionId:n,onOpen:y=>{Et(!1),Ee(y)},onClose:()=>{Et(!1)}}):null,rd=M.default.createElement(ys,{open:xe,planMeta:l===null?null:{frontmatter:l.frontmatter,preamble:l.context.preamble,contextSections:l.context.contextSections},agentId:n,onClose:()=>{Ie(!1)}});return M.default.createElement(M.default.Fragment,null,M.default.createElement("div",{className:"aidos-layout",ref:et,"data-conversation-composer-overlay":""},It,Yl),Xl,rd,td,id,od,M.default.createElement(As,null))}var St=ee(require("react"),1);var ae=ee(require("react"),1);var Xs=ee(Ys(),1);var Ci=Xs.default;function el(e){let n=e.regex,t={},i={begin:/\$\{/,end:/\}/,contains:["self",{begin:/:-/,contains:[t]}]};Object.assign(t,{className:"variable",variants:[{begin:n.concat(/\$[\w\d#@][\w\d_]*/,"(?![\\w\\d])(?![$])")},i]});let o={className:"subst",begin:/\$\(/,end:/\)/,contains:[e.BACKSLASH_ESCAPE]},r=e.inherit(e.COMMENT(),{match:[/(^|\s)/,/#.*$/],scope:{2:"comment"}}),s={begin:/<<-?\s*(?=\w+)/,starts:{contains:[e.END_SAME_AS_BEGIN({begin:/(\w+)/,end:/(\w+)/,className:"string"})]}},a={className:"string",begin:/"/,end:/"/,contains:[e.BACKSLASH_ESCAPE,t,o]};o.contains.push(a);let l={match:/\\"/},d={className:"string",begin:/'/,end:/'/},c={match:/\\'/},u={begin:/\$?\(\(/,end:/\)\)/,contains:[{begin:/\d+#[0-9a-f]+/,className:"number"},e.NUMBER_MODE,t]},p=["fish","bash","zsh","sh","csh","ksh","tcsh","dash","scsh"],f=e.SHEBANG({binary:`(${p.join("|")})`,relevance:10}),b={className:"function",begin:/\w[\w\d_]*\s*\(\s*\)\s*\{/,returnBegin:!0,contains:[e.inherit(e.TITLE_MODE,{begin:/\w[\w\d_]*/})],relevance:0},w=["if","then","else","elif","fi","time","for","while","until","in","do","done","case","esac","coproc","function","select"],x=["true","false"],m={match:/(\/[a-z._-]+)+/},A=["break","cd","continue","eval","exec","exit","export","getopts","hash","pwd","readonly","return","shift","test","times","trap","umask","unset"],_=["alias","bind","builtin","caller","command","declare","echo","enable","help","let","local","logout","mapfile","printf","read","readarray","source","sudo","type","typeset","ulimit","unalias"],W=["autoload","bg","bindkey","bye","cap","chdir","clone","comparguments","compcall","compctl","compdescribe","compfiles","compgroups","compquote","comptags","comptry","compvalues","dirs","disable","disown","echotc","echoti","emulate","fc","fg","float","functions","getcap","getln","history","integer","jobs","kill","limit","log","noglob","popd","print","pushd","pushln","rehash","sched","setcap","setopt","stat","suspend","ttyctl","unfunction","unhash","unlimit","unsetopt","vared","wait","whence","where","which","zcompile","zformat","zftp","zle","zmodload","zparseopts","zprof","zpty","zregexparse","zsocket","zstyle","ztcp"],E=["chcon","chgrp","chown","chmod","cp","dd","df","dir","dircolors","ln","ls","mkdir","mkfifo","mknod","mktemp","mv","realpath","rm","rmdir","shred","sync","touch","truncate","vdir","b2sum","base32","base64","cat","cksum","comm","csplit","cut","expand","fmt","fold","head","join","md5sum","nl","numfmt","od","paste","ptx","pr","sha1sum","sha224sum","sha256sum","sha384sum","sha512sum","shuf","sort","split","sum","tac","tail","tr","tsort","unexpand","uniq","wc","arch","basename","chroot","date","dirname","du","echo","env","expr","factor","groups","hostid","id","link","logname","nice","nohup","nproc","pathchk","pinky","printenv","printf","pwd","readlink","runcon","seq","sleep","stat","stdbuf","stty","tee","test","timeout","tty","uname","unlink","uptime","users","who","whoami","yes"];return{name:"Bash",aliases:["sh","zsh"],keywords:{$pattern:/\b[a-z][a-z0-9._-]+\b/,keyword:w,literal:x,built_in:[...A,..._,"set","shopt",...W,...E]},contains:[f,e.SHEBANG(),b,u,r,s,m,a,l,d,c,t]}}var nl="[A-Za-z$_][0-9A-Za-z$_]*",Zp=["as","in","of","if","for","while","finally","var","new","function","do","return","void","else","break","catch","instanceof","with","throw","case","default","try","switch","continue","typeof","delete","let","yield","const","class","debugger","async","await","static","import","from","export","extends","using"],Jp=["true","false","null","undefined","NaN","Infinity"],tl=["Object","Function","Boolean","Symbol","Math","Date","Number","BigInt","String","RegExp","Array","Float32Array","Float64Array","Int8Array","Uint8Array","Uint8ClampedArray","Int16Array","Int32Array","Uint16Array","Uint32Array","BigInt64Array","BigUint64Array","Set","Map","WeakSet","WeakMap","ArrayBuffer","SharedArrayBuffer","Atomics","DataView","JSON","Promise","Generator","GeneratorFunction","AsyncFunction","Reflect","Proxy","Intl","WebAssembly"],il=["Error","EvalError","InternalError","RangeError","ReferenceError","SyntaxError","TypeError","URIError"],ol=["setInterval","setTimeout","clearInterval","clearTimeout","require","exports","eval","isFinite","isNaN","parseFloat","parseInt","decodeURI","decodeURIComponent","encodeURI","encodeURIComponent","escape","unescape"],Yp=["arguments","this","super","console","window","document","localStorage","sessionStorage","module","self","global"],Xp=[].concat(ol,tl,il);function rl(e){let n=e.regex,t=(I,{after:L})=>{let $="</"+I[0].slice(1);return I.input.indexOf($,L)!==-1},i=nl,o={begin:"<>",end:"</>"},r=/<[A-Za-z0-9\\._:-]+\s*\/>/,s={begin:/<[A-Za-z0-9\\._:-]+/,end:/\/[A-Za-z0-9\\._:-]+>|\/>/,isTrulyOpeningTag:(I,L)=>{let $=I[0].length+I.index,ce=I.input[$];if(ce==="<"||ce===","){L.ignoreMatch();return}ce===">"&&(t(I,{after:$})||L.ignoreMatch());let ge,xe=I.input.substring($);if(ge=xe.match(/^\s*=/)){L.ignoreMatch();return}if((ge=xe.match(/^\s+extends\s+/))&&ge.index===0){L.ignoreMatch();return}}},a={$pattern:nl,keyword:Zp,literal:Jp,built_in:Xp,"variable.language":Yp},l="[0-9](_?[0-9])*",d=`\\.(${l})`,c="0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*",u={className:"number",variants:[{begin:`(\\b(${c})((${d})|\\.)?|(${d}))[eE][+-]?(${l})\\b`},{begin:`\\b(${c})\\b((${d})\\b|\\.)?|(${d})\\b`},{begin:"\\b(0|[1-9](_?[0-9])*)n\\b"},{begin:"\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*n?\\b"},{begin:"\\b0[bB][0-1](_?[0-1])*n?\\b"},{begin:"\\b0[oO][0-7](_?[0-7])*n?\\b"},{begin:"\\b0[0-7]+n?\\b"}],relevance:0},p={className:"subst",begin:"\\$\\{",end:"\\}",keywords:a,contains:[]},f={begin:".?html`",end:"",starts:{end:"`",returnEnd:!1,contains:[e.BACKSLASH_ESCAPE,p],subLanguage:"xml"}},b={begin:".?css`",end:"",starts:{end:"`",returnEnd:!1,contains:[e.BACKSLASH_ESCAPE,p],subLanguage:"css"}},w={begin:".?gql`",end:"",starts:{end:"`",returnEnd:!1,contains:[e.BACKSLASH_ESCAPE,p],subLanguage:"graphql"}},x={className:"string",begin:"`",end:"`",contains:[e.BACKSLASH_ESCAPE,p]},A={className:"comment",variants:[e.COMMENT(/\/\*\*(?!\/)/,"\\*/",{relevance:0,contains:[{begin:"(?=@[A-Za-z]+)",relevance:0,contains:[{className:"doctag",begin:"@[A-Za-z]+"},{className:"type",begin:"\\{",end:"\\}",excludeEnd:!0,excludeBegin:!0,relevance:0},{className:"variable",begin:i+"(?=\\s*(-)|$)",endsParent:!0,relevance:0},{begin:/(?=[^\n])\s/,relevance:0}]}]}),e.C_BLOCK_COMMENT_MODE,e.C_LINE_COMMENT_MODE]},_=[e.APOS_STRING_MODE,e.QUOTE_STRING_MODE,f,b,w,x,{match:/\$\d+/},u];p.contains=_.concat({begin:/\{/,end:/\}/,keywords:a,contains:["self"].concat(_)});let W=[].concat(A,p.contains),E=W.concat([{begin:/(\s*)\(/,end:/\)/,keywords:a,contains:["self"].concat(W)}]),Y={className:"params",begin:/(\s*)\(/,end:/\)/,excludeBegin:!0,excludeEnd:!0,keywords:a,contains:E},de={variants:[{match:[/class/,/\s+/,i,/\s+/,/extends/,/\s+/,n.concat(i,"(",n.concat(/\./,i),")*")],scope:{1:"keyword",3:"title.class",5:"keyword",7:"title.class.inherited"}},{match:[/class/,/\s+/,i],scope:{1:"keyword",3:"title.class"}}]},S={relevance:0,match:n.either(/\bJSON/,/\b[A-Z][a-z]+([A-Z][a-z]*|\d)*/,/\b[A-Z]{2,}([A-Z][a-z]+|\d)+([A-Z][a-z]*)*/,/\b[A-Z]{2,}[a-z]+([A-Z][a-z]+|\d)*([A-Z][a-z]*)*/),className:"title.class",keywords:{_:[...tl,...il]}},F={label:"use_strict",className:"meta",relevance:10,begin:/^\s*['"]use (strict|asm)['"]/},H={variants:[{match:[/function/,/\s+/,i,/(?=\s*\()/]},{match:[/function/,/\s*(?=\()/]}],className:{1:"keyword",3:"title.function"},label:"func.def",contains:[Y],illegal:/%/},Ve={relevance:0,match:/\b[A-Z][A-Z_0-9]+\b/,className:"variable.constant"};function Ke(I){return n.concat("(?!",I.join("|"),")")}let We={match:n.concat(/\b/,Ke([...ol,"super","import","await"].map(I=>`${I}\\s*\\(`)),i,n.lookahead(/\s*\(/)),className:"title.function",relevance:0},Oe={begin:n.concat(/\./,n.lookahead(n.concat(i,/(?![0-9A-Za-z$_(])/))),end:i,excludeBegin:!0,keywords:"prototype",className:"property",relevance:0},nn={match:[/get|set/,/\s+/,i,/(?=\()/],className:{1:"keyword",3:"title.function"},contains:[{begin:/\(\)/},Y]},T="(\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)|"+e.UNDERSCORE_IDENT_RE+")\\s*=>",h={match:[/const|var|let/,/\s+/,i,/\s*/,/=\s*/,/(async\s*)?/,n.lookahead(T)],keywords:"async",className:{1:"keyword",3:"title.function"},contains:[Y]};return{name:"JavaScript",aliases:["js","jsx","mjs","cjs"],keywords:a,exports:{PARAMS_CONTAINS:E,CLASS_REFERENCE:S},illegal:/#(?![$_A-Za-z])/,contains:[e.SHEBANG({label:"shebang",binary:"node",relevance:5}),F,e.APOS_STRING_MODE,e.QUOTE_STRING_MODE,f,b,w,x,A,{match:/\$\d+/},u,S,{scope:"attr",match:i+n.lookahead(":"),relevance:0},h,{begin:"("+e.RE_STARTERS_RE+"|\\b(case|return|throw)\\b)\\s*",keywords:"return throw case",relevance:0,contains:[A,e.REGEXP_MODE,{className:"function",begin:T,returnBegin:!0,end:"\\s*=>",contains:[{className:"params",variants:[{begin:e.UNDERSCORE_IDENT_RE,relevance:0},{className:null,begin:/\(\s*\)/,skip:!0},{begin:/(\s*)\(/,end:/\)/,excludeBegin:!0,excludeEnd:!0,keywords:a,contains:E}]}]},{begin:/,/,relevance:0},{match:/\s+/,relevance:0},{variants:[{begin:o.begin,end:o.end},{match:r},{begin:s.begin,"on:begin":s.isTrulyOpeningTag,end:s.end}],subLanguage:"xml",contains:[{begin:s.begin,end:s.end,skip:!0,contains:["self"]}]}]},H,{beginKeywords:"while if switch catch for"},{begin:"\\b(?!function)"+e.UNDERSCORE_IDENT_RE+"\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)\\s*\\{",returnBegin:!0,label:"func.def",contains:[Y,e.inherit(e.TITLE_MODE,{begin:i,className:"title.function"})]},{match:/\.\.\./,relevance:0},Oe,{match:"\\$"+i,relevance:0},{match:[/\bconstructor(?=\s*\()/],className:{1:"title.function"},contains:[Y]},We,Ve,de,nn,{match:/\$[(.]/}]}}var ef="([-+]?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)|NaN|[-+]?Infinity",nf={scope:"number",match:ef,relevance:0};function al(e){let n={className:"attr",begin:/(("(\\.|[^\\"\r\n])*")|('(\\.|[^\\'\r\n])*'))(?=\s*:)/,relevance:1.01},t={match:/[{}[\],:]/,className:"punctuation",relevance:0},i=["true","false","null"],o={scope:"literal",beginKeywords:i.join(" ")};return{name:"JSON",aliases:["jsonc","json5"],keywords:{literal:i},contains:[n,t,e.APOS_STRING_MODE,e.QUOTE_STRING_MODE,o,nf,e.C_LINE_COMMENT_MODE,e.C_BLOCK_COMMENT_MODE],illegal:"\\S"}}function sl(e){let n=e.regex,t=/[\p{XID_Start}_]\p{XID_Continue}*/u,i=["and","as","assert","async","await","break","case","class","continue","def","del","elif","else","except","finally","for","from","global","if","import","in","is","lambda","lazy","match","nonlocal|10","not","or","pass","raise","return","try","while","with","yield"],a={$pattern:/[A-Za-z]\w+|__\w+__/,keyword:i,built_in:["__import__","abs","aiter","all","anext","any","ascii","bin","bool","breakpoint","bytearray","bytes","callable","chr","classmethod","compile","complex","delattr","dict","dir","divmod","enumerate","eval","exec","filter","float","format","frozendict","frozenset","getattr","globals","hasattr","hash","help","hex","id","input","int","isinstance","issubclass","iter","len","list","locals","map","max","memoryview","min","next","object","oct","open","ord","pow","print","property","range","repr","reversed","round","sentinel","set","setattr","slice","sorted","staticmethod","str","sum","super","tuple","type","vars","zip"],literal:["__debug__","Ellipsis","False","None","NotImplemented","True"],type:["Any","Callable","Coroutine","Dict","List","Literal","Generic","Optional","Sequence","Set","Tuple","Type","Union"]},l={className:"meta",begin:/^(>>>|\.\.\.) /},d={className:"subst",begin:/\{/,end:/\}/,keywords:a,illegal:/#/},c={begin:/\{\{/,relevance:0},u={className:"string",contains:[e.BACKSLASH_ESCAPE],variants:[{begin:/([uU]|[bB]|[rR]|[bB][rR]|[rR][bB])?'''/,end:/'''/,contains:[e.BACKSLASH_ESCAPE,l],relevance:10},{begin:/([uU]|[bB]|[rR]|[bB][rR]|[rR][bB])?"""/,end:/"""/,contains:[e.BACKSLASH_ESCAPE,l],relevance:10},{begin:/([fFtT][rR]|[rR][fFtT]|[fFtT])'''/,end:/'''/,contains:[e.BACKSLASH_ESCAPE,l,c,d]},{begin:/([fFtT][rR]|[rR][fFtT]|[fFtT])"""/,end:/"""/,contains:[e.BACKSLASH_ESCAPE,l,c,d]},{begin:/([uU]|[rR])'/,end:/'/,relevance:10},{begin:/([uU]|[rR])"/,end:/"/,relevance:10},{begin:/([bB]|[bB][rR]|[rR][bB])'/,end:/'/},{begin:/([bB]|[bB][rR]|[rR][bB])"/,end:/"/},{begin:/([fFtT][rR]|[rR][fFtT]|[fFtT])'/,end:/'/,contains:[e.BACKSLASH_ESCAPE,c,d]},{begin:/([fFtT][rR]|[rR][fFtT]|[fFtT])"/,end:/"/,contains:[e.BACKSLASH_ESCAPE,c,d]},e.APOS_STRING_MODE,e.QUOTE_STRING_MODE]},p="[0-9](_?[0-9])*",f=`(\\b(${p}))?\\.(${p})|\\b(${p})\\.`,b=`\\b|${i.join("|")}`,w={className:"number",relevance:0,variants:[{begin:`(\\b(${p})|(${f}))[eE][+-]?(${p})[jJ]?(?=${b})`},{begin:`(${f})[jJ]?`},{begin:`\\b([1-9](_?[0-9])*|0+(_?0)*)[lLjJ]?(?=${b})`},{begin:`\\b0[bB](_?[01])+[lL]?(?=${b})`},{begin:`\\b0[oO](_?[0-7])+[lL]?(?=${b})`},{begin:`\\b0[xX](_?[0-9a-fA-F])+[lL]?(?=${b})`},{begin:`\\b(${p})[jJ](?=${b})`}]},x={className:"comment",begin:n.lookahead(/# type:/),end:/$/,keywords:a,contains:[{begin:/# type:/},{begin:/#/,end:/\b\B/,endsWithParent:!0}]},m={className:"params",variants:[{className:"",begin:/\(\s*\)/,skip:!0},{begin:/\(/,end:/\)/,excludeBegin:!0,excludeEnd:!0,keywords:a,contains:["self",l,w,u,e.HASH_COMMENT_MODE]}]};return d.contains=[u,w,l],{name:"Python",aliases:["py","gyp","ipython"],unicodeRegex:!0,keywords:a,illegal:/(<\/|\?)|=>/,contains:[l,w,{scope:"variable.language",match:/\bself\b/},{beginKeywords:"if",relevance:0},{match:/\bor\b/,scope:"keyword"},u,x,e.HASH_COMMENT_MODE,{match:[/\bdef/,/\s+/,t],scope:{1:"keyword",3:"title.function"},contains:[m]},{variants:[{match:[/\bclass/,/\s+/,t,/\s*/,/\(\s*/,t,/\s*\)/]},{match:[/\bclass/,/\s+/,t]}],scope:{1:"keyword",3:"title.class",6:"title.class.inherited"}},{className:"meta",begin:/^[\t ]*@/,end:/(?=#)|$/,contains:[w,m,u]}]}}var _i="[A-Za-z$_][0-9A-Za-z$_]*",ll=["as","in","of","if","for","while","finally","var","new","function","do","return","void","else","break","catch","instanceof","with","throw","case","default","try","switch","continue","typeof","delete","let","yield","const","class","debugger","async","await","static","import","from","export","extends","using"],dl=["true","false","null","undefined","NaN","Infinity"],cl=["Object","Function","Boolean","Symbol","Math","Date","Number","BigInt","String","RegExp","Array","Float32Array","Float64Array","Int8Array","Uint8Array","Uint8ClampedArray","Int16Array","Int32Array","Uint16Array","Uint32Array","BigInt64Array","BigUint64Array","Set","Map","WeakSet","WeakMap","ArrayBuffer","SharedArrayBuffer","Atomics","DataView","JSON","Promise","Generator","GeneratorFunction","AsyncFunction","Reflect","Proxy","Intl","WebAssembly"],ul=["Error","EvalError","InternalError","RangeError","ReferenceError","SyntaxError","TypeError","URIError"],pl=["setInterval","setTimeout","clearInterval","clearTimeout","require","exports","eval","isFinite","isNaN","parseFloat","parseInt","decodeURI","decodeURIComponent","encodeURI","encodeURIComponent","escape","unescape"],fl=["arguments","this","super","console","window","document","localStorage","sessionStorage","module","self","global"],hl=[].concat(pl,cl,ul);function tf(e){let n=e.regex,t=(I,{after:L})=>{let $="</"+I[0].slice(1);return I.input.indexOf($,L)!==-1},i=_i,o={begin:"<>",end:"</>"},r=/<[A-Za-z0-9\\._:-]+\s*\/>/,s={begin:/<[A-Za-z0-9\\._:-]+/,end:/\/[A-Za-z0-9\\._:-]+>|\/>/,isTrulyOpeningTag:(I,L)=>{let $=I[0].length+I.index,ce=I.input[$];if(ce==="<"||ce===","){L.ignoreMatch();return}ce===">"&&(t(I,{after:$})||L.ignoreMatch());let ge,xe=I.input.substring($);if(ge=xe.match(/^\s*=/)){L.ignoreMatch();return}if((ge=xe.match(/^\s+extends\s+/))&&ge.index===0){L.ignoreMatch();return}}},a={$pattern:_i,keyword:ll,literal:dl,built_in:hl,"variable.language":fl},l="[0-9](_?[0-9])*",d=`\\.(${l})`,c="0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*",u={className:"number",variants:[{begin:`(\\b(${c})((${d})|\\.)?|(${d}))[eE][+-]?(${l})\\b`},{begin:`\\b(${c})\\b((${d})\\b|\\.)?|(${d})\\b`},{begin:"\\b(0|[1-9](_?[0-9])*)n\\b"},{begin:"\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*n?\\b"},{begin:"\\b0[bB][0-1](_?[0-1])*n?\\b"},{begin:"\\b0[oO][0-7](_?[0-7])*n?\\b"},{begin:"\\b0[0-7]+n?\\b"}],relevance:0},p={className:"subst",begin:"\\$\\{",end:"\\}",keywords:a,contains:[]},f={begin:".?html`",end:"",starts:{end:"`",returnEnd:!1,contains:[e.BACKSLASH_ESCAPE,p],subLanguage:"xml"}},b={begin:".?css`",end:"",starts:{end:"`",returnEnd:!1,contains:[e.BACKSLASH_ESCAPE,p],subLanguage:"css"}},w={begin:".?gql`",end:"",starts:{end:"`",returnEnd:!1,contains:[e.BACKSLASH_ESCAPE,p],subLanguage:"graphql"}},x={className:"string",begin:"`",end:"`",contains:[e.BACKSLASH_ESCAPE,p]},A={className:"comment",variants:[e.COMMENT(/\/\*\*(?!\/)/,"\\*/",{relevance:0,contains:[{begin:"(?=@[A-Za-z]+)",relevance:0,contains:[{className:"doctag",begin:"@[A-Za-z]+"},{className:"type",begin:"\\{",end:"\\}",excludeEnd:!0,excludeBegin:!0,relevance:0},{className:"variable",begin:i+"(?=\\s*(-)|$)",endsParent:!0,relevance:0},{begin:/(?=[^\n])\s/,relevance:0}]}]}),e.C_BLOCK_COMMENT_MODE,e.C_LINE_COMMENT_MODE]},_=[e.APOS_STRING_MODE,e.QUOTE_STRING_MODE,f,b,w,x,{match:/\$\d+/},u];p.contains=_.concat({begin:/\{/,end:/\}/,keywords:a,contains:["self"].concat(_)});let W=[].concat(A,p.contains),E=W.concat([{begin:/(\s*)\(/,end:/\)/,keywords:a,contains:["self"].concat(W)}]),Y={className:"params",begin:/(\s*)\(/,end:/\)/,excludeBegin:!0,excludeEnd:!0,keywords:a,contains:E},de={variants:[{match:[/class/,/\s+/,i,/\s+/,/extends/,/\s+/,n.concat(i,"(",n.concat(/\./,i),")*")],scope:{1:"keyword",3:"title.class",5:"keyword",7:"title.class.inherited"}},{match:[/class/,/\s+/,i],scope:{1:"keyword",3:"title.class"}}]},S={relevance:0,match:n.either(/\bJSON/,/\b[A-Z][a-z]+([A-Z][a-z]*|\d)*/,/\b[A-Z]{2,}([A-Z][a-z]+|\d)+([A-Z][a-z]*)*/,/\b[A-Z]{2,}[a-z]+([A-Z][a-z]+|\d)*([A-Z][a-z]*)*/),className:"title.class",keywords:{_:[...cl,...ul]}},F={label:"use_strict",className:"meta",relevance:10,begin:/^\s*['"]use (strict|asm)['"]/},H={variants:[{match:[/function/,/\s+/,i,/(?=\s*\()/]},{match:[/function/,/\s*(?=\()/]}],className:{1:"keyword",3:"title.function"},label:"func.def",contains:[Y],illegal:/%/},Ve={relevance:0,match:/\b[A-Z][A-Z_0-9]+\b/,className:"variable.constant"};function Ke(I){return n.concat("(?!",I.join("|"),")")}let We={match:n.concat(/\b/,Ke([...pl,"super","import","await"].map(I=>`${I}\\s*\\(`)),i,n.lookahead(/\s*\(/)),className:"title.function",relevance:0},Oe={begin:n.concat(/\./,n.lookahead(n.concat(i,/(?![0-9A-Za-z$_(])/))),end:i,excludeBegin:!0,keywords:"prototype",className:"property",relevance:0},nn={match:[/get|set/,/\s+/,i,/(?=\()/],className:{1:"keyword",3:"title.function"},contains:[{begin:/\(\)/},Y]},T="(\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)|"+e.UNDERSCORE_IDENT_RE+")\\s*=>",h={match:[/const|var|let/,/\s+/,i,/\s*/,/=\s*/,/(async\s*)?/,n.lookahead(T)],keywords:"async",className:{1:"keyword",3:"title.function"},contains:[Y]};return{name:"JavaScript",aliases:["js","jsx","mjs","cjs"],keywords:a,exports:{PARAMS_CONTAINS:E,CLASS_REFERENCE:S},illegal:/#(?![$_A-Za-z])/,contains:[e.SHEBANG({label:"shebang",binary:"node",relevance:5}),F,e.APOS_STRING_MODE,e.QUOTE_STRING_MODE,f,b,w,x,A,{match:/\$\d+/},u,S,{scope:"attr",match:i+n.lookahead(":"),relevance:0},h,{begin:"("+e.RE_STARTERS_RE+"|\\b(case|return|throw)\\b)\\s*",keywords:"return throw case",relevance:0,contains:[A,e.REGEXP_MODE,{className:"function",begin:T,returnBegin:!0,end:"\\s*=>",contains:[{className:"params",variants:[{begin:e.UNDERSCORE_IDENT_RE,relevance:0},{className:null,begin:/\(\s*\)/,skip:!0},{begin:/(\s*)\(/,end:/\)/,excludeBegin:!0,excludeEnd:!0,keywords:a,contains:E}]}]},{begin:/,/,relevance:0},{match:/\s+/,relevance:0},{variants:[{begin:o.begin,end:o.end},{match:r},{begin:s.begin,"on:begin":s.isTrulyOpeningTag,end:s.end}],subLanguage:"xml",contains:[{begin:s.begin,end:s.end,skip:!0,contains:["self"]}]}]},H,{beginKeywords:"while if switch catch for"},{begin:"\\b(?!function)"+e.UNDERSCORE_IDENT_RE+"\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)\\s*\\{",returnBegin:!0,label:"func.def",contains:[Y,e.inherit(e.TITLE_MODE,{begin:i,className:"title.function"})]},{match:/\.\.\./,relevance:0},Oe,{match:"\\$"+i,relevance:0},{match:[/\bconstructor(?=\s*\()/],className:{1:"title.function"},contains:[Y]},We,Ve,de,nn,{match:/\$[(.]/}]}}function gl(e){let n=e.regex,t=tf(e),i=_i,o=["any","void","number","boolean","string","object","never","symbol","bigint","unknown"],r={begin:[/namespace/,/\s+/,e.IDENT_RE],beginScope:{1:"keyword",3:"title.class"}},s={beginKeywords:"interface",end:/\{/,excludeEnd:!0,keywords:{keyword:"interface extends",built_in:o},contains:[t.exports.CLASS_REFERENCE]},a={className:"meta",relevance:10,begin:/^\s*['"]use strict['"]/},l=["type","interface","public","private","protected","implements","declare","abstract","readonly","enum","override","satisfies"],d={$pattern:_i,keyword:ll.concat(l),literal:dl,built_in:hl.concat(o),"variable.language":fl},c={className:"meta",begin:"@"+i},u=(w,x,m)=>{let A=w.contains.findIndex(_=>_.label===x);if(A===-1)throw new Error("can not find mode to replace");w.contains.splice(A,1,m)};Object.assign(t.keywords,d),t.exports.PARAMS_CONTAINS.push(c);let p=t.contains.find(w=>w.scope==="attr"),f=Object.assign({},p,{match:n.concat(i,n.lookahead(/\s*\?:/))});t.exports.PARAMS_CONTAINS.push([t.exports.CLASS_REFERENCE,p,f]),t.contains=t.contains.concat([c,r,s,f]),u(t,"shebang",e.SHEBANG()),u(t,"use_strict",a);let b=t.contains.find(w=>w.label==="func.def");return b.relevance=0,Object.assign(t,{name:"TypeScript",aliases:["ts","tsx","mts","cts"]}),t}function ml(e){let n="true false yes no null",t="[\\w#;/?:@&=+$,.~*'()[\\]]+",i={className:"attr",variants:[{begin:/[\w*@][\w*@ :()\./-]*:(?=[ \t]|$)/},{begin:/"[\w*@][\w*@ :()\./-]*":(?=[ \t]|$)/},{begin:/'[\w*@][\w*@ :()\./-]*':(?=[ \t]|$)/}]},o={className:"template-variable",variants:[{begin:/\{\{/,end:/\}\}/},{begin:/%\{/,end:/\}/}]},r={className:"string",relevance:0,begin:/'/,end:/'/,contains:[{match:/''/,scope:"char.escape",relevance:0}]},s={className:"string",relevance:0,variants:[{begin:/"/,end:/"/},{begin:/\S+/}],contains:[e.BACKSLASH_ESCAPE,o]},a=e.inherit(s,{variants:[{begin:/'/,end:/'/,contains:[{begin:/''/,relevance:0}]},{begin:/"/,end:/"/},{begin:/[^\s,{}[\]]+/}]}),p={className:"number",begin:"\\b"+"[0-9]{4}(-[0-9][0-9]){0,2}"+"([Tt \\t][0-9][0-9]?(:[0-9][0-9]){2})?"+"(\\.[0-9]*)?"+"([ \\t])*(Z|[-+][0-9][0-9]?(:[0-9][0-9])?)?"+"\\b"},f={end:",",endsWithParent:!0,excludeEnd:!0,keywords:n,relevance:0},b={begin:/\{/,end:/\}/,contains:[f],illegal:"\\n",relevance:0},w={begin:"\\[",end:"\\]",contains:[f],illegal:"\\n",relevance:0},x=[i,{className:"meta",begin:"^---\\s*$",relevance:10},{className:"string",begin:"[\\|>]([1-9]?[+-])?[ ]*\\n( +)[^ ][^\\n]*\\n(\\2[^\\n]+\\n?)*"},{begin:"<%[%=-]?",end:"[%-]?%>",subLanguage:"ruby",excludeBegin:!0,excludeEnd:!0,relevance:0},{className:"type",begin:"!\\w+!"+t},{className:"type",begin:"!<"+t+">"},{className:"type",begin:"!"+t},{className:"type",begin:"!!"+t},{className:"meta",begin:"&"+e.UNDERSCORE_IDENT_RE+"$"},{className:"meta",begin:"\\*"+e.UNDERSCORE_IDENT_RE+"$"},{className:"bullet",begin:"-(?=[ ]|$)",relevance:0},e.HASH_COMMENT_MODE,{beginKeywords:n,keywords:{literal:n}},p,{className:"number",begin:e.C_NUMBER_RE+"\\b",relevance:0},b,w,r,s],m=[...x];return m.pop(),m.push(a),f.contains=m,{name:"YAML",case_insensitive:!0,aliases:["yml"],contains:x}}var bl={javascript:rl,typescript:gl,json:al,python:sl,bash:el,yaml:ml},of={js:"javascript",mjs:"javascript",cjs:"javascript",jsx:"javascript",ts:"typescript",mts:"typescript",cts:"typescript",tsx:"typescript",json:"json",jsonc:"json",jsonl:"json",py:"python",pyi:"python",sh:"bash",bash:"bash",zsh:"bash",yml:"yaml",yaml:"yaml"},wl=new Set;function rf(e){Object.prototype.hasOwnProperty.call(bl,e)&&(wl.has(e)||(Ci.registerLanguage(e,bl[e]),wl.add(e)))}function af(e){let n=/\.([A-Za-z0-9_+-]+)$/.exec(e);return n===null?"":n[1].toLowerCase()}function vl(e){return of[af(e)]??null}function sf(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function kl(e,n){n!==null&&rf(n);let t=n!==null&&Ci.getLanguage(n)!==void 0?n:null;if(t!==null)try{return Ci.highlight(e,{language:t}).value}catch{}return sf(e)}function yl(e){let n=1;for(let t of e){if(t===null)continue;let i=String(t).length;i>n&&(n=i)}return String(n+2)+"ch"}function lf(e){if(typeof e!="string"||e==="")return e;for(var n=e.replace(/\t/g,"    "),t=n.split(`
`),i=-1,o=0;o<t.length;o++)if(t[o].trim()!==""){for(var r=0;r<t[o].length&&t[o].charAt(r)===" ";)r++;(i===-1||r<i)&&(i=r)}if(i<=0)return n;for(var s=[],o=0;o<t.length;o++)s.push(t[o].trim()===""?"":t[o].slice(i));return s.join(`
`)}var Uo=/^([A-Za-z0-9]{3})│/;function df(e){return e.length>0&&/^<path>/.test(e[0])&&e.indexOf("<content>")!==-1}function xl(e,n){if(e!==null&&typeof e=="object"&&typeof e.offset=="number"&&Number.isInteger(e.offset)&&e.offset>=1)return e.offset;var t=String(n).split(`
`);if(t.length>0&&Uo.test(t[0])){var i=/\[Showing lines (\d+)-(\d+) of \d+/.exec(String(n));if(i!==null)return parseInt(i[1],10)}var o=/\(Showing lines (\d+)-\d+/.exec(String(n));return o!==null?parseInt(o[1],10):1}function Ho(e,n){for(var t=String(e).split(`
`),i=t.length>0&&Uo.test(t[0]),o=!i&&df(t),r=[],s=n,a=0;a<t.length;a++)if(i&&Uo.test(t[a]))r.push({number:s,text:t[a].slice(4)}),s++;else if(i)r.push({number:null,text:t[a]});else if(o){if(a===0||/^<type>/.test(t[a])||t[a]==="<content>"||t[a]==="</content>")continue;var l=/^(\d+): ?/.exec(t[a]);l!==null?r.push({number:parseInt(l[1],10),text:t[a].slice(l[0].length)}):r.push({number:null,text:t[a]})}else r.push({number:s,text:t[a]}),s++;for(var d=[],a=0;a<r.length;a++)r[a].number!==null&&d.push(r[a].text);for(var c=lf(d.join(`
`)).split(`
`),u=0,a=0;a<r.length;a++)r[a].number!==null&&(r[a].text=c[u++]);return r}function Oi(e){return e!==null&&typeof e=="object"&&"kind"in e}function Pi(e){if(e===null||typeof e!="object")return"";let n=e;if(Oi(e)){let t=n.call;return t!==void 0&&typeof t.argsRaw=="string"?t.argsRaw:""}return typeof n.argsRaw=="string"?n.argsRaw:""}function Mi(e){if(e==="")return null;try{let n=JSON.parse(e);return n!==null&&typeof n=="object"&&!Array.isArray(n)?n:null}catch{return null}}function Sl(e,n,t){return t===void 0?{text:n,isError:!1}:{text:t,isError:e==="error"}}function yt(e,n){if(e!==null)for(let t of n){let i=e[t];if(typeof i=="string"&&i!=="")return i}}function Li(e){if(!Oi(e))return"running";let n=e,t=n.error;return t!==void 0&&t.code==="interrupted"?"stopped":n.isError===!0?"error":"ok"}function Pn(e){if(!Oi(e))return null;let n=e.content,t=Array.isArray(n)?n:[],i=[];for(let o of t)if(o!==null&&typeof o=="object"){let r=o;if(r.type==="text"&&typeof r.text=="string"){i.push(r.text);continue}try{i.push(JSON.stringify(r,null,2))}catch{}}return i.join(`
`)}function Di(e){if(!Oi(e))return null;let n=Pn(e);if(n!==null&&n!=="")return n;let t=e.error;return t!==void 0&&typeof t.message=="string"?t.message:t!==void 0&&typeof t.code=="string"?t.code:null}function cf(e){let n=e.indexOf(`
`);return n===-1?e:e.slice(0,n)}var uf=/\[(?:E_|exit code:|sandbox:)|FS_[A-Z_]+|AIDOS_[A-Z_]+/;function Ki(e){if(e==="")return e;let n=pf(e);if(n!==null)return n;for(let t of e.split(`
`))if(uf.test(t))return t;return cf(e)}function pf(e){let n=Bi(e);if(n===null)return null;let{code:t,message:i}=n;return i===null?t:t===null?i:`${t} \u2014 ${i}`}var ff=new Set(["tool_error","Error","error"]),hf=[/^gate refused/i,/\brefused\b/i,/is not one of the ticket's criteria/i,/cannot attach kind/i,/outside the allowlist/i,/\bnot permitted\b/i];function Bi(e){let n=e.indexOf("{"),t=e.lastIndexOf("}");if(n===-1||t<=n)return null;let i;try{i=JSON.parse(e.slice(n,t+1))}catch{return null}if(i===null||typeof i!="object"||Array.isArray(i))return null;let o=i,r=typeof o.message=="string"?o.message:null,s=typeof o.code=="string"?o.code:typeof o.error=="string"?o.error:null,a=s!==null&&ff.has(s)&&r!==null?null:s,l={};for(let[c,u]of Object.entries(o))c==="ok"||c==="error"||c==="code"||c==="message"||(l[c]=u);let d=r??s??"";return{code:a,message:r,extra:l,refusal:hf.some(c=>c.test(d))}}function Tl(e,n){if(n===void 0||n==="")return e;let t=n.endsWith("/")?n:n+"/";return e.startsWith(t)?e.slice(t.length):e}function Go(e){if(e===null||e==="")return e;try{let n=JSON.parse(e);if(n===null||typeof n!="object")return e;let t=n;return typeof t.content=="string"?t.content:typeof t.message=="string"?t.message:e}catch{return e}}function gf(e){let n=0;for(let o=0;o<e.length;o++)n=n*31+e.charCodeAt(o)|0;n=Math.abs(n);let i=n*.6180339887498949%1;return Math.floor(i*360)}function zi(e,n){if(n)return{background:"color-mix(in srgb, var(--dsw-alias-state-error-primary) 85%, black)",borderColor:"var(--dsw-alias-state-error-primary)",color:"#fff"};let t=gf(e);return{background:`color-mix(in srgb, hsl(${t} 65% 45%) 55%, var(--dsw-alias-bg-tertiary))`,borderColor:`hsl(${t} 55% 60%)`}}function mf({state:e,open:n}){return ae.default.createElement(ai,{open:n})}function $i({title:e,icon:n,summary:t,state:i,body:o,errorSummary:r,path:s,openFile:a,inspect:l}){let[d,c]=ae.default.useState(!1),u=o!==null||l!==void 0,p=d&&u,f=i==="error"&&r!==void 0,b=f?r:t,w=!f&&s!==void 0&&a!==void 0,x=()=>{s!==void 0&&a!==void 0&&a(s)};return ae.default.createElement("div",{className:"tool-render-card","data-error":i==="error"||void 0,"data-stopped":i==="stopped"||void 0},ae.default.createElement("div",{className:"tool-render-row","data-state":i,"data-expandable":u?!0:void 0,role:u?"button":void 0,tabIndex:u?0:void 0,"aria-expanded":u?p:void 0,onClick:u?()=>c(!d):void 0,onKeyDown:u?m=>{(m.key==="Enter"||m.key===" ")&&(m.preventDefault(),c(!d))}:void 0},u?ae.default.createElement(mf,{state:i,open:p}):null,ae.default.createElement("span",{className:"tool-render-name-badge",style:zi(e,i==="error")},ae.default.createElement("span",{className:"tool-render-name-badge-icon"},n),ae.default.createElement("span",{className:"tool-render-name-badge-text",title:e,"data-dsh-tip":""},e)),ae.default.createElement("span",{className:"tool-render-sep","aria-hidden":"true"}),w?ae.default.createElement("span",{className:"tool-render-path",role:"link",tabIndex:0,title:s,"data-dsh-tip":"",onClick:m=>{m.stopPropagation(),x()},onKeyDown:m=>{(m.key==="Enter"||m.key===" ")&&(m.preventDefault(),m.stopPropagation(),x())}},b):ae.default.createElement("span",{className:"tool-render-summary","tool-render-error":f?!0:void 0,title:b,"data-dsh-tip":""},b)),p?ae.default.createElement("div",{className:"tool-render-body"},o,l!==void 0?ae.default.createElement("button",{type:"button",className:"tool-render-inspect",onClick:l},ae.default.createElement(ga,null),"Inspect"):null):null)}function ji(e,n){let t=Mi(Pi(e.block)),i=Li(e.block),o=yt(t,["path","file_path"]),r=i==="error"?Di(e.block):null,s=o!==void 0?Tl(o,e.cwd):n,a=r!==null&&r!==""?Ki(r):void 0;return{args:t,state:i,summary:s,errorText:r,errorSummary:a,path:o,openFile:e.openFile,inspect:e.inspect}}function Fi(e,n){return e===null||e===""?null:ae.default.createElement("pre",{className:"tool-render-output","tool-render-error":n?!0:void 0},e)}function bf(e,n){return El(Ho(e,xl(null,e)),n)}function El(e,n){let t=vl(n??""),i=yl(e.map(o=>o.number));return ae.default.createElement("div",{className:"tool-render-code"},e.map((o,r)=>ae.default.createElement("div",{className:"tool-render-code-row",key:r},ae.default.createElement("span",{className:"tool-render-gutter","aria-hidden":"true",style:{width:i}},o.number===null?"":String(o.number)),ae.default.createElement("code",{className:"tool-render-line-cell hljs","data-highlighted":"yes",dangerouslySetInnerHTML:{__html:kl(o.text,t)}}))))}function wf(e,n){return ae.default.createElement("div",{className:"tool-render-write"},ae.default.createElement("div",{className:"tool-render-write-note"},"No earlier version on record; new content below"),El(Ho(e,1),n))}function vf(e){let n=ji(e,"Read"),{args:t,state:i,errorText:o}=n,r=i==="error"?o:Go(Pn(e.block)),s=yt(t,["path","file_path"]),a=i==="error"||r===null||r===""?Fi(r,i==="error"):bf(r,s);return ae.default.createElement($i,{...n,icon:ae.default.createElement(In,null),title:"Scratch read",body:a})}function kf(e){let n=ji(e,"Write"),{args:t,state:i,errorText:o}=n,r=i==="error"?o:yt(t,["content"])??null,s=i==="error"||r===null||r===""?Fi(r,i==="error"):wf(r,n.path);return ae.default.createElement($i,{...n,icon:ae.default.createElement(Ze,null),title:"Scratch write",body:s})}function yf(e){let n=ji(e,"Edit"),{args:t,state:i,errorText:o}=n,r;if(i==="error")r=o;else{let s=yt(t,["old_string"]),a=yt(t,["new_string"]);r=s!==void 0||a!==void 0?`- ${s??""}
+ ${a??""}`:Go(Pn(e.block))}return ae.default.createElement($i,{...n,icon:ae.default.createElement(Ze,null),title:"Scratch edit",body:Fi(r,i==="error")})}function xf(e){let n=ji(e,"Mkdir"),{state:t,errorText:i}=n;return ae.default.createElement($i,{...n,icon:ae.default.createElement(ut,null),title:"Scratch mkdir",body:Fi(t==="error"?i:null,t==="error")})}var Rl=[["scratch_read",vf],["scratch_write",kf],["scratch_edit",yf],["scratch_mkdir",xf]];var v=ee(require("react"),1);function cn(e){return e!==null&&typeof e=="object"&&!Array.isArray(e)?e:null}function un(e){return Array.isArray(e)?e:[]}function ie(e){return typeof e=="string"?e:typeof e=="number"||typeof e=="boolean"?String(e):null}function Wo(e,n=120){let i=(typeof e=="string"?e:JSON.stringify(e)??"").replace(/\s+/g," ").trim();return i.length>n?i.slice(0,n-1)+"\u2026":i}function Qo(e){if(typeof e=="string")return e;if(e===void 0)return"";try{return JSON.stringify(e,null,2)??String(e)}catch{return String(e)}}function Fe(e,n,t){let i=Wo(n,t?.max),o=n.trim(),r=o!==i,s=/\n/.test(o);return!r&&!s?{label:e,value:i}:{label:e,value:i,full:o,...t?.markdown===!0?{markdown:!0}:{},...t?.open===!0?{open:!0}:{}}}function Zo(e){let n=cn(e?.ticket);if(n===null)return[];let t=[],i=ie(n.state);i!==null&&t.push({label:"State",value:i});let o=n.gatePresent,r=n.gateTotal;typeof o=="number"&&typeof r=="number"&&t.push({label:"Gate",value:`${o}/${r}`});let s=ie(n.description);s!==null&&s.trim()!==""&&t.push(Fe("Description",s,{markdown:!0}));let a=ie(n.criteria);a!==null&&a.trim()!==""&&t.push(Fe("Criteria",a));let l=ie(n.body);l!==null&&l.trim()!==""&&t.push(Fe("Body",l,{markdown:!0}));let d=un(n.allowlist);d.length>0&&t.push(Fe("Allowlist",d.map(p=>String(p)).join(" \xB7 ")));let c=un(n.dependsOn);c.length>0&&t.push(Fe("Depends on",c.map(p=>String(p)).join(" \xB7 ")));let u=e?.commentCount;return typeof u=="number"&&u>0&&t.push({label:"Comments",value:String(u)}),t}function Sf(e){let n=[],t=e.gatePresent,i=e.gateTotal;typeof t=="number"&&typeof i=="number"&&n.push({label:"Gate",value:`${t}/${i}`});let o=e.confidenceScore;typeof o=="number"&&n.push({label:"Score",value:String(o)});let r=e.phase;typeof r=="number"&&n.push({label:"Phase",value:String(r)});let s=e.dependsOnCount;typeof s=="number"&&s>0&&n.push({label:"Depends on",value:String(s)});let a=e.allowlistCount;typeof a=="number"&&a>0&&n.push({label:"Allowlist",value:`${a} path${a===1?"":"s"}`});let l=ie(e.descriptionExcerpt);if(l!==null&&l.trim()!==""){let c=e.descriptionTruncated===!0?l.trimEnd()+`

_(excerpt \u2014 read the ticket for the rest)_`:l;n.push(Fe("Description",c,{markdown:!0}))}return{id:ie(e.id)??"?",state:ie(e.state)??"",title:ie(e.title)??"",facts:n}}function Il(e){let n=cn(e?.ticket);if(n===null)return null;let t=ie(n.title)??"";return t.trim()===""?null:{id:ie(n.id)??"?",state:ie(n.state)??"",title:t}}function Al(e){return un(e?.tickets).map(n=>cn(n)).filter(n=>n!==null).map(n=>Sf(n))}function Nl(e){return un(e?.evidence).map(n=>cn(n)).filter(n=>n!==null).map(n=>({kind:ie(n.kind)??"",author:ie(n.author)??"agent",at:typeof n.at=="number"?n.at:void 0,excerpt:ie(n.excerpt)??""})).filter(n=>n.kind!=="")}function Cl(e){return un(e?.evidence).map(n=>cn(n)).filter(n=>n!==null).map((n,t)=>({index:typeof n.index=="number"?n.index:t,kind:ie(n.kind)??"",author:ie(n.author)??"agent",at:typeof n.at=="number"?n.at:void 0,payload:cn(n.payload)??{}})).filter(n=>n.kind!=="")}function _l(e){return un(e?.comments).map(n=>cn(n)).filter(n=>n!==null).map(n=>({author:ie(n.author)??"user",at:typeof n.at=="number"?n.at:void 0,body:ie(n.body)??""})).filter(n=>n.body!=="")}function Ol(e){if(e===null)return"all tickets";let n=[],i=(Array.isArray(e.stateIds)?e.stateIds:[e.stateIds]).map(c=>ie(c)).filter(c=>c!==null&&c!=="");i.length>0&&n.push(i.join("|"));let o=ie(e.search);o!==null&&o!==""&&n.push(`"${o}"`);let r=un(e.projectIds).map(c=>ie(c)).filter(c=>c!==null&&c!==""),s=ie(e.projectId);r.length>0?n.push(`projects ${r.join(",")}`):s!==null&&s!==""&&n.push(`project ${s}`);let a=ie(e.sortKey);a!==null&&a!==""&&n.push(`${a} ${e.descending===!1?"\u2191":"\u2193"}`),e.detail==="full"&&n.push("full");let l=ie(e.limit);l!==null&&l!==""&&n.push(`limit ${l}`);let d=ie(e.offset);return d!==null&&d!==""&&d!=="0"&&n.push(`offset ${d}`),n.length===0?"all tickets":n.join(" \xB7 ")}var Tf=new Set(["ticketId","projectId"]),Ef=new Set(["description","body"]);function Jo(e){if(e===null)return[];let n=[];for(let[t,i]of Object.entries(e))Tf.has(t)||i!==void 0&&n.push(Fe(t,Qo(i),{open:!0,...Ef.has(t)?{markdown:!0}:{}}));return n}var Rf=72;function Pl(e,n,t){let i=Wo(e??"move",Rf);if(n===null||n==="")return{title:i,state:null,text:i};let o=t===void 0?n:t(n);return{title:i,state:n,text:`${i} \u2192 ${o}`}}function If(e,n){let t=new Set(un(n?.created).map(i=>String(i)));return un(e?.paths).map(i=>{let o=String(i);return{path:o,created:t.has(o)}})}function Ml(e,n){return If(e,n).map(t=>Fe(t.created?"will be created":"exists",t.path))}function Ll(e){let n=ie(e?.fromState),t=ie(e?.toState);return n===null||t===null?[]:[{label:"From",value:n},{label:"To",value:t}]}function Dl(e){let n=[];for(let i of["frontmatter","preamble"]){let o=e?.[i];typeof o=="string"&&n.push(o===""?{label:i,value:"(empty)"}:Fe(i,o))}let t=e?.contextSections;return Array.isArray(t)&&n.push({label:"contextSections",value:String(t.length)}),n}function Kl(e){let n=[],t=e?.imported??e?.count;typeof t=="number"&&n.push({label:"Imported",value:String(t)}),typeof e?.projectId=="number"&&n.push({label:"Project",value:String(e.projectId)});let i=e?.deleted;typeof i=="boolean"&&n.push({label:"Plan file",value:i?"deleted":"KEPT"});let o=e?.deletionError;return typeof o=="string"&&o!==""&&n.push(Fe("Deletion error",o)),n}function Bl(e){return un(e?.suggestions).map(n=>cn(n)).filter(n=>n!==null).map(n=>({ticketId:ie(n.ticketId)??"?",actionId:ie(n.actionId)??"",reason:ie(n.reason)??""}))}var Af=["frontmatter","preamble","contextSections"];function zl(e){return e===null?[]:Af.filter(n=>typeof e[n]=="string")}function Nf(e){return typeof e=="string"&&fn.includes(e)}function $l(e,n){if(n==null||n==="")return null;let t=cn(e);if(t===null)return null;let i=cn(t[n]);if(i===null||typeof i.id!="number"||typeof i.title!="string"||!Nf(i.state)||typeof i.slug!="string"||typeof i.workspaceKey!="string")return null;let o={id:i.id,title:i.title,state:i.state,slug:i.slug,workspaceKey:i.workspaceKey};typeof i.gatePresent=="number"&&(o.gatePresent=i.gatePresent),typeof i.gateTotal=="number"&&(o.gateTotal=i.gateTotal),typeof i.criteria=="string"&&(o.criteria=i.criteria);let r=ie(i.description);return r!==null&&r.trim()!==""&&(o.descriptionExcerpt=Wo(r,220)),r!==null&&r.trim()!==""&&(o.descriptionFull=r),o}function jl(e){if(e==null)return{button:null,reason:"no document"};let n=e.querySelectorAll('[role="tab"]');for(let t of Array.from(n)){let i=(t.textContent??"").trim();if(i==="Tickets"||i.startsWith("Tickets ("))return{button:t,reason:null}}return{button:null,reason:"the Tickets tab is not shown on this screen"}}function Fl(e,n,t){let i=e;return n!==void 0&&(i+=" \xB7 "+n+(n===1?" ticket":" tickets")),t===!1?i+=" \xB7 file kept":t===!0&&(i+=" \xB7 file deleted"),i}function Cf(e,n){let t=e?.ticketId;if(typeof t=="number"||typeof t=="string")return String(t);if(n!==null&&typeof n=="object"){let i=n.ticketId;if(typeof i=="number"||typeof i=="string")return String(i)}return null}function _f(e,n){if(e===null||n===null||n===void 0||n==="")return null;let t=n,i=e.tickets.find(a=>q(a)===t)??null;if(i===null)return null;let o=q(i),r=new Map,s=(a,l)=>{r.has(a)||r.set(a,l)};for(let a of e.tickets)s(q(a),a),s(String(a.id),a),s(a.workspaceKey+":"+String(a.id),a);return{ticket:i,boardKey:o,evidence:e.evidence[o]??[],comments:e.comments[o]??[],ticketsByKey:r}}function Of(e){let n=Pn(e);if(n===null||n==="")return null;try{let t=JSON.parse(n);return t!==null&&typeof t=="object"&&!Array.isArray(t)?t:null}catch{return null}}function Qn(e,n){if(n===null)return null;let t=ti(e,n);return t===null?`#${n}`:`#${n} \u2014 ${t}`}function Pf(e){return`Select ${e} on the board`}function He(e){let[n,t]=v.default.useState(!1),[i,o]=v.default.useState(!1),[r,s]=v.default.useState(!1),[a,l]=v.default.useState(null),d=e.body??null,c=e.footer??null,u=d!==null||c!==null,p=n&&u,f=Sl(e.state,e.summary,e.errorSummary),b=e.summaryNode!==void 0&&e.errorSummary===void 0?e.summaryNode:null,w=e.ticketId!==null&&e.ticketId!==void 0&&e.sessionId!==void 0;v.default.useEffect(()=>{e.ticketId===null||e.ticketId===void 0||console.info(`[aidos] toolview ticket=${e.ticketId} sessionId=${e.sessionId??"MISSING"} useProjection=${typeof e.useProjection} canSelect=${w}`)},[e.ticketId,e.sessionId,e.useProjection,w]);let x=w?_=>{_.stopPropagation(),console.info(`[aidos] click-through fired for ticket ${e.ticketId}`),gn(e.sessionId,e.ticketId),l(null),o(!0)}:void 0,m=e.useProjection!==void 0?$l(e.useProjection("aidos.tickets"),e.ticketId):null,A=_f(e.sessionId===void 0?null:zn(e.sessionId),e.ticketId);return v.default.createElement("div",{className:"tool-render-card","data-error":e.state==="error"||void 0},v.default.createElement("div",{className:"tool-render-row","data-state":e.state,"data-expandable":u?!0:void 0,role:u?"button":void 0,tabIndex:u?0:void 0,"aria-expanded":u?p:void 0,onClick:u?()=>t(!n):void 0,onKeyDown:u?_=>{(_.key==="Enter"||_.key===" ")&&(_.preventDefault(),t(!n))}:void 0},v.default.createElement(ai,{open:p,disabled:!u}),v.default.createElement("span",{className:"tool-render-name-badge",style:zi(e.title,e.state==="error")},v.default.createElement("span",{className:"tool-render-name-badge-icon"},e.icon),v.default.createElement("span",{className:"tool-render-name-badge-text",title:e.title,"data-dsh-tip":""},e.title)),v.default.createElement("span",{className:"tool-render-sep","aria-hidden":"true"}),x!==void 0&&e.errorSummary===void 0?v.default.createElement("span",{className:"tool-render-path"+(b===null?"":" aidos-row-summary-rich"),role:"link",tabIndex:0,title:Pf(f.text),"data-dsh-tip":"",onClick:x,onKeyDown:_=>{(_.key==="Enter"||_.key===" ")&&(_.preventDefault(),x(_))}},b??f.text):v.default.createElement("span",{className:"tool-render-summary"+(b===null?"":" aidos-row-summary-rich"),"tool-render-error":f.isError?!0:void 0},b??f.text)),p?v.default.createElement("div",{className:"tool-render-body"},d,c!==null?v.default.createElement("div",{className:"aidos-tool-footer"},c):null):null,i?v.default.createElement(be,{title:A!==null?`#${A.ticket.id} ${A.ticket.title}`:"Ticket",wide:A!==null,onClose:()=>o(!1)},A!==null&&e.sessionId!==void 0?v.default.createElement(v.default.Fragment,null,v.default.createElement(yi,{key:me(A.ticket),ticket:A.ticket,ticketIdKey:A.boardKey,evidence:A.evidence,comments:A.comments,evidenceCollapsed:r,onToggleEvidence:()=>{s(_=>!_)},onClose:()=>o(!1),agentId:e.sessionId,onFieldSaved:()=>{},ticketsByKey:A.ticketsByKey,onJump:_=>{gn(e.sessionId,_),o(!1)}})):m!==null?v.default.createElement(v.default.Fragment,null,v.default.createElement(Ue,{ticket:m}),m.descriptionFull!==void 0?v.default.createElement("div",{className:"aidos-md aidos-ticket-peek-description",dangerouslySetInnerHTML:{__html:jt(m.descriptionFull)}}):null,v.default.createElement("div",{className:"aidos-ticket-peek-actions"},w?v.default.createElement("button",{type:"button",className:"tool-render-approval-btn tool-render-approval-approve",onClick:_=>{_.stopPropagation(),gn(e.sessionId,e.ticketId);let W=jl(typeof document>"u"?void 0:document);W.button!==null?(W.button.click(),o(!1)):l(W.reason)}},v.default.createElement(Rn,null)," Open on board"):null),a!==null?v.default.createElement("p",{className:"aidos-ticket-peek-note",role:"status"},a):null):v.default.createElement("p",{className:"aidos-ticket-peek-empty"},"#"+(e.ticketId??"?")+" isn't in this session's own board yet, or belongs to another session. Open the Tickets tab to look it up there.")):null)}function kn({facts:e}){return e.length===0?null:v.default.createElement("dl",{className:"aidos-tool-facts"},e.map((n,t)=>v.default.createElement(v.default.Fragment,{key:n.label+":"+t},v.default.createElement("dt",null,n.label),v.default.createElement(Mf,{fact:n}))))}function Mf({fact:e}){return e.full!==void 0&&e.full!==""?v.default.createElement(Vl,{fact:e,as:"dd"}):v.default.createElement("dd",{title:e.value,"data-dsh-tip":""},e.value)}function Vl({fact:e,as:n}){let[t,i]=v.default.useState(e.open===!0);return v.default.createElement(n,{className:n==="span"?"aidos-tool-fact-value":void 0,"data-expanded":t?!0:void 0},t?v.default.createElement(Df,{fact:e}):v.default.createElement("span",{className:"aidos-tool-fact-clipped",title:e.value,"data-dsh-tip":""},e.value),v.default.createElement("button",{className:"aidos-tool-fact-more",type:"button","aria-expanded":t,onClick:r=>{r.stopPropagation(),i(!t)}},t?"Show less":"Show more"))}function Lf({fact:e}){return e.full===void 0||e.full===""?v.default.createElement("span",{className:"aidos-tool-list-text",title:e.value,"data-dsh-tip":""},e.value):v.default.createElement("span",{className:"aidos-tool-list-text aidos-tool-list-value"},v.default.createElement(Vl,{fact:e,as:"span"}))}function Df({fact:e}){let n=e.full??e.value;return e.markdown!==!0?v.default.createElement("span",{className:"aidos-tool-fact-full"},n):v.default.createElement("div",{className:"aidos-md aidos-tool-fact-full",dangerouslySetInnerHTML:{__html:jt(n)}})}function Kf({tables:e,onSelect:n}){return e.length===0?null:v.default.createElement("div",{className:"aidos-tool-stack"},e.map(t=>v.default.createElement("section",{className:"aidos-tool-table",key:t.id},v.default.createElement(ql,{id:t.id,state:t.state,title:t.title,onSelect:n}),v.default.createElement(kn,{facts:t.facts}))))}function ql({id:e,state:n,title:t,onSelect:i}){return v.default.createElement("header",{className:"aidos-tool-table-head"},i!==void 0?v.default.createElement("button",{className:"aidos-tool-table-id aidos-tool-table-id-link",type:"button",onClick:o=>{o.stopPropagation(),i(e)}},"#"+e):v.default.createElement("span",{className:"aidos-tool-table-id"},"#"+e),n===""?null:v.default.createElement("span",{className:"aidos-tool-list-tag"},n),v.default.createElement("span",{className:"aidos-tool-table-title",title:t,"data-dsh-tip":""},t))}function Bf(e){let n=Il(e);return n===null?null:v.default.createElement(ql,{id:n.id,state:n.state,title:n.title})}function Vi({text:e,isError:n}){return v.default.createElement("pre",{className:"tool-render-output","tool-render-error":n===!0?!0:void 0},e)}function en(e){if(e===null||e==="")return null;let n=Bi(e);if(n===null)return v.default.createElement(Vi,{text:e,isError:!0});let t=[];n.code!==null&&t.push({label:"code",value:n.code});for(let[i,o]of Object.entries(n.extra))t.push(Fe(i,Qo(o)));return n.message===null&&t.length===0?v.default.createElement(Vi,{text:e,isError:!0}):v.default.createElement(v.default.Fragment,null,n.message===null?null:v.default.createElement("p",{className:"aidos-tool-message"},n.message),v.default.createElement(kn,{facts:t}))}function Ge(e){let n=e?.block,t=Mi(Pi(n)),i=Li(n),o=Of(n),r=Cf(t,o),s=i==="error"?Di(n):null,a=s!==null&&s!==""?Ki(s):void 0,l=s===null?null:Bi(s),d=i==="error"&&l?.refusal===!0?"stopped":i,c=Pn(n);return{args:t,state:d,result:o,resultText:c,ticketId:r,errorText:s,errorSummary:a}}function xt(e){return e===null||e===""?null:v.default.createElement(Vi,{text:e,isError:!1})}function zf(e){let{args:n,state:t,result:i,ticketId:o,errorText:r,errorSummary:s}=Ge(e),a=typeof n?.kind=="string"?n.kind:void 0,l=Yo(),d=v.default.createElement(v.default.Fragment,null,r!==null&&r!==""?en(r):a!==void 0?v.default.createElement("ul",{className:"aidos-evidence-list"},v.default.createElement(Je,{row:{kind:a.startsWith("builtin:")?a:"builtin:"+a,payload:n?.payload??{},author:"agent",at:typeof i?.updatedAt=="number"?i.updatedAt:void 0},onView:l.open})):null,l.viewer);return v.default.createElement(He,{icon:v.default.createElement(oi,null),title:"Evidence",summary:Qn(e.sessionId,o)??"evidence",state:t,body:d,errorSummary:s,ticketId:o,sessionId:e.sessionId,useProjection:e.useProjection})}function $f(e){let{args:n,state:t,result:i,resultText:o,ticketId:r,errorText:s,errorSummary:a}=Ge(e),l=typeof n?.to=="string"?n.to:null,d=Qn(e.sessionId,r),c=[...Ll(i),...Zo(i)],u=s!==null&&s!==""?en(s):c.length>0?v.default.createElement(kn,{facts:c}):i===null?xt(o):null,p=Pl(d,l,Me),f=p.state===null?void 0:v.default.createElement(v.default.Fragment,null,v.default.createElement("span",{className:"aidos-move-title",title:d??p.title,"data-dsh-tip":""},p.title),v.default.createElement("span",{className:"aidos-move-arrow","aria-hidden":"true"},"\u2192"),v.default.createElement("span",{className:Tn(p.state)},Me(p.state)));return v.default.createElement(He,{icon:v.default.createElement(ut,null),title:"Move ticket",summary:p.text,summaryNode:f,state:t,body:u,errorSummary:a,ticketId:r,sessionId:e.sessionId,useProjection:e.useProjection})}function jf(e){let{args:n,state:t,result:i,ticketId:o,errorText:r,errorSummary:s}=Ge(e),a=i?.created===!0,l=typeof n?.title=="string"?n.title:null,d=a&&l!==null?`#${o??"?"} \u2014 ${l}`:Qn(e.sessionId,o),c=Jo(n),u=r!==null&&r!==""?en(r):c.length>0?v.default.createElement(kn,{facts:c}):null;return v.default.createElement(He,{icon:v.default.createElement(Ze,null),title:a?"Create ticket":"Edit ticket",summary:d??"ticket",state:t,body:u,errorSummary:s,ticketId:o,sessionId:e.sessionId,useProjection:e.useProjection})}function Ff(e){let{state:n,result:t,resultText:i,ticketId:o,errorText:r,errorSummary:s}=Ge(e),a=Zo(t),l=Nl(t),d=Yo(),c=r!==null&&r!==""?en(r):a.length===0&&l.length===0?t===null?xt(i):null:v.default.createElement(v.default.Fragment,null,Bf(t),v.default.createElement(kn,{facts:a}),l.length>0?v.default.createElement("ul",{className:"aidos-evidence-list"},l.map((u,p)=>v.default.createElement(Je,{key:p,row:{kind:u.kind,payload:{note:u.excerpt},author:u.author,at:u.at},onView:d.open}))):null,d.viewer);return v.default.createElement(He,{icon:v.default.createElement(In,null),title:"Read ticket",summary:Qn(e.sessionId,o)??"ticket",state:n,body:c,errorSummary:s,ticketId:o,sessionId:e.sessionId,useProjection:e.useProjection})}function Vf(e){let{args:n,state:t,result:i,resultText:o,errorText:r,errorSummary:s}=Ge(e),a=Ol(n),l=typeof i?.summary=="string"?i.summary:null,d=Al(i),c=r!==null&&r!==""?en(r):d.length===0?i===null?xt(o):null:v.default.createElement(Kf,{tables:d,onSelect:e.sessionId===void 0?void 0:u=>{gn(e.sessionId,u)}});return v.default.createElement(He,{icon:v.default.createElement(ct,null),title:"Read board",summary:a,state:t,body:c,footer:l,errorSummary:s})}function qf(e){let{args:n,state:t,result:i,ticketId:o,errorText:r,errorSummary:s}=Ge(e),a=Ml(n,i),d=(Qn(e.sessionId,o)??"allowlist")+" \xB7 "+a.length+(a.length===1?" path":" paths"),c=r!==null&&r!==""?en(r):a.length===0?null:v.default.createElement(v.default.Fragment,null,v.default.createElement(kn,{facts:a}),e.sessionId!==void 0&&o!==null?v.default.createElement(Ga,{sessionId:e.sessionId,boardKey:String(o)}):null);return v.default.createElement(He,{icon:v.default.createElement(ri,null),title:"Request allowlist",summary:d,state:t,body:c,errorSummary:s,ticketId:o,sessionId:e.sessionId,useProjection:e.useProjection})}function Uf(e){let{args:n,state:t,errorText:i,errorSummary:o}=Ge(e),r=Bl(n),s=r.length===0?"nothing":r.length===1?Qn(e.sessionId,r[0].ticketId)??"#"+r[0].ticketId:r.length+" tickets",a=i!==null&&i!==""?en(i):r.length===0?null:v.default.createElement("ul",{className:"aidos-tool-list"},r.map(l=>v.default.createElement("li",{key:l.ticketId+":"+l.actionId},v.default.createElement("span",{className:"aidos-tool-list-key"},"#",l.ticketId),v.default.createElement("span",{className:"aidos-tool-list-tag"},l.actionId),v.default.createElement(Lf,{fact:Fe("reason",l.reason)}),e.sessionId!==void 0&&Ua(l.actionId)?v.default.createElement(Ha,{sessionId:e.sessionId,boardKey:String(l.ticketId),actionId:l.actionId}):null)));return v.default.createElement(He,{icon:v.default.createElement(ii,null),title:"Suggest actions",summary:s,state:t,body:a,errorSummary:o,ticketId:r.length===1?r[0].ticketId:null,sessionId:e.sessionId,useProjection:e.useProjection})}function Hf(e){let{args:n,state:t,errorText:i,errorSummary:o}=Ge(e),r=i??Pn(e.block),s=n?.projectId===void 0?"the project plan":"project "+String(n.projectId);return v.default.createElement(He,{icon:v.default.createElement(Rn,null),title:"Export plan",summary:s,state:t,body:r===null||r===""?null:v.default.createElement(Vi,{text:r,isError:i!==null&&t==="error"}),errorSummary:o})}function Gf(e){let{args:n,state:t,result:i,resultText:o,errorText:r,errorSummary:s}=Ge(e),a=typeof n?.file=="string"?n.file:"a plan",l=i?.imported??i?.count,d=Kl(i),c=r!==null&&r!==""?en(r):d.length>0?v.default.createElement(kn,{facts:d}):i===null?xt(o):null;return v.default.createElement(He,{icon:v.default.createElement(Rn,null),title:"Import plan",summary:Fl(a,typeof l=="number"?l:void 0,typeof i?.deleted=="boolean"?i.deleted:void 0),state:t,body:c,errorSummary:s})}function Wf(e){let{args:n,state:t,result:i,resultText:o,errorText:r,errorSummary:s}=Ge(e),a=n?.projectId===void 0?"the plan blocks":"project "+String(n.projectId),l=Dl(i),d=r!==null&&r!==""?en(r):l.length>0?v.default.createElement(kn,{facts:l}):i===null?xt(o):null;return v.default.createElement(He,{icon:v.default.createElement(In,null),title:"Read plan blocks",summary:a,state:t,body:d,errorSummary:s})}function Qf(e){let{args:n,state:t,errorText:i,errorSummary:o}=Ge(e),r=zl(n),s=Jo(n).filter(l=>l.label!=="projectId"),a=i!==null&&i!==""?en(i):s.length>0?v.default.createElement(kn,{facts:s}):null;return v.default.createElement(He,{icon:v.default.createElement(Ze,null),title:"Edit plan blocks",summary:r.length===0?"no block":r.join(" \xB7 "),state:t,body:a,errorSummary:o})}function Zf(e){let{args:n,state:t,result:i,resultText:o,ticketId:r,errorText:s,errorSummary:a}=Ge(e),l=Cl(i),d=_l(i),c=Yo(),u=typeof n?.index=="number"?n.index:null,p=Qn(e.sessionId,r)??"ticket",f=u===null?p+" \xB7 evidence":p+" \xB7 evidence ["+String(u)+"]",b=s!==null&&s!==""?en(s):l.length===0&&d.length===0?i===null?xt(o):null:v.default.createElement(v.default.Fragment,null,v.default.createElement("ul",{className:"aidos-evidence-list"},l.map(w=>v.default.createElement(Je,{key:String(w.index)+":"+w.kind,row:{kind:w.kind,payload:w.payload,author:w.author,at:w.at},onView:c.open}))),d.map((w,x)=>v.default.createElement("div",{className:"aidos-comment",key:x},v.default.createElement("div",null,v.default.createElement("span",{className:"aidos-evidence-author"},w.author)),v.default.createElement("p",{className:"aidos-detail-body"},w.body))),c.viewer);return v.default.createElement(He,{icon:v.default.createElement(In,null),title:"Read evidence",summary:f,state:t,body:b,errorSummary:a,ticketId:r,sessionId:e.sessionId,useProjection:e.useProjection})}function Yo(){let[e,n]=v.default.useState(null);return{open:n,viewer:e===null?null:v.default.createElement(Nn,{row:e,onClose:()=>{n(null)}})}}var Ul=[["get_tickets",Vf],["get_ticket",Ff],["get_evidence",Zf],["set_ticket",jf],["attach_evidence",zf],["move_ticket",$f],["request_allowlist",qf],["suggest_actions",Uf],["plan",Hf],["plan_import",Gf],["plan_meta",Wf],["plan_meta_set",Qf]];var Jf="aidos",Yf=["slots"],Xf="aidos";function eh(){if(!(typeof document>"u"))for(let e of[{marker:"aidos/board.css",text:rr},{marker:"aidos/plan-meta.css",text:ar},{marker:"aidos/tool-render.css",text:sr}]){if(document.querySelector(`style[data-plugin-css="${e.marker}"]`)!==null)continue;let n=document.createElement("style");n.dataset.plugin="aidos",n.dataset.pluginCss=e.marker,n.textContent=e.text,document.head.appendChild(n)}}function nh(e,n){return function(i){try{return n(i)}catch(o){return console.warn(`aidos: the ${e} tool row failed to render`,o),St.default.createElement("div",{className:"tool-render-card"},St.default.createElement("div",{className:"tool-render-row","data-state":"error"},St.default.createElement("span",{className:"tool-render-title"},e),St.default.createElement("span",{className:"tool-render-sep"}),St.default.createElement("span",{className:"tool-render-summary"},"this card could not render; the call itself was unaffected")))}}}function Gl(e){let n=[...Rl,...Ul],t=[],i=0;for(let[o,r]of n)try{t.push(e.inject("tool.call.toolview",()=>{try{return e.register({name:"tool.call.toolview",key:o,priority:-100},nh(o,r))}catch(s){return i+=1,i===n.length&&console.error(`aidos: ALL ${n.length} tool rows failed to register on "tool.call.toolview"; every board tool will render as raw JSON`),console.warn(`aidos: the ${o} tool row could not register; the other rows continue`,s),()=>{}}}))}catch(s){i+=1,console.warn(`aidos: the ${o} tool row could not register; the other rows continue`,s)}if(i===n.length)throw new Error(`aidos: all ${n.length} tool rows failed to register on "tool.call.toolview" -- total registration failure is loud, never a console line`);return function(){for(let o of t)o()}}function Hl(e){return e.inject("conversation.view",()=>e.register({name:"conversation.view",id:"tickets",order:20,label:_t},Os))}function th(e){eh(),e.effect(()=>{let r=e.get("slots");return r===void 0?()=>{}:Gl(r)},"aidos: scratch tool rows");let n=null,t=!1,i=_t();function o(r){t&&n===null&&(n=Hl(r),i=_t()),!t&&n!==null&&(n(),n=null)}e.effect(function(){let r=e.get("slots");if(r===void 0)return()=>{};let s=e.get("sessions");if(s===void 0||typeof s.list?.getSnapshot!="function"||typeof s.list?.subscribe!="function")return t=!0,o(r),function(){t=!1,o(r)};let a=s.list.getSnapshot(),l=function(){let c=a.current?a.byId[a.current]?.agentPreset:void 0;t=c===void 0||c===Xf,o(r),Lr(a.current??null)},d=s.list.subscribe(function(){a=s.list.getSnapshot(),l()});return l(),function(){d(),t=!1,o(r)}},"aidos: tickets tab visibility"),Pr(function(){if(n===null)return;let r=_t();if(r===i)return;let s=e.get("slots");if(s!==void 0)try{n(),n=Hl(s),i=r,console.info(`[aidos] tab re-registered for label "${r}" <- this remounts the board`)}catch(a){n=null,console.error("aidos: the Tickets tab failed to re-register after a badge change; the tab may show a stale count until the next visibility change",a)}})}
		return module.exports;
	}
});
