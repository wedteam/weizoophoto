/*import from ../dom/selector.js,(by build.py)*/

/*
	Copyright (c) Baidu Youa Wed QWrap
	version: $version$ $release$ released
	author: JK
*/


/**
 * @class Selector Css Selector相关的几个方法
 * @singleton
 * @namespace QW
 */
(function() {
	var trim = QW.StringH.trim,
		encode4Js = QW.StringH.encode4Js;

	var Selector = {
		/**
		 * @property {int} queryStamp 最后一次查询的时间戳，扩展伪类时可能会用到，以提速
		 */
		queryStamp: 0,
		/**
		 * @property {Json} _operators selector属性运算符
		 */
		_operators: { //以下表达式，aa表示attr值，vv表示比较的值
			'': 'aa',
			//isTrue|hasValue
			'=': 'aa=="vv"',
			//equal
			'!=': 'aa!="vv"',
			//unequal
			'~=': 'aa&&(" "+aa+" ").indexOf(" vv ")>-1',
			//onePart
			'|=': 'aa&&(aa+"-").indexOf("vv-")==0',
			//firstPart
			'^=': 'aa&&aa.indexOf("vv")==0',
			// beginWith
			'$=': 'aa&&aa.lastIndexOf("vv")==aa.length-"vv".length',
			// endWith
			'*=': 'aa&&aa.indexOf("vv")>-1' //contains
		},
		/**
		 * @property {Json} _pseudos 伪类逻辑
		 */
		_pseudos: {
			"first-child": function(a) {
				return !(a = a.previousSibling) || !a.tagName && !a.previousSibling;
			},
			"last-child": function(a) {
				return !(a = a.nextSibling) || !a.tagName && !a.nextSibling;
			},
			"only-child": function(a) {
				var el;
				return !((el = a.previousSibling) && (el.tagName || el.previousSibling) || (el = a.nextSibling) && (el.tagName || el.nextSibling));
			},
			"nth-child": function(a, nth) {
				return checkNth(a, nth);
			},
			"nth-last-child": function(a, nth) {
				return checkNth(a, nth, true);
			},
			"first-of-type": function(a) {
				var tag = a.tagName;
				var el = a;
				while (el = el.previousSlibling) {
					if (el.tagName == tag) return false;
				}
				return true;
			},
			"last-of-type": function(a) {
				var tag = a.tagName;
				var el = a;
				while (el = el.nextSibling) {
					if (el.tagName == tag) return false;
				}
				return true;
			},
			"only-of-type": function(a) {
				var els = a.parentNode.childNodes;
				for (var i = els.length - 1; i > -1; i--) {
					if (els[i].tagName == a.tagName && els[i] != a) return false;
				}
				return true;
			},
			"nth-of-type": function(a, nth) {
				var idx = 1;
				var el = a;
				while (el = el.previousSibling) {
					if (el.tagName == a.tagName) idx++;
				}
				return checkNth(idx, nth);
			},
			//JK：懒得为这两个伪类作性能优化
			"nth-last-of-type": function(a, nth) {
				var idx = 1;
				var el = a;
				while (el = el.nextSibling) {
					if (el.tagName == a.tagName) idx++;
				}
				return checkNth(idx, nth);
			},
			//JK：懒得为这两个伪类作性能优化
			"empty": function(a) {
				return !a.firstChild;
			},
			"parent": function(a) {
				return !!a.firstChild;
			},
			"not": function(a, sSelector) {
				return !s2f(sSelector)(a);
			},
			"enabled": function(a) {
				return !a.disabled;
			},
			"disabled": function(a) {
				return a.disabled;
			},
			"checked": function(a) {
				return a.checked;
			},
			"focus": function(a) {
				return a == a.ownerDocument.activeElement;
			},
			"indeterminate": function(a) {
				return a.indeterminate;
			},
			"input": function(a) {
				return /input|select|textarea|button/i.test(a.nodeName);
			},
			"contains": function(a, s) {
				return (a.textContent || a.innerText || "").indexOf(s) >= 0;
			}
		},
		/**
		 * @property {Json} _attrGetters 常用的Element属性
		 */
		_attrGetters: (function() {
			var o = {
				'class': 'el.className',
				'for': 'el.htmlFor',
				'href': 'el.getAttribute("href",2)'
			};
			var attrs = 'name,id,className,value,selected,checked,disabled,type,tagName,readOnly,offsetWidth,offsetHeight,innerHTML'.split(',');
			for (var i = 0, a; a = attrs[i]; i++) o[a] = "el." + a;
			return o;
		}()),
		/**
		 * @property {Json} _relations selector关系运算符
		 */
		_relations: {
			//寻祖
			"": function(el, filter, topEl) {
				while ((el = el.parentNode) && el != topEl) {
					if (filter(el)) return el;
				}
				return null;
			},
			//寻父
			">": function(el, filter, topEl) {
				el = el.parentNode;
				return el != topEl && filter(el) ? el : null;
			},
			//寻最小的哥哥
			"+": function(el, filter, topEl) {
				while (el = el.previousSibling) {
					if (el.tagName) {
						return filter(el) && el;
					}
				}
				return null;
			},
			//寻所有的哥哥
			"~": function(el, filter, topEl) {
				while (el = el.previousSibling) {
					if (el.tagName && filter(el)) {
						return el;
					}
				}
				return null;
			}
		},
		/** 
		 * 把一个selector字符串转化成一个过滤函数.
		 * @method selector2Filter
		 * @static
		 * @param {string} sSelector 过滤selector，这个selector里没有关系运算符（", >+~"）
		 * @returns {function} : 返回过滤函数。
		 * @example: 
		 var fun=selector2Filter("input.aaa");alert(fun);
		 */
		selector2Filter: function(sSelector) {
			return s2f(sSelector);
		},
		/** 
		 * 判断一个元素是否符合某selector.
		 * @method test 
		 * @static
		 * @param {HTMLElement} el: 被考察参数
		 * @param {string} sSelector: 过滤selector，这个selector里没有关系运算符（", >+~"）
		 * @returns {function} : 返回过滤函数。
		 */
		test: function(el, sSelector) {
			return s2f(sSelector)(el);
		},
		/** 
		 * 用一个css selector来过滤一个数组.
		 * @method filter 
		 * @static
		 * @param {Array|Collection} els: 元素数组
		 * @param {string} sSelector: 过滤selector，这个selector里的第一个关系符不可以是“+”“~”。
		 * @param {Element} pEl: 父节点。默认是document
		 * @returns {Array} : 返回满足过滤条件的元素组成的数组。
		 */
		filter: function(els, sSelector, pEl) {
			var pEl = pEl || document,
				groups = trim(sSelector).split(",");
			if (groups.length < 2) {
				return filterByRelation(pEl || document, els, splitSelector(sSelector));
			}
			else {//如果有逗号关系符，则满足其中一个selector就通过筛选。以下代码，需要考虑：“尊重els的原顺序”。
				var filteredEls = filterByRelation(pEl || document, els, splitSelector(groups[0]));
				if (filteredEls.length == els.length) { //如果第一个过滤筛完，则直接返回
					return filteredEls;
				}
				for(var j = 0, el; el = els[j++];){
					el.__QWSltFlted=0;
				}
				for(j = 0, el; el = filteredEls[j++];){
					el.__QWSltFlted=1;
				}
				var leftEls = els,
					tempLeftEls;
				for(var i=1;i<groups.length;i++){
					tempLeftEls = [];
					for(j = 0, el; el = leftEls[j++];){
						if(!el.__QWSltFlted) tempLeftEls.push(el);
					}
					leftEls = tempLeftEls;
					filteredEls = filterByRelation(pEl || document, leftEls, splitSelector(groups[i]));
					for(j = 0, el; el = filteredEls[j++];){
						el.__QWSltFlted=1;
					}
				}
				var ret=[];
				for(j = 0, el; el = els[j++];){
					if(el.__QWSltFlted) ret.push(el);
				}
				return ret;
			}
		},
		/** 
		 * 以refEl为参考，得到符合过滤条件的HTML Elements. refEl可以是element或者是document
		 * @method query
		 * @static
		 * @param {HTMLElement} refEl: 参考对象
		 * @param {string} sSelector: 过滤selector,
		 * @returns {array} : 返回elements数组。
		 * @example: 
		 var els=query(document,"li input.aaa");
		 for(var i=0;i<els.length;i++ )els[i].style.backgroundColor='red';
		 */
		query: function(refEl, sSelector) {
			Selector.queryStamp = queryStamp++;
			refEl = refEl || document;
			var els = nativeQuery(refEl, sSelector);
			if (els) return els; //优先使用原生的
			var groups = trim(sSelector).split(",");
			els = querySimple(refEl, groups[0]);
			for (var i = 1, gI; gI = groups[i]; i++) {
				var els2 = querySimple(refEl, gI);
				els = els.concat(els2);
				//els=union(els,els2);//除重有负作用，例如效率或污染，放弃除重
			}
			return els;
		},
		/** 
		 * 以refEl为参考，得到符合过滤条件的一个元素. refEl可以是element或者是document
		 * @method one
		 * @static
		 * @param {HTMLElement} refEl: 参考对象
		 * @param {string} sSelector: 过滤selector,
		 * @returns {HTMLElement} : 返回element，如果获取不到，则反回null。
		 * @example: 
		 var els=query(document,"li input.aaa");
		 for(var i=0;i<els.length;i++ )els[i].style.backgroundColor='red';
		 */
		one: function(refEl, sSelector) {
			var els = Selector.query(refEl, sSelector);
			return els[0];
		}


	};

	window.__SltPsds = Selector._pseudos; //JK 2010-11-11：为提高效率
	/*
		retTrue 一个返回为true的函数
	*/

	function retTrue() {
		return true;
	}

	/*
		arrFilter(arr,callback) : 对arr里的元素进行过滤
	*/

	function arrFilter(arr, callback) {
		var rlt = [],
			i = 0;
		if (callback == retTrue) {
			if (arr instanceof Array) {
				return arr.slice(0);
			} else {
				for (var len = arr.length; i < len; i++) {
					rlt[i] = arr[i];
				}
			}
		} else {
			for (var oI; oI = arr[i++];) {
				callback(oI) && rlt.push(oI);
			}
		}
		return rlt;
	}

	var elContains,
		hasNativeQuery;
	function getChildren(pEl) { //需要剔除textNode与“<!--xx-->”节点
		var els = pEl.children || pEl.childNodes,
			len = els.length,
			ret = [],
			i = 0;
		for (; i < len; i++) if (els[i].nodeType == 1) ret.push(els[i]);
		return ret;
	}
	function findId(id) {
		return document.getElementById(id);
	}

	(function() {
		var div = document.createElement('div');
		div.innerHTML = '<div class="aaa"></div>';
		hasNativeQuery = (div.querySelectorAll && div.querySelectorAll('.aaa').length == 1); //部分浏览器不支持原生querySelectorAll()，例如IE8-
		elContains = div.contains ?	
			function(pEl, el) {
				return pEl != el && pEl.contains(el);
			} : function(pEl, el) {
				return (pEl.compareDocumentPosition(el) & 16);
			};
	}());


	function checkNth(el, nth, reverse) {
		if (nth == 'n') {return true; }
		if (typeof el == 'number') {
			var idx = el; 
		} else {
			var pEl = el.parentNode;
			if (pEl.__queryStamp != queryStamp) {
				var nEl = {nextSibling: pEl.firstChild},
					n = 1;
				while (nEl = nEl.nextSibling) {
					if (nEl.nodeType == 1) nEl.__siblingIdx = n++;
				}
				pEl.__queryStamp = queryStamp;
				pEl.__childrenNum = n - 1;
			}
			if (reverse) idx = pEl.__childrenNum - el.__siblingIdx + 1;
			else idx = el.__siblingIdx;
		}
		switch (nth) {
		case 'even':
		case '2n':
			return idx % 2 == 0;
		case 'odd':
		case '2n+1':
			return idx % 2 == 1;
		default:
			if (!(/n/.test(nth))) return idx == nth;
			var arr = nth.replace(/(^|\D+)n/g, "$11n").split("n"),
				k = arr[0] | 0,
				kn = idx - arr[1] | 0;
			return k * kn >= 0 && kn % k == 0;
		}
	}
	/*
	 * s2f(sSelector): 由一个selector得到一个过滤函数filter，这个selector里没有关系运算符（", >+~"）
	 */
	var filterCache = {};

	function s2f(sSelector, isForArray) {
		if (!isForArray && filterCache[sSelector]) return filterCache[sSelector];
		var pseudos = [],
			//伪类数组,每一个元素都是数组，依次为：伪类名／伪类值
			s = trim(sSelector),
			reg = /\[\s*((?:[\w\u00c0-\uFFFF-]|\\.)+)\s*(?:(\S?=)\s*(['"]*)(.*?)\3|)\s*\]/g,
			//属性选择表达式解析,thanks JQuery
			sFun = [];
		s = s.replace(/\:([\w\-]+)(\(([^)]+)\))?/g,  //伪类
			function(a, b, c, d, e) {
				pseudos.push([b, d]);
				return "";
			}).replace(/^\*/g, 
			function(a) { //任意tagName缩略写法
				sFun.push('el.nodeType==1');
				return '';
			}).replace(/^([\w\-]+)/g,//tagName缩略写法
			function(a) { 
				sFun.push('(el.tagName||"").toUpperCase()=="' + a.toUpperCase() + '"');
				return '';
			}).replace(/([\[(].*)|#([\w\-]+)|\.([\w\-]+)/g,//id缩略写法//className缩略写法
			function(a, b, c, d) { 
				return b || c && '[id="' + c + '"]' || d && '[className~="' + d + '"]';
			}).replace(reg, //普通写法[foo][foo=""][foo~=""]等
			function(a, b, c, d, e) { 
				var attrGetter = Selector._attrGetters[b] || 'el.getAttribute("' + b + '")';
				sFun.push(Selector._operators[c || ''].replace(/aa/g, attrGetter).replace(/vv/g, e || ''));
				return '';
			});
		if (!(/^\s*$/).test(s)) {
			throw "Unsupported Selector:\n" + sSelector + "\n-" + s;
		}
		for (var i = 0, pI; pI = pseudos[i]; i++) { //伪类过滤
			if (!Selector._pseudos[pI[0]]) throw "Unsupported Selector:\n" + pI[0] + "\n" + s;
			//标准化参数 && 把位置下标传进去，可以实现even和odd - by akira
			//__SltPsds[filter](el, match, i, els);
			sFun.push('__SltPsds["' + pI[0] + '"](el,"' + (pI[1] != null?encode4Js(pI[1]):'') + '",i,els)'); 
		}
		if (sFun.length) {
			if (isForArray) {
				return new Function('els', 'var els2=[];for(var i=0,el;el=els[i];i++){if(' + sFun.join('&&') + ') els2.push(el);} return els2;');
			} else {
				return (filterCache[sSelector] = new Function('el, i, els', 'return ' + sFun.join('&&') + ';'));
			}
		} else {
			if (isForArray) {
				return function(els) {
					return arrFilter(els, retTrue);
				};
			} else {
				return (filterCache[sSelector] = retTrue);
			}

		}
	}

	/* 
	* {int} xxxStamp: 全局变量查询标记
	*/
	var queryStamp = 0,
		nativeQueryStamp = 0,
		querySimpleStamp = 0;

	/*
	* nativeQuery(refEl,sSelector): 如果有原生的querySelectorAll，并且只是简单查询，则调用原生的query，否则返回null. 
	* @param {Element} refEl 参考元素
	* @param {string} sSelector selector字符串
	* @returns 
	*/
	function nativeQuery(refEl, sSelector) {
		if (hasNativeQuery && /^((^|,)\s*[.\w-][.\w\s\->+~]*)+$/.test(sSelector)) {
			//如果浏览器自带有querySelectorAll，并且本次query的是简单selector，则直接调用selector以加速
			//部分浏览器不支持以">~+"开始的关系运算符
			var oldId = refEl.id,
				tempId,
				arr = [],
				els;
			if (!oldId && refEl.parentNode) { //标准的querySelectorAll中的selector是相对于:root的，而不是相对于:scope的
				tempId = refEl.id = '__QW_slt_' + nativeQueryStamp++;
				try {
					els = refEl.querySelectorAll('#' + tempId + ' ' + sSelector);
				} finally {
					refEl.removeAttribute('id');
				}
			}
			else{
				els = refEl.querySelectorAll(sSelector);
			}
			for (var i = 0, elI; elI = els[i++];) arr.push(elI);
			return arr;
		}
		return null;
	}

	/* 
	* querySimple(pEl,sSelector): 得到以pEl为参考，符合过滤条件的HTML Elements. 
	* @param {Element} pEl 参考元素
	* @param {string} sSelector 里没有","运算符
	* @see: query。
	*/

	function querySimple(pEl, sSelector) {
		querySimpleStamp++;
		/*
			为了提高查询速度，有以下优先原则：
			最优先：原生查询
			次优先：在' '、'>'关系符出现前，优先正向（从左到右）查询
			次优先：id查询
			次优先：只有一个关系符，则直接查询
			最原始策略，采用关系判断，即：从最底层向最上层连线，能连线成功，则满足条件
		*/

		//最优先：原生查询
		var els = nativeQuery(pEl, sSelector);
		if (els) return els; //优先使用原生的

		var sltors = splitSelector(sSelector),
			pEls = [pEl],
			i,
			elI,
			pElI;

		var sltor0;
		//次优先：在' '、'>'关系符出现前，优先正向（从上到下）查询
		while (sltor0 = sltors[0]) {
			if (!pEls.length) return [];
			var relation = sltor0[0];
			els = [];
			if (relation == '+') { //第一个弟弟
				filter = s2f(sltor0[1]);
				for (i = 0; elI = pEls[i++];) {
					while (elI = elI.nextSibling) {
						if (elI.tagName) {
							if (filter(elI)) els.push(elI);
							break;
						}
					}
				}
				pEls = els;
				sltors.splice(0, 1);
			} else if (relation == '~') { //所有的弟弟
				filter = s2f(sltor0[1]);
				for (i = 0; elI = pEls[i++];) {
					if (i > 1 && elI.parentNode == pEls[i - 2].parentNode) continue; //除重：如果已经query过兄长，则不必query弟弟
					while (elI = elI.nextSibling) {
						if (elI.tagName) {
							if (filter(elI)) els.push(elI);
						}
					}
				}
				pEls = els;
				sltors.splice(0, 1);
			} else {
				break;
			}
		}
		var sltorsLen = sltors.length;
		if (!sltorsLen || !pEls.length) return pEls;

		//次优先：idIdx查询
		for (var idIdx = 0, id; sltor = sltors[idIdx]; idIdx++) {
			if ((/^[.\w-]*#([\w-]+)/i).test(sltor[1])) {
				id = RegExp.$1;
				sltor[1] = sltor[1].replace('#' + id, '');
				break;
			}
		}
		if (idIdx < sltorsLen) { //存在id
			var idEl = findId(id);
			if (!idEl) return [];
			for (i = 0, pElI; pElI = pEls[i++];) {
				if (!pElI.parentNode || elContains(pElI, idEl)) {
					els = filterByRelation(pElI, [idEl], sltors.slice(0, idIdx + 1));
					if (!els.length || idIdx == sltorsLen - 1) return els;
					return querySimple(idEl, sltors.slice(idIdx + 1).join(',').replace(/,/g, ' '));
				}
			}
			return [];
		}

		//---------------
		var getChildrenFun = function(pEl) {
			return pEl.getElementsByTagName(tagName);
		},
			tagName = '*',
			className = '';
		sSelector = sltors[sltorsLen - 1][1];
		sSelector = sSelector.replace(/^[\w\-]+/, function(a) {
			tagName = a;
			return "";
		});
		if (hasNativeQuery) {
			sSelector = sSelector.replace(/^[\w\*]*\.([\w\-]+)/, function(a, b) {
				className = b;
				return "";
			});
		}
		if (className) {
			getChildrenFun = function(pEl) {
				return pEl.querySelectorAll(tagName + '.' + className);
			};
		}

		//次优先：只剩一个'>'或' '关系符(结合前面的代码，这时不可能出现还只剩'+'或'~'关系符)
		if (sltorsLen == 1) {
			if (sltors[0][0] == '>') {
				getChildrenFun = getChildren;
				var filter = s2f(sltors[0][1], true);
			} else {
				filter = s2f(sSelector, true);
			}
			els = [];
			for (i = 0; pElI = pEls[i++];) {
				els = els.concat(filter(getChildrenFun(pElI)));
			}
			return els;
		}

		//走第一个关系符是'>'或' '的万能方案
		sltors[sltors.length - 1][1] = sSelector;
		els = [];
		for (i = 0; pElI = pEls[i++];) {
			els = els.concat(filterByRelation(pElI, getChildrenFun(pElI), sltors));
		}
		return els;
	}


	function splitSelector(sSelector) {
		var sltors = [];
		var reg = /(^|\s*[>+~ ]\s*)(([\w\-\:.#*]+|\([^\)]*\)|\[\s*((?:[\w\u00c0-\uFFFF-]|\\.)+)\s*(?:(\S?=)\s*(['"]*)(.*?)\6|)\s*\])+)(?=($|\s*[>+~ ]\s*))/g;
		var s = trim(sSelector).replace(reg, function(a, b, c, d) {
			sltors.push([trim(b), c]);
			return "";
		});
		if (!(/^\s*$/).test(s)) {
			throw "Unsupported Selector:\n" + sSelector + "\n--" + s;
		}
		return sltors;
	}

	/*
	判断一个长辈与子孙节点是否满足关系要求。----特别说明：这里的第一个关系只能是父子关系，或祖孙关系;
	*/

	function filterByRelation(pEl, els, sltors) {
		var sltor = sltors[0],
			len = sltors.length,
			needNotTopJudge = !sltor[0],
			filters = [],
			relations = [],
			needNext = [],
			relationsStr = '';

		for (var i = 0; i < len; i++) {
			sltor = sltors[i];
			filters[i] = s2f(sltor[1], i == len - 1); //过滤
			relations[i] = Selector._relations[sltor[0]]; //寻亲函数
			if (sltor[0] == '' || sltor[0] == '~') needNext[i] = true; //是否递归寻亲
			relationsStr += sltor[0] || ' ';
		}
		els = filters[len - 1](els); //自身过滤
		if (relationsStr == ' ') return els;
		if (/[+>~] |[+]~/.test(relationsStr)) { //需要回溯
			//alert(1); //用到这个分支的可能性很小。放弃效率的追求。

			function chkRelation(el) { //关系人过滤
				var parties = [],
					//中间关系人
					j = len - 1,
					party = parties[j] = el;
				for (; j > -1; j--) {
					if (j > 0) { //非最后一步的情况
						party = relations[j](party, filters[j - 1], pEl);
					} else if (needNotTopJudge || party.parentNode == pEl) { //最后一步通过判断
						return true;
					} else { //最后一步未通过判断
						party = null;
					}
					while (!party) { //回溯
						if (++j == len) { //cache不通过
							return false;
						}
						if (needNext[j]) {
							party = parties[j - 1];
							j++;
						}
					}
					parties[j - 1] = party;
				}
			};
			return arrFilter(els, chkRelation);
		} else { //不需回溯
			var els2 = [];
			for (var i = 0, el, elI; el = elI = els[i++];) {
				for (var j = len - 1; j > 0; j--) {
					if (!(el = relations[j](el, filters[j - 1], pEl))) {
						break;
					}
				}
				if (el && (needNotTopJudge || el.parentNode == pEl)) els2.push(elI);
			}
			return els2;
		}

	}

	QW.Selector = Selector;
}());/*import from ../dom/dom.u.js,(by build.py)*/

/*
	Copyright (c) Baidu Youa Wed QWrap
	author: 好奇、魔力鸟
*/

/** 
 * Dom Utils，是Dom模块核心类
 * @class DomU
 * @singleton
 * @namespace QW
 */
(function() {
	var Selector = QW.Selector;
	var Browser = QW.Browser;
	var DomU = {

		/** 
		 * 按cssselector获取元素集 
		 * @method	query
		 * @param {String} sSelector cssselector字符串
		 * @param {Element} refEl (Optional) 参考元素，默认为document.documentElement
		 * @return {Array}
		 */
		query: function(sSelector, refEl) {
			return Selector.query(refEl || document.documentElement, sSelector);
		},
		/** 
		 * 获取doc的一些坐标信息 
		 * 参考与YUI3.1.1
		 * @refer  https://github.com/yui/yui3/blob/master/build/dom/dom.js
		 * @method	getDocRect
		 * @param	{object} doc (Optional) document对象/默认为当前宿主的document
		 * @return	{object} 包含doc的scrollX,scrollY,width,height,scrollHeight,scrollWidth值的json
		 */
		getDocRect: function(doc) {
			doc = doc || document;

			var win = doc.defaultView || doc.parentWindow,
				mode = doc.compatMode,
				root = doc.documentElement,
				h = win.innerHeight || 0,
				w = win.innerWidth || 0,
				scrollX = win.pageXOffset || 0,
				scrollY = win.pageYOffset || 0,
				scrollW = root.scrollWidth,
				scrollH = root.scrollHeight;

			if (mode != 'CSS1Compat') { // Quirks
				root = doc.body;
				scrollW = root.scrollWidth;
				scrollH = root.scrollHeight;
			}

			if (mode && !Browser.opera) { // IE, Gecko
				w = root.clientWidth;
				h = root.clientHeight;
			}

			scrollW = Math.max(scrollW, w);
			scrollH = Math.max(scrollH, h);

			scrollX = Math.max(scrollX, doc.documentElement.scrollLeft, doc.body.scrollLeft);
			scrollY = Math.max(scrollY, doc.documentElement.scrollTop, doc.body.scrollTop);

			return {
				width: w,
				height: h,
				scrollWidth: scrollW,
				scrollHeight: scrollH,
				scrollX: scrollX,
				scrollY: scrollY
			};
		},

		/** 
		 * 通过html字符串创建Dom对象 
		 * @method	create
		 * @param	{string}	html html字符串
		 * @param	{boolean}	rfrag (Optional) 是否返回documentFragment对象
		 * @param	{object}	doc	(Optional)	document 默认为 当前document
		 * @return	{element}	返回html字符的element对象或documentFragment对象
		 */
		create: (function() {
			var temp = document.createElement('div'),
				wrap = {
					option: [1, '<select multiple="multiple">', '</select>'],
					optgroup: [1, '<select multiple="multiple">', '</select>'],
					legend: [1, '<fieldset>', '</fieldset>'],
					thead: [1, '<table>', '</table>'],
					tbody: [1, '<table>', '</table>'],
					tfoot : [1, '<table>', '</table>'],
					tr: [2, '<table><tbody>', '</tbody></table>'],
					td: [3, '<table><tbody><tr>', '</tr></tbody></table>'],
					th: [3, '<table><tbody><tr>', '</tr></tbody></table>'],
					col: [2, '<table><tbody></tbody><colgroup>', '</colgroup></table>'],
					_default: [0, '', '']
				},
				tagName = /<(\w+)/i;
			return function(html, rfrag, doc) {
				var dtemp = (doc && doc.createElement('div')) || temp,
					root = dtemp,
					tag = (tagName.exec(html) || ['', ''])[1],
					wr = wrap[tag] || wrap._default,
					dep = wr[0];
				dtemp.innerHTML = wr[1] + html + wr[2];
				while (dep--) {
					dtemp = dtemp.firstChild;
				}
				var el = dtemp.firstChild;
				if (!el || !rfrag) {
					while (root.firstChild) {
						root.removeChild(root.firstChild);
					}
					//root.innerHTML = '';
					return el;
				} else {
					doc = doc || document;
					var frag = doc.createDocumentFragment();
					while (el = dtemp.firstChild) {
						frag.appendChild(el);
					}
					return frag;
				}
			};
		}()),

		/** 
		 * 把NodeCollection转为ElementCollection
		 * @method	pluckWhiteNode
		 * @param	{NodeCollection|array} list Node的集合
		 * @return	{array}						Element的集合
		 */
		pluckWhiteNode: function(list) {
			var result = [],
				i = 0,
				l = list.length;
			for (; i < l; i++) {
				if (DomU.isElement(list[i])) {
					result.push(list[i]);
				}
			}
			return result;
		},

		/** 
		 * 判断Node实例是否继承了Element接口
		 * @method	isElement
		 * @param	{object} element Node的实例
		 * @return	{boolean}		 判断结果
		 */
		isElement: function(el) {
			return !!(el && el.nodeType == 1);
		},

		/** 
		 * 监听Dom树结构初始化完毕事件
		 * @method	ready
		 * @param	{function} handler 事件处理程序
		 * @param	{object}	doc	(Optional)	document 默认为 当前document
		 * @return	{void}
		 */
		ready: function(handler, doc) {
			doc = doc || document;

			if (/complete/.test(doc.readyState)) {
				handler();
			} else {
				if (doc.addEventListener) {
					if (!Browser.ie && ('interactive' == doc.readyState)) { // IE9下doc.readyState有些异常
						handler();
					} else {
						doc.addEventListener('DOMContentLoaded', handler, false);
					}
				} else {
					var fireDOMReadyEvent = function() {
						fireDOMReadyEvent = new Function();
						handler();
					};
					(function() {
						try {
							doc.body.doScroll('left');
						} catch (exp) {
							return setTimeout(arguments.callee, 1);
						}
						fireDOMReadyEvent();
					}());
					doc.attachEvent('onreadystatechange', function() {
						('complete' == doc.readyState) && fireDOMReadyEvent();
					});
				}
			}
		},


		/** 
		 * 判断一个矩形是否包含另一个矩形
		 * @method	rectContains
		 * @param	{object} rect1	矩形
		 * @param	{object} rect2	矩形
		 * @return	{boolean}		比较结果
		 */
		rectContains: function(rect1, rect2) {
			return rect1.left <= rect2.left && rect1.right >= rect2.right && rect1.top <= rect2.top && rect1.bottom >= rect2.bottom;
		},

		/** 
		 * 判断一个矩形是否和另一个矩形有交集
		 * @method	rectIntersect
		 * @param	{object} rect1	矩形
		 * @param	{object} rect2	矩形
		 * @return	{rect}			交集矩形或null
		 */
		rectIntersect: function(rect1, rect2) {
			//修正变量名
			var t = Math.max(rect1.top, rect2.top),
				r = Math.min(rect1.right, rect2.right),
				b = Math.min(rect1.bottom, rect2.bottom),
				l = Math.max(rect1.left, rect2.left);

			if (b >= t && r >= l) {
				return {
					top: t,
					right: r,
					bottom: b,
					left: l
				};
			} else {
				return null;
			}
		},

		/** 
		 * 创建一个element
		 * @method	createElement
		 * @param	{string}	tagName		元素类型
		 * @param	{json}		property	属性
		 * @param	{document}	doc	(Optional)		document
		 * @return	{element}	创建的元素
		 */
		createElement: function(tagName, property, doc) {
			doc = doc || document;
			var el = doc.createElement(tagName);
			if (property) {
				for (var i in property) {el[i] = property[i]; }
			}
			return el;
		},

		/** 
		 * 让一段cssText生效
		 * @method	insertCssText
		 * @param	{string}	cssText		css 字符串，例如:"a{color:red} h5{font-size:50px}"
		 * @return	{Element} 新创建的style元素
		 */
		insertCssText: function(cssText) {
			var oStyle = document.createElement("style");
			oStyle.type = "text/css";
			if (oStyle.styleSheet) {
				oStyle.styleSheet.cssText = cssText;
			} else {
				oStyle.appendChild(document.createTextNode(cssText));
			}
			return (document.getElementsByTagName("head")[0] || document.documentElement).appendChild(oStyle);
		}

	};

	QW.DomU = DomU;
}());/*import from ../dom/node.h.js,(by build.py)*/

/*
	Copyright (c) Baidu Youa Wed QWrap
	author: 好奇
*/
/** 
 * @class NodeH Node Helper，针对element兼容处理和功能扩展
 * @singleton
 * @namespace QW
 */
(function() {

	var ObjectH = QW.ObjectH,
		StringH = QW.StringH,
		DomU = QW.DomU,
		Browser = QW.Browser,
		Selector = QW.Selector,
		selector2Filter = Selector.selector2Filter;
		

	/** 
	 * 获得element对象
	 * @method	g
	 * @param	{element|string|wrap}	el	id,Element实例或wrap
	 * @param	{object}				doc		(Optional)document 默认为 当前document
	 * @return	{element}				得到的对象或null
	 */
	var g = function(el, doc) {
		if ('string' == typeof el) {
			if (el.indexOf('<') == 0) {return DomU.create(el, false, doc); }
			return (doc || document).getElementById(el);
		} else {
			return (ObjectH.isWrap(el)) ? arguments.callee(el[0]) : el; //如果NodeW是数组的话，返回第一个元素(modified by akira)
		}
	};

	var regEscape = function(str) {
		return String(str).replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
	};

	var getPixel = function(el, value) {
		if (/px$/.test(value) || !value) {return parseInt(value, 10) || 0; }
		var right = el.style.right,
			runtimeRight = el.runtimeStyle.right;
		var result;

		el.runtimeStyle.right = el.currentStyle.right;
		el.style.right = value;
		result = el.style.pixelRight || 0;

		el.style.right = right;
		el.runtimeStyle.right = runtimeRight;
		return result;
	};

	var NodeH = {

		/** 
		 * 获得element对象的outerHTML属性
		 * @method	outerHTML
		 * @param	{element|string|wrap}	el	id,Element实例或wrap
		 * @param	{object}				doc		(Optional)document 默认为 当前document
		 * @return	{string}				outerHTML属性值
		 */
		outerHTML: (function() {
			var temp = document.createElement('div');
			return function(el, doc) {
				el = g(el);
				if ('outerHTML' in el) {
					return el.outerHTML;
				} else {
					temp.innerHTML = '';
					var dtemp = (doc && doc.createElement('div')) || temp;
					dtemp.appendChild(el.cloneNode(true));
					return dtemp.innerHTML;
				}
			};
		}()),

		/** 
		 * 判断element是否包含某个className
		 * @method	hasClass
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{string}				className	样式名
		 * @return	{void}
		 */
		hasClass: function(el, className) {
			el = g(el);
			return new RegExp('(?:^|\\s)' + regEscape(className) + '(?:\\s|$)').test(el.className);
		},

		/** 
		 * 给element添加className
		 * @method	addClass
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{string}				className	样式名
		 * @return	{void}
		 */
		addClass: function(el, className) {
			el = g(el);
			if (!NodeH.hasClass(el, className)) {
				el.className = el.className ? el.className + ' ' + className : className;
			}
		},

		/** 
		 * 移除element某个className
		 * @method	removeClass
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{string}				className	样式名
		 * @return	{void}
		 */
		removeClass: function(el, className) {
			el = g(el);
			if (NodeH.hasClass(el, className)) {
				el.className = el.className.replace(new RegExp('(?:^|\\s)' + regEscape(className) + '(?=\\s|$)', 'ig'), '');
			}
		},

		/** 
		 * 替换element的className
		 * @method	replaceClass
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{string}				oldClassName	目标样式名
		 * @param	{string}				newClassName	新样式名
		 * @return	{void}
		 */
		replaceClass: function(el, oldClassName, newClassName) {
			el = g(el);
			if (NodeH.hasClass(el, oldClassName)) {
				el.className = el.className.replace(new RegExp('(^|\\s)' + regEscape(oldClassName) + '(?=\\s|$)', 'ig'), '$1' + newClassName);
			} else {
				NodeH.addClass(el, newClassName);
			}
		},

		/** 
		 * element的className1和className2切换
		 * @method	toggleClass
		 * @param	{element|string|wrap}	el			id,Element实例或wrap
		 * @param	{string}				className1		样式名1
		 * @param	{string}				className2		(Optional)样式名2
		 * @return	{void}
		 */
		toggleClass: function(el, className1, className2) {
			className2 = className2 || '';
			if (NodeH.hasClass(el, className1)) {
				NodeH.replaceClass(el, className1, className2);
			} else {
				NodeH.replaceClass(el, className2, className1);
			}
		},

		/** 
		 * 显示element对象
		 * @method	show
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{string}				value		(Optional)display的值 默认为空
		 * @return	{void}
		 */
		show: (function() {
			var store = {};
			function restore(tagName) {
				if (!store[tagName]) {
					var elem = document.createElement(tagName),
						body = document.body;
					NodeH.insertSiblingBefore(body.firstChild, elem);
					display = NodeH.getCurrentStyle(elem, "display");
					NodeH.removeChild(body, elem);
					body = elem = null;
					if (display === "none" || display === "") {
						display = "block";
					}
					store[tagName] = display;
				}
				return store[tagName];
			}
			return function(el, value) {
				el = g(el);
				if (!value) {
					var display = el.style.display;
					if (display === "none") {
						display = el.style.display = "";
					}
					if (display === "" && NodeH.getCurrentStyle(el, "display") === "none") {
						display = restore(el.nodeName);
					}
				}
				el.style.display = value || display;
			};
		}()),

		/** 
		 * 隐藏element对象
		 * @method	hide
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @return	{void}
		 */
		hide: function(el) {
			el = g(el);
			el.style.display = 'none';
		},
	    /** 
		 * 删除element对象的所有子节点
		 * @method	hide
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @return	{void}
		 */
		empty: function(el) {
			el = g(el);
			while (el.firstChild) {
				el.removeChild(el.firstChild);
			}
		},
		/** 
		 * 隐藏/显示element对象
		 * @method	toggle
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{string}				value		(Optional)显示时display的值 默认为空
		 * @return	{void}
		 */
		toggle: function(el, value) {
			if (NodeH.isVisible(el)) {
				NodeH.hide(el);
			} else {
				NodeH.show(el, value);
			}
		},

		/** 
		 * 判断element对象是否可见
		 * @method	isVisible
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @return	{boolean}				判断结果
		 */
		isVisible: function(el) {
			el = g(el);
			//return this.getStyle(el, 'visibility') != 'hidden' && this.getStyle(el, 'display') != 'none';
			//return !!(el.offsetHeight || el.offestWidth);
			return !!((el.offsetHeight + el.offsetWidth) && NodeH.getStyle(el, 'display') != 'none');
		},


		/** 
		 * 获取element对象距离doc的xy坐标
		 * 参考与YUI3.1.1
		 * @refer  https://github.com/yui/yui3/blob/master/build/dom/dom.js
		 * @method	getXY
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @return	{array}					x, y
		 */
		getXY: (function() {

			var calcBorders = function(node, xy) {
				var t = parseInt(NodeH.getCurrentStyle(node, 'borderTopWidth'), 10) || 0,
					l = parseInt(NodeH.getCurrentStyle(node, 'borderLeftWidth'), 10) || 0;

				if (Browser.gecko) {
					if (/^t(?:able|d|h)$/i.test(node.tagName)) {
						t = l = 0;
					}
				}
				xy[0] += l;
				xy[1] += t;
				return xy;
			};

			return document.documentElement.getBoundingClientRect ?
				function(node) {
					var doc = node.ownerDocument,
						docRect = DomU.getDocRect(doc),
						scrollLeft = docRect.scrollX,
						scrollTop = docRect.scrollY,
						box = node.getBoundingClientRect(),
						xy = [box.left, box.top],
						mode,
						off1,
						off2;
					if (Browser.ie) {
						off1 = doc.documentElement.clientLeft;
						off2 = doc.documentElement.clientTop;
						mode = doc.compatMode;

						if (mode == 'BackCompat') {
							off1 = doc.body.clientLeft;
							off2 = doc.body.clientTop;
						}

						xy[0] -= off1;
						xy[1] -= off2;

					}

					if (scrollTop || scrollLeft) {
						xy[0] += scrollLeft;
						xy[1] += scrollTop;
					}

					return xy;

				} : function(node) {
					var xy = [node.offsetLeft, node.offsetTop],
						parentNode = node.parentNode,
						doc = node.ownerDocument,
						docRect = DomU.getDocRect(doc),
						bCheck = !!(Browser.gecko || parseFloat(Browser.webkit) > 519),
						scrollTop = 0,
						scrollLeft = 0;

					while ((parentNode = parentNode.offsetParent)) {
						xy[0] += parentNode.offsetLeft;
						xy[1] += parentNode.offsetTop;
						if (bCheck) {
							xy = calcBorders(parentNode, xy);
						}
					}

					if (NodeH.getCurrentStyle(node, 'position') != 'fixed') {
						parentNode = node;

						while (parentNode = parentNode.parentNode) {
							scrollTop = parentNode.scrollTop;
							scrollLeft = parentNode.scrollLeft;

							if (Browser.gecko && (NodeH.getCurrentStyle(parentNode, 'overflow') !== 'visible')) {
								xy = calcBorders(parentNode, xy);
							}

							if (scrollTop || scrollLeft) {
								xy[0] -= scrollLeft;
								xy[1] -= scrollTop;
							}
						}

					}

					xy[0] += docRect.scrollX;
					xy[1] += docRect.scrollY;

					return xy;

				};

		}()),

		/** 
		 * 设置element对象的xy坐标
		 * @method	setXY
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{int}					x			(Optional)x坐标 默认不设置
		 * @param	{int}					y			(Optional)y坐标 默认不设置
		 * @return	{void}
		 */
		setXY: function(el, x, y) {
			el = g(el);
			x = parseInt(x, 10);
			y = parseInt(y, 10);
			if (!isNaN(x)) {NodeH.setStyle(el, 'left', x + 'px'); }
			if (!isNaN(y)) {NodeH.setStyle(el, 'top', y + 'px'); }
		},

		/** 
		 * 设置element对象的offset宽高
		 * @method	setSize
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{int}					w			(Optional)宽 默认不设置
		 * @param	{int}					h			(Optional)高 默认不设置
		 * @return	{void}
		 */
		setSize: function(el, w, h) {
			el = g(el);
			w = parseFloat(w, 10);
			h = parseFloat(h, 10);

			if (isNaN(w) && isNaN(h)) {return; }

			var borders = NodeH.borderWidth(el);
			var paddings = NodeH.paddingWidth(el);

			if (!isNaN(w)) {NodeH.setStyle(el, 'width', Math.max(+w - borders[1] - borders[3] - paddings[1] - paddings[3], 0) + 'px'); }
			if (!isNaN(h)) {NodeH.setStyle(el, 'height', Math.max(+h - borders[0] - borders[2] - paddings[0] - paddings[2], 0) + 'px'); }
		},

		/** 
		 * 设置element对象的宽高
		 * @method	setInnerSize
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{int}					w			(Optional)宽 默认不设置
		 * @param	{int}					h			(Optional)高 默认不设置
		 * @return	{void}
		 */
		setInnerSize: function(el, w, h) {
			el = g(el);
			w = parseFloat(w, 10);
			h = parseFloat(h, 10);

			if (!isNaN(w)) {NodeH.setStyle(el, 'width', w + 'px'); }
			if (!isNaN(h)) {NodeH.setStyle(el, 'height', h + 'px'); }
		},

		/** 
		 * 设置element对象的offset宽高和xy坐标
		 * @method	setRect
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{int}					x			(Optional)x坐标 默认不设置
		 * @param	{int}					y			(Optional)y坐标 默认不设置
		 * @param	{int}					w			(Optional)宽 默认不设置
		 * @param	{int}					h			(Optional)高 默认不设置
		 * @return	{void}
		 */
		setRect: function(el, x, y, w, h) {
			NodeH.setXY(el, x, y);
			NodeH.setSize(el, w, h);
		},

		/** 
		 * 设置element对象的宽高和xy坐标
		 * @method	setRect
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{int}					x			(Optional)x坐标 默认不设置
		 * @param	{int}					y			(Optional)y坐标 默认不设置
		 * @param	{int}					w			(Optional)宽 默认不设置
		 * @param	{int}					h			(Optional)高 默认不设置
		 * @return	{void}
		 */
		setInnerRect: function(el, x, y, w, h) {
			NodeH.setXY(el, x, y);
			NodeH.setInnerSize(el, w, h);
		},

		/** 
		 * 获取element对象的宽高
		 * @method	getSize
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @return	{object}				width,height
		 */
		getSize: function(el) {
			el = g(el);
			return {
				width: el.offsetWidth,
				height: el.offsetHeight
			};
		},

		/** 
		 * 获取element对象的宽高和xy坐标
		 * @method	setRect
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @return	{object}				width,height,left,top,bottom,right
		 */
		getRect: function(el) {
			el = g(el);
			var p = NodeH.getXY(el);
			var x = p[0];
			var y = p[1];
			var w = el.offsetWidth;
			var h = el.offsetHeight;
			return {
				'width': w,
				'height': h,
				'left': x,
				'top': y,
				'bottom': y + h,
				'right': x + w
			};
		},

		/** 
		 * 向后获取element对象符合条件的兄弟节点
		 * @method	nextSibling
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{string}				selector	(Optional)简单选择器 默认为空即最近的兄弟节点
		 * @return	{node}					找到的node或null
		 */
		nextSibling: function(el, selector) {
			var fcheck = selector2Filter(selector || '');
			el = g(el);
			do {
				el = el.nextSibling;
			} while (el && !fcheck(el));
			return el;
		},

		/** 
		 * 向前获取element对象符合条件的兄弟节点
		 * @method	previousSibling
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{string}				selector	(Optional)简单选择器 默认为空即最近的兄弟节点
		 * @return	{node}					找到的node或null
		 */
		previousSibling: function(el, selector) {
			var fcheck = selector2Filter(selector || '');
			el = g(el);
			do {
				el = el.previousSibling;
			} while (el && !fcheck(el));
			return el;
		},

		/** 
		 * 获取element对象符合条件的兄长节点
		 * @method	previousSiblings
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{string}				selector	(Optional)简单选择器 默认为空即所有的兄弟节点
		 * @return	{array}					element元素数组
		 */
		previousSiblings: function(el, selector) {
			var fcheck = selector2Filter(selector || ''),
				ret =[];
			el = g(el);
			while(el = el.previousSibling){
				if(fcheck(el)) {
					ret.push(el);
				}
			}
			return ret.reverse();
		},
		/** 
		 * 获取element对象符合条件的弟弟节点
		 * @method	nextSiblings
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{string}				selector	(Optional)简单选择器 默认为空即所有的兄弟节点
		 * @return	{array}					element元素数组
		 */
		nextSiblings: function(el, selector) {
			var fcheck = selector2Filter(selector || ''),
				ret =[];
			el = g(el);
			while(el = el.nextSibling){
				if(fcheck(el)) {
					ret.push(el);
				}
			}
			return ret;
		},

		/** 
		 * 获取element对象符合条件的兄弟节点，不包括自己
		 * @method	siblings
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{string}				selector	(Optional)简单选择器 默认为空即所有的兄弟节点
		 * @return	{array}					element元素数组
		 */
		siblings: function(el, selector) {
			var fcheck = selector2Filter(selector || ''),
				tempEl = el.parentNode.firstChild,
				ret =[];
			while(tempEl){
				if(el != tempEl && fcheck(tempEl)) {
					ret.push(tempEl);
				}
				tempEl = tempEl.nextSibling;
			}
			return ret;
		},

		/** 
		 * 向上获取element对象符合条件的兄弟节点
		 * @method	previousSibling
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{string}				selector	(Optional)简单选择器 默认为空即最近的兄弟节点
		 * @return	{element}					找到的node或null
		 */
		ancestorNode: function(el, selector) {
			var fcheck = selector2Filter(selector || '');
			el = g(el);
			do {
				el = el.parentNode;
			} while (el && !fcheck(el));
			return el;
		},

		/** 
		 * 向上获取element对象符合条件的兄弟节点
		 * @method	parentNode
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{string}				selector	(Optional)简单选择器 默认为空即最近的兄弟节点
		 * @return	{element}					找到的node或null
		 */
		parentNode: function(el, selector) {
			return NodeH.ancestorNode(el, selector);
		},

		/** 
		 * 获取element对象符合条件的所有祖先节点
		 * @method	ancestorNodes
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{string}				selector	(Optional)简单选择器 默认为空即所有的兄弟节点
		 * @return	{array}					element元素数组
		 */
		ancestorNodes: function(el, selector) {
			var fcheck = selector2Filter(selector || ''),
				ret =[];
			el = g(el);
			while(el = el.parentNode){
				if(fcheck(el)) {
					ret.push(el);
				}
			}
			return ret.reverse();
		},

		/** 
		 * 从element对象内起始位置获取符合条件的节点
		 * @method	firstChild
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{string}				selector	(Optional)简单选择器 默认为空即最近的兄弟节点
		 * @return	{node}					找到的node或null
		 */
		firstChild: function(el, selector) {
			var fcheck = selector2Filter(selector || '');
			el = g(el).firstChild;
			while (el && !fcheck(el)) {el = el.nextSibling; }
			return el;
		},

		/** 
		 * 从element对象内结束位置获取符合条件的节点
		 * @method	lastChild
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{string}				selector	(Optional)简单选择器 默认为空即最近的兄弟节点
		 * @return	{node}					找到的node或null
		 */
		lastChild: function(el, selector) {
			var fcheck = selector2Filter(selector || '');
			el = g(el).lastChild;
			while (el && !fcheck(el)) {el = el.previousSibling; }
			return el;
		},

		/** 
		 * 判断目标对象是否是element对象的子孙节点
		 * @method	contains
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{element|string|wrap}	target		Element对象
		 * @return	{boolean}				判断结果
		 */
		contains: function(el, target) {
			el = g(el);
			target = g(target);
			return el.contains ? el != target && el.contains(target) : !!(el.compareDocumentPosition(target) & 16);
		},

		/** 
		 * 向element对象前/后，内起始，内结尾插入html
		 * @method	insertAdjacentHTML
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{string}				sWhere		位置类型，可能值有：beforebegin、afterbegin、beforeend、afterend
		 * @param	{element|string|wrap}	html		插入的html
		 * @return	{void}
		 */
		insertAdjacentHTML: function(el, sWhere, html) {
			el = g(el);
			if (el.insertAdjacentHTML) {
				el.insertAdjacentHTML(sWhere, html);
			} else {
				var r = el.ownerDocument.createRange(), df;

				r.setStartBefore(el);
				df = r.createContextualFragment(html);
				NodeH.insertAdjacentElement(el, sWhere, df);
			}
		},

		/** 
		 * 向element对象前/后，内起始，内结尾插入element对象
		 * @method	insertAdjacentElement
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{string}				sWhere		位置类型，可能值有：beforebegin、afterbegin、beforeend、afterend
		 * @param	{element|string|html|wrap}	newEl		新对象。
		 * @return	{element}				newEl，新对象
		 */
		insertAdjacentElement: function(el, sWhere, newEl) {
			el = g(el);
			newEl = g(newEl);
			if (el.insertAdjacentElement) {
				el.insertAdjacentElement(sWhere, newEl);
			} else {
				switch (String(sWhere).toLowerCase()) {
				case "beforebegin":
					el.parentNode.insertBefore(newEl, el);
					break;
				case "afterbegin":
					el.insertBefore(newEl, el.firstChild);
					break;
				case "beforeend":
					el.appendChild(newEl);
					break;
				case "afterend":
					el.parentNode.insertBefore(newEl, el.nextSibling || null);
					break;
				}
			}
			return newEl;
		},

		/** 
		 * 向element对象前/后，内起始，内结尾插入element对象
		 * @method	insert
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{string}				sWhere		位置类型，可能值有：beforebegin、afterbegin、beforeend、afterend
		 * @param	{element|string|wrap}	newEl		新对象
		 * @return	{void}	
		 */
		insert: function(el, sWhere, newEl) {
			NodeH.insertAdjacentElement(el, sWhere, newEl);
		},

		/** 
		 * 把一个对象插到另一个对象邻近。
		 * @method	insertTo
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{string}				sWhere		位置类型，可能值有：beforebegin、afterbegin、beforeend、afterend
		 * @param	{element|string|wrap}	refEl		位置参考对象
		 * @return	{void}				
		 */
		insertTo: function(el, sWhere, refEl) {
			NodeH.insertAdjacentElement(refEl, sWhere, el);
		},

		/** 
		 * 向element对象内追加element对象
		 * @method	appendChild
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{element|string|wrap}	newEl		新对象
		 * @return	{element}				新对象newEl
		 */
		appendChild: function(el, newEl) {
			return g(el).appendChild(g(newEl));
		},

		/** 
		 * 向element对象前插入element对象
		 * @method	insertSiblingBefore
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{element|string|html|wrap}	newEl	新对象
		 * @return	{element}				新对象newEl
		 */
		insertSiblingBefore: function(el, newEl) {
			el = g(el);
			return el.parentNode.insertBefore(g(newEl), el);
		},

		/** 
		 * 向element对象后插入element对象
		 * @method	insertSiblingAfter
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{element|string|wrap}	newEl	新对象id,Element实例或wrap
		 * @return	{element}				新对象newEl
		 */
		insertSiblingAfter: function(el, newEl) {
			el = g(el);
			el.parentNode.insertBefore(g(newEl), el.nextSibling || null);
		},

		/** 
		 * 向element对象内部的某元素前插入element对象
		 * @method	insertBefore
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{element|string|wrap}	newEl	新对象id,Element实例或wrap
		 * @param	{element|string|wrap}	refEl	位置参考对象
		 * @return	{element}				新对象newEl
		 */
		insertBefore: function(el, newEl, refEl) {
			return g(el).insertBefore(g(newEl), (refEl && g(refEl)) || null);
		},

		/** 
		 * 向element对象内部的某元素后插入element对象
		 * @method	insertAfter
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{element|string|wrap}	newEl	新对象
		 * @param	{element|string|wrap}	refEl	位置参考对象
		 * @return	{element}				新对象newEl
		 */
		insertAfter: function(el, newEl, refEl) {
			return g(el).insertBefore(g(newEl), (refEl && g(refEl).nextSibling) || null);
		},

		/**
		 * 为element插入一个外框容器元素
		 * @method insertParent
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{element|string|wrap}	newEl	新对象
		 * @return  {element}				新对象newEl
		 */
		insertParent: function(el, newEl){
			NodeH.insertSiblingBefore(el, newEl);
			return NodeH.appendChild(newEl, el);
		},

		/** 
		 * 用一个元素替换自己
		 * @method	replaceNode
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{element|string|wrap}	newEl		新节点id,Element实例或wrap
		 * @return	{element}				如替换成功，此方法可返回被替换的节点，如替换失败，则返回 NULL
		 */
		replaceNode: function(el, newEl) {
			el = g(el);
			return el.parentNode.replaceChild(g(newEl), el);
		},

		/** 
		 * 从element里把relement替换成nelement
		 * @method	replaceChild
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{element|string|wrap}	newEl	新节点id,Element实例或wrap
		 * @param	{element|string|wrap}	childEl	被替换的id,Element实例或wrap后
		 * @return	{element}				如替换成功，此方法可返回被替换的节点，如替换失败，则返回 NULL
		 */
		replaceChild: function(el, newEl, childEl) {
			return g(el).replaceChild(g(newEl), g(childEl));
		},

		/** 
		 * 把element移除掉
		 * @method	removeNode
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @return	{element}				如删除成功，此方法可返回被删除的节点，如失败，则返回 NULL。
		 */
		removeNode: function(el) {
			el = g(el);
			return el.parentNode.removeChild(el);
		},

		/** 
		 * 从element里把childEl移除掉
		 * @method	removeChild
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{element|string|wrap}	childEl		需要移除的子对象
		 * @return	{element}				如删除成功，此方法可返回被删除的节点，如失败，则返回 NULL。
		 */
		removeChild: function(el, childEl) {
			return g(el).removeChild(g(childEl));
		},

		/** 
		 * 对元素调用ObjectH.get
		 * @method	get
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{string}				prop	成员名称
		 * @return	{object}				成员引用
		 * @see ObjectH.get
		 */
		get: function(el, prop) {
			//var args = [g(el)].concat([].slice.call(arguments, 1));
			el = g(el);
			return ObjectH.get.apply(null, arguments);
		},

		/** 
		 * 对元素调用ObjectH.set
		 * @method	set
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{string}				prop	成员名称
		 * @param	{object}				value		成员引用/内容
		 * @return	{void}
		 * @see ObjectH.set
		 */
		set: function(el, prop, value) {
			el = g(el);
			ObjectH.set.apply(null, arguments);
		},

		/** 
		 * 获取element对象的属性
		 * @method	getAttr
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{string}				attribute	属性名称
		 * @param	{int}					iFlags		(Optional)ieonly 获取属性值的返回类型 可设值0,1,2,4 
		 * @return	{string}				属性值 ie里有可能不是object
		 */
		getAttr: function(el, attribute, iFlags) {
			el = g(el);

			if ((attribute in el) && 'href' != attribute) {
				return el[attribute];
			} else {
				return el.getAttribute(attribute, iFlags || (el.nodeName == 'A' && attribute.toLowerCase() == 'href' && 2) || null);
			}
		},

		/** 
		 * 设置element对象的属性
		 * @method	setAttr
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{string}				attribute	属性名称
		 * @param	{string}				value		属性的值
		 * @param	{int}					iCaseSensitive	(Optional)
		 * @return	{void}
		 */
		setAttr: function(el, attribute, value, iCaseSensitive) {
			el = g(el);
			if ('object' != typeof attribute) {
				if (attribute in el) {
					el[attribute] = value;
				} else {
					el.setAttribute(attribute, value, iCaseSensitive || null);
				}
			} else {
				for (var prop in attribute) {
					NodeH.setAttr(el, prop, attribute[prop]);
				}
			}
		},

		/** 
		 * 删除element对象的属性
		 * @method	removeAttr
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{string}				attribute	属性名称
		 * @param	{int}					iCaseSensitive	(Optional)
		 * @return	{void}
		 */
		removeAttr: function(el, attribute, iCaseSensitive) {
			el = g(el);
			return el.removeAttribute(attribute, iCaseSensitive || 0);
		},

		/** 
		 * 根据条件查找element内元素组
		 * @method	query
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{string}				selector	条件
		 * @return	{array}					element元素数组
		 */
		query: function(el, selector) {
			el = g(el);
			return Selector.query(el, selector || '');
		},

		/** 
		 * 根据条件查找element内元素
		 * @method	one
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{string}				selector	条件
		 * @return	{HTMLElement}			element元素
		 */
		one: function(el, selector) {
			el = g(el);
			return Selector.one(el, selector || '');
		},

		/** 
		 * 查找element内所有包含className的集合
		 * @method	getElementsByClass
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{string}				className	样式名
		 * @return	{array}					element元素数组
		 */
		getElementsByClass: function(el, className) {
			el = g(el);
			return Selector.query(el, '.' + className);
		},

		/** 
		 * 获取element的value
		 * @method	getValue
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @return	{string}				元素value
		 */
		getValue: function(el) {
			el = g(el);
			//if(el.value==el.getAttribute('data-placeholder')) return '';
			return el.value;
		},

		/** 
		 * 设置element的value
		 * @method	setValue
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{string}				value		内容
		 * @return	{void}					
		 */
		setValue: function(el, value) {
			g(el).value = value;
		},

		/** 
		 * 获取element的innerHTML
		 * @method	getHTML
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @return	{string}					
		 */
		getHtml: function(el) {
			el = g(el);
			return el.innerHTML;
		},

		/** 
		 * 设置element的innerHTML
		 * @method	setHtml
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{string}				value		内容
		 * @return	{void}					
		 */
		setHtml: (function() {
			var mustAppend = /<(?:object|embed|option|style)/i,
				append = function(el, value) {
					NodeH.empty(el);
					NodeH.appendChild(el, DomU.create(value, true));
				};
			return function(el, value) {
				el = g(el);
				if (!mustAppend.test(value)) {
					try {
						el.innerHTML = value;
					} catch (ex) {
						append(el, value);	
					}
				} else {
					append(el, value);
				}
			};
		}()),

		/** 
		 * 获得form的所有elements并把value转换成由'&'连接的键值字符串
		 * @method	encodeURIForm
		 * @param	{element}	el			form对象
		 * @param	{string}	filter	(Optional)	过滤函数,会被循环调用传递给item作参数要求返回布尔值判断是否过滤
		 * @return	{string}					由'&'连接的键值字符串
		 */
		encodeURIForm: function(el, filter) {
			el = g(el);
			filter = filter || function(el) {return false; };
			var result = [],
				els = el.elements,
				l = els.length,
				i = 0,
				push = function(name, value) {
					result.push(encodeURIComponent(name) + '=' + encodeURIComponent(value));
				};
			for (; i < l; ++i) {
				el = els[i];
				var name = el.name;
				if (el.disabled || !name || filter(el)) {continue; }
				switch (el.type) {
				case "text":
				case "hidden":
				case "password":
				case "textarea":
					push(name, el.value);
					break;
				case "radio":
				case "checkbox":
					if (el.checked) {push(name, el.value); }
					break;
				case "select-one":
					if (el.selectedIndex > -1) {push(name, el.value); }
					break;
				case "select-multiple":
					var opts = el.options;
					for (var j = 0; j < opts.length; ++j) {
						if (opts[j].selected) {push(name, opts[j].value); }
					}
					break;
				}
			}
			return result.join("&");
		},

		/** 
		 * 判断form的内容是否有改变
		 * @method	isFormChanged
		 * @param	{element}	el			form对象
		 * @param	{string}	filter	(Optional)	过滤函数,会被循环调用传递给item作参数要求返回布尔值判断是否过滤
		 * @return	{bool}					是否改变
		 */
		isFormChanged: function(el, filter) {
			el = g(el);
			filter = filter ||
				function(el) {
					return false;
				};
			var els = el.elements,
				l = els.length,
				i = 0,
				j = 0,
				opts;
			for (; i < l; ++i, j = 0) {
				el = els[i];
				if (filter(el)) {continue; }
				switch (el.type) {
				case "text":
				case "hidden":
				case "password":
				case "textarea":
					if (el.defaultValue != el.value) {return true; }
					break;
				case "radio":
				case "checkbox":
					if (el.defaultChecked != el.checked) {return true; }
					break;
				case "select-one":
					j = 1;
				case "select-multiple":
					opts = el.options;
					for (; j < opts.length; ++j) {
						if (opts[j].defaultSelected != opts[j].selected) {return true; }
					}
					break;
				}
			}
			return false;
		},

		/** 
		 * 克隆元素
		 * @method	cloneNode
		 * @param	{element}	el			form对象
		 * @param	{bool}		bCloneChildren	(Optional) 是否深度克隆 默认值false
		 * @return	{element}					克隆后的元素
		 */
		cloneNode: function(el, bCloneChildren) {
			return g(el).cloneNode(bCloneChildren || false);
		},

		/** 
		 * 删除element对象的样式
		 * @method	removeStyle
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{string}				attribute	样式名
		 * @return	{void}				
		 */
		removeStyle : function (el, attribute) {
			el = g(el);

			var displayAttribute = StringH.camelize(attribute),
				hook = NodeH.cssHooks[displayAttribute];

			

			if (hook) {
				hook.remove(el);
			} else if (el.style.removeProperty) {
				el.style.removeProperty(StringH.decamelize(attribute));
			} else {
				el.style.removeAttribute(displayAttribute);
			}
		},

		/** 
		 * 获得element对象的样式
		 * @method	getStyle
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{string}				attribute	样式名
		 * @return	{string}				
		 */
		getStyle: function(el, attribute) {
			el = g(el);

			attribute = StringH.camelize(attribute);

			var hook = NodeH.cssHooks[attribute],
				result;

			if (hook) {
				result = hook.get(el);
			} else {
				result = el.style[attribute];
			}

			return (!result || result == 'auto') ? null : result;
		},

		/** 
		 * 获得element对象当前的样式
		 * @method	getCurrentStyle
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{string}				attribute	样式名
		 * @return	{string}				
		 */
		getCurrentStyle: function(el, attribute, pseudo) {
			el = g(el);

			var displayAttribute = StringH.camelize(attribute);

			var hook = NodeH.cssHooks[displayAttribute],
				result;

			if (hook) {
				result = hook.get(el, true, pseudo);
			} else if (Browser.ie) {
				result = el.currentStyle[displayAttribute];
			} else {
				var style = el.ownerDocument.defaultView.getComputedStyle(el, pseudo || null);
				result = style ? style.getPropertyValue(StringH.decamelize(attribute)) : null;
			}

			return (!result || result == 'auto') ? null : result;
		},

		/** 
		 * 设置element对象的样式
		 * @method	setStyle
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @param	{string}				attribute	样式名
		 * @param	{string}				value		值
		 * @return	{void}
		 */
		setStyle: function(el, attribute, value) {
			el = g(el);
			if ('object' != typeof attribute) {
				var displayAttribute = StringH.camelize(attribute),
					hook = NodeH.cssHooks[displayAttribute];

				if (hook) {
					hook.set(el, value);
				} else {
					el.style[displayAttribute] = value;
				}

			} else {
				for (var prop in attribute) {
					NodeH.setStyle(el, prop, attribute[prop]);
				}
			}
		},

		/** 
		 * 获取element对象的border宽度
		 * @method	borderWidth
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @return	{array}					topWidth, rightWidth, bottomWidth, leftWidth
		 */
		borderWidth: (function() {
			var map = {
				thin: 2,
				medium: 4,
				thick: 6
			};

			var getWidth = function(el, val) {
				var result = NodeH.getCurrentStyle(el, val);
				result = map[result] || parseFloat(result);
				return result || 0;
			};

			return function(el) {
				el = g(el);

				return [
					getWidth(el, 'borderTopWidth'),
					getWidth(el, 'borderRightWidth'),
					getWidth(el, 'borderBottomWidth'),
					getWidth(el, 'borderLeftWidth')
				];
			};
		}()),

		/** 
		 * 获取element对象的padding宽度
		 * @method	paddingWidth
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @return	{array}					topWidth, rightWidth, bottomWidth, leftWidth
		 */
		paddingWidth: function(el) {
			el = g(el);
			return [
				getPixel(el, NodeH.getCurrentStyle(el, 'paddingTop')),
				getPixel(el, NodeH.getCurrentStyle(el, 'paddingRight')),
				getPixel(el, NodeH.getCurrentStyle(el, 'paddingBottom')),
				getPixel(el, NodeH.getCurrentStyle(el, 'paddingLeft'))
			];
		},

		/** 
		 * 获取element对象的margin宽度
		 * @method	marginWidth
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @return	{array}					topWidth, rightWidth, bottomWidth, leftWidth
		 */
		marginWidth: function(el) {
			el = g(el);
			return [
				getPixel(el, NodeH.getCurrentStyle(el, 'marginTop')),
				getPixel(el, NodeH.getCurrentStyle(el, 'marginRight')),
				getPixel(el, NodeH.getCurrentStyle(el, 'marginBottom')),
				getPixel(el, NodeH.getCurrentStyle(el, 'marginLeft'))
			];
		},

		/** 
		 * 以元素的innerHTML当作字符串模板
		 * @method	tmpl
		 * @param	{element|string|wrap}	el		id,Element实例或wrap
		 * @return	{any}	data	模板参数
		 * @return	{string}	
		 * @see StringH.tmpl
		 */
		tmpl : function(el, data){
			el = g(el);
			return StringH.tmpl(el.innerHTML, data); 
		},

		cssHooks: (function() {
			var hooks = {
					'float': {
						get: function(el, current, pseudo) {
							if (current) {
								var style = el.ownerDocument.defaultView.getComputedStyle(el, pseudo || null);
								return style ? style.getPropertyValue('cssFloat') : null;
							} else {
								return el.style.cssFloat;
							}
						},
						set: function(el, value) {
							el.style.cssFloat = value;
						},
						remove : function (el) {
							el.style.removeProperty('float');
						}
					}
				};


			if (Browser.ie) {
				hooks['float'] = {
					get: function(el, current) {
						return el[current ? 'currentStyle' : 'style'].styleFloat;
					},
					set: function(el, value) {
						el.style.styleFloat = value;
					},
					remove : function (el) {
						el.style.removeAttribute('styleFloat');
					}
				};

				//对于IE9+，支持了标准的opacity，如果还走这个分支会有问题.（by Jerry Qu, code from JQuery.）
				var div = document.createElement('div'), link;
				div.innerHTML = "<a href='#' style='opacity:.55;'>a</a>";
				link = div.getElementsByTagName('a')[0];

				if(link && ! /^0.55$/.test( link.style.opacity )) {
					hooks.opacity = {
						get: function(el, current) {
							var opacity = 1;
							try {
								if (el.filters['alpha']) {
									opacity = el.filters['alpha'].opacity / 100;
								} else if (el.filters['DXImageTransform.Microsoft.Alpha']) {
									opacity = el.filters['DXImageTransform.Microsoft.Alpha'].opacity / 100;
								}

								if (isNaN(opacity)) {
									opacity = 1;
								}
							}
							catch (ex) { //ie的filter可能被浏览器插件破坏。
								;
							}

							return opacity;
						},

						set: function(el, value) {
							try {
								if (el.filters['alpha']) {
									el.filters['alpha'].opacity = value * 100;
								} else {
									el.style.filter += 'alpha(opacity=' + (value * 100) + ')';
								}
							}
							catch (ex) { //ie的filter可能被浏览器插件破坏。
								;
							}
							el.style.opacity = value;
						},

						remove : function (el) {
							el.style.filter = '';
							el.style.removeAttribute('opacity');
						}
					};
				}
			}
			return hooks;
		}())
	};

	NodeH.g = g;

	QW.NodeH = NodeH;
}());/*import from ../dom/node.w.js,(by build.py)*/

/*
	Copyright (c) Baidu Youa Wed QWrap
	author: JK
	author: wangchen
*/
/** 
 * @class NodeW HTMLElement对象包装器
 * @namespace QW
 */
(function() {
	var ObjectH = QW.ObjectH,
		mix = ObjectH.mix,
		isString = ObjectH.isString,
		isArray = ObjectH.isArray,
		toArray = QW.ArrayH.toArray,
		push = Array.prototype.push,
		NodeH = QW.NodeH,
		g = NodeH.g,
		query = NodeH.query,
		one = NodeH.one,
		create = QW.DomU.create;


	var NodeW = function(core) {
		if (!core) {//用法：var w=NodeW(null);	返回null
			return null;
		}
		if(core instanceof NodeW){	//core是W的话要直接返回，不然的话W(W(el))会变成只有一个元素
			return core;
		}
		var arg1 = arguments[1];
		if (isString(core)) {
			if (/^</.test(core)) { //用法：var w=NodeW(html); 
				var list = create(core, true, arg1).childNodes,
					els = [];
				for (var i = 0, elI; elI = list[i]; i++) {
					els[i] = elI;
				}
				return new NodeW(els);
			} else { //用法：var w=NodeW(sSelector);
				return new NodeW(query(arg1, core));
			}
		} else {
			core = g(core, arg1);
			if (this instanceof NodeW) {
				this.core = core;
				if (isArray(core)) { //用法：var w=NodeW(elementsArray); 
					this.length = 0;
					push.apply(this, core);
				} else { //用法：var w=new NodeW(element)//不推荐; 
					this.length = 1;
					this[0] = core;
				}
			} else {//用法：var w=NodeW(element); var w2=NodeW(elementsArray); 
				return new NodeW(core); 
			}
		}
	};

	NodeW.one = function(core) {
		if (!core) {//用法：var w=NodeW.one(null);	返回null
			return null;
		}
		var arg1 = arguments[1];
		if (isString(core)) { //用法：var w=NodeW.one(sSelector); 
			if (/^</.test(core)) { //用法：var w=NodeW.one(html); 
				return new NodeW(create(core, false, arg1));
			} else { //用法：var w=NodeW(sSelector);
				return new NodeW(one(arg1, core));
			}
		} else {
			core = g(core, arg1);
			if (isArray(core)) { //用法：var w=NodeW.one(array); 
				return new NodeW(core[0]);
			} else {//用法：var w=NodeW.one(element); 
				return new NodeW(core); 
			}
		}
	};

	/** 
	 * 在NodeW中植入一个针对Node的Helper
	 * @method	pluginHelper
	 * @static
	 * @param	{helper} helper 必须是一个针对Node（元素）的Helper	
	 * @param	{string|json} wrapConfig	wrap参数
	 * @param	{json} gsetterConfig	(Optional) gsetter 参数
	 * @param	{boolean} override 强制覆盖，写adapter的时候可能会用到，将NodeW原有的函数覆盖掉
	 * @return	{NodeW}	
	 */

	NodeW.pluginHelper = function(helper, wrapConfig, gsetterConfig, override) {
		var HelperH = QW.HelperH;

		helper = HelperH.mul(helper, wrapConfig); //支持第一个参数为array

		var st = HelperH.rwrap(helper, NodeW, wrapConfig); //对返回值进行包装处理
		if (gsetterConfig) {//如果有gsetter，需要对表态方法gsetter化
			st = HelperH.gsetter(st, gsetterConfig);
		}

		mix(NodeW, st, override); //应用于NodeW的静态方法

		var pro = HelperH.methodize(helper, 'core');
		pro = HelperH.rwrap(pro, NodeW, wrapConfig);
		if (gsetterConfig) {
			pro = HelperH.gsetter(pro, gsetterConfig);
		}
		mix(NodeW.prototype, pro, override);
	};

	mix(NodeW.prototype, {
		/** 
		 * 返回NodeW的第0个元素的包装
		 * @method	first
		 * @return	{NodeW}	
		 */
		first: function() {
			return NodeW(this[0]);
		},
		/** 
		 * 返回NodeW的最后一个元素的包装
		 * @method	last
		 * @return	{NodeW}	
		 */
		last: function() {
			return NodeW(this[this.length - 1]);
		},
		/** 
		 * 返回NodeW的第i个元素的包装
		 * @method	last
		 * @param {int}	i 第i个元素
		 * @return	{NodeW}	
		 */
		item: function(i) {
			return NodeW(this[i]);
		},
		/** 
		 * 在NodeW的每个项上运行一个函数，并将函数返回真值的项组成数组，包装成NodeW返回。
		 * @method filter
		 * @param {Function|String} callback 需要执行的函数，也可以是css selector字符串，也可以是boolean
		 * @param {Object} pThis (Optional) 指定callback的this对象.
		 * @return {NodeW}
		 */
		filter: function(callback, pThis) {
			if (callback === true) {
				return NodeW(this.core);
			}
			if (callback === false) {
				return NodeW([]);
			}
			if (typeof callback == 'string') {
				callback = QW.Selector.selector2Filter(callback);
			}
			return NodeW(ArrayH.filter(this, callback, pThis));
		}
	});

	QW.NodeW = NodeW;
}());/*import from ../dom/event.h.js,(by build.py)*/

/*
	Copyright (c) Baidu Youa Wed QWrap
	author: 好奇
*/

/** 
 * @class EventH Event Helper，处理一些Event对象兼容问题
 * @singleton
 * @helper
 * @namespace QW
 */
(function() {
	function getDoc(e) {
		var target = EventH.getTarget(e),
			doc = document;
		if (target) { //ie unload target is null
			doc = target.ownerDocument || target.document || ((target.defaultView || target.window) && target) || document;
		}
		return doc;
	}

	var EventH = {

		/** 
		 * 获取鼠标位于完整页面的X坐标
		 * @method	getPageX
		 * @param	{event}		event	(Optional)event对象 默认为调用位置所在宿主的event
		 * @param	{element}	element (Optional)任意element对象 element对象所在宿主的event
		 * @return	{int}		X坐标
		 */
		getPageX: function(e) {
			e = e || EventH.getEvent.apply(EventH, arguments);
			var doc = getDoc(e);
			return ('pageX' in e) ? e.pageX : (e.clientX + (doc.documentElement.scrollLeft || doc.body.scrollLeft) - 2);
		},

		/** 
		 * 获取鼠标位于完整页面的Y坐标
		 * @method	getPageY
		 * @param	{event}		event	(Optional)event对象 默认为调用位置所在宿主的event
		 * @param	{element}	element (Optional)任意element对象 element对象所在宿主的event
		 * @return	{int}		Y坐标
		 */
		getPageY: function(e) {
			e = e || EventH.getEvent.apply(EventH, arguments);
			var doc = getDoc(e);
			return ('pageY' in e) ? e.pageY : (e.clientY + (doc.documentElement.scrollTop || doc.body.scrollTop) - 2);
		},


		/** 
		 * 获取鼠标滚轮方向
		 * @method	getDetail
		 * @param	{event}		event	(Optional)event对象 默认为调用位置所在宿主的event
		 * @param	{element}	element (Optional)任意element对象 element对象所在宿主的event
		 * @return	{int}		大于0向下,小于0向上.
		 */
		getDetail: function(e) {
			e = e || EventH.getEvent.apply(EventH, arguments);
			return e.detail || -(e.wheelDelta || 0);
		},

		/** 
		 * 获取触发事件的按键对应的ascii码
		 * @method	getKeyCode
		 * @param	{event}		event	(Optional)event对象 默认为调用位置所在宿主的event
		 * @param	{element}	element (Optional)任意element对象 element对象所在宿主的event
		 * @return	{int}		键盘ascii
		 */
		getKeyCode: function(e) {
			e = e || EventH.getEvent.apply(EventH, arguments);
			return ('keyCode' in e) ? e.keyCode : (e.charCode || e.which || 0);
		},

		/** 
		 * 阻止事件冒泡
		 * @method	stopPropagation
		 * @param	{event}		event	(Optional)event对象 默认为调用位置所在宿主的event
		 * @param	{element}	element (Optional)任意element对象 element对象所在宿主的event
		 * @return	{void}
		 */
		stopPropagation: function(e) {
			e = e || EventH.getEvent.apply(EventH, arguments);
			if (e.stopPropagation) {
				e.stopPropagation();
			} else {
				e.cancelBubble = true;
			}
		},

		/** 
		 * 阻止事件默认行为
		 * @method	preventDefault
		 * @param	{event}		event	(Optional)event对象 默认为调用位置所在宿主的event
		 * @param	{element}	element (Optional)任意element对象 element对象所在宿主的event
		 * @return	{void}
		 */
		preventDefault: function(e) {
			e = e || EventH.getEvent.apply(EventH, arguments);
			if (e.preventDefault) {
				e.preventDefault();
			} else {
				e.returnValue = false;
			}
		},

		/** 
		 * 获取事件触发时是否持续按住ctrl键
		 * @method	getCtrlKey
		 * @param	{event}		event	(Optional)event对象 默认为调用位置所在宿主的event
		 * @param	{element}	element (Optional)任意element对象 element对象所在宿主的event
		 * @return	{boolean}	判断结果
		 */
		getCtrlKey: function(e) {
			e = e || EventH.getEvent.apply(EventH, arguments);
			return e.ctrlKey;
		},

		/** 
		 * 事件触发时是否持续按住shift键
		 * @method	getShiftKey
		 * @param	{event}		event	(Optional)event对象 默认为调用位置所在宿主的event
		 * @param	{element}	element (Optional)任意element对象 element对象所在宿主的event
		 * @return	{boolean}	判断结果
		 */
		getShiftKey: function(e) {
			e = e || EventH.getEvent.apply(EventH, arguments);
			return e.shiftKey;
		},

		/** 
		 * 事件触发时是否持续按住alt键
		 * @method	getAltKey
		 * @param	{event}		event	(Optional)event对象 默认为调用位置所在宿主的event
		 * @param	{element}	element (Optional)任意element对象 element对象所在宿主的event
		 * @return	{boolean}	判断结果
		 */
		getAltKey: function(e) {
			e = e || EventH.getEvent.apply(EventH, arguments);
			return e.altKey;
		},

		/** 
		 * 触发事件的元素
		 * @method	getTarget
		 * @param	{event}		event	(Optional)event对象 默认为调用位置所在宿主的event
		 * @param	{element}	element (Optional)任意element对象 element对象所在宿主的event
		 * @return	{element}	node 对象
		 */
		getTarget: function(e) {
			e = e || EventH.getEvent.apply(EventH, arguments);
			var node = e.srcElement || e.target;
			if (node && node.nodeType == 3) {
				node = node.parentNode;
			}
			return node;
		},

		/** 
		 * 获取元素
		 * @method	getRelatedTarget
		 * @param	{event}		event	(Optional)event对象 默认为调用位置所在宿主的event
		 * @param	{element}	element (Optional)任意element对象 element对象所在宿主的event
		 * @return	{element}	mouseover/mouseout 事件时有效 over时为来源元素,out时为移动到的元素.
		 */
		getRelatedTarget: function(e) {
			e = e || EventH.getEvent.apply(EventH, arguments);
			if ('relatedTarget' in e) {return e.relatedTarget; }
			if (e.type == 'mouseover') {return e.fromElement; }
			if (e.type == 'mouseout') {return e.toElement; }
		},

		/** 
		 * 获得event对象
		 * @method	getEvent
		 * @param	{event}		event	(Optional)event对象 默认为调用位置所在宿主的event
		 * @param	{element}	element (Optional)任意element对象 element对象所在宿主的event
		 * @return	{event}		event对象
		 */
		getEvent: function(event, element) {
			if (event) {
				return event;
			} else if (element) {
				if (element.document) {return element.document.parentWindow.event; }
				if (element.parentWindow) {return element.parentWindow.event; }
			}

			if (window.event) {
				return window.event;
			} else {
				var f = arguments.callee;
				do {
					if (/Event/.test(f.arguments[0])) {return f.arguments[0]; }
				} while (f = f.caller);
			}
		},
		_EventPro: {
			stopPropagation: function() {
				this.cancelBubble = true;
			},
			preventDefault: function() {
				this.returnValue = false;
			}
		},
		/** 
		 * 为event补齐标准方法
		 * @method	standardize
		 * @param	{event}		event	event对象
		 * @return	{event}		event对象
		 */
		standardize: function(e){
			e = e || EventH.getEvent.apply(EventH, arguments);

			if(!('target' in e)) {
				e.target = EventH.getTarget(e);
			}
			if(!('relatedTarget' in e)) {
				e.relatedTarget = EventH.getRelatedTarget(e);
			}
			if (!('pageX' in e)) {
				e.pageX = EventH.getPageX(e);
				e.pageY = EventH.getPageY(e);
			}
			if (!('detail' in e)) {
				e.detail = EventH.getDetail(e);
			}
			if (!('keyCode' in e)) {
				e.keyCode = EventH.getKeyCode(e);
			}
			for(var i in EventH._EventPro){
				if (e[i] == null) {
					e[i] = EventH._EventPro[i];
				}
			}
			return e;
		}
	};


	QW.EventH = EventH;
}());/*import from ../dom/eventtarget.h.js,(by build.py)*/

/*
	Copyright (c) Baidu Youa Wed QWrap
	version: $version$ $release$ released
	author: WC(好奇)、JK(加宽)
*/

/** 
 * @class EventTargetH EventTarget Helper，处理和事件触发目标有关的兼容问题
 * @singleton
 * @helper
 * @namespace QW
 */

(function() {

	var g = QW.NodeH.g,
		mix = QW.ObjectH.mix,
		standardize = QW.EventH.standardize,
		UA = navigator.userAgent,
		hasTouch = 'ontouchstart' in window && !/hp-tablet/gi.test(navigator.appVersion);

	/*
	 *Cache的格式：
		{
			"el.__QWETH_id":{
				'eventType+handler.__QWETH_id': realHandler,
				'eventType+handler.__QWETH_id+selector': realHandler
			}
		}
	 */
	var Cache = function() {
		var cacheSeq = 1,
			seqProp = '__QWETH_id';
		return {
			get: function(el, eventName, handler, selector) {
				var data = el[seqProp] && this[el[seqProp]];
				if (data && handler[seqProp]) {
					return data[eventName + handler[seqProp] + (selector || '')];
				}
			},
			add: function(realHandler, el, eventName, handler, selector) {
				if (!el[seqProp]) el[seqProp] = cacheSeq++;
				if (!handler[seqProp]) handler[seqProp] = cacheSeq++;
				var data = this[el[seqProp]] || (this[el[seqProp]] = {});
				data[eventName + handler[seqProp] + (selector || '')] = realHandler;
			},
			remove: function(el, eventName, handler, selector) {
				var data = el[seqProp] && this[el[seqProp]];
				if (data && handler[seqProp]) {
					delete data[eventName + handler[seqProp] + (selector || '')];
				}
			},
			removeEvents: function(el, eventName) {
				var data = el[seqProp] && this[el[seqProp]];
				if (data) {
					var reg = new RegExp('^[a-zA-Z.]*' + (eventName || '') + '\\d+$');
					for (var i in data) {
						if (reg.test(i)) {
							EventTargetH.removeEventListener(el, i.split(/[^a-zA-Z]/)[0], data[i]);
							delete data[i];
						}
					}
				}
			},
			removeDelegates: function(el, eventName, selector) {
				var data = el[seqProp] && this[el[seqProp]];
				if (data) {
					var reg = new RegExp('^([a-zA-Z]+\\.)?' + (eventName || '') + '\\d+.+');
					for (var i in data) {
						if (reg.test(i) && (!selector || i.substr(i.length - selector.length) == selector)) {
							var name = i.split(/\d+/)[0].split('.'),
								needCapture = EventTargetH._DelegateCpatureEvents.indexOf(name[1]||name[0]) > -1;
							EventTargetH.removeEventListener(el, i.split(/[^a-zA-Z]/)[0], data[i], needCapture);
							delete data[i];
						}
					}
				}
			}
		};
	}();


	/* 
	 * 监听方法
	 * @method	listener
	 * @private
	 * @param	{Element}	el		元素
	 * @param	{string}	sEvent	事件名称
	 * @param	{function}	handler	委托函数
	 * @param	{string}	userEventName	原事件名称（被hook的事件）
	 * @return	{object}	委托方法执行结果
	 */

	function listener(el, sEvent, handler, userEventName) {
		return Cache.get(el, sEvent + (userEventName ? '.' + userEventName : ''), handler) || function(e) {
			//如果有hook并且hook没有返回false的话
			if (!userEventName || userEventName && EventTargetH._EventHooks[userEventName][sEvent](el, e, handler)) {
				return fireHandler(el, e, handler, sEvent); //继续fire
			}
		};
	}

	/* 
	 * delegate监听方法
	 * @method	delegateListener
	 * @private
	 * @param	{Element}	el		监听目标
	 * @param	{string}	selector	选择器
	 * @param	{string}	sEvent		事件名称
	 * @param	{function}	handler		委托函数
	 * @param	{string}	userEventName	原事件名称（被hook的事件）
	 * @return	{object}	委托方法执行结果
	 */

	function delegateListener(el, selector, sEvent, handler, userEventName) {
		return Cache.get(el, sEvent + (userEventName ? '.' + userEventName : ''), handler, selector) || function(e) {
			var elements = [],
				node = e.srcElement || e.target;
			if (!node) {
				return;
			}
			if (node.nodeType == 3) {
				node = node.parentNode;
			}
			while (node && node != el) {
				elements.push(node);
				node = node.parentNode;
			}
			elements = QW.Selector.filter(elements, selector, el);
			for (var i = 0, l = elements.length; i < l; ++i) {
				if (!userEventName || userEventName && EventTargetH._DelegateHooks[userEventName][sEvent](elements[i], e || window.event, handler)) {
					fireHandler(elements[i], e, handler, sEvent);
				}
				if (elements[i].parentNode && elements[i].parentNode.nodeType == 11) { //fix remove elements[i] bubble bug
					if (e.stopPropagation) {
						e.stopPropagation();
					} else {
						e.cancelBubble = true;
					}
					break;
				}
			}
		};
	}

	/* 
	 * 事件执行入口
	 * @method	fireHandler
	 * @private
	 * @param	{Element}	el			触发事件对象
	 * @param	{event}		event		事件对象
	 * @param	{function}	handler		事件委托
	 * @param	{string}	sEvent		处理前事件名称
	 * @return	{object}	事件委托执行结果
	 */

	function fireHandler(el, e, handler, sEvent) {
		return EventTargetH.fireHandler.apply(null, arguments);
	}


	var EventTargetH = {
		_EventHooks: {},
		_DelegateHooks: {},
		_DelegateCpatureEvents:'change,focus,blur',
		/** 
		 * 事件执行入口
		 * @method	fireHandler
		 * @private
		 * @param	{Element}	el			触发事件对象
		 * @param	{event}		event		事件对象
		 * @param	{function}	handler		事件委托
		 * @param	{string}	sEvent		处理前事件名称
		 * @return	{object}	事件委托执行结果
		 */
		fireHandler: function(el, e, handler, sEvent) {
			e = standardize(e);
			e.userType = sEvent;
			return handler.call(el, e);
		},

		/**
		 * 添加事件监听
		 * @method	addEventListener
		 * @param	{Element}	el	监听目标
		 * @param	{string}	sEvent	事件名称
		 * @param	{function}	handler	事件处理程序
		 * @param	{bool}		capture	(Optional)是否捕获非ie才有效
		 * @return	{void}
		 */
		addEventListener: (function() {
			if (document.addEventListener) {
				return function(el, sEvent, handler, capture) {
					el.addEventListener(sEvent, handler, capture || false);
				};
			} else {
				return function(el, sEvent, handler) {//注意：添加重复的handler时，IE的attachEvent也会执行成功。这点与addEventListener不一样。
					el.attachEvent('on' + sEvent, handler);
				};
			}
		}()),

		/**
		 * 移除事件监听
		 * @method	removeEventListener
		 * @private
		 * @param	{Element}	el	监听目标
		 * @param	{string}	sEvent	事件名称
		 * @param	{function}	handler	事件处理程序
		 * @param	{bool}		capture	(Optional)是否捕获非ie才有效
		 * @return	{void}
		 */
		removeEventListener: (function() {
			if (document.removeEventListener) {
				return function(el, sEvent, handler, capture) {
					el.removeEventListener(sEvent, handler, capture || false);
				};
			} else {
				return function(el, sEvent, handler) {
					el.detachEvent('on' + sEvent, handler);
				};
			}
		}()),

		/** 
		 * 添加对指定事件的监听
		 * @method	on
		 * @param	{Element}	el	监听目标
		 * @param	{string}	sEvent	事件名称
		 * @param	{function}	handler	事件处理程序
		 * @return	{void}	
		 */
		on: function(el, sEvent, handler) {
			el = g(el);
			var hooks = EventTargetH._EventHooks[sEvent];
			if (hooks) {
				for (var i in hooks) {
					var _listener = listener(el, i, handler, sEvent);
					Cache.add(_listener, el, i+'.'+sEvent, handler);
					EventTargetH.on(el, i, _listener);
				}
			} else {
				_listener = listener(el, sEvent, handler);
				EventTargetH.addEventListener(el, sEvent, _listener);
				Cache.add(_listener, el, sEvent, handler);
			}
		},

		/** 
		 * 移除对指定事件的监听
		 * @method	un
		 * @param	{Element}	el	移除目标
		 * @param	{string}	sEvent	(Optional)事件名称
		 * @param	{function}	handler	(Optional)事件处理程序
		 * @return	{boolean}	
		 */
		un: function(el, sEvent, handler) {
			el = g(el);
			if (!handler) { //移除多个临控
				return Cache.removeEvents(el, sEvent);
			}
			var hooks = EventTargetH._EventHooks[sEvent];
			if (hooks) {
				for (var i in hooks) {
					var _listener = listener(el, i, handler, sEvent);
					EventTargetH.un(el, i, _listener);
					Cache.remove(el, i+'.'+sEvent, handler);
				}
			} else {
				_listener = listener(el, sEvent, handler);
				EventTargetH.removeEventListener(el, sEvent, _listener);
				Cache.remove(el, sEvent, handler);
			}
		},

		/** 
		 * 添加对指定事件的一次性监听，即事件执行后就移除该监听。
		 * @method	on
		 * @param	{Element}	el	监听目标
		 * @param	{string}	sEvent	事件名称
		 * @param	{function}	handler	事件处理程序
		 * @return	{void}	
		 */
		once: function(el, sEvent, handler) {
			el = g(el);
			var handler2 = function(){
				handler.apply(this,arguments);
				EventTargetH.un(el, sEvent, handler2);
			}
			EventTargetH.on(el, sEvent, handler2);
		},

		/** 
		 * 添加事件委托
		 * @method	delegate
		 * @param	{Element}	el		被委托的目标
		 * @param	{string}	selector	委托的目标
		 * @param	{string}	sEvent		事件名称
		 * @param	{function}	handler		事件处理程序
		 * @return	{boolean}	事件监听是否移除成功
		 */
		delegate: function(el, selector, sEvent, handler) {
			el = g(el);
			var hooks = EventTargetH._DelegateHooks[sEvent],
				needCapture = EventTargetH._DelegateCpatureEvents.indexOf(sEvent) > -1;
			if (hooks) {
				for (var i in hooks) {
					var _listener = delegateListener(el, selector, i, handler, sEvent);
					Cache.add(_listener, el, i+'.'+sEvent, handler, selector);
					EventTargetH.delegate(el, selector, i, _listener);
				}
			} else {
				_listener = delegateListener(el, selector, sEvent, handler);
				EventTargetH.addEventListener(el, sEvent, _listener, needCapture);
				Cache.add(_listener, el, sEvent, handler, selector);
			}
		},

		/** 
		 * 移除事件委托
		 * @method	undelegate
		 * @param	{Element}	el		被委托的目标
		 * @param	{string}	selector	(Optional)委托的目标
		 * @param	{string}	sEvent		(Optional)事件名称
		 * @param	{function}	handler		(Optional)事件处理程序
		 * @return	{boolean}	事件监听是否移除成功
		 */
		undelegate: function(el, selector, sEvent, handler) {
			el = g(el);
			if (!handler) { //移除多个临控
				return Cache.removeDelegates(el, sEvent, selector);
			}
			var hooks = EventTargetH._DelegateHooks[sEvent],
				needCapture = EventTargetH._DelegateCpatureEvents.indexOf(sEvent) > -1;
			if (hooks) {
				for (var i in hooks) {
					var _listener = delegateListener(el, selector, i, handler, sEvent);
					EventTargetH.undelegate(el, selector, i, _listener);
					Cache.remove(el, i+'.'+sEvent, handler, selector);
				}
			} else {
				_listener = delegateListener(el, selector, sEvent, handler);
				EventTargetH.removeEventListener(el, sEvent, _listener, needCapture);
				Cache.remove(el, sEvent, handler, selector);
			}
		},

		/** 
		 * 触发对象的指定事件
		 * @method	fire
		 * @param	{Element}	el	要触发事件的对象
		 * @param	{string}	sEvent	事件名称
		 * @return	{void}
		 */
		fire: (function() {
			if (document.dispatchEvent) {
				return function(el, sEvent) {
					var evt = null,
						doc = el.ownerDocument || el;
					if (/mouse|click/i.test(sEvent)) {
						evt = doc.createEvent('MouseEvents');
						evt.initMouseEvent(sEvent, true, true, doc.defaultView, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
					} else {
						evt = doc.createEvent('Events');
						evt.initEvent(sEvent, true, true, doc.defaultView);
					}
					return el.dispatchEvent(evt);
				};
			} else {
				return function(el, sEvent) {
					return el.fireEvent('on' + sEvent);
				};
			}
		}())
	};

	EventTargetH._defaultExtend = function() {
		var extend = function(types) {
			function extendType(type) {
				EventTargetH[type] = function(el, handler) {
					if (handler) {
						EventTargetH.on(el, type, handler);
					} else if (el[type]){
						el[type]();
					} else {
						EventTargetH.fire(el, type);
					}
				};
			}
			for (var i = 0, l = types.length; i < l; ++i) {
				extendType(types[i]);
			}
		};

		/** 
		 * 绑定对象的click事件或者执行click方法
		 * @method	click
		 * @param	{Element}	el	要触发事件的对象
		 * @param	{function}	handler	(Optional)事件委托
		 * @return	{void}
		 */


		/** 
		 * 绑定对象的submit事件或者执行submit方法
		 * @method	submit
		 * @param	{Element}	el	要触发事件的对象
		 * @param	{function}	handler	(Optional)事件委托
		 * @return	{void}
		 */

		/** 
		 * 绑定对象的focus事件或者执行focus方法
		 * @method	focus
		 * @param	{Element}	el	要触发事件的对象
		 * @param	{function}	handler	(Optional)事件委托
		 * @return	{void}
		 */

		/** 
		 * 绑定对象的blur事件或者执行blur方法
		 * @method	blur
		 * @param	{Element}	el	要触发事件的对象
		 * @param	{function}	handler	(Optional)事件委托
		 * @return	{void}
		 */

		extend('submit,reset,click,focus,blur,change,select'.split(','));

		EventTargetH.hover = function(el, enter, leave) {
			el = g(el);
			EventTargetH.on(el, 'mouseenter', enter);
			EventTargetH.on(el, 'mouseleave', leave || enter);
		};

		var abs = Math.abs;

		EventTargetH.touchover = function(el, enter, leave){
			el = g(el);
			var startX, startY, hovered;
			EventTargetH.on(el, 'touchstart', function(e){
				var point = e.touches[0] || e;
				startX = point.pageX;
				startY = point.pageY;
				enter.apply(this, arguments);
				hovered = true;
			});
			EventTargetH.on(el, 'touchmove', function(e){
				var point = e.touches[0] || e;
					deltaX = abs(point.pageX - startX),
					deltaY = abs(point.pageY - startY);
				if(deltaX > 36 || deltaY > 36){
					(leave || enter).apply(this, arguments);
					hovered = false;
				}  						
			});
			EventTargetH.on(el, 'touchend', function(e){
				if(hovered){
					(leave || enter).apply(this, arguments);
				}
			});
		};

		mix(EventTargetH._EventHooks, (function(){
			var startX, startY, hovered;
			return {
				'tap' : {
					touchstart : function(el, e){
						var point = e.touches[0] || e;
						startX = point.pageX;
						startY = point.pageY;
						hovered = true;

						return false;
					},
					touchmove : function(el, e){
						var point = e.touches[0] || e;
							deltaX = abs(point.pageX - startX),
							deltaY = abs(point.pageY - startY);
						if(deltaX > 36 || deltaY > 36){
							hovered = false;
						}  

						return false;							
					},
					touchend : function(el, e){
						return hovered;
					}
				}
			}
		})());

		if(!hasTouch){			
			mix(EventTargetH._EventHooks, {
					'touchstart' : {
						'mousedown' : function(el, e){
							e.touches = [e];
							return true;
						}
					},
					'touchend' : {
						'mousedown' : function(el, e, handler){ //要注册在mousedown上，因为mouseup的时候要响应原el
							//这里有个未解决的问题，因为有些浏览器会默认支持drag图片而不触发mouseup
							//因为touchend有可能被执行多次
							EventTargetH.once(document, 'mouseup', function(evt){
								evt.touches = [evt];
								handler.apply(el, arguments);
							});
							return false;
						}
					},
					'touchmove' : {
						'mousedown' : function(el, e, handler){
							function a(evt){
								evt.touches = [evt];
								handler.apply(el, arguments);
							}

							EventTargetH.on(document, 'mousemove', a);
							EventTargetH.once(document, 'mouseup', function(evt){
								EventTargetH.un(document, 'mousemove', a);
							});							

							return false;
						}
					}
				});
		}

		if (/firefox/i.test(UA)) {
			EventTargetH._EventHooks.mousewheel = EventTargetH._DelegateHooks.mousewheel = {
				'DOMMouseScroll': function(el, e) {
					return true;
				}
			};
		}

		mix(EventTargetH._EventHooks, {
			'mouseenter': {
				'mouseover': function(el, e) {
					var relatedTarget = e.relatedTarget || e.fromElement;
					if (!relatedTarget || !(el.contains ? el.contains(relatedTarget) : (el == relatedTarget || el.compareDocumentPosition(relatedTarget) & 16))) {
						//relatedTarget为空或不被自己包含
						return true;
					}
				}
			},
			'mouseleave': {
				'mouseout': function(el, e) {
					var relatedTarget = e.relatedTarget || e.toElement;
					if (!relatedTarget || !(el.contains ? el.contains(relatedTarget) : (el == relatedTarget || el.compareDocumentPosition(relatedTarget) & 16))) {
						//relatedTarget为空或不被自己包含
						return true;
					}
				}
			}
		});
		mix(EventTargetH._DelegateHooks, EventTargetH._EventHooks);
		if (!document.addEventListener) {
			function getElementVal(el) {
				switch (el.type) {
				case 'checkbox':
				case 'radio':
					return el.checked;
				case "select-multiple":
					var vals = [],
						opts = el.options;
					for (var j = 0; j < opts.length; ++j) {
						if (opts[j].selected) {vals.push(opts[j].value); }
					}
					return vals.join(',');
				default:
					return el.value;
				}
			}
			function specialChange(el, e) {
				var target = e.target || e.srcElement;
				//if(target.tagName == 'OPTION') target = target.parentNode;
				if (getElementVal(target) != target.__QWETH_pre_val) {
					return true;
				}
			}
			mix(EventTargetH._DelegateHooks, {
				'change': {
					'focusin': function(el, e) {
						var target = e.target || e.srcElement;
						target.__QWETH_pre_val = getElementVal(target);

					},
					'deactivate': specialChange,
					'focusout': specialChange,
					'click': specialChange
				},
				'focus': {
					'focusin': function(el, e) {
						return true;
					}
				},
				'blur': {
					'focusout': function(el, e) {
						return true;
					}
				}
			});
		}
	};

	EventTargetH._defaultExtend(); //JK: 执行默认的渲染。另：solo时如果觉得内容太多，可以去掉本行进行二次solo
	QW.EventTargetH = EventTargetH;

}());/*import from ../dom/jss.js,(by build.py)*/

/*
	Copyright (c) Baidu Youa Wed QWrap
	author: JK
*/
(function() {
	var mix = QW.ObjectH.mix,
		evalExp = QW.StringH.evalExp;
	/** 
	 * @class Jss Jss-Data相关
	 * @singleton
	 * @namespace QW
	 */
	var Jss = {};

	mix(Jss, {
		/** 
		 * @property	rules Jss的当前所有rule，相当于css的内容
		 */
		rules: {},
		/** 
		 * 添加jss rule
		 * @method	addRule
		 * @param	{string}	sSelector	selector字符串，目前只支持#id、@name、.className、tagName
		 * @param	{json}	ruleData json对象，键为arrtibuteName，值为attributeValue，其中attributeValue可以是任何对象
		 * @return	{void}	
		 */
		addRule: function(sSelector, ruleData) {
			var data = Jss.rules[sSelector] || (Jss.rules[sSelector] = {});
			mix(data, ruleData, true);
		},

		/** 
		 * 添加一系列jss rule
		 * @method	addRules
		 * @param	{json}	rules json对象，键为selector，值为ruleData（Json对象）
		 * @return	{json}	
		 */
		addRules: function(rules) {
			for (var i in rules) {
				Jss.addRule(i, rules[i]);
			}
		},

		/** 
		 * 移除jss rule
		 * @method	removeRule
		 * @param	{string}	sSelector	selector字符串，目前只支持#id、@name、.className、tagName
		 * @return	{boolean}	是否发生移除操作
		 */
		removeRule: function(sSelector) {
			var data = Jss.rules[sSelector];
			if (data) {
				delete Jss.rules[sSelector];
				return true;
			}
			return false;
		},
		/** 
		 * 获取jss rule
		 * @method	getRuleData
		 * @param	{string}	sSelector	selector字符串，目前只支持#id、@name、.className、tagName
		 * @return	{json}	获取rule的数据内容
		 */
		getRuleData: function(sSelector) {
			return Jss.rules[sSelector];
		},

		/** 
		 * 设置rule中某属性
		 * @method	setRuleAttribute
		 * @param	{string}	sSelector	selector字符串，目前只支持#id、@name、.className、tagName
		 * @param	{string}	arrtibuteName (Optional) attributeName
		 * @param	{any}	value attributeValue
		 * @return	{json}	是否发回移除操作
		 */
		setRuleAttribute: function(sSelector, arrtibuteName, value) {
			var data = {};
			data[arrtibuteName] = value;
			Jss.addRule(sSelector, data);
		},

		/** 
		 * 移除rule中某属性
		 * @method	removeRuleAttribute
		 * @param	{string}	sSelector	selector字符串，目前只支持#id、@name、.className、tagName
		 * @param	{string}	arrtibuteName (Optional) attributeName
		 * @return	{json}	是否发回移除操作
		 */
		removeRuleAttribute: function(sSelector, arrtibuteName) {
			var data = Jss.rules[sSelector];
			if (data && (attributeName in data)) {
				delete data[attributeName];
				return true;
			}
			return false;
		},

		/** 
		 * 按selector获取jss 属性
		 * @method	getRuleAttribute
		 * @param	{string}	sSelector	selector字符串，目前只支持#id、@name、.className、tagName
		 * @param	{string}	arrtibuteName	属性名
		 * @return	{json}	获取rule的内容
		 */
		getRuleAttribute: function(sSelector, arrtibuteName) {
			var data = Jss.rules[sSelector] || {};
			return data[arrtibuteName];
		}
	});
	/** 
	 * @class JssTargetH JssTargetH相关
	 * @singleton
	 * @namespace QW
	 */

	/*
	* 获取元素的inline的jssData
	* @method	getOwnJssData
	* @param	{element}	el	元素
	* @return	{json}	获取到的JssData
	*/

	function getOwnJssData(el, needInit) {
		var data = el.__jssData;
		if (!data) {
			var s = el.getAttribute('data-jss');
			if (s) {
				data = el.__jssData = evalExp('{' + s + '}');
			}
			else if (needInit) {
				data = el.__jssData = {};
			}
		}
		return data;
	}

	var JssTargetH = {

		/** 
		 * 获取元素的inline的jss
		 * @method	getOwnJss
		 * @param	{element}	el	元素
		 * @return	{any}	获取到的jss attribute
		 */
		getOwnJss: function(el, attributeName) {
			var data = getOwnJssData(el);
			if (data && (attributeName in data)) {
				return data[attributeName];
			}
			return undefined;
		},

		/** 
		 * 获取元素的jss属性，优先度为：inlineJssAttribute > #id > @name > .className > tagName
		 * @method	getJss
		 * @param	{element}	el	元素
		 * @return	{any}	获取到的jss attribute
		 */
		getJss: function(el, attributeName) { //为提高性能，本方法代码有点长。
			var data = getOwnJssData(el);
			if (data && (attributeName in data)) {
				return data[attributeName];
			}
			var getRuleData = Jss.getRuleData,
				id = el.id;
			if (id && (data = getRuleData('#' + id)) && (attributeName in data)) {
				return data[attributeName];
			}
			var name = el.name;
			if (name && (data = getRuleData('@' + name)) && (attributeName in data)) {
				return data[attributeName];
			}
			var className = el.className;
			if (className) {
				var classNames = className.split(' ');
				for (var i = 0; i < classNames.length; i++) {
					if ((data = getRuleData('.' + classNames[i])) && (attributeName in data)) {
						return data[attributeName];
					}
				}
			}
			var tagName = el.tagName;
			if (tagName && (data = getRuleData(tagName)) && (attributeName in data)) {
				return data[attributeName];
			}
			return undefined;
		},
		/** 
		 * 设置元素的jss属性
		 * @method	setJss
		 * @param	{element}	el	元素
		 * @param	{string}	attributeName	attributeName
		 * @param	{any}	attributeValue	attributeValue
		 * @return	{void}	
		 */
		setJss: function(el, attributeName, attributeValue) {
			var data = getOwnJssData(el, true);
			data[attributeName] = attributeValue;
		},

		/** 
		 * 移除元素的inline的jss
		 * @method	removeJss
		 * @param	{element}	el	元素
		 * @param	{string}	attributeName	attributeName
		 * @return	{boolean}	是否进行remove操作
		 */
		removeJss: function(el, attributeName) {
			var data = getOwnJssData(el);
			if (data && (attributeName in data)) {
				delete data[attributeName];
				return true;
			}
			return false;
		}
	};

	QW.Jss = Jss;
	QW.JssTargetH = JssTargetH;
}());