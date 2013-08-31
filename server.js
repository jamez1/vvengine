var io = require('socket.io');
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var util = require('./util.js');

// Array of [file Id, users, filesize]
// this is the whole data store
var files = new Array();
var connects = new Array();

function getAnswerer(socket)
{
	for (var j =0;j<=connects.length;j++)
	{
		if (connects[j]!=null)
		{
			if(connects[j].offerer.id==socket.id)
				return { 
					socket: connects[j].answerer, 
					id: connects[j].id,
					filesize: connects[j].filesize
				};
			if (connects[j].answerer.id==socket.id)
				return { 
					socket: connects[j].offerer, 
					id: connects[j].id,
					filesize: connects[j].filesize
				};
		}
	}
	return null;
}

//Function to return the file in the files array based on the Id parameter
function getFile(fileId)
{
	for (var j =0;j<=files.length;j++)
	{
		if (files[j]!=null)
			if(files[j].id==fileId)
				return j;
	}
	return -1;
}

function getPeer(socket,file)
{
	for (var j =0;j<=file.users.length;j++)
	{
		if (file.users[j]!=null)
			if(file.users[j].id!=socket.id)
				return file.users[j];
	}
	return -1;
}

var sio = io.listen(server);
 
sio.sockets.on('connection', function (socket) {
    console.log('A socket connected!');
	socket.on('newfile', function (data) {
		//Create file
		var newFile = {
			id: util.guid(),
			users: new Array(),
			filesize: data.size
			};
		//Register client on file
		newFile.users.push(socket);
		//Add file to data store
		files.push(newFile);
		
		//Alert client to successful file registration
		socket.emit('filecreated', {id: newFile.id});
		
		
		console.log('New file created ' + newFile.id);
	/*TODO: Register the user for a given file*/
	});
	socket.on('register', function (data) {
		var index = getFile(data.id);
		
		if (index==-1)
		{
			console.log('No file found');
			console.log('id:' + data.id);
			return;
		}
		
		var theFile = files[index];
			
		theFile.users.push(socket);
		console.log('New user registered on file ' + data.id);
	/*TODO: Register the user for a given file*/
	});
	socket.on('getchunk', function (data) {
		var fileId = getFile(data.id);
		var file = files[fileId];
		if (file==-1)
		{
			console.log('no matching file');
			return;
		}
		
		var peer = getPeer(socket,file);
		
		if (peer==-1)
		{
			console.log('no peers to download from');
			return;
		}
		
		var connect = { offerer:socket, answerer:peer, id:data.id, filesize:file.filesize};
		connects.push(connect);
		console.log('Connecting peers ' + peer.id + ' ' + socket.id);
		console.log('Sent SDP ' + data.sdp);
		peer.emit('get', { id:data.id, sdp:data.sdp});
	/*TODO: Find the user another user who has a file
	give them the SDP to serve
	*/
	});
	socket.on('connect', function (data) {
		var connection = getAnswerer(socket)
		var answerer = connection.socket;
		if (answerer==null)
		{
			console.log('no session exists');
			return;
		}
		console.log('Passing back SDP ' + answerer.id + ' ' + socket.id);
		console.log('Returned SDP ' + data.sdp);
		answerer.emit('reply', {sdp:data.sdp, id:connection.id, filesize: connection.filesize});
	});
	
	socket.on('offericecandidate', function (data) {
		var answerer = getAnswerer(socket).socket;
		if (answerer==null)
		{
			console.log('no session exists');
			return;
		}
		console.log('Passing offer ice candidate ' + answerer.id + ' ' + socket.id);
		answerer.emit('offericecandidate', {candidate:data.candidate});
	});
	
	socket.on('answericecandidate', function (data) {
		var answerer = getAnswerer(socket).socket;
		if (answerer==null)
		{
			console.log('no session exists');
			return;
		}
		console.log('Passing answer ice candidate ' + answerer.id + ' ' + socket.id);
		answerer.emit('answericecandidate', {candidate:data.candidate});
	});
});

server.listen(3000);
app.get('/files', function(req, res){
  var output = 'Current Files (' + files.length + ')<br>\n';
  
  for (var i = 0; i<files.length ;i++)
  {
	output += '<b>'+files[i].id + '</b> ';
	for (var j =0;j<files[i].users.length;j++)
	{
		output += (files[i].users[j].id + ' ');
	}
	output += ('<br>\n');
  }
  
  res.send(output);
	console.log('files requested');
});

app.use(express.static(__dirname + '/public'));

console.log('Listening on port 3000');