TalkTalkTalk
=============

**TalkTalkTalk** is an easy-to-install single-page chat room. No login required, no complex layout. Just chat.

[Live demo](http://185.164.138.19:7311/)

![](http://gget.it/husi2by3/screenshot1_575.jpg) ![](http://gget.it/k9oj75rs/screenshotphone_5.jpg)


Installation
----
The best way to test TalkTalkTalk is to install it locally on a Windows or Linux machine. You need to have Python installed. Just do:

    git clone https://github.com/josephernest/talktalktalk.git      # or unzip talktalktalk-master.zip
    pip install bottle bleach gevent gevent-websocket               # these Python module are required, compilation can 
    cd talktalktalk                                                 #                              take up to 3 minutes
    python talktalktalk.py start                                    # or use ./talktalktalk.py start instead to have a 
                                                                    #                     proper name when using "top"

Open your browser at the address `127.0.0.1:9000`, it works!

Now that it works locally, you probably want to install it on a web server, using an Apache server? The installation process is the same, you probably have nothing else to do, because the `.htaccess` file is already telling your web server how to redirect the traffic to the Python script, and everything should work out of the box.  If it doesn't, try to run `a2enmod proxy proxy_wstunnel ; service apache2 restart` to enable WebSocket handling by Apache.


Why another chat software?
----
There are thousands of great chat software everywhere, but I never found the one I was looking for, because:

* some of them are cool, but not open-source, and so you cannot host them on your own server (e.g. [tlk.io](http://www.tlk.io)),
* some of them are cool, but not easy to install, require a too big server, or offer too many features I don't need (e.g. [mattermost.org](http://www.mattermost.org)),
* some of them are interesting tutorials about how to program a chat in PHP, node.js, but are not ready-to-use for everyday discussion inside a small team, because they lack some important feature (such as chat history, disconnection/reconnection handling, usable user interface, etc.)

That's why I decided to make TalkTalkTalk, that has the following features:

* open-source
* easy to install
* persistent database, i.e. if you come back to the chat room tomorrow you can read all past messages, and you can see what happened when you were offline (very useful for team work)
* mobile devices support (it's not as easy as it may sound to detect accurately connection/disconnection)
* LPWP website, a.k.a. "Landing Page=Working Page", i.e. the first page that you visit on the website is the page *where things actually happen*, that means that there is no annoying welcome page or login page, etc.



About
----
Author: Joseph Ernest ([@JosephErnest](http:/twitter.com/JosephErnest))

Other projects: [BigPicture](https://bigpictu.re), [bigpicture.js](https://github.com/josephernest/bigpicture.js), [SamplerBox](https://www.samplerbox.org), [Void CMS](https://github.com/josephernest/void), [YellowNoiseAudio](https://www.yellownoiseaudio.com), etc.

Sponsoring and consulting
----
I am available for Python, Data science, ML, Automation consulting. Please contact me on https://afewthingz.com for freelancing requests.

Do you want to support the development of my open-source projects? Please contact me!

I am currently sponsored by [CodeSigningStore.com](https://codesigningstore.com). Thank you to them for providing a DigiCert Code Signing Certificate and supporting open source software.

License
----
MIT license


FAQ
----

Q: How to send messages? Is there a way to get username autocompletion like in IRC?  
A: Use `<ENTER>` to send messages. Use `<TAB>` to autocomplete usernames, example: `us` + `<TAB>` will give `user1`, then `user2`, etc. It also works with `@<username>`.

Q: How to find the date and time of the messages?  
A: Hover over the messages, and a tooltip will show the date and time.

Q: Is there a flood control feature?  
A: The chat has a very basic flood control: a user cannot send more than 10 messages in 5 seconds.

Q: Is there a way to prevent a particular username from being used by anyone except me?  
A: The username `admin` is available *if and only if* the username `adminxyz` is entered in the input box. Change `adminxyz` to a private password in the beginning of `talktalktalk.py`, and as a result *noone else than you will be able to use the username `admin`.*

Q: Tech question: why use WebSocket instead of good old [polling](http://stackoverflow.com/a/12855533/1422096) method?  
A: I use WebSocket because it allows good performance: having 100 users at the same time results in less than 1% CPU usage, on my small server. Before using WebSocket, I first tried with standard polling (i.e. every client requests changes from the server every 250 milliseconds), but benchmarks showed that having 100 users connected to the chat room at the same time was eating a 40% of CPU of my small web server. That was too much, thus the use of WebSocket that is far better.

Q: Tech question: why use `dumbdbm` on server?  
A: Because it works. If you know a Python database module that 1) stores data in a file (i.e. no database server needed), 2) is lightweight, 3) allows inserts / queries with a dictionary syntax (`db['hello'] = 'blah'`), and if possible allows integers as dictionary keys, I'm interested!

Q: Tech question: How can I run the project inside a Docker container?  
A: There is a Dockerfile in the root of the project directory. After clone, simply run `docker build -t talktalktalk .`. Then the following command to run it as a container: 
```
docker run -d --name=talktalktalk -p 9000:9000 talktalktalk
```

