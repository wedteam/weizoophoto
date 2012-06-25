(function(){
/**
 * zencoding generator v0.1
 * E#id>E+F[attr]*3
 *
 * <E id="">
 *    <E attr=""></E>
 *    <F attr=""></F>
 *    <F attr=""></F>
 *    <F attr=""></F> 
 * </E>
 */
var trim = StringH.trim,
	W = QW.NodeW,
	isArray = ObjectH.isArray;

function parseEl(matches, n){
	n = n || 1;
	if(isArray(matches)){
		var tagName = matches[1],
			id = matches[2] || matches[4],
			attrs = matches[3];

		var html = (new Array(n+1)).join('<'+tagName+'></'+tagName+'>');

		var elW = W(html); //建立一个元素
		if(id){
			elW.attr("id", id);
		} 
		if(attrs){
			attrs = attrs.split(/\s/g);
			
			for(var i = 0; i < attrs.length; i++){
				var attr = attrs[i].split('=');
				if(attr[0] == "class"){
					attr[0] = "className"; //解决早期版本的IE的兼容问题
				}
				elW.attr(attr[0], attr[1] || '');
			}	
		}
		return elW;
	} 
	else{
		//如果已经是NodeW
		var els = matches.toArray();
		for(var i = 1; i < n; i++){
			for(var j = 0; j < matches.length; j++){
				els.push(matches[j].cloneNode(true));
			}
		}
		return W(els);
	}
}

function reduce(tokens, ops, match /*匹配括号*/){
	while(ops.length){
		var op = ops.shift();
		if(op == "(") break; //如果匹配了最近的括号，reduce结束
		switch(op){
			case '*': 
				var el = tokens.shift(),n = tokens.shift()[0];
				tokens.unshift(parseEl(el, n));
				break;
			case '+':
				var el = parseEl(tokens.shift()),
					el2 = parseEl(tokens.shift());
				tokens.unshift(W([].concat(el2.core).concat(el.core)));

				break;
			case '>':
				var el = parseEl(tokens.shift()),
					el2 = parseEl(tokens.shift());
				
				el2.forEach(function(o){
					var parent = el.parentNode(),
						children = el;

					children.forEach(function(c){
						W(o).appendChild(c);
					});
				});
				tokens.unshift(el2);	
				break;	
			default:
				throw new Error("zencoding parse error, unsupported operator " + op); //不支持的操作符			
		}
	}
	if(match && op != "("
		|| !match && op == "("){
		throw new Error("zencoding parse error, dismatch ( or )"); //括号不匹配
	}
}

function zen(path){
	var ops = [],
		tokens = [];
	
	while(path != ''){
		path = trim(path);

		var matches = /^(\w+)(?:#(\w+))?(?:\[((?:\w+(?:=\w+)?\s*)+)\])?(#\w)?/.exec(path);

		if(matches){	//如果是元素，入元素栈
			tokens.unshift(matches);
			path = path.slice(matches[0].length);
		}else{
			var op = path.charAt(0);

			path = path.slice(1);
			
			if(ops[0] == "*" && (op == "+" || op == "*")){
				//对于紧随 * 的 * 或 +， 应先把 * 给 reduce 了
				ops.shift();
				var el = tokens.shift(),n = tokens.shift()[0];
				tokens.unshift(parseEl(el, n));				
			}

			if(op == "*"){  //如果是*号，将数字放入当前tokens栈顶前面
				path = trim(path);
				var token = tokens.shift();
				matches = /^\d+/.exec(path);
				tokens.unshift(matches);
				tokens.unshift(token);
				ops.unshift(op);
				path = path.slice(matches[0].length);
			}
			else if(op == ")"){
				reduce(tokens, ops, true); //reduce到最近一个左括号
			}
			else{
				ops.unshift(op);	
			}
		}
	}

	reduce(tokens, ops); //reduce结束
	
	if(ops.length || tokens.length !== 1){
		throw new Error("zencoding parse error, stack error");
	}

	return tokens[0];
}

W.zen = zen;
})();