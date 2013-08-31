var io = require('socket.io');
var express = require('express');
var app = express();
var server = require('http').createServer(app);

app.get('/hello.txt', function(req, res){
  var body = 'Hello World';
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Length', body.length);
  res.end(body);
});


var sio = io.listen(server);
 
sio.sockets.on('connection', function (socket) {
    console.log('A socket connected!');
	socket.on('register', function (data) {
		console.log(data);	
	/*TODO: Register the user for a given file*/
	});
	socket.on('get', function (data) {
		console.log(data);	
	/*TODO: Find the user another user who has a file
	give them the SDP to serve
	*/
	});
});

server.listen(3000);
app.use(express.static(__dirname + '/public'));

console.log('Listening on port 3000');