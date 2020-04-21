/* socket.io模块，向外暴露一个函数 */

// 引入数据库的聊天集合
const {ChatModel} = require('../db/models')

module.exports = function(server){
    // 引入io,并执行，传入的是一个服务器（在bin.www中执行该模块函数传入的）
    const io = require('socket.io')(server)
    // io监听连接，当有客户端连接上服务器时触发回调,参数socket是客户端和服务器的连接
    io.on('connection',function (socket) {
        console.log('客户端连接上服务器')
        // socket监听，当客户端向服务器emit这个clientToServer（名字任意，但必须一致）事件时，触发回调，参数data为客户端传来的数据
        socket.on('clientToServer',function ({from,to,content}) {
            const chat_id = [from,to].sort().join('_')  //chat_id是由from和to组成的id，设计成无论是from->to,还是to->from都是相同的id，所以就需要先排序，再转为字符串
            const create_time = Date.now()
            // 将数据写入数据库
            ChatModel.create({from,to,chat_id,content,create_time} , function(err,chatMsg){
                // 服务器向所有客户端发送数据（io是全局的，是所有与服务器连接的客户端）--这里是不对的，因为效率低，需要优化，向特定的客户端发送
                // 向客户端返回数据（需要chat_id和create_time，所以需要返回)
                if(!err){
                    io.emit('serverToClient',chatMsg)
                }
            })
        })
    })
}