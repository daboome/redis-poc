import { Stack, StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import { Construct } from 'constructs';

export class RedisStack extends Stack {
  public redisHost: string;
  public redisPort: string;
  public redisVpc: ec2.IVpc;
  public redisSecurityGroup: ec2.ISecurityGroup;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create a VPC
    const vpc = new ec2.Vpc(this, 'RedisPocVpc', {
      maxAzs: 2 // Default is all AZs in the region
    });

    // Create a security group for the Redis cluster
    const securityGroup = new ec2.SecurityGroup(this, 'RedisPocSecurityGroup', {
      vpc,
      description: 'Allow redis access',
      allowAllOutbound: true
    });

    // Allow inbound traffic on port 6379 (default Redis port)
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(6379));

    // Create a subnet group for the Redis cluster
    const subnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisPocSubnetGroup', {
      description: 'Subnet group for Redis cluster',
      subnetIds: vpc.privateSubnets.map(subnet => subnet.subnetId)
    });

    // Create a Redis cluster
    const redisCluster = new elasticache.CfnCacheCluster(this, 'RedisPocCluster', {
      cacheNodeType: 'cache.t2.micro',
      engine: 'redis',
      numCacheNodes: 1,
      clusterName: 'redis-poc-cluster',
      vpcSecurityGroupIds: [securityGroup.securityGroupId],
      cacheSubnetGroupName: subnetGroup.ref
    });

    this.redisHost = redisCluster.attrRedisEndpointAddress;
    this.redisPort = redisCluster.attrRedisEndpointPort;
    this.redisVpc = vpc;
    this.redisSecurityGroup = securityGroup;
  }
}
