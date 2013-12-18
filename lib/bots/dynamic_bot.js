var util = require('../util');
module.exports.action = function(data, callback){
  if (data.bot_code){
    (eval(data.bot_code))();
    return;
  }else{
    //TODO コードが指定されなければ DB から botコードを取得し実行する

  }
};
