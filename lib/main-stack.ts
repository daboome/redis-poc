import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BucketStack } from './bucket-stack';
import { DynamoDbStack } from './dynamodb-stack';
import { RedisStack } from './redis-stack';
import { ServingLambdaStack } from './serving-lambda-stack';
import { ApiStack } from './api-stack';
import { CallingLambdaStack } from './calling-lambda-stack';

export class MainStack extends cdk.Stack {

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
      super(scope, id, props);

      const bucketStack = new BucketStack(this, 'TheBucketStack');
      const bucketName = bucketStack.bucketName;
      const jobInstanceDataPrefix = bucketStack.jobInstanceDataPrefix;

      const dynamoDbStack = new DynamoDbStack(this, 'TheDynamoDbStack', bucketName, jobInstanceDataPrefix);

      const redisStack = new RedisStack(this, 'TheRedisStack');

      const servingLambdaStack = new ServingLambdaStack(this, 'TheServingLambdaStack', redisStack, dynamoDbStack.jobInstanceTableName);

      const apiStack = new ApiStack(this, 'TheApiStack', servingLambdaStack);

      const callingLambdaStack = new CallingLambdaStack(this, 'TheCallingLambdaStack', redisStack, dynamoDbStack.jobInstanceTableName, apiStack);
    }
}
