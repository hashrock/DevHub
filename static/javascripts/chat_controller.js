var DevHubApp = angular.module('DevHubApp',['ngSanitize']);
DevHubApp.factory('socket', function ($rootScope) {
  var socket = io.connect();
  return {
    on: function(eventName, callback) {
      socket.on(eventName, function() {  
        var args = arguments;
        $rootScope.$apply(function() {
          callback.apply(socket, args);
        });
      });
    },
    emit: function(eventName, data, callback) {
      socket.emit(eventName, data, function() {
        var args = arguments;
        $rootScope.$apply(function() {
          if (callback) {
            callback.apply(socket, args);
          }
        });
      })
    }
  };
});

DevHubApp.controller('ChatCtrl',['$scope','socket', function($scope,socket){
  // ユーザ名の復元
  if ( $.cookie(COOKIE_NAME) != null ){
    $scope.name = $.cookie(COOKIE_NAME);
    $('#message').focus(); //TODO: こんなところに focus 置いていいの？
  }
 
  $scope.message = "";

  $scope.addChatMessage = function(){
    var name = $scope.name;
    var message = $scope.message;
    $.cookie(COOKIE_NAME,name,{ expires: COOKIE_EXPIRES });

    if ( message && name ){
      socket.emit('message', {name:name, msg:message});
      $scope.message = "";
    }
  };

  $scope.deleteChatMessage = function(id, $index){
    $scope.messages.splice($index,1);
    socket.emit('remove_message', {id:id});
  };

  $scope.setTargetName = function(name){
    $scope.message += " @" + name + "さん ";
  };

  socket.on('list', function(login_list) {
    $('#login_list_loader').hide();
    $scope.logins = [];
    angular.forEach(login_list, function(login){
      if ( login.pomo_min > 0 ){
        login.name_class = "login-name-pomo";
      }else{
        login.name_class = "login-name" + get_color_id_by_name_id(login.id);
      }
      $scope.logins.push(login);
    });
  });

  socket.on('message_own', function(data) {
    data.id = data._id;
    data.is_own = true;
    var css = get_msg_css(data);
    data.body_class = css.body;
    data.date_class = css.date;
    data.name_class = css.name;
    data.msg_class = css.msg;
    data.msg = decorate_msg(data.msg);
    $scope.messages.unshift(data);
    newest_mark();
  });

  socket.on('message', function(data) {
    data.id = data._id;
    data.is_own = false;
    var css = get_msg_css(data);
    data.body_class = css.body;
    data.date_class = css.date;
    data.name_class = css.name;
    data.msg_class = css.msg;
    data.msg = decorate_msg(data.msg);
    $scope.messages.unshift(data);
    newest_mark();
  });

  socket.on('latest_log', function(msgs) {
    $scope.messages = [];
    angular.forEach(msgs, function(msg){
      msg.id = msg._id;
      msg.is_own = msg.name == $scope.name;
      var css = get_msg_css(msg);
      msg.body_class = css.body;
      msg.date_class = css.date;
      msg.name_class = css.name;
      msg.msg_class = css.msg;
      msg.msg = decorate_msg(msg.msg);
      $scope.messages.push(msg);
    });
  });

  socket.on('remove_message', function(data) {
    angular.forEach($scope.messages, function(msg,index){
      if (msg.id == data.id){
        $scope.messages.splice(index,1);
      }
    });
  });

  $(window).on("blur focus", function(e) {
    newest_off();
  });

  function newest_mark(){
    if ("message" == $(':focus').attr('id')){ newest_off(); return; }
    newest_count++;
    document.title = "(" + newest_count + ") " + TITLE_ORG;
  }

  function newest_off(){
    newest_count = 0;
    document.title = TITLE_ORG;
  }

  function get_msg_css(data){
    if ( data.name == $scope.name ){
      return {
        msg: "",
        name: "login-name" + get_color_id_by_name_id(get_id(data.name)),
        body: "own_msg",
        date: "own_msg_date"
      };
    } else if (include_target_name(data.msg,$scope.name)){
      return {
        msg: "",
        name: "login-name" + get_color_id_by_name_id(get_id(data.name)),
        body: "target_msg",
        date: "target_msg_date"
      };
    }else if ( data.name == "System" ){
      return {
        name: "login-name-system",
        msg:  "msg_ext",
        body: "",
        date: "date"
      };
    }else if ( data.ext == true ){
      return {
        name: "login-name-ext",
        msg:  "msg_ext",
        body: "",
        date: "date"
      };
    }else if ( data.name == "Pomo" ){
      return {
        name: "login-name-pomosys",
        msg:  "msg_pomo",
        body: "",
        date: "date"
      };
    }else{
      return {
        msg: "",
        name: "login-name" + get_color_id_by_name_id(get_id(data.name)),
        body: "",
        date: "date"
      };
    }
  }

  function decorate_msg(msg){
    var deco_msg = msg;

    deco_msg = deco_login_name(deco_msg)
      deco_msg = deco_msg.replace(/((https?|ftp)(:\/\/[-_.!~*\'()a-zA-Z0-9;\/?:\@&=+\$,%#]+))/g,function(){ return '<a href="' + arguments[1] + '" target="_blank" >' + arguments[1] + '</a>' });
    deco_msg = deco_msg.replace(/(SUCCESS|OK|YES)/, function(){ return ' <span class="label label-success">' + arguments[1] + '</span> '});
    deco_msg = deco_msg.replace(/(FAILURE|NG|NO)/, function(){ return ' <span class="label label-important">' + arguments[1] + '</span> '});
    deco_msg = deco_msg.replace(/[\(（](笑|爆|喜|嬉|楽|驚|泣|涙|悲|怒|厳|辛|苦|閃|汗|忙|急|輝)[\)）]/g, function(){ return '<span class="emo">' + arguments[1] + '</span>'});

    return deco_msg;
  };

  function deco_login_name(msg){
    var deco_msg = msg;
    var name_reg = RegExp("(@)[ ]*.+?さん", "g");
    deco_msg = deco_msg.replace( name_reg, function(){ return '<span class="label label-info">' + arguments[0] + '</span>'});
    return deco_msg;
  }

  function include_target_name(msg,name){
    var name_reg = RegExp("(@)[ ]*" + name + "( |　|さん|$)");
    if (msg.match(name_reg)){
      return true;
    }
    return false;
  }

  function get_id(name){
    var id = 0;
    angular.forEach($scope.logins, function(login){
      if ( login.name == name ){
        id = login.id;
      }
    });
    return id;
  }

  function get_color_id_by_name_id(id){
    if (id == 0){ return 0; } // no exist user.
    return id % LOGIN_COLOR_MAX + 1; // return 1 〜 LOGIN_COLOR_MAX
  }

}]);

