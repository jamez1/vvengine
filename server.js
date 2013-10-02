var io = require('socket.io');
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var util = require('./util.js');

// Array of [file Id, users, filesize]
// this is the whole data store
var files = new Array();
var connects = new Array();
var streams = new Array();

function getAnswerChannelID(socket)
{
	var connections=0;
	
	for (var j =0;j<=connects.length;j++)
	{
		if (connects[j]!=null)
		{
			if (connects[j].offerer.id==socket.id)
				connections++;
			if (connects[j].answerer.id==socket.id)
				connections++;
		}
	}
	
	return connections;
}


function getOfferer(socket, channelid)
{
	for (var j =0;j<=connects.length;j++)
	{
		if (connects[j]!=null)
		{
			if (connects[j].anschannelid==channelid)
			{
				if(connects[j].offerer.id==socket.id)
					return { 
						socket: connects[j].answerer, 
						id: connects[j].id,
						filesize: connects[j].filesize,
						offererchannelid: connects[j].offererchannelid,
						anschannelid: connects[j].anschannelid
					};
				if (connects[j].answerer.id==socket.id)
					return { 
						socket: connects[j].offerer, 
						id: connects[j].id,
						filesize: connects[j].filesize,
						offererchannelid: connects[j].offererchannelid,
						anschannelid: connects[j].anschannelid
					};
			}
		}
	}
	console.log('no mathcing connection found:');
	console.log(socket);
	console.log('to');
	console.log(connects);
	
	return null;
}


function getAnswerer(socket, channelid)
{
	for (var j =0;j<=connects.length;j++)
	{
		if (connects[j]!=null)
		{
			if (connects[j].offererchannelid==channelid)
			{
				if(connects[j].offerer.id==socket.id)
					return { 
						socket: connects[j].answerer, 
						id: connects[j].id,
						filesize: connects[j].filesize,
						offererchannelid: connects[j].offererchannelid,
						anschannelid: connects[j].anschannelid
					};
				if (connects[j].answerer.id==socket.id)
					return { 
						socket: connects[j].offerer, 
						id: connects[j].id,
						filesize: connects[j].filesize,
						offererchannelid: connects[j].offererchannelid,
						anschannelid: connects[j].anschannelid
					};
			}
		}
	}
	console.log('no mathcing connection found:');
	console.log(socket);
	console.log('to');
	console.log(connects);
	
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

function getStream(streamId)
{
	for (var j =0;j<=streams.length;j++)
	{
		if (streams[j]!=null)
			if(streams[j].id==streamId)
				return j;
	}
	return -1;
}

var sio = io.listen(server);
 
sio.sockets.on('connection', function (socket) {
    console.log('A socket connected!');
	
	
	socket.on('newstream', function (data) {
		//Create file
		var newStream = {
			id: util.guid(),
			files: new Array(),
			users: new Array()
			};
		//Register client on file
		newStream.users.push(socket);
		//Add stream to data store
		streams.push(newStream);
		
		
		var payload = {
				id: newStream.id,
				files: newStream.files
				};
		
		//Alert client to successful file registration
		socket.emit('createdstream',payload);
		
		
		console.log('New stream created ' + newStream.id);
	/*TODO: Register the user for a given file*/
	});
	
	
	socket.on('attachfile', function (data) {
		//Create file
		var streamid = getStream(data.streamid);
		var stream = streams[streamid];
		var file = getFile(data.fileid);
		if (file==-1)
		{
			console.log('file not found ' + data.fileid);
			return;
		}
		stream.files.push(data.fileid);
		
		console.log('found stream ' + streamid);
		//Alert client to successful file registration
		for (var t = 0;t<stream.users.length;t++)
		{
			console.log ('reporting to ' + stream.users[t].id);
			stream.users[t].emit('streamfileregistered', {streamid:data.streamid,fileid: data.fileid});
		}
		
		console.log('New file ' + data.fileid + ' attached to stream ' + data.streamid);
	/*TODO: Register the user for a given file*/
	});
	
	
	socket.on('registerstream', function (data) {
		var streamindex = getStream(data.streamid);
		
		if (streamindex==-1)
		{
			console.log('No stream found');
			console.log('id:' + data.id);
			return;
		}
		
		var stream = streams[streamindex];
			
		stream.users.push(socket);
		
		var payload = {
				id: stream.id,
				files: stream.files
				};
		
		socket.emit('joinedstream',payload);
		console.log('New user registered on stream ' + stream.id);
	/*TODO: Register the user for a given file*/
	});
	
	
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
		if (file==-1 || file==null)
		{
			console.log('no matching file');
			return;
		}
		if (file.users == null)
		{
			console.log('no users, file contents:');
			console.log(file);
			return;
		}
		
		var peer = getPeer(socket,file);
		var peerConnectionId = getAnswerChannelID(peer);
		
		if (peer==-1)
		{
			console.log('no peers to download from');
			return;
		}
		
		console.log(data);
		var connect = { offerer:socket, answerer:peer, id:data.id, filesize:file.filesize, offererchannelid:  data.channelid, anschannelid: peerConnectionId};
		connects.push(connect);
		console.log('Connecting peers ' + peer.id + ' ' + socket.id);
		console.log('Sent SDP ' + data.sdp);
		peer.emit('get', { id:data.id, sdp:data.sdp, channelid: peerConnectionId});
	/*TODO: Find the user another user who has a file
	give them the SDP to serve
	*/
	});
	socket.on('connect', function (data) {
		var connection = getOfferer(socket,data.answerchannelid);
		
		var answerer = connection.socket;
		if (answerer==null)
		{
			console.log('no session exists');
			return;
		}
		console.log('Passing back SDP ' + answerer.id + ' ' + socket.id);
		console.log('Returned SDP ' + data.sdp);
		answerer.emit('reply', {sdp:data.sdp, id:connection.id, filesize: connection.filesize, channelid:connection.offererchannelid});
	});
	
	socket.on('offericecandidate', function (data) {
		var connection = getAnswerer(socket,data.channelid);
		console.log(data);
		
		var answerer = connection.socket;
		if (answerer==null)
		{
			console.log('no session exists');
			return;
		}
		console.log('Passing offer ice candidate ' + answerer.id + ' ' + socket.id);
		answerer.emit('offericecandidate', {candidate:data.candidate, channelid:connection.anschannelid});
	});
	
	socket.on('answericecandidate', function (data) {
		var connection = getOfferer(socket,data.answerchannelid);
		console.log(connection);
		
		var answerer = connection.socket;
		if (answerer==null)
		{
			console.log('no session exists');
			return;
		}
		console.log('Passing answer ice candidate ' + answerer.id + ' ' + socket.id);
		answerer.emit('answericecandidate', {candidate:data.candidate, channelid:connection.offererchannelid});
	});
});

server.listen(3000);
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');

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

app.get('/', function(req, res){
	console.log('front page');
	res.render('index', { id: req.query.q })
});

app.use(express.static(__dirname + '/public'));

console.log('Listening on port 3000');