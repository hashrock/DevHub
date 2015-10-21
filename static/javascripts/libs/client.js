var COOKIE_NAME = "dev_hub_name";
var COOKIE_EXPIRES = 365;

var socket = io.connect('/',{query: 'from=devhub'});

// Controllers
var chatController = null;
var shareMemoController = null;

// for favicon
var faviconNumber = null;

var flipsnap;

function updateUI(){
  var is_mobile = $(window).width() < 768;
  if(flipsnap !== undefined){
    flipsnap.refresh();
    flipsnap.disableTouch = !is_mobile;
    if(!is_mobile){
      $(".flipsnap").css({transform: "none"});
    }
  }

  if (!is_mobile){
    $('body').addClass("perfect-scrollbar-body-style");

    var scrollOption = {
      wheelSpeed: 1,
      useKeyboard: true,
      suppressScrollX: true
    };

    $('#chat_area').addClass("perfect-scrollbar-style");
    $('#chat_area').perfectScrollbar(scrollOption);
    $('#memo_area').addClass("perfect-scrollbar-style");
    $('#memo_area').perfectScrollbar(scrollOption);
  }else{
    // フリック用のサイズ調整
    if(flipsnap === undefined){
       flipsnap = Flipsnap('.flipsnap');
    }
    $('#share_memo_nav').hide();
    $('#share_memo_tabbable').removeClass("tabs-left");
    $('#share_memo_nav').removeClass("nav-tabs");
    $('#share_memo_nav').addClass("nav-pills");
    $('#share_memo_nav').show();
  }
}


$(function() {
  init_websocket();

  faviconNumber = new FaviconNumber({
    focus_id: "message"
  });

  shareMemoController = new ShareMemoController({
    socket: socket,
    setMessage: function(message){
      chatController.setMessage(message);
    }
  });

  chatController = new ChatController({
    socket: socket,
    faviconNumber: faviconNumber,
    changedLoginName: function(name){
      shareMemoController.setName(name);
      $.cookie(COOKIE_NAME,name,{ expires: COOKIE_EXPIRES });
    },
    showRefPoint: function(id){
      shareMemoController.move(id);
    }
  });

  // for smartphone
  // 本当は bootstrap-responsive のみやりたいが、perfectScrollbar の制御は
  // js側でやらないといけないので解像度で切り分ける
  updateUI();
  $(window).resize(function(){
    updateUI();
  });  

  if ( $.cookie(COOKIE_NAME) == null && !is_mobile){
    setTimeout(function(){
      $('#name_in').modal("show");
      setTimeout(function(){
          $('#login_name').focus();
        },500);
      },500);
  }else{
    chatController.setName($.cookie(COOKIE_NAME));
    chatController.focus();
  }

  // ナビバー消去
  $("#both_zen").click(function(){
    $(".navbar").fadeOut();
    $(".dummy-top-space").fadeOut();
  });

  $("#memo_zen").click(function(){
    $(".navbar").fadeOut();
    $(".dummy-top-space").fadeOut();
    $(".viewport__left").hide();
  });

  $("#chat_zen").click(function(){
    $(".navbar").fadeOut();
    $(".dummy-top-space").fadeOut();
    $(".viewport__right").hide();
  });

  // ショートカットキー
  $(document).on("keyup", function (e) {
    if (e.keyCode == 27){ // ESC key return fullscreen mode.
      $(".navbar").fadeIn();
      $(".dummy-top-space").fadeIn();

      $(".viewport__left").fadeIn();
      $(".viewport__right").fadeIn();
    } else if (e.ctrlKey && e.ctrlKey == true ){
      /*
      if (e.keyCode == 73){ // Ctrl - i : focus chat form
        $('#message').focus();
      } else if (e.keyCode == 77){ // Ctrl - m : focus current memo form
        shareMemoController.setFocus();
      } else if (e.keyCode == 72){ // Ctrl - h: select prev share memo
        shareMemoController.prev();
      } else if (e.keyCode == 76){ // Ctrl - l: select next share memo
        shareMemoController.next();
      } else if (e.keyCode == 48){ // Ctrl - 0: move top share memo
        shareMemoController.top();
      } else if (e.keyCode == 74){ // Ctrl - j: move down share memo
        shareMemoController.down();
      } else if (e.keyCode == 75){ // Ctrl - j: move down share memo
        shareMemoController.up();
      }
      */
    }
  });
  $('a[rel=tooltip]').tooltip({
    placement : 'bottom'
  });
});


function init_websocket(){
  socket.on('connect', function() {
    //console.log('connect');
    socket.emit('name',
      {
        name: $.cookie(COOKIE_NAME),
        avatar: window.localStorage.avatarImage
      });
  });

  socket.on('disconnect', function(){
    console.log('disconnect');
  });

  socket.on('set_name', function(name) {
    chatController.setName(name);
    $('#login_name').val(name);
  });

  var login_action = function(){
    var name = $('#login_name').val();
    if ( name != "" ){
      $.cookie(COOKIE_NAME,name,{ expires: COOKIE_EXPIRES });
      socket.emit('name', {name: name});
      chatController.setName(name);
      chatController.focus();
    }
    $('#name_in').modal('hide')
  };

  $('#login').click(function(){
    login_action();
  });

  $('#login_form').submit(function(){
    login_action();
    return false;
  });
};
