(function(){
var _Connection = {

};

_Connection.__defineGetter__('online', function(){
	return !navigator.network || (Connection.NONE != navigator.network.connection.type
							 && Connection.UNKNOWN != navigator.network.connection.type);
});

_Connection.__defineGetter__('wifi', function(){
	return !navigator.network || (navigator.network.connection.type == Connection.WIFI);
});

_Connection.__defineGetter__('cell', function(){
	return !navigator.network || (navigator.network.connection.type == Connection.CELL_2G 
			|| navigator.network.connection.type == Connection.CELL_3G
			|| navigator.network.connection.type == Connection.CELL_4G);
});

QW.provide('Connection', _Connection);
})();