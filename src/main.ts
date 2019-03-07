import "source-map-support/register";

import * as bodyParser from "body-parser";
import * as cors from "cors";
import * as express from "express";
import * as expressGraphQL from "express-graphql";
import { buildClientSchema, ExecutionResult, graphql, GraphQLSchema, introspectionQuery,
    IntrospectionQuery, printSchema, Source } from "graphql";
import { addLink, merge } from "./merge";
import { HttpService } from "./services/HttpService";

const main = async () => {
    const roles = new HttpService("http://localhost:8080/roles");
    const roleInstances = new HttpService("http://localhost:8080/roleInstances");
    const port = 8083;

    const {typeDef, resolver} = await addLink(
        roleInstances,
        roles,
        "RoleInstance",
        "roleObject",
        "Role!",
        {
            args: [{
                parameterName: "uid",
                value: "role",
            }],
            name: "getRole",
        },
    );

    merge([roles, roleInstances], [typeDef], resolver)
        .then((schema) => {
            console.log("schema", printSchema(schema));
            const server = express();
            server.use(cors());
            server.use("/", expressGraphQL({
                graphiql: true,
                schema,
            }));
            server.listen(port, () => console.log(`http consumer listening on port ${port}`));
        });
};
main();
