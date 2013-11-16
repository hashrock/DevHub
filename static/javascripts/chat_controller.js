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
 
    /*
    if ($('#login_list').html() != out_list){
      $('#login_list').html(out_list);
      $('#login_list').fadeIn();
      suggest_start(login_list);
    */
  });

  socket.on('message_own', function(data) {
    data.id = get_id(data.name);
    data.is_own = true;
    data.name_class = "login-name" + get_color_id_by_name_id(data.id);
    data.msg = decorate_msg(data.msg);
    $scope.messages.unshift(data);
    newest_mark();
  });

  socket.on('message', function(data) {
    data.is_own = false;
    data.id = get_id(data.name);
    data.name_class = "login-name" + get_color_id_by_name_id(data.id);
    data.msg = decorate_msg(data.msg);
    $scope.messages.unshift(data);
    newest_mark();
  });

  socket.on('latest_log', function(msgs) {
    $scope.messages = [];
    angular.forEach(msgs, function(msg){
      msg.is_own = msg.name == $scope.name;
      msg.id = get_id(msg.name);
      msg.name_class = "login-name" + get_color_id_by_name_id(msg.id);
      msg.msg = decorate_msg(msg.msg);
      $scope.messages.push(msg);
    });
  });

  socket.on('remove_message', function(data) {
    $('#msg_' + data.id).fadeOut();
  });


  $(window).on("blur focus", function(e) {
    newest_off();
  });

  function append_msg(data){
    //TODO: System メッセージを非表示にする。
    //      切り替え可能にするかは検討する。
    if (data.name == "System") { return };
    if (exist_msg(data)){ return };

    var msg = get_msg_html(data);

    $('#list').append(msg.li.addClass(msg.css));
    msg.li.fadeIn();
  };

  function prepend_own_msg(data){
    if (exist_msg(data)){ return };
    var msg = get_msg_html(data);

    $('#list').prepend(msg.li);
    msg.li.addClass("text-highlight",0);
    msg.li.slideDown('fast',function(){
      msg.li.switchClass("text-highlight", msg.css, 500);
    });
  };

  function send_remove_msg(id){
    var socket = io.connect('/');

    socket.emit('remove_message', {id:id});
  }

  function prepend_msg(data){
    //TODO: System メッセージを非表示にする。
    //      切り替え可能にするかは検討する。
    if (data.name == "System") { return }
    if (exist_msg(data)){ return };

    var msg = get_msg_html(data);

    $('#list').prepend(msg.li);
    msg.li.addClass("text-highlight",0);
    msg.li.slideDown('fast',function(){
      msg.li.switchClass("text-highlight", msg.css, 500);
    });
  };

  function newest_mark(){
    if ("message" == $(':focus').attr('id')){ newest_off(); return; }
    newest_count++;
    document.title = "(" + newest_count + ") " + TITLE_ORG;
  }

  function newest_off(){
    newest_count = 0;
    document.title = TITLE_ORG;
  }

  function exist_msg(data){
    if (data.msg == undefined) { data.msg = ""; }
    var id = '#msg_' + data._id.toString();
    return $(id).size() > 0;
  }

  function get_msg_html(data){
    if ( data.name == login_name ){
      return {
        li: get_msg_li_html(data).html(get_msg_body(data) + '<a class="remove_msg">x</a><span class="own_msg_date">' + data.date + '</span></td></tr></table>'),
        css: "own_msg"
      };
    } else if (include_target_name(data.msg,login_name)){
      return {
        li: get_msg_li_html(data).html(get_msg_body(data) + ' <span class="target_msg_date">' + data.date + '</span></td></tr></table>'),
          css: "target_msg"
      };
    }else{
      return {
        li: get_msg_li_html(data).html(get_msg_body(data) + ' <span class="date">' + data.date + '</span></td></tr></table>'),
          css: null
      };
    }
  }

  function get_msg_li_html(data){
    if ( data._id != undefined ){
      return $('<li/>').attr('style','display:none').attr('id','msg_' + data._id.toString()).attr('data-id', data._id.toString());
    }else{
      return $('<li/>').attr('style','display:none');
    }
  }

  function get_msg_body(data){
    var date = new Date();
    var id = date.getTime();

    var name_class = "login-name";
    var msg_class = "msg";

    data.id = get_id(data.name)

      if ( data.name == "System" ){
        name_class = "login-name-system";
        msg_class = "msg_ext"
      }else if ( data.ext == true ){
        name_class = "login-name-ext";
        msg_class = "msg_ext"
      }else if ( data.name == "Pomo" ){
        name_class = "login-name-pomosys";
        msg_class = "msg_pomo"
      }else{
        name_class = "login-name" + get_color_id_by_name_id(data.id);
      }

    return '<table><tr><td nowrap valign="top"><span class="login-name-base ' + name_class + '">' + data.name + '</span></td><td width="100%"><span class="msg_text ' + msg_class + '">' + decorate_msg(data.msg) + '</span>';
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

