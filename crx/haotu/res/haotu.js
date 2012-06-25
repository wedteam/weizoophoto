chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse){
        if((val = window.prompt('请输入描述')) !== null){
        	request.description = val;
        	sendResponse(request);
        }        
    }
);