import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as opensearch from 'aws-cdk-lib/aws-opensearchserverless';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';

export class DevGeniusStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Retrieve Bedrock Agent role ARN from CDK context
    const bedrockRoleArn = this.node.tryGetContext('bedrockRoleArn');
    if (!bedrockRoleArn) {
      throw new Error('bedrockRoleArn must be provided via CDK context');
    }

    // Create S3 bucket for PDFs (no policies attached)
    const pdfBucket = new s3.Bucket(this, "KnowledgeBasePDFs", {
      bucketName: `${cdk.Stack.of(this).stackName}-kb-pdfs`,
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS
    });

    // Create OpenSearch Serverless collection
    const collection = new opensearch.CfnCollection(this, "VectorStore", {
      name: "devgenius-kb",
      type: "VECTORSEARCH"
    });

    // Bedrock Knowledge Base (requires manual IAM role assignment)
    new bedrock.CfnKnowledgeBase(this, "AWSWellArchitectedKB", {
      name: "aws-well-architected-kb",
      roleArn: bedrockRoleArn,
      knowledgeBaseConfiguration: {
        type: "VECTOR",
        vectorKnowledgeBaseConfiguration: {
          embeddingModelArn: "arn:aws:bedrock:us-west-2::foundation-model/amazon.titan-embed-text-v2:0"
        }
      },
      storageConfiguration: {
        type: "OPENSEARCH_SERVERLESS",
        opensearchServerlessConfiguration: {
          collectionArn: collection.attrArn,
          fieldMapping: {
            textField: "text",
            vectorField: "vector",
            metadataField: "metadata"
          },
          vectorIndexName: "devgenius-index"
        }
      },
      dataSourceConfiguration: {
        type: "S3",
        s3Configuration: {
          bucketArn: pdfBucket.bucketArn,
          syncInterval: cdk.Duration.days(7).toSeconds()
        }
      }
    });
  }
}
