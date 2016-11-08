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


PORT = 9000
HOST = "127.0.0.1"
ADMINNAME = 'admin'        # this username will be available if *and only if* the following username is entered in the input field:
ADMINHIDDENNAME = 'adminxyz'

import sys, time, json, bleach, time, threading, dumbdbm, random, re
import daemon
from bottle import route, run, view, request, post, ServerAdapter, get, static_file
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

    def clean_username(usr, ws):
        username = bleach.clean(usr).encode('utf8')     
        username = re.sub('[‍ :]', '', username)      # removes " ", ":", and this evil char http://unicode-table.com/fr/200D/
        if username.lower() == ADMINNAME or username == '':
            username = 'user' + str(random.randint(0,1000))
            ws.send(json.dumps({'type' : 'usernameunavailable', 'username' : username}))
        elif username.lower() == ADMINHIDDENNAME:
            username = ADMINNAME
            ws.send(json.dumps({'type' : 'displayeduser', 'username' : username}))
        return username            

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
                    if ws not in users:           # was deleted by dbworker
                        ws.send(json.dumps({'type' : 'username'}))
                else:
                    msg = json.loads(receivedmsg)
                    if msg['type'] == 'message':
                        message = (bleach.clean(msg['message'])).strip().encode('utf8')

                        if ws not in users:         # is this really mandatory ?
                            username = clean_username(msg['username'], ws)       
                            users[ws] = username
                            send_userlist()

                        if message:
                            s = json.dumps({'type' : 'message', 'message': message, 'username': users[ws], 'id': idx, 'datetime': int(time.time())})
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
                        username = clean_username(msg['username'], ws)
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

    @route('/popsound.mp3')
    def popsound():
        return static_file('popsound.mp3', root='.')        

    run(host=HOST, port=PORT, debug=True, server=GeventWebSocketServer)

class talktalktalk(daemon.Daemon):
    def run(self):
        main()

if len(sys.argv) == 1:           # command line interactive mode
    main()

elif len(sys.argv) == 2:         # daemon mode
    daemon = talktalktalk(pidfile='_.pid', stdout='log.txt', stderr='log.txt')
    
    if 'start' == sys.argv[1]: 
        daemon.start()
    elif 'stop' == sys.argv[1]: 
        daemon.stop()
    elif 'restart' == sys.argv[1]: 
        daemon.restart()
