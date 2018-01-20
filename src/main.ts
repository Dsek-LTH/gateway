import "source-map-support/register";

import { Gateway } from "./Gateway";

import { ZmqService } from "./services/ZmqService";

import { HttpConsumer } from "./consumers/HttpConsumer";
import { ZmqConsumer } from "./consumers/ZmqConsumer";

const gateway = new Gateway();

gateway.registerService("login", new ZmqService(1338));

gateway.registerConsumer("zmq", new ZmqConsumer("tcp://*:6000"));
gateway.registerConsumer("http", new HttpConsumer(8080));
