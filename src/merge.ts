import {GraphQLFieldResolver, GraphQLResolveInfo, GraphQLSchema} from "graphql";
import {IFieldResolver, IResolverObject, IResolvers, MergeInfo, mergeSchemas} from "graphql-tools";
export interface IGraphQLService {
    fetchSchema: () => Promise<GraphQLSchema>;
}

export async function merge(services: IGraphQLService[], extensions: string[], resolvers: any): Promise<GraphQLSchema> {
    const schemas: GraphQLSchema[] = await Promise.all(services.map((s) => s.fetchSchema()));
    return mergeSchemas({resolvers, schemas: [...schemas, ...extensions]});
}
interface IDict {[key: string]: any; }
export async function addLink<TContext>(
    wrapper: IGraphQLService,
    provider: IGraphQLService,
    wrapperType: string,
    wrappedField: string,
    wrappedType: string,
    providerMethod: {name: string,
                     args: [{parameterName: string, value: string}],
    }): Promise<{typeDef: string, resolver: any}> {
    const schema = await provider.fetchSchema();
    const argValues: string[] = providerMethod.args.map(({value}) => value);
    const convertArgs = (wrapperNode: IDict): IDict =>
    Object.assign({}, ...providerMethod.args
        .map(({parameterName, value})  => ({[value]: wrapperNode[parameterName]})),
    );
    const resolve: IFieldResolver<IDict, TContext> = (wrapperNode, args, context, info) =>
        info.mergeInfo.delegateToSchema<TContext>({
            args: convertArgs(wrapperNode),
            context,
            fieldName: providerMethod.name,
            info,
            operation: "query",
            schema,
        });
    return {
        resolver: {
            [wrapperType]: {
                [wrappedField]: {
                    fragment: `... on ${wrapperType} { ${argValues.join(",\n")} }`,
                    resolve,
                },
            },
        },
        typeDef: `extend type ${wrapperType} {
            ${wrappedField}: ${wrappedType}
        }`,
    };
}
