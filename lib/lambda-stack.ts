import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { RedisStack } from './redis-stack';

export class LambdaStack extends cdk.Stack {

    constructor(scope: Construct, id: string, redisPocStack: RedisStack, dynamoDbTableName: string, props?: cdk.StackProps) {
      super(scope, id, props);

      const redisLayer = new lambda.LayerVersion(this, 'RedisLayer', {
        layerVersionName: 'RedisLayer',
        description: 'A layer that contains the Redis client library',
        code: lambda.Code.fromAsset('asset/zip/redis_layer.zip'),
        compatibleRuntimes: [lambda.Runtime.PYTHON_3_12]
      });

      const dynamoDbTable = dynamodb.Table.fromTableName(this, 'ImportedTable', dynamoDbTableName);

      // Create a Lambda function to Query jobs
      const jobs_query = new lambda.Function(this, 'JobsQueryRedisLambdaFunction', {
        runtime: lambda.Runtime.PYTHON_3_12,
        code: lambda.Code.fromAsset('lib/lambda/jobs_query'), // Assumes your Lambda code is in the 'lambda' directory
        handler: 'index.handler',
        vpc: redisPocStack.redisVpc,
        securityGroups: [redisPocStack.redisSecurityGroup],
        layers: [redisLayer],
        environment: {
          TABLE_NAME: dynamoDbTableName,
          REDIS_HOST: redisPocStack.redisHost,
          REDIS_PORT: redisPocStack.redisPort
        }
      });

      // Grant the Lambda function permissions to access the DynamoDB table
      dynamoDbTable.grantReadData(jobs_query);

      // Grant the Lambda function permissions to access the Redis cluster
      jobs_query.addToRolePolicy(new iam.PolicyStatement({
        actions: ['elasticache:DescribeCacheClusters'],
        resources: ['*']
      }));

      // Create a Lambda function to query examinee
      const jobs_search = new lambda.Function(this, 'JobsSearchRedisLambdaFunction', {
        runtime: lambda.Runtime.PYTHON_3_12,
        code: lambda.Code.fromAsset('lib/lambda/jobs_search'), // Assumes your Lambda code is in the 'lambda' directory
        handler: 'index.handler',
        vpc: redisPocStack.redisVpc,
        securityGroups: [redisPocStack.redisSecurityGroup],
        layers: [redisLayer],
        environment: {
          TABLE_NAME: dynamoDbTableName,
          REDIS_HOST: redisPocStack.redisHost,
          REDIS_PORT: redisPocStack.redisPort
        }
      });

      // Grant the Lambda function permissions to access the DynamoDB table
      dynamoDbTable.grantReadData(jobs_search);

      // Grant the Lambda function permissions to access the Redis cluster
      jobs_search.addToRolePolicy(new iam.PolicyStatement({
        actions: ['elasticache:DescribeCacheClusters'],
        resources: ['*']
      })); 
    }
}
