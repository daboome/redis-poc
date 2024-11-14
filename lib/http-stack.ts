import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { LambdaStack } from './lambda-stack';

export class HttpStack extends cdk.Stack {

    public readonly httpApiEndpoint: string;

    constructor(scope: Construct, id: string, lambdaStack: LambdaStack, props?: cdk.StackProps) {
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

      this.httpApiEndpoint = httpApi.apiEndpoint;
    }
}
