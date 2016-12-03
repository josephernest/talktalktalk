var popsound = new Audio('/static/popsound.mp3');
var randomname = 'user' + Math.floor((Math.random() * 1000) + 1);
var displayeduser;
var ws;
var lastPong;
var users;
var firstId;
var lastId;
var loop;

function is_scrolled_end() { // See http://stackoverflow.com/a/40370876/1422096
    return ((window.innerHeight + window.pageYOffset) >= document.body.offsetHeight);
}

function scroll_end () {
    document.body.scrollTop = document.body.scrollHeight;                           // both useful because this one not working in FF47
    document.documentElement.scrollTop = document.documentElement.scrollHeight;     // both useful because this one not working in Chrome 43 Android
}

function scroll_top () {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
}    

function add_urls(s) {
    return s.replace(/(https?:\/\/[^ ]+)/g, '<a href="$1" target="_blank">$1</a>');
}

function timeConverter(t) {     // http://stackoverflow.com/a/40449006/1422096
    if (t == null) 
        return '';
    var a = new Date(t * 1000);
    var today = new Date();
    var yesterday = new Date(Date.now() - 86400000);
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var time = ("0" + hour).slice(-2) + ':' + ("0" + min).slice(-2);
    if (a.setHours(0,0,0,0) == today.setHours(0,0,0,0))
        return 'today, ' + time;
    else if (a.setHours(0,0,0,0) == yesterday.setHours(0,0,0,0))
        return 'yesterday, ' + time;
    else if (year == today.getFullYear())
        return date + ' ' + month + ', ' + time;
    else
        return date + ' ' + month + ' ' + year + ', ' + time;
}

function mediaPlaybackRequiresUserGesture() { // http://stackoverflow.com/a/40474415/1422096
  var audio = document.createElement('audio');
  audio.play();
  return audio.paused;
}

function ready() {
    lastPong = undefined;
    users = [];
    firstId = Infinity;
    lastId = -1;

    if (mediaPlaybackRequiresUserGesture()) { // mobile devices require user gesture to trigger a play. "Notifications" off for them.
        $('#notificationswitch').text('off');
        $('#notifications').hide();
    }

    function popup_message (message, clicktoclosepopup, clicktoreload) {
        $('#popup').text(message).removeClass('hidden');
        $(':not(.popup)').addClass('opaque');
        if (clicktoclosepopup)
            $(document).on('click keydown', function() { $(document).off('click keydown'); $('#popup').addClass('hidden'); $(':not(#popup)').removeClass('opaque'); });
        else if (clicktoreload)
            $(document).on('click keydown', function() { $(document).off('click keydown'); $(document).off('keydown'); ws.close(); ready(); });
    }

    if (!window.WebSocket) {
        $('#popup').text('Your browser is not supported, please use another browser.').removeClass('hidden');
        $('#writing').prop('disabled', true);
        $(':not(#popup)').addClass('opaque');
    }
    else {
        $('#main').text('');
        $('#writing').val('');
    }

    if (localStorage.getItem("username") === null || localStorage.getItem("username") === '') {
        $('#username').text(randomname);
        localStorage.setItem("username", $('#username').text());
    }
    else 
        $('#username').text(localStorage.getItem("username"));

    ws = new WebSocket(location.href.replace('http', 'ws') + 'ws');        // replace replaces only the first occurence
      
    $(window).on('beforeunload', function() { 
        ws.close(); 
    });

    ws.onopen = function() { 
        ws.send(JSON.stringify({ "type" : "username", "username" : $('#username').text() }));
        lastPong = Date.now();
        $('#popup').addClass('hidden'); $(':not(#popup)').removeClass('opaque');
        $('#writing').focus();  
        scroll_end();
        setTimeout(function() { scroll_end(); }, 200);  // useful on touch devices, when keyboard opens
    };

    ws.onclose = function() { 
        setTimeout(function() { 
            if (ws.readyState != 0 && ws.readyState != 1)
                popup_message('Click anywhere or press any key to reload the page.', false, true);
         }, 2000);
    };    

    loop = setInterval(function() {
        ws.send('ping');
        if (Date.now() - lastPong > 10000) { // disconnected from internet or phone idle mode; in both cases, ws.readyState can be 1 (OPEN) so we can't use that
            ws.send('ping');   // this is your last chance ! we send a packet now, and if in 1 second, nothings happen, this means we're dead
            setTimeout( function() {
                if (Date.now() - lastPong > 10000)  // you missed your last chance !
                    popup_message('Click anywhere or press any key to reload the page.', false, true);          // disconnected from internet
                else                                // ok the phone was just idle, let's resume
                    ws.send(JSON.stringify({ "type" : "username", "username" : $('#username').text() }));  // let's send username again, so that other users see me
            }, 1000);
        }
    }, 5000);

    $('#previous').click(function(e) {
        ws.send(JSON.stringify({'type': 'messagesbefore', 'id': firstId}));
        e.preventDefault();
        return false;
    });

    ws.onmessage = function(e) { 
        lastPong = Date.now();
        if (e['data'].slice(0,2) === 'id') {
            var serverlastid = e['data'].slice(2);
            if (serverlastid != lastId) { // some messages were lost
                ws.send(JSON.stringify({'type': 'messagesafter', 'id': lastId}));
            }
            return;
        }
        var data = JSON.parse(e['data']);
        if (data['type'] === 'message') {
            if (data['id'] > lastId + 1) {  // some messages were lost
                ws.send(JSON.stringify({'type': 'messagesafter', 'id': lastId}));
                return;
            }
            lastId = data['id'];
            var isscrolledend = is_scrolled_end();
            $('#main').append('<p title="' + timeConverter(data['datetime']) + '"><b>' + data['username'] + '</b>: ' + add_urls(data['message']) + '</p>');
            if (isscrolledend)
                scroll_end();
            if (data['username'] !== $('#username').text() && data['username'] !== displayeduser && $('#notificationswitch').text() === 'on') {
                popsound.load(); popsound.play();
            }
        }
        else if (data['type'] === 'messages') {
            var newmessages = document.createDocumentFragment();
            var messagelist = data['messages'];
            for (var i = 0; i < messagelist.length; i++) {
                var msg = JSON.parse(messagelist[i]);
                if (data['before'] != 1 && msg['id'] <= lastId)       // message already added 
                    continue;
                $(newmessages).append('<p title="' + timeConverter(msg['datetime']) + '"><b>' + msg['username'] + '</b>: ' + add_urls(msg['message']) + '</p>');
                firstId = Math.min(firstId, msg['id'])
                lastId = Math.max(lastId, msg['id']);
            }
            if (data['before'] == 1)
                $('#main').prepend(newmessages); 
            else
                $('#main').append(newmessages);
            if (firstId > 0 && firstId != Infinity)
                $('#previous').removeClass('hidden');
            else
                $('#previous').addClass('hidden');
            if (data['before'] == 1)
                scroll_top();
            else
                scroll_end();
        }
        else if (data['type'] === 'userlist') {
            users = data['connected'];
            $('#connected').html(users.join('<br>'));         // or .map(x => `${x}<br>`).join('')
        }
        else if (data['type'] === 'username') {  // server asks to (re)send username
            ws.send(JSON.stringify({ "type" : "username", "username" : $('#username').text() }));
        }
        else if (data['type'] === 'usernameunavailable') {
            $('#username').text(data['username']);
            localStorage.setItem("username", $('#username').text());
            popup_message('Your username has been changed because the one you entered is reserved.', true, false);
        }
        else if (data['type'] === 'flood') {
            popup_message('Please do not flood this chat.', false, false);
            ws.onclose = undefined;
            clearInterval(loop);
            ws.close();
        }
        else if (data['type'] === 'displayeduser') {
            displayeduser = data['username'];
        }
    };

    $('#username').on('click', function(e) { 
        $('#username').hide(); 
        $('#usernameinput').val($('#username').text()).show().focus(); 
        e.preventDefault(); 
        return false; 
    });

    $('#writing').on('click', function(e) {             // trick for touch devices: when phone keyboard opens, we won't be scrolled-end anymore, so force it
        if (is_scrolled_end())
            setTimeout(function() { scroll_end(); }, 200);
    });

    $('#writing').keydown(function(e) {
        if (e.keyCode == 13 && !e.shiftKey) {
            if ($('#writing').val().trim() !== '')
                ws.send(JSON.stringify({ type: 'message', username: $('#username').text(), message: $('#writing').val().trim() }));
            $('#writing').val('');     
            e.preventDefault();  
        }
        else if (e.keyCode == 9) {                   // see http://stackoverflow.com/a/40319943/1422096
            var input = document.getElementById('writing');
            var patt = /\b@?(\S+)$/;
            e.preventDefault();
            var start = input.selectionStart;
            var seg = input.value.slice(0, start);
            var match = (seg.match(patt) || [])[0];
            if (!match) { return; }
            var idx = users.findIndex(function (x) { return x.startsWith(match); });
            if (idx < 0) { return; }
            var replace = users[users[idx] === match ? (idx + 1) % users.length : idx];
            var newSeg = seg.replace(patt, replace);
            input.value = newSeg + input.value.slice(start);
            input.setSelectionRange(newSeg.length, newSeg.length);
        }
        else if (e.keyCode == 33 || e.keyCode == 34) {   // alows to scroll with PAGE UP / DOWN even if textarea has focus
            $('#writing').blur();
            setTimeout(function() { $('#writing').focus(); }, 10);
        }
    });

    $('#usernameinput').on('blur', function(e) {
        var usr =  $('#usernameinput').val();
        usr = usr.replace(/[:\s]/g, '');
        if (usr === '')
            usr = randomname;
        $('#username').text(usr);
        localStorage.setItem("username", usr);
        $('#usernameinput').hide();
        $('#username').show();
        ws.send(JSON.stringify({ "type" : "username", "username" : usr }));
        e.preventDefault();
    });

    $('#usernameinput').keydown(function(e) {
        if (e.keyCode == 13) {
            $('#usernameinput').blur();
        }
        if (e.keyCode == 27) {
            $('#usernameinput').val($('#username').text()).hide();
            $('#username').show();
            e.preventDefault();
            return false;
        }
    });

    $('#notificationswitch').click(function() {
        $('#notificationswitch').text($('#notificationswitch').text() === 'on' ? 'off' : 'on');
    });
}

$(document).ready(ready);
