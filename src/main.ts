import "source-map-support/register";

import * as bodyParser from "body-parser";
import * as cors from "cors";
import * as express from "express";
import * as expressGraphQL from "express-graphql";
import { buildClientSchema, ExecutionResult, graphql, GraphQLSchema, introspectionQuery,
    IntrospectionQuery, printSchema, Source } from "graphql";
import { Gateway, IStitch } from "./merge";
import { HttpService } from "./services/HttpService";

const main = async () => {
    const roles = new HttpService("http://localhost:8080/roles");
    const roleInstances = new HttpService("http://localhost:8080/roleInstances");
    const port = 8083;
    const gateway = new Gateway();
    gateway.addService(roles);
    gateway.addService(roleInstances);

    const roleStitch: IStitch = {
        wrapper: roleInstances,
        provider: roles,
        wrapperType: "RoleInstance",
        wrappedField: "roleObject",
        wrappedType: "Role!",
        providerMethod: {
            args: {
                "uid": "role",
            },
            name: "getRole",
        },
    };
    gateway.addStitch(roleStitch);

    const roleInstanceStitch: IStitch = {
        wrapper: roles,
        provider: roleInstances,
        wrapperType: "Role",
        wrappedField: "allWorkers",
        wrappedType: "[RoleInstance!]!",
        providerMethod: {
            args: {
                "role": "uid",
            },
            name: "allUsers",
        },
    };
    const roleInstanceStitch2: IStitch = {
        wrapper: roles,
        provider: roleInstances,
        wrapperType: "Role",
        wrappedField: "currentWorkers",
        wrappedType: "[RoleInstance!]!",
        providerMethod: {
            args: {
                "role": "uid",
            },
            name: "currentUsers",
        },
    };
    gateway.addStitch(roleInstanceStitch);
    gateway.addStitch(roleInstanceStitch2);

    const schema = await gateway.fetchSchema();
    console.log("schema", printSchema(schema));
    const server = express();
    server.use(cors());
    server.use("/", expressGraphQL({
        graphiql: true,
        schema,
    }));
    server.listen(port, () => console.log(`http consumer listening on port ${port}`));
};
main();
