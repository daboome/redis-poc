import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

export class BucketStack extends cdk.Stack {

    public readonly jobInstanceDataPrefix = 'job_instance';
    public readonly bucketName: string;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
      super(scope, id, props);

      const bucket = new s3.Bucket(this, 'TheBucket', {
        removalPolicy: cdk.RemovalPolicy.DESTROY
      });

      new BucketDeployment(this, 'JobInstanceDataDeployment', {
        sources: [Source.asset('asset/csv')],
        destinationBucket: bucket,
        destinationKeyPrefix: this.jobInstanceDataPrefix,
        retainOnDelete: false
      })

      this.bucketName = bucket.bucketName;
    }
}
