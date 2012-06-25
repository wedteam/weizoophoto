/**
 * 使用非阻塞消息机制，实现异步响应队列
 * 这个模块通常有两种用法——
 * (1) wait(owner, handler); 如果当前队列为空，将立即处理handler,否则等待信号
 * (2) wait(owner, type, handler); type不为下划线开头时，立即进入等待状态，等待type信号，否则同(1)
 * 通常用法（假设retouch过后）：
	W(el).fadeOut(500)
		.wait(function(){W(this).html('changed'); W(this).signal();}) //fadeOut之后才改变el中的文字
		.fadeIn(500);
	
	W(el).slideDown().wait().slideUp();
	W(el2).on("click", function(){W(el).signal()});	//用el2的click控制el的动画阶段暂停

	Ajax.options({sequence:true}).get(url, function(data){do sth...}).get(url, function(... //序列的Ajax请求（默认wait）

	W(el).wait("foobar",function(){dosth}).setTimeout(500, function(){W(el).signal("foobar")}); //延迟500ms后执行任务
 * 
 */
(function(){

var isString = QW.ObjectH.isString;

var seed = 0, 
	sequences = [],
	propId = "__QWASYNCH_sequence_id";

/**
 * 将异步消息和一个target的事件绑定
 * 例如： 绑定动画的end事件，或者Ajax对象的succeed事件等等
 */
var AsyncH = {
	/**
	 * 等待一个自定义事件（信号），当这个事件处理完成之后，继续处理某个动作
	 * W(el).fadeIn().wait(dosth);
	 *
	 * @param {mixed} owner thisObj
	 * @param {string} type 信号类型
	 * @param {Function} handler 处理器，有一个参数，是{Function} signal，调用它立即发一个信号
	 */
	wait: function(owner, type, handler){
		if(!isString(type)){
			handler = type;
			type = "_default";
		}
		handler = handler || function(){};

		var seq = AsyncH.getSequence(owner, type);

		seq.push(handler);	//把需要执行的动作加入队列

		if(seq.length <= 1){ //如果之前序列是空的，说明可以立即执行
			if(!/^_/.test(type)){	//如果type不是以下划线开头的
				handler = function(){};	//多unshift进一个空的function
				seq.unshift(handler);
			}
			handler.call(owner);	//队列空，立即执行当前处理器
		}
	},
	signal: function(owner, type){
		type = type || "_default";
		var seq = AsyncH.getSequence(owner, type);
		var fn = seq.shift();
		if(seq[0]){		//如果队列顶部有新的，可以继续执行
			(function(handler){
				handler.call(owner);
			})(seq[0]);
		}
		return !!fn;
	},
	getSequence: function(owner, type){
		owner = owner || window;
		type = type || "_default";

		var id = propId in owner ? owner[propId] : seed++;
		sequences[id] = sequences[id] || [];
		owner[propId] = id;
		sequences[id][type] = sequences[id][type] || [];
		return sequences[id][type];
	},
	clearSequence: function(owner, type){
		var seq = AsyncH.getSequence(owner, type);
		var len = seq.length;
		seq.length = 0;
		return !!len;
	}
}

QW.provide("AsyncH", AsyncH);
})();