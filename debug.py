#!/usr/bin/env python3

import argparse
import zmq

def service(context, args):
    gateway = args.gateway
    data = args.data

    print("serving <%s> on %s"%(data, gateway))
    socket = context.socket(zmq.REP)
    socket.connect(gateway)

    while True:
        frames = socket.recv_multipart(0)
        print(frames)
        socket.send_multipart([data.encode("utf-8")])

def request(context, args):
    gateway = args.gateway
    service = args.service
    data = args.data
    
    print("requesting <%s> from %s on %s"%(data, service, gateway))
    socket = context.socket(zmq.REQ)
    socket.connect(gateway)

    socket.send_multipart([service.encode("utf-8"), data.encode("utf-8")])
    frames = socket.recv_multipart(0)
    print("response: <%s>"%(frames[0].decode("utf-8")))

def gateway(context, args):
    frontend_endpoint = args.frontend
    backend_endpoint = args.backend
    print("gateway %s -> %s"%(frontend_endpoint, backend_endpoint))

    frontend = context.socket(zmq.ROUTER)
    backend = context.socket(zmq.DEALER)
    poller = zmq.Poller()
    poller.register(frontend, zmq.POLLIN)
    poller.register(backend, zmq.POLLIN)

    frontend.bind(frontend_endpoint)
    backend.bind(backend_endpoint)

    while True:
        socks = dict(poller.poll())

        if frontend in socks and socks[frontend] == zmq.POLLIN:
            frames = frontend.recv_multipart()
            print("request received:", frames)
            delim = frames.index(b"")
            header = frames[:delim]
            body = frames[delim+1:]
            service = body[0]
            query = body[1]
            print("header:", header)
            print("service:", service)
            print("query:", query)
            forward = [b"zmq"] + header + [b"", query]
            print("forwarding: ", forward)
            backend.send_multipart(forward)

        if backend in socks and socks[backend] == zmq.POLLIN:
            frames = backend.recv_multipart()
            print("response received:", frames)
            consumer = frames[0]
            delim = frames.index(b"")
            route = frames[1:delim]
            response = frames[delim+1:]
            print("route back: %s -> %s"%(consumer, route))
            forward = route + [b""] + response
            print("forwarding: ", forward)
            frontend.send_multipart(forward)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(title = "roles")

    service_command = commands.add_parser("service")
    service_command.add_argument("gateway")
    service_command.add_argument("data")
    service_command.set_defaults(func = service)

    request_command = commands.add_parser("request")
    request_command.add_argument("gateway")
    request_command.add_argument("service")
    request_command.add_argument("data")
    request_command.set_defaults(func = request)

    gateway_command = commands.add_parser("gateway")
    gateway_command.add_argument("frontend")
    gateway_command.add_argument("backend")
    gateway_command.set_defaults(func = gateway)

    args = parser.parse_args()

    context = zmq.Context()

    if "func" in args:
        args.func(context, args)
    else:
        parser.print_help()
