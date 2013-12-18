var util = require('../util');
module.exports.action = function(data, callback, dynamic_bot_func){
  dynamic_bot_func = '(function (){ callback({name: "dyna", msg: "hoge", interval: 1});})';

  if (dynamic_bot_func){
    (eval(dynamic_bot_func))();
    console.log("exec dynamic_bot_func");
    return;
  }
  console.log("no exec dynamic_bot_func");
};
