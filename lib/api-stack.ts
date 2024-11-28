import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { ServingLambdaStack } from './serving-lambda-stack';

export class ApiStack extends cdk.Stack {
    public readonly restApiEndpoint: string;
    public readonly httpApiEndpoint: string;

    constructor(scope: Construct, id: string, lambdaStack: ServingLambdaStack, props?: cdk.StackProps) {
      super(scope, id, props);

      const httpApi = new apigatewayv2.HttpApi(this, 'HttpApi', {
        apiName: 'MyHttpApi',
        createDefaultStage: true,
      });

      const queryJobsLambdaIntegration = new integrations.HttpLambdaIntegration(
        'LambdaIntegration',
        lambdaStack.queryJobsLambdaFunction
      )

      httpApi.addRoutes({
        path: '/query-jobs',
        methods: [apigatewayv2.HttpMethod.GET],
        integration: queryJobsLambdaIntegration
      })

      const restApi = new apigateway.RestApi(this, 'RestApi', {
        restApiName: 'MyRestApi',
        deployOptions: {
          cacheClusterEnabled: true,
          stageName: 'api',
          methodOptions: {
              '/query-jobs/GET': {
              cachingEnabled: true,
              cacheTtl: cdk.Duration.seconds(90),
            }
          }
        }
      });

      restApi.root.addResource('query-jobs')
        .addMethod('GET', new apigateway.LambdaIntegration(lambdaStack.queryJobsLambdaFunction));

      this.httpApiEndpoint = httpApi.apiEndpoint;

      const stage = restApi.deploymentStage;
      this.restApiEndpoint = `https://${restApi.restApiId}.execute-api.${this.region}.amazonaws.com/${stage.stageName}`;

      new cdk.CfnOutput(this, 'HttpApiEndpoint', {
        value: this.httpApiEndpoint,
      });
  
      new cdk.CfnOutput(this, 'RestApiEndpoint', {
        value: this.restApiEndpoint,
      });
    }
}
