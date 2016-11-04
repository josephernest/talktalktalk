#!/usr/bin/python
# -*- coding: utf-8 -*-
#
# TalkTalkTalk
#
# is an easy-installable small chat room, with chat history. 
# 
# author:  Joseph Ernest (twitter: @JosephErnest)
# url:     http://github.com/josephernest/talktalktalk
# license: MIT license
# date:    2016/11/04 


import sys, time, json, bleach, time, threading, dumbdbm
import daemon
from bottle import route, run, view, request, post, ServerAdapter, get
from gevent import pywsgi
from geventwebsocket.handler import WebSocketHandler

idx = 0

def websocket(callback):
    def wrapper(*args, **kwargs):
        callback(request.environ.get('wsgi.websocket'), *args, **kwargs)
    return wrapper

class GeventWebSocketServer(ServerAdapter):
    def run(self, handler):
        server = pywsgi.WSGIServer((self.host, self.port), handler, handler_class=WebSocketHandler)
        server.serve_forever()

def main():
    global idx
    db = dumbdbm.open('talktalktalk.db', 'c')
    idx = len(db)

    users = {}
    pings = {}

    def send_userlist():
        for u in users.keys():
            u.send(json.dumps({'type' : 'userlist', 'connected': users.values()}))

    def dbworker():        # when a user disappears during more than 30 seconds (+/- 10), remove him/her from the userlist
        while True:
            userlistchanged = False
            t = time.time()
            for ws in users.copy():
                if t - pings[ws] > 30: 
                    del users[ws]
                    del pings[ws]
                    userlistchanged = True
            if userlistchanged:
                send_userlist()

            time.sleep(10)

    dbworkerThread = threading.Thread(target=dbworker)
    dbworkerThread.daemon = True
    dbworkerThread.start()

    @get('/ws', apply=[websocket])
    def chat(ws):
        global idx
        while True:
            receivedmsg = ws.receive()
            if receivedmsg is not None:
                if len(receivedmsg) > 16384:      # this user is probably a spammer
                    break
                pings[ws] = time.time()
                if receivedmsg == 'ping':         # ping/pong packet to make sure connection is still alive
                    ws.send('id' + str(idx-1))    # send the latest message id in return
                    if ws not in users:
                        users[ws] = username
                        send_userlist()
                else:
                    msg = json.loads(receivedmsg)
                    if msg['type'] == 'message':
                        message = (bleach.clean(msg['message'])).strip().encode('utf8')
                        username = (bleach.clean(msg['username'])).strip().encode('utf8')
                        if message and username:
                            s = json.dumps({'type' : 'message', 'message': message, 'username': username, 'id': idx})
                            db[str(idx)] = s                # Neither dumbdbm nor shelve module allow integer as key... I'm still looking for a better solution!
                            idx += 1
                            for u in users.keys():
                                u.send(s)
                    elif msg['type'] == 'messagesbefore':
                        idbefore = msg['id']
                        ws.send(json.dumps({'type' : 'messages', 'before': 1, 'messages': [db[str(i)] for i in range(max(0,idbefore - 100),idbefore)]}))
                    elif msg['type'] == 'messagesafter':
                        idafter = msg['id']
                        ws.send(json.dumps({'type' : 'messages', 'before': 0, 'messages': [db[str(i)] for i in range(idafter,idx)]}))
                    elif msg['type'] == 'username':
                        username = (bleach.clean(msg['username'])).strip().encode('utf8')
                        if username:
                            if ws not in users:          # welcome new user
                                ws.send(json.dumps({'type' : 'messages', 'before': 0, 'messages': [db[str(i)] for i in range(max(0,idx - 100),idx)]}))
                            users[ws] = username
                            send_userlist()
            else:
                break
        if ws in users:
            del users[ws]
            del pings[ws]
            send_userlist()

    @route('/')
    @route('/index.html')
    @view('talktalktalk.html')
    def index():
        context = {'request': request}
        return (context)

    run(host="127.0.0.1", port=9000, debug=True, server=GeventWebSocketServer)

class talktalktalk(daemon.Daemon):
    def run(self):
        main()

if len(sys.argv) == 1:           # command line interactive mode
    main()

elif len(sys.argv) == 2:         # daemon mode
    daemon = talktalktalk(pidfile='_.pid')
    
    if 'start' == sys.argv[1]: 
        daemon.start()
    elif 'stop' == sys.argv[1]: 
        daemon.stop()
    elif 'restart' == sys.argv[1]: 
        daemon.restart()