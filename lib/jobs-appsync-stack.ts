import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import { CallingLambdaStack } from './calling-lambda-stack';

export class JobsAppsSyncStack extends cdk.Stack {

    constructor(scope: Construct, id: string, callingLambdaStack: CallingLambdaStack, props?: cdk.StackProps) {
      super(scope, id, props);

      const jobsGraphQlApi = new appsync.GraphqlApi(this, 'JobsAppSync', {
        name: 'JobsAppSync',
        definition: appsync.Definition.fromFile(path.join('asset/graphql/jobs.graphql')),
        authorizationConfig: {
          defaultAuthorization: {
            authorizationType: appsync.AuthorizationType.API_KEY,
            apiKeyConfig: {
              expires: cdk.Expiration.after(cdk.Duration.days(365))
            }
          }
        }
      });

      jobsGraphQlApi
        .addLambdaDataSource('JobsQueryLambda', callingLambdaStack.appsyncJobsQueryApi)
        .createResolver('JobsQueryResolver', {
          typeName: 'Query',
          fieldName: 'jobsQuery',
          requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
          responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
        });


      new cdk.CfnOutput(this, 'AppSyncUrl', {
        value: jobsGraphQlApi.graphqlUrl,
      });
    }
}
