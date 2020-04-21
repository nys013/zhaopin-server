// 使用node流行的express框架进行开发
const express = require('express');
// 创建路由
const router = express.Router();
// 引入数据库的集合：UserModel
const {UserModel,ChatModel} = require('../db/models')
// 引入md5加密，用于用户的密码加密
const md5 = require('blueimp-md5')
// 查找数据库返回数据的过滤条件（投影）
const filter = '-password -__v'


/* 这个与我们的项目无关，访问根路径时的界面渲染 */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

/* 注册路由 */
// 用户注册
router.post('/sign' , function(req,res) {
  const {username,password,type} = req.body
  // 前台提交的用户信息，交于数据库进行查找
  UserModel.find({username} , function(err , users) {
    // 返回不为空数组，长度不为0，则返回用户已存在
    if (users.length) {
      res.send({
        code:1,
        msg:'此用户已存在'
      })
    } else {  //用户不存在
      // 将数据存入数据库，记得将密码进行md5加密
      UserModel.create({username , password:md5(password) ,type} , function (err,user) {
        if(!err){
          // 生成一个cookie给浏览器保存，时间为7天
          res.cookie('userid' , user._id , {maxAge:1000*60*60*24*7})
          // 给前台返回数据，记得不带密码返回
          res.send({
            code:0,
            data:{_id:user._id , username , type}
          })
        }
      })
    }
  })
})

// 用户登录
router.post('/login',function(req,res){
  const {username,password} = req.body
  // 仅对用户名进行查找
  UserModel.findOne({username},function (err , user) {
    if (!err) {
      // 若用户名不存在则直接返回
      if (!user) {
        res.send({code:1,msg:'用户不存在'})
      } else {
        // 若用户存在则判断该用户的密码与前台密码是否相等
        if (user.password !== md5(password)) {
          res.send({code:1,msg:'用户名或密码错误'})
        } else {
          // 生成一个cookie给浏览器保存，时间为7天
          res.cookie('userid' , user._id , {maxAge:1000*60*60*24*7})
          // 因为没有在查找的时候过滤掉password，所以需要自己过滤
          const resUser = user.toObject()   //将document对象转换为普通js对象，赋值给resUser之后，才能使用js的方法（同时不能使用document的方法）
          //console.log(user.id)  5e95bae39a987f3e30226e97  这里仍然能够输出，说明toObject方法没有将原对象改变，而是返回了一个新的js对象
          delete resUser.password   //用delete删除返回对象中不需要的password和__v属性
          delete resUser.__v
          res.send({code:0,data:resUser})
        }
      }
    }
  })
})

// 用户信息更新
router.post('/update',function(req,res){
  const {userid} = req.cookies
  // 先判断cookie中是否存在该用户（即是否登录），直接判断；如果是进入数据库查找，找不到再返回效率低
  if (!userid) {
    res.send({code:1,msg:'请先登录'})
  } else {
    // 修改用户信息 Model.update直接更新，不用返回数据；Model.findByIdAndUpdate用于返回数据的
    UserModel.findByIdAndUpdate({_id:userid},req.body,function (err,user) {
      if (!user) {
        // 当前cookie有值，但不是对应的，在数据库中找不到，则清除cookie，返回错误信息
        res.clearCookie('userid')
        res.send({code:1,msg:'请先登录'})
      } else {  
        // 虽然数据库的用户已经更新了，但是我们也要给前台返回，而这里的user是未更新的user，所以需要我们进行处理后返回
        const {username,type,_id} = user
        // 即user添加新的req.body里的属性 后台不能用...运算符
        // 用Object.assign(target,source1,source2,  ...) 注意参数必须是对象！！！
        const data = Object.assign(req.body,{username,type,_id})
        console.log(req.body)
        res.send({code:0,data})
      }
    })
  }
})

// 获取当前的user(根据cookie中的userid)
router.get('/user',function (req,res) {
  const {userid} = req.cookies
  if (userid) {
    UserModel.findOne({_id:userid},filter,function(err,user){
      if(!err){
        res.send({code:0,data:user})
      }
    })
  } else {
    res.send({code:1,msg:'请先登录'})
  }
})

// 获取用户列表 boss/dashen
router.get('/userlist',function (req,res) {
  // api显示传的是query参数 ?type=xxx
  const {type} = req.query  //其实完全不用传参也可以做到，获取cookie中的type就可以
  // 从数据库中查找并返回 
  UserModel.find({type} , filter , function (err,users) {
    if (!err) {
      /* if (users.length) {
        res.send({code:0,data:users})
      } else {
        // 几乎不可能吧...没有用户的情况
        res.send({code:1,msg:'暂时未有用户'})
      } */
      // 根据接口文档，统一返回查询到的结果，就算没有返回[]也可
      res.send({code:0,data:users})
    }
  })
})

// 获取当前用户的聊天消息列表
router.get('/msglist',function (req,res) {
  // 获取当前用户id
  const {userid} = req.cookies
  // 查找所有用户
  UserModel.find({},filter,function (err,userDocs) {
    if(!err){
      // 将每个user文档处理数据结构后返回 users:{xxxx:{username,header}}
      const users = userDocs.reduce((pretotal,item) => {
        pretotal[item._id] = {username:item.username , header:item.header }
        return pretotal
      },{})
      // 在聊天列表找出与当前用户相关的消息列表（发给我的，我发的） filter还是要加的，为了排除__v
      ChatModel.find({'$or':[{from:userid},{to:userid}]} , filter , function (err,chatMsgs) {
        if (!err) {
          // 如无错误，将数据按api接口文档描述发送给客户端
          res.send({code:0,data:{users , chatMsgs}})
        }
      })
    }
  })
})

// 将消息标记为已读
router.post('/readmsg',function (req,res) {
  const {from} = req.body
  const to = req.cookies.userid
  // 可能更新多个，所以要many，因为update默认只更新一条，查找条件：发给我的，未读的
  console.log(from,to)
  ChatModel.updateMany({from , to , read:false} , {read:true}  , function (err,chatMsgs) {
    if (!err) {
      // 返回数据为更改的数量，以便前台对小红点的修改
      res.send({code:0 , data:chatMsgs.nModified})
    }
  })
  
})

module.exports = router;
