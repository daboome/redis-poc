import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cdk from 'aws-cdk-lib';

export class DynamoDbStack extends cdk.Stack {
  private readonly _jobInstanceTableName = 'jobInstanceDynamoDbTable';

  constructor(scope: Construct, id: string, bucketName: string, jobInstancePrefix: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new dynamodb.CfnTable(
      this,
      this._jobInstanceTableName,
      {
        keySchema: [
          {
            attributeName: 'exam',
            keyType: 'HASH',
          },
          {
            attributeName: 'jobId',
            keyType: 'RANGE',
          }
        ],
        tableName: this._jobInstanceTableName,
        attributeDefinitions: [
          {
            attributeName: 'exam',
            attributeType: 'S',
          },
          {
            attributeName: 'jobId',
            attributeType: 'N',
          },
        ],
        importSourceSpecification: {
          inputFormat: 'CSV',
          s3BucketSource: {
            s3Bucket: bucketName,
            s3KeyPrefix: jobInstancePrefix,
          },
          inputCompressionType: 'NONE',
          inputFormatOptions: {
            csv: {
              delimiter: ',',
            },
          },
        },
        provisionedThroughput: {
          readCapacityUnits: 5,
          writeCapacityUnits: 5,
        },
      }
    );
  }

  get jobInstanceTableName(): string {
    return this._jobInstanceTableName;
  }
}
