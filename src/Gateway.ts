import * as express from "express";
import * as uuid from "uuid";

import { IConsumer, Status } from "./consumers/IConsumer";
import { IService } from "./services/IService";

import { ZmqService } from "./services/ZmqService";

export class Gateway {
  private services: { [name: string]: IService } = {};
  private consumers: { [name: string]: IConsumer } = {};

  constructor() {
    console.log("gateway started");
  }

  public registerService(name: string, service: IService): void {
    this.services[name] = service;
    service.onResponse = this.onResponse.bind(this);
  }

  public registerConsumer(name: string, consumer: IConsumer): void {
    this.consumers[name] = consumer;
    consumer.onRequest = this.onRequest.bind(this, consumer, name);
  }

  private onResponse(route: Buffer[], response: Buffer): void {
    const consumerName = route[0].toString("utf-8");
    route = route.slice(1);

    console.log(`response received: ${consumerName} -> ${route}: ${response}`);
    const consumer = this.consumers[consumerName];

    if (!consumer) {
      console.warn("bad consumer: ", consumerName);
      return;
    }

    consumer.respond(route, Status.Ok, response);
  }

  private onRequest(consumer: IConsumer, consumerName: string,
                    serviceName: string, route: Buffer[], operation: any): void {
    console.log(`request received over ${consumerName}: ${route} -> ${serviceName}: ${operation}`);
    const service = this.services[serviceName];

    if (!service) {
      console.warn(`service ${serviceName} not found`);
      consumer.respond(route, Status.NotFound);
      return;
    }

    service.request([new Buffer(consumerName, "utf-8")].concat(route), operation);
  }
}
