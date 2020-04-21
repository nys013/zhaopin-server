/* socket.io模块，向外暴露一个函数 */
module.exports = function(server){
    // 引入io,并执行，传入的是一个服务器（在bin.www中执行该模块函数传入的）
    const io = require('socket.io')(server)
    // io监听连接，当有客户端连接上服务器时触发回调,参数socket是客户端和服务器的连接
    io.on('connection',function (socket) {
        console.log('客户端连接上服务器')
        // socket监听，当客户端向服务器emit这个clientToServer（名字任意，但必须一致）事件时，触发回调，参数data为客户端传来的数据
        socket.on('clientToServer',function (data) {
            console.log('clientToServer',data)
            const {time,name} = data
            // 服务器向所有客户端发送数据（io是全局的，是所有与服务器连接的客户端）
            io.emit('serverToClient',time + '----' + name)
            console.log('serverToClient',time + '----' + name)
            /* // 服务器向一个客户端发送数据（socket是当前与服务器连接的客户端）
            socket.emit('serverToClient',time + '----' + name) */
        })
    })
}