import "source-map-support/register";

import * as bodyParser from "body-parser";
import * as cookieParser from "cookie-parser";
import * as cors from "cors";
import * as dotenv from "dotenv";
import * as express from "express";
import * as expressGraphQL from "express-graphql";
import { buildClientSchema, DocumentNode, ExecutionResult, graphql, GraphQLResolveInfo,
    GraphQLSchema, introspectionQuery, IntrospectionQuery, printSchema, Source } from "graphql";
import { getUser } from "./auth";
import { Gateway, IStitch } from "./Gateway";
import { HttpService } from "./services/HttpService";

dotenv.config();

interface IContext {
    req: express.Request;
    res: express.Response;
}

let publicKey: string;

const getPublicKey = async (loginSchema: GraphQLSchema, context: IContext): Promise<string> => {
    if (publicKey) { return publicKey; }
    const result = await graphql({
        contextValue: context,
        schema: loginSchema,
        source: "{ publicKey }",
    });
    return (publicKey = result.data.publicKey);
};

const main = async () => {
    console.log("gateway starting up");
    const login = new HttpService(process.env.LOGIN_URL);
    const port = 8083;
    const gateway = new Gateway();
    gateway.addService(login);

    const roles = new HttpService(process.env.ROLE_URL);
    const roleInstances = new HttpService(process.env.ROLE_INSTANCE_URL);
    const hoarder = new HttpService(process.env.HOARDER_URL);
    gateway.addService(roles);
    gateway.addService(roleInstances);
    gateway.addService(hoarder);

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
    const loginSchema = await login.fetchSchema();
    console.log("schema", printSchema(schema));

    const server = express();
    server.use(cookieParser());
    server.use(cors());
    server.use("/", async (req, res) => {
        const key = await getPublicKey(loginSchema, { req, res });
        const user = getUser(req, key);
        return expressGraphQL({
            context: {req, res, user},
            graphiql: true,
            schema,
        })(req, res);
    });
    server.listen(port, () => console.log(`http consumer listening on port ${port}`));
};
main();
