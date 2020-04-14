// 使用node流行的express框架进行开发
const express = require('express');
// 创建路由
const router = express.Router();
// 引入数据库的集合：UserModel
const UserModel = require('../db/models')
// 引入md5加密，用于用户的密码加密
const md5 = require('blueimp-md5')

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

module.exports = router;
