import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as opensearch from 'aws-cdk-lib/aws-opensearchserverless';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import * as iam from 'aws-cdk-lib/aws-iam';

export class DevGeniusMiniStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 Bucket for PDFs
    const pdfBucket = new s3.Bucket(this, "KnowledgeBasePDFs", {
      bucketName: `${cdk.Stack.of(this).stackName}-kb-pdfs`,
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encryption: s3.BucketEncryption.S3_MANAGED
    });

    // OpenSearch Serverless (AOSS) Collection
    const collection = new opensearch.CfnCollection(this, "VectorStore", {
      name: "devgenius-kb",
      type: "VECTORSEARCH"
    });

    // IAM Role for Bedrock (manually assigned later)
    const bedrockRoleArn = this.formatArn({
      service: "iam",
      account: cdk.Stack.of(this).account,
      region: "us-west-2",
      resource: "role/BedrockAgentRole",
      arnFormat: cdk.ArnFormat.STANDARD
    });

    // Bedrock Knowledge Base (requires manual IAM role assignment)
    const knowledgeBase = new bedrock.CfnKnowledgeBase(this, "AWSWellArchitectedKB", {
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

    // Ensure AOSS collection is ready before Knowledge Base
    knowledgeBase.node.addDependency(collection);
  }
}
