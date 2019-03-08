import "source-map-support/register";

import * as bodyParser from "body-parser";
import * as cors from "cors";
import * as express from "express";
import * as expressGraphQL from "express-graphql";
import { buildClientSchema, ExecutionResult, graphql, GraphQLSchema, introspectionQuery,
    IntrospectionQuery, printSchema, Source } from "graphql";
import { Gateway, IStitch } from "./Gateway";
import { HttpService } from "./services/HttpService";

const main = async () => {
    const roles = new HttpService("http://phunkis-service:8080/roles");
    const roleInstances = new HttpService("http://phunkis-service:8080/roleInstances");
    const port = 8083;
    const gateway = new Gateway();
    gateway.addService(roles);
    gateway.addService(roleInstances);

    const roleStitch: IStitch = {
        provider: roles,
        providerMethod: {
            args: {
                uid: "role",
            },
            name: "getRole",
        },
        wrappedField: "roleObject",
        wrappedType: "Role!",
        wrapper: roleInstances,
        wrapperType: "RoleInstance",
    };
    gateway.addStitch(roleStitch);

    const roleInstanceStitch: IStitch = {
        provider: roleInstances,
        providerMethod: {
            args: {
                role: "uid",
            },
            name: "allUsers",
        },
        wrappedField: "allWorkers",
        wrappedType: "[RoleInstance!]!",
        wrapper: roles,
        wrapperType: "Role",
    };
    const roleInstanceStitch2: IStitch = {
        provider: roleInstances,
        providerMethod: {
            args: {
                role: "uid",
            },
            name: "currentUsers",
        },
        wrappedField: "currentWorkers",
        wrappedType: "[RoleInstance!]!",
        wrapper: roles,
        wrapperType: "Role",
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
