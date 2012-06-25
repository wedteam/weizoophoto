(function(){
	var set = QW.ObjectH.set,
		get = QW.ObjectH.get;

	var config = {};

	/**
	 * 从script标签中的data-config属性读取json配置到js代码中 (Added by akira 2011-12-12)
	 *    在动态web开发过程中config有着很重要的作用，
	 *    因为如果组件里面有些js配置项跟着server端的配置不同而改变，
	 *    之前只能将这部分代码单独抽出来放在模板里面写，但这么做又破坏了组件的完整性，
	 *    而script标签的引入通常是放在模板中的，
	 *    因此config机制，实际上提供了从模板中向js中引入动态数据的接口，
	 *    使得组件能够保持优雅和完整。
	 */
	var Config = {
		/** 
		 * 设置一个config
		 *
		 * @param {mixed} prop
		 * @param {mixed} value (Optional)
		 * @see ObjectH.set
		 */
		set: function(prop, value){
			return set(config, prop, value);
		},
		/**
		 * 读取一个config
		 *
		 * @param {mixed} prop
		 */
		get: function(prop){
			if(prop == null)
				return config;
			return get(config, prop);
		}
	};

	QW.provide("Config", Config);
})();