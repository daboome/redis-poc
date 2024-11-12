import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BucketStack } from './bucket-stack';
import { DynamoDbStack } from './dynamodb-stack';
import { RedisStack } from './redis-stack';
import { LambdaStack } from './lambda-stack';

export class MainStack extends cdk.Stack {

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
      super(scope, id, props);

      const bucketStack = new BucketStack(this, 'TheBucketStack');
      const bucketName = bucketStack.bucketName;
      const jobInstanceDataPrefix = bucketStack.jobInstanceDataPrefix;

      const dynamoDbStack = new DynamoDbStack(this, 'TheDynamoDbStack', bucketName, jobInstanceDataPrefix);

      const redisStack = new RedisStack(this, 'TheRedisStack');

      const lambdaStack = new LambdaStack(this, 'TheLambdaStack', redisStack);
    }
}
