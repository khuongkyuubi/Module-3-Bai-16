const { createServer } = require("http");
const fs = require('fs');
const { Server } = require("socket.io");
const mimeTypes = {
    "html": "text/html",
    "js": "text/javascript",
    "css": "text/css"
};

const httpServer = createServer(function (req, res){
    if (req.url === '/') {
        res.writeHead(200, { "Content-Type": "text/html" });
        fs.createReadStream('./templates/index.html').pipe(res)
    }
    /* đọc file css/js*/ // serve static file
    const filesDefences = req.url.match(/\.js|.css/);
    if (filesDefences) {
        const extension = mimeTypes[filesDefences[0].toString().split('.')[1]];
        res.writeHead(200, { 'Content-Type': extension });
        fs.createReadStream(__dirname + "/" + req.url).pipe(res)
    }
});

const io = new Server(httpServer);

let usernames = {}; // object lưu các users

let rooms = ['Lobby']; // object lưu các room

io.sockets.on('connection', function (socket) {

   // đối tượng socket sẽ tồn tại xuyên suốt trong socket (ở 1 phía)
    socket.on('adduser', function (username, nameRoom){
        socket.username = username; //truyền tham số vào đối tượng socket
      socket.room = nameRoom; // truyền cho thuộc tính room của socket
        usernames[username] = username;
        socket.join(nameRoom); // đưa socket đấy vào room
        if (nameRoom != null && rooms.indexOf(nameRoom) <0){
            rooms.push(nameRoom) ; // push vào mảng chứa tên các phòng
        }
        socket.emit('updatechat', 'SERVER', 'you have connected to '+ nameRoom); // phát riêng cho socket đấy
        socket.broadcast.to(nameRoom).emit('updatechat', 'SERVER', username + ' has connected to this room');
        socket.emit('updaterooms', rooms, nameRoom); // phát sự kiện cho riêng socket đấy, dùng để update tên các room
    });

    socket.on('create', function (room) {
        room = 'test';
        rooms.push(room);
    });

    socket.on('sendchat', function (data) {
        io.sockets.in(socket.room).emit('updatechat', socket.username, data);
    });

    socket.on('switchRoom', function(newroom){
        socket.leave(socket.room);
        socket.join(newroom);
        socket.emit('updatechat', 'SERVER', 'you have connected to '+ newroom);
        socket.broadcast.to(socket.room).emit('updatechat', 'SERVER', socket.username+' has left this room');
        socket.room = newroom;
        socket.broadcast.to(newroom).emit('updatechat', 'SERVER', socket.username+' has joined this room');
        socket.emit('updaterooms', rooms, newroom);
    });


    socket.on('disconnect', function(){

        delete usernames[socket.username];
        io.sockets.emit('updateusers', usernames);
        socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
        socket.leave(socket.room);
    });
});

httpServer.listen(4500, 'localhost', function (){
    console.log('Server running in http://localhost:4500')
})
