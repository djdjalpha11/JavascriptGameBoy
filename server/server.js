var http = require('http');
var fs = require('fs');
var mimeTypes = {
 '.js' : 'text/javascript',
 '.html': 'text/html',
 '.css' : 'text/css'
};
function getExtension(filename) {
    var i = filename.lastIndexOf('.');
    return (i < 0) ? '' : filename.substr(i);
}
var server = http.createServer(function(request, response){
    
    console.log("server started");
    console.log(request.url);
    var mimeType;
    var url = '.'+request.url;
    if(request.url=="/")
    {   
        mimeType = 'text/html';
        url = './index.html';
    }
    else
        mimeType = mimeTypes[getExtension(request.url)];
    fs.readFile(url,null,function(error,data){
        if(error)
        {
            response.writeHead(404,{"Content-Type":"text/plain"});
            response.write("content not found");
            response.end();
            return;
        }
        response.writeHead(200,{"Content-Type":mimeType});
        response.write(data);
        response.end();
        console.log(mimeType+" loaded");
    });
}).listen(8080);

var WebSocketServer = require('websocket').server;
var wsServer = new WebSocketServer({
    httpServer: server
});

wsServer.on('request',function(request){
    
    var connection = request.accept(null,request.origin);
    connection.on('message', function(message){
        console.log("received message " + connection.socket.remoteAddress);
        console.log("origin "+request.origin);
        console.log(message);
    });
    console.log("websocket on request");
});

wsServer.on('connect', function(connection){
        console.log("WebSocket connection is accepted.");
        connection.on('message', function(message){
        console.log("received message");
        console.log(message);
    });
});