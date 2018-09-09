FROM node:10-alpine
FROM tiangolo/uwsgi-nginx-flask:python3.5
RUN apt-get update
RUN apt-get -y upgrade
RUN apt-get -y install python3-pip
RUN apt-get -y install build-essential cmake pkg-config
RUN apt-get -y install libx11-dev libatlas-base-dev
RUN apt-get -y install libgtk-3-dev libboost-python-dev
RUN pip3 install dlib
RUN pip3 install opencv-python
RUN pip3 install colorlog
RUN pip3 install face_recognition
RUN apt-get -y install vim

ENV NODE_ENV production

RUN mkdir /usr/share/app
COPY . /usr/share/app
WORKDIR /usr/share/app

RUN yarn global add pm2 sharp && \
    yarn install

COPY ./engine /root/engine
WORKDIR /root/

CMD ["yarn", "start:docker"]

EXPOSE 8080
