import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { RedisStack } from './redis-stack';
import { ApiStack } from './api-stack';

export class CallingLambdaStack extends cdk.Stack {

  public readonly appsyncJobsQueryApi: lambda.IFunction;
  public readonly appsyncJobsQueryRedis: lambda.IFunction;
  public readonly appsyncJobsSearchRedis: lambda.IFunction;

  constructor(scope: Construct, id: string, redisPocStack: RedisStack, dynamoDbTableName: string, apiStack: ApiStack, props?: cdk.StackProps) {
    super(scope, id, props);

    const redisLayer = new lambda.LayerVersion(this, 'RedisLayer', {
      layerVersionName: 'RedisLayer',
      description: 'A layer that contains the Redis client library',
      code: lambda.Code.fromAsset('asset/zip/redis_layer.zip'),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_12]
    });

    const requestsLayer = new lambda.LayerVersion(this, 'RequestsLayer', {
      layerVersionName: 'RequestsLayer',
      description: 'A layer that contains the Requests client library',
      code: lambda.Code.fromAsset('asset/zip/requests_layer.zip'),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_12]
    });

    const dynamoDbTable = dynamodb.Table.fromTableName(this, 'ImportedTable', dynamoDbTableName);

    // Create a Lambda function to Query Jobs from Redis
    const appsyncJobsQueryRedis = new lambda.Function(this, 'JobsQueryRedisLambdaFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      code: lambda.Code.fromAsset('lib/lambda/appsync_jobs_query_redis'), // Assumes your Lambda code is in the 'lambda' directory
      handler: 'index.handler',
      vpc: redisPocStack.redisVpc,
      securityGroups: [redisPocStack.redisSecurityGroup],
      layers: [redisLayer],
      memorySize: 256,
      timeout: cdk.Duration.minutes(5),
      environment: {
        TABLE_NAME: dynamoDbTableName,
        REDIS_HOST: redisPocStack.redisHost,
        REDIS_PORT: redisPocStack.redisPort
      }
    });

    // Grant the Lambda function permissions to access the DynamoDB table
    dynamoDbTable.grantReadData(appsyncJobsQueryRedis);

    // Grant the Lambda function permissions to access the Redis cluster
    appsyncJobsQueryRedis.addToRolePolicy(new iam.PolicyStatement({
      actions: ['elasticache:DescribeCacheClusters'],
      resources: ['*']
    }));

    this.appsyncJobsQueryRedis = appsyncJobsQueryRedis;

    // Create a Lambda function to Search Jobs from Redis
    const appsyncJobsSearchRedis = new lambda.Function(this, 'JobsSearchRedisLambdaFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      code: lambda.Code.fromAsset('lib/lambda/appsync_jobs_search_redis'), // Assumes your Lambda code is in the 'lambda' directory
      handler: 'index.handler',
      vpc: redisPocStack.redisVpc,
      securityGroups: [redisPocStack.redisSecurityGroup],
      layers: [redisLayer],
      memorySize: 256,
      timeout: cdk.Duration.minutes(5),
      environment: {
        TABLE_NAME: dynamoDbTableName,
        REDIS_HOST: redisPocStack.redisHost,
        REDIS_PORT: redisPocStack.redisPort
      }
    });

    // Grant the Lambda function permissions to access the DynamoDB table
    dynamoDbTable.grantReadData(appsyncJobsSearchRedis);

    // Grant the Lambda function permissions to access the Redis cluster
    appsyncJobsSearchRedis.addToRolePolicy(new iam.PolicyStatement({
      actions: ['elasticache:DescribeCacheClusters'],
      resources: ['*']
    }));

    this.appsyncJobsSearchRedis = appsyncJobsSearchRedis;

    // Create a Lambda function to Query Jobs from RestApi
    const appsyncJobsQueryApi = new lambda.Function(this, 'JobsQueryApiLambdaFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      code: lambda.Code.fromAsset('lib/lambda/appsync_jobs_query_api'), // Assumes your Lambda code is in the 'lambda' directory
      handler: 'index.handler',
      layers: [requestsLayer],
      memorySize: 256,
      timeout: cdk.Duration.minutes(5),
      environment: {
        API_ENDPOINT: apiStack.restApiEndpoint
      }
    });

    this.appsyncJobsQueryApi = appsyncJobsQueryApi;
  }
}
