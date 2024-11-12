import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { RedisStack } from './redis-stack';

export class LambdaStack extends cdk.Stack {

    constructor(scope: Construct, id: string, redisPocStack: RedisStack, props?: cdk.StackProps) {
      super(scope, id, props);

    // Create a Lambda function
    const lambdaFunction = new lambda.Function(this, 'RedisLambdaFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      code: lambda.Code.fromAsset('lib/lambda/list_jobs'), // Assumes your Lambda code is in the 'lambda' directory
      handler: 'index.handler',
      vpc: redisPocStack.redisVpc,
      securityGroups: [redisPocStack.redisSecurityGroup],
      environment: {
        REDIS_HOST: redisPocStack.redisHost,
        REDIS_PORT: redisPocStack.redisPort
      }
    });

    // Grant the Lambda function permissions to access the Redis cluster
    lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['elasticache:DescribeCacheClusters'],
      resources: ['*']
    }));
    }
}
