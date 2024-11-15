import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { RedisStack } from './redis-stack';

export class ServingLambdaStack extends cdk.Stack {

  public readonly queryJobsLambdaFunction: lambda.IFunction;

  constructor(scope: Construct, id: string, redisPocStack: RedisStack, dynamoDbTableName: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const dynamoDbTable = dynamodb.Table.fromTableName(this, 'ImportedTableForServingLambda', dynamoDbTableName);

    // Create a Lambda function to Query Jobs from DynamoDB
    const queryJobsLambdaFunction = new lambda.Function(this, 'JobsQueryDynamoDbLambdaFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      code: lambda.Code.fromAsset('lib/lambda/api_jobs_query'), // Assumes your Lambda code is in the 'lambda' directory
      handler: 'index.handler',
      timeout: cdk.Duration.seconds(30),
      environment: {
        TABLE_NAME: dynamoDbTableName,
        REDIS_HOST: redisPocStack.redisHost,
        REDIS_PORT: redisPocStack.redisPort
      }
    });

    dynamoDbTable.grantReadData(queryJobsLambdaFunction);

    this.queryJobsLambdaFunction = queryJobsLambdaFunction;
  }
}
