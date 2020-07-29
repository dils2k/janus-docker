FROM ubuntu:latest

RUN apt-get update -y
RUN apt-get upgrade -y

RUN apt-get install -y aptitude git

# to ignore tzdata's prompt
RUN export DEBIAN_FRONTEND=noninteractive
RUN ln -fs /usr/share/zoneinfo/America/New_York /etc/localtime

RUN aptitude install -y libmicrohttpd-dev libjansson-dev \
	libssl-dev libsofia-sip-ua-dev libglib2.0-dev \
	libopus-dev libogg-dev libcurl4-openssl-dev liblua5.3-dev \
	libconfig-dev pkg-config gengetopt libtool automake

RUN aptitude install -y meson

RUN apt-get remove libnice-dev
RUN git clone https://gitlab.freedesktop.org/libnice/libnice.git
WORKDIR libnice
RUN meson --prefix=/usr build && ninja -C build && ninja -C build install
ENV PKG_CONFIG_PATH=/usr/lib64/pkgconfig
WORKDIR /

ENV LD_LIBRARY_PATH=/usr/lib64

RUN apt-get install -y wget build-essential

RUN wget https://github.com/cisco/libsrtp/archive/v2.2.0.tar.gz
RUN tar xfv v2.2.0.tar.gz
WORKDIR libsrtp-2.2.0
RUN ./configure --prefix=/usr --enable-openssl
RUN make shared_library && make install
WORKDIR /

RUN apt-get install -y cmake

RUN git clone https://libwebsockets.org/repo/libwebsockets.git
WORKDIR libwebsockets
RUN mkdir build
WORKDIR build
RUN cmake -DLWS_MAX_SMP=1 -DCMAKE_INSTALL_PREFIX:PATH=/usr -DCMAKE_C_FLAGS="-fpic" ..
RUN make && make install
WORKDIR /

RUN git clone https://github.com/meetecho/janus-gateway.git
WORKDIR janus-gateway
RUN sh autogen.sh
RUN ./configure --prefix=/opt/janus --disable-data-channels --disable-rabbitmq --disable-mqtt
RUN make
RUN make install
RUN make configs

CMD /opt/janus/bin/janus
