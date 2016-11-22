FROM python:2.7

RUN pip install bottle bleach gevent gevent-websocket
ADD . /opt/app/talktalktalk
WORKDIR /opt/app/talktalktalk

#  Update Config For Docker bind host
RUN sed -i "s/HOST =.*/HOST = \"0\.0\.0\.0\"/g" config.py
EXPOSE 9000
CMD python talktalktalk.py
